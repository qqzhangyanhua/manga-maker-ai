# 全局搜索系统 - 技术设计文档

## 项目信息

- **功能名称**: P1 - 全局搜索与高级过滤系统
- **优先级**: 🔴 紧急
- **预估工作量**: 1周
- **影响力**: ⭐⭐⭐⭐⭐
- **设计日期**: 2026-01-18

---

## 1. 问题定义

### 1.1 当前痛点

根据 `API_COMPLETENESS_AUDIT.md` 审查报告:

- **搜索模块评分**: 40/100 🔴
- **问题1**: 只有1个搜索端点,功能严重不足
- **问题2**: 无法跨项目搜索章节内容
- **问题3**: 缺少按日期、字数、状态等高级过滤
- **问题4**: 无搜索建议和历史记录

### 1.2 用户场景

```
场景1: 作者记得某个角色在某章说过一句经典台词,但忘记是哪章
  → 需要: 跨所有项目搜索关键词

场景2: 作者想找所有"打脸"类型的爽点章节作为参考
  → 需要: 按爽点类型过滤

场景3: 作者想统计最近一周创作的所有章节
  → 需要: 按日期范围过滤

场景4: 作者想快速搜索之前搜过的内容
  → 需要: 搜索历史和建议
```

---

## 2. 技术方案

### 2.1 核心功能列表

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 全局内容搜索 | 跨所有项目搜索章节内容 | P0 |
| 高级过滤器 | 日期/字数/状态/爽点类型 | P0 |
| 搜索建议 | 自动补全和智能建议 | P1 |
| 搜索历史 | 保存最近搜索记录 | P1 |
| 保存过滤器 | 保存常用搜索条件 | P2 |
| 关键词高亮 | 结果中高亮匹配关键词 | P1 |

### 2.2 技术栈选择

**后端**:
- PostgreSQL 全文搜索 (tsvector + tsquery)
- SQLAlchemy 2.0 (异步查询)
- Pydantic 模型验证

**前端**:
- React 18 + TypeScript
- shadcn/ui (Command + Popover)
- lucide-react 图标
- TanStack Query (数据管理)

**为什么不用Elasticsearch?**
- PostgreSQL全文搜索足够强大
- 减少架构复杂度
- 避免额外维护成本
- 项目规模适合(预计<100万章节)

---

## 3. 数据库设计

### 3.1 新增表结构

#### 3.1.1 SearchHistory (搜索历史)

```sql
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    clicked_result_id UUID,  -- 用户点击的结果
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_search_history_user_created
    ON search_history(user_id, created_at DESC);
```

#### 3.1.2 SavedFilter (保存的过滤器)

```sql
CREATE TABLE saved_filter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_filter_user ON saved_filter(user_id);
```

### 3.2 现有表优化

#### 3.2.1 NovelChapter - 添加全文搜索索引

```sql
-- 添加tsvector列(用于全文搜索)
ALTER TABLE novel_chapter
ADD COLUMN search_vector tsvector;

-- 更新现有数据
UPDATE novel_chapter
SET search_vector =
    setweight(to_tsvector('chinese', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('chinese', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('chinese', COALESCE(outline, '')), 'C');

-- 创建GIN索引(必须,否则全文搜索会很慢)
CREATE INDEX idx_chapter_search_vector ON novel_chapter USING GIN(search_vector);

-- 创建触发器自动更新search_vector
CREATE OR REPLACE FUNCTION chapter_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('chinese', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.outline, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update_trigger
    BEFORE INSERT OR UPDATE OF title, content, outline
    ON novel_chapter
    FOR EACH ROW
    EXECUTE FUNCTION chapter_search_vector_update();
```

**权重说明**:
- `A`: 标题 (最高权重)
- `B`: 正文内容 (中等权重)
- `C`: 大纲 (较低权重)

---

## 4. API设计

### 4.1 端点列表

#### 4.1.1 POST /api/novel/search/global

**全局搜索(核心端点)**

**请求体**:
```typescript
interface GlobalSearchRequest {
  query: string;                        // 搜索关键词
  filters?: {
    project_ids?: string[];             // 限定项目
    date_range?: {
      start: string;                    // ISO 8601格式
      end: string;
    };
    word_count_range?: {
      min: number;
      max: number;
    };
    status?: string[];                  // ["completed", "draft"]
    cool_point_types?: string[];        // ["能力展示", "打脸", "反转"]
    chapter_number_range?: {
      min: number;
      max: number;
    };
  };
  sort_by?: "relevance" | "date" | "word_count";  // 排序方式
  page?: number;
  page_size?: number;
}
```

