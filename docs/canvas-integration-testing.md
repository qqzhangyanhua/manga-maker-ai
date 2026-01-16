# 无限画布集成测试策略

## 测试概览

本文档提供无限画布功能与 novel-backend 集成的完整测试策略，包括单元测试、集成测试和端到端测试。

## 1. 单元测试

### 1.1 NovelBackendClient 测试

**文件位置：** `src/lib/__tests__/novel-backend-client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NovelBackendClient, NovelBackendError } from '../novel-backend-client';

describe('NovelBackendClient', () => {
  let client: NovelBackendClient;

  beforeEach(() => {
    client = new NovelBackendClient({
      baseUrl: 'http://localhost:8000',
      timeout: 5000,
      maxRetries: 2,
    });
  });

  describe('analyzeScript', () => {
    it('应该成功调用剧本分析 API', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          segments: [
            {
              segment_order: 1,
              content: '测试剧本',
              scene_description: '测试场景',
              character_actions: '测试动作',
              dialogue: '测试对白',
              estimated_duration: 30,
              emotion_tone: '平静',
            },
          ],
        }),
      });

      const result = await client.analyzeScript({
        chapter_content: '测试章节内容',
        chapter_number: 1,
      });

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].content).toBe('测试剧本');
    });

    it('应该在 HTTP 错误时抛出异常', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(
        client.analyzeScript({
          chapter_content: '测试',
          chapter_number: 1,
        })
      ).rejects.toThrow(NovelBackendError);
    });

    it('应该在超时后重试', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error('Timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, segments: [] }),
        });
      });

      const result = await client.analyzeScript({
        chapter_content: '测试',
        chapter_number: 1,
      });

      expect(callCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('应该在达到最大重试次数后抛出异常', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        client.analyzeScript({
          chapter_content: '测试',
          chapter_number: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('应该返回 true 当服务健康', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('应该返回 false 当服务不可用', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });
});
```

### 1.2 API Route 单元测试

**文件位置：** `src/app/api/canvas/chapter/[id]/generate-script/__tests__/route.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { prisma } from '@/lib/db';
import { getNovelBackendClient } from '@/lib/novel-backend-client';

vi.mock('@/lib/db');
vi.mock('@/lib/novel-backend-client');
vi.mock('next/headers');

describe('POST /api/canvas/chapter/[id]/generate-script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该返回 401 当未登录', async () => {
    const mockCookies = vi.fn().mockResolvedValue({
      get: () => undefined,
    });
    vi.mocked(require('next/headers').cookies).mockImplementation(mockCookies);

    const response = await POST(
      new Request('http://localhost/api/canvas/chapter/test-id/generate-script', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'test-id' }) }
    );

    expect(response.status).toBe(401);
  });

  it('应该成功生成剧本', async () => {
    // Mock authentication
    const mockCookies = vi.fn().mockResolvedValue({
      get: () => ({ value: 'valid-token' }),
    });
    vi.mocked(require('next/headers').cookies).mockImplementation(mockCookies);

    // Mock Prisma
    vi.mocked(prisma.timelineChapter.findUnique).mockResolvedValue({
      id: 'chapter-id',
      chapter_number: 1,
      timeline_id: 'timeline-id',
      content: '测试章节内容',
      timeline: {
        user_id: 'user-id',
        novel_project: {
          chapters: [{ content: '章节内容' }],
        },
      },
    } as any);

    // Mock NovelBackendClient
    const mockClient = {
      healthCheck: vi.fn().mockResolvedValue(true),
      analyzeScript: vi.fn().mockResolvedValue({
        success: true,
        segments: [
          {
            segment_order: 1,
            content: '剧本片段',
            scene_description: '场景',
            character_actions: '动作',
            dialogue: null,
            estimated_duration: 30,
            emotion_tone: '平静',
          },
        ],
      }),
    };
    vi.mocked(getNovelBackendClient).mockReturnValue(mockClient as any);

    vi.mocked(prisma.scriptSegment.create).mockResolvedValue({
      id: 'segment-id',
    } as any);

    vi.mocked(prisma.timelineChapter.update).mockResolvedValue({} as any);

    const response = await POST(
      new Request('http://localhost/api/canvas/chapter/chapter-id/generate-script', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'chapter-id' }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.segments).toHaveLength(1);
  });

  it('应该返回 400 当章节内容为空', async () => {
    // Mock 类似上面，但 content 为空字符串
    // ...
  });

  it('应该在 novel-backend 不可用时返回错误', async () => {
    // Mock healthCheck 返回 false
    // ...
  });
});
```

## 2. 集成测试

### 2.1 端到端 API 测试

