import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

interface RemainingResponse {
  remaining: number;
  resetAt: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<RemainingResponse | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const fingerprint = searchParams.get("fingerprint");

  if (!fingerprint) {
    return NextResponse.json(
      { error: "缺少 fingerprint 参数" },
      { status: 400 }
    );
  }

  const rateLimit = checkRateLimit(fingerprint, 3);

  return NextResponse.json({
    remaining: rateLimit.remaining,
    resetAt: rateLimit.resetAt.toISOString(),
  });
}
