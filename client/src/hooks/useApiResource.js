import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api.js";

export function useApiResource(url, { enabled = true } = {}) {
  const { revision, authLoading, user } = useOutletContext();
  const resourceKey = `${user?.id ?? "guest"}:${url}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    url: null,
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!enabled || authLoading) return;
    const controller = new AbortController();
    setState((previous) => ({
      url: resourceKey,
      data: previous.url === resourceKey ? previous.data : null,
      error: null,
      loading: true,
    }));
    api(url, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ url: resourceKey, data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({ ...previous, error, loading: false }));
      });
    return () => controller.abort();
  }, [url, resourceKey, attempt, revision, enabled, authLoading]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const data = enabled && state.url === resourceKey ? state.data : null;
  return {
    data,
    error: enabled && state.url === resourceKey ? state.error : null,
    loading:
      enabled &&
      !data &&
      (authLoading || state.url !== resourceKey || state.loading),
    refreshing: state.loading,
    retry,
  };
}