**文件位置：** `tests/integration/canvas-workflow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let testUserId: string;
let testTimelineId: string;
let testChapterId: string;

describe('Canvas Workflow Integration', () => {
  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-canvas@example.com',
        password_hash: 'hashed-password',
        credits: 10000,
      },
    });
    testUserId = user.id;

    // 创建测试时间线
    const timeline = await prisma.canvasTimeline.create({
      data: {
        user_id: testUserId,
        title: '测试时间线',
      },
    });
    testTimelineId = timeline.id;

    // 创建测试章节
    const chapter = await prisma.timelineChapter.create({
      data: {
        timeline_id: testTimelineId,
        chapter_number: 1,
        content: '这是一个测试章节的内容。主人公小明走在街上，突然遇到了神秘的陌生人。',
      },
    });
    testChapterId = chapter.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.scriptSegment.deleteMany({ where: { timeline_chapter_id: testChapterId } });
    await prisma.timelineChapter.delete({ where: { id: testChapterId } });
    await prisma.canvasTimeline.delete({ where: { id: testTimelineId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('完整工作流：剧本 → 镜头 → 场景 → 漫画图', async () => {
    // 步骤 1: 生成剧本
    const scriptResponse = await fetch(
      `http://localhost:3000/api/canvas/chapter/${testChapterId}/generate-script`,
      {
        method: 'POST',
        headers: {
          Cookie: 'comicai_session=test-token', // 需要有效 token
        },
      }
    );
    expect(scriptResponse.ok).toBe(true);
    const scriptData = await scriptResponse.json();
    expect(scriptData.success).toBe(true);
    expect(scriptData.segments.length).toBeGreaterThan(0);

    // 验证数据库状态
    const chapter1 = await prisma.timelineChapter.findUnique({
      where: { id: testChapterId },
    });
    expect(chapter1?.script_status).toBe('completed');

    // 步骤 2: 生成镜头
    const shotsResponse = await fetch(
      `http://localhost:3000/api/canvas/chapter/${testChapterId}/generate-shots`,
      {
        method: 'POST',
        headers: {
          Cookie: 'comicai_session=test-token',
        },
      }
    );
    expect(shotsResponse.ok).toBe(true);
    const shotsData = await shotsResponse.json();
    expect(shotsData.success).toBe(true);

    const chapter2 = await prisma.timelineChapter.findUnique({
      where: { id: testChapterId },
    });
    expect(chapter2?.shot_status).toBe('completed');

    // 步骤 3: 生成场景图（MOCK）
    const scenesResponse = await fetch(
      `http://localhost:3000/api/canvas/chapter/${testChapterId}/generate-scenes`,
      {
        method: 'POST',
        headers: {
          Cookie: 'comicai_session=test-token',
        },
      }
    );
    expect(scenesResponse.ok).toBe(true);
    const scenesData = await scenesResponse.json();
    expect(scenesData.metadata.is_mock).toBe(true);

    // 步骤 4: 生成最终图（MOCK）
    const finalsResponse = await fetch(
      `http://localhost:3000/api/canvas/chapter/${testChapterId}/generate-finals`,
      {
        method: 'POST',
        headers: {
          Cookie: 'comicai_session=test-token',
        },
      }
    );
    expect(finalsResponse.ok).toBe(true);
    const finalsData = await finalsResponse.json();
    expect(finalsData.metadata.is_mock).toBe(true);
  }, 120000); // 120秒超时
});
```

## 3. 端到端测试（E2E）

### 3.1 Playwright 测试

**文件位置：** `tests/e2e/canvas-ui.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('无限画布 UI 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('完整生成流程', async ({ page }) => {
    // 1. 进入画布页面
    await page.goto('http://localhost:3000/novel/canvas/test-timeline-id');
    await page.waitForSelector('.timeline-container');

    // 2. 点击生成剧本按钮
    await page.click('button:has-text("生成剧本")');

    // 3. 等待生成完成（观察状态变化）
    await page.waitForSelector('text=已完成', { timeout: 60000 });

    // 4. 验证控制台日志
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    expect(logs.some((log) => log.includes('剧本分析完成'))).toBe(true);

    // 5. 点击生成镜头按钮
    await page.click('button:has-text("生成镜头")');
    await page.waitForSelector('text=镜头生成成功', { timeout: 60000 });

    // 6. 验证数据更新
    const shotCount = await page.textContent('.shot-count');
    expect(parseInt(shotCount || '0')).toBeGreaterThan(0);
  });

  test('错误处理：章节内容为空', async ({ page }) => {
    // 访问空内容章节
    await page.goto('http://localhost:3000/novel/canvas/empty-chapter-id');
    await page.click('button:has-text("生成剧本")');

    // 应显示错误提示
    await expect(page.locator('text=章节内容为空')).toBeVisible();
  });

  test('错误处理：服务不可用', async ({ page }) => {
    // 停止 novel-backend 服务（模拟）
    // ...

    await page.goto('http://localhost:3000/novel/canvas/test-timeline-id');
    await page.click('button:has-text("生成剧本")');

    // 应显示服务不可用错误
    await expect(page.locator('text=服务不可用')).toBeVisible();
  });
});
```

## 4. 性能测试

### 4.1 负载测试脚本

**文件位置：** `tests/performance/canvas-load-test.ts`

```typescript
import autocannon from 'autocannon';

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:3000/api/canvas/chapter/test-id/generate-script',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'comicai_session=test-token',
    },
    connections: 10, // 并发连接数
    duration: 30, // 测试持续时间（秒）
  });

  console.log('负载测试结果：');
  console.log(`平均响应时间: ${result.latency.mean}ms`);
  console.log(`99% 响应时间: ${result.latency.p99}ms`);
  console.log(`请求成功率: ${(result.non2xx / result.requests.total) * 100}%`);
}

