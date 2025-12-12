# 第一阶段开发实施计划

**项目**: Manga Maker AI - 第一阶段实施计划
**版本**: v1.0
**开发负责人**: Development Team Lead
**日期**: 2025-12-12
**工期**: 8周 (2025-12-16 ~ 2026-02-10)

---

## 📋 目录

- [一、团队组织与分工](#一团队组织与分工)
- [二、Sprint 规划](#二sprint-规划)
- [三、详细任务分解](#三详细任务分解)
- [四、技术实施指南](#四技术实施指南)
- [五、测试计划](#五测试计划)
- [六、上线检查清单](#六上线检查清单)
- [七、风险管理](#七风险管理)

---

## 一、团队组织与分工

### 1.1 团队成员

| 角色 | 人员 | 主要职责 |
|------|------|---------|
| **Tech Lead** | @张三 | 架构设计、代码审查、技术决策 |
| **Backend Dev 1** | @李四 | 数据库设计、API 开发 (模板) |
| **Backend Dev 2** | @王五 | API 开发 (批量生成、版本控制) |
| **Frontend Dev 1** | @赵六 | 模板市场、批量生成 UI |
| **Frontend Dev 2** | @孙七 | 版本控制、搜索 UI |
| **QA Engineer** | @周八 | 测试用例编写、自动化测试 |
| **DevOps** | @吴九 | CI/CD、数据库迁移、监控 |

### 1.2 沟通机制

**每日站会** (15分钟):
- 时间: 每天 10:00 AM
- 内容:
  - 昨天完成了什么
  - 今天计划做什么
  - 遇到什么阻碍

**周会** (1小时):
- 时间: 每周一 2:00 PM
- 内容:
  - Sprint 回顾
  - Sprint 规划
  - 技术分享

**Code Review**:
- 所有代码必须经过至少 1 人审查
- 使用 GitHub Pull Request
- 审查标准:
  - 功能完整性
  - 代码质量
  - 测试覆盖率
  - 性能考虑

---

## 二、Sprint 规划

### Sprint 概览

```
Sprint 1 (Week 1-2):  数据库设计 + 分镜模板基础功能
Sprint 2 (Week 3-4):  批量生成 + 模板市场
Sprint 3 (Week 5-6):  版本控制
Sprint 4 (Week 7):    标签与搜索
Sprint 5 (Week 8):    集成测试 + 优化 + 上线
```

### 详细时间线

```
Week 1: 12/16-12/22
  ├─ Day 1-2: 数据库设计与迁移
  ├─ Day 3-4: 模板 CRUD API
  └─ Day 5:   模板前端组件

Week 2: 12/23-12/29
  ├─ Day 1-2: 模板应用逻辑
  ├─ Day 3:   官方模板数据
  └─ Day 4-5: 单元测试 + Bug 修复

Week 3: 12/30-01/05
  ├─ Day 1-2: 批量生成 API
  ├─ Day 3:   生成任务队列
  └─ Day 4-5: 批量生成 UI

Week 4: 01/06-01/12
  ├─ Day 1-2: 变体生成 API
  ├─ Day 3:   模板市场页面
  └─ Day 4-5: 集成测试

Week 5: 01/13-01/19
  ├─ Day 1-2: 版本控制 API
  ├─ Day 3:   版本历史 UI
  └─ Day 4-5: 版本对比功能

Week 6: 01/20-01/26
  ├─ Day 1-2: 版本恢复功能
  ├─ Day 3:   自动保存逻辑
  └─ Day 4-5: 测试 + Bug 修复

Week 7: 01/27-02/02
  ├─ Day 1:   标签系统 API
  ├─ Day 2-3: 搜索功能
  ├─ Day 4:   筛选器 UI
  └─ Day 5:   集成测试

Week 8: 02/03-02/10
  ├─ Day 1-2: 端到端测试
  ├─ Day 3:   性能优化
  ├─ Day 4:   数据库备份与迁移脚本
  └─ Day 5:   上线部署
```

---

## 三、详细任务分解

### Sprint 1: 数据库设计 + 分镜模板基础功能

#### 3.1 任务列表

| ID | 任务 | 负责人 | 预计工时 | 优先级 | 依赖 |
|----|------|--------|---------|--------|------|
| S1-T1 | 设计 Prisma Schema | Backend 1 | 4h | P0 | - |
| S1-T2 | 编写数据库迁移脚本 | Backend 1 | 4h | P0 | S1-T1 |
| S1-T3 | 执行迁移并验证 | DevOps | 2h | P0 | S1-T2 |
| S1-T4 | 插入官方模板数据 | Backend 1 | 2h | P0 | S1-T3 |
| S1-T5 | 实现 GET /api/templates | Backend 1 | 6h | P0 | S1-T3 |
| S1-T6 | 实现 POST /api/templates | Backend 1 | 6h | P0 | S1-T3 |
| S1-T7 | 实现 GET /api/templates/{id} | Backend 1 | 3h | P0 | S1-T5 |
| S1-T8 | 实现 DELETE /api/templates/{id} | Backend 1 | 3h | P1 | S1-T5 |
| S1-T9 | 编写 API 单元测试 | QA | 8h | P0 | S1-T5-T8 |
| S1-T10 | 创建 TemplateCard 组件 | Frontend 1 | 4h | P0 | S1-T5 |
| S1-T11 | 创建 TemplateGrid 组件 | Frontend 1 | 4h | P0 | S1-T10 |
| S1-T12 | 创建 SaveAsTemplateDialog 组件 | Frontend 1 | 6h | P0 | S1-T6 |
| S1-T13 | 集成到 /scripts/[id] 页面 | Frontend 1 | 4h | P0 | S1-T12 |

#### 3.2 详细实施步骤

**S1-T1: 设计 Prisma Schema**

```prisma
// prisma/schema.prisma

model PanelTemplate {
  id              String   @id @default(cuid())
  userId          String?  @map("user_id")
  name            String   @db.VarChar(100)
  description     String?  @db.Text
  panelCount      Int      @map("panel_count")
  templateData    Json     @map("template_data")
  tags            String[]
  isPublic        Boolean  @default(false) @map("is_public")
  isOfficial      Boolean  @default(false) @map("is_official")
  likesCount      Int      @default(0) @map("likes_count")
  usageCount      Int      @default(0) @map("usage_count")
  thumbnailUrl    String?  @map("thumbnail_url")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  likes           TemplateLike[]

  @@index([userId])
  @@index([isPublic, isOfficial])
  @@index([tags])
  @@map("panel_templates")
}

model TemplateLike {
  id              String   @id @default(cuid())
  templateId      String   @map("template_id")
  userId          String   @map("user_id")
  createdAt       DateTime @default(now()) @map("created_at")

  template        PanelTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([templateId, userId])
  @@index([userId])
  @@map("template_likes")
}

// User 表扩展
model User {
  // ... 现有字段
  panelTemplates  PanelTemplate[]
  templateLikes   TemplateLike[]
}
```

**检查清单**:
- [ ] 字段类型正确
- [ ] 索引合理
- [ ] 外键关系正确
- [ ] 与现有表无冲突

**S1-T5: 实现 GET /api/templates**

```typescript
// src/app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface GetTemplatesQuery {
  page?: string;
  limit?: string;
  tags?: string;
  type?: "my" | "official" | "community";
  panelCount?: string;
  search?: string;
}

export async function GET(req: NextRequest) {
  try {
    // 认证 (可选,未登录返回公开模板)
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    let userId: string | null = null;

    if (token) {
      const payload = verifyAuthToken(token);
      userId = payload?.userId || null;
    }

    // 解析查询参数
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const tags = searchParams.get("tags")?.split(",") || [];
    const type = searchParams.get("type") as "my" | "official" | "community" | null;
    const panelCount = searchParams.get("panelCount");
    const search = searchParams.get("search");

    // 构建查询条件
    const where: any = {};

    // 根据 type 筛选
    if (type === "my") {
      if (!userId) {
        return NextResponse.json({ error: "需要登录" }, { status: 401 });
      }
      where.userId = userId;
    } else if (type === "official") {
      where.isOfficial = true;
    } else if (type === "community") {
      where.isPublic = true;
      where.isOfficial = false;
    } else {
      // 默认: 公开的 + 我的
      where.OR = [
        { isPublic: true },
        ...(userId ? [{ userId }] : [])
      ];
    }

    // 标签筛选
    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // 分镜数量筛选
    if (panelCount) {
      const [min, max] = panelCount.split("-").map(Number);
      where.panelCount = { gte: min, lte: max };
    }

    // 搜索
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    // 查询总数
    const total = await prisma.panelTemplate.count({ where });

    // 查询模板
    const templates = await prisma.panelTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        panelCount: true,
        tags: true,
        isPublic: true,
        isOfficial: true,
        likesCount: true,
        usageCount: true,
        thumbnailUrl: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        templates,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { error: "获取模板列表失败" },
      { status: 500 }
    );
  }
}
```

**测试用例**:
```typescript
// src/app/api/templates/route.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";

describe("GET /api/templates", () => {
  beforeEach(async () => {
    await prisma.panelTemplate.deleteMany();
  });

  it("应该返回公开模板", async () => {
    // 创建测试数据
    await prisma.panelTemplate.create({
      data: {
        name: "公开模板",
        panelCount: 3,
        templateData: {},
        isPublic: true
      }
    });

    const req = new NextRequest("http://localhost/api/templates");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.templates).toHaveLength(1);
  });

  it("应该支持标签筛选", async () => {
    await prisma.panelTemplate.createMany({
      data: [
        { name: "模板1", panelCount: 3, templateData: {}, isPublic: true, tags: ["对话"] },
        { name: "模板2", panelCount: 4, templateData: {}, isPublic: true, tags: ["战斗"] }
      ]
    });

    const req = new NextRequest("http://localhost/api/templates?tags=对话");
    const res = await GET(req);
    const data = await res.json();

    expect(data.data.templates).toHaveLength(1);
    expect(data.data.templates[0].name).toBe("模板1");
  });

  it("应该支持分页", async () => {
    // 创建 25 个模板
    await prisma.panelTemplate.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        name: `模板${i}`,
        panelCount: 3,
        templateData: {},
        isPublic: true
      }))
    });

    const req = new NextRequest("http://localhost/api/templates?page=2&limit=10");
    const res = await GET(req);
    const data = await res.json();

    expect(data.data.templates).toHaveLength(10);
    expect(data.data.pagination.totalPages).toBe(3);
  });
});
```

---

### Sprint 2: 批量生成 + 模板市场

#### 3.3 任务列表

| ID | 任务 | 负责人 | 预计工时 | 优先级 | 依赖 |
|----|------|--------|---------|--------|------|
| S2-T1 | 设计 GenerationTask Schema | Backend 2 | 3h | P0 | - |
| S2-T2 | 实现 POST /api/panel/batch-generate | Backend 2 | 8h | P0 | S2-T1 |
| S2-T3 | 实现 GET /api/generation-tasks/{id} | Backend 2 | 4h | P0 | S2-T1 |
| S2-T4 | 实现 POST /api/generation-tasks/{id}/cancel | Backend 2 | 3h | P1 | S2-T3 |
| S2-T5 | 实现批量生成队列逻辑 | Backend 2 | 8h | P0 | S2-T2 |
| S2-T6 | 实现 POST /api/panel/{id}/variants | Backend 2 | 6h | P0 | S2-T1 |
| S2-T7 | 创建 BatchGenerateDialog 组件 | Frontend 1 | 6h | P0 | S2-T2 |
| S2-T8 | 创建 GenerationProgress 组件 | Frontend 1 | 6h | P0 | S2-T3 |
| S2-T9 | 创建 VariantSelector 组件 | Frontend 1 | 6h | P0 | S2-T6 |
| S2-T10 | 集成到 /scripts/[id] 页面 | Frontend 1 | 4h | P0 | S2-T7-T9 |
| S2-T11 | 创建 /templates 页面 | Frontend 1 | 6h | P0 | Sprint 1 |
| S2-T12 | 实现模板筛选和搜索 | Frontend 1 | 4h | P0 | S2-T11 |
| S2-T13 | 编写集成测试 | QA | 8h | P0 | S2-T10 |

#### 3.4 详细实施步骤

**S2-T2: 实现 POST /api/panel/batch-generate**

```typescript
// src/app/api/panel/batch-generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { assertAndIncrementUsage } from "@/lib/usage";
import { prisma } from "@/lib/db";

interface BatchGenerateBody {
  projectId: string;
  panelIds: string[];
  settings: {
    style?: string;
    quality?: "standard" | "high";
    failureMode?: "skip" | "stop";
  };
}

export async function POST(req: NextRequest) {
  try {
    // 认证
    const result = await requireAuth();
    if (result instanceof NextResponse) return result;
    const payload = result;

    // 解析请求体
    const body: BatchGenerateBody = await req.json();
    const { projectId, panelIds, settings } = body;

    // 验证参数
    if (!projectId || !panelIds || panelIds.length === 0) {
      return NextResponse.json(
        { error: "缺少必填参数" },
        { status: 400 }
      );
    }

    // 检查配额
    await assertAndIncrementUsage({
      userId: payload.userId,
      action: "batch_generate",
      providerType: "image_generation",
      count: panelIds.length
    });

    // 创建生成任务
    const task = await prisma.generationTask.create({
      data: {
        userId: payload.userId,
        projectId,
        panelIds,
        taskType: "batch",
        status: "pending",
        progress: 0,
        currentPanelIndex: 0,
        settings
      }
    });

    // 启动异步生成任务 (不等待)
    processBatchGeneration(task.id).catch(error => {
      console.error("Batch generation error:", error);
    });

    // 立即返回任务 ID
    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        panelCount: panelIds.length,
        estimatedTime: panelIds.length * 10  // 每个分镜约10秒
      },
      usage: {
        count: panelIds.length,
        limit: 100  // 从配置读取
      }
    });
  } catch (error: any) {
    if (error.code === "QUOTA_EXCEEDED") {
      return NextResponse.json(
        { error: error.message, code: "QUOTA_EXCEEDED" },
        { status: 429 }
      );
    }
    console.error("POST /api/panel/batch-generate error:", error);
    return NextResponse.json(
      { error: "批量生成失败" },
      { status: 500 }
    );
  }
}

// 异步处理批量生成
async function processBatchGeneration(taskId: string) {
  try {
    const task = await prisma.generationTask.findUnique({
      where: { id: taskId }
    });

    if (!task) return;

    // 更新状态为 processing
    await prisma.generationTask.update({
      where: { id: taskId },
      data: { status: "processing" }
    });

    const errorLogs: any[] = [];

    // 依次生成每个分镜
    for (let i = 0; i < task.panelIds.length; i++) {
      const panelId = task.panelIds[i];

      // 检查任务是否被取消
      const currentTask = await prisma.generationTask.findUnique({
        where: { id: taskId },
        select: { status: true }
      });

      if (currentTask?.status === "cancelled") {
        break;
      }

      try {
        // 获取分镜信息
        const panel = await prisma.panel.findUnique({
          where: { id: panelId }
        });

        if (!panel) {
          throw new Error(`Panel ${panelId} not found`);
        }

        // 调用 AI 生成接口 (复用现有逻辑)
        const imageUrl = await generatePanelImage(panel, task.settings);

        // 更新分镜图片
        await prisma.panel.update({
          where: { id: panelId },
          data: { image_url: imageUrl }
        });

        // 更新任务进度
        await prisma.generationTask.update({
          where: { id: taskId },
          data: {
            currentPanelIndex: i + 1,
            progress: Math.round(((i + 1) / task.panelIds.length) * 100)
          }
        });
      } catch (error: any) {
        console.error(`Generate panel ${panelId} failed:`, error);

        errorLogs.push({
          panelId,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // 根据失败模式决定是否继续
        if (task.settings.failureMode === "stop") {
          await prisma.generationTask.update({
            where: { id: taskId },
            data: {
              status: "failed",
              errorLogs
            }
          });
          return;
        }
        // failureMode === "skip": 跳过,继续下一个
      }
    }

    // 全部完成
    await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        errorLogs: errorLogs.length > 0 ? errorLogs : undefined
      }
    });
  } catch (error) {
    console.error("Process batch generation error:", error);
    await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorLogs: [{ error: String(error), timestamp: new Date().toISOString() }]
      }
    });
  }
}

// 辅助函数: 生成分镜图片 (复用现有逻辑)
async function generatePanelImage(panel: any, settings: any): Promise<string> {
  // TODO: 调用现有的图片生成逻辑
  // 示例伪代码:
  // const prompt = buildPrompt(panel, settings);
  // const imageUrl = await callImageGenerationAPI(prompt);
  // return imageUrl;
  return "https://placeholder.com/image.jpg";
}
```

**S2-T8: 创建 GenerationProgress 组件**

```typescript
// src/components/BatchGeneration/GenerationProgress.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Circle, XCircle } from "lucide-react";

interface GenerationProgressProps {
  taskId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface GenerationTask {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  currentPanelIndex: number;
  panelIds: string[];
  errorLogs?: Array<{ panelId: string; error: string }>;
}

export function GenerationProgress({
  taskId,
  onComplete,
  onCancel
}: GenerationProgressProps) {
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollTaskStatus = async () => {
      try {
        const response = await fetch(`/api/generation-tasks/${taskId}`);
        const data = await response.json();

        if (data.success) {
          setTask(data.data.task);

          // 任务完成或失败,停止轮询
          if (
            data.data.task.status === "completed" ||
            data.data.task.status === "failed" ||
            data.data.task.status === "cancelled"
          ) {
            clearInterval(interval);

            if (data.data.task.status === "completed") {
              setTimeout(onComplete, 1000);  // 延迟1秒显示完成状态
            }
          }
        }
      } catch (error) {
        console.error("Poll task status error:", error);
      }
    };

    // 立即执行一次
    pollTaskStatus();

    // 每2秒轮询一次
    interval = setInterval(pollTaskStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId, onComplete]);

  const handleCancel = async () => {
    if (!task || isCancelling) return;

    setIsCancelling(true);

    try {
      await fetch(`/api/generation-tasks/${taskId}/cancel`, {
        method: "POST"
      });
      onCancel();
    } catch (error) {
      console.error("Cancel task error:", error);
      setIsCancelling(false);
    }
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  const successCount = task.currentPanelIndex - (task.errorLogs?.length || 0);
  const failedCount = task.errorLogs?.length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {task.status === "completed"
            ? "生成完成"
            : task.status === "failed"
            ? "生成失败"
            : task.status === "cancelled"
            ? "已取消"
            : `正在生成 (${task.currentPanelIndex}/${task.panelIds.length})`}
        </h3>

        {(task.status === "pending" || task.status === "processing") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? "取消中..." : "取消"}
          </Button>
        )}
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <Progress value={task.progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{task.progress}%</span>
          <span>
            成功: {successCount} | 失败: {failedCount}
          </span>
        </div>
      </div>

      {/* 分镜列表 */}
      <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-4">
        {task.panelIds.map((panelId, index) => {
          const isCompleted = index < task.currentPanelIndex;
          const isCurrent = index === task.currentPanelIndex;
          const isFailed = task.errorLogs?.some(log => log.panelId === panelId);

          return (
            <div
              key={panelId}
              className="flex items-center gap-3 py-2 px-3 rounded hover:bg-muted/50"
            >
              {isFailed ? (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              ) : isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
              )}

              <span className="text-sm">分镜 {index + 1}</span>

              {isFailed && (
                <span className="text-xs text-red-500 ml-auto">
                  {task.errorLogs?.find(log => log.panelId === panelId)?.error}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 错误汇总 */}
      {failedCount > 0 && (
        <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950 p-4 rounded">
          <p className="text-sm text-red-800 dark:text-red-200">
            {failedCount} 个分镜生成失败,请检查错误日志或重试
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### Sprint 3-5 任务详细说明

**由于篇幅限制,Sprint 3-5 的详细实施步骤请参考:**
- Sprint 3: 版本控制 - 参考架构文档第二章 2.2.3 节
- Sprint 4: 标签与搜索 - 参考架构文档第二章 2.2.4 节
- Sprint 5: 集成测试与上线 - 参考第五章测试计划

---

## 四、技术实施指南

### 4.1 代码规范

**TypeScript 类型定义**:
```typescript
// src/types/template.ts
export interface PanelTemplate {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  panelCount: number;
  templateData: TemplateData;
  tags: string[];
  isPublic: boolean;
  isOfficial: boolean;
  likesCount: number;
  usageCount: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateData {
  panels: Array<{
    panel_type: string | null;
    camera_angle: string | null;
    shot_size: string | null;
    importance: "high" | "medium" | "low" | null;
    relative_position: number;
  }>;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  panelIds: string[];
  tags?: string[];
  isPublic?: boolean;
}
```

**组件 Props 类型**:
```typescript
// src/components/Template/TemplateCard.tsx
import type { PanelTemplate } from "@/types/template";

interface TemplateCardProps {
  template: PanelTemplate;
  onApply?: (template: PanelTemplate) => void;
  onLike?: (templateId: string) => void;
  isLiked?: boolean;
}

export function TemplateCard({
  template,
  onApply,
  onLike,
  isLiked = false
}: TemplateCardProps) {
  // ... 组件实现
}
```

### 4.2 错误处理模式

**统一错误类**:
```typescript
// src/lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details
    };
  }
}

// 使用示例
if (!projectId) {
  throw new ApiError("缺少项目ID", 400, "MISSING_PROJECT_ID");
}
```

**全局错误处理**:
```typescript
// src/app/api/[...endpoint]/error-handler.ts
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(error.toJSON(), {
          status: error.statusCode
        });
      }

      console.error("Unhandled error:", error);
      return NextResponse.json(
        { success: false, error: "服务器内部错误" },
        { status: 500 }
      );
    }
  };
}

// 使用示例
export const GET = withErrorHandler(async (req) => {
  // ... 业务逻辑
});
```

### 4.3 数据库查询优化技巧

**使用 Prisma 事务**:
```typescript
// 批量操作使用事务
await prisma.$transaction(async (tx) => {
  // 创建模板
  const template = await tx.panelTemplate.create({
    data: { ...templateData }
  });

  // 增加使用次数
  await tx.user.update({
    where: { id: userId },
    data: { template_count: { increment: 1 } }
  });
});
```

**避免 N+1 查询**:
```typescript
// ❌ 不好: N+1 查询
const templates = await prisma.panelTemplate.findMany();
for (const template of templates) {
  const likes = await prisma.templateLike.count({
    where: { templateId: template.id }
  });
}

// ✅ 好: 使用 include 预加载
const templates = await prisma.panelTemplate.findMany({
  include: {
    _count: {
      select: { likes: true }
    },
    user: {
      select: { id: true, name: true }
    }
  }
});
```

---

## 五、测试计划

### 5.1 单元测试

**测试框架**: Vitest + React Testing Library

**测试覆盖率目标**: > 80%

**测试文件位置**:
```
src/
├── app/api/templates/route.test.ts
├── app/api/panel/batch-generate/route.test.ts
├── components/Template/TemplateCard.test.tsx
└── lib/batch-generator.test.ts
```

**示例测试**:
```typescript
// src/lib/batch-generator.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBatchGeneration } from "./batch-generator";
import { prisma } from "./db";

vi.mock("./db", () => ({
  prisma: {
    generationTask: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    panel: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe("processBatchGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该依次生成所有分镜", async () => {
    const mockTask = {
      id: "task1",
      panelIds: ["panel1", "panel2", "panel3"],
      settings: { style: "manga" }
    };

    vi.mocked(prisma.generationTask.findUnique).mockResolvedValue(mockTask);

    await processBatchGeneration(mockTask.id);

    // 验证 update 被调用3次 (每个分镜一次)
    expect(prisma.panel.update).toHaveBeenCalledTimes(3);

    // 验证任务状态最终为 completed
    expect(prisma.generationTask.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "completed"
        })
      })
    );
  });

  it("应该处理失败的分镜", async () => {
    // ... 测试失败情况
  });
});
```

### 5.2 集成测试

**测试框架**: Playwright

**测试用例**:
```typescript
// tests/e2e/template-workflow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("模板创建和应用流程", () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("用户可以保存分镜为模板", async ({ page }) => {
    // 1. 进入项目编辑器
    await page.goto("/scripts/test-project-id");

    // 2. 选择分镜 (模拟 Shift+点击)
    await page.click('[data-panel-id="1"]');
    await page.keyboard.down("Shift");
    await page.click('[data-panel-id="3"]');
    await page.keyboard.up("Shift");

    // 3. 打开保存模板对话框
    await page.click("text=保存为模板");

    // 4. 填写模板信息
    await page.fill('input[name="name"]', "我的测试模板");
    await page.fill('textarea[name="description"]', "测试描述");
    await page.click('label:has-text("对话")');  // 选择标签

    // 5. 保存
    await page.click('button:has-text("保存")');

    // 6. 验证成功提示
    await expect(page.locator("text=模板创建成功")).toBeVisible();
  });

  test("用户可以应用模板到项目", async ({ page }) => {
    // 1. 进入模板市场
    await page.goto("/templates");

    // 2. 搜索模板
    await page.fill('input[placeholder="搜索模板"]', "对话");
    await page.keyboard.press("Enter");

    // 3. 点击模板卡片
    await page.click("text=对话标准-3格");

    // 4. 应用到项目
    await page.click("text=应用到项目");

    // 5. 选择项目
    await page.click("text=我的项目");

    // 6. 确认
    await page.click('button:has-text("应用")');

    // 7. 验证成功
    await expect(page.locator("text=模板已应用")).toBeVisible();

    // 8. 验证分镜已插入
    await page.goto("/scripts/my-project-id");
    await expect(page.locator('[data-panel-id]')).toHaveCount(3);
  });
});
```

### 5.3 性能测试

**测试工具**: k6

**测试场景**:
```javascript
// tests/performance/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // 1分钟上升到10用户
    { duration: '3m', target: 50 },   // 3分钟上升到50用户
    { duration: '1m', target: 0 },    // 1分钟降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95%请求<500ms
    http_req_failed: ['rate<0.01'],     // 错误率<1%
  },
};

