# 剧情连贯性问题 - 完整解决方案

## 问题根源

通过诊断发现，你的系统**虽然有智能上下文加载机制**，但关键数据缺失导致无法正常工作：

### 诊断结果（62个章节）

- ❌ **58/62 章节缺少详细内容**（`content` 字段为空）
- ❌ **0 个角色状态记录**（`ChapterCharacterState` 表为空）
- ⚠️  **只有 4 个关键章节被标记**

### 为什么导致不连贯？

1. **上下文不足**：AI 生成分镜时只能看到简短的 summary，看不到详细剧情
2. **角色状态断裂**：不知道角色在上一章的状态（受伤/疲惫/持有物品等）
3. **关键情节丢失**：重要的剧情转折点没有被优先加载到上下文

---

## 🚀 快速修复方案（推荐）

### 方案A：自动提取角色状态（5分钟见效）

我已经创建了 AI 自动提取系统，一键修复所有故事：

```bash
# 1. 安装依赖（如果还没装）
cd D:\AI\manga-maker-ai
pnpm install

# 2. 运行自动修复脚本
npx tsx scripts/auto-fix-continuity.ts
```

**这个脚本会：**
- 自动分析所有章节内容
- 提取角色的位置、身体状况、心理状态、持有物品
- 识别关系变化
- 自动标记关键章节（死亡、转折、揭秘等）
- 保存到数据库

**预计耗时：** 每个故事 2-5 分钟（取决于章节数量）

### 方案B：手动补充（如果自动提取效果不理想）

参考 `scripts/manual-fix-guide.md` 手动补充关键数据。

---

## 📋 使用新功能

### 1. 前端查看角色状态

在剧本详情页面添加角色状态查看器：

```typescript
// src/app/scripts/[id]/page.tsx
import { CharacterStatesViewer } from "@/components/CharacterStatesViewer";

// 在合适的位置添加
<CharacterStatesViewer
  chapterId={currentChapterId}
  chapterTitle={chapter.title}
/>
```

用户可以：
- 查看每章结束时的角色状态
- 点击「AI 提取」自动分析
- 理解上下文，避免剧情冲突

### 2. 生成分镜后自动提取状态

修改分镜生成成功的回调：

```typescript
// src/app/scripts/[id]/page.tsx (第 210 行附近)
async function executeGeneration(...) {
  // ... 生成分镜的代码 ...

  // 生成成功后，自动提取角色状态
  try {
    await fetch(`/api/chapter/${chapterId}/extract-states`, {
      method: "POST",
    });
    console.log("角色状态已自动提取");
  } catch (error) {
    console.error("状态提取失败:", error);
    // 不影响主流程
  }

  toast({ title: "分镜生成完成" });
}
```

### 3. API 端点说明

**提取单个章节状态：**
```bash
POST /api/chapter/[id]/extract-states
```

**查看章节状态：**
```bash
GET /api/chapter/[id]/extract-states
```

**批量提取整个故事：**
```bash
GET /api/chapter/[id]/extract-states?batch=true
```

---

## 🎯 验证改进效果

运行修复后，再次诊断：

```bash
npx tsx scripts/diagnose-continuity.ts
```

**预期结果：**
```
✅ 角色状态记录数：150+ 个（取决于章节和角色数量）
✅ 关键章节标记：20+ 个（自动识别）
```

---

## 💡 进一步优化建议

### 1. 优化 Prompt 增强连贯性

修改 `src/lib/panel-generator.ts:292-297`：

```typescript
【重要提示 - 连贯性要求】
1. 生成分镜时严格遵循角色当前状态：
   ${context.characterStates.map(s => `
   - ${s.character.name}: ${s.physical_condition}, ${s.mental_state}
   `).join('\n')}

2. ❌ 禁止出现剧情冲突：
   - 受伤的角色不能突然健步如飞
   - 失去的物品不能无故出现
   - 死亡的角色不能复活（除非有特殊设定）

3. ✅ 必须保持：
   - 角色关系的延续性
   - 伏笔和悬念的呼应
   - 时间线的合理性
```

### 2. 添加连贯性检查工具

创建检测工具，识别剧情冲突：

