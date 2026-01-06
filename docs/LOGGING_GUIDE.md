# 日志系统使用指南

## 概览

项目使用 **Winston** 作为统一日志系统，替代原有的 `console.log`。

## 基础使用

### 导入

```typescript
import { logger } from "@/lib/logger";
```

### 日志级别

```typescript
// 错误（最高优先级）
logger.error("Database connection failed", { error: err });

// 警告
logger.warn("Rate limit approaching", { userId, requests: 95 });

// 信息（默认）
logger.info("User logged in", { userId, email });

// HTTP 请求
logger.http("GET /api/users", { status: 200, duration: 45 });

// 调试（开发环境）
logger.debug("Cache hit", { key: "user:123" });
```

### 结构化日志

**好的做法** ✅:
```typescript
logger.info("Payment processed", {
  userId: "abc123",
  amount: 100,
  currency: "USD",
  orderId: "order-456"
});
```

**不好的做法** ❌:
```typescript
console.log("Payment processed for user abc123, amount: 100 USD, order: order-456");
```

---

## 业务日志辅助函数

### 用户操作

```typescript
import { businessLogger } from "@/lib/logger";

businessLogger.userAction("login", userId, {
  ip: "192.168.1.1",
  device: "mobile"
});
```

### 算力操作

```typescript
businessLogger.credits("consumed", userId, 100, {
  description: "生成角色",
  newBalance: 1900
});

businessLogger.credits("added", userId, 1000, {
  action: "recharge",
  orderId: "order-123"
});
```

### AI 生成

```typescript
businessLogger.aiGeneration("story", userId, {
  genre: "scifi",
  length: "medium",
  creditsCost: 50
});
```

### 安全事件

```typescript
businessLogger.security("Failed login attempt", {
  email: "hacker@evil.com",
  ip: "1.2.3.4",
  attempts: 5
});
```

---

## HTTP 请求日志

```typescript
import { logRequest } from "@/lib/logger";

export async function GET(req: Request) {
  const startTime = Date.now();

  try {
    // ... 业务逻辑

    logRequest({
      method: "GET",
      url: "/api/users",
      userId: "abc123",
      status: 200,
      duration: Date.now() - startTime
    });

    return NextResponse.json({ users });
  } catch (error) {
    logRequest({
      method: "GET",
      url: "/api/users",
      status: 500,
      duration: Date.now() - startTime
    });
    throw error;
  }
}
```

---

## 数据库日志

```typescript
import { logDb } from "@/lib/logger";

const startTime = Date.now();
const users = await prisma.user.findMany();
logDb({
  operation: "SELECT",
  table: "users",
  duration: Date.now() - startTime,
  rowCount: users.length
});
```

**自动慢查询警告**: 超过 1000ms 的查询会自动记录为 `warn` 级别。

---

## 环境配置

### 环境变量

```bash
# .env.local

# 日志级别（error | warn | info | http | debug）
LOG_LEVEL=debug  # 开发环境
# LOG_LEVEL=info  # 生产环境

# 环境
NODE_ENV=development
```

### 日志级别说明

| 级别 | 用途 | 开发环境 | 生产环境 |
|------|------|---------|---------|
| `error` | 错误信息 | ✅ | ✅ |
| `warn` | 警告信息 | ✅ | ✅ |
| `info` | 一般信息 | ✅ | ✅ |
| `http` | HTTP 请求 | ✅ | ❌ |
| `debug` | 调试信息 | ✅ | ❌ |

---

## 日志输出格式

### 开发环境（彩色，易读）
```
14:32:15 [info]: User logged in { userId: '123', email: 'user@example.com' }
14:32:16 [warn]: Rate limit approaching { userId: '123', requests: 95 }
14:32:17 [error]: Database connection failed { error: 'Connection timeout' }
```

