# Quest covers and cloud storage

Each quest can have one public cover or project screenshot. Its creator or an administrator can manage it from the quest details pane. A new quest is created first; its cover is uploaded separately. Progress notes and repository links remain personal.

## Private setup

Use a Cloudinary product environment and copy its cloud name, API key, and API secret from the Cloudinary console into the root `.env`:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Set the same three environment values on the existing Render web service before deploying the feature. Keep them server-side; do not use `VITE_` prefixes or commit credentials. No new Render service, database, OAuth callback, or unsigned upload preset is needed.

Express uploads normalized image bytes through the Cloudinary Node SDK. Local and production storage use the same configured product environment. Images are public and should contain content suitable for public viewing.

## Database and operations

Startup applies a repeatable additive migration for `quest_images` and `image_deletion_jobs`. It does not seed or replace existing domain data. A quest image's primary key is also its foreign key to `quests`, enforcing the optional one-to-one relationship in PostgreSQL.

Upload, replace, remove, and quest deletion serialize with catalog reset. Locks are scoped to the PostgreSQL schema so isolated tests do not block the live catalog. Uploads hold the quest row until their database transaction finishes. A provider failure preserves the previous cover; a failed database save compensates the new cloud upload.

Old assets enter a persistent cleanup queue only after their removal commits. The web service retries cleanup every minute while awake, with exponential backoff capped at one hour. Free-service sleeping can delay cleanup until the service wakes. A rolled-back reset retains both covers and their references.

`npm run db:backup` privately stores the PostgreSQL archive and every referenced image, together with hashes and metadata, under ignored `.artifacts/m5/backups/`. Do not confirm a global reset until that command succeeds. Restoring database references after cloud deletion also requires reuploading the archived image bytes and restoring their URLs; the SQL dump alone is insufficient.

## API and limits

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/api/quests/:id` | Existing `{ quest, progress }` plus nullable `image: { url, alt_text, width, height }` |
| POST | `/api/quests/:id/image` | Creator/admin multipart `image` and `alt_text`; 201 initially, 200 on replacement |
| DELETE | `/api/quests/:id/image` | Creator/admin removal; 204 even if already absent |

Files must be JPEG, PNG, or static WebP, at most 5 MiB and 20 megapixels. The server decodes the bytes, removes metadata, and resizes within 1600×1600 without enlargement before encoding WebP. Alt text is required and limited to 200 characters. Identity, provider IDs, URLs, and dimensions are server-controlled.

Errors use 400 for invalid fields, 401/403 for authentication/permissions, 404 for missing quests, 413 for oversized files, 415 for invalid image content, and safe retryable 503 feedback for unavailable storage. Public browsing works when storage configuration is absent.

## Verification

```sh
npm run test:cloudinary
npm run test:buttons
npm run test:toast-visuals
```

The cloud check uses real provider uploads/CDN delivery and a disposable database schema, then removes its test assets. Browser tests inject storage while preserving real image normalization, API writes, sessions, and database constraints. The visual check compares desktop, mobile, and dialog toasts against the teammate's merged version at `6c7b64c`; toast code and the shared stylesheet must remain unchanged.

The button inventory includes the two original toast controls in its denominator. They retain their existing implementation and appearance. Other native button actions use synchronous duplicate-click guards, a 750 ms minimum cooldown, and pending-state locks. Native form validation occurs before submitters lock, and dialog/back-navigation restoration releases completed locks.
