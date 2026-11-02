import { Link } from "react-router-dom";
import { Icon } from "./Icon.jsx";

export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      Loading your roadmap…
    </div>
  );
}

export function ErrorState({ error, retry }) {
  const notFound = error.status === 404 || error.status === 400;
  return (
    <section className="feedback-panel" role="alert">
      <span className="eyebrow">
        {notFound ? "A DIFFERENT PATH" : "LET’S TRY THAT AGAIN"}
      </span>
      <h1>{notFound ? "That skill tree isn’t here." : "A little detour."}</h1>
      <p>
        {notFound
          ? "This roadmap may have moved. Head back to find your next skill."
          : "We couldn’t reach your roadmap. Check your connection and try again."}
      </p>
      {notFound ? (
        <Link className="button primary" to="/">
          <Icon name="back" size={17} /> Back to skill trees
        </Link>
      ) : (
        <button className="button primary" onClick={retry}>
          Try again <Icon name="arrow" size={17} />
        </button>
      )}
    </section>
  );
}

export function EmptyState({ title, children }) {
  return (
    <section className="empty-state">
      <span className="empty-icon">
        <Icon name="branch" size={28} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
