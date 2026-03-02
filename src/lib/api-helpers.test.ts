import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withCreditFreeze, AuthContextWithFreeze } from './api-helpers';
import * as billing from './billing';
import * as auth from './auth';
import { cookies } from 'next/headers';

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('./auth', () => ({
  AUTH_COOKIE_NAME: 'auth_token',
  verifyAuthToken: vi.fn(),
}));

vi.mock('./billing', () => ({
  freezeCredits: vi.fn(),
  settleFreeze: vi.fn(),
  rollbackFreeze: vi.fn(),
}));

describe('withCreditFreeze', () => {
  const mockUserId = 'user-123';
  const mockToken = 'valid-token';
  const mockFreezeId = 'freeze-456';
  const mockTaskId = 'task-789';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock cookies
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: mockToken }),
    });

    // Mock token verification
    (auth.verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: mockUserId,
    });

    // Mock freezeCredits
    (billing.freezeCredits as ReturnType<typeof vi.fn>).mockResolvedValue({
      freezeId: mockFreezeId,
      frozenAmount: 10,
      remainingBalance: 90,
    });
  });

  it('应该在生成成功时结算配额', async () => {
    const mockResult = { image_url: 'http://example.com/image.png' };

    const handler = vi.fn().mockResolvedValue(mockResult);

    const response = await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
      description: '测试生成',
    });

    // 验证 handler 被调用
    expect(handler).toHaveBeenCalledWith({
      userId: mockUserId,
      freezeId: mockFreezeId,
    });

    // 验证配额冻结
    expect(billing.freezeCredits).toHaveBeenCalledWith({
      userId: mockUserId,
      amount: 10,
      taskId: mockTaskId,
      description: '测试生成',
    });

    // 验证配额结算
    expect(billing.settleFreeze).toHaveBeenCalledWith({
      userId: mockUserId,
      freezeId: mockFreezeId,
      actualAmount: 10,
      taskId: mockTaskId,
      description: '生成成功 - 测试生成',
    });

    // 验证没有回滚
    expect(billing.rollbackFreeze).not.toHaveBeenCalled();

    // 验证响应
    const json = await response.json();
    expect(json).toEqual({
      success: true,
      ...mockResult,
    });
  });

  it('应该在生成失败时回滚配额', async () => {
    const mockError = new Error('生成失败');

    const handler = vi.fn().mockRejectedValue(mockError);

    const response = await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
      description: '测试生成',
    });

    // 验证配额冻结
    expect(billing.freezeCredits).toHaveBeenCalledWith({
      userId: mockUserId,
      amount: 10,
      taskId: mockTaskId,
      description: '测试生成',
    });

    // 验证配额回滚
    expect(billing.rollbackFreeze).toHaveBeenCalledWith({
      userId: mockUserId,
      freezeId: mockFreezeId,
      taskId: mockTaskId,
      reason: '生成失败',
    });

    // 验证没有结算
    expect(billing.settleFreeze).not.toHaveBeenCalled();

    // 验证错误响应
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe('生成失败');
  });

  it('应该在未登录时返回 401', async () => {
    // Mock 无 token
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const handler = vi.fn();

    const response = await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('未登录');
    expect(json.code).toBe('UNAUTHORIZED');

    // 验证没有冻结配额
    expect(billing.freezeCredits).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('应该在 token 无效时返回 401', async () => {
    // Mock 无效 token
    (auth.verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const handler = vi.fn();

    const response = await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('无效的token');
    expect(json.code).toBe('INVALID_TOKEN');

    // 验证没有冻结配额
    expect(billing.freezeCredits).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('应该在冻结配额失败时返回错误', async () => {
    const mockError = new Error('余额不足');
    (billing.freezeCredits as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    const handler = vi.fn();

    const response = await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe('余额不足');

    // 验证 handler 未被调用
    expect(handler).not.toHaveBeenCalled();
    // 验证没有回滚（因为冻结本身就失败了）
    expect(billing.rollbackFreeze).not.toHaveBeenCalled();
  });

  it('应该传递正确的上下文给 handler', async () => {
    const handler = vi.fn<(context: AuthContextWithFreeze) => Promise<unknown>>().mockResolvedValue({ data: 'test' });

    await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
    });

    expect(handler).toHaveBeenCalledWith({
      userId: mockUserId,
      freezeId: mockFreezeId,
    });
  });

  it('应该使用默认描述当未提供时', async () => {
    const handler = vi.fn().mockResolvedValue({});

    await withCreditFreeze(handler, {
      estimateCost: () => 10,
      taskId: mockTaskId,
      // 不提供 description
    });

    expect(billing.freezeCredits).toHaveBeenCalledWith({
      userId: mockUserId,
      amount: 10,
      taskId: mockTaskId,
      description: '生成任务', // 默认值
    });
  });
});
