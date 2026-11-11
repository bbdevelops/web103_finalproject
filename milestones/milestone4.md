# Milestone 4

This document should be completed and submitted during **Unit 8** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [ ] Update the completion percentage of each GitHub Milestone. The milestone for this unit (Milestone 4 - Unit 8) should be 100% completed when you submit for full points.
- [x] In `README.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of the feature's name.
  - [x] Under each feature you have completed, include a GIF showing feature functionality.
- [x] In this document, complete all five questions in the **Reflection** section below.

Features 2, 4, and 5 are complete and have real-app GIFs. GitHub milestone/board reconciliation is the remaining submission step; see [the progress report](progress_report_4.md).

## Reflection

### 1. What went well during this unit?

The M3 schema and browsing pages provided a useful foundation for the six M4 issues. Quest CRUD, shared create/edit and details panes, personal progress saves, and in-place status updates now work together without leaving the roadmap. PostgreSQL-backed GitHub sessions were verified with real sign-in, return navigation, refresh, logout, and reauthentication. All 24 API/database tests and 15 browser checks pass, and three GIFs show the completed features using the running app and a real GitHub session.

### 2. What were some challenges your group faced in this unit?

The main implementation challenges were keeping shared quest ownership separate from personal progress, making completion awards safe under concurrent requests, and preserving notes when only a status changes. Transactions and quest-row locking keep saved awards consistent. Browser checks exposed labels whose accessible names changed when validation errors or saved textarea content appeared; explicit label associations fixed them. The automated OAuth fixture also needed to intercept the initial redirect request because browser routing does not intercept later URLs in that redirect chain. A separate real OAuth check ensured that the fixture was not our only authentication evidence.

### 3. Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?

The implementation and verification for all six planned M4 issues (#7–#12) are complete. The final submission step is to synchronize the issue checklists, Closed/Done states, milestone percentages, and grading branch with this evidence. No unfinished feature was moved out of M4 to raise its percentage. M5 remains focused on the dashboard, admin reset, reusable toast notifications, and deployment; deployment and its end-to-end production checks should take priority over additional polish.

### 4. Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

Production deployment and cross-site authentication remain the highest risks because the client, API, callback URLs, CORS configuration, and secure cookies must agree on Render. The dashboard still needs to consume the completed progress API, and database reset needs server-enforced admin access plus confirmation of its global effect. We will keep these four existing M5 issues as the remaining scope, verify production sign-in early, and defer optional toast polish if deployment work takes longer than expected. The progress API alone is not recorded as completion of the dashboard feature.

### 5. What additional support will you need in upcoming units as you continue to work on your final project?

The next unit will need access to Render configuration and production OAuth settings, plus review of cross-site sessions, admin-only reset behavior, and the deployed end-to-end journey. Peer or TA review of keyboard/mobile interactions and the final demo would provide additional confidence. The installation, automated checks, real OAuth verification, and GIF recording steps are documented so team members can reproduce the results without sharing credentials.
