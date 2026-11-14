import { useId } from "react";

export function QuestFilters({
  value,
  onChange,
  canTrack,
  count,
  total,
  onClear,
}) {
  const filterId = useId();
  return (
    <div className="quest-filters" aria-label="Filter and sort quests">
      <div className="filter-controls">
        <div>
          <label htmlFor={`${filterId}-difficulty`}>Difficulty</label>
          <select
            id={`${filterId}-difficulty`}
            value={value.difficulty}
            onChange={(event) =>
              onChange({ ...value, difficulty: event.target.value })
            }
          >
            <option value="all">All difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${filterId}-status`}>My status</label>
          <select
            id={`${filterId}-status`}
            value={canTrack ? value.status : "all"}
            disabled={!canTrack}
            title={canTrack ? undefined : "Sign in to filter your progress"}
            onChange={(event) =>
              onChange({ ...value, status: event.target.value })
            }
          >
            <option value="all">All statuses</option>
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${filterId}-sort`}>Sort quests</label>
          <select
            id={`${filterId}-sort`}
            value={value.sort}
            onChange={(event) =>
              onChange({ ...value, sort: event.target.value })
            }
          >
            <option value="roadmap">Roadmap order</option>
            <option value="xp">Highest XP</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      <div className="filter-summary">
        <span aria-live="polite">
          Showing {count} of {total} quests
        </span>
        <button className="text-button" onClick={onClear}>
          Clear filters
        </button>
      </div>
    </div>
  );
}
