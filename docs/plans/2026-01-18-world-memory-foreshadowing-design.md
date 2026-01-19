# 世界观记忆库与伏笔管理系统 - 技术设计文档

**日期**: 2026-01-18
**状态**: 已确认，准备实施
**版本**: v1.0

---

## 1. 概述

### 1.1 项目目标

为小说创作系统增加"世界观记忆库"和"伏笔管理助手"功能，帮助作者：
- 结构化管理世界观设定（地点、人物、事件、物品、规则）
- 追踪伏笔的生命周期（埋设 → 发酵 → 揭示）
- AI生成章节时自动引用相关世界观，保持一致性
- AI助手自动扫描识别潜在伏笔，提醒揭示时机

### 1.2 渐进式构建策略

```
第一阶段 (MVP): 世界观条目CRUD + 基础关系管理 + Tab页管理界面
第二阶段: 章节生成集成 + 侧边栏快速引用
第三阶段: AI伏笔助手 (提案中心)
```

---

## 2. 数据模型

### 2.1 数据库表结构

```sql
-- 世界观条目表
CREATE TABLE world_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,

    -- 基础字段
    type VARCHAR(50) NOT NULL,  -- location/character/event/item/rule/foreshadowing
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- 结构化属性 (按类型不同)
    properties JSONB DEFAULT '{}',

    -- 自定义扩展字段
    custom_fields JSONB DEFAULT '{}',

    -- 伏笔专用字段 (type='foreshadowing' 时使用)
    foreshadow_status VARCHAR(20),  -- planted/brewing/revealed
    planted_chapter INT,
    planned_reveal_chapter INT,
    actual_reveal_chapter INT,
    hint_text TEXT,

    -- 元数据
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 条目关系表
CREATE TABLE entry_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES world_entries(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES world_entries(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL,  -- 发生地点/参与者/触发事件/关联伏笔...
    description TEXT,
    chapter_context INT,  -- 可选：这个关系在哪章建立
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(source_id, target_id, relation_type)
);

-- 索引
CREATE INDEX idx_world_entries_project_type ON world_entries(project_id, type);
CREATE INDEX idx_world_entries_project_name ON world_entries(project_id, name);
CREATE INDEX idx_world_entries_foreshadow ON world_entries(project_id, foreshadow_status)
    WHERE type = 'foreshadowing';
CREATE INDEX idx_entry_relations_source ON entry_relations(source_id);
CREATE INDEX idx_entry_relations_target ON entry_relations(target_id);
```

### 2.2 类型定义的默认属性

```python
ENTRY_TYPE_SCHEMAS = {
    "location": {
        "required": ["name"],
        "properties": {
            "region": "string",      # 所属区域
            "terrain": "string",     # 地形特征
            "population": "string",  # 人口规模
            "significance": "string" # 剧情重要性
        }
    },
    "character": {
        "required": ["name"],
        "properties": {
            "role": "string",        # 主角/配角/反派
            "affiliation": "string", # 所属势力
            "ability": "string",     # 能力特长
            "personality": "string"  # 性格特点
        }
    },
    "event": {
        "required": ["name"],
        "properties": {
            "time_period": "string", # 发生时间
            "scale": "string",       # 规模：个人/群体/世界
            "outcome": "string"      # 结果影响
        }
    },
    "item": {
        "required": ["name"],
        "properties": {
            "rarity": "string",      # 稀有度
            "power": "string",       # 能力效果
            "origin": "string"       # 来源背景
        }
    },
    "rule": {
        "required": ["name"],
        "properties": {
            "category": "string",    # 魔法体系/物理定律/社会规则
            "scope": "string",       # 适用范围
            "exceptions": "string"   # 例外情况
        }
    },
    "foreshadowing": {
        "required": ["name", "planted_chapter"],
        "properties": {
            "importance": "string",  # 重要程度：主线/支线/彩蛋
            "reveal_hint": "string"  # 揭示时机建议
        }
    }
}
```

---

## 3. API设计

### 3.1 后端路由结构 (`/api/novel/world`)

