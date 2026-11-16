import { useRef } from "react";
import { beginActionLock } from "../lib/actionLocks.js";

export function useGuardedSubmit(action) {
  const running = useRef(false);
  return async (event) => {
    event.preventDefault();
    if (running.current) return;
    const submitter =
      event.nativeEvent.submitter ??
      event.currentTarget.querySelector('button[type="submit"]');
    const finish = beginActionLock(submitter);
    if (!finish) return;
    running.current = true;
    try {
      await action(event);
    } finally {
      running.current = false;
      finish();
    }
  };
}
