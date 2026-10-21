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
- PostgreSQL (Relational database hosted on Render / Supabase / Neon)
- `pg` (node-postgres connection pool)

**Deployment:**
- Render (Frontend Static Site & Backend Web Service)

---

## Features

### 1. Interactive Web Dev Skill Tree Explorer
Explore specialized developer tracks (e.g., *Frontend Mastery with React*, *Backend & REST API Architecture*, *Database Modeling with PostgreSQL*, and *DevOps & Cloud Deployment*). Clicking into any tree loads dynamic routes (`/trees/:id`) that display sequential coding milestones, prerequisites, and completion progress.
- **Relational Model:** 1-to-Many (`SkillTrees` -> `Quests`).

[gif goes here]

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
- Node.js (v18 or higher)
- PostgreSQL (local instance or cloud database connection URL)

### 1. Clone the repository
```bash
git clone https://github.com/bbdevelops/web103_finalproject.git
cd web103_finalproject
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env # Add your DATABASE_URL and PORT
npm run seed        # Seed initial developer skill trees & quests
npm run dev         # Starts server on http://localhost:3001
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev         # Starts React app on http://localhost:5173
```
