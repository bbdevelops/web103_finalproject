import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";

export function DashboardPage() {
  useEffect(() => {
    document.title = "Dashboard · SkillForge";
  }, []);
  return (
    <section className="feedback-panel">
      <span className="eyebrow">YOUR NEXT CHAPTER</span>
      <h1>A home for your progress.</h1>
      <p>
        The developer dashboard is coming soon. In the meantime, explore your
        skill trees and see your demo progress on the roadmap.
      </p>
      <Link className="button primary" to="/">
        Explore skill trees <Icon name="arrow" size={17} />
      </Link>
    </section>
  );
}

export function NotFoundPage() {
  useEffect(() => {
    document.title = "Page not found · SkillForge";
  }, []);
  return (
    <section className="feedback-panel">
      <span className="eyebrow">404 · OFF THE MAP</span>
      <h1>Let’s find your path.</h1>
      <p>This page doesn’t exist, but your next skill is waiting.</p>
      <Link className="button primary" to="/">
        <Icon name="back" size={17} /> Back to skill trees
      </Link>
    </section>
  );
}
