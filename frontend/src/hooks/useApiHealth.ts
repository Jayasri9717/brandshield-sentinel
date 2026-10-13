import { useEffect, useState } from "react";
import type { HealthState } from "../types";
import { checkApiHealth } from "../services/api";
import { getApiErrorMessage } from "../services/http";

export function useApiHealth(retryCount: number) {
  const [health, setHealth] = useState<HealthState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    checkApiHealth(controller.signal)
      .then((data) => {
        if (data.status !== "ok") throw new Error("The API returned an unexpected health status.");
        setHealth("online");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setHealth("offline");
        setMessage(getApiErrorMessage(error, "Could not reach the API."));
      });

    return () => controller.abort();
  }, [retryCount]);

  return {
    health,
    message,
    retry: () => {
      setHealth("checking");
      setMessage("");
    },
  };
}
