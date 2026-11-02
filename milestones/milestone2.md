# Milestone 2

This document should be completed and submitted during **Unit 6** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [x] In `planning/wireframes.md`: add wireframes for at least three pages in your web app.
  - [x] Include a list of pages in your app
- [x] In `planning/entity_relationship_diagram.md`: add the entity relationship diagram you developed for your database.
  - [x] Your entity relationship diagram should include the tables in your database.
- [x] Prepare your three-minute pitch presentation, to be presented during Unit 7 (the next unit).
  - [x] You do **not** need to submit any materials in advance of your pitch.
  - The pitch was delivered during Unit 7, as confirmed for Milestone 3.
- [x] In this document, complete all three questions in the **Reflection** section below

## Reflection

### 1. What went well during this unit?

During this unit, we turned SkillForge’s core concept into clear wireframes and a database design. We completed layouts for the Skill Tree Explorer, Skill Tree Detail, and Developer Dashboard, along with quest-details and create/edit panes. Our four-table ERD connects skill trees to quests and developers to personal progress, giving us a consistent reference for implementing the app’s main features.

### 2. What were some challenges your group faced in this unit?

Coordinating design decisions while keeping the project scope manageable was a challenge. We needed to balance the RPG-inspired experience with required features such as quest CRUD, dynamic navigation, and relational data. We narrowed the design to three main pages, reused slide-out panes for quest interactions, and kept prerequisites informational to make the planned app more practical to build within the capstone timeline.

### 3. What additional support will you need in upcoming units as you continue to work on your final project?

We would benefit from support translating our ERD into PostgreSQL tables, constraints, and queries, particularly for the `user_quests` join table. Guidance on building Express CRUD endpoints and updating quest status, completion timestamps, and earned XP consistently would help us implement the design reliably. We would also appreciate examples of seed and reset workflows that preserve database relationships.
