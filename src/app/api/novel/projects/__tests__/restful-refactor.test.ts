/**
 * Novel Projects API Integration Tests
 *
 * 测试覆盖：
 * 1. RESTful 新接口（仅元数据）
 * 2. 章节列表接口（分页 + HATEOAS）
 * 3. 统计接口（实时计算）
 * 4. 向后兼容模式（旧版接口）
 * 5. 性能基准测试
 *
 * Linus 视角：
 * "测试不是为了覆盖率，而是为了验证接口行为的正确性。"
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
let authToken: string;
let testProjectId: string;

// 测试辅助函数
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Cookie': `comicai_session=${authToken}`,
    },
  });
  return response;
}

describe('Novel Projects API - RESTful Refactor', () => {
  beforeAll(async () => {
    // 设置：登录获取 token，创建测试项目
    // TODO: 实现测试数据准备
    authToken = 'test-token';
    testProjectId = 'test-project-id';
  });

  afterAll(async () => {
    // 清理：删除测试数据
  });

  describe('Task #1: Chapter List Endpoint', () => {
    it('should return paginated chapter list without content', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/chapters?page=1&limit=20`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('_links');

      // 验证章节不包含 content 字段
      if (data.items.length > 0) {
        expect(data.items[0]).not.toHaveProperty('content');
        expect(data.items[0]).toHaveProperty('id');
        expect(data.items[0]).toHaveProperty('title');
        expect(data.items[0]).toHaveProperty('word_count');
      }

      // 验证分页元数据
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 20,
      });
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('has_next');

      // 验证 HATEOAS 链接
      expect(data._links).toHaveProperty('self');
      expect(data._links).toHaveProperty('project');
    });

    it('should support pagination navigation', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/chapters?page=2&limit=10`
      );

      const data = await response.json();

      // 验证分页参数
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);

      // 验证导航链接
      if (data.pagination.has_prev) {
        expect(data._links).toHaveProperty('prev');
        expect(data._links).toHaveProperty('first');
      }

      if (data.pagination.has_next) {
        expect(data._links).toHaveProperty('next');
        expect(data._links).toHaveProperty('last');
      }
    });

    it('should enforce limit constraints (max 100)', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/chapters?limit=200`
      );

      const data = await response.json();

      // 限制应该被调整为 100
      expect(data.items.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Task #2: RESTful Project Detail', () => {
    it('should return metadata only with HATEOAS links', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // 验证元数据字段
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('chapter_count');
      expect(data).toHaveProperty('total_words');

      // ✅ 不应包含 chapters 数组
      expect(data).not.toHaveProperty('chapters');

      // 验证 HATEOAS 链接
      expect(data._links).toMatchObject({
        self: expect.stringContaining(`/api/novel/projects/${testProjectId}`),
        chapters: expect.stringContaining(`/api/novel/projects/${testProjectId}/chapters`),
        stats: expect.stringContaining(`/api/novel/projects/${testProjectId}/stats`),
        verify_stats: expect.stringContaining(`/api/novel/projects/${testProjectId}/verify-stats`),
      });
    });

    it('should be significantly faster than legacy mode', async () => {
      const startRESTful = Date.now();
      await fetchWithAuth(`${BASE_URL}/api/novel/projects/${testProjectId}`);
      const restfulTime = Date.now() - startRESTful;

      const startLegacy = Date.now();
      await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}?include_chapters=true&limit=50`
      );
      const legacyTime = Date.now() - startLegacy;

      // RESTful 模式应该至少快 50%
      expect(restfulTime).toBeLessThan(legacyTime * 0.5);
    });
  });

  describe('Task #3: Backward Compatibility', () => {
    it('should detect legacy mode with include_chapters=true', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}?include_chapters=true&limit=10`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // 应该返回旧版数据结构
      expect(data).toHaveProperty('chapters');
      expect(data).toHaveProperty('pagination');

      // 验证 chapters 数组
      expect(Array.isArray(data.chapters)).toBe(true);

      // 验证分页元数据
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
    });

    it('should support include_content parameter in legacy mode', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}?include_chapters=true&include_content=true&limit=5`
      );

      const data = await response.json();

      // 应该包含章节内容
      if (data.chapters && data.chapters.length > 0) {
        expect(data.chapters[0]).toHaveProperty('content');
      }
    });

    it('should return same data structure as before refactor', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}?include_chapters=true&page=1&limit=20`
      );

      const data = await response.json();

      // 验证旧版数据结构完整性
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('chapters');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('has_next');
      expect(data.pagination).toHaveProperty('has_prev');
    });
  });

  describe('Task #4: Stats Endpoint', () => {
    it('should return comprehensive statistics', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/stats`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // 验证基础统计
      expect(data).toHaveProperty('total_chapters');
      expect(data).toHaveProperty('total_words');
      expect(data).toHaveProperty('avg_words_per_chapter');

      // 验证进度统计
      expect(data).toHaveProperty('target_words');
      expect(data).toHaveProperty('completion_rate');
      expect(data).toHaveProperty('words_remaining');

      // 验证状态分布
      expect(data).toHaveProperty('status_breakdown');
      expect(data.status_breakdown).toHaveProperty('draft');
      expect(data.status_breakdown).toHaveProperty('published');

      // 验证字数分布
      expect(data).toHaveProperty('word_count_distribution');
      expect(data.word_count_distribution).toHaveProperty('min');
      expect(data.word_count_distribution).toHaveProperty('max');
      expect(data.word_count_distribution).toHaveProperty('median');

      // 验证元数据
      expect(data._meta).toMatchObject({
        cache_status: 'real-time',
      });
      expect(data._meta).toHaveProperty('calculated_at');
    });

    it('should calculate completion rate correctly', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/stats`
      );

      const data = await response.json();

      if (data.target_words && data.target_words > 0) {
        const expectedRate = Math.min(1, data.total_words / data.target_words);
        expect(data.completion_rate).toBeCloseTo(expectedRate, 2);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('RESTful mode should be faster than 100ms for large projects', async () => {
      const start = Date.now();
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}`
      );
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // 目标：< 100ms
    });

    it('Chapter list should handle pagination efficiently', async () => {
      const start = Date.now();
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/chapters?page=1&limit=50`
      );
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200); // 目标：< 200ms
    });

    it('Stats calculation should complete within 500ms', async () => {
      const start = Date.now();
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/stats`
      );
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // 目标：< 500ms
    });
  });

  describe('Phase 1: Prisma Middleware Integration', () => {
    it('should auto-update project stats when creating chapter', async () => {
      // 获取创建前的统计
      const beforeStats = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/stats`
      ).then(r => r.json());

      // 创建新章节
      const createResponse = await fetchWithAuth(
        `${BASE_URL}/api/novel/chapters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: testProjectId,
            chapter_number: 999,
            title: '测试章节',
            content: '测试内容...',
            word_count: 1000,
          }),
        }
      );

      expect(createResponse.status).toBe(200);

      // 等待中间件执行（异步）
      await new Promise(resolve => setTimeout(resolve, 100));

      // 获取创建后的统计
      const afterStats = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/stats`
      ).then(r => r.json());

      // 验证统计已自动更新
      expect(afterStats.total_chapters).toBe(beforeStats.total_chapters + 1);
      expect(afterStats.total_words).toBe(beforeStats.total_words + 1000);
    });

    it('verify-stats endpoint should detect and fix inconsistencies', async () => {
      const response = await fetchWithAuth(
        `${BASE_URL}/api/novel/projects/${testProjectId}/verify-stats`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('is_consistent');
      expect(data).toHaveProperty('stored_stats');
      expect(data).toHaveProperty('calculated_stats');

      // 如果不一致，应该已经修复
      if (!data.is_consistent) {
        expect(data.fixed).toBe(true);
      }
    });
  });
});
