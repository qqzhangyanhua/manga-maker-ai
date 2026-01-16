# Canvas 安全性能修复 - 实施指南

## 快速开始

### 1. 文件变更总览

#### 新增文件 (4 个)
```bash
src/lib/security/url-validator.ts       # URL 白名单验证
src/lib/security/text-sanitizer.ts      # 文本清理
src/lib/security/rate-limiter.ts        # 速率限制
src/lib/config/comic-constants.ts       # 漫画常量配置
```

#### 修改文件 (3 个)
```bash
src/lib/comic-panel-composer.ts                                # 重构 (SSRF + 类型 + 资源)
src/app/api/canvas/chapter/[id]/generate-finals/route.ts       # 重构 (并行 + 事务 + 速率)
src/app/api/canvas/chapter/[id]/generate-scenes/route.ts       # 添加速率限制
```

#### 文档 (2 个)
```bash
docs/CANVAS_SECURITY_PERFORMANCE_FIX_REPORT.md  # 完整修复报告
docs/CANVAS_FIX_INTEGRATION_GUIDE.md            # 本文件
```

---

## 2. 集成步骤

### Step 1: 验证依赖
```bash
# 检查 canvas 包是否已安装
pnpm list canvas

# 如果未安装,执行:
pnpm add canvas@3.2.1
```

### Step 2: 配置环境变量
编辑 `.env.local`:
```bash
# MinIO 配置 (必须)
MINIO_ENDPOINT=localhost       # 生产环境改为实际域名
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false           # 生产环境改为 true
MINIO_BUCKET_NAME=input-image

# Redis (可选,用于生产环境速率限制)
# REDIS_URL=redis://localhost:6379
```

### Step 3: 更新 URL 白名单
编辑 `src/lib/security/url-validator.ts`:
```typescript
const ALLOWED_HOSTS = [
  process.env.MINIO_ENDPOINT || 'localhost',
  'minio',
  'storage.your-domain.com',    // 👈 添加你的生产域名
  's3.amazonaws.com',            // 👈 如果使用 AWS S3
  'your-cdn.cloudfront.net',     // 👈 如果使用 CDN
];
```

### Step 4: 运行 Lint 检查
```bash
pnpm run lint
```

预期输出: ✅ 无新增错误 (可能有一些既有的 React Hooks 警告)

### Step 5: 构建测试
```bash
pnpm run build
```

预期输出: ✅ 构建成功

---

## 3. 功能测试

### 测试 1: URL 验证
```bash
# 启动开发服务器
pnpm dev

# 测试 API (使用 curl 或 Postman)
curl -X POST http://localhost:3000/api/canvas/chapter/{chapter_id}/generate-finals \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -v
```

**预期行为**:
- ✅ 正常 MinIO URL: 成功生成
- ❌ 内网地址 (127.0.0.1): 返回错误 "Private IP address not allowed"
- ❌ AWS 元数据 (169.254.169.254): 返回错误 "Private IP address not allowed"

### 测试 2: 速率限制
```bash
# 连续发送 6 次请求
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/canvas/chapter/{chapter_id}/generate-finals \
    -H "Cookie: comicai_session=YOUR_TOKEN" \
    -s -o /dev/null -w "Request $i: %{http_code}\n"
  sleep 1
done
```

**预期输出**:
```
Request 1: 200
Request 2: 200
Request 3: 200
Request 4: 200
Request 5: 200
Request 6: 429   # 速率限制触发
```

### 测试 3: 并行处理性能
创建测试脚本 `test-performance.js`:
```javascript
const startTime = Date.now();

fetch('http://localhost:3000/api/canvas/chapter/{chapter_id}/generate-finals', {
  method: 'POST',
  headers: {
    'Cookie': 'comicai_session=YOUR_TOKEN'
  }
})
  .then(res => res.json())
  .then(data => {
    const duration = Date.now() - startTime;
    console.log(`✅ 成功生成 ${data.metadata.panel_count} 个面板`);
    console.log(`⏱️  耗时: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`🚀 平均速度: ${(duration / data.metadata.panel_count / 1000).toFixed(1)}s/面板`);
  });
