# Week 1 修复集成指南

## 部署前准备清单

### 1. 环境变量配置

#### 生产环境 (.env.production)
```bash
# 必须设置
NODE_ENV=production

# SSL 证书验证（生产环境会自动启用，无需设置）
# ALLOW_SELF_SIGNED_CERT=false  # 注释掉或不设置

# 其他必需的环境变量...
DATABASE_URL=postgresql://...
AUTH_SECRET=...
```

#### 开发环境 (.env.local)
```bash
NODE_ENV=development

# 如果使用自签名证书（如本地 LLM API）
ALLOW_SELF_SIGNED_CERT=true

# 其他环境变量...
DATABASE_URL=postgresql://localhost:5432/manga_dev
```

---

### 2. 数据库迁移

**不需要运行新的迁移** - 本次修复没有改变数据库 schema

```bash
# 仅需重新生成 Prisma Client（如有需要）
npx prisma generate
```

---

### 3. 依赖安装

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

---

### 4. 代码集成步骤

#### 步骤 1: 拉取最新代码
```bash
git checkout main
git pull origin main
```

#### 步骤 2: 安装依赖
```bash
pnpm install
```

#### 步骤 3: 生成 Prisma Client
```bash
npx prisma generate
```

#### 步骤 4: 运行类型检查
```bash
pnpm type-check
```

**预期结果**: 除了已知的3个遗留问题（epub-gen-memory, page.backup.tsx, FocusMode），其他应全部通过

#### 步骤 5: 运行测试
```bash
# 确保数据库已启动
docker-compose up -d postgres  # 如果使用 Docker

# 运行测试
pnpm test
```

**预期结果**: 所有新增测试通过

#### 步骤 6: 启动开发服务器
```bash
pnpm dev
```

#### 步骤 7: 验证关键功能

##### 7.1 验证 SSL 证书逻辑
```bash
# 测试生产环境配置
NODE_ENV=production node -e "console.log('ENV:', process.env.NODE_ENV)"

# 测试开发环境 + 自签名
NODE_ENV=development ALLOW_SELF_SIGNED_CERT=true node [test-script]
# 应该看到警告信息：[Security Warning] SSL certificate validation is disabled.
```

##### 7.2 验证算力系统
1. 创建测试用户
2. 尝试消耗算力（调用 LLM API）
3. 检查余额和交易记录

##### 7.3 验证并发安全（可选）
```bash
# 运行并发测试
pnpm test src/lib/credits.test.ts
```

---

## 常见问题 & 故障排查

### Q1: 类型检查失败
```bash
error TS2307: Cannot find module 'epub-gen-memory'
```

**解决方案**:
```bash
# 临时解决（添加类型声明）
echo "declare module 'epub-gen-memory';" > src/types/epub-gen-memory.d.ts

# 或安装类型定义
npm install --save-dev @types/epub-gen-memory
```

---

### Q2: 测试失败 - 数据库连接错误
```bash
Error: Can't reach database server at localhost:5432
```

**解决方案**:
```bash
# 1. 检查数据库是否运行
psql -U postgres -c "SELECT 1"

# 2. 检查 DATABASE_URL 环境变量
echo $DATABASE_URL

# 3. 如果使用 Docker
docker-compose up -d postgres
docker-compose logs postgres
```

---

### Q3: SSL 证书错误（开发环境）
```bash
Error: self signed certificate in certificate chain
```

**解决方案**:
```bash
# 在 .env.local 添加
ALLOW_SELF_SIGNED_CERT=true
```

---

### Q4: Pre-commit hook 阻止提交
```bash
❌ Type check failed. Please fix type errors before committing.
```

**解决方案**:
1. 修复所有类型错误
2. 或临时跳过（**不推荐**）:
   ```bash
   git commit --no-verify -m "message"
   ```

---

## 回滚计划

### 场景 1: 发现严重 Bug

```bash
# 1. 回滚到上一个稳定版本
git revert HEAD
git push origin main

# 2. 通知团队
# 在 Slack/钉钉发送通知

# 3. 创建 hotfix 分支
git checkout -b hotfix/revert-week1-fixes
```

### 场景 2: 性能问题

如果发现 `consumeCredits()` 性能严重下降：

```typescript
// 临时回退到旧实现（移除 FOR UPDATE）
const users = await tx.$queryRaw<UserCreditsRow[]>`
  SELECT credits, total_credits_used
  FROM users
  WHERE id = ${userId}::uuid
  -- FOR UPDATE  // 注释掉行级锁
`;
```

**注意**: 这会重新引入并发风险，仅作应急使用

---

## 团队协作指南

### 代码审查清单

PR Reviewer 应检查：
- [ ] 类型检查通过 (`pnpm type-check`)
- [ ] 测试通过 (`pnpm test`)
- [ ] 没有使用 `as any`, `@ts-ignore`（特殊情况需说明）
- [ ] 没有禁用 SSL 证书验证
- [ ] 并发操作使用了事务和行级锁
- [ ] 新增代码有对应测试

### Git Commit 规范

```bash
# 好的 commit message
fix(security): 启用生产环境 SSL 证书验证
feat(credits): 添加并发安全的行级锁
test(credits): 添加并发消耗测试用例

# 不好的 commit message
修复bug
更新代码
```

---

## 监控与告警

### 建议添加的监控指标

1. **算力系统健康度**
   ```sql
   -- 检查是否有负余额用户（理论上不应该存在）
   SELECT id, email, credits FROM users WHERE credits < 0;

   -- 检查余额与交易记录是否一致
   SELECT u.id, u.credits,
          COALESCE(SUM(ct.amount), 0) AS calculated_balance
   FROM users u
   LEFT JOIN credit_transactions ct ON ct.user_id = u.id
   GROUP BY u.id, u.credits
   HAVING u.credits != COALESCE(SUM(ct.amount), 0);
   ```

2. **SSL 证书验证状态**
   ```bash
   # 检查日志中是否有 [Security Warning]
   grep "Security Warning" logs/app.log
   ```

3. **性能监控**
   ```typescript
   // 监控 consumeCredits 执行时间
   const startTime = Date.now();
   await consumeCredits(...);
   const duration = Date.now() - startTime;

   if (duration > 100) {
     logger.warn('Slow consumeCredits', { duration, userId });
   }
   ```

---

## 培训材料

### 新增 Error 类使用示例

**捕获算力不足错误**:
```typescript
import { InsufficientCreditsError } from "@/lib/credits";

try {
  await consumeCredits({ userId, amount: 100 });
} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    // 特定处理：提示用户充值
    return NextResponse.json({
      error: error.message,
      required: error.required,
      available: error.available,
      recharge_url: "/recharge"
    }, { status: 429 });
  }
  throw error;
}
```

### SSL 证书配置示例

**测试环境配置**:
```bash
# docker-compose.yml
services:
  api:
    environment:
      - NODE_ENV=development
      - ALLOW_SELF_SIGNED_CERT=true  # 仅测试环境

  api-production:
    environment:
      - NODE_ENV=production
      # 不设置 ALLOW_SELF_SIGNED_CERT
```

---

## 下一步建议

### 立即执行（本周）
1. ✅ 运行类型检查修复遗留问题
2. ✅ 部署到测试环境验证
3. ✅ 监控生产环境性能指标

### 短期计划（2周内）
1. 清理 deprecated 字段
2. 重构 JSONB 字段
3. 提升测试覆盖率至 50%

### 长期计划（1个月内）
1. 完成所有 TODO 标记的功能
2. 建立完整的监控系统
3. 编写技术文档和 API 文档

---

**最后更新**: 2026-01-06
**维护人**: Development Team
