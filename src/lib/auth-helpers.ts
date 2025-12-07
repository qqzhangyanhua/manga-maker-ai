import type { NextRequest } from "next/server";
import { readAuthCookie, verifyAuthToken } from "./auth";
import { ensureDb, prisma } from "./db";

export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  verified: boolean;
  role: string | null;
};

export const getAuthUser = async (request: NextRequest): Promise<AuthUser | null> => {
  await ensureDb();
  const token = readAuthCookie(request);
  if (!token) return null;

  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      verified: true,
      role: true,
    },
  });

  if (!user) return null;
  return { ...user, role: user.role || "user" };
};

export const requireAdmin = async (request: NextRequest): Promise<AuthUser> => {
  const user = await getAuthUser(request);
  if (!user) {
    const error = new Error("未登录");
    // @ts-expect-error 自定义标记
    error.status = 401;
    throw error;
  }

  if ((user.role || "user") !== "admin") {
    const error = new Error("权限不足，需管理员身份");
    // @ts-expect-error 自定义标记
    error.status = 403;
    throw error;
  }

  return user;
};
