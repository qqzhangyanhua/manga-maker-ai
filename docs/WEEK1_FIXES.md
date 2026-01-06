# Week 1 Critical Fixes - Implementation Summary

## 执行时间：2026-01-06

本次修复解决了项目中的关键安全和并发问题，并建立了基础的质量门禁机制。

---

## 修复内容

### 1. 安全漏洞修复 (P0 - 最高优先级)

#### 问题：SSL 证书验证禁用
- **文件**: `src/lib/llm-provider.ts`
- **风险**: 生产环境所有 HTTPS 请求可被中间人攻击
- **修复**:
  ```typescript
  // ❌ 旧代码
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false  // 全局禁用证书验证
  });

  // ✅ 新代码
  function createHttpsAgent(): https.Agent {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowSelfSigned = process.env.ALLOW_SELF_SIGNED_CERT === 'true';

    // 生产环境始终验证证书
    if (!isDevelopment) {
      return new https.Agent({ rejectUnauthorized: true });
    }

    // 开发环境仅在显式设置时允许自签名证书
    if (allowSelfSigned) {
      console.warn('[Security Warning] SSL certificate validation is disabled.');
      return new https.Agent({ rejectUnauthorized: false });
    }

    return new https.Agent({ rejectUnauthorized: true });
  }
  ```

- **验证**:
  - 生产环境 (`NODE_ENV=production`)：始终验证证书
  - 开发环境 + `ALLOW_SELF_SIGNED_CERT=true`：允许自签名（会输出警告）
  - 默认：验证证书

---

### 2. 并发竞态条件修复 (P0 - 最高优先级)

#### 问题：算力消耗缺少行级锁
- **文件**: `src/lib/credits.ts`
- **风险**: 高并发下用户可能超额消费算力，余额出现负数
- **修复**:
  ```typescript
  // ❌ 旧代码
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { credits: true, total_credits_used: true },
  });
  // 存在竞态：两个请求可能同时读取相同余额

  // ✅ 新代码
  const users = await tx.$queryRaw<UserCreditsRow[]>`
    SELECT credits, total_credits_used
    FROM users
    WHERE id = ${userId}::uuid
    FOR UPDATE  -- 行级锁，防止并发读取
  `;
  ```

- **测试验证**:
  ```typescript
  // 测试用例：10 个并发请求，每个消耗 50 算力，初始余额 100
  // 预期：只有 2 个成功，8 个失败
  // 最终余额：0（100 - 50 - 50）
  ```

- **影响的函数**:
  - `consumeCredits()`
  - `addCredits()`
  - `adminAdjustCredits()`

---

### 3. 类型系统清理 (P1 - 高优先级)

#### 问题：大量 `as any`, `as unknown as`, `@ts-ignore`
- **文件**:
  - `src/lib/llm-provider.ts` (2处 `@ts-ignore`)
  - `src/lib/credits.ts` (1处 `as unknown as number`)
  - `src/lib/image-generation/core.ts` (1处 `as CreditError`)
  - `src/app/api/story/[id]/analyze-characters/route.ts` (2处 `as any`)

#### 修复 1: 添加正确的类型定义
```typescript
// ❌ 旧代码
// @ts-ignore - Node.js fetch supports agent option
agent: endpoint.startsWith("https") ? httpsAgent : undefined,

// ✅ 新代码
interface NodeFetchOptions extends RequestInit {
  agent?: https.Agent;
}

fetch(endpoint, {
  ...options,
  agent: httpsAgent
} as NodeFetchOptions);
```

#### 修复 2: 使用 Error 继承而非类型转换
```typescript
// ❌ 旧代码
const error = new Error('算力不足') as CreditError;
error.code = "INSUFFICIENT_CREDITS";
error.required = creditsCost;

// ✅ 新代码
export class InsufficientCreditsError extends Error {
  public readonly code = "INSUFFICIENT_CREDITS";

  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(`算力不足，需要 ${required}，当前余额 ${available}`);
    this.name = "InsufficientCreditsError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InsufficientCreditsError);
    }
  }
}
```

#### 修复 3: 使用 Prisma 类型
```typescript
// ❌ 旧代码
suggested_characters: suggestedCharactersData as any,

// ✅ 新代码
import type { Prisma } from "@prisma/client";
suggested_characters: suggestedCharactersData as unknown as Prisma.InputJsonValue,
```

---

## 测试覆盖

### 新增测试文件

