# World Entries 数据库迁移完成报告

## 问题描述

接口 `http://localhost:3000/api/novel/world/projects/{project_id}/entries` 返回错误：

```
asyncpg.exceptions.UndefinedTableError: relation "world_entries" does not exist
```

## 根本原因

数据库中缺少 `world_entries` 和 `entry_relations` 表。这些表是世界观记忆库功能所需的核心表。

虽然迁移脚本 `migrations/add_world_memory_system.sql` 已经存在，但从未被执行过。

## 解决方案

### 1. 创建迁移执行脚本

创建了 `run_migration.py` 脚本，用于执行数据库迁移：

```python
#!/usr/bin/env python3
"""运行数据库迁移脚本"""
import asyncio
from pathlib import Path
import asyncpg
from app.config import settings

async def run_migration():
    """执行 world_memory_system 迁移"""
    # 连接数据库
    conn = await asyncpg.connect(
        settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    )
    
    # 读取并执行迁移脚本
    migration_file = Path(__file__).parent / "migrations" / "add_world_memory_system.sql"
    sql_script = migration_file.read_text(encoding="utf-8")
    
    await conn.execute(sql_script)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
```

### 2. 执行迁移

```bash
cd services/novel-backend
python run_migration.py
```

输出：
```
[INFO] Read migration script: D:\AI\manga-maker-ai\services\novel-backend\migrations\add_world_memory_system.sql
[INFO] Script length: 4329 characters
[INFO] Starting migration execution...

[SUCCESS] Migration completed successfully!
```

### 3. 验证迁移结果

创建了 `verify_tables.py` 脚本进行验证：

```bash
python verify_tables.py
```

输出：
```
[SUCCESS] Found tables:
  - entry_relations
  - world_entries

[INFO] world_entries table structure:
  - id: uuid NOT NULL
  - project_id: uuid NOT NULL
  - type: character varying NOT NULL
  - name: character varying NOT NULL
  - description: text NULL
  - properties: jsonb NULL
  - custom_fields: jsonb NULL
  - foreshadow_status: character varying NULL
  - planted_chapter: integer NULL
  - planned_reveal_chapter: integer NULL
  - actual_reveal_chapter: integer NULL
  - hint_text: text NULL
  - tags: ARRAY NULL
  - created_at: timestamp with time zone NULL
  - updated_at: timestamp with time zone NULL

[INFO] Records in world_entries: 0
```

## 已创建的表

### 1. `world_entries` - 世界观条目表

存储小说项目的世界观元素：

- **类型 (type)**: `location`, `character`, `event`, `item`, `rule`, `foreshadowing`
- **基础字段**: `name`, `description`, `properties`, `tags`
- **伏笔专用字段**: `foreshadow_status`, `planted_chapter`, `planned_reveal_chapter`, `hint_text`

### 2. `entry_relations` - 条目关系表

管理世界观条目之间的关系：

- **关系类型 (relation_type)**: `located_in`, `belongs_to`, `owned_by`, `leads_to`, `caused_by`, `conflicts_with`, `depends_on`, `related_to`, `foreshadows`, `fulfills`
- **关键字段**: `source_id`, `target_id`, `description`, `chapter_context`

## API 端点

迁移完成后，以下 API 端点可用：

### 条目管理
- `GET /api/novel/world/projects/{project_id}/entries` - 获取条目列表
- `POST /api/novel/world/projects/{project_id}/entries` - 创建条目
- `GET /api/novel/world/projects/{project_id}/entries/{entry_id}` - 获取条目详情
- `PUT /api/novel/world/projects/{project_id}/entries/{entry_id}` - 更新条目
- `DELETE /api/novel/world/projects/{project_id}/entries/{entry_id}` - 删除条目

### 关系管理
- `POST /api/novel/world/projects/{project_id}/relations` - 创建关系
- `DELETE /api/novel/world/projects/{project_id}/relations/{relation_id}` - 删除关系

### 伏笔管理
- `GET /api/novel/world/projects/{project_id}/foreshadowings` - 获取伏笔列表
- `PUT /api/novel/world/foreshadowing/{entry_id}/status` - 更新伏笔状态
- `GET /api/novel/world/projects/{project_id}/pending-foreshadowings` - 获取待揭示伏笔

### 元数据
- `GET /api/novel/world/entry-types` - 获取所有条目类型
- `GET /api/novel/world/relation-types` - 获取所有关系类型

## 重要提示

### ⚠️ 需要重启 Python 后端服务

迁移完成后，**必须重启** `uvicorn` 服务才能正常访问新表：

```bash
# 方法 1: 如果使用 Ctrl+C 停止服务，重新启动
cd services/novel-backend
uvicorn app.main:app --reload --port 8000

# 方法 2: 如果在后台运行，找到进程并重启
# Windows:
Stop-Process -Name uvicorn -Force
uvicorn app.main:app --reload --port 8000

# Linux/Mac:
pkill uvicorn
uvicorn app.main:app --reload --port 8000
```

### 认证要求

所有 World API 端点都需要 JWT 认证。测试时需要：

1. 通过 Next.js 前端登录获取 JWT token
2. 在请求头中添加：`Authorization: Bearer <token>`
3. 或通过 Next.js 代理层访问（自动处理认证）

## 测试验证

### 方法 1: 使用 Swagger UI

1. 访问 http://localhost:8000/docs
2. 点击右上角 "Authorize" 按钮
3. 输入 JWT token
4. 测试 World API 端点

### 方法 2: 通过 Next.js 代理

```bash
# 前提：已登录 Next.js 前端
curl http://localhost:3000/api/novel/world/projects/{project_id}/entries?limit=100
```

### 方法 3: 直接调用 Python 后端

```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
     http://localhost:8000/api/novel/world/projects/{project_id}/entries?limit=100
```

## 文件清单

本次迁移创建/使用的文件：

1. ✅ `migrations/add_world_memory_system.sql` - 数据库迁移脚本（已存在）
2. ✅ `run_migration.py` - 迁移执行脚本（新建）
3. ✅ `verify_tables.py` - 表验证脚本（新建）
4. ✅ `test_world_api.py` - API 测试脚本（新建）
5. ✅ `app/models.py` - 包含 `WorldEntry` 和 `EntryRelation` 模型（已存在）
6. ✅ `app/routers/world.py` - World API 路由（已存在）
7. ✅ `app/routers/world_extraction.py` - AI 提取路由（已存在）

## 后续步骤

1. **重启 Python 后端服务**（必需）
2. 在前端集成 World API 调用
3. 测试完整的世界观管理流程
4. 根据需要调整 API 响应格式

## 相关文档

- `services/novel-backend/sql.md` - 数据库 Schema 完整文档
- `services/novel-backend/GUIDE.md` - API 使用指南
- `services/novel-backend/migrations/add_world_memory_system.sql` - 原始迁移脚本

---

**迁移完成时间**: 2026-01-28
**执行人**: AI Assistant
**状态**: ✅ 成功
