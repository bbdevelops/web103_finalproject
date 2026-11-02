# Milestone 3 Completion Plan

## Goal and confirmed decisions

Finish issues #3–#6 within the available 1–2 days, delivering a working Skill Tree Explorer and tree detail page backed by Render PostgreSQL. Include the GIF, progress report, reflection, and GitHub updates required for submission. Named assignments are optional; follow the dependency order below.

- Use JavaScript, React with Vite, React Router, vanilla CSS, Express, and `pg`, consistent with the existing design.
- Run the frontend and backend locally for this milestone. The database is hosted on Render; application deployment remains issue #16 in Milestone 5.
- Move issue #6 from Milestone 4 to Milestone 3 so the entire browsing feature can be completed and demonstrated.
- Retain the planned demo-user middleware for Alex Chen. GitHub OAuth, quest mutations, editable progress, the dashboard, reset UI/endpoint, and toasts remain in their existing later issues.
- The pitch has already been delivered. The board is public, and explicit sharing with `codepathreview` is confirmed by the project owner.

## Baseline status and grading requirements

Baseline reviewed November 2, 2026, before implementation. The table below records the starting point. See the [progress report](progress_report_3.md) for completed work, verification, and the subsequently supplied 26-point rubric.

| Area | Current status | Submission requirement |
| --- | --- | --- |
| Project board | Public [SkillForge board](https://github.com/users/bbdevelops/projects/2); 16 issues present | Keep statuses accurate and record creation and grader sharing in the report |
| Issues | #1–#2 closed/Done; #3–#16 open/Todo | Finish the selected sprint and record completed issues with implementation locations |
| GitHub milestones | All five exist; M1/M2 are 100%; M3/M4/M5 are 0% | M3 must reach 100% through completed, closed issues |
| M3 scope | #3, #4, #5 currently assigned; #6 currently in M4 | Reassign #6, then complete all four M3 issues |
| Application | No client/server implementation or package manifests yet | Runnable React/Express app with database-backed browsing |
| Database | Render PostgreSQL 18 connection verified with TLS; none of the four domain tables exist | Implement and seed the ERD |
| Environment | Root `.env` contains standard `PG*` settings | Preserve those settings, load them explicitly in the backend, and keep credentials ignored |
| README | Feature descriptions exist; no completed-feature markers or GIFs | Check off Feature 1 after both browsing pages work and embed its GIF |
| Milestone checklist/reflection | Setup partly checked; all five reflection answers are placeholders | Check completed tasks and supply five factual answers |
| Progress report | Local draft exists, with TODOs and unverified completion claims | Complete every template section and remove placeholders |

`m3.md` provides required grading evidence rather than a numeric point breakdown. Its final section explicitly says that GitHub project work must be recorded in `milestones/progress_report_3.md` to earn credit. The final project's complete baseline feature set and two custom features remain overall project requirements; M3 calls for beginning development and documenting completed work.

## Implementation sequence

### Day 1: shared foundation and database — issues #3 and #4

1. Move #6 into M3. Move each active issue from Todo to In Progress. Keep the existing feature branch and preserve the current documentation edits.
2. Scaffold separate `client/` and `server/` packages using Node 24.x, which is installed locally. Commit package lockfiles. Add development, production-start/build, and appropriate verification scripts. Extend `.gitignore` for dependencies and build output.
3. Create the React layout, shared navigation, centralized dark-theme CSS variables, and routes `/`, `/trees/:id`, and `/dashboard`. The dashboard remains an explicit coming-soon page with a return link. Use the existing wireframes for structure and responsive behavior.
4. Configure Express JSON parsing, CORS for `http://localhost:5173`, port 3001, automatic development reload, centralized JSON errors, and a shared `pg` pool. Proxy client `/api` requests to Express.
5. Load the existing root `.env` explicitly regardless of the shell's working directory. Support its `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` settings; also support `DATABASE_URL` when supplied. Document that `DATABASE_URL` takes precedence. Add a root `.env.example` with placeholders, `PGSSLMODE=require`, `PORT`, and `CLIENT_ORIGIN`.
6. Connect locally through Render's external connection settings with TLS. Keep using the full hostname. Render distinguishes external connections from internal URLs intended for Render services in the same region; see [Render connection documentation](https://render.com/docs/postgresql-creating-connecting#external-connections).
7. Implement all four ERD tables and their documented constraints: identity/ownership fields, foreign keys, enum and numeric checks, composite progress key, completion consistency, and deletion behavior. Use parameterized application queries.
8. Implement transactional `npm run seed`: rebuild the four domain tables and insert four tracks, three quests per track, Alex Chen, an admin, and the three starter progress records. The expected example totals are **100 XP, 1/12 completed, 1 in progress**, and **1/3 completed in React**. Repeated seed runs must restore the same logical defaults.
9. Separate the CLI schema rebuild from a reusable catalog/progress seed function accepting a transaction client. The future reset endpoint must be able to reuse that function while preserving existing users and roles. Resolve demo identities by their stable seeded identifier rather than assuming user ID 1.
10. Implement the demo-user middleware seam from #3 and label the UI as Alex's demo session. Keep the seam replaceable by #12; do not present a working GitHub sign-in before OAuth exists.

### Day 2: complete browsing — issues #5 and #6

- **Explorer:** Fetch the tree collection and summary; render one linked card per tree with description and completion count. Show loading, retryable error, and empty states. Cards stack in one column below 768px.
- **Tree detail:** Fetch the route's tree and ordered quests. Display title, difficulty, XP reward, personal status, advisory prerequisites, and completion summary. Missing progress means Backlog. Support empty trees, missing trees, direct navigation, and refresh. Move prerequisite guidance below the quest list on narrow screens.
- Use page components for data loading and reusable presentation components for cards, quest rows, progress summaries, and feedback states.
- Render the future View Quest and Forge Quest controls as disabled coming-soon actions; their panes and mutations belong to #8/#9. Do not add editable status controls before #10/#11.

### API contracts

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Check the database with `SELECT 1`; return 200 `{ "ok": true }`, or 503 `{ "ok": false }` if unavailable |
| `GET /api/trees` | Return `{ trees, summary }`; each tree includes its ID, title, description, `quest_count`, and `completed_count`; summary includes `total_xp`, `total_quests`, `completed_quests`, and `in_progress_quests` |
| `GET /api/trees/:id` | Return `{ tree, quests }`; include tree counts and quests ordered by position then ID, with their display fields and current user's status |

Use numeric counts in responses. Scope progress aggregates to the resolved user and avoid multiplying XP/counts through joins. Return 400 for malformed tree IDs, 404 for missing trees, and a safe JSON error for unexpected failures. Catalog reads remain public; demo progress supplies this milestone's personal statistics.

## Verification and acceptance

- Run backend integration tests with Node's test runner and Supertest against an isolated test schema in the Render database. Set the test pool's search path explicitly; seed/test teardown must never target the development schema.
- Verify schema constraints, progress uniqueness, completion consistency, quest-progress cascade, and tree/author deletion restrictions. Verify repeatable seed results and the example totals.
- Test both tree endpoints against real PostgreSQL: correct counts without join inflation, quest ordering, missing progress as Backlog, no progress belonging to another user, empty catalog/tree, malformed IDs, missing trees, and database failure handling.
- Run client lint and production build. In a browser, check Explorer → tree → Explorer, direct tree URLs and refresh, keyboard navigation, readable statuses, and layouts above and below 768px. Exercise loading, failed request/retry, and empty states.
- Verify installation from documented steps using clean dependency installs. Document PowerShell's `npm.cmd` alternative because this machine blocks `npm.ps1`; no execution-policy change is necessary. Update the stale Node 18 prerequisite for the selected Vite tooling using [Vite's current requirements](https://vite.dev/guide/).
- Record a GIF from the running app showing seeded summary totals, tree navigation, ordered quest content, progress, and navigation back. Store it in the repository and embed it directly beneath README Feature 1.

## Submission gate

1. Complete the acceptance checklists on #3–#6 only after their behavior and evidence are verified. Submit the implementation and documentation through a PR targeting `main`, then merge the verified work for grading.
2. Close completed issues and set their board status to Done. With #6 reassigned, M3 must show **4 closed / 4 total = 100%**. GitHub calculates this percentage from issue state; a report entry or Done board status alone does not change it. Leave unfinished future work open.
3. In `README.md`, mark only **Feature 1: Interactive Web Dev Skill Tree Explorer** complete and embed the working GIF. A seed script alone does not complete database reset, and displaying seeded XP alone does not complete the progression tracker.
4. Finish every section of `milestones/progress_report_3.md`: board creation/sharing, the 16 actual issue titles, the five milestone names, verified M3 percentage, completed #3–#6 with actual source locations, and the checked-off browsing feature. Preserve the template headings and one list entry per line; include useful GitHub links and remove TODO/example text.
5. Finish `milestones/milestone3.md`: reconcile the checklist with actual GitHub state and README evidence, and answer all five reflection questions using actual implementation outcomes and remaining risks. Reflect that #6 was brought forward. Record the already-delivered pitch as complete in the earlier pitch checklist.
6. Check the rendered README/GIF, the report's completeness, public board access, and milestone percentages on GitHub after merge. The final submission must contain the new report and the existing local checklist updates, not just uncommitted copies.

M3 is finished when all four selected issues are implemented and closed, the board/report/milestone agree, Feature 1 has a working GIF, and all checklist and reflection requirements are satisfied. Account provisioning and the root `.env` are already handled; no named ownership allocation is required.
