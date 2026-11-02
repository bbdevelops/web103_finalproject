import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

export function useApiResource(url) {
  const { setUser } = useOutletContext();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok)
          throw Object.assign(
            new Error(payload.error ?? "Your roadmap could not be loaded."),
            { status: response.status },
          );
        if (!controller.signal.aborted) {
          setUser(payload.user ?? null);
          setState({ loading: false, data: payload, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setState({ loading: false, data: null, error });
      }
    }
    load();
    return () => controller.abort();
  }, [url, attempt, setUser]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
