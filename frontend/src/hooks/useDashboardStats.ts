import { useCallback, useEffect, useState } from "react";
import type { DashboardStats } from "../types";
import { getDashboardStats } from "../services/api";
import { getApiErrorMessage } from "../services/http";

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getDashboardStats(controller.signal)
      .then(setStats)
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(getApiErrorMessage(requestError, "Could not load dashboard statistics."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError("");
    setAttempt((count) => count + 1);
  }, []);

  return { stats, error, loading, retry };
}
