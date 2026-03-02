import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/api-key-encrypt";
import { z } from "zod";

export const runtime = "nodejs";

const PROVIDERS = ["openai", "fal", "google-imagen", "seedream", "sd"];

const postSchema = z.object({
  provider: z.enum(["openai", "fal", "google-imagen", "seedream", "sd"]),
  apiKey: z.string(), // sd 自部署可留空
  baseUrl: z.string().optional(),
});

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的 token" }, { status: 401 });
    }

    const keys = await prisma.userApiKey.findMany({
      where: { user_id: payload.userId },
      orderBy: { created_at: "desc" },
      select: { id: true, provider: true, api_key: true, base_url: true, created_at: true },
    });

    const maskedKeys = keys.map((k) => {
      let masked = "***";
      try {
        if (k.api_key) {
          const decrypted = decryptApiKey(k.api_key);
          masked = decrypted ? maskApiKey(decrypted) : "留空";
        } else {
          masked = "留空";
        }
      } catch {
        // 解密失败时显示占位
      }
      return {
        id: k.id,
        provider: k.provider,
        apiKey: masked,
        baseUrl: k.base_url ?? undefined,
        createdAt: k.created_at.toISOString(),
      };
    });

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error("GET /api/user/api-keys error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的 token" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const { provider, apiKey, baseUrl } = parsed.data;

    if (provider !== "sd" && !apiKey.trim()) {
      return NextResponse.json({ error: "请填写 API Key" }, { status: 400 });
    }

    const encrypted = apiKey.trim() ? encryptApiKey(apiKey) : "";

    await prisma.userApiKey.upsert({
      where: {
        user_id_provider: { user_id: payload.userId, provider },
      },
      create: {
        user_id: payload.userId,
        provider,
        api_key: encrypted,
        base_url: baseUrl || null,
      },
      update: {
        api_key: encrypted,
        base_url: baseUrl || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/user/api-keys error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
