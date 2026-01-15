# 网文小说生成系统 API 文档

## 版本信息
- 版本：2.0.0
- 更新日期：2026-01-15
- 重大更新：新增网文优化提示词、渐进式大纲生成、智能分析功能

---

## 核心改进

### 1. 提示词优化
- ✅ **去 AI 味规则**：禁止排比、夸张、鸡汤化
- ✅ **黄金三章规则**：前三章特殊处理（500字引出主角、1000字金手指、章内困境）
- ✅ **6000字章节**：每章目标字数提升到 6000 字
- ✅ **爽文风格**：轻松、搞笑、轻度爽文
- ✅ **侵权规避**：自动架空化处理

### 2. 大纲数据模型扩展
新增字段：
```typescript
{
  word_count_target: 6000,         // 目标字数
  cool_points: [                   // 爽点列表
    {
      type: "能力展示" | "反转" | "打脸" | "收获" | "情感" | "揭秘",
      description: "具体描述",
      position: "章节前1/3" | "章节中段" | "章节末尾"
    }
  ],
  pacing: "快速" | "适中" | "缓慢",  // 节奏
  scene_allocation: "..."           // 场景分配建议
}
```

### 3. 渐进式大纲生成（10步工作流）
支持分步骤生成大纲：
- Step 1: 一句话概念（25词内）
- Step 2: 三幕式结构（五句话）
- Step 3: 详细章节大纲
- Step 4: 场景清单

### 4. 智能分析功能
- 爽点密度检测
- 节奏分析
- 开篇吸引力评分（黄金三章）
- 综合分析

---

## API 端点

### 1. 章节内容生成

#### `POST /chapters/generate/stream`
流式生成章节内容（已优化）

**请求体**：
```json
{
  "chapter_id": "uuid",
  "style_prompt": "可选风格提示",
  "temperature": 0.7,
  "use_rag": true
}
```

**优化点**：
- ✅ 自动检测章节号，前三章应用黄金规则
- ✅ max_tokens 提升到 8000（支持 6000 字中文）
- ✅ 使用新的网文提示词模板

**响应**：Server-Sent Events (SSE) 流

---

### 2. 渐进式大纲生成

#### `POST /progressive/concept`
Step 1: 生成一句话概念

**请求体**：
```json
{
  "project_id": "uuid",
  "premise": "故事前提描述",
  "genre": "类型（可选）"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "concept": "修仙废柴少年意外获得神器，踏上复仇之路，最终成为宗门之主。"
  }
}
```

---

#### `POST /progressive/structure`
Step 2: 生成三幕式结构

**请求体**：
```json
{
  "project_id": "uuid",
  "concept": "一句话概念",
  "premise": "故事前提",
  "genre": "类型（可选）"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "structure": {
      "act1_setup": "第一幕：介绍主角...",
      "act2_disaster1": "困境1：...",
      "act2_disaster2": "困境2：...",
      "act2_disaster3": "困境3：...",
      "act3_resolution": "第三幕：高潮对决...",
      "moral_premise": "道德主题：..."
    }
  }
}
```

---

#### `POST /progressive/detailed-outline`
Step 3: 生成详细章节大纲

**请求体**：
```json
{
  "project_id": "uuid",
  "structure": {
    "act1_setup": "...",
    ...
  },
  "premise": "故事前提",
  "characters": [...],  // 可选
  "world_setting": {...},  // 可选
  "chapter_count": 10,
  "style": "风格要求（可选）"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "chapters": [
      {
        "chapter_number": 1,
        "title": "第一章：异界重生",
        "outline": "详细大纲200-300字...",
        "key_events": ["事件1", "事件2", "事件3"],
        "characters": ["主角", "配角A"],
        "plot_lines": ["主线", "支线"],
        "is_key_chapter": true,
        "word_count_target": 6000,
        "cool_points": [
          {
            "type": "能力展示",
            "description": "主角首次展示穿越者知识",
            "position": "章节前1/3"
          },
          {
            "type": "反转",
            "description": "发现金手指的真实身份",
            "position": "章节末尾"
          }
        ],
        "pacing": "快速",
        "scene_allocation": "开篇场景(1500字) -> 冲突场景(3000字) -> 转折场景(1500字)"
      }
    ]
  }
}
```