export default function () {
  // 测试获取模板列表
  const res = http.get('http://localhost:3000/api/templates');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**运行测试**:
```bash
k6 run tests/performance/api-load-test.js
```

---

## 六、上线检查清单

### 6.1 上线前检查

**代码质量**:
- [ ] 所有代码已通过 Code Review
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 警告
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过

**功能验收**:
- [ ] 分镜模板: 创建/应用/搜索/点赞功能正常
- [ ] 批量生成: 批量生成/变体生成/进度显示正常
- [ ] 版本控制: 创建/恢复/对比版本正常
- [ ] 标签搜索: 标签管理/搜索/筛选正常

**性能验收**:
- [ ] API 响应时间 P95 < 500ms
- [ ] 页面加载时间 < 3s
- [ ] 无内存泄漏
- [ ] 数据库查询已优化

**安全检查**:
- [ ] 所有 API 有权限控制
- [ ] 输入已验证
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] CSRF Token (如需要)

**数据库**:
- [ ] 数据库已备份
- [ ] 迁移脚本已测试
- [ ] 回滚脚本已准备
- [ ] 索引已创建

**监控与日志**:
- [ ] Sentry 已配置
- [ ] 关键 API 有日志记录
- [ ] 告警规则已配置
- [ ] 监控面板已创建

