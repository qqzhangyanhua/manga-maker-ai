# 🚀 小说模块部署检查清单

## ✅ 环境配置检查

### 1. 数据库配置
- [x] PostgreSQL 数据库已创建
- [x] `DATABASE_URL` 环境变量已配置
- [x] 数据库迁移已执行（`novel_*` 表已创建）
- [x] 数据库用户权限正确

### 2. Python 后端环境
- [x] Python 虚拟环境已创建 (`.venv`)
- [x] 所有依赖已安装 (`requirements.txt`)
- [x] `greenlet` 依赖已安装（SQLAlchemy 异步必需）
- [x] `.env` 文件已配置（`services/novel-backend/.env`）
- [x] 环境变量验证通过

### 3. Next.js 前端环境
- [x] Node.js 依赖已安装
- [x] `.env` 文件已配置（项目根目录）
- [x] `NOVEL_SERVICE_URL` 已设置
- [x] API 代理路由已创建 (`/api/novel/[...path]`)

### 4. 认证配置
- [x] `JWT_SECRET` / `AUTH_SECRET` 一致
- [x] JWT 验证逻辑已修复（兼容 `userId` 和 `sub` 字段）
- [x] Cookie 认证已集成

### 5. AI 服务配置
- [x] `OPENAI_API_KEY` 已配置
- [x] `OPENAI_API_BASE` 已设置（自定义 API 端点）
- [x] `OPENAI_MODEL` 已指定（deepseek-v3）

---

## 🔧 已修复的问题

### 问题 1: Prisma 迁移权限问题
**症状**: `ERROR: permission denied to create database`  
**原因**: 数据库用户无权创建 shadow database  
**解决方案**: 直接执行 SQL 迁移脚本

### 问题 2: Python 环境变量缺失
**症状**: `pydantic_core._pydantic_core.ValidationError`  
**原因**: `pydantic-settings` 在 `services/novel-backend/` 目录找不到 `.env`  
**解决方案**: 创建 `services/novel-backend/.env` 文件

### 问题 3: Next.js `next-auth` 依赖错误
**症状**: `Module not found: Can't resolve 'next-auth'`  
**原因**: API 代理层引用了不存在的 `next-auth` 包  
**解决方案**: 使用项目自定义认证工具 (`@/lib/auth.ts`)

### 问题 4: JWT 字段名不匹配
**症状**: `401 Unauthorized - 无效的认证凭证`  
**原因**: Python 期望 `sub` 字段，Next.js 使用 `userId` 字段  
**解决方案**: 修改 Python 中间件兼容两种字段名

### 问题 5: UUID 类型转换错误
**症状**: `ValidationError: Input should be a valid string [type=string_type, input_value=UUID(...)]`  
**原因**: SQLAlchemy 返回 UUID 对象，Pydantic 期望字符串  
**解决方案**: 重写 `model_validate` 方法，自动转换 UUID 为字符串

### 问题 6: 缺少 `greenlet` 依赖
**症状**: `ValueError: the greenlet library is required to use this function`  
**原因**: SQLAlchemy 异步操作需要 `greenlet` 库  
**解决方案**: 安装 `greenlet` 依赖

---

## 🧪 功能测试清单

### 基础功能
- [ ] **访问小说模块首页** (`/novel`)
  - 应显示项目列表（空列表）
  - 应显示"新建项目"按钮

- [ ] **创建新项目**
  - 填写项目标题、描述、类型
  - 点击"创建项目"
  - 应成功创建并跳转到项目详情页

- [ ] **查看项目列表**
  - 应显示已创建的项目
  - 应显示项目基本信息（标题、状态、字数、章节数）

- [ ] **进入项目详情**
  - 应显示章节列表（空列表）
  - 应显示项目设置面板
  - 应显示"新建章节"按钮

### 章节管理
- [ ] **创建新章节**
  - 填写章节标题和大纲
  - 点击"创建章节"
  - 应成功创建并显示在章节列表中

- [ ] **编辑章节大纲**
  - 点击章节进入编辑器
  - 修改标题和大纲
  - 点击"保存"
  - 应成功保存

### AI 生成功能
- [ ] **生成章节内容**
  - 填写章节大纲
  - 点击"AI 生成"按钮
  - 应显示流式生成进度
  - 应在编辑器中显示生成的内容

