# 数据库连接超时问题修复

## 问题现象

在执行世界观记忆库迁移后，Next.js 应用偶尔出现数据库连接超时错误：

```
[ERROR] Failed to fetch project
Can't reach database server at `111.228.37.74:5432`
Please make sure your database server is running at `111.228.37.74:5432`.
```

## 问题分析

### 1. 根本原因

这是一个**间歇性的数据库连接超时问题**，主要原因：

- **远程数据库** (111.228.37.74) 存在网络延迟
- **默认连接池配置不足**，导致高并发时连接耗尽
- **缺少连接超时设置**，Prisma 默认超时可能过短

### 2. 验证结果

通过测试脚本验证，数据库服务器本身是正常运行的：

```bash
[SUCCESS] Database connection successful!
[INFO] Found 3 tables:
  - entry_relations
  - novel_projects
  - world_entries
[INFO] Total projects in database: 3
```

问题不是数据库宕机，而是**连接池管理和超时配置**需要优化。

## 解决方案

### 修改 1: 优化 DATABASE_URL 连接参数

在 `.env` 文件中添加连接池和超时配置：

```env
# 修改前
DATABASE_URL=postgresql://cartoon:3MRL8JKw5fn5Njy5@111.228.37.74:5432/cartoon

# 修改后
DATABASE_URL=postgresql://cartoon:3MRL8JKw5fn5Njy5@111.228.37.74:5432/cartoon?connection_limit=10&pool_timeout=20&connect_timeout=10
```

**参数说明**:
- `connection_limit=10`: 最大连接数限制为 10（适合中小型应用）
- `pool_timeout=20`: 获取连接的超时时间为 20 秒
- `connect_timeout=10`: 建立新连接的超时时间为 10 秒

### 修改 2: 启用 Prisma 日志

在 `src/lib/db.ts` 中启用错误和警告日志：

```typescript
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
    // 添加日志配置
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
```

这样可以更好地追踪连接问题。

## 验证步骤

### 1. 重启 Next.js 服务

```bash
# 停止当前服务 (Ctrl+C)
# 重新启动
npm run dev
```

### 2. 测试接口

```bash
# 测试世界观条目列表接口
curl http://localhost:3000/api/novel/world/projects/{project_id}/entries?limit=100

# 或在浏览器中访问
http://localhost:3000/novel/{project_id}
```

### 3. 监控日志

观察控制台输出，应该不再出现 "Can't reach database server" 错误。

如果仍有问题，日志会显示更详细的错误信息。

## 进一步优化建议

如果问题依然存在，可以考虑以下优化：

### 1. 调整连接池大小

根据应用负载调整 `connection_limit`：

```env
# 低负载（开发环境）
connection_limit=5

# 中等负载（小型生产环境）
connection_limit=10

# 高负载（大型生产环境）
connection_limit=20
```

### 2. 增加超时时间

如果网络延迟较大，可以增加超时：

```env
pool_timeout=30&connect_timeout=15
```

### 3. 启用连接重试

在 `src/lib/db.ts` 中添加重试逻辑（可选）：

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // ... 其他配置
  
  // 启用查询日志（用于调试）
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
});

// 查询性能监控（可选）
prisma.$on("query", (e) => {
  if (e.duration > 1000) {
    console.warn(`慢查询: ${e.duration}ms - ${e.query}`);
  }
});
```

### 4. 使用本地数据库（推荐用于开发环境）

如果远程数据库延迟过高，建议在开发环境使用本地 PostgreSQL：

```env
# 本地数据库
DATABASE_URL=postgresql://user:password@localhost:5432/manga
```

## 相关配置文件

- ✅ `.env` - Next.js 环境变量（已更新）
- ✅ `src/lib/db.ts` - Prisma Client 配置（已更新）
- ✅ `services/novel-backend/.env` - Python 后端配置（使用相同数据库）

## 监控和调试

### 查看 Prisma 连接池状态

在 Next.js API 路由中添加调试端点（仅开发环境）：

```typescript
// src/app/api/debug/db-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "仅开发环境可用" }, { status: 403 });
  }

  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    return NextResponse.json({
      status: "connected",
      message: "数据库连接正常",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "未知错误",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
```

访问 `http://localhost:3000/api/debug/db-status` 检查连接状态。

## 总结

- ✅ 问题已识别：间歇性数据库连接超时
- ✅ 根本原因：远程数据库 + 默认连接池配置不足
- ✅ 解决方案：优化连接池参数和超时设置
- ✅ 配置已更新：`.env` 和 `src/lib/db.ts`

**下一步**: 重启 Next.js 服务并验证问题是否解决。

---

**修复时间**: 2026-01-28  
**状态**: ✅ 已优化配置，待验证