### 6.2 上线流程

**Step 1: 数据库备份**
```bash
# 备份生产数据库
pg_dump manga_maker_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh backup_*.sql
```

**Step 2: 执行数据库迁移**
```bash
# 在 staging 环境测试迁移
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# 验证迁移成功
DATABASE_URL=$STAGING_DATABASE_URL npx prisma db pull

# 生产环境迁移
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate deploy
```

**Step 3: 部署新代码**
```bash
# 部署到 Vercel
git push origin main

# 等待部署完成
vercel --prod
```

**Step 4: 插入官方模板数据**
```bash
# 执行种子脚本
npx prisma db seed
```

**Step 5: 烟雾测试**
```bash
# 运行烟雾测试
npm run test:e2e:smoke
```

**Step 6: 监控观察**
- 观察错误率 (目标: < 0.1%)
- 观察响应时间 (目标: P95 < 500ms)
- 观察用户反馈

**Step 7: 逐步放量**
```
10% 流量 → 观察1小时 → 无问题
50% 流量 → 观察1小时 → 无问题
100% 流量 → 观察24小时
```

### 6.3 回滚计划

**触发条件**:
- 错误率 > 5%
- 响应时间 P95 > 2s
- 严重功能故障
- 数据丢失

**回滚步骤**:
```bash
# 1. 回滚代码
git revert HEAD
git push origin main

# 2. 回滚数据库 (如需要)
psql manga_maker_production < backup_YYYYMMDD_HHMMSS.sql

# 3. 验证回滚成功
curl https://api.manga-maker.com/health

# 4. 通知团队
echo "回滚完成,请检查系统状态" | slack-notify
```

