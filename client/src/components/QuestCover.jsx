import { useEffect, useId, useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../hooks/useToast.js";
import { useGuardedSubmit } from "../hooks/useGuardedSubmit.js";
import { ActionButton } from "./ActionButton.jsx";
import "./quest-cover.css";

export function QuestCover({
  quest,
  image,
  canManage,
  busy,
  onSaved,
  onDirty,
  onPending,
}) {
  const id = useId();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState("");
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    setUnavailable(false);
  }, [image?.url]);
  function choose(event) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    if (
      selected &&
      (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
        selected.size > 5 * 1024 * 1024)
    ) {
      setError(
        "Choose a JPEG, PNG, or static WebP image no larger than 5 MiB.",
      );
      event.target.value = "";
      return;
    }
    setFile(selected);
    onDirty(Boolean(selected || alt));
  }
  async function save(event) {
    event.preventDefault();
    if (!file || !alt.trim() || alt.trim().length > 200) {
      setError("Choose an image and describe it in 1–200 characters.");
      return;
    }
    const body = new FormData();
    body.append("image", file);
    body.append("alt_text", alt.trim());
    setPending(true);
    onPending(true);
    setError("");
    const key = `cover-${quest.id}`;
    toast.loading(quest.title, { key, title: "Saving cover…" });
    try {
      await api(`/api/quests/${quest.id}/image`, { method: "POST", body });
      setFile(null);
      setAlt("");
      setFileKey((value) => value + 1);
      onDirty(false);
      onSaved();
      toast.success(quest.title, {
        key,
        title: "Quest cover saved",
        variant: "edit",
      });
    } catch (failure) {
      toast.dismiss(key);
      setError(failure.message);
    } finally {
      setPending(false);
      onPending(false);
    }
  }
  const submit = useGuardedSubmit(save);
  async function remove() {
    setPending(true);
    onPending(true);
    setError("");
    try {
      await api(`/api/quests/${quest.id}/image`, { method: "DELETE" });
      setConfirming(false);
      onSaved();
      toast.success(quest.title, {
        title: "Quest cover removed",
        variant: "delete",
      });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
      onPending(false);
    }
  }
  if (!image && !canManage) return null;
  return (
    <section className="quest-cover" aria-label="Quest cover">
      {image &&
        (unavailable ? (
          <p role="status">
            The quest cover is unavailable. The quest content is still available
            below.
          </p>
        ) : (
          <img
            className="quest-cover-image"
            src={image.url}
            alt={image.alt_text}
            width={image.width}
            height={image.height}
            onError={() => setUnavailable(true)}
          />
        ))}
      {canManage && (
        <>
          <h3>Quest cover</h3>
          <p>
            Share a project screenshot or cover image. Everyone can view it.
          </p>
          <form onSubmit={submit}>
            <fieldset
              className="quest-fields single-column"
              disabled={pending || busy}
            >
              <div className="form-field">
                <label htmlFor={`${id}-file`}>Image file</label>
                <input
                  key={fileKey}
                  id={`${id}-file`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={choose}
                  aria-describedby={`${id}-help`}
                />
                <small id={`${id}-help`}>
                  JPEG, PNG, or static WebP. Maximum 5 MiB and 20 megapixels.
                </small>
              </div>
              <div className="form-field">
                <label htmlFor={`${id}-alt`}>Image description</label>
                <input
                  id={`${id}-alt`}
                  value={alt}
                  maxLength={200}
                  onChange={(event) => {
                    setAlt(event.target.value);
                    onDirty(Boolean(file || event.target.value));
                  }}
                />
              </div>
              {preview && (
                <img
                  className="quest-cover-preview"
                  src={preview}
                  alt="Selected image preview"
                />
              )}
              <ActionButton
                type="submit"
                className="button primary"
                disabled={pending || busy}
              >
                {pending
                  ? "Saving cover…"
                  : image
                    ? "Replace cover"
                    : "Upload cover"}
              </ActionButton>
            </fieldset>
          </form>
          {image &&
            (confirming ? (
              <div role="group" aria-label="Confirm cover removal">
                <p>Remove the public cover from “{quest.title}”?</p>
                <ActionButton
                  className="button secondary"
                  disabled={pending || busy}
                  onClick={() => setConfirming(false)}
                >
                  Keep cover
                </ActionButton>{" "}
                <ActionButton
                  className="button danger"
                  disabled={pending || busy}
                  onClick={remove}
                >
                  {pending ? "Removing cover…" : "Confirm remove cover"}
                </ActionButton>
              </div>
            ) : (
              <ActionButton
                className="text-button"
                disabled={pending || busy}
                onClick={() => setConfirming(true)}
              >
                Remove cover
              </ActionButton>
            ))}
        </>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error} Your selection is kept; try again.
        </p>
      )}
    </section>
  );
}
