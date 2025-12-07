import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "comicai_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

export type AuthTokenPayload = {
  userId: number;
  email: string;
  name?: string | null;
  role?: string | null;
   status?: string | null;
};

const getAuthSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("缺少 AUTH_SECRET / JWT_SECRET，用于签发登陆令牌");
  }
  return secret;
};

export const hashText = async (value: string) => bcrypt.hash(value, 10);

export const verifyHash = async (value: string, hash: string) => bcrypt.compare(value, hash);

export const signAuthToken = (payload: AuthTokenPayload) =>
  jwt.sign({ ...payload, role: payload.role || "user" }, getAuthSecret(), { expiresIn: TOKEN_TTL_SECONDS });

export const verifyAuthToken = (token: string): AuthTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, getAuthSecret()) as AuthTokenPayload;
    return { ...decoded, role: decoded.role || "user" };
  } catch (error) {
    return null;
  }
};

export const attachAuthCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_SECONDS,
    path: "/",
  });
};

export const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
};

export const readAuthCookie = (request: NextRequest) => request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
