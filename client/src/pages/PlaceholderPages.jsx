import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";

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