### 生产环境（JSON，可解析）
```json
{
  "level": "info",
  "message": "User logged in",
  "timestamp": "2026-01-06 14:32:15",
  "userId": "123",
  "email": "user@example.com",
  "service": "manga-maker-ai",
  "environment": "production"
}
```

---

## 日志文件（仅生产环境）

```
logs/
├── error.log        # 仅错误日志
├── combined.log     # 所有日志
├── exceptions.log   # 未捕获异常
└── rejections.log   # Promise rejection
```

**自动轮转**:
- 最大文件大小: 5MB
- 保留文件数: 5 个
- 旧文件自动压缩

---

## 最佳实践

### 1. 使用结构化日志

✅ **好**:
```typescript
logger.info("Order created", {
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  items: order.items.length
});
```

❌ **不好**:
```typescript
logger.info(`Order ${order.id} created by user ${user.id} with ${order.items.length} items`);
```

### 2. 添加上下文信息

```typescript
logger.error("Failed to send email", {
  error: err.message,
  stack: err.stack,
  userId: user.id,
  emailType: "verification",
  attempt: 3
});
```

### 3. 使用正确的日志级别

```typescript
// 错误：需要立即关注
logger.error("Payment processing failed", { error });

// 警告：需要注意但不紧急
logger.warn("Cache miss rate > 50%", { rate: 0.65 });

// 信息：正常业务操作
logger.info("User registered", { userId });

// 调试：开发调试信息
logger.debug("Cache lookup", { key, found: true });
```

### 4. 避免敏感信息

❌ **不要记录**:
```typescript
logger.info("User login", {
  password: "secret123",    // ❌
  apiKey: "sk-xxx",         // ❌
  creditCard: "1234-5678"   // ❌
});
```

✅ **应该记录**:
```typescript
logger.info("User login", {
  userId: "abc123",
  email: "user@example.com",  // ✅ 可以记录（非敏感）
  loginMethod: "password"     // ✅
});
```

---

## 迁移指南

### 替换 console.log

```typescript
// ❌ 旧代码
console.log('[analyze-characters] Generated', count, 'characters');
console.log('[analyze-characters] Duration:', duration, 'ms');

// ✅ 新代码
logger.info('Generated suggested characters', {
  count,
  duration,
  storyId
});
```

### 替换 console.error

```typescript
// ❌ 旧代码
console.error('[analyze-characters] Error:', error);

// ✅ 新代码
logger.error('Failed to analyze characters', {
  error: error.message,
  stack: error.stack,
  storyId,
  userId
});
```

### 替换 console.warn

```typescript
// ❌ 旧代码
console.warn('[Security Warning] SSL certificate validation is disabled');

// ✅ 新代码
logger.warn('[Security Warning] SSL certificate validation is disabled');
```

---

## 监控和分析

### 生产环境日志查询

```bash
# 查找错误日志
grep -i "error" logs/error.log

# 查找特定用户的日志
grep "userId.*abc123" logs/combined.log

# 查找慢查询
grep "Slow query" logs/combined.log
```

### 日志聚合（推荐）

- **ELK Stack**: Elasticsearch + Logstash + Kibana
- **Datadog**: 日志聚合和分析
- **Sentry**: 错误追踪和监控

Winston 的 JSON 格式输出可以直接集成到这些平台。

---

## 测试

### 测试中禁用日志

```typescript
import { logger } from "@/lib/logger";

// 在测试前
logger.silent = true;

// 测试...

// 测试后
logger.silent = false;
```

---

## 常见问题

### Q: 为什么看不到 debug 日志？
A: 生产环境默认 LOG_LEVEL=info，不显示 debug 日志。设置 `LOG_LEVEL=debug` 即可。

### Q: 日志文件在哪里？
A: 仅生产环境会生成日志文件，位于 `logs/` 目录。开发环境只输出到控制台。

### Q: 如何临时提高日志级别？
A: 设置环境变量 `LOG_LEVEL=debug` 并重启应用。

---

**维护人**: Development Team
**最后更新**: 2026-01-06