---

## 七、风险管理

### 7.1 已识别风险

| 风险 | 概率 | 影响 | 缓解措施 | 负责人 |
|------|------|------|---------|--------|
| 数据库迁移失败 | 低 | 高 | 完善的备份和回滚方案 | DevOps |
| AI 生成速度过慢 | 中 | 中 | 批量生成显示预估时间,可取消 | Backend 2 |
| 版本数据存储过大 | 中 | 中 | 增量存储 + 定期清理旧版本 | Backend 2 |
| 搜索性能问题 | 低 | 中 | 全文索引 + 缓存 | Backend 1 |
| 用户学习成本高 | 中 | 中 | 引导教程 + 工具提示 | Frontend 1/2 |
| 第三方 API 不稳定 | 中 | 高 | 重试机制 + 降级方案 | Backend 2 |

### 7.2 依赖关系

**外部依赖**:
- PostgreSQL 数据库 (关键)
- MinIO 对象存储 (关键)
- LLM API (关键)
- Vercel 部署平台 (关键)

**应对措施**:
- 数据库: 定期备份 + 主从复制
- MinIO: S3 兼容,可切换到 AWS S3
- LLM API: 配置多个备用提供商
- Vercel: 准备 Docker 镜像,可迁移到其他平台

### 7.3 技术债务跟踪

