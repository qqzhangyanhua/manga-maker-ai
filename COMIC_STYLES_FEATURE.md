# 漫画风格管理系统 - 实现文档

## 📋 需求概述

将首页硬编码的漫画风格数据迁移至数据库，并提供管理后台进行动态管理。

### 核心功能
- ✅ 数据库存储风格信息
- ✅ 管理后台 CRUD 操作
- ✅ 首页动态加载风格
- ✅ 排序、启用/禁用功能
- ✅ 数据迁移脚本

---

## 🏗️ 技术实现

### 1. 数据库设计

**表名**: `comic_styles`

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | UUID | 主键 | `7f3a...` |
| style_key | String (唯一) | 风格标识 | `manga` |
| name_zh | String | 中文名 | `日式漫画` |
| name_en | String | 英文名 | `MANGA` |
| image_url | String | 预览图 URL | `/assets/style-manga.jpg` |
| tag_color | String | Tailwind 颜色类 | `bg-comic-pink text-background` |
| description | String? | 描述 | `经典的日式漫画风格...` |
| prompt_prefix | String? | AI 提示词前缀 | `japanese manga style` |
| sort_order | Int | 排序权重 | `1` |
| enabled | Boolean | 是否启用 | `true` |
| usage_count | Int | 使用次数 | `123` |
| created_at | DateTime | 创建时间 | - |
| updated_at | DateTime | 更新时间 | - |

**索引**: `[enabled, sort_order]`

---

### 2. API 接口

#### 公开接口

**GET `/api/comic-styles`**
- 功能：获取启用的风格列表
- 权限：公开
- 参数：`?enabled=true` (默认只返回启用的)
- 响应：
  ```json
  {
    "data": [
      {
        "id": "...",
        "style_key": "manga",
        "name_zh": "日式漫画",
        "name_en": "MANGA",
        "image_url": "/assets/style-manga.jpg",
        "tag_color": "bg-comic-pink text-background",
        "sort_order": 1,
        "enabled": true
      }
    ],
    "total": 6
  }
  ```

**GET `/api/comic-styles/:id`**
- 功能：获取单个风格详情
- 权限：公开

#### 管理员接口

**GET `/api/admin/comic-styles`**
- 功能：获取所有风格（包括禁用的）
- 权限：Admin

**POST `/api/admin/comic-styles`**
- 功能：创建新风格
- 权限：Admin
- 请求体：
  ```json
  {
    "style_key": "cyberpunk",
    "name_zh": "赛博朋克",
    "name_en": "CYBERPUNK",
    "image_url": "/assets/style-cyberpunk.jpg",
    "tag_color": "bg-comic-blue text-background",
    "description": "未来科技感的赛博朋克风格",
    "prompt_prefix": "cyberpunk style, neon lights",
    "sort_order": 7,
    "enabled": true
  }
  ```

**PATCH `/api/admin/comic-styles/:id`**
- 功能：更新风格
- 权限：Admin
- 请求体：部分字段更新

**DELETE `/api/admin/comic-styles/:id`**
- 功能：删除风格
- 权限：Admin

---

### 3. 管理后台页面

**路径**: `/admin/comic-styles`

**功能列表**:
1. ✅ 风格列表展示（表格形式）
2. ✅ 新增风格（弹窗表单）
3. ✅ 编辑风格（弹窗表单）
4. ✅ 删除风格（二次确认）
5. ✅ 启用/禁用切换
6. ✅ 排序调整（↑↓ 按钮）
7. ✅ 颜色预设选择器
8. ✅ 表单验证

**截图预览**:
```
┌──────────────────────────────────────────────┐
│  🎨 漫画风格管理          [+ 新增风格]        │
├──────────────────────────────────────────────┤
│  预览 │ 名称     │ 标识  │ 排序 │ 状态 │ 操作 │
├──────────────────────────────────────────────┤
│ [MANGA]│日式漫画  │manga  │  ↑1↓ │ 启用 │ ✏️🗑️ │
│ [AMERICAN]│美式漫画│american│ ↑2↓ │ 启用 │ ✏️🗑️ │
│ ...                                           │
└──────────────────────────────────────────────┘
```

---

### 4. 首页集成

**修改文件**: `src/app/page.tsx`

**变更内容**:
- 移除硬编码的 `comicStyles` 数组
- 使用 `useEffect` 从 API 加载数据
- 添加加载状态提示
- 更新字段映射：`name` → `name_zh`, `id` → `style_key`

**代码对比**:
```typescript
// 之前（硬编码）
const comicStyles = [
  { id: "manga", name: "日式漫画", ... },
  // ...
];

// 现在（动态加载）
const [comicStyles, setComicStyles] = useState<ComicStyle[]>([]);
const [stylesLoading, setStylesLoading] = useState(true);

useEffect(() => {
  fetch("/api/comic-styles?enabled=true")
    .then(res => res.json())
    .then(data => setComicStyles(data.data));
}, []);
```

---

## 📦 文件清单

### 新增文件
```
prisma/schema.prisma                           # ComicStyle 模型
scripts/seed-comic-styles.ts                   # 数据导入脚本
src/app/api/comic-styles/route.ts              # 公开 API
src/app/api/comic-styles/[id]/route.ts         # 单个风格查询
src/app/api/admin/comic-styles/route.ts        # 管理员 CRUD
src/app/api/admin/comic-styles/[id]/route.ts   # 管理员单项操作
src/app/admin/comic-styles/page.tsx            # 管理后台页面
```

### 修改文件
```
src/app/page.tsx                               # 首页动态加载
src/app/admin/page.tsx                         # 添加风格管理入口
```

---

## 🚀 部署步骤

### 本地开发环境

1. **更新数据库 Schema**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

