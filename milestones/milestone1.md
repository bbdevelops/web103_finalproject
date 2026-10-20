# Milestone 1

This document should be completed and submitted during **Unit 5** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [x] Read and understand all required features
  - [x] Understand you **must** implement **all** baseline features and **two** custom features
- [x] In `readme.md`: update app name to your app's name
- [x] In `readme.md`: add all group members' names
- [x] In `readme.md`: complete the **Description and Purpose** section
- [x] In `readme.md`: complete the **Inspiration** section
- [x] In `readme.md`: list a name and description for all features (minimum 6 for full points) you intend to include in your app (in future units, you will check off features as you complete them and add GIFs demonstrating the features)
- [x] In `planning/user_stories.md`: add all user stories (minimum 10 for full points)
- [x] In `planning/user_stories.md`: use 1-3 unique user roles in your user stories
- [x] In this document, complete all three questions in the **Reflection** section below

## Reflection

### 1. What went well during this unit?

Our team successfully brainstormed and aligned on our app concept, **SkillForge**, an RPG-style gamified skill tree and quest tracking platform focused specifically on web developers. We thoroughly analyzed the course rubric and intentionally structured our relational schema to cleanly satisfy both required database relationships: a 1-to-many relationship (`SkillTrees` -> `Quests`) and a many-to-many relationship via a rich join table (`Users` <-> `Quests` with unique fields for `status`, `xp_earned`, and `completed_at`). We also drafted 12 comprehensive user stories from the perspective of our core user role (Aspiring Web Developer / Code Explorer) to guide our frontend and backend development.

### 2. What were some challenges your group faced in this unit?

Our main challenge was narrowing down our brainstormed ideas from a broad productivity app into a tightly scoped, compelling capstone project that is both feature-rich and realistic to build across the milestones. We had to ensure that our RPG mechanics (leveling up, XP tracking, skill trees) directly satisfied the required RESTful CRUD operations (GET, POST, PATCH, DELETE) and custom features (modal / slide-out pane and unique join table fields) without introducing overwhelming overhead early in the semester.

### 3. What additional support will you need in upcoming units as you continue to work on your final project?

In upcoming units (Milestone 2 for ERD/wireframes and Milestone 3 for Express/PostgreSQL backend development and React Router setup), additional support on best practices for designing and querying join tables with custom fields, configuring CORS between React and Express, and setting up automated database seed and reset scripts for Render deployment will be especially valuable.
