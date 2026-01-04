# 🚀 快速启动指南

## ✅ 安装完成状态

- ✅ 数据库表已创建（5 个新表）
- ✅ Python 依赖已安装
- ✅ Node.js 依赖已安装
- ✅ Prisma Client 已生成
- ✅ 环境变量已配置

## 📋 启动步骤

### 方式 1: 本地开发（推荐，无需 Docker）

#### 1. 启动 Python 后端服务

打开**第一个终端**：

```bash
cd /Users/zhangyanhua/AI/manga-maker-ai/services/novel-backend

# 激活虚拟环境
source .venv/bin/activate

# 启动 FastAPI 服务
uvicorn app.main:app --reload --port 8000
```

**预期输出**：
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

#### 2. 启动 Next.js 前端服务

打开**第二个终端**：

```bash
cd /Users/zhangyanhua/AI/manga-maker-ai

# 启动 Next.js
pnpm dev
```

**预期输出**：
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

#### 3. 访问应用

- **小说创作模块**: http://localhost:3000/novel
- **Python API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

---

### 方式 2: 使用 Docker（需要启动 Docker Desktop）

如果您想使用 Docker：

```bash
# 1. 启动 Docker Desktop
open -a Docker

# 2. 等待 Docker 启动完成（约 30 秒）

# 3. 启动服务
docker-compose up -d novel-backend

# 4. 查看日志
docker-compose logs -f novel-backend

# 5. 启动 Next.js
pnpm dev
```

---

## 🧪 验证安装

### 1. 测试 Python 后端

```bash
# 健康检查
curl http://localhost:8000/health

# 预期输出：
# {"status":"healthy","service":"novel-backend","version":"1.0.0"}
```

### 2. 测试数据库连接

```bash
# 查看小说模块数据表
PGPASSWORD=3MRL8JKw5fn5Njy5 psql -h 111.228.37.74 -U cartoon -d cartoon -c "\dt novel_*"

# 预期输出：
# novel_chapter_versions
# novel_chapters
# novel_projects
# novel_prompt_templates
# novel_quotas
```

### 3. 测试前端页面

访问 http://localhost:3000/novel，应该看到项目列表页面。

---

## 🐛 常见问题

### Q1: Python 后端启动失败

**错误**: `ModuleNotFoundError: No module named 'fastapi'`

**解决**:
```bash
cd services/novel-backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Q2: 数据库连接失败

**错误**: `could not connect to server`

**解决**:
```bash
# 检查数据库连接
PGPASSWORD=3MRL8JKw5fn5Njy5 psql -h 111.228.37.74 -U cartoon -d cartoon -c "SELECT 1"

# 检查 .env 中的 DATABASE_URL
grep DATABASE_URL .env
```

### Q3: OpenAI API 调用失败

**错误**: `401 Unauthorized`

**解决**:
```bash
# 检查 API Key 是否正确
grep OPENAI_API_KEY .env

# 测试 API 连接
curl https://cn.happyapi.org/v1/models \
  -H "Authorization: Bearer sk-UFHncPW9FFEc0HLRMQwcTOpBYJxNyiUKZBkJQ5mSA3uN4kxS"
```

### Q4: 端口被占用

**错误**: `Address already in use`

**解决**:
```bash
# 查看占用 8000 端口的进程
lsof -i :8000

# 杀死进程
kill -9 <PID>

# 或者使用其他端口
uvicorn app.main:app --reload --port 8001
```

---

## 📊 服务状态检查

```bash
# 检查 Python 后端
curl http://localhost:8000/health

# 检查 Next.js 前端
curl http://localhost:3000

# 查看 Python 进程
ps aux | grep uvicorn

# 查看 Node 进程
ps aux | grep next
```

---

## 🎯 下一步

1. **创建第一个小说项目**
   - 访问 http://localhost:3000/novel
   - 点击"新建项目"
   - 填写项目信息

2. **添加章节**
   - 进入项目详情页
   - 点击"+"创建章节
   - 填写章节标题和大纲

3. **AI 生成内容**
   - 在章节编辑器中填写大纲
   - 点击"AI 生成"按钮
   - 实时查看生成进度

---

## 📖 相关文档

- **完整文档**: `README_NOVEL_MODULE.md`
- **实施总结**: `IMPLEMENTATION_SUMMARY.md`
- **API 文档**: http://localhost:8000/docs

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看 Python 后端日志
2. 查看 Next.js 控制台
3. 检查数据库连接
4. 验证环境变量配置

**Python 后端日志**:
```bash
# 如果使用本地启动，查看终端输出
# 如果使用 Docker
docker-compose logs novel-backend
```

**Next.js 日志**:
查看启动 `pnpm dev` 的终端输出

---

**🎉 祝您使用愉快！**