| 债务项 | 影响 | 计划解决时间 |
|-------|------|------------|
| TypeScript strict mode 关闭 | 类型安全 | Sprint 1 |
| 缺少全局错误边界 | 用户体验 | Sprint 5 |
| API 未版本化 | 向后兼容 | 第二阶段 |
| 缺少 Redis 缓存 | 性能 | 第二阶段 |

---

## 八、附录

### 8.1 Git 工作流

**分支策略**:
```
main          - 生产分支 (受保护)
  ├─ develop  - 开发分支
  │   ├─ feature/template-crud
  │   ├─ feature/batch-generation
  │   ├─ feature/version-control
  │   └─ feature/search
  └─ hotfix/critical-bug  - 紧急修复
```

**提交规范**:
```
feat: 新增模板创建功能
fix: 修复批量生成进度不更新的问题
refactor: 重构版本对比逻辑
test: 添加搜索功能单元测试
docs: 更新 API 文档
style: 格式化代码
chore: 更新依赖包
```

**Pull Request 模板**:
```markdown
## 功能描述
简要描述本次 PR 的功能

## 变更内容
- 新增 xxx 功能
- 修复 xxx 问题
- 优化 xxx 性能

## 测试
- [ ] 单元测试已通过
- [ ] 集成测试已通过
- [ ] 手动测试已完成

## 检查清单
- [ ] 代码已格式化
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告
- [ ] 已添加必要的测试
- [ ] 已更新相关文档

## 截图 (如有)
...
```