```python
# ============ 条目 CRUD ============
POST   /world/entries                  # 创建条目
GET    /world/entries?type=&search=    # 列表查询
GET    /world/entries/{id}             # 获取单个条目（含关系）
PATCH  /world/entries/{id}             # 更新条目
DELETE /world/entries/{id}             # 删除条目

# ============ 关系管理 ============
POST   /world/relations                # 创建关系
DELETE /world/relations/{id}           # 删除关系
GET    /world/entries/{id}/relations   # 获取条目的所有关系

# ============ 伏笔专用 ============
GET    /world/foreshadowing            # 获取伏笔列表（按状态分组）
PATCH  /world/foreshadowing/{id}/status  # 更新伏笔状态
GET    /world/foreshadowing/pending    # 获取待揭示的伏笔

# ============ 生成集成 (第二阶段) ============
POST   /world/context/recommend        # 根据章节大纲推荐相关条目
POST   /world/context/build            # 构建生成用的世界观上下文

# ============ AI助手 (第三阶段) ============
POST   /world/analyze/scan-foreshadowing   # 扫描章节识别潜在伏笔
POST   /world/analyze/consistency-check    # 一致性检查
GET    /world/recommendations              # 获取AI建议列表
```

### 3.2 核心Schema定义

```python
# 创建条目请求
class CreateEntryRequest(BaseModel):
    type: Literal["location", "character", "event", "item", "rule", "foreshadowing"]
    name: str
    description: Optional[str]
    properties: Optional[dict] = {}
    custom_fields: Optional[dict] = {}
    tags: Optional[List[str]] = []
    # 伏笔专用
    planted_chapter: Optional[int]
    planned_reveal_chapter: Optional[int]
    hint_text: Optional[str]

# 条目响应（含关系）
class EntryResponse(BaseModel):
    id: UUID
    type: str
    name: str
    description: Optional[str]
    properties: dict
    custom_fields: dict
    tags: List[str]
    # 伏笔字段
    foreshadow_status: Optional[str]
    planted_chapter: Optional[int]
    planned_reveal_chapter: Optional[int]
    # 关系
    relations: List[RelationResponse]
    referenced_by: List[RelationResponse]
    created_at: datetime
    updated_at: datetime

# 创建关系请求
class CreateRelationRequest(BaseModel):
    source_id: UUID
    target_id: UUID
    relation_type: str
    description: Optional[str]
    chapter_context: Optional[int]

# 推荐上下文请求 (第二阶段)
class RecommendContextRequest(BaseModel):
    chapter_outline: str
    chapter_number: int
    include_foreshadowing: bool = True

# 推荐上下文响应
class RecommendContextResponse(BaseModel):
    recommended_entries: List[EntryBrief]
    pending_foreshadowing: List[EntryBrief]
    confidence_scores: dict
```

---

## 4. 前端组件设计

### 4.1 组件结构

```
src/components/world/
├── WorldEntriesTab.tsx        # 世界观Tab主组件
├── EntryList.tsx              # 左侧条目列表（按类型分组）
├── EntryDetail.tsx            # 右侧条目详情
├── EntryForm.tsx              # 创建/编辑条目表单
├── RelationManager.tsx        # 关系管理组件
├── ForeshadowingTab.tsx       # 伏笔Tab主组件
├── ForeshadowingCard.tsx      # 单个伏笔卡片
├── ForeshadowingStats.tsx     # 伏笔统计
├── WorldSidebar.tsx           # 侧边栏快速引用 (第二阶段)
├── RecommendationCenter.tsx   # 提案中心 (第三阶段)
└── types.ts                   # 类型定义
```

### 4.2 UI布局

**Tab页管理界面**:
- 左侧：条目列表（按类型折叠分组，支持搜索）
- 右侧：条目详情/编辑表单
- 底部：关系管理区域

**伏笔管理面板**:
- 顶部：统计数据（已埋设/发酵中/已揭示）
- 主体：按状态分组的伏笔卡片列表
- 每个卡片支持状态流转操作

**侧边栏快速引用** (第二阶段):
- 本章相关条目（自动推荐）
- 可揭示的伏笔提醒
- 最近使用的条目
- 快速插入引用

---

## 5. 数据流

### 5.1 章节生成集成流程 (第二阶段)

