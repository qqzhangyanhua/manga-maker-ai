# 小说封面功能 - 快速参考

## ✅ 数据库迁移已完成

```sql
ALTER TABLE novel_projects ADD COLUMN cover_image TEXT;
```

**验证结果**:
- ✅ 字段已添加 (TEXT, nullable)
- ✅ 现有4个项目，向后兼容
- ✅ Prisma Client 已更新

---

## 🎨 功能说明

### 用户体验
1. 访问小说列表页面 `/novel`
2. 鼠标悬停项目卡片
3. 点击右下角"生成封面"按钮
4. 等待5-10秒，封面自动显示

### 技术实现
- **API**: `POST /api/novel/projects/[id]/generate-cover`
- **提示词优化**: `prompt_optimizer` (~10 算力)
- **图像生成**: `image_generation` (~30-50 算力)
- **存储**: MinIO自动上传

---

## ⚙️ 配置检查清单

- [ ] LLM Provider: `prompt_optimizer` 已配置
- [ ] LLM Provider: `image_generation` 已配置
- [ ] MinIO 服务运行中
- [ ] 用户有足够算力余额 (>60)

---

## 📁 关键文件

```
prisma/
  └── migrations/20260105_add_cover_image/migration.sql  # 迁移SQL

src/
  ├── app/
  │   ├── api/novel/projects/[id]/generate-cover/route.ts  # API
  │   └── (novel)/novel/page.tsx                           # 前端UI

scripts/
  ├── migrate-add-cover-image.ts    # 迁移执行脚本
  ├── verify-migration.ts           # 验证脚本
  └── verify-novel-cover.sh         # 快速检查脚本

docs/
  ├── novel-cover-migration.md              # 详细迁移说明
  └── novel-cover-implementation-report.md  # 完整实施报告
```

---

## 🚀 快速测试

```bash
# 1. 验证迁移
./scripts/verify-novel-cover.sh

# 2. 启动开发服务器
pnpm dev

# 3. 访问
open http://localhost:3000/novel

# 4. 测试API (curl)
curl -X POST http://localhost:3000/api/novel/projects/PROJECT_ID/generate-cover \
  -H "Content-Type: application/json" \
  -H "Cookie: comicai_session=YOUR_TOKEN" \
  -d '{}'
```

---

## 🐛 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 按钮点击无反应 | LLM Provider未配置 | 访问 `/admin/llm-providers` 添加配置 |
| 算力不足错误 | 用户余额<60 | 充值或调整 `credits_cost` |
| 图片无法显示 | MinIO未启动 | 启动MinIO服务 |
| 类型错误 | Prisma Client未更新 | 运行 `npx prisma generate` |

---

**状态**: ✅ 已完成并验证
**日期**: 2026-01-05
**版本**: 1.0.0