runLoadTest();
```

### 4.2 性能基准

| 操作 | 目标响应时间 | 最大可接受时间 |
|------|------------|--------------|
| 剧本生成 | < 15秒 | < 30秒 |
| 镜头规划 | < 10秒 | < 20秒 |
| 场景图生成 | < 5秒 | < 10秒 |
| 最终图生成 | < 10秒 | < 20秒 |

## 5. 手动测试清单

### 5.1 功能测试

- [ ] **剧本生成**
  - [ ] 正常流程：章节内容 → 剧本片段
  - [ ] 空内容错误处理
  - [ ] 超长内容截断（8000字符）
  - [ ] 多语言内容支持

- [ ] **镜头规划**
  - [ ] 依赖检查：剧本未生成时提示错误
  - [ ] 正常流程：剧本片段 → 镜头设计
  - [ ] 多个剧本片段批量处理

- [ ] **场景图生成（MOCK）**
  - [ ] MOCK 数据返回
  - [ ] `is_mock: true` 标记
  - [ ] Placeholder 图片 URL

- [ ] **最终图生成（MOCK）**
  - [ ] MOCK 数据返回
  - [ ] 时间线统计更新

### 5.2 边界测试

- [ ] 超长章节内容（10000+ 字符）
- [ ] 极短章节内容（< 100 字符）
- [ ] 特殊字符和 Emoji
- [ ] 并发请求（多个用户同时生成）
- [ ] 网络超时模拟
- [ ] novel-backend 崩溃恢复

### 5.3 安全测试

- [ ] 未登录访问拦截
- [ ] 跨用户权限检查（用户 A 无法操作用户 B 的章节）
- [ ] SQL 注入防护
- [ ] XSS 攻击防护

## 6. 测试环境配置

### 6.1 本地测试环境

```bash
# .env.test
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga_test
NOVEL_BACKEND_URL=http://localhost:8001  # 测试端口
AUTH_SECRET=test-secret-key
```

### 6.2 CI/CD 测试流程

```yaml
# .github/workflows/test.yml
name: Test Canvas Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: manga123
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run database migrations
        run: npx prisma migrate deploy

      - name: Start novel-backend
        run: |
          cd services/novel-backend
          pip install -r requirements.txt
          uvicorn app.main:app --port 8001 &
          sleep 5

      - name: Run unit tests
        run: pnpm test

      - name: Run integration tests
        run: pnpm test:integration

      - name: Run E2E tests
        run: pnpm test:e2e
```

## 7. 验收标准

### 7.1 功能验收

✅ **必须通过：**
- [ ] 所有单元测试通过（覆盖率 > 80%）
- [ ] 集成测试完整流程通过
- [ ] 剧本生成返回有效数据
- [ ] 镜头规划返回有效数据
- [ ] 错误处理正确（401/403/404/500）
- [ ] 日志记录完整

### 7.2 性能验收

✅ **必须达标：**
- [ ] 剧本生成 < 30秒（P99）
- [ ] 镜头规划 < 20秒（P99）
- [ ] 并发 10 用户无错误
- [ ] 数据库查询 < 100ms

### 7.3 安全验收

✅ **必须满足：**
- [ ] 所有 API 都有身份验证
- [ ] 跨用户权限检查生效
- [ ] 敏感信息不泄露在日志中
- [ ] SQL 注入测试通过

## 8. 已知问题和限制

### 8.1 当前限制

- **MOCK 数据**：generate-scenes 和 generate-finals 使用占位数据
- **章节内容获取**：假设 chapter_number = 1，需要改进多章节支持
- **角色信息**：planShots 的 available_characters 为空数组
- **超时时间**：默认 60秒可能不足以处理超长内容

### 8.2 待改进项

- [ ] 添加进度条（实时反馈生成进度）
- [ ] 支持任务取消
- [ ] 实现批量重试失败的片段
- [ ] 优化数据库查询（减少 N+1 问题）

## 总结

本测试策略覆盖了从单元测试到端到端测试的完整验证流程。在正式发布前，请确保所有验收标准都已满足。