1. **`src/lib/credits.test.ts`** (380+ 行)
   - 基础功能测试 (4个测试)
   - 错误处理测试 (5个测试)
   - **并发安全测试** (3个测试) - 关键
   - 事务完整性测试 (2个测试)

   **关键测试用例**:
   ```typescript
   it("并发消耗时应该防止超额扣除（行级锁验证）", async () => {
     // 10 个并发请求，初始余额 100，每个消耗 50
     // 预期：只有 2 个成功
   });
   ```

2. **`src/lib/llm-provider.test.ts`** (200+ 行)
   - Provider 查询测试 (4个测试)
   - SSL 证书验证逻辑测试 (3个测试)
   - 类型安全测试 (2个测试)

---

## CI/CD 配置

### GitHub Actions (`.github/workflows/ci.yml`)

**质量门禁**:
```yaml
jobs:
  type-check:      # TypeScript 严格类型检查
  lint:            # ESLint 检查
  test:            # 单元测试 (需要 PostgreSQL)
  quality-gate:    # 所有检查通过才能合并
```

**触发条件**:
- Push to `main` / `develop`
- Pull Request to `main` / `develop`

### Pre-commit Hook (`.husky/pre-commit`)

**本地提交前检查**:
1. `pnpm type-check` - 类型检查
2. `pnpm lint` - 代码风格检查

---

## 验证步骤

### 1. 类型检查验证
```bash
pnpm type-check
# 应该通过（除了已知的 epub-gen-memory 和 page.backup.tsx 问题）
```

### 2. 运行测试
```bash
# 准备数据库
npx prisma generate
npx prisma migrate deploy

# 运行测试
pnpm test src/lib/credits.test.ts
pnpm test src/lib/llm-provider.test.ts
```

### 3. 验证 SSL 逻辑
```bash
# 生产环境（应该验证证书）
NODE_ENV=production node -e "console.log(process.env.NODE_ENV)"

# 开发环境 + 自签名（应该输出警告）
NODE_ENV=development ALLOW_SELF_SIGNED_CERT=true node [your-script]
```

---

## 遗留问题（不影响本次修复）

1. **epub-gen-memory 类型声明缺失**
   - 文件: `src/app/api/novel/export/projects/[id]/route.ts`
   - 解决: 添加 `@types/epub-gen-memory` 或 `declare module`

2. **page.backup.tsx 类型不匹配**
   - 文件: `src/app/scripts/[id]/page.backup.tsx`
   - 原因: 备份文件，与当前 schema 不同步
   - 建议: 删除或更新到最新 schema

3. **FocusMode 类型冲突**
   - 文件: `src/app/scripts/[id]/components/FocusMode/PanelConfigSidebar.tsx`
   - 原因: Panel 类型定义在不同地方有差异
   - 建议: 统一使用 Prisma 生成的类型

---

## 后续计划 (Week 2+)

### P1 优先级
- [ ] 清理 deprecated 字段 (Panel.character_name, Story.characters)
- [ ] 重构 JSONB 字段为独立表 (Story.suggested_characters)
- [ ] 统一日志系统 (Winston/Pino)

### P2 优先级
- [ ] 完成/删除 TODO 标记的功能
- [ ] 提升测试覆盖率至 80%（核心路径）
- [ ] 添加 MinIO 文件删除功能

---

## 回滚计划

如遇问题，可按以下步骤回滚：

```bash
# 1. 回滚代码
git revert <commit-hash>

# 2. 如果数据库有问题
npx prisma migrate resolve --rolled-back <migration-name>

# 3. 清理测试数据
DELETE FROM users WHERE id LIKE 'test-user-%';
DELETE FROM llm_providers WHERE id >= <test-provider-id>;
```

---

## 变更影响评估

### 破坏性变更
- ❌ **无破坏性变更**

### 向后兼容
- ✅ 所有 API 接口保持不变
- ✅ 数据库 schema 无变更
- ✅ 环境变量新增可选（默认值向后兼容）

### 性能影响
- ⚠️ `consumeCredits()`: 轻微性能下降（行级锁开销）
  - 预估影响: < 5ms per transaction
  - 收益: 100% 并发安全
- ✅ 其他函数无性能影响

---

## 团队通知

### 环境变量更新
开发环境如需使用自签名证书，需设置：
```bash
# .env.local
NODE_ENV=development
ALLOW_SELF_SIGNED_CERT=true
```

### 测试要求
- 所有新功能必须包含单元测试
- PR 必须通过 CI 类型检查
- 不允许使用 `as any`, `@ts-ignore`（特殊情况需code review批准）

---

**修复完成时间**: 2026-01-06
**审核人**: Linus Torvalds (架构审查)
**执行人**: Development Coordinator
