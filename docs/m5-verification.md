# Final M5 rubric verification

Verified on November 16, 2026 against [the deployed application](https://skillforge-ckbo.onrender.com/). The functional follow-up was merged in [PR #28](https://github.com/bbdevelops/web103_finalproject/pull/28). The five reflections and complete implemented-feature checklist are in [milestone5.md](../milestones/milestone5.md).

## Required features

All ten baseline requirements are implemented: React/Express, real one-to-many and many-to-many PostgreSQL relationships, quest GET/POST/PATCH/DELETE, admin reset, redirection, same-page interaction, dynamic React Router routes, component hierarchy, dynamic server routes, and Render deployment.

## Custom features

All eight custom categories are implemented: graceful errors, an actual one-to-one relationship, accessible modal panes, custom join-table fields, the reset action route, filtering/sorting, generated completion awards/timestamps, and POST/PATCH validation. The recorded invalid documentation URL is rejected with HTTP 400 before a quest is created.

The deployed `quest_images` table has `PRIMARY KEY (quest_id)` and `FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE`. Independent integration checks reject duplicate image rows and orphan references. This is actual schema evidence, rather than an ERD-only claim.

## Stretch features

All seven stretch categories are implemented: protected dashboard/GitHub sign-in, dynamically restricted options, loading spinners, disabled pending submissions, broader click disabling, cloud image uploads, and toast feedback.

The click audit counts all native button declarations: 33 guarded out of 35 (94.29%). Browser observations count all visible native button instances at 50 interaction states: 406 guarded out of 426 (95.31%). The two original toast controls are included in both denominators and retain their existing implementation. Tests verify immediate disabling, cooldown recovery, duplicate submission prevention, and focus restoration.

Cloud evidence shows local image-file selection, real Cloudinary storage/delivery, guest viewing, refresh persistence, replacement, and confirmed removal. Covers are project screenshots, separate from GitHub avatars. The API exposes display metadata while keeping provider credentials server-side.

## Toast and feedback preservation

The toast component, hook, helpers, and shared stylesheet remain unchanged from the teammate's merged commit `6c7b64c`. Pixel comparisons of desktop, mobile, and modal toast captures are identical. Existing icons, variants, animations, timers, live regions, and modal placement are preserved. Cover styling is scoped to its own component.

## Executed verification

- `npm test`: 46 PostgreSQL/API tests pass in disposable schemas, including media migration, validation, permissions, compensation, cleanup retries, and reset concurrency/rollback. An additional focused provider-failure rerun passed.
- `npm run test:browser`: 22 checks pass, including cover failure recovery, pending guards, replacement, guest access, mobile layout, and measured button coverage.
- `npm run lint`, `npm run build`, `npm run test:production`, and `npm run test:buttons`: pass.
- `npm run test:toast-visuals`: desktop, mobile, and dialog screenshots match the teammate baseline pixel-for-pixel.
- `npm run test:cloudinary`: real upload, CDN delivery, replacement, public reads, removal, and cleanup pass using an isolated schema and disposable assets.
- `npm audit --omit=dev`: zero vulnerabilities.
- `npm run test:deployed`: health, catalog, React routes/assets, media response contract, new client bundle, guest protection, and missing-route behavior pass.
- `npm run test:oauth`: actual HTTPS GitHub sign-in, original-page return, refresh persistence, logout, and protected-dashboard reauthentication pass.
- Deployed recording: real CRUD, rejected validation, panes, personal progress/XP, dashboard, filters, cloud covers, click guards, toasts, owner-confirmed reset, and logout pass with no browser errors. Controlled network latency exposes genuine pending states; API responses are not mocked.

## Backup and post-reset evidence

A fresh PostgreSQL 18 archive and referenced cloud-image bytes were saved privately and checked by SHA-256 before the owner confirmed reset. After reset, read-only checks verified four trees, twelve quests, zero cover references, an empty cleanup queue, and removal of the real cloud sample. The recorder checked zero owner XP and the preserved administrator session before logout. Private dumps, media, browser profiles, session cookies, credentials, and detailed artifacts remain ignored.

The six refreshed M5 GIFs are linked from README and the progress report. M3/M4 recordings and teammate toast GIFs are unchanged. The [original M5 walkthrough](gifs/archive/m5-2026-11-14/m5-final-walkthrough.gif) is archived with its three original feature recordings.
