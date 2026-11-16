import { Router } from "express";
import multer from "multer";
import {
  imageView,
  MAX_IMAGE_BYTES,
  MediaError,
  newImageId,
  normalizeImage,
  queueDeletion,
  withManagedQuest,
} from "../media.js";

const receive = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
    fields: 1,
    parts: 2,
    fieldSize: 1000,
  },
}).single("image");
function parseImage(req, res) {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(new Error("Upload interrupted"));
    req.once("aborted", aborted);
    receive(req, res, (error) => {
      req.off("aborted", aborted);
      if (error)
        reject(
          new MediaError(
            error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
            error.code === "LIMIT_FILE_SIZE"
              ? "Choose an image no larger than 5 MiB."
              : "Upload one image and its alt text.",
          ),
        );
      else resolve();
    });
  });
}
export function imageRoutes(pool, storage) {
  const router = Router({ mergeParams: true });
  router.post("/", async (req, res, next) => {
    let uploaded, attemptedId,
      committed = false;
    req.setTimeout(30000, () => req.destroy());
    try {
      const result = await withManagedQuest(
        pool,
        req.params.id,
        req.user,
        async (client) => {
          if (!storage.configured)
            throw new MediaError(
              503,
              "Image uploads are temporarily unavailable. Please try again later.",
            );
          await parseImage(req, res);
          const alt = req.body?.alt_text;
          if (typeof alt !== "string" || !alt.trim() || alt.trim().length > 200)
            throw new MediaError(
              400,
              "Describe the image in 1–200 characters.",
              { alt_text: "Describe the image in 1–200 characters." },
            );
          const buffer = await normalizeImage(req.file);
          const {
            rows: [previous],
          } = await client.query(
            "SELECT public_id FROM quest_images WHERE quest_id=$1",
            [req.params.id],
          );
          attemptedId = newImageId();
          uploaded = await storage.upload(buffer, attemptedId);
          if (req.aborted || res.destroyed)
            throw new Error("Upload interrupted");
          if (
            !uploaded?.secure_url?.startsWith("https://") ||
            !uploaded.public_id ||
            !(uploaded.width > 0 && uploaded.height > 0)
          )
            throw new Error("Image storage did not finish");
          const {
            rows: [image],
          } = await client.query(
            `INSERT INTO quest_images(quest_id,public_id,secure_url,alt_text,width,height) VALUES($1,$2,$3,$4,$5,$6)
          ON CONFLICT(quest_id) DO UPDATE SET public_id=EXCLUDED.public_id,secure_url=EXCLUDED.secure_url,alt_text=EXCLUDED.alt_text,width=EXCLUDED.width,height=EXCLUDED.height,updated_at=now() RETURNING *`,
            [
              req.params.id,
              uploaded.public_id,
              uploaded.secure_url,
              alt.trim(),
              uploaded.width,
              uploaded.height,
            ],
          );
          if (previous) await queueDeletion(client, previous.public_id);
          return { image: imageView(image), status: previous ? 200 : 201 };
        },
      );
      committed = true;
      res.status(result.status).json({ image: result.image });
    } catch (error) {
      const cleanupId = uploaded?.public_id ?? attemptedId;
      if (cleanupId && !committed) {
        try {
          await storage.destroy(cleanupId);
        } catch {
          try {
            await queueDeletion(pool, cleanupId);
          } catch {
            console.error(
              "Image cleanup requires a retry:",
              cleanupId,
            );
          }
        }
      }
      next(
        error instanceof MediaError
          ? error
          : new MediaError(
              503,
              "The image could not be saved. Your previous cover is unchanged. Please try again.",
            ),
      );
    } finally {
      req.setTimeout(0);
    }
  });
  router.delete("/", async (req, res, next) => {
    try {
      await withManagedQuest(pool, req.params.id, req.user, async (client) => {
        const {
          rows: [image],
        } = await client.query(
          "DELETE FROM quest_images WHERE quest_id=$1 RETURNING public_id",
          [req.params.id],
        );
        if (image) await queueDeletion(client, image.public_id);
      });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