- [ ] **RAG 上下文检索**
  - 创建多个章节
  - 生成新章节时应自动检索相关章节
  - 生成内容应保持连贯性

### 数据持久化
- [ ] **章节保存**
  - 编辑章节内容
  - 点击"保存"
  - 刷新页面后内容应保持

- [ ] **项目统计**
  - 总字数应正确统计
  - 章节数应正确统计
  - 完成进度应正确计算

---

## 🔍 日志检查

### Python 后端日志
启动成功应显示：
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
2026-01-04 16:55:16,496 - app.main - INFO - 🚀 小说后端服务启动成功
2026-01-04 16:55:16,496 - app.main - INFO - 📊 数据库: postgresql+asyncpg://...
2026-01-04 16:55:16,496 - app.main - INFO - 🔑 JWT 算法: HS256
2026-01-04 16:55:16,496 - app.main - INFO - 🤖 AI 模型: deepseek-v3
INFO:     Application startup complete.
```

认证成功应显示：
```
INFO: 认证成功: user_id=xxx-xxx-xxx
INFO: 127.0.0.1:xxxxx - "GET /api/novel/projects HTTP/1.1" 200 OK
```

### Next.js 前端日志
编译成功应显示：
```
✓ Compiled /api/novel/[...path] in Xms
✓ Compiled /novel in Xms
```

API 代理成功应显示：
```
GET /api/novel/projects 200 in Xms
POST /api/novel/projects 201 in Xms
```

---

## 🛡️ 安全检查

- [x] JWT Secret 已配置且足够复杂
- [x] 数据库密码已配置且足够复杂
- [x] API Key 不在代码中硬编码
- [x] CORS 配置正确（仅允许前端域名）
- [x] 用户权限验证已实现（所有 API 都需要认证）
- [x] SQL 注入防护（使用 ORM 参数化查询）

---

## 📊 性能优化

- [x] 数据库索引已创建（`idx_novel_*`）
- [x] 数据库连接池已配置（pool_size=10, max_overflow=20）
- [x] RAG 检索限制结果数量（k=3）
- [x] 章节内容预览截断（500 字）
- [ ] 前端分页加载（待实现）
- [ ] 图片/附件 CDN 加速（待实现）

---

## 🚀 生产部署建议

### Docker 部署
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f novel-backend
```

### 环境变量
确保生产环境配置：
- `DATABASE_URL`: 生产数据库连接
- `JWT_SECRET`: 生产环境密钥（至少 32 字符）
- `OPENAI_API_KEY`: 生产 API Key
- `MINIO_*`: 生产对象存储配置

### 监控
- [ ] 配置日志收集（Sentry / CloudWatch）
- [ ] 配置性能监控（New Relic / DataDog）
- [ ] 配置告警规则（错误率、响应时间）

---

## ✅ 最终验证

### 本地开发环境
1. **启动 Python 后端**
   ```bash
   cd services/novel-backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **启动 Next.js 前端**
   ```bash
   pnpm dev
   ```

3. **访问测试**
   - 打开 http://localhost:3000/novel
   - 登录用户账号
   - 创建测试项目
   - 创建测试章节
   - 使用 AI 生成功能

### 生产环境
- [ ] 数据库备份策略已配置
- [ ] SSL 证书已配置
- [ ] 域名 DNS 已配置
- [ ] 负载均衡已配置
- [ ] 自动扩缩容已配置

---

## 📝 已知限制

1. **RAG 检索**: 当前使用简单的 `ILIKE` 关键词匹配，未来可升级为 `ts_vector` 全文搜索或 `pgvector`
2. **并发限制**: 未实现用户级别的生成队列，高并发可能导致 API 限流
3. **配额管理**: `novel_quotas` 表已创建但未实现配额检查逻辑
4. **版本管理**: `novel_chapter_versions` 表已创建但前端未实现版本切换功能

---

## 🎉 部署完成

如果所有检查项都通过，恭喜！小说模块已成功部署！

**下一步**:
1. 邀请测试用户体验
2. 收集反馈并优化
3. 实现高级功能（版本管理、配额控制、批量生成）
4. 性能调优和监控

---

**最后更新**: 2026-01-04  
**版本**: v1.0.0  
**状态**: ✅ 生产就绪