**特性**：
- ✅ 自动保存大纲到项目
- ✅ 前三章应用黄金规则
- ✅ 每章包含爽点标注

---

#### `POST /progressive/scene-breakdown`
Step 4: 生成场景清单

**请求体**：
```json
{
  "project_id": "uuid",
  "chapters": [...]  // 章节大纲列表
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "scenes": [
      {
        "scene_number": 1,
        "chapter_number": 1,
        "title": "穿越初醒",
        "location": "陌生的石室",
        "viewpoint_character": "主角",
        "scene_type": "被动",
        "reaction": "惊讶、困惑",
        "dilemma": "如何在陌生环境生存",
        "decision": "先探索周围环境",
        "word_count": 1500
      },
      {
        "scene_number": 2,
        "chapter_number": 1,
        "title": "首次冲突",
        "location": "石室外",
        "viewpoint_character": "主角",
        "scene_type": "主动",
        "goal": "寻找食物和水源",
        "conflict": "遭遇野兽袭击",
        "disaster": "受伤，被逼入绝境",
        "word_count": 3000
      }
    ]
  }
}
```

---

### 3. 智能分析

#### `POST /progressive/analyze`
分析大纲质量

**请求体**：
```json
{
  "chapters": [...],  // 章节大纲列表
  "analysis_type": "comprehensive" | "cool_points" | "pacing" | "opening_hook"
}
```

**analysis_type 说明**：
- `cool_points`：爽点密度分析
- `pacing`：节奏分析
- `opening_hook`：开篇吸引力（黄金三章）
- `comprehensive`：综合分析（推荐）

**响应示例（comprehensive）**：
```json
{
  "success": true,
  "data": {
    "cool_points_analysis": {
      "overall_score": 85,
      "density_score": 90,
      "variety_score": 80,
      "rhythm_score": 85,
      "issues": [
        "第5-8章缺少明显爽点",
        "前三章的爽点类型单一"
      ],
      "suggestions": [
        "在第6章加入'反转'类爽点",
        "第2章可增加'打脸'场景"
      ]
    },
    "pacing_analysis": {
      "overall_score": 80,
      "opening_pace": "快速",
      "middle_pace": "有张有弛",
      "climax_buildup": "充分",
      "issues": [
        "第10-15章节奏过慢"
      ],
      "suggestions": [
        "第12-13章可以合并加快节奏"
      ]
    },
    "opening_hook_analysis": {
      "overall_score": 85,
      "protagonist_appeal": 90,
      "golden_finger_reveal": 85,
      "conflict_setup": 80,
      "cool_points_density": 85,
      "hook_effectiveness": 90,
      "issues": [
        "主角在第1章第800字才出现，偏晚"
      ],
      "suggestions": [
        "主角在300字内出场"
      ]
    },
    "overall_summary": {
      "overall_score": 83,
      "total_issues": 5,
      "total_suggestions": 4,
      "recommendation": "良好！大纲基本合格，根据建议微调后即可开始创作。"
    }
  }
}
```

---

## 使用流程建议

### 快速模式（适合有经验的作者）
1. 直接调用原有的 `POST /api/novel/outline/generate`
2. 生成大纲后调用 `POST /progressive/analyze` 检查质量
3. 根据分析结果修改大纲
4. 开始生成章节内容

### 渐进模式（适合新手或精细创作）
1. `POST /progressive/concept` - 确定核心概念
2. `POST /progressive/structure` - 建立三幕结构
3. `POST /progressive/detailed-outline` - 生成详细大纲
4. `POST /progressive/analyze` - 分析大纲质量
5. 根据分析结果修改
6. `POST /progressive/scene-breakdown` - 拆分场景
7. 开始生成章节内容

---

## 评分标准

### 综合评分
- **90-100分**：优秀！可以直接开始创作
- **80-89分**：良好！微调后可开始创作
- **70-79分**：及格！建议修改后再创作
- **60-69分**：勉强及格！强烈建议重新规划
- **<60分**：不及格！建议推倒重来

