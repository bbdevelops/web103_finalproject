import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export class MediaError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.fields = errors;
  }
}
export function imageView(image) {
  return image
    ? {
        url: image.secure_url,
        alt_text: image.alt_text,
        width: image.width,
        height: image.height,
      }
    : null;
}
export function cloudStorage() {
  const configured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
  if (configured)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  return {
    configured,
    upload: (buffer, publicId) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              public_id: publicId,
              resource_type: "image",
              format: "webp",
              overwrite: false,
              timeout: 30000,
            },
            (error, result) => (error ? reject(error) : resolve(result)),
          )
          .end(buffer);
      }),
    destroy: (publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
        timeout: 30000,
      }),
  };
}
export async function normalizeImage(file) {
  const mimeFormats = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!file)
    throw new MediaError(400, "Choose an image file.", {
      image: "Choose an image file.",
    });
  if (!mimeFormats[file.mimetype])
    throw new MediaError(415, "Choose a JPEG, PNG, or static WebP image.");
  try {
    const input = sharp(file.buffer, {
      limitInputPixels: 20000000,
      failOn: "warning",
    });
    const metadata = await input.metadata();
    if (
      metadata.format !== mimeFormats[file.mimetype] ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Unsupported image");
    return await input
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new MediaError(
      415,
      "Use a valid, static JPEG, PNG, or WebP image up to 20 megapixels.",
    );
  }
}
export const newImageId = () => `skillforge/quests/${randomUUID()}`;

export async function queueDeletion(client, publicId) {
  await client.query(
    "INSERT INTO image_deletion_jobs(public_id) VALUES ($1) ON CONFLICT DO NOTHING",
    [publicId],
  );
}
export async function queueAllImages(client) {
  await client.query(
    "INSERT INTO image_deletion_jobs(public_id) SELECT public_id FROM quest_images ON CONFLICT DO NOTHING",
  );
}
export async function withManagedQuest(pool, id, user, action) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query(
      "SELECT pg_advisory_xact_lock_shared(103005, hashtext(current_schema()))",
    );
    const {
      rows: [quest],
    } = await client.query("SELECT * FROM quests WHERE id=$1 FOR UPDATE", [id]);
    if (!quest) throw new MediaError(404, "This quest could not be found.");
    if (user.role !== "admin" && user.id !== quest.created_by_user_id)
      throw new MediaError(
        403,
        "Only the creator or an administrator can change this quest.",
      );
    const value = await action(client, quest);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function drainImageDeletions(pool, storage, limit = 5) {
  if (!storage.configured) return;
  for (let i = 0; i < limit; i++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const {
        rows: [job],
      } = await client.query(
        "SELECT * FROM image_deletion_jobs WHERE next_attempt_at<=now() ORDER BY next_attempt_at,public_id FOR UPDATE SKIP LOCKED LIMIT 1",
      );
      if (!job) {
        await client.query("COMMIT");
        break;
      }
      try {
        const result = await storage.destroy(job.public_id);
        if (result?.result && !["ok", "not found"].includes(result.result))
          throw new Error("Deletion incomplete");
        await client.query(
          "DELETE FROM image_deletion_jobs WHERE public_id=$1",
          [job.public_id],
        );
      } catch {
        await client.query(
          "UPDATE image_deletion_jobs SET attempts=attempts+1,next_attempt_at=now()+($2::integer*interval '1 second') WHERE public_id=$1",
          [job.public_id, Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6))],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
export function startImageCleanup(pool, storage) {
  let active = null;
  const tick = () => {
    if (!active)
      active = drainImageDeletions(pool, storage)
        .catch(() =>
          console.error("Image cleanup will retry on the next pass."),
        )
        .finally(() => {
          active = null;
        });
  };
  const timer = setInterval(tick, 60000);
  timer.unref();
  tick();
  return async () => {
    clearInterval(timer);
    await active;
  };
}
