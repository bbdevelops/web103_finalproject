# SkillForge

CodePath WEB103 Final Project

Designed and developed by: Dilasha Shakya, Erika Villalpando, Manas Singh Bhati, Muhais Olatundun, Brian Brown

🔗 Link to deployed app: [Render Deployment Link Coming in Milestone 5]

## About

### Description and Purpose

**SkillForge** is an RPG-inspired skill tree and technical quest management web application designed specifically for **aspiring and junior web developers**. 

Navigating the modern web development landscape (React, Node/Express, PostgreSQL, system architecture, and cloud deployment) can feel overwhelming and fragmented. SkillForge transforms tech roadmaps into gamified **Skill Trees** and bite-sized **Coding Quests**. Developers earn Dev XP, log milestone progress, track project deliverables, and conquer full-stack competencies one milestone at a time—turning the daunting journey of learning to code into an engaging adventure.

### Inspiration

SkillForge draws inspiration from:
- **GOATPath** (CodePath Exemplar): Providing structured career roadmaps and milestones for aspiring tech professionals.
- **Developer Roadmaps (roadmap.sh)**: Visualizing full-stack engineering specializations and essential prerequisite skills.
- **Classic RPG Skill Trees (e.g., Skyrim, World of Warcraft)**: Giving tangible visual progression, unlockable tiers, and level-up milestones.
- **Habitica**: Utilizing gamified accountability and reward loops to encourage consistent daily coding habits.

## Tech Stack

**Frontend:**
- React (Vite)
- React Router (Dynamic client-side routing & page redirection)
- Modern Vanilla CSS (Sleek dark mode developer aesthetic, glassmorphic cards, fluid status animations)

**Backend:**
- Node.js & Express.js (RESTful API architecture)
- PostgreSQL (Relational database hosted on Render)
- `pg` (node-postgres connection pool)

**Deployment:**
- Render (Frontend Static Site & Backend Web Service)

---

## Features

Completed features are marked ✅. The remaining features are planned for later milestones.

### ✅ 1. Interactive Web Dev Skill Tree Explorer
Explore specialized developer tracks (e.g., *Frontend Mastery with React*, *Backend & REST API Architecture*, *Database Modeling with PostgreSQL*, and *DevOps & Cloud Deployment*). Clicking into any tree loads dynamic routes (`/trees/:id`) that display sequential coding milestones, prerequisites, and completion progress.
- **Relational Model:** 1-to-Many (`SkillTrees` -> `Quests`).

![SkillForge walkthrough: browse four skill trees, open the React roadmap, inspect quest status and prerequisites, refresh, and explore another track.](docs/gifs/m3-skill-tree-explorer.gif)

Completed in Milestone 3: the Explorer, dynamic tree detail pages, persisted demo progress summaries, responsive layouts, and loading/error/empty states. The development preview uses seeded developer **Alex Chen**; GitHub sign-in and progress editing are planned separately.

### 2. Full Quest & Project Lifecycle Management (RESTful CRUD)
Developers can manage both core roadmap milestones and custom portfolio challenges. Users can view challenges (`GET`), forge new custom coding quests (`POST`), update requirements, difficulty, and Dev XP rewards (`PATCH`), or remove outdated quests (`DELETE`).
- **Relational Model:** RESTful API with all 4 HTTP methods on `/api/quests`.

[gif goes here]

### 3. Developer Progression & XP Tracker
Developers track their journey as they take on quests. Progress, completion timestamps, earned Dev XP, and repository links/notes are recorded in a dedicated join table.
- **Relational Model & Custom Feature:** Many-to-Many (`Users` <-> `Quests` via `user_quests` join table featuring unique fields: `status`, `xp_earned`, `completed_at`, and `notes`).

[gif goes here]

### 4. Quest Forge Modal / Slide-Out Pane
Allows developers to forge new custom coding quests or view deep-dive project criteria within a responsive, accessible modal overlay without navigating away from their current roadmap view.
- **Custom Feature:** Slide-out pane / modal dialog.

