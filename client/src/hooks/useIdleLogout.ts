// client/src/hooks/useIdleLogout.ts
import { useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

/**
 * Idle timeout in milliseconds.
 * Override with VITE_IDLE_TIMEOUT_MS if needed (e.g. 1800000 for 30 minutes).
 */
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const IDLE_TIMEOUT_MS =
  Number(import.meta.env.VITE_IDLE_TIMEOUT_MS ?? "") || DEFAULT_IDLE_TIMEOUT_MS;

export function useIdleLogout() {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let isRunning = true;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timerRef.current = window.setTimeout(async () => {
        if (!isRunning) return;

        try {
          // Tell server to destroy the session
          await apiRequest("POST", "/api/auth/logout");
        } catch {
          // ignore network errors on logout – we still clear client state
        }

        // Clear cached auth + any other user-specific data
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.clear(); // drop all queries & mutations from cache

        // Hard redirect so the whole app resets cleanly
        window.location.href = "/login";
      }, IDLE_TIMEOUT_MS);
    };

    const activityHandler = () => {
      // Any activity resets the idle timer
      startTimer();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];

    events.forEach((eventName) =>
      window.addEventListener(eventName, activityHandler)
    );

    // Start initial timer
    startTimer();

    return () => {
      isRunning = false;
      clearTimer();
      events.forEach((eventName) =>
        window.removeEventListener(eventName, activityHandler)
      );
    };
  }, []);
}
