import { useEffect } from "react";
import { useApiResource } from "../hooks/useApiResource.js";
import { Icon } from "../components/Icon.jsx";
import { TreeCard } from "../components/TreeCard.jsx";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/Feedback.jsx";

export function ExplorerPage() {
  const { data, loading, error, retry } = useApiResource("/api/trees");
  useEffect(() => {
    document.title = "Skill trees · SkillForge";
  }, []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={retry} />;
  const { trees, summary, user } = data;
  return (
    <>
      <section className="explorer-hero">
        <div>
          <span className="eyebrow hero-eyebrow">
            <span className="live-dot" /> YOUR DEVELOPER ROADMAP
          </span>
          <h1>
            Build skills.
            <br />
            <span>Forge your path.</span>
          </h1>
          <p>
            Big ambitions start with small quests. Pick a track,
            <br className="desktop-break" /> sharpen your stack, and turn
            learning into progress.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <span className="art-node node-one">
            <Icon name="code" size={23} />
          </span>
          <span className="art-node node-two">
            <Icon name="database" size={23} />
          </span>
          <span className="art-node node-three">
            <Icon name="cloud" size={23} />
          </span>
          <span className="art-center">
            <Icon name="bolt" size={53} />
          </span>
          <span className="art-caption">ONE QUEST AT A TIME</span>
        </div>
      </section>
      <section
        className="stats-panel"
        aria-label={
          user ? `${user.display_name}'s demo progress` : "Roadmap progress"
        }
      >
        <div className="stats-intro">
          <span className="stat-spark">
            <Icon name="bolt" size={23} />
          </span>
          <div>
            <span className="small-label">
              {user ? "YOUR JOURNEY SO FAR" : "YOUR NEXT ADVENTURE"}
            </span>
            <strong>
              {user
                ? "Keep the momentum going."
                : "Every developer starts somewhere."}
            </strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-value">
            {summary.total_xp}
            <small> XP</small>
          </span>
          <span className="small-label">EARNED</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {summary.completed_quests}
            <small> / {summary.total_quests}</small>
          </span>
          <span className="small-label">QUESTS COMPLETED</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {summary.in_progress_quests}
            <span className="activity-dot" />
          </span>
          <span className="small-label">IN PROGRESS</span>
        </div>
      </section>
      <section className="tracks-section" aria-labelledby="tracks-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PICK YOUR SPECIALIZATION</span>
            <h2 id="tracks-heading">
              Your skill trees<span className="count-pill">{trees.length}</span>
            </h2>
          </div>
          <span className="section-note">
            <Icon name="branch" size={16} /> Every path starts with a first
            step.
          </span>
        </div>
        {trees.length ? (
          <div className="tree-grid">
            {trees.map((tree, index) => (
              <TreeCard key={tree.id} tree={tree} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState title="New paths are on the way.">
            There are no skill trees yet. Check back soon for your first track.
          </EmptyState>
        )}
      </section>
      <aside className="explorer-note">
        <Icon name="book" size={18} />
        <span>
          Your pace. Your path. Prerequisites are guidance, so you can explore
          wherever curiosity takes you.
        </span>
      </aside>
    </>
  );
}
