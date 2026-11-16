import { useGuardedSubmit } from "../hooks/useGuardedSubmit.js";
import { ActionButton } from "./ActionButton.jsx";
import { useId, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api.js";
import { useApiResource } from "../hooks/useApiResource.js";
import { QuestDialog } from "./QuestDialog.jsx";
import { useToast } from "../hooks/useToast.js";
import { progressKey, toastProgress } from "../lib/toastProgress.js";
import { QUEST_SAVE } from "../lib/toastKeys.js";
import { QuestCover } from "./QuestCover.jsx";

function PersonalProgress({
  quest,
  progress,
  onSaved,
  onDirty,
  onPending,
  busy,
}) {
  const fieldId = useId();
  const [form, setForm] = useState({
    status: progress?.status ?? "backlog",
    notes: progress?.notes ?? "",
    repository_url: progress?.repository_url ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [savedStatus, setSavedStatus] = useState(form.status);
  const toast = useToast();
  function change(name, value) {
    setForm({ ...form, [name]: value });
    onDirty(true);
  }
  async function save(event) {
    event.preventDefault();
    setPending(true);
    onPending(true);
    setError(null);
    toast.loading(quest.title, {
      title: "Saving progress…",
      key: progressKey(quest),
    });
    try {
      const { progress: saved } = await api(
        `/api/quests/${quest.id}/progress`,
        { method: "PUT", body: JSON.stringify(form) },
      );
      onDirty(false);
      toastProgress(toast, quest, savedStatus, saved, "Progress saved");
      setSavedStatus(saved.status);
      onSaved();
    } catch (failure) {
      toast.dismiss(progressKey(quest));
      setError(failure);
    } finally {
      setPending(false);
      onPending(false);
    }
  }
  const submit = useGuardedSubmit(save);
  return (
    <form className="personal-progress" onSubmit={submit}>
      <h3>Your progress</h3>
      <p>Your notes and repository link belong to your account.</p>
      <fieldset
        disabled={pending || busy}
        className="quest-fields single-column"
      >
        <div className="form-field">
          <label htmlFor={`${fieldId}-status`}>Status</label>
          <select
            id={`${fieldId}-status`}
            value={form.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${fieldId}-notes`}>Notes</label>
          <textarea
            id={`${fieldId}-notes`}
            value={form.notes}
            rows={3}
            onChange={(event) => change("notes", event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${fieldId}-repository`}>Repository URL</label>
          <input
            id={`${fieldId}-repository`}
            type="url"
            value={form.repository_url}
            onChange={(event) => change("repository_url", event.target.value)}
            placeholder="https://github.com/you/project"
            aria-invalid={Boolean(error?.fields?.repository_url)}
            aria-describedby={
              error?.fields?.repository_url
                ? `${fieldId}-repository-error`
                : undefined
            }
          />
          {error?.fields?.repository_url && (
            <small id={`${fieldId}-repository-error`} className="field-error">
              {error.fields.repository_url}
            </small>
          )}
        </div>
        <ActionButton
          type="submit"
          className="button primary"
          disabled={pending || busy}
        >
          {pending ? "Saving…" : "Save my progress"}
        </ActionButton>
      </fieldset>
      {error && (
        <p role="alert" className="inline-error">
          {error.message} Your input is kept; try saving again.
        </p>
      )}
    </form>
  );
}
export function QuestDetails({
  questId,
  onClose,
  onEdit,
  onSaved,
  restoreFocusTo,
}) {
  const { user, signIn, invalidate } = useOutletContext();
  const toast = useToast();
  const { data, error, retry } = useApiResource(`/api/quests/${questId}`);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [coverDirty, setCoverDirty] = useState(false);
  const [coverPending, setCoverPending] = useState(false);
  const close = () => {
    if (
      !deleting &&
      !saving &&
      !coverPending &&
      (!(dirty || coverDirty) ||
        window.confirm("Discard your unsaved progress changes?"))
    )
      onClose();
  };
  const quest = data?.quest;
  const canManage =
    user &&
    quest &&
    (user.role === "admin" || quest.created_by_user_id === user.id);
  async function remove() {
    setDeleting(true);
    setDeleteError("");
    toast.loading(quest.title, { title: "Deleting quest…", key: QUEST_SAVE });
    try {
      await api(`/api/quests/${quest.id}`, { method: "DELETE" });
      onSaved(quest.title, "Quest deleted", "delete");
    } catch (failure) {
      toast.dismiss(QUEST_SAVE);
      setDeleteError(failure.message);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <QuestDialog
      title={quest?.title ?? "Quest details"}
      onClose={close}
      pending={deleting || saving || coverPending}
      restoreFocusTo={restoreFocusTo}
    >
      <div className="pane-body">
        {!data && !error && <p role="status">Loading quest…</p>}
        {error && (
          <div role="alert" className="inline-error">
            {error.message}{" "}
            <ActionButton onClick={retry}>Try again</ActionButton>
          </div>
        )}
        {quest && (
          <>
            <QuestCover
              quest={quest}
              image={data.image}
              canManage={canManage}
              busy={deleting || saving}
              onSaved={invalidate}
              onDirty={setCoverDirty}
              onPending={setCoverPending}
            />
            <div className="quest-meta">
              <span className={`difficulty difficulty-${quest.difficulty}`}>
                {quest.difficulty}
              </span>
              <span className="xp-reward">{quest.xp_reward} XP</span>
            </div>
            <p className="quest-description">{quest.description}</p>
            <h3>Requirements</h3>
            <p className="preserve-lines">{quest.requirements}</p>
            <div className="tag-list">
              {quest.tech_stack_tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            {quest.prerequisite_notes && (
              <>
                <h3>Before you begin</h3>
                <p>{quest.prerequisite_notes}</p>
              </>
            )}
            {quest.documentation_urls.length > 0 && (
              <>
                <h3>Documentation</h3>
                <ul className="documentation-links">
                  {quest.documentation_urls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {user ? (
              <PersonalProgress
                busy={coverPending || deleting}
                quest={quest}
                progress={data.progress}
                onSaved={invalidate}
                onDirty={setDirty}
                onPending={setSaving}
              />
            ) : (
              <div className="sign-in-prompt">
                <p>
                  Sign in to save your progress, notes, and repository link.
                </p>
                <ActionButton className="button primary" onClick={signIn}>
                  Sign in with GitHub
                </ActionButton>
              </div>
            )}
            {canManage && (
              <div className="owner-actions">
                <h3>Manage shared quest</h3>
                <p>Changes affect everyone following this roadmap.</p>
                {confirming ? (
                  <div
                    className="delete-confirmation"
                    role="group"
                    aria-label="Confirm deletion"
                  >
                    <strong>Delete “{quest.title}”?</strong>
                    <p>
                      This removes the quest, its cover, and saved progress for
                      all users.
                    </p>
                    <ActionButton
                      className="button secondary"
                      disabled={deleting || saving || coverPending}
                      onClick={() => setConfirming(false)}
                    >
                      Keep quest
                    </ActionButton>{" "}
                    <ActionButton
                      className="button danger"
                      disabled={deleting || saving || coverPending}
                      onClick={remove}
                    >
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </ActionButton>
                  </div>
                ) : (
                  <>
                    <ActionButton
                      className="button secondary"
                      disabled={saving || coverPending}
                      onClick={() => {
                        if (
                          !(dirty || coverDirty) ||
                          window.confirm(
                            "Discard your unsaved progress changes?",
                          )
                        )
                          onEdit(quest);
                      }}
                    >
                      Edit quest
                    </ActionButton>{" "}
                    <ActionButton
                      className="button danger"
                      disabled={saving || coverPending}
                      onClick={() => setConfirming(true)}
                    >
                      Delete quest
                    </ActionButton>
                  </>
                )}
                {deleteError && (
                  <p role="alert" className="inline-error">
                    {deleteError} Try deleting again.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </QuestDialog>
  );
}
