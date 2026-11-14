# SkillForge: Render deployment and final verification

Use one Render **Web Service** for the built React application, Express API, and GitHub authentication. Keep the existing PostgreSQL database. No new database or paid service is required.

## Repository configuration

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/bbdevelops/web103_finalproject` |
| Branch | `main` |
| Runtime | Node |
| Root directory | Leave blank (repository root) |
| Node version | `24` (`.nvmrc` and package engines also specify 24) |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Instance type | Free |
| Region | Same region as the existing PostgreSQL database |

`render.yaml` records these settings and creates only the web service. Use either the manual dashboard form or the Blueprint, not both, to avoid duplicate services. The manual form is the walkthrough below. Neither build nor startup runs the destructive development seed.

## Owner setup checkpoint

1. Open Render → **New → Web Service**, connect the GitHub repository, and enter the settings above. Choose a recognizable service name such as `skillforge-web103-bbdevelops`. Render assigns its final public URL; use the actual assigned URL below.
2. Open the existing database's **Connect** menu. Copy its **Internal Database URL** into the web service's private `DATABASE_URL` setting. Both services must belong to the same account and region. Keep the existing local `.env` on the external URL with TLS.
3. Configure the web service's environment values:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` |
| `DATABASE_URL` | Existing database's internal URL; private |
| `PGSSLMODE` | `disable`, only for this private internal connection |
| `CLIENT_ORIGIN` | Actual public URL, e.g. `https://your-service.onrender.com`, without a trailing slash |
| `GITHUB_CALLBACK_URL` | That same URL followed by `/auth/callback` |
| `GITHUB_CLIENT_ID` | Existing GitHub OAuth App's client ID |
| `GITHUB_CLIENT_SECRET` | Existing OAuth App's private client secret |
| `SESSION_SECRET` | A new private random secret for production |

Generate the session secret privately with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. The Blueprint generates a value automatically; the manual service form requires entering one. Keep private values in Render and ignored local configuration, never in an issue, PR, screenshot, or chat.

4. In GitHub Settings → Developer settings → OAuth Apps → the existing app, add the production `https://your-service.onrender.com/auth/callback` **Redirect URI**. Retain `http://127.0.0.1:5173/auth/callback` for development. Keep wildcard matching and Device Flow off.
5. Save configuration and deploy the latest `main`. An initial deployment can fail until all values are entered; use **Manual Deploy → Deploy latest commit** after completing configuration. Confirm `/api/health` returns `{"ok":true}`. Provide the public application URL so live verification can continue.

The production app binds `0.0.0.0:$PORT`, serves React from `client/dist`, and uses Secure, HttpOnly, SameSite=Lax session cookies at the shared origin. API/auth 404 responses stay JSON; missing files stay 404; browser deep links load the SPA. HTTPS terminates at Render, so proxy trust remains enabled.

## Admin provisioning and private backup

After real sign-in has created the account, the approved owner account is provisioned from the repository root using local external database settings:

```powershell
npm.cmd run admin:grant -- --github-id 215321334
```

This promotes only existing GitHub identity `bbdevelops`. It creates no user and exposes no public role-management endpoint. Refresh the dashboard to read the current role.

Before the recorded global reset:

```powershell
npm.cmd run db:backup
```

The command uses the installed PostgreSQL 18 clients, creates a custom archive under ignored `.artifacts/m5/backups/`, checks its table-data entries, and records size and SHA-256 in `latest.json`. Configure `PG_BIN` if the client binaries are elsewhere. Credentials are passed privately through environment variables. The command does not modify database data. Keep the backup private; do not commit it.

The owner confirms **Reset to defaults** during the deployed recording after this backup succeeds. Reset replaces all shared quests and all saved progress; GitHub identities, roles, and sessions remain. Restoring an archive would replace current data and is a separate explicit operation, never an automatic deployment step.

## Verification and evidence

Run the local gates before deployment:

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run lint
npm.cmd run build
npm.cmd run test:production
```

The API and browser suites use disposable schemas, including all automated reset checks. Production-build smoke checks validate routes/assets without changing application data.

After deployment:

- Verify the public health endpoint, root page, direct `/trees/1` and `/dashboard` URLs, and refresh behavior.
- Complete real GitHub sign-in, return to the original page, refresh persistence, and logout; cancel/retry sign-in without a redirect loop.
- Verify quest create/view/edit/delete, rejected invalid input, personal notes/repository links, status/XP, dashboard recents and quest links, filters, and permissions.
- Record dashboard, filtering, reset, and full walkthrough GIFs against the deployed app. Do not simulate provider/API responses for submission evidence.
- Update README, `milestones/milestone5.md`, and the M5 progress report with the verified public URL, released commit, test results, and recordings.
- Close only completed issues and recheck board statuses after PR merges. Keep teammate-owned toast issue #15 separate.

The recording sequence uses these commands once the public URL is available:

```powershell
npm.cmd run test:deployed -- https://your-service.onrender.com
npm.cmd run admin:grant -- --github-id 215321334
npm.cmd run test:oauth
npm.cmd run db:backup
npm.cmd run record:m5
python scripts/build-demo-gif.py --milestone m5
```

The read-only deployment check saves the canonical origin for the OAuth and recording commands. The OAuth check opens sandbox-enabled Chrome for real sign-in. The recorder requires matching live verification, an authenticated admin, and a fresh verified backup; it brings the reset confirmation to the front and waits for the owner without a timeout. If a run is interrupted before reset, it removes only the temporary quests created by that recording. It never confirms the global reset automatically.

To resume only an interrupted final reset step after the earlier real walkthrough frames exist, run `npm.cmd run record:m5:reset`. This reuses the earlier genuine captures, refreshes the reset demonstration state, and waits for the owner's confirmation. It does not repeat the earlier CRUD workflow or automatically confirm reset.

Free web services sleep after idle periods; allow the service to finish waking before the demo. The existing database's reported remaining lifetime covers the November 15 target and November 17 final submission window. Record the actual expiration in Render for any later demo.

References: [Render web services](https://render.com/docs/web-services), [Node version](https://render.com/docs/node-version), [PostgreSQL connections](https://render.com/docs/postgresql-creating-connecting), [Free service behavior](https://render.com/docs/free).