[gif goes here]

### 5. In-Place Coding Milestone Status Toggle
Toggle quest statuses (e.g., from *In Progress* to *Completed*) directly on the page without triggering a page reload or URL change, instantly updating developer XP totals and badge states.
- **Baseline Feature:** Interactive in-page state update.

[gif goes here]

### 6. Database Default State Reset
A dedicated reset feature that restores the PostgreSQL database to its clean default state pre-loaded with curated developer skill tracks, standard coding challenges, and starter progress.
- **Baseline Feature:** Database reset endpoint & seed script (`POST /api/reset`).

[gif goes here]

### 7. Action Feedback & Toast Notification System (Stretch Feature)
Delivers immediate feedback via toast alerts when quests are created, edited, or completed, accompanied by loading spinners and dynamic button disabling during async submissions.
- **Stretch Feature:** Polished UX states & toast alerts.

---

## Installation Instructions

### Prerequisites
- Node.js **24.x** and npm (the version is also recorded in `.nvmrc`)
- A dedicated PostgreSQL database; this milestone uses Render PostgreSQL with TLS

Commands below run from the repository root. In Windows PowerShell, use `npm.cmd` in place of `npm` if script execution policy blocks `npm.ps1`.

### 1. Clone the repository
```bash
git clone https://github.com/bbdevelops/web103_finalproject.git
cd web103_finalproject
```

### 2. Install and configure
```bash
npm install
cp .env.example .env
```

For a fresh clone, fill in the root `.env` with your database settings. Keep an existing configured `.env` when updating the repository. PowerShell also supports `Copy-Item .env.example .env` for the copy step.

Use Render's **external** hostname, database, user, and password in `PGHOST`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`; set `PGPORT=5432` and `PGSSLMODE=require`. Alternatively, set `DATABASE_URL`, which takes precedence over the individual connection fields. The backend loads this root file even when started from `server/`. Keep credentials out of source control.

### 3. Seed the database
```bash
npm run seed
```

The seed command transactionally rebuilds the project's four domain tables, so use a dedicated development database. It creates four tracks, twelve quests, a demo developer and admin, and starter progress. Alex starts with **100 XP**, **1/12 quests completed**, **1 in progress**, and **1/3 completed in React**. Repeated runs restore these defaults. The reusable catalog seed preserves identities/roles for the future reset feature; the CLI schema rebuild is intended for development setup.

### 4. Start the application

Run these in separate terminals from the repository root:

```bash
npm run dev:server  # http://localhost:3001
```

```bash
npm run dev:client  # http://localhost:5173
```

The client proxies `/api` to Express. The navbar links to the Explorer and the future dashboard; quest create/view controls are clearly marked as coming soon. Demo identity is enabled in development and disabled in production.

### Verification

```bash
npm test           # 14 PostgreSQL/API integration tests in a disposable test schema
npm run lint
npm run build
npm run test:browser
```

Browser checks need the two development servers running and Chrome available. Windows uses the standard installed Chrome path; set `CHROME_PATH` for another executable, or install Playwright Chromium with `npx playwright install chromium`. Browser checks cover navigation, seeded data, refresh, mobile layouts, keyboard focus, retry, loading, empty states, and missing routes. They also capture unmocked demo frames under ignored `.artifacts/m3/`.

To rebuild the README GIF after recording, use Python with Pillow installed:

```bash
python scripts/build-demo-gif.py
```

### Implemented API

| Method | Endpoint | Response |
| --- | --- | --- |
| GET | `/api/health` | Database health; 200 `{ "ok": true }` or 503 `{ "ok": false }` |
| GET | `/api/trees` | Trees, quest/completion counts, demo user, and XP/progress summary |
| GET | `/api/trees/:id` | One tree and quests ordered by position then ID, with personal status |

See the [Milestone 3 progress report](milestones/progress_report_3.md), [completion plan](milestones/milestone3_plan.md), and [project board](https://github.com/users/bbdevelops/projects/2) for the sprint evidence.
