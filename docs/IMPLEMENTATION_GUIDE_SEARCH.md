# 全局搜索系统 - 实施指南

## 📋 项目信息

- **功能**: P1 - 全局搜索与高级过滤系统
- **状态**: ✅ 核心骨架已完成
- **预估完成时间**: 2-3天
- **难度**: 中等

---

## ✅ 已完成的工作

### 1. 设计文档
- ✅ `docs/plans/2026-01-18-global-search-system-design.md`

### 2. 数据库层
- ✅ `services/novel-backend/migrations/add_search_system.sql` - SQL迁移脚本
- ✅ `services/novel-backend/app/models/search_models.py` - SQLAlchemy模型
- ✅ `services/novel-backend/app/schemas/search_schemas.py` - Pydantic Schemas

### 3. 后端服务层
- ✅ `services/novel-backend/app/services/search_service.py` - 搜索服务(核心逻辑)
- ✅ `services/novel-backend/app/routers/search.py` - API路由

### 4. 前端组件
- ✅ `src/components/search/GlobalSearchBar.tsx` - 搜索框组件
- ✅ `src/hooks/useDebounce.ts` - 防抖Hook

---

## 🚧 待完成的工作

### Phase 1: 后端完善 (1天)

#### 1.1 完善SearchService (CRITICAL)

**文件**: `services/novel-backend/app/services/search_service.py`

当前文件是在设计阶段生成的伪代码,需要替换为完整实现。由于文件较长(~480行),我已经准备好完整版本,你需要:

```bash
# 备份现有文件
cd services/novel-backend/app/services
mv search_service.py search_service.py.old

# 将我生成的完整版本复制过去
# (完整代码见前面生成的search_service.py)
```

**关键修改点**:
1. 确保`_build_tsquery`使用jieba分词
2. `_apply_filters`正确处理JSONB查询
3. `_generate_snippet`使用PostgreSQL `ts_headline`

#### 1.2 注册路由到主应用

**文件**: `services/novel-backend/app/main.py`

```python
# 在main.py中添加
from app.routers import search

app.include_router(
    search.router,
    prefix="/api/novel",
    tags=["search"]
)
```

**验证**:
```bash
# 启动服务后访问
curl http://localhost:8000/api/novel/search/health

# 预期响应:
{
  "status": "healthy",
  "service": "global_search",
  "version": "1.0.0",
  "features": ["global_search", "search_suggestions", ...]
}
```

#### 1.3 安装依赖

**文件**: `services/novel-backend/requirements.txt`

添加:
```
jieba==0.42.1  # 中文分词
```

安装:
```bash
cd services/novel-backend
source .venv/bin/activate
pip install jieba
```

---

### Phase 2: 数据库迁移 (30分钟)

#### 2.1 执行迁移脚本

```bash
# 连接到PostgreSQL
psql -U manga -d manga

# 执行迁移脚本
\i services/novel-backend/migrations/add_search_system.sql

# 验证表是否创建成功
\dt search_*
\dt saved_filter

# 验证索引
\di idx_chapter_search_vector
\di idx_search_history_*

# 验证触发器
SELECT tgname FROM pg_trigger WHERE tgname = 'tsvector_update_trigger';
```

**预期输出**:
```
                   List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | search_history    | table | manga
 public | saved_filter      | table | manga

索引列表应包含:
- idx_chapter_search_vector (GIN索引)
- idx_search_history_user_created
- idx_saved_filter_user
```

#### 2.2 手动测试全文搜索

```sql
-- 更新现有章节的search_vector
UPDATE novel_chapters
SET search_vector =
    setweight(to_tsvector('chinese', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('chinese', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('chinese', COALESCE(outline, '')), 'C');

-- 测试搜索
SELECT
    id, title,
    ts_rank(search_vector, to_tsquery('chinese', '主角')) as rank
FROM novel_chapters
WHERE search_vector @@ to_tsquery('chinese', '主角')
ORDER BY rank DESC
LIMIT 5;
```

