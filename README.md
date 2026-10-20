# SkillForge

CodePath WEB103 Final Project

Designed and developed by: Manas Singh Bhati, Brian Brown, Erika Villalpando, Dilasha Shakya, Muhais Olatundun

🔗 Link to deployed app: [Render Deployment Link Coming in Milestone 5]

## About

### Description and Purpose

**SkillForge** is an RPG-inspired real-world skill tree and quest management web application designed to help learners, developers, and creatives turn overwhelming goals into engaging, gamified progression tracks. 

Users explore curated **Skill Trees** (such as Web Development, Digital Illustration, Fitness, or Music Production), undertake milestone-based **Quests**, and track their real-time XP gains. By transforming intimidating learning curves into bite-sized, actionable quests, SkillForge bridges the gap between passive learning and measurable daily habit formation.

### Inspiration

SkillForge draws inspiration from:
- **GOATPath** (CodePath Exemplar): The concept of guided career milestones and progress rewards.
- **Classic RPG Skill Trees (e.g., Skyrim, World of Warcraft, Path of Exile)**: Visualizing personal skill growth through branching nodes and unlockable achievements.
- **Habitica**: The psychological power of gamification, XP progression, and celebratory feedback for completing real-world tasks.

## Tech Stack

**Frontend:**
- React (Vite)
- React Router (Dynamic client-side routing & page redirection)
- Modern Vanilla CSS (Dark mode, glassmorphism UI, fluid animations)

**Backend:**
- Node.js & Express.js (RESTful API architecture)
- PostgreSQL (Relational database hosted on Render / Supabase / Neon)
- `pg` (node-postgres connection pool)

**Deployment:**
- Render (Frontend Static Site & Backend Web Service)

---

## Features

### 1. Interactive Skill Tree Explorer
Explore diverse domains through branching skill categories. Clicking into any skill tree loads dynamic routes (`/trees/:id`) that display all associated quests and completion status.
- **Relational Model:** 1-to-Many (`SkillTrees` -> `Quests`).

[gif goes here]

### 2. Full Quest Lifecycle Management (RESTful CRUD)
Players have full control over their learning quests. Users can view quests (`GET`), forge new custom quests (`POST`), modify quest objectives, difficulty, and XP rewards (`PATCH`), or abandon obsolete quests (`DELETE`).
- **Relational Model:** RESTful API with all 4 HTTP methods on `/api/quests`.

[gif goes here]

### 3. Quest Progression & XP Tracker
Players track their journey by joining quests. Progress, completion timestamps, and earned XP are recorded in a dedicated join table.
- **Relational Model & Custom Feature:** Many-to-Many (`Users` <-> `Quests` via `user_quests` join table featuring unique fields: `status`, `xp_earned`, `completed_at`, and `notes`).

[gif goes here]

### 4. Quest Forge Modal / Slide-Out Pane
Allows players to forge new quests or inspect detailed quest objectives within a responsive, accessible modal overlay without navigating away from their active skill tree.
- **Custom Feature:** Slide-out pane / modal dialog.

[gif goes here]

### 5. In-Place Quest Status & Completion Toggle
Complete quests and claim rewards directly on the page without triggering a full page reload or URL navigation, instantly updating hero XP and status badges.
- **Baseline Feature:** Interactive in-page state update.

[gif goes here]

### 6. Database Default State Reset
A dedicated reset feature that restores the database to its pristine demo state with pre-populated skill trees, default quests, and sample user progress.
- **Baseline Feature:** Database reset endpoint & seed script (`POST /api/reset`).

[gif goes here]

### 7. Action Feedback & Toast Notification System (Stretch Feature)
Delivers immediate feedback via toast notifications on quest creation, updates, and completion, accompanied by loading spinners and dynamic button disabling during async submissions.
- **Stretch Feature:** Polished UX states & toast alerts.

[gif goes here]

---

## Installation Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (local instance or cloud database connection URL)

### 1. Clone the repository
```bash
git clone https://github.com/[your-team-username]/web103_finalproject.git
cd web103_finalproject
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env # Add your DATABASE_URL and PORT
npm run seed        # Seed initial skill trees & quests
npm run dev         # Starts server on http://localhost:3001
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev         # Starts React app on http://localhost:5173
```