### 爽点密度标准
- 前三章：每章至少 **2个** 爽点
- 其他章节：每章至少 **1个** 爽点
- 爽点类型要**多样化**

### 黄金三章评判标准
- **第1章**：500字内引出主角，1000字内金手指，章内设置困境
- **第2章**：推进困境，展示能力
- **第3章**：解决困境并埋下伏笔，亮出爽点卖点

---

## 向后兼容

所有原有 API 端点保持不变：
- ✅ `POST /chapters/generate/stream` - 保留，但内部优化
- ✅ `POST /api/novel/outline/generate` - 保留，返回格式扩展
- ✅ 旧的大纲数据会自动补全新字段（默认值）

---

## TypeScript 类型定义

```typescript
// 章节大纲（扩展）
interface ChapterOutline {
  chapter_number: number;
  title: string;
  outline: string;
  key_events: string[];
  characters: string[];
  plot_lines: string[];
  is_key_chapter: boolean;

  // ✨ 新增字段
  word_count_target: number;  // 默认 6000
  cool_points: CoolPoint[];
  pacing: "快速" | "适中" | "缓慢";
  scene_allocation: string;
}

// 爽点
interface CoolPoint {
  type: "能力展示" | "反转" | "打脸" | "收获" | "情感" | "揭秘";
  description: string;
  position: "章节前1/3" | "章节中段" | "章节末尾";
}

// 场景
interface Scene {
  scene_number: number;
  chapter_number: number;
  title: string;
  location: string;
  viewpoint_character: string;
  scene_type: "主动" | "被动";

  // 主动场景
  goal?: string;
  conflict?: string;
  disaster?: string;

  // 被动场景
  reaction?: string;
  dilemma?: string;
  decision?: string;

  word_count: number;
}

// 分析结果
interface OutlineAnalysis {
  cool_points_analysis: {
    overall_score: number;
    density_score: number;
    variety_score: number;
    rhythm_score: number;
    issues: string[];
    suggestions: string[];
  };
  pacing_analysis: {
    overall_score: number;
    opening_pace: string;
    middle_pace: string;
    climax_buildup: string;
    issues: string[];
    suggestions: string[];
  };
  opening_hook_analysis: {
    overall_score: number;
    protagonist_appeal: number;
    golden_finger_reveal: number;
    conflict_setup: number;
    cool_points_density: number;
    hook_effectiveness: number;
    issues: string[];
    suggestions: string[];
  };
  overall_summary: {
    overall_score: number;
    total_issues: number;
    total_suggestions: number;
    recommendation: string;
  };
}
```

---

## 最佳实践

### 1. 提示词风格
优先使用 `style_prompt` 参数自定义风格：
```json
{
  "style_prompt": "轻松幽默，类似《斗破苍穹》的爽文风格"
}
```

### 2. 前三章特别注意
- 确保第1章在 500字内引出主角
- 确保第1章在 1000字内给出金手指或特殊之处
- 每章结尾要有钩子（悬念/转折/爽点）

### 3. 爽点设计
- 均匀分布，不要集中在某几章
- 类型多样化
- 强度递进（后期爽点要比前期更强）

### 4. 节奏控制
- 开篇要快
- 中段张弛有度
- 高潮前要有充分铺垫

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 |
| 403 | 无权访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 更新日志

### v2.0.0 (2026-01-15)
- ✨ 新增：提示词模板管理系统
- ✨ 新增：网文优化提示词（去AI味、黄金三章、6000字）
- ✨ 新增：渐进式大纲生成（4步工作流）
- ✨ 新增：智能分析功能（爽点密度、节奏、开篇吸引力）
- ✨ 新增：大纲数据模型扩展（cool_points、pacing、scene_allocation）
- 🔧 优化：章节生成 max_tokens 提升到 8000
- 🔧 优化：前三章自动应用黄金规则
- ✅ 向后兼容：所有原有 API 保持不变

### v1.0.0
- 初始版本
