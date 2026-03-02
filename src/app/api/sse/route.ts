import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import Redis from "ioredis";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

function createRedisSubscriber(): Redis {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  return new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return new Response("未登录", { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return new Response("无效的token", { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const taskId = request.nextUrl.searchParams.get("taskId");

  const encoder = new TextEncoder();
  let subscriber: Redis | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream may be closed
        }
      };

      // Send initial heartbeat
      send("connected", { userId: payload.userId, timestamp: Date.now() });

      try {
        subscriber = createRedisSubscriber();

        const channels: string[] = [];
        if (taskId) {
          channels.push(`task:${taskId}`);
        }
        if (projectId) {
          channels.push(`project:${projectId}`);
        }
        channels.push(`user:${payload.userId}`);

        if (channels.length > 0) {
          await subscriber.subscribe(...channels);
        }

        subscriber.on("message", (channel: string, message: string) => {
          try {
            const data = JSON.parse(message) as Record<string, unknown>;
            send("task-update", { channel, ...data });
          } catch {
            send("task-update", { channel, raw: message });
          }
        });

        subscriber.on("error", (err: Error) => {
          console.error("SSE Redis subscriber error:", err);
          send("error", { message: "Redis 连接异常", code: "REDIS_ERROR" });
        });
      } catch (err) {
        console.error("SSE Redis 连接失败:", err);
        send("error", {
          message: err instanceof Error ? err.message : "Redis 连接失败",
          code: "REDIS_CONNECT_FAILED",
        });
      }

      // Heartbeat every 30s
      const heartbeatInterval = setInterval(() => {
        send("heartbeat", { timestamp: Date.now() });
      }, 30000);

      // Cleanup when aborted
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        if (subscriber) {
          subscriber.unsubscribe().catch(() => {});
          subscriber.quit();
          subscriber = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
