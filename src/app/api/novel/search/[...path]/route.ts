import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const NOVEL_SERVICE_URL = process.env.NOVEL_SERVICE_URL || "http://localhost:8000";

async function proxyRequest(
  method: string,
  path: string,
  searchParams: string,
  body?: any
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("comicai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = `${NOVEL_SERVICE_URL}/api/novel/search/${path}${
    searchParams ? `?${searchParams}` : ""
  }`;

  const headers: HeadersInit = {
    "Authorization": `Bearer ${token}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  return proxyRequest("GET", path, searchParams);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const body = await request.json();
  const path = params.path.join("/");
  return proxyRequest("POST", path, "", body);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  return proxyRequest("DELETE", path, "");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const body = await request.json();
  const path = params.path.join("/");
  return proxyRequest("PATCH", path, "", body);
}
