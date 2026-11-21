import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RechargeDialog } from "./RechargeDialog";

const EXPIRES_AT = "2026-11-21T12:30:00.000Z";
const ORDER_ID = "00000000-0000-4000-8000-000000000001";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockPayment(simulatePayAvailable: boolean) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/payment/create-order")) {
      return jsonResponse({
        success: true,
        data: {
          orderId: ORDER_ID,
          amount: 9.9,
          credits: 5000,
          expiresAt: EXPIRES_AT,
          status: "pending",
          simulatePayAvailable,
        },
      });
    }
    if (url.includes("/api/payment/check-order")) {
      return jsonResponse({ success: true, data: { status: "pending" } });
    }
    if (url.includes("/api/payment/simulate-paid")) {
      return jsonResponse({
        success: true,
        data: { status: "paid", credits: 5000, newBalance: 7000 },
      });
    }
    throw new Error(`未预期的请求: ${url} ${init?.method ?? "GET"}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function createBasicOrder() {
  const user = userEvent.setup();
  render(<RechargeDialog open onOpenChange={() => {}} />);
  await user.click(screen.getByText("¥9.9"));
  await user.click(screen.getByRole("button", { name: "立即充值" }));
  return user;
}

describe("充值弹窗", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("下单后展示接口返回的过期时间；模拟支付不可用时不显示微信和支付宝", async () => {
    mockPayment(false);

    await createBasicOrder();

    expect(await screen.findByText("有效期至 2026-11-21 20:30（北京时间）")).toBeInTheDocument();
    expect(screen.getByText("扫码支付")).toBeInTheDocument();
    expect(screen.getAllByText(/支付功能即将上线/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "微信支付" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "支付宝" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "模拟支付完成" })).not.toBeInTheDocument();
  });

  it("服务端允许模拟支付时，仍可以确认到账", async () => {
    const fetchMock = mockPayment(true);

    const user = await createBasicOrder();

    expect(await screen.findByText("有效期至 2026-11-21 20:30（北京时间）")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "模拟支付完成" }));

    expect(await screen.findByRole("button", { name: "完成" })).toBeInTheDocument();
    expect(screen.getByText(/当前余额/)).toHaveTextContent("7,000");
    const simulateCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/payment/simulate-paid"),
    );
    expect(simulateCall?.[1]?.body).toBe(JSON.stringify({ orderId: ORDER_ID }));
  });
});