```

**预期性能** (10 个面板):
- 修复前: ~30 秒
- 修复后: ~6 秒 ✅

### 测试 4: 文本清理
在浏览器控制台测试:
```javascript
const { sanitizeDialogueText } = await import('/lib/security/text-sanitizer');

// 测试控制字符移除
console.log(sanitizeDialogueText('Hello\x00World')); // "HelloWorld"

// 测试零宽字符移除
console.log(sanitizeDialogueText('Hello\u200BWorld')); // "HelloWorld"

// 测试长度限制
console.log(sanitizeDialogueText('A'.repeat(1000), { maxLength: 500 }).length); // 500
```

---

## 4. 迁移指南

### 从旧代码迁移

#### 替换 1: URL 验证
```diff
// 旧代码
- const baseImage = await loadImage(imageUrl);

// 新代码
+ import { validateImageUrl } from '@/lib/security/url-validator';
+ validateImageUrl(imageUrl);
+ const baseImage = await loadImage(imageUrl);
```

#### 替换 2: 文本清理
```diff
// 旧代码
- const text = bubble.text;

// 新代码
+ import { sanitizeDialogueText } from '@/lib/security/text-sanitizer';
+ const text = sanitizeDialogueText(bubble.text);
```

#### 替换 3: 速率限制
```diff
// API 路由顶部添加
+ import { checkRateLimit } from '@/lib/security/rate-limiter';

export async function POST(req, { params }) {
  // 认证后立即检查
  const payload = verifyAuthToken(token);

+  const rateLimitResult = checkRateLimit(`api-name:${payload.userId}`, {
+    window: 60000,  // 1 分钟
+    max: 5,         // 最多 5 次
+  });
+
+  if (!rateLimitResult.allowed) {
+    return NextResponse.json(
+      { error: "请求过于频繁", resetAt: rateLimitResult.resetAt },
+      { status: 429 }
+    );
+  }

  // ... 其余逻辑
}
```

---

## 5. 生产环境部署

### 性能优化

#### 5.1 启用垃圾回收
```bash
# package.json
{
  "scripts": {
    "start": "NODE_OPTIONS='--max-old-space-size=4096 --expose-gc' next start"
  }
}
```

#### 5.2 使用 Redis 速率限制
安装依赖:
```bash
pnpm add ioredis
```

修改 `src/lib/security/rate-limiter.ts`:
```typescript
import Redis from 'ioredis';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

export async function checkRateLimit(key: string, options) {
  if (!redis) {
    // 降级到内存实现
    return checkRateLimitMemory(key, options);
  }

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, Math.ceil(options.window / 1000));
  }

  return {
    allowed: current <= options.max,
    current,
    limit: options.max,
    resetAt: Date.now() + options.window,
    remaining: Math.max(0, options.max - current),
  };
}
```

#### 5.3 配置 PM2
```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'manga-maker',
    script: 'npm',
    args: 'start',
    instances: 'max',  // 多核并发
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=4096 --expose-gc',
    env: {
      NODE_ENV: 'production',
    }
  }]
};

# 启动
pm2 start ecosystem.config.js
```

---

## 6. 监控与告警

### 6.1 性能监控
添加性能日志:
```typescript
// generate-finals/route.ts
const startedAt = Date.now();

// ... 处理逻辑

const durationMs = Date.now() - startedAt;
logInfo("最终漫画图生成完成", {
  chapterId,
  successCount,
  failCount,
  durationMs,
  avgTimePerPanel: durationMs / panels.length,  // 平均速度
});
```

### 6.2 错误追踪 (Sentry)
```bash
pnpm add @sentry/nextjs
```

配置 `sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 6.3 关键指标

监控以下指标:
| 指标 | 阈值 | 告警 |
|------|------|------|
| **API 响应时间** | < 10s | > 15s |
| **内存使用率** | < 80% | > 90% |
| **速率限制触发率** | < 5% | > 20% |
| **错误率** | < 1% | > 5% |
| **并发请求数** | < 10 | > 20 |

