# 角色准备功能详细测试计划

## 📋 测试环境准备

### 前置条件

1. **数据库迁移**
   ```bash
   # 确认 source_type 和 source_reference 字段已添加
   psql -h 111.228.37.74 -U cartoon -d cartoon -p 5432 \
     -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'characters' AND column_name IN ('source_type', 'source_reference');"
   ```
   预期输出：
   ```
   column_name      | data_type
   -----------------+-----------
   source_type      | text
   source_reference | jsonb
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```
   预期输出：`ready - started server on 0.0.0.0:3000, url: http://localhost:3000`

3. **准备测试数据**
   - 需要一个已登录的用户账号
   - 需要至少一个小说项目（Novel Project）
   - 需要至少一个时间线（Canvas Timeline）
   - 需要至少一个章节（Timeline Chapter）

---

## 🧪 测试用例

### 测试用例 1: 访问无限画布页面

**目标**: 验证角色准备按钮是否正确显示

**操作步骤**:
1. 打开浏览器访问 `http://localhost:3000`
2. 登录系统（输入邮箱和密码）
3. 导航到时间线列表页面
   - 路由: `/canvas` 或项目列表页面
4. 点击某个时间线项目的"打开画布"按钮
   - 路由: `/canvas/timeline/[timelineId]`
5. 等待无限画布加载完成

**预期结果**:
- ✅ 页面左上角显示"整体进度"面板
- ✅ 面板中有以下按钮（从左到右）：
  - ✨ "整体进度"标题
  - ➕ "添加章节"按钮（Plus 图标）
  - ⚙️ "设置"按钮（Settings 图标）
  - 👥 **"角色准备"按钮（Users 图标）** ← 新增
  - （批量模式按钮，批量模式下显示）

**截图位置**: `测试截图/1-无限画布页面.png`

---

### 测试用例 2: 打开角色准备抽屉（无数据状态）

**目标**: 验证抽屉打开和空状态显示

**前置条件**: 章节没有关联任何角色，小说项目也没有角色数据

**操作步骤**:
1. 在无限画布页面
2. 点击左上角的 👥 "角色准备"按钮（Users 图标）

**预期结果**:
- ✅ 从右侧滑入一个 600px 宽的抽屉
- ✅ 抽屉标题: "角色准备"
- ✅ 抽屉描述: "管理章节角色资产，升级小说角色为可复用的角色实体"
- ✅ **章节角色区域**:
  - 标题: "章节角色 (0)"
  - 内容: 灰色边框框，显示"当前章节暂无角色"
- ✅ **小说角色区域**:
  - 标题: "待升级的小说角色 (0)"
  - 内容: 灰色边框框，显示"所有小说角色已升级"
- ✅ **无智能提示显示**（因为没有问题）

**截图位置**: `测试截图/2-抽屉空状态.png`

---

### 测试用例 3: 准备测试数据（创建小说角色）

**目标**: 在数据库中创建小说角色数据

**操作步骤**:
1. 使用 Prisma Studio 或 SQL 直接添加测试数据
   ```sql
   -- 获取当前时间线关联的小说项目ID
   SELECT novel_project_id FROM canvas_timelines WHERE id = 'YOUR_TIMELINE_ID';

   -- 更新小说项目的 characters 字段
   UPDATE novel_projects
   SET characters = '[
     {
       "name": "张三",
       "role": "protagonist",
       "description": "主角，正义感强的侦探，30岁左右",
       "traits": ["聪明", "勇敢", "细心"],
       "relationships": {}
     },
     {
       "name": "李四",
       "role": "antagonist",
       "description": "反派，神秘的幕后黑手",
       "traits": ["狡猾", "冷酷"],
       "relationships": {}
     },
     {
       "name": "王五",
       "role": "supporting",
       "description": "配角，张三的搭档警察",
       "traits": ["忠诚", "幽默"],
       "relationships": {}
     }
   ]'::jsonb
   WHERE id = 'YOUR_NOVEL_PROJECT_ID';
   ```

2. 刷新浏览器页面
3. 再次点击 👥 "角色准备"按钮

**预期结果**:
- ✅ **智能提示框显示**（蓝色背景）:
  - 图标: InfoIcon
  - 标题: "检测到未完成的角色准备"
  - 描述: "发现 3 个小说角色待升级"
  - 按钮: "知道了，不再提示"

- ✅ **章节角色区域**: 仍然为空（"当前章节暂无角色"）