### 8.2 开发环境配置

**必需工具**:
- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Docker (可选,用于本地 MinIO)

**环境变量** (`.env.local`):
```bash
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/manga_maker_dev

# 认证
AUTH_SECRET=your_dev_secret

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=manga-assets-dev

# LLM (开发环境使用测试 key)
OPENAI_API_KEY=sk-test-...
```

**启动本地环境**:
```bash
# 1. 启动数据库 (Docker)
docker-compose up -d postgres

# 2. 执行数据库迁移
npx prisma migrate dev

# 3. 启动 MinIO (Docker)
docker-compose up -d minio

# 4. 启动开发服务器
pnpm dev
```

### 8.3 常用命令

```bash
# 开发
pnpm dev                  # 启动开发服务器
pnpm build                # 构建生产版本
pnpm start                # 启动生产服务器

# 数据库
npx prisma studio         # 打开数据库 GUI
npx prisma migrate dev    # 创建并执行迁移
npx prisma migrate deploy # 执行迁移 (生产)
npx prisma db seed        # 执行种子脚本

# 测试
pnpm test                 # 运行单元测试
pnpm test:watch           # 监听模式
pnpm test:e2e             # 运行端到端测试
pnpm test:coverage        # 测试覆盖率

# 代码质量
pnpm lint                 # 运行 ESLint
pnpm lint:fix             # 修复 ESLint 错误
pnpm type-check           # TypeScript 类型检查
```

---

**文档结束**

所有文档已创建完成:
1. ✅ `docs/PHASE1_PRD.md` - 产品需求文档
2. ✅ `docs/PHASE1_ARCHITECTURE.md` - 技术架构设计
3. ✅ `docs/PHASE1_IMPLEMENTATION.md` - 开发实施计划

团队可以开始按计划执行开发任务!