**响应**:
```typescript
interface GlobalSearchResponse {
  total_count: number;
  page: number;
  page_size: number;
  results: SearchResult[];
  aggregations: {
    by_project: { project_id: string; count: number }[];
    by_cool_point_type: { type: string; count: number }[];
    by_status: { status: string; count: number }[];
  };
}

interface SearchResult {
  chapter_id: string;
  project_id: string;
  project_title: string;
  chapter_number: number;
  title: string;
  content_snippet: string;            // 包含关键词的片段(高亮标记)
  word_count: number;
  status: string;
  cool_points: CoolPoint[];
  relevance_score: number;            // 相关性得分 0-1
  created_at: string;
  updated_at: string;
}
```

---

#### 4.1.2 GET /api/novel/search/suggest

**搜索建议(自动补全)**

**请求参数**:
```typescript
{
  query: string;      // 当前输入的关键词
  limit?: number;     // 返回建议数量,默认5
}
```

**响应**:
```typescript
interface SuggestResponse {
  suggestions: {
    type: "history" | "popular" | "project" | "character";
    text: string;
    highlight: string;  // 高亮部分
    meta?: {
      project_id?: string;
      result_count?: number;
    };
  }[];
}
```

**建议来源优先级**:
1. 用户搜索历史(最近30天)
2. 项目标题匹配
3. 章节标题高频关键词
4. 角色名称

---

#### 4.1.3 GET /api/novel/search/history

**搜索历史**

**请求参数**:
```typescript
{
  limit?: number;     // 默认20
  offset?: number;
}
```

**响应**:
```typescript
interface SearchHistoryResponse {
  history: {
    id: string;
    query: string;
    filters: object;
    result_count: number;
    created_at: string;
  }[];
  total_count: number;
}
```

---

#### 4.1.4 POST /api/novel/search/save-filter

**保存过滤器**

**请求体**:
```typescript
interface SaveFilterRequest {
  name: string;
  description?: string;
  filters: object;      // 与GlobalSearchRequest.filters相同
  is_pinned?: boolean;  // 是否置顶
}
```

---

#### 4.1.5 GET /api/novel/search/saved-filters

**获取保存的过滤器列表**

**响应**:
```typescript
interface SavedFiltersResponse {
  filters: {
    id: string;
    name: string;
    description: string;
    filters: object;
    is_pinned: boolean;
    use_count: number;
    created_at: string;
  }[];
}
```

---

#### 4.1.6 DELETE /api/novel/search/history/{history_id}

**删除搜索历史记录**

---

#### 4.1.7 DELETE /api/novel/search/saved-filters/{filter_id}

**删除保存的过滤器**

---

## 5. 核心算法

### 5.1 全文搜索查询

```python
# 使用PostgreSQL tsvector
from sqlalchemy import func, select

# 构建查询
stmt = (
    select(
        NovelChapter,
        func.ts_rank(
            NovelChapter.search_vector,
            func.to_tsquery('chinese', search_query)
        ).label('rank')
    )
    .where(
        NovelChapter.search_vector.op('@@')(
            func.to_tsquery('chinese', search_query)
        )
    )
    .order_by(desc('rank'))
)
```

**关键词转换逻辑**:
```python
def build_tsquery(query: str) -> str:
    """
    将用户输入转换为PostgreSQL tsquery格式

    示例:
    "主角 打脸" → "主角 & 打脸"
    "主角|配角" → "主角 | 配角"
    """
    # 1. 分词
    tokens = jieba.cut_for_search(query)

    # 2. 转换为tsquery
    # 默认使用AND连接
    return " & ".join(tokens)
```

### 5.2 高级过滤器应用

```python
# 应用所有过滤器
if filters:
    if filters.date_range:
        stmt = stmt.where(
            NovelChapter.created_at.between(
                filters.date_range.start,
                filters.date_range.end
            )
        )

    if filters.word_count_range:
        stmt = stmt.where(
            func.length(NovelChapter.content).between(
                filters.word_count_range.min,
                filters.word_count_range.max
            )
        )

    if filters.cool_point_types:
        # JSONB查询
        stmt = stmt.where(
            NovelChapter.cool_points.op('@>')(
                [{"type": t} for t in filters.cool_point_types]
            )
        )
```

### 5.3 结果高亮

```python
def highlight_snippet(content: str, query: str, max_length: int = 200) -> str:
    """
    提取包含关键词的片段并高亮

    返回格式: "...前文<mark>关键词</mark>后文..."
    """
    # 1. 使用PostgreSQL ts_headline函数
    snippet = func.ts_headline(
        'chinese',
        content,
        func.to_tsquery('chinese', query),
        'MaxWords=50, MinWords=25, MaxFragments=1'
    )

    return snippet
```

---

## 6. 前端设计

### 6.1 组件结构

```
src/components/search/
├── GlobalSearchBar.tsx          # 通用搜索框组件
├── SearchResultsPage.tsx        # 搜索结果页面
├── AdvancedFilters.tsx          # 高级过滤器面板
├── SearchResultCard.tsx         # 单个搜索结果卡片
├── SearchHistoryDialog.tsx      # 搜索历史弹窗
├── SavedFiltersDialog.tsx       # 保存的过滤器弹窗
└── types.ts                     # 类型定义
```

