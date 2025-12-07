import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

// Helper to verify token from cookies
export async function verifyToken(token: string) {
  return verifyAuthToken(token);
}

// Helper to get current user from request
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  return payload;
}
