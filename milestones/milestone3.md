# Milestone 3

This document should be completed and submitted during **Unit 7** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

You will need to reference the GitHub Project Management guide in the course portal for more information about how to complete each of these steps.

- [x] In your repo, create a project board.
  - *Please be sure to share your project board with the grading team's GitHub **codepathreview**. This is separate from your repository's sharing settings.*
- [x] In your repo, create at least 5 issues from the features on your feature list.
  - List the title of each issue you created:
    1. Project concept, user stories, and feature list
    2. Wireframes and entity relationship diagram
    3. Scaffold React client and Express server
    4. Create PostgreSQL schema and seed script
    5. Skill Tree Explorer page and GET /api/trees
    6. Skill Tree Detail page (/trees/:id)
    7. Quest REST API (GET/POST/PATCH/DELETE /api/quests)
    8. Quest Forge pane: create and edit form
    9. Quest details pane with delete confirmation
    10. Progress API for user_quests
    11. In-place quest status toggle
    12. GitHub OAuth sign-in and sessions
    13. Developer Dashboard (/dashboard)
    14. Database reset endpoint and admin confirmation
    15. Toast notifications and pending states
    16. Deploy client and server to Render
- [x] In your repo, update the status of issues in your project board.
- [x] In your repo, create a GitHub Milestone for each final project unit, corresponding to each of the 5 milestones in your `milestones/` directory.
  - List the name of each milestone you created:
    1. Milestone 1 - Unit 5
    2. Milestone 2 - Unit 6
    3. Milestone 3 - Unit 7
    4. Milestone 4 - Unit 8
    5. Milestone 5 - Unit 9
  - [x] Set the completion percentage of each milestone. The GitHub Milestone for this unit (Milestone 3 - Unit 7) should be 100% completed when you submit for full points.
- [x] In `README.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of the feature's name.
  - [x] Under each feature you have completed, include a GIF showing feature functionality.
- [x] In this document, complete all five questions in the **Reflection** section below.
- [x] Complete every section of [the Milestone 3 progress report](progress_report_3.md), including completed features and issue/source references.

The [public project board](https://github.com/users/bbdevelops/projects/2) is shared with `codepathreview`. Issues #3–#6 form this sprint; #6 was moved forward from M4 to complete the browsing feature. See the [progress report](progress_report_3.md) for the 26-point rubric and evidence.

## Reflection

### 1. What went well during this unit?

We moved SkillForge from planning documents to a working full-stack browsing experience. The React Explorer and dynamic tree detail page now read real tracks, ordered quests, and demo progress from Express and Render PostgreSQL. Our earlier wireframes and ERD provided a useful implementation reference. We also organized 16 issues across five milestones, made the project board public, completed the pitch, and recorded a GIF of the working feature. Verification passed 14 database/API integration tests and 13 browser checks.

### 2. What were some challenges your group faced in this unit?

The main planning challenge was that the Explorer homepage and its detail page were assigned to different milestones even though the README describes them as one feature. We brought issue #6 into M3 so the demonstration could cover a complete browsing journey. Implementation also required connecting a local server to hosted PostgreSQL with TLS, loading the root environment file consistently, and checking that SQL joins did not inflate XP or completion counts. The integration tests helped verify foreign-key behavior, repeatable seeds, and separate progress for different users.

### 3. Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?

Yes. We completed the revised M3 sprint: #3 scaffold, #4 PostgreSQL schema and seed, #5 Explorer homepage/API, and #6 tree detail page/API. We also completed the README feature evidence, GIF, progress report, and reflection. Remaining features stay in later milestones. For M4, the priority is quest CRUD and personal progress APIs, followed by the panes and in-place status controls that depend on them; GitHub OAuth replaces the demo identity through the existing middleware interface.

### 4. Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

Personal progress and XP updates are at risk because repeated completion, reopening quests, and later reward edits must preserve consistent awards. GitHub OAuth and deployment are also at risk because sessions and authorization must work across the client and API. We will build on the tested constraints, isolate ownership checks on the server, and add transaction-focused tests as writes are implemented. If time tightens, we will prioritize the required CRUD, same-page status update, reset, and our two chosen custom features, and defer toast polish and other stretch work.

### 5. What additional support will you need in upcoming units as you continue to work on your final project?

We would benefit from guidance on GitHub OAuth with Passport, PostgreSQL-backed sessions, and cookie/CORS settings for Render deployment. A review of the upcoming progress transactions and creator/admin authorization rules would help prevent duplicate XP awards or unintended edits. We will also need to verify that the final reset endpoint reuses the catalog seed while preserving account identities and roles, then test the complete application after deployment.