```typescript
// 示例：检测受伤状态是否合理
if (prevState.physical_condition.includes("骨折") &&
    currentPanel.description.includes("跑步")) {
  警告：角色骨折后不应该能跑步
}
```

### 3. 补充章节详细内容

对于重要章节，建议补充 `content` 字段（2000-5000字）：
- 可以使用 AI 扩写工具
- 或者在创作时直接输入

### 4. 增加上下文窗口

如果故事很长（>20章），考虑增加加载的章节数：

```typescript
// src/lib/panel-generator.ts:255
const context = await loadChapterContext(chapterId, {
  recentChaptersCount: 15, // 从 10 增加到 15
  includeFirstChapter: true,
  includeKeyChapters: true,
  includeCharacterStates: true,
});
```

---

## 📊 效果对比

### 修复前（当前状态）

```
AI 生成分镜时看到的上下文：
┌─────────────────────────────┐
│ 故事标题：镜中嫌疑人         │
│ 故事类型：悬疑               │
│ 章节标题：第5章              │
│ 章节梗概：（200字）          │
│                             │
│ 【角色当前状态】            │
│ （空）                      │
└─────────────────────────────┘
❌ AI 不知道角色在哪里、受伤情况、持有物品
```

### 修复后

```
AI 生成分镜时看到的上下文：
┌─────────────────────────────────────────────┐
│ 【故事背景】                                │
│ 标题：镜中嫌疑人                            │
│ 大纲：...                                   │
│                                             │
│ 【开篇章节】                                │
│ 第一章：...（建立世界观）                   │
│                                             │
│ 【关键章节回顾】                            │
│ 第3章：重要线索发现 (剧情转折)              │
│                                             │
│ 【最近章节回顾】                            │
│ 第4章：追捕失败                             │
│                                             │
│ 【角色当前状态】                            │
│ 主角李明：                                  │
│   位置：废弃工厂地下室                      │
│   身体状况：右臂骨折，失血约500ml，虚弱      │
│   心理状态：恐惧但坚定，对敌人产生复仇心理  │
│   持有物品：神秘钥匙、父亲的遗物            │
│                                             │
│ 配角张华：                                  │
│   位置：医院                                │
│   身体状况：昏迷                            │
│                                             │
│ 【当前章节】                                │
│ 第5章：绝地反击                             │
└─────────────────────────────────────────────┘
✅ AI 拥有完整上下文，生成的分镜会：
   - 尊重主角受伤状态
   - 呼应第3章的线索
   - 延续与张华的关系变化
```

---

## 🔧 故障排除

### Q1: 自动提取失败怎么办？

**可能原因：**
- LLM 配置不正确
- 章节内容为空
- API 限流

**解决方法：**
```bash
# 检查 LLM 配置
npx prisma studio
# 查看 llm_providers 表，确保 script_analyzer 类型的配置正确

# 检查日志
tail -f logs/api.log
```

### Q2: 提取的状态不准确？

**优化方法：**
- 补充章节详细内容（`content` 字段）
- 调整提取 Prompt（`src/lib/character-state-extractor.ts:17`）
- 手动修正不准确的状态

### Q3: 算力消耗太大？

**节省方法：**
- 只为重要章节提取状态
- 使用更便宜的 LLM 模型
- 设置 `skipCreditsCheck: true`（开发环境）

---

## ✅ 完成清单

- [ ] 运行 `npx tsx scripts/auto-fix-continuity.ts` 自动修复
- [ ] 运行 `npx tsx scripts/diagnose-continuity.ts` 验证效果
- [ ] 在前端页面添加 `CharacterStatesViewer` 组件
- [ ] 在分镜生成成功后添加自动提取钩子
- [ ] 测试生成新分镜，检查连贯性是否改善
- [ ] （可选）补充重要章节的详细内容
- [ ] （可选）优化 Prompt 增强连贯性要求

---

## 📞 需要帮助？

如果遇到问题，检查：
1. 数据库连接是否正常
2. LLM API 是否配置正确
3. 算力余额是否充足

运行诊断脚本获取详细信息：
```bash
npx tsx scripts/diagnose-continuity.ts
```