```
用户点击"生成第15章"
    ↓
Step 1: 提取章节大纲关键词
    ↓
Step 2: 检索相关条目 (POST /world/context/recommend)
  - 精确匹配关键词
  - 关系扩展
  - 伏笔检查 (planned_reveal_chapter <= 当前章节)
    ↓
Step 3: 展示推荐列表，用户确认增删
    ↓
Step 4: 构建世界观上下文 (POST /world/context/build)
  - 按优先级组织 (伏笔 > 人物 > 地点 > 规则 > 事件 > 物品)
  - 控制Token预算 (最大2000 tokens)
    ↓
Step 5: 注入到生成Prompt
    ↓
AI 生成章节
    ↓
Step 6: (可选) 生成后自动分析
  - 检测新实体 → 建议创建条目
  - 检测伏笔揭示 → 建议更新状态
```

### 5.2 Token预算控制

```python
class WorldContextBuilder:
    MAX_CONTEXT_TOKENS = 2000

    PRIORITY_ORDER = [
        "foreshadowing",  # 伏笔最重要
        "character",      # 人物其次
        "location",       # 地点
        "rule",           # 规则
        "event",          # 事件
        "item",           # 物品最后
    ]
```

---

## 6. AI伏笔助手 (第三阶段)

### 6.1 核心能力

1. **自动扫描识别伏笔**
   - 扫描已写章节
   - 识别未解释的神秘事物、悬而未决的问题、预示性描写

2. **揭示时机建议**
   - 根据伏笔重要性和当前进度建议揭示时机
   - 检测长期未揭示的伏笔，提醒"读者可能已遗忘"

3. **一致性检查**
   - 检测世界观描述矛盾
   - 检测已损坏/死亡的实体再次出现

### 6.2 提案中心UI

- 新发现的潜在伏笔
- 揭示时机建议
- 一致性警告
- 每类建议支持：接受、忽略、稍后提醒

---

## 7. 实施计划

### 第一阶段 (MVP) - 3-4天

**后端任务**:
- 1.1 创建数据库迁移脚本
- 1.2 实现 WorldEntry 和 EntryRelation 模型
- 1.3 实现条目 CRUD API
- 1.4 实现关系管理 API
- 1.5 实现伏笔专用 API

**前端任务**:
- 1.6 创建 WorldEntriesTab 组件
- 1.7 创建 EntryList + EntryDetail 组件
- 1.8 创建 EntryForm 表单
- 1.9 创建 RelationManager 组件
- 1.10 创建 ForeshadowingTab + ForeshadowingCard 组件
- 1.11 集成到项目详情页

### 第二阶段 - 2-3天

**后端任务**:
- 2.1 实现 RecommendContext API
- 2.2 实现 WorldContextBuilder
- 2.3 修改 GenerationService 集成世界观上下文

**前端任务**:
- 2.4 创建 WorldSidebar 侧边栏组件
- 2.5 创建 ContextRecommendDialog
- 2.6 修改章节生成流程

### 第三阶段 - 3-4天

**后端任务**:
- 3.1 实现 ForeshadowingAgent
- 3.2 实现揭示时机建议算法
- 3.3 实现一致性检查服务
- 3.4 实现 Recommendations API

**前端任务**:
- 3.5 创建 RecommendationCenter 组件
- 3.6 创建各类建议卡片
- 3.7 集成到项目详情页

---

## 8. 验收标准

### 第一阶段验收
- [ ] 可以创建/编辑/删除6种类型的条目
- [ ] 可以建立条目之间的关系并双向查询
- [ ] 伏笔条目支持状态流转 (planted → brewing → revealed)
- [ ] Tab页UI完整可用，支持按类型筛选和搜索
- [ ] 伏笔面板按状态分组显示，有统计数据

### 第二阶段验收
- [ ] 生成章节前可以看到推荐的相关条目
- [ ] 可以手动增删推荐列表
- [ ] 确认后世界观上下文正确注入到生成prompt
- [ ] 侧边栏可以快速查看和引用条目
- [ ] Token使用量在预算范围内

### 第三阶段验收
- [ ] 可以扫描章节识别潜在伏笔
- [ ] 对长期未揭示的伏笔给出提醒
- [ ] 可以检测世界观描述矛盾
- [ ] 提案中心UI完整，支持各类建议的操作

---

**文档维护者**: Claude (Linus Mode)
**最后更新**: 2026-01-18
