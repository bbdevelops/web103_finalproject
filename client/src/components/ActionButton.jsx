import { useEffect, useRef, useState } from "react";
import { beginActionLock, registerActionLock } from "../lib/actionLocks.js";

// The native element, classes and contents are unchanged. Toast controls retain
// their own existing implementation and animations.
export function ActionButton({
  type = "button",
  disabled = false,
  onClick,
  children,
  ...props
}) {
  const button = useRef(null);
  const disabledValue = useRef(disabled);
  disabledValue.current = disabled;
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const element = button.current;
    let busy = false,
      timer,
      mounted = true;
    const release = () => {
      if (!mounted) return;
      clearTimeout(timer);
      busy = false;
      element.disabled = disabledValue.current;
      setLocked(false);
    };
    const unregister = registerActionLock(element, {
      release,
      begin() {
        if (busy || disabledValue.current) return null;
        busy = true;
        const started = performance.now();
        element.disabled = true;
        setLocked(true);
        return () => {
          if (mounted)
            timer = setTimeout(
              release,
              Math.max(0, 750 - (performance.now() - started)),
            );
        };
      },
    });
    const restored = (event) => {
      if (event.persisted) release();
    };
    window.addEventListener("pageshow", restored);
    return () => {
      mounted = false;
      clearTimeout(timer);
      unregister();
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  const click = (event) => {
    // Disabling a submitter in its click handler suppresses native submission.
    // Submitters are instead locked by useGuardedSubmit after validation.
    if (type === "submit") return onClick?.(event);
    const finish = beginActionLock(event.currentTarget);
    if (!finish) return;
    try {
      Promise.resolve(onClick?.(event)).then(finish, finish);
    } catch (error) {
      finish();
      throw error;
    }
  };
  return (
    <button
      {...props}
      ref={button}
      type={type}
      data-click-guard="true"
      disabled={disabled || locked}
      onClick={click}
    >
      {children}
    </button>
  );
}
