import { Link } from "react-router-dom";
import { Icon } from "./Icon.jsx";
import { treeTheme } from "../lib/treeTheme.js";
import { ProgressBar } from "./ProgressBar.jsx";

export function TreeCard({ tree, index }) {
  const theme = treeTheme(tree.id);
  const percentage = tree.quest_count
    ? `${Math.round((tree.completed_count / tree.quest_count) * 100)}%`
    : "—";
  return (
    <Link to={`/trees/${tree.id}`} className={`tree-card theme-${theme.color}`}>
      <div className="card-top">
        <span className="track-icon">
          <Icon name={theme.icon} size={25} />
        </span>
        <span className="track-number">
          TRACK {String(index + 1).padStart(2, "0")}
        </span>
        <span className="card-arrow">
          <Icon name="arrow" size={19} />
        </span>
      </div>
      <span className="eyebrow track-category">{theme.category}</span>
      <h3>{tree.title}</h3>
      <p className="card-description">{tree.description}</p>
      <div className="card-progress">
        <span>
          <strong>{tree.completed_count}</strong> / {tree.quest_count} completed
        </span>
        <span>{percentage}</span>
      </div>
      <ProgressBar
        completed={tree.completed_count}
        total={tree.quest_count}
        label={`${tree.title} progress`}
      />
      <div className="card-bottom">
        <span>
          <Icon name="book" size={14} /> {tree.quest_count} quests
        </span>
        <span>
          {tree.completed_count ? "Continue track" : "Explore track"}{" "}
          <Icon name="arrow" size={14} />
        </span>
      </div>
    </Link>
  );
}