- ✅ **小说角色区域**:
  - 标题: "待升级的小说角色 (3)"
  - 显示 3 个角色卡片：

  **张三卡片**（蓝色边框 - 主角）:
  - 顶部: "张三" + 蓝色徽章"主角"
  - 中间: "主角，正义感强的侦探，30岁左右"（最多 2 行）
  - 特质: "聪明" "勇敢" "细心"（灰色边框徽章）
  - 底部: "升级为角色资产"按钮（蓝色）

  **李四卡片**（红色边框 - 反派）:
  - 顶部: "李四" + 红色徽章"反派"
  - 中间: "反派，神秘的幕后黑手"
  - 特质: "狡猾" "冷酷"
  - 底部: "升级为角色资产"按钮

  **王五卡片**（绿色边框 - 配角）:
  - 顶部: "王五" + 绿色徽章"配角"
  - 中间: "配角，张三的搭档警察"
  - 特质: "忠诚" "幽默"
  - 底部: "升级为角色资产"按钮

**截图位置**:
- `测试截图/3-智能提示显示.png`
- `测试截图/4-小说角色列表.png`

---

### 测试用例 4: 测试智能提示关闭和持久化

**目标**: 验证 LocalStorage 持久化功能

**操作步骤**:
1. 在角色准备抽屉中
2. 点击智能提示框中的 "知道了，不再提示" 按钮
3. 关闭抽屉（点击抽屉外部或 ESC 键）
4. 再次打开角色准备抽屉

**预期结果**:
- ✅ 智能提示框消失
- ✅ 再次打开抽屉时，智能提示框不再显示
- ✅ 打开浏览器开发者工具 → Application → Local Storage
  - 查找 key: `character-preparation-hint-dismissed-{chapterId}`
  - value: 当前时间戳

**验证 LocalStorage**:
```javascript
// 在浏览器 Console 中执行
Object.keys(localStorage).filter(k => k.includes('character-preparation'))
// 应该输出: ["character-preparation-hint-dismissed-xxx"]
```

**截图位置**: `测试截图/5-提示关闭后.png`

---

### 测试用例 5: 升级小说角色（不生成图片）

**目标**: 测试基础升级功能

**操作步骤**:
1. 在"待升级的小说角色"区域
2. 点击"张三"卡片的 **"升级为角色资产"** 按钮
3. 弹出对话框后，观察内容：
   - 标题: "升级角色为资产"
   - 角色名: "张三" + "主角"徽章
   - 角色描述: "主角，正义感强的侦探，30岁左右"
   - 角色特质: "聪明" "勇敢" "细心"
   - 图片生成选项: Switch 开关（默认关闭）
   - 蓝色提示框: 显示升级后的效果说明
4. **保持 Switch 关闭**（不生成图片）
5. 点击 **"确认升级"** 按钮

**预期结果**:
- ✅ 按钮变为"升级中..."并禁用
- ✅ 发送请求: `POST /api/canvas/chapter/{chapterId}/characters/upgrade`
  ```json
  {
    "novelCharacter": {
      "name": "张三",
      "role": "protagonist",
      "description": "主角，正义感强的侦探，30岁左右",
      "tempId": "novel-char-0",
      "traits": ["聪明", "勇敢", "细心"]
    },
    "generateImage": false
  }
  ```
- ✅ 对话框自动关闭
- ✅ 显示成功 Toast: "成功创建角色「张三」"
- ✅ **章节角色区域更新**:
  - 标题变为: "章节角色 (1)"
  - 显示 1 个黄色警告卡片（缺失图片）
- ✅ **小说角色区域更新**:
  - "张三"卡片消失
  - 标题变为: "待升级的小说角色 (2)"

**张三的章节角色卡片**（应显示）:
- 左侧: 头像占位符（显示"张三"两字）
- 中间:
  - "张三" + 蓝色徽章"小说角色"
  - "主角，正义感强的侦探，30岁左右"
- 右侧:
  - ⚠️ 黄色警告图标
  - "缺失图片"文字
  - "重新生成"按钮（灰色边框）

**验证数据库**:
```sql
SELECT id, name, description, base_image_url, source_type, source_reference
FROM characters
WHERE name = '张三'
ORDER BY created_at DESC
LIMIT 1;
```
预期结果:
- `source_type`: "novel"
- `source_reference`: `{"novelProjectId": "...", "timelineId": "...", "chapterId": "...", "tempId": "novel-char-0", "originalName": "张三"}`
- `base_image_url`: NULL

**截图位置**:
- `测试截图/6-升级对话框.png`
- `测试截图/7-升级成功后-章节角色.png`

---

### 测试用例 6: 升级小说角色（生成图片）

**目标**: 测试带图片生成的升级功能

**前置条件**: 需要配置 LLM Provider 和图片生成服务

**操作步骤**:
1. 在"待升级的小说角色"区域
2. 点击"李四"卡片的 **"升级为角色资产"** 按钮
3. 在弹出的对话框中：
   - 打开 Switch 开关："立即生成基础图片"
   - 提示变为："生成角色的默认形象（推荐，约需 10-30 秒）"
4. 点击 **"确认升级"** 按钮
5. 等待生成完成（可能需要 10-30 秒）

