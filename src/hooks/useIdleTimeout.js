import { useCallback, useEffect, useRef, useState } from "react";

const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "visibilitychange"];

/**
 * Automatic sign-out after a period of inactivity — a standard safeguard for
 * clinical systems where screens are often left unattended.
 *
 * Returns `secondsLeft` while the warning is showing, and `stayActive()`.
 */
export function useIdleTimeout({ timeoutMs, warningMs, onTimeout, enabled = true }) {
  const lastActivity = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const stayActive = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    lastActivity.current = Date.now();
    const mark = () => {
      // Once the warning is visible only an explicit "Stay signed in" resets it.
      if (Date.now() - lastActivity.current < timeoutMs - warningMs) {
        lastActivity.current = Date.now();
      }
    };
    EVENTS.forEach((event) => window.addEventListener(event, mark, { passive: true }));
    const timer = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        clearInterval(timer);
        setSecondsLeft(null);
        onTimeoutRef.current?.();
      } else if (idle >= timeoutMs - warningMs) {
        setSecondsLeft(Math.ceil((timeoutMs - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      EVENTS.forEach((event) => window.removeEventListener(event, mark));
    };
  }, [enabled, timeoutMs, warningMs]);

  return { secondsLeft, stayActive };
}
