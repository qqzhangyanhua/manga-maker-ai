# Week 1 修复 - 快速参考卡片

## 🚨 关键修复内容

### 1. SSL 证书验证 ✅
**之前**: 全局禁用 SSL 验证（安全漏洞）
**之后**: 生产环境强制验证，开发环境可配置

```bash
# 生产环境：自动启用验证
NODE_ENV=production

# 开发环境 + 自签名证书
NODE_ENV=development
ALLOW_SELF_SIGNED_CERT=true
```

---

### 2. 并发安全 ✅
**之前**: 缺少行级锁，存在竞态条件
**之后**: 使用 `SELECT FOR UPDATE` 防止并发超额扣除

```sql
-- 现在所有算力操作都有行级锁
SELECT * FROM users WHERE id = ? FOR UPDATE
```

---

### 3. 类型安全 ✅
**之前**: 4个 `as any`, 2个 `@ts-ignore`
**之后**: 全部移除，使用正确的类型

```typescript
// 新增 Error 类
import { InsufficientCreditsError } from "@/lib/credits";

try {
  await consumeCredits(...);
} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    // error.required, error.available
  }
}
```

---

## 📋 快速验证步骤

### 本地验证
```bash
# 1. 类型检查
pnpm type-check

# 2. 运行测试
pnpm test

# 3. 启动开发服务器
pnpm dev
```

### 测试环境验证
```bash
# 1. 部署
git push origin develop

# 2. 健康检查
curl https://test-api.example.com/health

# 3. 监控日志
tail -f logs/app.log | grep "Security Warning"
```

---

## 🔍 常见问题

### Q: 类型检查报错怎么办？
A: 除了 3 个已知遗留问题（epub-gen-memory, page.backup.tsx, FocusMode），其他应全部通过。

### Q: 如何跳过 pre-commit hook？
A: `git commit --no-verify`（**不推荐**，仅紧急情况）

### Q: 性能下降怎么办？
A: 预期 `consumeCredits()` 增加 ~4ms，可接受。如超过 50ms，联系团队。

---

## 📊 关键指标

| 指标 | 目标 | 如何监控 |
|------|------|---------|
| 算力系统错误率 | < 0.1% | 日志 + Sentry |
| `consumeCredits()` p99 延迟 | < 50ms | APM 工具 |
| SSL 错误 | 0 | `grep "Security Warning" logs/app.log` |
| 负余额用户数 | 0 | SQL 查询 |

---

## 🚀 部署清单

- [ ] 代码已合并到 main
- [ ] 所有测试通过
- [ ] 类型检查通过
- [ ] 环境变量已配置
- [ ] 团队已通知
- [ ] 监控已配置
- [ ] 回滚方案已准备

---

## 📞 紧急联系

- **技术问题**: #dev-team
- **部署问题**: #devops
- **生产事故**: @on-call-engineer

---

**版本**: v1.1.0-week1-fixes
**部署日期**: 2026-01-06
**状态**: ✅ 准备就绪
