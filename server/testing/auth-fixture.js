import { Strategy as GitHubStrategy } from "passport-github2";

// Test-only dependency injection; never mounted by the normal server entry point.
// Only the external OAuth provider is replaced. Passport state/session handling stays real.
export function fixtureStrategy(options, verify) {
  const strategy = new GitHubStrategy(options, verify);
  strategy._oauth2.getOAuthAccessToken = (code, _params, done) =>
    code === "fail"
      ? done(new Error("Provider unavailable"))
      : done(null, `fixture:${code}`, undefined, {});
  strategy.userProfile = (token, done) => {
    const name = token.slice("fixture:".length);
    const profile =
      name === "alex"
        ? {
            id: "skillforge:alex",
            username: "alex-chen-demo",
            displayName: "Alex Chen",
          }
        : name === "admin"
          ? {
              id: "skillforge:admin",
              username: "skillforge-admin-demo",
              displayName: "Demo Administrator",
            }
          : {
              id: `fixture:${name}`,
              username: name,
              displayName: `Developer ${name}`,
            };
    done(null, profile);
  };
  return strategy;
}
