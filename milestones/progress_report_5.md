# Milestone 5 Progress Report

## Release status

Target submission: November 15, 2026; final correction window through November 17.

Completion percentage for Milestone 5 - Unit 9: **0% (0 closed / 6 total)** at the repository-preparation checkpoint. All six issues remain open until their complete acceptance criteria, including recording/deployment evidence, pass. Toast issue #15 remains teammate-owned.

The local application implementation is verified. The next external dependency is the owner's private Render and GitHub configuration described in [the deployment runbook](../docs/render-deployment.md). The public URL, live verification, owner-confirmed reset recording, and final GIFs are not claimed complete yet.

## Implemented and locally verified

- [#13 Developer Dashboard](https://github.com/bbdevelops/web103_finalproject/issues/13) — `client/src/pages/DashboardPage.jsx`, `server/app.js`; protected access, private totals, tree progress, latest ten completions, repository links, and quest deep links.
- [#14 Database reset](https://github.com/bbdevelops/web103_finalproject/issues/14) — `server/db/reset.js`, `server/app.js`, `client/src/components/ResetDatabase.jsx`; admin-only transactional reset, confirmation, rollback, and preserved identities/roles/sessions.
- [#16 Render deployment](https://github.com/bbdevelops/web103_finalproject/issues/16) — `render.yaml`, `server/index.js`, `server/app.js`, `server/auth.js`, `docs/render-deployment.md`; one-service build/start configuration and production routing/cookies are ready. Owner configuration and live verification remain.
- [#19 Quest filtering and sorting](https://github.com/bbdevelops/web103_finalproject/issues/19) — `client/src/components/QuestFilters.jsx`, `client/src/pages/TreeDetailPage.jsx`; combined difficulty/status filters, deterministic roadmap/XP/title ordering, matching counts, and clear/empty states.
- [#20 Final rubric and evidence](https://github.com/bbdevelops/web103_finalproject/issues/20) — `milestones/milestone5.md`, this report, verification and recording tooling; final deployed recordings and release reconciliation remain.
- [#15 Toast notifications](https://github.com/bbdevelops/web103_finalproject/issues/15) — teammate-owned; no toast implementation was added or claimed here.

## Verification completed

- `npm test`: **31 passing** PostgreSQL/API integration tests using disposable schemas. Seven new M5 cases cover dashboard history ordering/isolation, moved/reopened/deleted completions, reset permissions, repeatability, rollback, preserved accounts/sessions, private admin provisioning, and production cookie flags.
- `npm run test:browser`: **20 passing** Chrome checks using a disposable schema and a simulated external OAuth provider; the app, Passport sessions, API, and PostgreSQL queries remain real. Coverage includes protected access/cancellation/logout, dashboard and deep links, zero/empty states, filters/sorting, CRUD/progress regression, admin reset, pending/error/retry behavior, keyboard focus, and mobile layouts. No uncaught browser errors.
- `npm run lint`: passes without warnings.
- `npm run build`: passes.
- `npm run test:production`: built React routes, direct deep links, assets, API/auth JSON 404s, missing files, and health pass in the single-service routing smoke check.

The automated reset tests affect only disposable schemas. No global reset of the existing shared database was performed during local verification.

## Deployment and evidence remaining

1. Owner creates/configures the single Render web service, private environment values, and production GitHub redirect URI, retaining the local URI.
2. Verify the public application and real GitHub sessions; provision the approved `bbdevelops` identity using the private CLI.
3. Create and verify a private PostgreSQL 18 backup of the existing database.
4. Record dashboard, reset, and filtering GIFs plus a complete deployed-app walkthrough. The owner confirms global reset during recording.
5. Add the actual public URL and GIFs to README and the milestone checklist, review the shared reflections, and merge the final evidence PR.
6. Close completed issues and reconcile project statuses after merge. Report the real percentage including teammate-owned #15.

## Rubric evidence map

| Category | Implementation/evidence |
| --- | --- |
| React and Express; component hierarchy | Existing client/server workspaces, reusable quest panes, dashboard components |
| One-to-many and many-to-many | Implemented `skill_trees` → `quests`; `users` ↔ `quests` through `user_quests` |
| RESTful CRUD and validation | Quest GET/POST/PATCH/DELETE; field errors and integration/browser checks |
| Reset | Admin-only `POST /api/reset`, transaction/rollback tests; deployed demonstration pending |
| Redirection, dynamic routes, same-page interaction | OAuth, React Router tree/dashboard paths, quest panes and status controls |
| Render deployment | Repository configuration ready; live service verification pending owner setup |
| Custom features | Graceful errors, modal panes, custom join fields, reset action route, filters/sorting, generated completion snapshots/timestamps, validated writes |
| Stretch features | Protected dashboard, owner/admin options, loading spinners, disabled pending controls |
| Excluded | One-to-one relationship, cloud uploads, 75%-of-buttons requirement; toast evidence remains with #15 |

Historical M3/M4 reports and GIFs remain preserved. The authoritative final grading checklist and complete walkthrough belong in [milestone5.md](milestone5.md).