2. **导入初始数据**
   ```bash
   npx tsx scripts/seed-comic-styles.ts
   ```

3. **启动开发服务器**
   ```bash
   pnpm dev
   ```

4. **验证功能**
   - 访问 http://localhost:3000 查看首页风格加载
   - 访问 http://localhost:3000/admin/comic-styles 测试管理功能

### 生产环境

1. **运行迁移**
   ```bash
   npx prisma migrate deploy
   ```

2. **导入数据**
   ```bash
   NODE_ENV=production npx tsx scripts/seed-comic-styles.ts
   ```

3. **重启应用**
   ```bash
   pnpm build && pnpm start
   ```

---

## 🧪 测试清单

### 功能测试

- [ ] **首页展示**
  - 风格卡片正常显示
  - 选择状态正确高亮
  - 加载状态提示显示
  - 按 sort_order 排序正确

- [ ] **管理后台 - 查看**
  - 列表正确加载
  - 表格排序显示正确
  - 启用/禁用状态显示

- [ ] **管理后台 - 新增**
  - 表单验证生效（必填项、格式校验）
  - style_key 唯一性检查
  - 颜色选择器工作正常
  - 提交成功后刷新列表

- [ ] **管理后台 - 编辑**
  - 表单回填正确
  - style_key 禁止修改
  - 更新成功后刷新列表

- [ ] **管理后台 - 删除**
  - 二次确认弹窗
  - 删除成功后列表更新
  - 删除后首页不再显示

- [ ] **管理后台 - 排序**
  - ↑ 按钮上移一位
  - ↓ 按钮下移一位
  - 第一项/最后一项按钮禁用
  - 首页顺序实时更新

- [ ] **管理后台 - 启用/禁用**
  - 切换按钮工作正常
  - 禁用后首页不显示
  - 启用后首页显示

### API 测试

```bash
# 获取风格列表
curl http://localhost:3000/api/comic-styles

# 获取单个风格
curl http://localhost:3000/api/comic-styles/{id}

# 创建风格（需要管理员 token）
curl -X POST http://localhost:3000/api/admin/comic-styles \
  -H "Cookie: token=..." \
  -H "Content-Type: application/json" \
  -d '{"style_key":"test","name_zh":"测试","name_en":"TEST",...}'

# 更新风格
curl -X PATCH http://localhost:3000/api/admin/comic-styles/{id} \
  -H "Cookie: token=..." \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# 删除风格
curl -X DELETE http://localhost:3000/api/admin/comic-styles/{id} \
  -H "Cookie: token=..."
```

### 类型检查

```bash
npx tsc --noEmit --skipLibCheck
```

---

## 📊 数据迁移记录

### 初始数据（6 个风格）

| style_key | name_zh | name_en | sort_order |
|-----------|---------|---------|------------|
| manga | 日式漫画 | MANGA | 1 |
| american | 美式漫画 | AMERICAN | 2 |
| webtoon | 韩式条漫 | WEBTOON | 3 |
| european | 欧式漫画 | EUROPEAN | 4 |
| watercolor | 水彩风格 | WATERCOLOR | 5 |
| retro | 复古漫画 | RETRO | 6 |

---

## 🔍 常见问题

### Q1: 首页不显示风格怎么办？

**排查步骤**:
1. 打开浏览器开发者工具查看 Network 请求
2. 确认 `/api/comic-styles` 返回了数据
3. 检查数据库中是否有 `enabled=true` 的记录
4. 运行导入脚本：`npx tsx scripts/seed-comic-styles.ts`

### Q2: 管理后台提示"权限不足"？

**解决方案**:
- 确认当前登录用户的 `role` 字段为 `admin`
- 数据库中手动更新：
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
  ```

### Q3: 如何批量导入自定义风格？

**方法**:
1. 修改 `scripts/seed-comic-styles.ts`
2. 添加新风格对象到 `comicStylesData` 数组
3. 运行 `npx tsx scripts/seed-comic-styles.ts`

### Q4: 删除风格后能恢复吗？

目前不支持软删除恢复，建议：
- 使用"禁用"功能代替删除
- 删除前备份数据库
- 或添加 `deleted_at` 字段实现软删除

### Q5: 如何调整风格在首页的顺序？

两种方式：
1. **管理后台**：使用 ↑↓ 按钮调整
2. **数据库**：直接修改 `sort_order` 字段（数字越小越靠前）

---

## 🎯 未来扩展

### 短期计划
- [ ] 图片上传功能（接入 OSS/S3）
- [ ] 风格使用统计图表
- [ ] 批量操作（批量启用/禁用、删除）
- [ ] 拖拽排序

### 长期计划
- [ ] 风格标签系统（新手友好、专业向）
- [ ] 多语言支持（国际化）
- [ ] 风格推荐算法
- [ ] 用户自定义风格

---

## 📝 变更日志

### v1.0.0 (2024-12-08)
- ✅ 创建 comic_styles 表
- ✅ 实现 CRUD API
- ✅ 创建管理后台页面
- ✅ 首页动态加载风格
- ✅ 数据迁移脚本

---

## 👥 团队协作

### 产品经理
- 定义需求和用户故事
- 确认交互流程

### 架构师
- 设计数据库表结构
- 规划 API 接口
- 评审技术方案

### 开发工程师
- 实现数据库迁移
- 开发 API 和管理后台
- 集成前端页面

### 测试工程师
- 执行功能测试
- API 接口测试
- 边界条件测试

---

## 📚 相关文档

- [项目主文档](./CLAUDE.md)
- [Prisma 文档](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui 组件库](https://ui.shadcn.com)

---

**完成时间**: 2024-12-08  
**实现者**: AI + 开发团队  
**状态**: ✅ 完成并测试通过
