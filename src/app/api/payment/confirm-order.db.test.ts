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

function postSimulate(orderId: string) {
  return simulatePaid(
    new Request("http://localhost/api/payment/simulate-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }),
  );
}

describe("确认充值订单已支付", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_SIMULATE_PAYMENT;
  });

  it("确认支付后订单为已支付，余额增加订单算力，并写入一条关联该订单的流水", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const user = await db.user.create({ data: { email: "confirm-paid@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;

    const response = await postSimulate(orderId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.orderId).toBe(orderId);
    expect(body.data.status).toBe("paid");
    expect(body.data.credits).toBe(5000);
    expect(body.data.amount).toBe(9.9);
    expect(body.data.newBalance).toBe(7000);

    const row = await db.rechargeOrder.findUnique({ where: { id: orderId } });
    expect(row?.status).toBe("paid");
    expect(row?.paid_at).not.toBeNull();

    const payer = await db.user.findUnique({ where: { id: user.id } });
    expect(payer?.credits).toBe(7000);

    const ledger = await db.creditTransaction.findMany({ where: { user_id: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.amount).toBe(5000);
    expect(ledger[0]?.balance).toBe(7000);
    expect(ledger[0]?.action).toBe("recharge");
    expect(ledger[0]?.ref_type).toBe("order");
    expect(ledger[0]?.ref_id).toBe(orderId);
  });

  it("对同一订单确认两次，余额只增加一次，流水只有一条", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const user = await db.user.create({ data: { email: "confirm-twice@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;

    const first = await postSimulate(orderId);
    const second = await postSimulate(orderId);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      success: true,
      data: { orderId, status: "paid", newBalance: 7000 },
    });

    const payer = await db.user.findUnique({ where: { id: user.id } });
    expect(payer?.credits).toBe(7000);
    const ledger = await db.creditTransaction.findMany({ where: { user_id: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.ref_id).toBe(orderId);
  });

  it("并发确认同一订单，余额只增加一次", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const user = await db.user.create({ data: { email: "confirm-concurrent@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "standard" });
    const orderId = (await created.json()).data.orderId as string;

    const responses = await Promise.all([postSimulate(orderId), postSimulate(orderId)]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    for (const body of bodies) {
      expect(body.success).toBe(true);
      expect(body.data.orderId).toBe(orderId);
      expect(body.data.status).toBe("paid");
    }

    const payer = await db.user.findUnique({ where: { id: user.id } });
    expect(payer?.credits).toBe(18000);
    const ledger = await db.creditTransaction.findMany({ where: { user_id: user.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.amount).toBe(16000);
    expect(ledger[0]?.balance).toBe(18000);
    expect(ledger[0]?.ref_id).toBe(orderId);
  });

  it("过期订单不能确认，余额不变", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const user = await db.user.create({ data: { email: "confirm-expired@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;
    await db.rechargeOrder.update({
      where: { id: orderId },
      data: { expires_at: new Date(Date.now() - 60_000) },
    });

    const response = await postSimulate(orderId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.orderId).toBe(orderId);
    expect(body.data.status).toBe("expired");
    expect(body.data.newBalance).toBeUndefined();

    const row = await db.rechargeOrder.findUnique({ where: { id: orderId } });
    expect(row?.status).toBe("expired");
    expect(row?.paid_at).toBeNull();
    const payer = await db.user.findUnique({ where: { id: user.id } });
    expect(payer?.credits).toBe(2000);
    expect(await db.creditTransaction.count({ where: { user_id: user.id } })).toBe(0);
  });

  it("到账失败时订单仍为待支付，余额不变", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const user = await db.user.create({ data: { email: "confirm-rollback@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;
    await db.rechargeOrder.update({
      where: { id: orderId },
      data: { credits: 0 },
    });

    const response = await postSimulate(orderId);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "确认支付失败",
    });

    const row = await db.rechargeOrder.findUnique({ where: { id: orderId } });
    expect(row?.status).toBe("pending");
    expect(row?.paid_at).toBeNull();
    const payer = await db.user.findUnique({ where: { id: user.id } });
    expect(payer?.credits).toBe(2000);
    expect(await db.creditTransaction.count({ where: { user_id: user.id } })).toBe(0);
  });

  it("确认他人的订单返回 404，余额不变", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const owner = await db.user.create({ data: { email: "confirm-owner@example.com" } });
    const other = await db.user.create({ data: { email: "confirm-other@example.com" } });
    loginAs(owner.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;

    loginAs(other.id);
    const response = await postSimulate(orderId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "订单不存在",
    });

    const row = await db.rechargeOrder.findUnique({ where: { id: orderId } });
    expect(row?.status).toBe("pending");
    expect(row?.paid_at).toBeNull();
    const ownerRow = await db.user.findUnique({ where: { id: owner.id } });
    const otherRow = await db.user.findUnique({ where: { id: other.id } });
    expect(ownerRow?.credits).toBe(2000);
    expect(otherRow?.credits).toBe(2000);
    expect(
      await db.creditTransaction.count({
        where: { user_id: { in: [owner.id, other.id] } },
      }),
    ).toBe(0);
  });

  it("模拟支付开启时未登录返回 401", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    mockCookieGet.mockReturnValue(undefined);

    const response = await postSimulate("00000000-0000-4000-8000-000000000001");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "未登录",
    });
  });

  it("模拟支付开启时登录凭证无效返回 401", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    mockCookieGet.mockReturnValue({ value: "bad-token" });
    vi.mocked(verifyAuthToken).mockReturnValue(null);

    const response = await postSimulate("00000000-0000-4000-8000-000000000001");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "无效的token",
    });
  });

  it("模拟支付开关未开启时接口不存在，余额不变", async () => {
    const user = await db.user.create({ data: { email: "simulate-off@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const orderId = (await created.json()).data.orderId as string;

    const response = await postSimulate(orderId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "资源不存在",
    });
    const row = await db.rechargeOrder.findUnique({ where: { id: orderId } });
    expect(row?.status).toBe("pending");
    const payer = await db.user.findUnique({ where: { id: user.id } });
    expect(payer?.credits).toBe(2000);
  });

  it("生产环境即使打开开关也返回 404，余额不变", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    try {
      const user = await db.user.create({ data: { email: "simulate-prod@example.com" } });
      loginAs(user.id);
      const created = await postCreate({ planId: "premium" });
      const orderId = (await created.json()).data.orderId as string;

      const response = await postSimulate(orderId);

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: "资源不存在",
      });
      const row = await db.rechargeOrder.findUnique({ where: { id: orderId } });
      expect(row?.status).toBe("pending");
      const payer = await db.user.findUnique({ where: { id: user.id } });
      expect(payer?.credits).toBe(2000);
      expect(await db.creditTransaction.count({ where: { user_id: user.id } })).toBe(0);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("查询已支付订单时返回最新余额", async () => {
    process.env.ALLOW_SIMULATE_PAYMENT = "true";
    const user = await db.user.create({ data: { email: "check-paid-balance@example.com" } });
    loginAs(user.id);
    const created = await postCreate({ planId: "basic" });
    const createdBody = await created.json();
    const orderId = createdBody.data.orderId as string;
    const paid = await postSimulate(orderId);
    expect(paid.status).toBe(200);

    const response = await getOrder(orderId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        orderId,
        amount: 9.9,
        credits: 5000,
        expiresAt: createdBody.data.expiresAt,
        status: "paid",
        newBalance: 7000,
      },
    });
  });

});