**预期结果**:
- ✅ 按钮变为"升级中..."并禁用
- ✅ 发送请求: `POST /api/canvas/chapter/{chapterId}/characters/upgrade`
  ```json
  {
    "novelCharacter": {
      "name": "李四",
      "role": "antagonist",
      "description": "反派，神秘的幕后黑手",
      "tempId": "novel-char-1",
      "traits": ["狡猾", "冷酷"]
    },
    "generateImage": true
  }
  ```
- ✅ 等待期间，对话框保持打开并显示加载状态
- ✅ 生成完成后：
  - 对话框自动关闭
  - 显示成功 Toast: "成功创建角色「李四」并生成基础图片"
- ✅ **章节角色区域更新**:
  - 标题变为: "章节角色 (2)"
  - 新增"李四"卡片（绿色对勾 - 已准备）

**李四的章节角色卡片**（应显示）:
- 左侧: 生成的角色图片（64x64）
- 中间:
  - "李四" + 蓝色徽章"小说角色"
  - "反派，神秘的幕后黑手"
- 右侧:
  - ✅ 绿色对勾图标
  - "已准备"文字

**验证数据库**:
```sql
SELECT id, name, base_image_url, source_type
FROM characters
WHERE name = '李四'
ORDER BY created_at DESC
LIMIT 1;
```
预期结果:
- `base_image_url`: `https://minio.../characters/{characterId}/base_image_xxx.png`

**验证图片可访问**:
- 复制 `base_image_url`
- 在浏览器新标签页打开
- 应该显示生成的角色图片

**截图位置**:
- `测试截图/8-升级对话框-开启图片生成.png`
- `测试截图/9-升级成功-有图片.png`
- `测试截图/10-生成的角色图片.png`

---

### 测试用例 7: 重新生成缺失的图片

**目标**: 测试为已有角色重新生成图片

**操作步骤**:
1. 找到"张三"的章节角色卡片（应该显示⚠️缺失图片）
2. 点击卡片右侧的 **"重新生成"** 按钮
3. 等待生成完成（10-30 秒）

**预期结果**:
- ✅ 按钮变为"生成中..."并禁用，显示旋转加载图标
- ✅ 发送请求: `POST /api/character/{characterId}/regenerate-image`
- ✅ 生成完成后：
  - 显示成功 Toast: "角色图片已更新"
  - 卡片自动更新：
    - 左侧显示生成的图片
    - 右侧变为 ✅ "已准备"
    - "重新生成"按钮消失

**验证数据库**:
```sql
SELECT base_image_url
FROM characters
WHERE name = '张三'
ORDER BY created_at DESC
LIMIT 1;
```
预期结果:
- `base_image_url`: 应该有值（不再是 NULL）

**截图位置**: `测试截图/11-重新生成图片成功.png`

---

### 测试用例 8: 测试重复角色关联逻辑

**目标**: 验证同名角色不会重复创建

**操作步骤**:
1. 手动在数据库中再次添加"张三"到 novel_projects.characters
2. 刷新页面，打开角色准备抽屉
3. 应该又看到"张三"在"待升级的小说角色"区域
4. 点击"升级为角色资产"按钮
5. 点击"确认升级"

**预期结果**:
- ✅ 显示 Toast: "已关联现有角色「张三」"
- ✅ API 响应: `isNew: false`
- ✅ **不创建新的 Character 记录**
- ✅ 章节角色数量不变（仍然是 2）
- ✅ 如果章节的 `character_ids` 中已有"张三"，不会重复添加

**验证数据库**:
```sql
SELECT COUNT(*) FROM characters WHERE name = '张三';
```
预期结果: 仍然是 1（没有新增）

**截图位置**: `测试截图/12-重复角色关联.png`

---

### 测试用例 9: 测试 React Query 缓存

**目标**: 验证数据缓存和自动刷新

**操作步骤**:
1. 打开 React DevTools → Components
2. 找到 `CharacterPreparationDrawer` 组件
3. 查看 hooks 中的 `useChapterCharacters` 和 `useNovelCharacters`
4. 关闭抽屉
5. 在 30 秒内再次打开抽屉

**预期结果**:
- ✅ 数据立即显示（从缓存加载）
- ✅ Network 面板**不发送新请求**（5 分钟 staleTime 内）
- ✅ 5 分钟后再次打开，会发送新请求刷新数据

**验证缓存**:
```javascript
// 在浏览器 Console 中执行
window.reactQuery = require('@tanstack/react-query');
// 查看缓存的查询
queryClient.getQueryCache().getAll().filter(q =>
  q.queryKey[0] === 'chapterCharacters' ||
  q.queryKey[0] === 'novelCharacters'
);
```

---

### 测试用例 10: 测试错误处理

**目标**: 验证各种错误场景的处理

#### 10.1 未登录访问

