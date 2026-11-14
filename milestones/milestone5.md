# Milestone 5

This document should be completed and submitted during **Unit 9** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [ ] Deploy your project on Render
  - [ ] In `readme.md`, add the link to your deployed project
- [x] Update the status of issues in your project board as you complete them
- [ ] In `readme.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of their title
  - [ ] Under each feature you have completed, **include a GIF** showing feature functionality
- [x] In this document, complete the **Reflection** section below
- [ ] 🚩🚩🚩**Complete the Final Project Feature Checklist section below**, detailing each feature you completed in the project (ONLY include features you implemented, not features you planned)
- [ ] 🚩🚩🚩**Record a GIF showing a complete run-through of your app** that displays all the components included in the **Final Project Feature Checklist** below
  - [ ] Include this GIF in the **Final Demo GIF** section below

## Implementation and release status

The dashboard (#13), reset (#14), and filtering (#19) are verified locally. Render setup (#16), deployed GIFs, and final evidence (#20) remain in progress. Toast issue #15 is teammate-owned and excluded from this implementation. See the [M5 progress report](progress_report_5.md) for actual issue status and evidence.

## Final Project Feature Checklist

Complete the checklist below detailing each baseline, custom, and stretch feature you completed in your project. This checklist will help graders look for each feature in the GIF you submit.

### Baseline Features

Checked items are implemented and verified locally. Deployment and final recording evidence remain pending the owner setup checkpoint.

- [x] The project includes an Express backend app and a React frontend app
- [x] The project includes these backend-specific features:
  - [x] At least one of each of the following database relationships in Postgres
    - [x] one-to-many
    - [x] many-to-many with a join table
  - [x] A well-designed RESTful API that:
    - [x] supports all four main request types for a single entity (ex. tasks in a to-do list app): GET, POST, PATCH, and DELETE
      - [x] the user can **view** items, such as tasks
      - [x] the user can **create** a new item, such as a task
      - [x] the user can **update** an existing item by changing some or all of its values, such as changing the title of task
      - [x] the user can **delete** an existing item, such as a task
    - [x] Routes follow proper naming conventions
  - [x] The web app includes the ability to reset the database to its default state
- [x] The project includes these frontend-specific features:
  - [x] At least one redirection, where users are able to navigate to a new page with a new URL within the app
  - [x] At least one interaction that the user can initiate and complete on the same page without navigating to a new page
  - [x] Dynamic frontend routes created with React Router
  - [x] Hierarchically designed React components
    - [x] Components broken down into categories, including Page and Component types
    - [x] Corresponding container components and presenter components as appropriate
- [x] The project includes dynamic routes for both frontend and backend apps
- [ ] The project is deployed on Render with all pages and features that are visible to the user are working as intended

### Custom Features

Checked items are implemented and verified locally. Deployment and final recording evidence remain pending the owner setup checkpoint.

- [x] The project gracefully handles errors
- [ ] The project includes a one-to-one database relationship
- [x] The project includes a slide-out pane or modal as appropriate for your use case that pops up and covers the page content without navigating away from the current page
- [x] The project includes a unique field within the join table
- [x] The project includes a custom non-RESTful route with corresponding controller actions
- [x] The user can filter or sort items based on particular criteria as appropriate for your use case
- [x] Data is automatically generated in response to a certain event or user action. Examples include generating a default inventory for a new user starting a game or creating a starter set of tasks for a user creating a new task app account
- [x] Data submitted via a POST or PATCH request is validated before the database is updated (e.g. validating that an event is in the future before allowing a new event to be created)
  - [ ] *To receive full credit, please be sure to demonstrate in your walkthrough that for certain inputs, the item will NOT be successfully created or updated.*

### Stretch Features

Checked items are implemented and verified locally. Deployment and final recording evidence remain pending the owner setup checkpoint.

- [x] A subset of pages require the user to log in before accessing the content
  - [x] Users can log in and log out via GitHub OAuth with Passport.js
- [x] Restrict available user options dynamically, such as restricting available purchases based on a user's currency
- [x] Show a spinner while a page or page element is loading
- [x] Disable buttons and inputs during the form submission process
- [ ] Disable buttons after they have been clicked
  - *At least 75% of buttons in your app must exhibit this behavior to receive full credit*
- [ ] Users can upload images to the app and have them be stored on a cloud service
  - *A user profile picture does **NOT** count for this rubric item **only if** the app also includes "Login via GitHub" functionality.*
  - *Adding a photo via a URL does **NOT** count for this rubric item (for example, if the user provides a URL with an image to attach it to the post).*
  - *Selecting a photo from a list of provided photos does **NOT** count for this rubric item.*
- [ ] 🍞 [Toast messages](https://www.patternfly.org/v3/pattern-library/communication/toast-notifications/index.html) deliver simple feedback in response to user events

## Final Demo GIF

The complete deployed-app walkthrough will be recorded after the owner finishes the [Render setup checkpoint](../docs/render-deployment.md). No final recording is claimed yet.

## Reflection

### 1. What went well during this unit?

The existing relational schema, reusable panes, and transactional progress API allowed the final features to build on a tested foundation. The dashboard now shows private totals, tree progress, and recent completions; filters preserve full-track statistics; and admin reset preserves accounts, roles, and sessions. The local gates pass: 31 API/database tests, 20 browser checks, lint, production build, and built single-service routing smoke checks. Live Render verification follows the documented owner setup checkpoint.

### 2. What were some challenges your group faced in this unit?

Authentication required careful handling around protected routes. Browser checks exposed a logout race where the dashboard could restart GitHub sign-in before navigation returned home; remembering that the page already had an authenticated visitor fixed it. Reset needed a single transaction, rollback tests, and explicit confirmation because it affects every user. Moving from two hosted services to one shared origin also required correct asset/deep-link routing, production cookies, and preserving JSON API errors.

### 3. What were some of the highlights or achievements that you are most proud of in this project?

The project now connects a responsive React interface, an Express API, real PostgreSQL relationships, GitHub sessions, ownership checks, and consistent XP awards. The strongest achievements are the reusable accessible quest panes, completion snapshots that remain correct under concurrent saves, and a reset flow that restores defaults without removing account identities. The final dashboard and filtering controls make those capabilities easier to understand and demonstrate.

### 4. Reflecting on your web development journey so far, how have you grown since the beginning of the course?

The project records a progression from user stories and wireframes to relational modeling, validated APIs, stateful React interactions, OAuth, and automated integration checks. That work demonstrates broader full-stack skills than the initial static design: debugging behavior across browser, server, and database boundaries; protecting personal data; and turning acceptance criteria into repeatable verification. Team members should review this shared project-based reflection for their individual course experience.

### 5. Looking ahead, what are your goals related to web development, and what steps do you plan to take to achieve them?

The proposed next goals are to strengthen production deployment habits, improve automated release checks, and keep practicing accessible interfaces and reliable database changes. Useful next steps after the capstone are adding CI for the existing suites, reviewing production logs and deployment health, and building another small application with the same testing discipline. Team members should adjust these shared technical goals to match their own plans before submission.
