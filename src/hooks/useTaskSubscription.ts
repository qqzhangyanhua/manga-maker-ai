import { useEffect, useRef, useCallback, useState } from "react";

export interface TaskUpdate {
  taskId: string;
  status: string;
  percent: number;
  currentPanelId?: string;
  message?: string;
  error?: string;
  timestamp: number;
}

export interface UseTaskSubscriptionOptions {
  projectId?: string | null;
  taskId?: string | null;
  enabled?: boolean;
  onUpdate?: (update: TaskUpdate) => void;
  onComplete?: (taskId: string) => void;
  onError?: (taskId: string, error: string) => void;
}

export function useTaskSubscription({
  projectId,
  taskId,
  enabled = true,
  onUpdate,
  onComplete,
  onError,
}: UseTaskSubscriptionOptions) {
  const [connected, setConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<TaskUpdate | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (!projectId && !taskId) return;

    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (taskId) params.set("taskId", taskId);

    const url = `/api/sse?${params.toString()}`;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    es.addEventListener("task-update", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as TaskUpdate;
        setLatestUpdate(data);
        onUpdate?.(data);

        if (data.status === "completed") {
          onComplete?.(data.taskId);
        } else if (data.status === "failed" && data.error) {
          onError?.(data.taskId, data.error);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener("heartbeat", () => {
      // Keep alive
    });

    es.onerror = () => {
      setConnected(false);
      es.close();

      // Reconnect after 5s
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [enabled, projectId, taskId, onUpdate, onComplete, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  return {
    connected,
    latestUpdate,
    disconnect,
  };
}