**操作步骤**:
1. 退出登录
2. 直接访问 `/canvas/timeline/xxx`
3. 尝试打开角色准备抽屉

**预期结果**:
- ✅ 重定向到登录页面
- 或显示 401 错误提示

#### 10.2 网络错误

**操作步骤**:
1. 打开 Chrome DevTools → Network
2. 设置 Network throttling 为 "Offline"
3. 尝试升级角色

**预期结果**:
- ✅ 显示错误 Toast: "网络错误，请检查网络连接"
- ✅ 按钮恢复可点击状态
- ✅ 对话框仍然打开

#### 10.3 图片生成失败

**操作步骤**:
1. 临时修改 LLM Provider 配置为无效值
2. 尝试升级角色并生成图片

**预期结果**:
- ✅ 角色仍然创建成功
- ✅ `base_image_url` 为 NULL
- ✅ 显示 Toast: "成功创建角色「xxx」"（不提示图片生成失败）
- ✅ 后台日志记录图片生成失败

---

### 测试用例 11: 响应式测试

**目标**: 验证不同屏幕尺寸下的表现

**操作步骤**:
1. 打开 Chrome DevTools → Toggle device toolbar
2. 测试以下尺寸：
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)

**预期结果**:
- ✅ 600px 宽度抽屉在所有设备上正常显示
- ✅ 手机端：抽屉占据大部分屏幕
- ✅ 卡片布局自适应
- ✅ 文字不溢出，正确截断

---

### 测试用例 12: 性能测试

**目标**: 验证大量数据下的性能

**操作步骤**:
1. 在数据库中添加 50 个小说角色
2. 打开角色准备抽屉
3. 测量加载时间

**预期结果**:
- ✅ 初次加载 < 2 秒
- ✅ 缓存加载 < 500ms
- ✅ 滚动流畅（60fps）
- ✅ 内存占用合理

**性能监控**:
```javascript
// Chrome DevTools → Performance
// 录制打开抽屉的过程
// 检查：
// - Rendering time < 16ms
// - No layout thrashing
// - No memory leaks
```

---

## 📊 测试检查清单

### 功能测试
- [ ] 角色准备按钮显示在正确位置
- [ ] 抽屉正确打开/关闭
- [ ] 智能提示正确显示
- [ ] LocalStorage 持久化工作
- [ ] 章节角色列表正确显示
- [ ] 小说角色列表正确显示
- [ ] 升级角色（不生成图片）成功
- [ ] 升级角色（生成图片）成功
- [ ] 重新生成图片功能工作
- [ ] 重复角色关联逻辑正确
- [ ] React Query 缓存工作

### UI/UX 测试
- [ ] 角色类型颜色编码正确
- [ ] 状态徽章显示正确
- [ ] 加载状态显示正确
- [ ] Toast 提示清晰明确
- [ ] 空状态友好提示
- [ ] 悬停效果流畅

### 错误处理测试
- [ ] 未登录访问处理正确
- [ ] 网络错误处理正确
- [ ] 图片生成失败降级处理
- [ ] API 错误提示清晰

### 性能测试
- [ ] 初次加载速度合理
- [ ] 缓存工作正常
- [ ] 大量数据不卡顿
- [ ] 内存无泄漏

### 兼容性测试
- [ ] Chrome 最新版
- [ ] Safari 最新版
- [ ] Firefox 最新版
- [ ] 移动端 Chrome
- [ ] 移动端 Safari

---

## 🐛 已知问题记录

在测试过程中发现的问题请记录在此：

| 问题编号 | 问题描述 | 复现步骤 | 优先级 | 状态 |
|---------|---------|---------|--------|------|
| 示例 | 抽屉打开动画卡顿 | 1. 打开抽屉 2. 观察动画 | P2 | 待修复 |

---

## 📸 测试截图清单

- [ ] 1-无限画布页面.png
- [ ] 2-抽屉空状态.png
- [ ] 3-智能提示显示.png
- [ ] 4-小说角色列表.png
- [ ] 5-提示关闭后.png
- [ ] 6-升级对话框.png
- [ ] 7-升级成功后-章节角色.png
- [ ] 8-升级对话框-开启图片生成.png
- [ ] 9-升级成功-有图片.png
- [ ] 10-生成的角色图片.png
- [ ] 11-重新生成图片成功.png
- [ ] 12-重复角色关联.png

---

## 🔧 测试工具推荐

1. **React DevTools**: 查看组件状态和 hooks
2. **Chrome DevTools Network**: 监控 API 请求
3. **Redux DevTools**: 查看 React Query 缓存
4. **Lighthouse**: 性能审计
5. **Prisma Studio**: 数据库可视化管理

---

**测试执行日期**: _____
**测试人员**: _____
**测试结果**: [ ] 通过 / [ ] 部分通过 / [ ] 未通过
