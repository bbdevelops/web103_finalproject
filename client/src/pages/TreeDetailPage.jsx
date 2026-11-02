import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useApiResource } from "../hooks/useApiResource.js";
import { Icon } from "../components/Icon.jsx";
import { treeTheme } from "../lib/treeTheme.js";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { QuestRow } from "../components/QuestRow.jsx";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/Feedback.jsx";

export function TreeDetailPage() {
  const { id } = useParams();
  const { data, loading, error, retry } = useApiResource(
    `/api/trees/${encodeURIComponent(id)}`,
  );
  useEffect(() => {
    document.title = data
      ? `${data.tree.title} · SkillForge`
      : "Skill tree · SkillForge";
  }, [data]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={retry} />;
  const { tree, quests } = data;
  const theme = treeTheme(tree.id);
  return (
    <div className={`detail-page theme-${theme.color}`}>
      <Link to="/" className="back-link">
        <Icon name="back" size={16} /> All skill trees
      </Link>
      <section className="detail-hero">
        <div>
          <span className="eyebrow">
            <Icon name={theme.icon} size={17} /> {theme.category}
          </span>
          <h1>{tree.title}</h1>
          <p>{tree.description}</p>
          <div className="detail-meta">
            <span>
              <Icon name="book" size={15} /> {quests.length} quests
            </span>
            <span>
              <Icon name="bolt" size={15} />{" "}
              {quests.reduce((total, quest) => total + quest.xp_reward, 0)} XP
              to explore
            </span>
          </div>
        </div>
        <div className="detail-progress">
          <span className="small-label">YOUR TRACK PROGRESS</span>
          <strong>
            {tree.completed_count}
            <span> / {tree.quest_count}</span>
          </strong>
          <span className="progress-caption">
            {tree.quest_count ? "quests completed" : "No quests yet"}
          </span>
          <ProgressBar
            completed={tree.completed_count}
            total={tree.quest_count}
            label="Track completion"
          />
        </div>
      </section>
      <div className="detail-columns">
        <section aria-labelledby="quests-heading">
          <div className="section-heading quest-heading">
            <div>
              <span className="eyebrow">BUILD WITH INTENTION</span>
              <h2 id="quests-heading">The quest roadmap</h2>
            </div>
            <button
              className="button secondary"
              disabled
              title="Custom quest creation is coming soon"
            >
              <span>+</span> Forge Quest <small>Soon</small>
            </button>
          </div>
          {quests.length ? (
            <ol className="quest-list">
              {quests.map((quest, index) => (
                <QuestRow key={quest.id} quest={quest} index={index} />
              ))}
            </ol>
          ) : (
            <EmptyState title="A fresh canvas.">
              This track has no quests yet. Explore another tree while this
              roadmap takes shape.
            </EmptyState>
          )}
        </section>
        <aside className="guidance">
          <div className="guidance-heading">
            <Icon name="branch" size={22} />
            <h2>Before you begin</h2>
          </div>
          <p>
            Good foundations help. These are suggestions, never locked doors.
          </p>
          {quests.length > 0 && (
            <ul>
              {quests
                .filter((quest) => quest.prerequisite_notes)
                .map((quest) => (
                  <li key={quest.id}>
                    <strong>{quest.title}</strong>
                    <p>{quest.prerequisite_notes}</p>
                  </li>
                ))}
            </ul>
          )}
          <div className="guidance-footer">
            <Icon name="bolt" size={16} />
            <span>
              Follow your curiosity.
              <br />
              Build at your own pace.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