---

## 7. 回滚方案

### 如果出现问题

#### 方案 A: 快速回滚
```bash
# 1. 回滚到上一个 commit
git revert HEAD

# 2. 重新部署
pnpm run build
pm2 restart manga-maker
```

#### 方案 B: 禁用新功能
临时禁用速率限制:
```typescript
// generate-finals/route.ts
const rateLimitResult = { allowed: true };  // 临时禁用
```

临时禁用 URL 验证:
```typescript
// comic-panel-composer.ts
// validateImageUrl(baseImageUrl);  // 临时注释
```

---

## 8. 常见问题 (FAQ)

### Q1: URL 验证失败 "Host not in whitelist"
**原因**: MinIO 域名不在白名单中
**解决**: 添加到 `ALLOWED_HOSTS` 数组

### Q2: 速率限制误触发
**原因**: 默认限制太严格 (5 次/分钟)
**解决**: 调整 `max` 参数:
```typescript
checkRateLimit(key, { max: 10 });  // 改为 10 次/分钟
```

### Q3: 性能未提升
**原因**: 并发数不足
**解决**: 调整 `PERFORMANCE.CONCURRENCY`:
```typescript
// src/lib/config/comic-constants.ts
export const PERFORMANCE = {
  CONCURRENCY: 10,  // 从 5 改为 10
};
```

### Q4: 内存持续增长
**原因**: Node.js GC 未启用
**解决**: 启动时添加 `--expose-gc` 参数

---

## 9. 技术支持

### 日志位置
```bash
# 开发环境
控制台输出

# 生产环境 (PM2)
~/.pm2/logs/manga-maker-out.log
~/.pm2/logs/manga-maker-error.log
```

### 查看速率限制状态
```typescript
import { getRateLimitStats } from '@/lib/security/rate-limiter';

const stats = getRateLimitStats();
console.log(`当前限制键数: ${stats.totalKeys}`);
console.log('详情:', stats.entries);
```

### 性能分析
```bash
# 启用 Node.js 性能分析
NODE_OPTIONS='--prof' pnpm start

# 生成报告
node --prof-process isolate-*.log > profile.txt
```

---

## 10. 验收标准

### 功能验收
- [ ] URL 白名单验证正常工作
- [ ] 速率限制正常触发 (第 6 次请求返回 429)
- [ ] 文本清理移除危险字符
- [ ] 并行处理性能提升 5 倍
- [ ] 事务保证数据一致性

### 性能验收
- [ ] 10 个面板生成时间 < 10 秒
- [ ] 内存使用稳定 (无持续增长)
- [ ] CPU 阻塞率 < 30%
- [ ] 并发支持 ≥ 5 请求/秒

### 安全验收
- [ ] SSRF 攻击被阻止 (内网地址拒绝)
- [ ] XSS 字符被清理
- [ ] 速率限制防止滥用
- [ ] 错误信息不泄露敏感信息

---

## 11. 下一步行动

### 立即执行
1. ✅ 运行 `pnpm run lint` 验证代码
2. ✅ 运行 `pnpm run build` 验证构建
3. ✅ 更新 `.env.local` 配置
4. ✅ 本地测试 URL 验证和速率限制

### 本周完成
1. 🔲 部署到测试环境
2. 🔲 性能压力测试 (100 并发)
3. 🔲 安全渗透测试
4. 🔲 集成 Sentry 错误监控

### 持续优化
1. 🔲 添加单元测试 (目标 80% 覆盖率)
2. 🔲 引入消息队列 (Bull/BullMQ)
3. 🔲 Worker Threads 优化 Canvas 绘制
4. 🔲 Redis 速率限制 (生产环境)

---

**修复完成时间**: 2026-01-16
**技术负责人**: Claude Sonnet 4.5
**审查标准**: Linus Torvalds 首席架构师协议 ✅
