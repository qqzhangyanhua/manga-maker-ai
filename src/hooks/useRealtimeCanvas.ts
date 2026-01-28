import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvasStore } from '@/stores/canvas-store';
import type { CanvasTimeline } from '@/app/(novel)/novel/components/InfiniteCanvas/types';

// P3-2: 日志级别控制
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * P3-2: SSE 日志工具函数
 * 开发环境输出 debug 级别日志，生产环境只输出 warn 级别
 */
const sseLogger = {
  debug: (...args: unknown[]) => {
    if (IS_DEV) {
      console.log('[SSE]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (IS_DEV) {
      console.info('[SSE]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn('[SSE]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[SSE]', ...args);
  },
};

interface SSEUpdateMessage {
  type: 'status_update' | 'count_update' | 'error';
  chapterId: string;
  stage: 'script' | 'shot' | 'scene' | 'final';
  status?: 'pending' | 'generating' | 'completed' | 'error';
  count?: number;
  message?: string;
}

export function useRealtimeCanvas(timelineId: string) {
  const queryClient = useQueryClient();
  const setSseStatus = useCanvasStore(state => state.setSseStatus);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connect = () => {
      try {
        // EventSource 自动包含 cookies，不需要 withCredentials
        const eventSource = new EventSource(
          `/api/canvas/timeline/${timelineId}/stream`
        );

        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          sseLogger.info('Connected to timeline updates');
          setSseStatus('connected');
          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const update: SSEUpdateMessage = JSON.parse(event.data);

            // Incremental update to TanStack Query cache
            queryClient.setQueryData(
              ['timeline', timelineId],
              (old: CanvasTimeline | undefined) => {
                if (!old) return old;

                return {
                  ...old,
                  chapters: old.chapters.map((ch) => {
                    if (ch.id !== update.chapterId) return ch;

                    const updatedChapter = { ...ch };

                    if (update.status) {
                      const statusKey = `${update.stage}_status` as keyof typeof ch;
                      updatedChapter[statusKey] = update.status as never;
                    }

                    if (update.count !== undefined) {
                      const countKey = `${update.stage}_count` as keyof typeof ch;
                      updatedChapter[countKey] = update.count as never;
                    }

                    return updatedChapter;
                  }),
                };
              }
            );

            sseLogger.debug('Update received:', update);
          } catch (error) {
            sseLogger.error('Failed to parse message:', error);
          }
        };

        eventSource.onerror = (error) => {
          sseLogger.warn('Connection error:', error);
          sseLogger.debug('EventSource readyState:', eventSource.readyState);
          sseLogger.debug('EventSource url:', eventSource.url);

          setSseStatus('reconnecting');
          eventSource.close();

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            sseLogger.debug(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, delay);
          } else {
            sseLogger.warn('Max reconnection attempts reached');
            setSseStatus('disconnected');
          }
        };
      } catch (error) {
        sseLogger.error('Failed to create connection:', error);
        setSseStatus('disconnected');
      }
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        sseLogger.debug('Disconnecting');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setSseStatus('disconnected');
    };
  }, [timelineId, queryClient, setSseStatus]);
}