### 6.2 用户交互流程

```
1. 用户按 Cmd+K 或点击搜索图标
   ↓
2. 打开搜索框(Command组件)
   - 显示搜索历史
   - 显示保存的过滤器
   ↓
3. 用户输入关键词
   - 实时显示搜索建议(防抖300ms)
   ↓
4. 用户按Enter或点击搜索
   - 跳转到搜索结果页
   - URL: /novel/search?q=关键词&filters=...
   ↓
5. 显示结果列表
   - 左侧: 高级过滤器面板
   - 右侧: 结果列表(虚拟滚动)
   - 关键词高亮显示
   ↓
6. 用户调整过滤器
   - 实时更新结果(debounce 500ms)
   - URL同步更新(支持分享和书签)
   ↓
7. 用户点击结果
   - 记录到搜索历史(clicked_result_id)
   - 跳转到章节详情页
```

### 6.3 快捷键设计

| 快捷键 | 功能 |
|--------|------|
| Cmd+K / Ctrl+K | 打开搜索 |
| Esc | 关闭搜索 |
| ↑/↓ | 浏览建议 |
| Enter | 执行搜索 |
| Cmd+Shift+F | 打开高级过滤器 |

---

## 7. 性能优化

### 7.1 数据库优化

1. **GIN索引** (必须)
   ```sql
   CREATE INDEX idx_chapter_search_vector
   ON novel_chapter USING GIN(search_vector);
   ```

2. **复合索引**
   ```sql
   CREATE INDEX idx_chapter_user_status_created
   ON novel_chapter(user_id, status, created_at DESC);
   ```

3. **查询优化**
   - 使用`EXPLAIN ANALYZE`检查慢查询
   - 避免`SELECT *`,只查询需要的字段
   - 使用游标分页而非offset

### 7.2 前端优化

1. **防抖(Debounce)**
   - 搜索建议: 300ms
   - 过滤器变化: 500ms

2. **虚拟滚动**
   - 使用`@tanstack/react-virtual`
   - 每次只渲染可见的30条结果

3. **缓存**
   - 使用TanStack Query缓存搜索结果
   - staleTime: 5分钟

---

## 8. 测试计划

### 8.1 单元测试

```python
# tests/test_search_service.py

async def test_global_search_basic():
    """测试基础搜索功能"""
    results = await search_service.global_search(
        user_id="test_user",
        query="主角",
        filters=None
    )
    assert len(results) > 0

async def test_search_with_filters():
    """测试高级过滤器"""
    results = await search_service.global_search(
        user_id="test_user",
        query="打脸",
        filters={
            "cool_point_types": ["打脸"],
            "status": ["completed"]
        }
    )
    for r in results:
        assert r.status == "completed"
        assert any(cp.type == "打脸" for cp in r.cool_points)
```

### 8.2 性能测试

**目标**:
- 搜索响应时间 < 500ms (10,000条章节)
- 搜索建议响应时间 < 100ms
- 前端首次渲染 < 1s

---

## 9. 实施计划

### Day 1-2: 后端开发
- ✅ 数据库迁移(新增表 + tsvector)
- ✅ 实现SearchService核心逻辑
- ✅ 实现API端点
- ✅ 单元测试

### Day 3-4: 前端开发
- ✅ GlobalSearchBar组件
- ✅ SearchResultsPage页面
- ✅ AdvancedFilters组件
- ✅ 类型定义

### Day 5: 集成与优化
- ✅ 前后端联调
- ✅ 性能优化
- ✅ UI细节打磨

### Day 6-7: 测试与部署
- ✅ 功能测试
- ✅ 性能测试
- ✅ 文档更新
- ✅ 部署上线

---

## 10. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| PostgreSQL全文搜索中文支持不佳 | 高 | 1. 使用jieba分词 2. 必要时引入Elasticsearch |
| 数据量大时搜索变慢 | 中 | 1. GIN索引 2. 限制搜索范围 3. 分区表 |
| 前端搜索框卡顿 | 低 | 1. 防抖 2. 虚拟滚动 3. Web Worker |

---

## 11. 后续增强(Phase 2)

- 🔮 语义搜索(Embedding + 向量相似度)
- 🔮 模糊搜索(编辑距离)
- 🔮 搜索分析(热门关键词、无结果查询)
- 🔮 AI搜索建议(根据内容推荐相关章节)

---

## 12. 参考资料

- PostgreSQL全文搜索: https://www.postgresql.org/docs/current/textsearch.html
- shadcn/ui Command: https://ui.shadcn.com/docs/components/command
- TanStack Query: https://tanstack.com/query/latest

---

**文档版本**: v1.0
**最后更新**: 2026-01-18
**设计者**: Claude (Linus Mode)
**状态**: ✅ 已批准,待实施
