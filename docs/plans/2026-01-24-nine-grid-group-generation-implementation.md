# 九宫格分组生成与角色参考图选择功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现镜头按9个一组分组展示,每组提供快速生成按钮,并在生成对话框中增加角色参考图选择功能,确保生成图片的角色一致性。

**Architecture:** 
- 前端采用组件拆分策略,将分组逻辑、角色检测、参考图选择器独立为可复用组件
- 使用 React Query 管理服务端状态,实现数据缓存与自动更新
- 后端扩展现有 API,增加章节角色查询和项目参考图查询端点

**Tech Stack:** 
- Next.js 14 App Router + TypeScript
- React Query (TanStack Query) + Zustand (状态管理)
- shadcn/ui + TailwindCSS + lucide-react
- Prisma ORM + PostgreSQL

---

## Task 1: 创建分组工具函数与类型定义

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/utils/shot-grouping.ts`
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/types.ts`
- Test: `src/app/(novel)/novel/components/InfiniteCanvas/utils/shot-grouping.test.ts`

**Step 1: 定义分组数据类型**

在 `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/types.ts` 中添加:

```typescript
import type { ShotDesign } from "@prisma/client";

export interface ShotGroup {
  groupIndex: number;           // 组索引：0, 1, 2, 3
  startOrder: number;           // 起始镜头序号：1, 10, 19, 28
  endOrder: number;             // 结束镜头序号：9, 18, 27, 30
  shots: ShotDesign[];          // 该组的镜头数组
  isComplete: boolean;          // 是否有完整的9个镜头
  placeholderCount: number;     // 占位符数量
}
```

**Step 2: 实现分组计算函数**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/utils/shot-grouping.ts`:

```typescript
import type { ShotDesign } from "@prisma/client";
import type { ShotGroup } from "../DetailPanel/types";

/**
 * 将镜头数组按每9个一组进行分组
 * @param shots 镜头数组（需按 shot_order 排序）
 * @returns 分组后的数组
 */
export function groupShotsIntoNineGrids(shots: ShotDesign[]): ShotGroup[] {
  if (!shots || shots.length === 0) {
    return [];
  }

  const groups: ShotGroup[] = [];
  const totalGroups = Math.ceil(shots.length / 9);

  for (let i = 0; i < totalGroups; i++) {
    const startIndex = i * 9;
    const endIndex = Math.min(startIndex + 9, shots.length);
    const groupShots = shots.slice(startIndex, endIndex);
    const placeholderCount = 9 - groupShots.length;

    groups.push({
      groupIndex: i,
      startOrder: groupShots[0]?.shot_order || (i * 9 + 1),
      endOrder: groupShots[groupShots.length - 1]?.shot_order || (i * 9 + 9),
      shots: groupShots,
      isComplete: groupShots.length === 9,
      placeholderCount,
    });
  }

  return groups;
}

/**
 * 生成占位符数组
 * @param count 占位符数量
 * @param startOrder 起始序号
 * @returns 占位符数组（用于渲染）
 */
export function generatePlaceholders(count: number, startOrder: number): number[] {
  return Array.from({ length: count }, (_, i) => startOrder + i);
}
```

**Step 3: 编写单元测试**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/utils/shot-grouping.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { groupShotsIntoNineGrids, generatePlaceholders } from "./shot-grouping";
import type { ShotDesign } from "@prisma/client";

describe("shot-grouping", () => {
  describe("groupShotsIntoNineGrids", () => {
    it("应该正确分组完整的9个镜头", () => {
      const shots = Array.from({ length: 9 }, (_, i) => ({
        id: `shot-${i + 1}`,
        shot_order: i + 1,
      })) as ShotDesign[];

      const groups = groupShotsIntoNineGrids(shots);

      expect(groups).toHaveLength(1);
      expect(groups[0].isComplete).toBe(true);
      expect(groups[0].placeholderCount).toBe(0);
      expect(groups[0].startOrder).toBe(1);
      expect(groups[0].endOrder).toBe(9);
    });

    it("应该正确处理30个镜头（4组）", () => {
      const shots = Array.from({ length: 30 }, (_, i) => ({
        id: `shot-${i + 1}`,
        shot_order: i + 1,
      })) as ShotDesign[];

      const groups = groupShotsIntoNineGrids(shots);

      expect(groups).toHaveLength(4);
      expect(groups[0].shots).toHaveLength(9);
      expect(groups[3].shots).toHaveLength(3);
      expect(groups[3].placeholderCount).toBe(6);
      expect(groups[3].isComplete).toBe(false);
    });

    it("应该处理空数组", () => {
      const groups = groupShotsIntoNineGrids([]);
      expect(groups).toHaveLength(0);
    });
  });

  describe("generatePlaceholders", () => {
    it("应该生成正确的占位符序号", () => {
      const placeholders = generatePlaceholders(3, 28);
      expect(placeholders).toEqual([28, 29, 30]);
    });
  });
});
```

