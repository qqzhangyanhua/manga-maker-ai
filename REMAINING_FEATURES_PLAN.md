# 📋 剩余功能实施计划

## 🔍 发现的"开发中"功能

通过代码扫描，发现以下待完成的功能：

| # | 功能名称 | 位置 | 状态 | 优先级 |
|---|---------|------|------|--------|
| 1 | **AI 生成大纲** | OutlineEditor | 🟡 开发中 | ⭐⭐⭐⭐⭐ |
| 2 | **保存大纲到后端** | page.tsx | 🟡 TODO | ⭐⭐⭐⭐⭐ |
| 3 | **项目设置页面** | ProjectSettings | 🟡 开发中 | ⭐⭐⭐ |

---

## 🎯 实施计划（预计 3-4 小时）

### Phase 1: AI 生成大纲 ⭐⭐⭐⭐⭐（1.5 小时）

**功能描述**:
- 根据项目描述、世界观、角色自动生成章节大纲
- 用户输入期望章节数
- AI 生成每章的标题、大纲、关键事件
- 支持重新生成和编辑

**技术实现**:

#### 后端 API
```python
POST /projects/{id}/generate-outline

请求：
{
    "chapter_count": 20,  // 期望章节数
    "style": "悬疑"       // 可选：风格偏好
}

响应：
{
    "chapters": [
        {
            "chapter_number": 1,
            "title": "第一章标题",
            "outline": "章节大纲",
            "key_events": ["事件1", "事件2"],
            "characters": ["角色A", "角色B"],
            "plot_lines": ["线索1"]
        }
    ]
}
```

**工作量**: 1.5 小时
- 后端服务：30 分钟
- 后端 API：30 分钟
- 前端集成：30 分钟

---

### Phase 2: 保存大纲到后端 ⭐⭐⭐⭐⭐（1 小时）

**功能描述**:
- 将大纲数据持久化到数据库
- 支持加载已保存的大纲
- 大纲与章节同步

**技术实现**:

#### 数据存储方案
```typescript
// 方案 1: 存储在 novel_projects.world_setting (JSONB)
{
    "locations": [...],
    "factions": [...],
    "outlines": [...]  // 新增大纲字段
}

// 方案 2: 创建独立的 outline 字段
ALTER TABLE novel_projects ADD COLUMN outlines JSONB;
```

#### API
```python
PUT /projects/{id}/outlines

请求：
{
    "outlines": [...]
}

响应：
{
    "message": "保存成功"
}

GET /projects/{id}/outlines

响应：
{
    "outlines": [...]
}
```

**工作量**: 1 小时
- 数据库扩展：10 分钟
- 后端 API：20 分钟
- 前端集成：30 分钟

---

### Phase 3: 项目设置页面 ⭐⭐⭐（1 小时）

**功能描述**:
- 编辑项目基本信息（标题、描述、类型）
- 设置目标字数
- 修改项目状态（草稿/进行中/完成）
- 删除项目

**技术实现**:

#### 前端组件
```typescript
// ProjectSettings.tsx
- 项目标题编辑
- 项目描述编辑
- 类型选择（玄幻、科幻、现代等）
- 目标字数设置
- 状态选择（draft/in_progress/completed）
- 删除项目（二次确认）
```

#### 后端 API（已存在）
```python
PATCH /projects/{id}  // 更新项目
DELETE /projects/{id}  // 删除项目
```

**工作量**: 1 小时
- 前端组件：1 小时
- 后端 API：已实现 ✅

---

## 📅 实施时间表

### 总时间：3.5 小时

```
09:00 - 10:30  Phase 1: AI 生成大纲 (1.5h)
  09:00 - 09:30  后端服务实现
  09:30 - 10:00  后端 API 实现
  10:00 - 10:30  前端集成测试

10:30 - 11:30  Phase 2: 保存大纲到后端 (1h)
  10:30 - 10:40  数据库扩展
  10:40 - 11:00  后端 API 实现
  11:00 - 11:30  前端集成测试

11:30 - 12:30  Phase 3: 项目设置页面 (1h)
  11:30 - 12:30  前端组件实现和测试
```

---

## 🎯 Phase 1 详细设计：AI 生成大纲

### 1.1 后端服务扩展

**文件**: `services/novel-backend/app/services/generation_service.py`

```python
async def generate_outline(
    self,
    premise: str,                    # 故事前提/描述
    characters: Optional[list] = None,
    world_setting: Optional[dict] = None,
    chapter_count: int = 10,
    style: Optional[str] = None
) -> dict:
    """
    生成小说大纲
    
    Returns:
        {
            "chapters": [
                {
                    "chapter_number": 1,
                    "title": "章节标题",
                    "outline": "章节大纲（100-200字）",
                    "key_events": ["关键事件1", "关键事件2"],
                    "characters": ["出场角色"],
                    "plot_lines": ["主线1", "主线2"]
                }
            ]
        }
    """
```

### 1.2 后端 API 路由

**文件**: `services/novel-backend/app/routers/projects.py`

```python
@router.post("/{project_id}/generate-outline")
async def generate_project_outline(
    project_id: UUID,
    request: dict,  # chapter_count, style
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """AI 生成项目大纲"""
    # 1. 验证项目所有权
    # 2. 获取项目信息（描述、世界观、角色）
    # 3. 调用 generation_service.generate_outline()
    # 4. 返回生成的大纲
```

### 1.3 前端集成

**文件**: `src/app/(novel)/novel/[id]/page.tsx`