---

### Phase 3: 前端完善 (1天)

#### 3.1 安装shadcn/ui Command组件

```bash
# 如果尚未安装Command组件
npx shadcn-ui@latest add command
```

#### 3.2 集成到导航栏

**文件**: `src/app/(novel)/novel/page.tsx` 或全局导航组件

```tsx
import { GlobalSearchBar } from "@/components/search/GlobalSearchBar";

export default function NovelDashboard() {
  return (
    <div>
      {/* 导航栏添加搜索框 */}
      <header className="flex items-center justify-between p-4">
        <h1>小说项目</h1>
        <GlobalSearchBar />  {/* 添加这里 */}
      </header>

      {/* ...其他内容 */}
    </div>
  );
}
```

#### 3.3 创建搜索结果页面

**文件**: `src/app/(novel)/novel/search/page.tsx`

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;

    async function fetchResults() {
      setLoading(true);
      try {
        const res = await fetch("/api/novel/search/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            page: 1,
            page_size: 20,
            sort_by: "relevance"
          })
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } catch (error) {
        console.error("搜索失败:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  if (loading) {
    return <div>搜索中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        搜索结果: "{query}"
      </h1>

      <div className="space-y-4">
        {results.map((result: any) => (
          <div
            key={result.chapter_id}
            className="p-4 border border-zinc-800 rounded-lg
                       hover:border-purple-500/30 transition-colors cursor-pointer"
            onClick={() => {
              window.location.href = `/novel/${result.project_id}?chapter=${result.chapter_number}`;
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-purple-300">
                {result.title}
              </h3>
              <span className="text-sm text-zinc-500">
                第{result.chapter_number}章
              </span>
            </div>

            <p className="text-sm text-zinc-400 mb-2">
              项目: {result.project_title}
            </p>

            <div
              className="text-sm text-zinc-300"
              dangerouslySetInnerHTML={{ __html: result.content_snippet }}
            />

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-zinc-500">
                {result.word_count} 字
              </span>
              <span className="text-xs text-zinc-500">
                相关性: {(result.relevance_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center text-zinc-500 mt-8">
          没有找到相关结果
        </div>
      )}
    </div>
  );
}
```

#### 3.4 创建Next.js API代理 (CRITICAL)

**文件**: `src/app/api/novel/search/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const NOVEL_SERVICE_URL = process.env.NOVEL_SERVICE_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("comicai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const path = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${NOVEL_SERVICE_URL}/api/novel/search/${path}${
    searchParams ? `?${searchParams}` : ""
  }`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("comicai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const path = params.path.join("/");
  const url = `${NOVEL_SERVICE_URL}/api/novel/search/${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("comicai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const path = params.path.join("/");
  const url = `${NOVEL_SERVICE_URL}/api/novel/search/${path}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

---

## 🧪 测试计划

### 1. 后端API测试

```bash
# 1. 健康检查
curl http://localhost:8000/api/novel/search/health

# 2. 搜索建议 (需要登录token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/novel/search/suggest?query=主角&limit=5"

# 3. 全局搜索
curl -X POST http://localhost:8000/api/novel/search/global \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "觉醒",
    "page": 1,
    "page_size": 20,
    "sort_by": "relevance"
  }'

# 4. 获取搜索历史
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/novel/search/history?limit=10"
```

### 2. 前端集成测试

**浏览器测试步骤**:

1. ✅ **打开搜索框**
   - 按 `Cmd+K` (Mac) 或 `Ctrl+K` (Windows)
   - 或点击搜索框

2. ✅ **测试搜索建议**
   - 输入 "主"
   - 应该看到搜索建议列表

3. ✅ **执行搜索**
   - 输入 "主角觉醒"
   - 按Enter
   - 应跳转到 `/novel/search?q=主角觉醒`
   - 查看搜索结果列表

4. ✅ **测试保存的过滤器**
   - 打开搜索框
   - 查看是否显示保存的过滤器

### 3. 性能测试

```sql
-- 测试全文搜索性能
EXPLAIN ANALYZE
SELECT
    id, title,
    ts_rank(search_vector, to_tsquery('chinese', '主角')) as rank
FROM novel_chapters
WHERE search_vector @@ to_tsquery('chinese', '主角')
ORDER BY rank DESC
LIMIT 20;

-- 预期执行时间: < 100ms (10,000章节)
```

---

## 🐛 常见问题排查

### 问题1: `jieba` 模块未找到

**错误**:
```
ModuleNotFoundError: No module named 'jieba'
```

**解决**:
```bash
cd services/novel-backend
source .venv/bin/activate
pip install jieba
```

### 问题2: 全文搜索无结果

**排查步骤**:

1. 检查`search_vector`是否为NULL
```sql
SELECT COUNT(*) FROM novel_chapters WHERE search_vector IS NULL;
```

2. 手动更新`search_vector`
```sql
UPDATE novel_chapters
SET search_vector =
    setweight(to_tsvector('chinese', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('chinese', COALESCE(content, '')), 'B');
```

3. 检查触发器是否存在
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'tsvector_update_trigger';
```

### 问题3: 前端搜索框不弹出

**排查**:

1. 检查是否安装Command组件
```bash
npx shadcn-ui@latest add command
```

2. 检查快捷键监听
```tsx
// 在浏览器console
document.addEventListener('keydown', (e) => {
  console.log('Key:', e.key, 'Meta:', e.metaKey, 'Ctrl:', e.ctrlKey);
});
```

### 问题4: API 401错误

**原因**: JWT token未正确传递

**检查**:
```typescript
// 在Next.js API路由中
const cookieStore = await cookies();
const token = cookieStore.get("comicai_session")?.value;
console.log("Token:", token);  // 应该有值
```

### 问题5: 搜索建议为空

**排查**:

1. 检查是否有搜索历史
```sql
SELECT * FROM search_history LIMIT 5;
```

2. 检查项目标题匹配
```sql
SELECT id, title FROM novel_projects WHERE title ILIKE '%主%';
```

---

## 📚 扩展功能实施

当核心功能稳定后,可以实施以下增强功能:

### 1. 高级过滤器面板

**文件**: `src/components/search/AdvancedFilters.tsx`

```tsx
// 提供UI界面让用户选择:
// - 日期范围 (DateRangePicker)
// - 字数范围 (Slider)
// - 状态 (Checkbox)
// - 爽点类型 (MultiSelect)
```

### 2. 搜索结果高亮优化

使用`react-highlight-words`库:

```bash
npm install react-highlight-words
```

```tsx
import Highlighter from "react-highlight-words";

<Highlighter
  searchWords={[query]}
  textToHighlight={result.content_snippet}
  highlightClassName="bg-purple-500/20 text-purple-200"
/>
```

### 3. 虚拟滚动优化

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

// 只渲染可见的结果,提升性能
```

---

## 🎯 成功标准

完成以下检查点即视为成功:

- [ ] 数据库迁移成功,索引创建完成
- [ ] 后端API所有端点返回正确数据
- [ ] 前端搜索框能正常打开/关闭
- [ ] Cmd+K快捷键工作正常
- [ ] 搜索建议实时显示
- [ ] 搜索结果正确高亮关键词
- [ ] 搜索历史正确保存
- [ ] 性能测试通过 (< 500ms响应)

---

## 📞 获取帮助

如果遇到问题:

1. 查看完整设计文档: `docs/plans/2026-01-18-global-search-system-design.md`
2. 检查API文档: `http://localhost:8000/docs`
3. 查看PostgreSQL日志: `tail -f /var/log/postgresql/postgresql-14-main.log`

---

**最后更新**: 2026-01-18
**维护者**: Claude (Linus Mode)
**版本**: v1.0