**Step 4: 运行测试验证**

Run: `npm test shot-grouping.test.ts`

Expected: 所有测试通过

**Step 5: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/utils/shot-grouping.ts \
  src/app/\(novel\)/novel/components/InfiniteCanvas/DetailPanel/types.ts \
  src/app/\(novel\)/novel/components/InfiniteCanvas/utils/shot-grouping.test.ts
git commit -m "feat: 添加镜头分组工具函数与类型定义"
```

---

## Task 2: 创建 ShotGroupSection 组件

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx`

**Step 1: 创建组件文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, AlertCircle } from "lucide-react";
import type { ShotGroup } from "./types";
import type { ShotDesign } from "@prisma/client";
import { generatePlaceholders } from "../utils/shot-grouping";

interface ShotGroupSectionProps {
  group: ShotGroup;
  onGenerate: (group: ShotGroup) => void;
  onShotClick?: (shot: ShotDesign) => void;
}

export function ShotGroupSection({
  group,
  onGenerate,
  onShotClick,
}: ShotGroupSectionProps) {
  const { groupIndex, startOrder, endOrder, shots, isComplete, placeholderCount } = group;

  return (
    <div className="space-y-4">
      {/* 分组标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">
            第 {groupIndex + 1} 组
          </h3>
          <Badge variant="outline" className="text-xs">
            镜头 {startOrder}-{endOrder}
          </Badge>
          {!isComplete && (
            <Badge variant="secondary" className="text-xs">
              不足9个 (缺{placeholderCount}个)
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          disabled={!isComplete}
          onClick={() => onGenerate(group)}
          className="gap-2"
        >
          <Grid3x3 className="h-4 w-4" />
          生成九宫格
        </Button>
      </div>

      {/* 镜头网格 */}
      <div className="grid grid-cols-3 gap-3">
        {shots.map((shot) => (
          <Card
            key={shot.id}
            className="relative aspect-square cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
            onClick={() => onShotClick?.(shot)}
          >
            {shot.generated_image_url ? (
              <img
                src={shot.generated_image_url}
                alt={`镜头 ${shot.shot_order}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
                <span className="text-xs">镜头 {shot.shot_order}</span>
                <span className="text-[10px] mt-1">未生成</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
              #{shot.shot_order}
            </div>
          </Card>
        ))}

        {/* 占位符 */}
        {placeholderCount > 0 &&
          generatePlaceholders(placeholderCount, shots.length + startOrder).map(
            (order) => (
              <Card
                key={`placeholder-${order}`}
                className="relative aspect-square overflow-hidden border-dashed"
              >
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
                  <span className="text-xs">镜头 {order}</span>
                  <span className="text-[10px] mt-1">待创建</span>
                </div>
              </Card>
            )
          )}
      </div>

      {/* 不完整分组提示 */}
      {!isComplete && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            该组镜头不足9个,无法生成九宫格。请先创建更多镜头或等待其他分组完成。
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/DetailPanel/ShotGroupSection.tsx
git commit -m "feat: 创建 ShotGroupSection 组件"
```

---

## Task 3: 改造 ShotDetailPanel 为分组展示模式

**Files:**
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx`

**Step 1: 备份原文件**

Run: `cp src/app/\(novel\)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx src/app/\(novel\)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx.backup`

**Step 2: 读取当前文件**

Run: 使用 Read 工具读取 `ShotDetailPanel.tsx` 文件

**Step 3: 移除九宫格选择模式,替换为分组展示**

修改 `src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx`:

```typescript
// 在文件顶部添加导入
import { groupShotsIntoNineGrids } from "../utils/shot-grouping";
import { ShotGroupSection } from "./ShotGroupSection";
import type { ShotGroup } from "./types";

// 在组件内部,找到原有的九宫格选择逻辑并移除
// 删除以下状态（如果存在）:
// const [selectedShots, setSelectedShots] = useState<string[]>([]);
// const [isNineGridMode, setIsNineGridMode] = useState(false);

// 添加新的状态
const [shotGroups, setShotGroups] = useState<ShotGroup[]>([]);

// 在 useEffect 中计算分组（当 shots 数据变化时）
useEffect(() => {
  if (shots && shots.length > 0) {
    const sortedShots = [...shots].sort((a, b) => a.shot_order - b.shot_order);
    const groups = groupShotsIntoNineGrids(sortedShots);
    setShotGroups(groups);
  } else {
    setShotGroups([]);
  }
}, [shots]);

// 添加分组生成处理函数
const handleGenerateGroup = (group: ShotGroup) => {
  const shotIds = group.shots.map((shot) => shot.id);
  setSelectedShotIds(shotIds);
  setShowNineGridDialog(true);
};

// 在渲染部分,替换原有的镜头列表为分组展示
// 找到类似这样的代码并替换:
// <div className="grid grid-cols-3 gap-2">
//   {shots.map((shot) => ...)}
// </div>

// 替换为:
<div className="space-y-6">
  {shotGroups.length === 0 ? (
    <div className="text-center text-muted-foreground py-8">
      暂无镜头数据
    </div>
  ) : (
    shotGroups.map((group) => (
      <ShotGroupSection
        key={group.groupIndex}
        group={group}
        onGenerate={handleGenerateGroup}
        onShotClick={(shot) => {
          // 保留原有的单个镜头点击逻辑
          setSelectedShotId(shot.id);
        }}
      />
    ))
  )}
</div>

// 保留"重新生成全部"按钮（如果存在）
```

**Step 4: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 5: 运行 linter**

Run: `npm run lint`

Expected: 无 lint 错误

**Step 6: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx
git commit -m "refactor: 改造 ShotDetailPanel 为分组展示模式"
```

---

## Task 4: 创建角色参考图类型定义

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/types.ts`

**Step 1: 创建类型定义文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/types.ts`:

```typescript
/**
 * 参考图片来源类型
 */
export type ReferenceImageSource = 
  | "character_avatar"  // 角色头像
  | "shot_image"        // 镜头图片
  | "scene"             // 场景库
  | "final";            // 最终分镜

/**
 * 参考图片元数据
 */
export interface ReferenceImage {
  id: string;
  url: string;
  source: ReferenceImageSource;
  sourceId?: string;           // 来源记录的ID
  thumbnail?: string;          // 缩略图URL
  metadata?: {
    chapterNumber?: number;    // 如果是镜头图片,来自第几章
    shotOrder?: number;        // 镜头序号
    sceneName?: string;        // 场景名称
    description?: string;      // 描述
  };
}

/**
 * 角色参考图配置
 */
export interface CharacterReference {
  id: string;
  name: string;
  role?: string;               // 角色定位（主角/配角/反派等）
  avatar_url?: string;         // 默认头像
  selectedReferenceImages: ReferenceImage[];  // 用户选择的参考图
}

/**
 * 九宫格生成请求（扩展）
 */
export interface NineGridGenerateRequest {
  shotIds: string[];
  comicStyleId: string;
  plotSummary?: string;
  // [新增] 角色参考图
  characterReferences?: {
    characterId: string;
    referenceImageUrls: string[];
  }[];
}

/**
 * 项目参考图响应
 */
export interface ProjectReferenceImagesResponse {
  shots: {
    id: string;
    url: string;
    chapterNumber: number;
    shotOrder: number;
    description?: string;
  }[];
  scenes: {
    id: string;
    url: string;
    name: string;
  }[];
  finals: {
    id: string;
    url: string;
    chapterNumber?: number;
    description?: string;
  }[];
}

/**
 * 章节角色响应
 */
export interface ChapterCharactersResponse {
  characters: {
    id: string;
    name: string;
    role?: string;
    avatar_url?: string;
    reference_image_url?: string;
  }[];
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/types.ts
git commit -m "feat: 添加角色参考图类型定义"
```

---

## Task 5: 创建章节角色查询 API

**Files:**
- Create: `src/app/api/canvas/chapter/[chapterId]/characters/route.ts`

**Step 1: 创建 API 路由文件**

创建 `src/app/api/canvas/chapter/[chapterId]/characters/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { chapterId: string } }
) {
  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { chapterId } = params;

    // 2. 查询章节信息
    const chapter = await prisma.novelChapter.findUnique({
      where: { id: chapterId },
      include: {
        novel_project: true,
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 3. 权限检查
    if (chapter.novel_project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 查询项目关联的所有角色
    // 注意: 目前数据库中没有章节-角色关联表,所以返回项目级别的角色
    const characters = await prisma.novelCharacter.findMany({
      where: {
        novel_project_id: chapter.novel_project_id,
      },
      select: {
        id: true,
        name: true,
        role: true,
        avatar_url: true,
        reference_image_url: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });

    return NextResponse.json({
      characters: characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.role || undefined,
        avatar_url: char.avatar_url || undefined,
        reference_image_url: char.reference_image_url || undefined,
      })),
    });
  } catch (error) {
    console.error("获取章节角色失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 测试 API（手动测试）**

Run: `npm run dev`

然后使用浏览器或 curl 测试:
```bash
curl -X GET http://localhost:3000/api/canvas/chapter/[实际的chapterId]/characters \
  -H "Cookie: comicai_session=[实际的token]"
```

Expected: 返回角色列表 JSON

**Step 4: 提交代码**

```bash
git add src/app/api/canvas/chapter/\[chapterId\]/characters/route.ts
git commit -m "feat: 添加章节角色查询 API"
```

---

## Task 6: 创建项目参考图查询 API

**Files:**
- Create: `src/app/api/canvas/project/[projectId]/reference-images/route.ts`

**Step 1: 创建 API 路由文件**

创建 `src/app/api/canvas/project/[projectId]/reference-images/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { projectId } = params;
    const { searchParams } = new URL(req.url);
    const types = searchParams.get("types")?.split(",") || ["shot", "scene", "final"];
    const characterId = searchParams.get("characterId");

    // 2. 查询项目信息
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 3. 权限检查
    if (project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 查询各类参考图
    const result: {
      shots: unknown[];
      scenes: unknown[];
      finals: unknown[];
    } = {
      shots: [],
      scenes: [],
      finals: [],
    };

    // 查询镜头图片
    if (types.includes("shot")) {
      const shots = await prisma.shotDesign.findMany({
        where: {
          chapter: {
            novel_project_id: projectId,
          },
          generated_image_url: {
            not: null,
          },
        },
        select: {
          id: true,
          generated_image_url: true,
          shot_order: true,
          description: true,
          chapter: {
            select: {
              chapter_number: true,
            },
          },
        },
        orderBy: [
          { chapter: { chapter_number: "asc" } },
          { shot_order: "asc" },
        ],
      });

      result.shots = shots.map((shot) => ({
        id: shot.id,
        url: shot.generated_image_url,
        chapterNumber: shot.chapter.chapter_number,
        shotOrder: shot.shot_order,
        description: shot.description || undefined,
      }));
    }

    // 查询场景图片
    if (types.includes("scene")) {
      const scenes = await prisma.novelScene.findMany({
        where: {
          novel_project_id: projectId,
          image_url: {
            not: null,
          },
        },
        select: {
          id: true,
          name: true,
          image_url: true,
        },
        orderBy: {
          created_at: "asc",
        },
      });

      result.scenes = scenes.map((scene) => ({
        id: scene.id,
        url: scene.image_url,
        name: scene.name,
      }));
    }

    // TODO: 查询 Final 图片（需要确认 Final 节点的数据结构）
    // if (types.includes("final")) {
    //   result.finals = [];
    // }

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取项目参考图失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 测试 API**

Run: `npm run dev`

测试:
```bash
curl -X GET "http://localhost:3000/api/canvas/project/[projectId]/reference-images?types=shot,scene" \
  -H "Cookie: comicai_session=[token]"
```

Expected: 返回参考图列表 JSON

**Step 4: 提交代码**

```bash
git add src/app/api/canvas/project/\[projectId\]/reference-images/route.ts
git commit -m "feat: 添加项目参考图查询 API"
```

---

## Task 7: 创建 useChapterCharacters Hook

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts`

**Step 1: 创建 Hook 文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import type { ChapterCharactersResponse } from "../types";

export function useChapterCharacters(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      if (!chapterId) {
        throw new Error("章节ID不能为空");
      }

      const response = await fetch(`/api/canvas/chapter/${chapterId}/characters`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "获取角色失败");
      }

      return response.json() as Promise<ChapterCharactersResponse>;
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts
git commit -m "feat: 添加 useChapterCharacters Hook"
```

---

## Task 8: 创建 useProjectReferenceImages Hook

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useProjectReferenceImages.ts`

**Step 1: 创建 Hook 文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useProjectReferenceImages.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import type { ProjectReferenceImagesResponse, ReferenceImageSource } from "../types";

interface UseProjectReferenceImagesOptions {
  projectId: string | undefined;
  types?: ReferenceImageSource[];
  characterId?: string;
}

export function useProjectReferenceImages({
  projectId,
  types = ["shot_image", "scene", "final"],
  characterId,
}: UseProjectReferenceImagesOptions) {
  return useQuery({
    queryKey: ["project-reference-images", projectId, types, characterId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("项目ID不能为空");
      }

      const params = new URLSearchParams();
      
      // 转换类型格式: shot_image -> shot
      const apiTypes = types.map((type) => {
        if (type === "shot_image") return "shot";
        return type;
      });
      params.append("types", apiTypes.join(","));

      if (characterId) {
        params.append("characterId", characterId);
      }

      const response = await fetch(
        `/api/canvas/project/${projectId}/reference-images?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "获取参考图失败");
      }

      return response.json() as Promise<ProjectReferenceImagesResponse>;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/hooks/useProjectReferenceImages.ts
git commit -m "feat: 添加 useProjectReferenceImages Hook"
```

---

## Task 9: 创建 CharacterReferenceCard 组件

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceCard.tsx`

**Step 1: 创建组件文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceCard.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, X } from "lucide-react";
import type { CharacterReference, ReferenceImage } from "./types";

interface CharacterReferenceCardProps {
  character: CharacterReference;
  selectedImages: ReferenceImage[];
  onSelectImages: () => void;
  onRemoveImage: (imageId: string) => void;
  maxImages?: number;
}

export function CharacterReferenceCard({
  character,
  selectedImages,
  onSelectImages,
  onRemoveImage,
  maxImages = 5,
}: CharacterReferenceCardProps) {
  const canAddMore = selectedImages.length < maxImages;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={character.avatar_url} alt={character.name} />
            <AvatarFallback>{character.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-medium">{character.name}</h4>
            {character.role && (
              <Badge variant="secondary" className="text-xs mt-1">
                {character.role}
              </Badge>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onSelectImages}
          disabled={!canAddMore}
          className="gap-2"
        >
          <ImagePlus className="h-4 w-4" />
          选择参考图
        </Button>
      </div>

      {/* 已选参考图 */}
      {selectedImages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            已选参考图 ({selectedImages.length}/{maxImages})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedImages.map((image) => (
              <div
                key={image.id}
                className="relative flex-shrink-0 group"
              >
                <img
                  src={image.thumbnail || image.url}
                  alt="参考图"
                  className="h-16 w-16 rounded object-cover border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveImage(image.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          未选择参考图（可选）
        </p>
      )}
    </Card>
  );
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceCard.tsx
git commit -m "feat: 创建 CharacterReferenceCard 组件"
```

---

## Task 10: 创建 ReferenceImagePicker 组件

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/ReferenceImagePicker.tsx`

**Step 1: 创建组件文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/ReferenceImagePicker.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useProjectReferenceImages } from "./hooks/useProjectReferenceImages";
import type { ReferenceImage, ReferenceImageSource } from "./types";

interface ReferenceImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  characterId: string;
  characterName: string;
  selectedImages: ReferenceImage[];
  onConfirm: (images: ReferenceImage[]) => void;
  maxImages?: number;
}

export function ReferenceImagePicker({
  open,
  onOpenChange,
  projectId,
  characterId,
  characterName,
  selectedImages,
  onConfirm,
  maxImages = 5,
}: ReferenceImagePickerProps) {
  const [localSelected, setLocalSelected] = useState<ReferenceImage[]>(selectedImages);
  const [activeTab, setActiveTab] = useState<ReferenceImageSource>("character_avatar");

  const { data, isLoading } = useProjectReferenceImages({
    projectId,
    types: ["shot_image", "scene", "final"],
  });

  const toggleImage = (image: ReferenceImage) => {
    setLocalSelected((prev) => {
      const exists = prev.find((img) => img.id === image.id);
      if (exists) {
        return prev.filter((img) => img.id !== image.id);
      }
      if (prev.length >= maxImages) {
        return prev;
      }
      return [...prev, image];
    });
  };

  const isSelected = (imageId: string) => {
    return localSelected.some((img) => img.id === imageId);
  };

  const handleConfirm = () => {
    onConfirm(localSelected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>选择参考图 - {characterName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReferenceImageSource)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="character_avatar">角色头像</TabsTrigger>
            <TabsTrigger value="shot_image">镜头图片</TabsTrigger>
            <TabsTrigger value="scene">场景库</TabsTrigger>
            <TabsTrigger value="final">最终分镜</TabsTrigger>
          </TabsList>

          {/* 角色头像标签页 */}
          <TabsContent value="character_avatar">
            <ScrollArea className="h-[400px]">
              <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>角色头像功能开发中...</p>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 镜头图片标签页 */}
          <TabsContent value="shot_image">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data?.shots && data.shots.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 p-4">
                  {data.shots.map((shot) => {
                    const image: ReferenceImage = {
                      id: shot.id,
                      url: shot.url,
                      source: "shot_image",
                      sourceId: shot.id,
                      metadata: {
                        chapterNumber: shot.chapterNumber,
                        shotOrder: shot.shotOrder,
                        description: shot.description,
                      },
                    };

                    return (
                      <div
                        key={shot.id}
                        className="relative group cursor-pointer"
                        onClick={() => toggleImage(image)}
                      >
                        <div
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected(shot.id)
                              ? "border-primary ring-2 ring-primary"
                              : "border-transparent hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={shot.url}
                            alt={`第${shot.chapterNumber}章 镜头${shot.shotOrder}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Checkbox checked={isSelected(shot.id)} />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                            第{shot.chapterNumber}章 #{shot.shotOrder}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无镜头图片</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 场景库标签页 */}
          <TabsContent value="scene">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data?.scenes && data.scenes.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 p-4">
                  {data.scenes.map((scene) => {
                    const image: ReferenceImage = {
                      id: scene.id,
                      url: scene.url,
                      source: "scene",
                      sourceId: scene.id,
                      metadata: {
                        sceneName: scene.name,
                      },
                    };

                    return (
                      <div
                        key={scene.id}
                        className="relative group cursor-pointer"
                        onClick={() => toggleImage(image)}
                      >
                        <div
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected(scene.id)
                              ? "border-primary ring-2 ring-primary"
                              : "border-transparent hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={scene.url}
                            alt={scene.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Checkbox checked={isSelected(scene.id)} />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                            {scene.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无场景图片</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 最终分镜标签页 */}
          <TabsContent value="final">
            <ScrollArea className="h-[400px]">
              <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>最终分镜功能开发中...</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <p className="text-xs text-muted-foreground mr-auto">
            已选 {localSelected.length}/{maxImages} 张
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确定 ({localSelected.length}张)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/ReferenceImagePicker.tsx
git commit -m "feat: 创建 ReferenceImagePicker 组件"
```

---

## Task 11: 创建 CharacterReferenceSection 组件

**Files:**
- Create: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx`

**Step 1: 创建组件文件**

创建 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, AlertCircle } from "lucide-react";
import { CharacterReferenceCard } from "./CharacterReferenceCard";
import { ReferenceImagePicker } from "./ReferenceImagePicker";
import { useChapterCharacters } from "./hooks/useChapterCharacters";
import type { CharacterReference, ReferenceImage } from "./types";

interface CharacterReferenceSectionProps {
  chapterId: string;
  projectId: string;
  characterReferences: CharacterReference[];
  onUpdateCharacterReferences: (references: CharacterReference[]) => void;
}

export function CharacterReferenceSection({
  chapterId,
  projectId,
  characterReferences,
  onUpdateCharacterReferences,
}: CharacterReferenceSectionProps) {
  const { data, isLoading } = useChapterCharacters(chapterId);
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    characterId: string;
    characterName: string;
  } | null>(null);

  // 初始化角色参考图状态（如果还没有）
  const initializeCharacterReferences = () => {
    if (data?.characters && characterReferences.length === 0) {
      const initialized: CharacterReference[] = data.characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.role,
        avatar_url: char.avatar_url,
        selectedReferenceImages: [],
      }));
      onUpdateCharacterReferences(initialized);
    }
  };

  // 如果数据加载完成且还没初始化,则初始化
  if (data?.characters && characterReferences.length === 0) {
    initializeCharacterReferences();
  }

  const handleSelectImages = (characterId: string, characterName: string) => {
    setPickerState({
      open: true,
      characterId,
      characterName,
    });
  };

  const handleConfirmImages = (images: ReferenceImage[]) => {
    if (!pickerState) return;

    const updated = characterReferences.map((char) => {
      if (char.id === pickerState.characterId) {
        return {
          ...char,
          selectedReferenceImages: images,
        };
      }
      return char;
    });

    onUpdateCharacterReferences(updated);
  };

  const handleRemoveImage = (characterId: string, imageId: string) => {
    const updated = characterReferences.map((char) => {
      if (char.id === characterId) {
        return {
          ...char,
          selectedReferenceImages: char.selectedReferenceImages.filter(
            (img) => img.id !== imageId
          ),
        };
      }
      return char;
    });

    onUpdateCharacterReferences(updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <p className="text-xs text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!data?.characters || data.characters.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>未检测到角色。如需添加角色参考图,请先在项目中创建角色。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">角色参考图（可选）</h3>
        <Button size="sm" variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          手动添加角色
        </Button>
      </div>

      <div className="space-y-2">
        {characterReferences.map((character) => (
          <CharacterReferenceCard
            key={character.id}
            character={character}
            selectedImages={character.selectedReferenceImages}
            onSelectImages={() => handleSelectImages(character.id, character.name)}
            onRemoveImage={(imageId) => handleRemoveImage(character.id, imageId)}
          />
        ))}
      </div>

      {/* 参考图选择器对话框 */}
      {pickerState && (
        <ReferenceImagePicker
          open={pickerState.open}
          onOpenChange={(open) => {
            if (!open) setPickerState(null);
          }}
          projectId={projectId}
          characterId={pickerState.characterId}
          characterName={pickerState.characterName}
          selectedImages={
            characterReferences.find((c) => c.id === pickerState.characterId)
              ?.selectedReferenceImages || []
          }
          onConfirm={handleConfirmImages}
        />
      )}
    </div>
  );
}
```

**Step 2: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 3: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx
git commit -m "feat: 创建 CharacterReferenceSection 组件"
```

---

## Task 12: 集成角色参考图到 GenerateNineGridDialog

**Files:**
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx`

**Step 1: 读取当前文件**

Run: 使用 Read 工具读取 `GenerateNineGridDialog.tsx` 文件

**Step 2: 添加角色参考图状态与组件**

修改 `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx`:

```typescript
// 在文件顶部添加导入
import { CharacterReferenceSection } from "./CharacterReferenceSection";
import type { CharacterReference } from "./types";

// 在组件内部添加状态
const [characterReferences, setCharacterReferences] = useState<CharacterReference[]>([]);

// 在对话框关闭时重置状态
const handleOpenChange = (open: boolean) => {
  if (!open) {
    setCharacterReferences([]);
  }
  onOpenChange(open);
};

// 在生成请求中包含角色参考图
const handleGenerate = async () => {
  try {
    setIsGenerating(true);

    const requestBody = {
      shotIds: selectedShots.map((s) => s.id),
      comicStyleId: selectedStyle,
      plotSummary: plotSummary || undefined,
      // [新增] 角色参考图
      characterReferences: characterReferences
        .filter((char) => char.selectedReferenceImages.length > 0)
        .map((char) => ({
          characterId: char.id,
          referenceImageUrls: char.selectedReferenceImages.map((img) => img.url),
        })),
    };

    const response = await fetch("/api/canvas/nine-grid/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    // ... 后续处理逻辑
  } catch (error) {
    // ... 错误处理
  } finally {
    setIsGenerating(false);
  }
};

// 在渲染部分添加角色参考图区域（在剧情概述之后）
// 找到类似这样的结构:
// <div className="space-y-4">
//   {/* 九宫格预览 */}
//   {/* 剧情概述 */}
//   {/* 漫画风格 */}
// </div>

// 在剧情概述和漫画风格之间插入:
<CharacterReferenceSection
  chapterId={chapterId} // 需要从 props 或 context 获取
  projectId={projectId} // 需要从 props 或 context 获取
  characterReferences={characterReferences}
  onUpdateCharacterReferences={setCharacterReferences}
/>
```

**Step 3: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 4: 运行 linter**

Run: `npm run lint`

Expected: 无 lint 错误

**Step 5: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx
git commit -m "feat: 集成角色参考图到九宫格生成对话框"
```

---

## Task 13: 扩展九宫格生成 API

**Files:**
- Modify: `src/app/api/canvas/nine-grid/generate/route.ts`

**Step 1: 读取当前 API 文件**

Run: 使用 Read 工具读取现有的九宫格生成 API 文件

**Step 2: 扩展请求体验证**

修改 API 文件,添加 characterReferences 参数:

```typescript
// 在请求体验证 schema 中添加
const generateSchema = z.object({
  shotIds: z.array(z.string().uuid()).min(1).max(9),
  comicStyleId: z.string(),
  plotSummary: z.string().optional(),
  // [新增] 角色参考图
  characterReferences: z
    .array(
      z.object({
        characterId: z.string().uuid(),
        referenceImageUrls: z.array(z.string().url()),
      })
    )
    .optional(),
});

// 在处理逻辑中提取参数
const { shotIds, comicStyleId, plotSummary, characterReferences } = 
  generateSchema.parse(await req.json());

// 将 characterReferences 传递给后端生成服务
// TODO: 需要确认后端生成服务的接口
// 可能需要在 prompt 构建中融入角色参考图信息
```

**Step 3: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 4: 提交代码**

```bash
git add src/app/api/canvas/nine-grid/generate/route.ts
git commit -m "feat: 扩展九宫格生成 API 支持角色参考图"
```

---

## Task 14: 添加加载状态与错误处理优化

**Files:**
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx`
- Modify: `src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/ReferenceImagePicker.tsx`

**Step 1: 添加 Skeleton 加载状态**

在 `CharacterReferenceSection.tsx` 中添加:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

// 在 isLoading 分支中使用 Skeleton
if (isLoading) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">角色参考图（可选）</h3>
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
```

**Step 2: 添加错误边界**

在 `ReferenceImagePicker.tsx` 中添加错误处理:

```typescript
const { data, isLoading, error } = useProjectReferenceImages({
  projectId,
  types: ["shot_image", "scene", "final"],
});

// 在渲染中添加错误提示
{error && (
  <div className="text-center text-destructive py-8">
    <AlertCircle className="h-12 w-12 mx-auto mb-2" />
    <p>加载失败: {error.message}</p>
  </div>
)}
```

**Step 3: 检查类型错误**

Run: `npm run type-check`

Expected: 无类型错误

**Step 4: 提交代码**

```bash
git add src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx \
  src/app/\(novel\)/novel/components/InfiniteCanvas/NineGrid/ReferenceImagePicker.tsx
git commit -m "feat: 添加加载状态与错误处理优化"
```

---

## Task 15: 端到端测试与文档更新

**Files:**
- Create: `docs/features/nine-grid-group-generation.md`

**Step 1: 手动测试完整流程**

测试步骤:
1. 启动开发服务器: `npm run dev`
2. 登录系统并进入小说项目
3. 进入 InfiniteCanvas 页面
4. 验证镜头按9个一组分组展示
5. 点击"生成九宫格"按钮
6. 验证角色列表自动加载
7. 点击"选择参考图"按钮
8. 验证参考图选择器打开并显示图片
9. 选择参考图并确认
10. 提交生成请求
11. 验证请求包含 characterReferences 参数

**Step 2: 创建功能文档**

创建 `docs/features/nine-grid-group-generation.md`:

```markdown
# 九宫格分组生成与角色参考图选择功能

## 功能概述

本功能优化了九宫格生成工作流,主要包括:

1. **自动分组展示**: 镜头按每9个一组自动分组
2. **快速生成**: 每组提供"生成九宫格"按钮,一键选中该组镜头
3. **角色参考图**: 生成时可选择角色参考图,确保角色一致性

## 使用指南

### 1. 分组展示

在镜头详情面板中,镜头会自动按9个一组分组展示:

- 第1组: 镜头1-9
- 第2组: 镜头10-18
- 第3组: 镜头19-27
- ...

每组显示:
- 组标题（第X组）
- 镜头范围（镜头X-Y）
- 完整性标记（不足9个时显示）
- "生成九宫格"按钮（不足9个时禁用）

### 2. 生成九宫格

点击"生成九宫格"按钮后:

1. 自动选中该组的9个镜头
2. 打开生成对话框
3. 显示九宫格预览
4. 显示角色参考图选择区（可选）

### 3. 选择角色参考图

在生成对话框中:

1. 系统自动检测章节关联的角色
2. 每个角色显示一个卡片
3. 点击"选择参考图"打开选择器
4. 选择器包含4个标签页:
   - 角色头像: 角色库的头像图片
   - 镜头图片: 项目中已生成的镜头图片
   - 场景库: 场景库图片
   - 最终分镜: Final 节点图片
5. 选择图片（最多5张）并确认
6. 选中的参考图显示在角色卡片下方

### 4. 提交生成

配置完成后:

1. 填写剧情概述（可选）
2. 选择漫画风格
3. 点击"开始生成"
4. 系统将角色参考图传递给 AI 生成服务

## 技术实现

### 核心组件

- `ShotGroupSection`: 单个9镜头分组
- `CharacterReferenceSection`: 角色参考图区域
- `CharacterReferenceCard`: 单个角色卡片
- `ReferenceImagePicker`: 参考图选择器

### API 端点

- `GET /api/canvas/chapter/:chapterId/characters`: 获取章节角色
- `GET /api/canvas/project/:projectId/reference-images`: 获取项目参考图
- `POST /api/canvas/nine-grid/generate`: 生成九宫格（扩展）

### 数据流

1. 用户点击"生成九宫格"
2. 系统查询章节角色列表
3. 用户选择参考图
4. 系统查询项目所有参考图
5. 用户确认选择
6. 提交生成请求（包含 characterReferences）
7. 后端调用 AI 生成服务

## 注意事项

1. 不足9个镜头的组无法生成九宫格
2. 角色参考图为可选功能
3. 每个角色最多选择5张参考图
4. 参考图会影响生成结果的角色一致性

## 后续优化方向

1. 智能推荐参考图
2. 参考图权重调节
3. 批量操作（一键设置所有角色）
4. 历史记录（保存上次配置）
```

**Step 3: 运行最终类型检查**

Run: `npm run type-check`

Expected: 无类型错误

**Step 4: 运行 linter**

Run: `npm run lint`

Expected: 无 lint 错误

**Step 5: 提交文档**

```bash
git add docs/features/nine-grid-group-generation.md
git commit -m "docs: 添加九宫格分组生成功能文档"
```

---

## 验证清单

完成所有任务后,验证以下功能:

- [ ] 镜头按9个一组正确分组
- [ ] 分组标题显示正确（第X组,镜头X-Y）
- [ ] 不足9个镜头的组显示"不足9个"标记
- [ ] 不完整组的生成按钮被禁用
- [ ] 点击生成按钮自动选中该组镜头
- [ ] 角色列表自动加载
- [ ] 无角色时显示提示信息
- [ ] 参考图选择器正常打开
- [ ] 镜头图片按章节分组显示
- [ ] 场景图片正常显示
- [ ] 图片选择（多选）功能正常
- [ ] 选中的参考图显示在角色卡片下方
- [ ] 删除参考图功能正常
- [ ] 生成请求包含 characterReferences 参数
- [ ] 加载状态显示正常（Skeleton）
- [ ] 错误提示清晰友好
- [ ] 无类型错误
- [ ] 无 lint 错误

---

## 总结

本实施计划将九宫格分组生成与角色参考图选择功能拆分为15个独立任务,每个任务包含:

1. **明确的文件路径**: 创建/修改的具体文件
2. **完整的代码**: 可直接复制的实现代码
3. **验证步骤**: 类型检查、测试、linter
4. **提交指令**: Git 提交命令

实施顺序遵循:
- 基础设施（工具函数、类型定义）
- 后端 API（数据查询）
- 前端组件（由小到大）
- 集成与优化
- 测试与文档

预计工作量: **2-3天**（前端 + 后端 + 测试）

---

**计划版本**: v1.0
**创建日期**: 2026-01-24
**执行方式**: 使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development`
