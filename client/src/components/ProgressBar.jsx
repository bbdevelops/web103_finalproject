export function ProgressBar({ completed, total, label }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={
        total ? `${completed} of ${total} completed` : "No quests yet"
      }
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
