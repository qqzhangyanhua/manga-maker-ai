import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies, mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  return { mockCookies, mockCookieGet };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", async () => ({
  prisma: (await import("@/test-db/harness")).db,
}));

import { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/test-db/harness";
import { GET as checkOrder } from "./check-order/route";
import { POST as createOrder } from "./create-order/route";
import { POST as simulatePaid } from "./simulate-paid/route";

function loginAs(userId: string) {
  mockCookieGet.mockReturnValue({ value: "token" });
  vi.mocked(verifyAuthToken).mockReturnValue({
    userId,
    email: "payer@example.com",
  });
}

function getOrder(orderId?: string) {
  const query = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
  return checkOrder(new NextRequest(`http://localhost/api/payment/check-order${query}`));
}

function postCreate(body: Record<string, unknown>) {
  return createOrder(
    new Request("http://localhost/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("充值订单接口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未登录时下单返回 401", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await postCreate({ planId: "basic" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "未登录",
    });
  });

  it("登录凭证无效时下单返回 401", async () => {
    mockCookieGet.mockReturnValue({ value: "bad-token" });
    vi.mocked(verifyAuthToken).mockReturnValue(null);

    const response = await postCreate({ planId: "basic" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "无效的token",
    });
  });

  it("未登录时查询订单返回 401", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await getOrder("00000000-0000-4000-8000-000000000001");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "未登录",
    });
  });

  it("登录凭证无效时查询订单返回 401", async () => {
    mockCookieGet.mockReturnValue({ value: "bad-token" });
    vi.mocked(verifyAuthToken).mockReturnValue(null);

    const response = await getOrder("00000000-0000-4000-8000-000000000001");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "无效的token",
    });
  });

  it("未知套餐返回 400，并且不落库", async () => {
    const user = await db.user.create({ data: { email: "unknown-plan@example.com" } });
    loginAs(user.id);

    const response = await postCreate({
      planId: "no-such-plan",
      amount: 1,
      credits: 1,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "未知套餐",
    });
    expect(await db.rechargeOrder.count()).toBe(0);
  });

  it("下单只提交套餐标识，按目录写入待支付订单并返回元和算力", async () => {
    const user = await db.user.create({ data: { email: "create-basic@example.com" } });
    loginAs(user.id);

    const response = await postCreate({ planId: "basic" });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.orderId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(body.data.amount).toBe(9.9);
    expect(body.data.credits).toBe(5000);
    expect(body.data.status).toBe("pending");

    const row = await db.rechargeOrder.findUnique({ where: { id: body.data.orderId } });
    expect(row?.user_id).toBe(user.id);
    expect(row?.plan_id).toBe("basic");
    expect(row?.amount_fen).toBe(990);
    expect(row?.credits).toBe(5000);
    expect(row?.status).toBe("pending");
    expect(row?.paid_at).toBeNull();
    expect(row ? row.expires_at.getTime() - row.created_at.getTime() : 0).toBe(30 * 60 * 1000);
    expect(body.data.expiresAt).toBe(row?.expires_at.toISOString());
  });

  it("请求体里的金额和算力被忽略，仍按套餐目录落库", async () => {
    const user = await db.user.create({ data: { email: "ignore-client-price@example.com" } });
    loginAs(user.id);

    const response = await postCreate({
      planId: "standard",
      amount: 1,
      credits: 1,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.amount).toBe(29.9);
    expect(body.data.credits).toBe(16000);
    expect(body.data.status).toBe("pending");

    const row = await db.rechargeOrder.findUnique({ where: { id: body.data.orderId } });
    expect(row?.amount_fen).toBe(2990);
    expect(row?.credits).toBe(16000);
    expect(row?.plan_id).toBe("standard");
  });

  it("查询自己的订单返回当前状态", async () => {
    const user = await db.user.create({ data: { email: "check-own@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const createdBody = await created.json();

    const response = await getOrder(createdBody.data.orderId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        orderId: createdBody.data.orderId,
        amount: 9.9,
        credits: 5000,
        expiresAt: createdBody.data.expiresAt,
        status: "pending",
      },
    });
  });

  it("查询别人的订单返回 404", async () => {
    const owner = await db.user.create({ data: { email: "order-owner@example.com" } });
    const other = await db.user.create({ data: { email: "order-other@example.com" } });
    loginAs(owner.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;

    loginAs(other.id);
    const response = await getOrder(orderId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "订单不存在",
    });

    loginAs(owner.id);
    const own = await getOrder(orderId);
    expect(own.status).toBe(200);
  });

  it("待支付订单过了有效期，查询时返回已过期", async () => {
    const user = await db.user.create({ data: { email: "expired-order@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "premium" });
    const createdBody = await created.json();
    await db.rechargeOrder.update({
      where: { id: createdBody.data.orderId },
      data: { expires_at: new Date(Date.now() - 60_000) },
    });

    const response = await getOrder(createdBody.data.orderId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.orderId).toBe(createdBody.data.orderId);
    expect(body.data.amount).toBe(99.9);
    expect(body.data.credits).toBe(55000);
    expect(body.data.status).toBe("expired");
  });

  it("已经支付的订单过了有效期，查询仍返回已支付", async () => {
    const user = await db.user.create({ data: { email: "paid-order@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;
    await db.rechargeOrder.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paid_at: new Date("2026-11-21T00:00:00.000Z"),
        expires_at: new Date(Date.now() - 60_000),
      },
    });

    const response = await getOrder(orderId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe("paid");
  });

  it("订单号不存在或不是 UUID 时返回 404", async () => {
    const user = await db.user.create({ data: { email: "missing-order@example.com" } });
    loginAs(user.id);

    const missing = await getOrder("00000000-0000-4000-8000-000000000099");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      success: false,
      error: "订单不存在",
    });

    const malformed = await getOrder("order_not_a_uuid");
    expect(malformed.status).toBe(404);
    await expect(malformed.json()).resolves.toEqual({
      success: false,
      error: "订单不存在",
    });
  });

  it("删除用户时充值订单一并删除，之后查询返回 404", async () => {
    const user = await db.user.create({ data: { email: "cascade-order@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "ultimate" });
    const orderId = (await created.json()).data.orderId as string;

    await db.user.delete({ where: { id: user.id } });

    const response = await getOrder(orderId);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "订单不存在",
    });
  });

  it("模拟支付完成接口不存在", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await simulatePaid(
      new Request("http://localhost/api/payment/simulate-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "00000000-0000-4000-8000-000000000001" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "资源不存在",
    });

    const user = await db.user.create({ data: { email: "simulate-gone@example.com" } });
    loginAs(user.id);
    const signedIn = await simulatePaid(
      new Request("http://localhost/api/payment/simulate-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "00000000-0000-4000-8000-000000000001" }),
      }),
    );
    expect(signedIn.status).toBe(404);
  });
});