```typescript
async function handleGenerateOutline() {
    try {
        const response = await fetch(
            `/api/novel/projects/${projectId}/generate-outline`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapter_count: 20,
                    style: project.genre
                })
            }
        );
        
        const data = await response.json();
        // 更新 OutlineEditor 的状态
        setOutlines(data.chapters);
        toast.success("大纲生成成功");
    } catch (error) {
        toast.error("生成失败");
    }
}
```

---

## 🎯 Phase 2 详细设计：保存大纲

### 2.1 数据库扩展

**选择方案 1**：使用现有 JSONB 字段（推荐）

```sql
-- 不需要修改数据库结构
-- 直接存储在 novel_projects 的 world_setting 或单独字段中
```

**选择方案 2**：新增字段（如果需要更好的查询性能）

```sql
ALTER TABLE novel_projects 
ADD COLUMN outlines JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_novel_projects_outlines 
ON novel_projects USING gin(outlines);
```

### 2.2 后端 API

**文件**: `services/novel-backend/app/routers/projects.py`

```python
@router.put("/{project_id}/outlines")
async def save_outlines(...):
    """保存项目大纲"""
    
@router.get("/{project_id}/outlines")
async def get_outlines(...):
    """获取项目大纲"""
```

### 2.3 前端集成

**文件**: `src/app/(novel)/novel/[id]/page.tsx`

```typescript
// 加载大纲
useEffect(() => {
    async function fetchOutlines() {
        const response = await fetch(`/api/novel/projects/${projectId}/outlines`);
        const data = await response.json();
        setOutlines(data.outlines);
    }
    fetchOutlines();
}, [projectId]);

// 保存大纲
async function handleSaveOutlines(outlines: ChapterOutline[]) {
    const response = await fetch(
        `/api/novel/projects/${projectId}/outlines`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ outlines })
        }
    );
}
```

---

## 🎯 Phase 3 详细设计：项目设置

### 3.1 前端组件实现

**文件**: `src/app/(novel)/novel/[id]/components/ProjectSettings.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";

interface ProjectSettingsProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    genre: string | null;
    target_words: number | null;
    status: string;
  };
  onUpdate: (project: any) => void;
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [genre, setGenre] = useState(project.genre || "");
  const [targetWords, setTargetWords] = useState(project.target_words || 100000);
  const [status, setStatus] = useState(project.status);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/novel/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          genre,
          target_words: targetWords,
          status
        })
      });
      
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        toast.success("保存成功");
      }
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("确定要删除这个项目吗？删除后无法恢复！")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/novel/projects/${project.id}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        toast.success("项目已删除");
        router.push("/novel");
      }
    } catch (error) {
      toast.error("删除失败");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>项目标题</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <Label>项目描述</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>类型</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="玄幻">玄幻</SelectItem>
              <SelectItem value="科幻">科幻</SelectItem>
              <SelectItem value="现代">现代</SelectItem>
              <SelectItem value="历史">历史</SelectItem>
              <SelectItem value="悬疑">悬疑</SelectItem>
              <SelectItem value="言情">言情</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>目标字数</Label>
          <Input 
            type="number" 
            value={targetWords} 
            onChange={(e) => setTargetWords(Number(e.target.value))} 
          />
        </div>
      </div>

      <div>
        <Label>状态</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between">
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          删除项目
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
```

---

## ✅ 验收标准

### Phase 1: AI 生成大纲
- [ ] 能够输入章节数和风格
- [ ] AI 能生成合理的章节结构
- [ ] 生成的大纲包含标题、大纲、关键事件
- [ ] 可以手动编辑生成的大纲

### Phase 2: 保存大纲
- [ ] 大纲能保存到数据库
- [ ] 刷新页面后大纲仍然存在
- [ ] 保存的大纲能加载回编辑器

### Phase 3: 项目设置
- [ ] 能修改项目标题和描述
- [ ] 能选择类型和设置目标字数
- [ ] 能修改项目状态
- [ ] 删除项目需要二次确认

---

## 📊 完成后效果

### 实施前（95%）
- ✅ 核心写作功能
- ✅ 导出、搜索、修订
- ⚠️ 大纲管理（手动编辑）
- ⚠️ 项目设置（占位符）

### 实施后（98%）
- ✅ 核心写作功能
- ✅ 导出、搜索、修订
- ✅ **大纲管理（AI 生成 + 保存）** ⬆️
- ✅ **项目设置（完整功能）** ⬆️

**完成度**: 95% → **98%** 🚀

---

## 💡 实施建议

### 优先级排序
1. ⭐⭐⭐⭐⭐ Phase 2（保存大纲）- 最基础，先完成
2. ⭐⭐⭐⭐⭐ Phase 1（AI 生成大纲）- 核心功能
3. ⭐⭐⭐ Phase 3（项目设置）- 辅助功能

### 建议顺序
```
Phase 2 → Phase 1 → Phase 3
```

**理由**: 先实现保存功能，这样 AI 生成的大纲才能持久化，最后补充项目设置。

---

## 🎯 下一步行动

**请选择实施方案**:

### 方案 A: 全部实现（推荐）⭐⭐⭐⭐⭐
- 时间：3.5 小时
- 完成度：95% → 98%
- 用户价值：极高

### 方案 B: 仅核心功能
- 时间：2.5 小时  
- 完成度：95% → 97%
- 包含：Phase 1 + Phase 2

### 方案 C: 保持现状
- 时间：0 小时
- 完成度：95%
- 手动管理大纲

---

**建议**: 实施**方案 A**，3.5 小时完成所有功能，达到 98% 完成度！🚀
