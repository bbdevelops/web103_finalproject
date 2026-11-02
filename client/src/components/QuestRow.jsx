import { Icon } from "./Icon.jsx";

const statuses = {
  completed: "Completed",
  in_progress: "In Progress",
  backlog: "Backlog",
};

export function QuestRow({ quest, index }) {
  return (
    <li className={`quest-row status-${quest.status}`}>
      <span className="quest-step" aria-hidden="true">
        {quest.status === "completed" ? (
          <Icon name="check" size={18} />
        ) : (
          String(index + 1).padStart(2, "0")
        )}
      </span>
      <div className="quest-content">
        <div className="quest-meta">
          <span className={`difficulty difficulty-${quest.difficulty}`}>
            {quest.difficulty}
          </span>
          <span className="xp-reward">
            <Icon name="bolt" size={13} /> {quest.xp_reward} XP
          </span>
        </div>
        <h3>{quest.title}</h3>
        <p>{quest.description}</p>
        <div className="quest-bottom">
          <div className="tag-list">
            {quest.tech_stack_tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <span className={`status-badge ${quest.status}`}>
            <span />
            {statuses[quest.status]}
          </span>
        </div>
        <div className="quest-actions">
          <button
            className="text-button"
            disabled
            title="Quest details are coming soon"
          >
            View quest <Icon name="arrow" size={14} />
          </button>
          <span>More quest tools coming soon</span>
        </div>
      </div>
    </li>
  );
}
