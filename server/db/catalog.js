export const catalog = [
  {
    title: "Frontend Mastery with React",
    description:
      "Turn ideas into interfaces. Build a strong web foundation, then bring it to life with React.",
    quests: [
      {
        title: "HTML & CSS foundations",
        description:
          "Build a responsive, accessible page from semantic HTML and modern CSS.",
        requirements:
          "Create a semantic page with navigation, a responsive card grid, and visible keyboard focus.",
        tags: ["HTML", "CSS"],
        docs: [
          "https://developer.mozilla.org/en-US/docs/Learn_web_development",
        ],
        prerequisite: "Start here. No prior frontend experience required.",
      },
      {
        title: "Manage React state",
        description:
          "Give your interface memory with components, events, and React state.",
        requirements:
          "Build a task list with controlled inputs and reusable components using useState.",
        tags: ["React", "State"],
        docs: ["https://react.dev/learn/managing-state"],
        prerequisite:
          "Comfort with HTML, CSS, and JavaScript functions is helpful.",
      },
      {
        title: "Build React routing",
        description:
          "Connect your portfolio pages through dynamic client-side routes.",
        requirements:
          "Create list and detail pages with React Router, route parameters, and a not-found state.",
        tags: ["React", "Routing"],
        docs: ["https://reactrouter.com/start/declarative/routing"],
        prerequisite:
          "Try React components and state before exploring routing.",
        custom: true,
      },
    ],
  },
  {
    title: "Backend & REST API Architecture",
    description:
      "Build the engine behind the experience. Design APIs that are clear, reliable, and ready to grow.",
    quests: [
      {
        title: "Your first Express server",
        description: "Start an Express application and serve structured JSON.",
        requirements:
          "Add a health route, JSON middleware, and an environment-configured port.",
        tags: ["Node.js", "Express"],
        docs: ["https://expressjs.com/en/starter/hello-world.html"],
        prerequisite:
          "Basic JavaScript and command-line familiarity are helpful.",
      },
      {
        title: "Design a RESTful resource",
        description: "Model predictable endpoints around a single resource.",
        requirements:
          "Implement GET, POST, PATCH, and DELETE with appropriate status codes.",
        tags: ["REST", "HTTP"],
        docs: ["https://expressjs.com/en/guide/routing.html"],
        prerequisite: "Explore Express routing and HTTP request methods first.",
      },
      {
        title: "Validate and protect an API",
        description:
          "Handle invalid input and keep resource changes scoped to their owners.",
        requirements:
          "Validate payloads, enforce ownership, and return safe, useful error responses.",
        tags: ["Validation", "Authorization"],
        docs: ["https://expressjs.com/en/guide/error-handling.html"],
        prerequisite:
          "Build a small REST API before adding validation and authorization.",
      },
    ],
  },
  {
    title: "Database Modeling with PostgreSQL",
    description:
      "Give your app a dependable memory. Model relationships and make every query count.",
    quests: [
      {
        title: "Model your first schema",
        description: "Translate a small application into relational tables.",
        requirements:
          "Define primary keys, required fields, and a one-to-many foreign key.",
        tags: ["PostgreSQL", "Schema"],
        docs: ["https://www.postgresql.org/docs/current/tutorial.html"],
        prerequisite:
          "Start with entities, attributes, and the relationships between them.",
      },
      {
        title: "Connect data with joins",
        description: "Use a join table to model a many-to-many relationship.",
        requirements:
          "Create a composite key and query related records without duplicate totals.",
        tags: ["SQL", "Joins"],
        docs: ["https://www.postgresql.org/docs/current/tutorial-join.html"],
        prerequisite:
          "Familiarity with SELECT statements and foreign keys is helpful.",
      },
      {
        title: "Make changes transactional",
        description:
          "Keep related database changes consistent through transactions.",
        requirements:
          "Implement a repeatable seed and demonstrate rollback after a failed change.",
        tags: ["Transactions", "Integrity"],
        docs: [
          "https://www.postgresql.org/docs/current/tutorial-transactions.html",
        ],
        prerequisite:
          "Explore constraints and basic SQL writes before using transactions.",
      },
    ],
  },
  {
    title: "DevOps & Cloud Deployment",
    description:
      "Take your work beyond localhost. Learn the tools and habits that get a full-stack app online.",
    quests: [
      {
        title: "Configure your environment",
        description: "Separate application configuration from source code.",
        requirements:
          "Use environment variables and commit a credential-free example file.",
        tags: ["Environment", "Git"],
        docs: [
          "https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs",
        ],
        prerequisite: "A locally running application is a good starting point.",
      },
      {
        title: "Deploy a full-stack app",
        description: "Connect a hosted client, API, and PostgreSQL database.",
        requirements:
          "Deploy the services and verify API access and direct frontend routes.",
        tags: ["Render", "Deployment"],
        docs: ["https://render.com/docs/deploy-node-express-app"],
        prerequisite:
          "Have a working frontend, API, and database ready to connect.",
      },
      {
        title: "Verify production behavior",
        description: "Check the paths users depend on after every deployment.",
        requirements:
          "Verify health, error states, environment settings, and a complete user journey.",
        tags: ["Testing", "Operations"],
        docs: ["https://render.com/docs/health-checks"],
        prerequisite:
          "Deploy a small app before checking its production behavior.",
      },
    ],
  },
];
