import { useEffect, useRef } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { useApiResource } from "../hooks/useApiResource.js";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../components/Feedback.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { ResetDatabase } from "../components/ResetDatabase.jsx";
import { Icon } from "../components/Icon.jsx";

function SignInPrompt({ message }) {
  const { signIn } = useOutletContext();
  return (
    <section className="feedback-panel">
      <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
      <h1>Sign in to your dashboard.</h1>
      <p>
        {message ??
          "Your progress, notes, and completed quests are waiting here."}
      </p>
      <button className="button primary" onClick={signIn}>
        Sign in with GitHub
      </button>
    </section>
  );
}

function DashboardContent() {
  const { user } = useOutletContext();
  const { data, loading, error, retry } = useApiResource("/api/me/progress");
  if (error?.status === 401)
    return (
      <SignInPrompt message="Your session ended. Sign in again to see your progress." />
    );
  if (loading) return <LoadingState />;
  if (!data) return <ErrorState error={error} retry={retry} />;
  const { summary, trees, recent_completions } = data;
  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">YOUR DEVELOPER JOURNEY</span>
          <h1>Your developer dashboard</h1>
          <p>
            Welcome back, {user.display_name}. Every quest moves your story
            forward.
          </p>
        </div>
        <Link className="button secondary" to="/">
          Explore skill trees <Icon name="arrow" size={16} />
        </Link>
      </section>
      {error && (
        <div role="alert" className="inline-error">
          {error.message}{" "}
          <button className="text-button" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      <section className="dashboard-stats" aria-label="Your progress summary">
        <div className="dashboard-stat">
          <span className="small-label">TOTAL EARNED XP</span>
          <strong aria-label="Dashboard earned XP">
            {summary.total_xp}
            <small> XP</small>
          </strong>
          <p>Built through practice.</p>
        </div>
        <div className="dashboard-stat">
          <span className="small-label">QUESTS COMPLETED</span>
          <strong>
            {summary.completed_quests}
            <small> / {summary.total_quests}</small>
          </strong>
          <p>One milestone at a time.</p>
        </div>
        <div className="dashboard-stat">
          <span className="small-label">IN PROGRESS</span>
          <strong>{summary.in_progress_quests}</strong>
          <p>Your next wins are taking shape.</p>
        </div>
      </section>
      <div className="dashboard-columns">
        <section aria-labelledby="dashboard-tracks">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STACK YOUR SKILLS</span>
              <h2 id="dashboard-tracks">Your skill trees</h2>
            </div>
          </div>
          {trees.length ? (
            <ul className="dashboard-track-list">
              {trees.map((tree) => (
                <li key={tree.id}>
                  <Link className="dashboard-track" to={`/trees/${tree.id}`}>
                    <div>
                      <strong>{tree.title}</strong>
                      <span>
                        {tree.quest_count
                          ? `${tree.completed_count} / ${tree.quest_count} completed`
                          : "No quests yet"}
                      </span>
                    </div>
                    <ProgressBar
                      completed={tree.completed_count}
                      total={tree.quest_count}
                      label={`${tree.title} completion`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Your next path is on its way.">
              New skill trees will appear here.
            </EmptyState>
          )}
        </section>
        <section aria-labelledby="recent-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PROOF OF YOUR PROGRESS</span>
              <h2 id="recent-heading">Recent completions</h2>
            </div>
          </div>
          {recent_completions.length ? (
            <ul className="completion-list">
              {recent_completions.map((completion) => (
                <li key={completion.quest_id}>
                  <span className="completion-icon" aria-hidden="true">
                    <Icon name="check" size={17} />
                  </span>
                  <div>
                    <Link
                      className="completion-link"
                      to={`/trees/${completion.skill_tree_id}?quest=${completion.quest_id}`}
                    >
                      {completion.quest_title}
                    </Link>
                    <p>{completion.tree_title}</p>
                    <div className="completion-meta">
                      <time dateTime={completion.completed_at}>
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                        }).format(new Date(completion.completed_at))}
                      </time>
                      <span>+{completion.xp_earned} XP</span>
                    </div>
                    {completion.repository_url && (
                      <a
                        className="repository-link"
                        href={completion.repository_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View repository <Icon name="arrow" size={12} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Your first win belongs here.">
              Complete a quest on a skill tree to start your history. Notes and
              project links stay attached to your progress.
            </EmptyState>
          )}
        </section>
      </div>
      <ResetDatabase />
    </div>
  );
}

export function DashboardPage() {
  const { user, authLoading, authError, signIn } = useOutletContext();
  const { search } = useLocation();
  const started = useRef(false);
  const failed = new URLSearchParams(search).has("authError");
  useEffect(() => {
    document.title = "Dashboard · SkillForge";
  }, []);
  useEffect(() => {
    // Logging out of an already authenticated dashboard must not restart OAuth.
    if (user) {
      started.current = true;
      return;
    }
    if (!authLoading && !user && !failed && !authError && !started.current) {
      started.current = true;
      signIn();
    }
  }, [authLoading, user, failed, authError, signIn]);
  if (authLoading) return <LoadingState />;
  if (!user)
    return (
      <SignInPrompt
        message={
          failed
            ? "GitHub sign-in did not finish. Try again when you're ready."
            : authError || undefined
        }
      />
    );
  return <DashboardContent />;
}
