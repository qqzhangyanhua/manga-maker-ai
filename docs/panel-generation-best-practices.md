# 分镜生成最佳实践指南

## 🎯 核心问题与解决方案

### 问题 1: 使用 `prompt_used` 导致指令叠加

#### ❌ 错误做法
```typescript
// 使用 prompt_used 作为基础提示词
const prompt = panel.prompt_used;  // 包含已增强的指令

// 再次增强
const enhanced = `${prompt}\n\nCharacters: xxx\n\nImportant: ...`;

// 结果：指令重复叠加
```

#### ✅ 正确做法
```typescript
// 使用 description 作为基础提示词
const basePrompt = panel.description || panel.visual_prompt;

// 清理可能存在的旧指令
const cleaned = cleanEnhancedInstructions(basePrompt);

// 重新构建增强提示词
const enhanced = buildCompletePrompt(panel, characters, options);
```

---

### 问题 2: 缺少角色关联导致风格不一致

#### ❌ 当前状态
```json
{
  "description": "吴昊睁开眼睛...",
  "character_id": null,  // ❌ 未关联
  "scene_id": null       // ❌ 未关联
}
```

#### ✅ 优化后
```json
{
  "description": "吴昊睁开眼睛...",
  "character_id": "char-wuhao",  // ✅ 关联角色
  "scene_id": "scene-yard"       // ✅ 关联场景
}
```

---

## 📋 字段使用优先级

### 提示词来源

| 字段 | 优先级 | 用途 | 推荐 |
|------|--------|------|------|
| `description` | ⭐⭐⭐⭐⭐ | 原始场景描述 | ✅ **首选** |
| `visual_prompt` | ⭐⭐⭐⭐ | 简化视觉描述 | ✅ 备选 |
| `prompt_used` | ⭐ | 历史生成记录 | ❌ **避免** |

### 为什么避免 `prompt_used`？

```typescript
// prompt_used 的内容示例：
"突然一阵天旋地转，镜头快速模糊...

Characters in this scene: 吴昊

Important: Please generate the image in the EXACT SAME STYLE...

Art style: Japanese manga/comic style"

// 问题：
// 1. 包含系统添加的增强指令
// 2. 重复使用会导致指令叠加
// 3. 不适合作为基础提示词
```

---

## 🏗️ 推荐架构

### 方案 A: 完整优化（推荐）

#### 1. 数据层：添加角色和场景关联

```sql
-- 创建角色资产
INSERT INTO Character (id, name, reference_image, base_prompt) VALUES
('char-wuhao', '吴昊', 'https://cdn.example.com/wuhao.jpg', 
 '年轻男子，25岁左右，现代服饰，黑色短发，困惑表情'),
('char-xiake', '神秘侠客', 'https://cdn.example.com/xiake.jpg',
 '中年侠客，古装打扮，手持长剑，警觉神色，武功高强');

-- 创建场景资产
INSERT INTO Scene (id, name, scene_type, description, reference_image) VALUES
('scene-yard', '古代庭院', 'outdoor', 
 '青石铺地，木质建筑，古朴宁静，晨光照射',
 'https://cdn.example.com/ancient-yard.jpg');

-- 更新分镜关联
UPDATE Panel SET 
  character_id = 'char-wuhao',
  scene_id = 'scene-yard'
WHERE description LIKE '%吴昊%' AND chapter_id = 'xxx';

UPDATE Panel SET 
  character_id = 'char-xiake',
  scene_id = 'scene-yard'
WHERE description LIKE '%侠客%' AND chapter_id = 'xxx';
```

#### 2. 业务层：智能提示词构建

```typescript
import { buildCompletePrompt } from "@/lib/panel-prompt-builder";

async function generatePanelImage(panelId: string) {
  // 1. 获取分镜数据（包含关联）
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    include: {
      character: true,  // 关联的角色
      scene: true,      // 关联的场景
    },
  });
  
  // 2. 收集参考图
  const referenceImages: string[] = [];
  
  // 角色参考图
  if (panel.character?.reference_image) {
    referenceImages.push(panel.character.reference_image);
  }
  
  // 场景参考图
  if (panel.scene?.reference_image) {
    referenceImages.push(panel.scene.reference_image);
  }
  
  // 3. 构建提示词
  const prompt = buildCompletePrompt(
    panel,
    panel.character ? [panel.character] : [],
    {
      preferredSource: "description",  // ✅ 使用 description
      includeCameraInfo: true,
      includeStyleInstructions: true,
      hasReferenceImages: referenceImages.length > 0,
      customStyle: "Japanese manga style, consistent art style",
    }
  );
  
  // 4. 生成图片
  const result = await generateImage({
    panel_id: panelId,
    prompt,
    reference_image_urls: referenceImages,
    model_name: "gemini-2.0-flash-exp",
    aspect_ratio: "16:9",
    num_inference_steps: 50,
    guidance_scale: 10,
  });
  
  return result;
}
```

#### 3. 提示词构建示例

```typescript
// 输入：
const panel = {
  description: "吴昊睁开眼睛，发现自己身处古代庭院",
  camera_angle: "俯视",
  shot_size: "全景",
  camera_movement: "static",
};

const characters = [
  { name: "吴昊", reference_image: "https://..." }
];

// 输出：
buildCompletePrompt(panel, characters, {
  hasReferenceImages: true,
});

/*
"吴昊睁开眼睛，发现自己身处古代庭院

Camera: Full shot, high angle

Characters in this scene: 吴昊

Art style: Japanese manga style
Important: Please generate the image in the EXACT SAME STYLE as the reference images provided. 
Maintain consistent character appearance, art style, line work, and color palette. 
The characters should look identical to their reference images."
*/
```

---

### 方案 B: 最小改动（快速实施）

如果暂时无法修改数据库，可以先优化生成逻辑：

```typescript
async function generatePanelImageMinimal(panelId: string) {
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
  });
  
  // 1. ✅ 使用 description 而不是 prompt_used
  const basePrompt = panel.description || panel.visual_prompt;
  
  // 2. 从描述中提取角色名称
  const characterNames = extractCharacterNames(panel.description);
  // 例如: ["吴昊", "侠客"]
  
  // 3. 根据名称查找角色（模糊匹配）
  const characters = await prisma.character.findMany({
    where: {
      name: { in: characterNames },
      user_id: userId,
    },
  });
  
  // 4. 收集参考图
  const referenceImages = characters
    .map((c) => c.reference_image || c.base_image_url)
    .filter(Boolean);
  
  // 5. 构建提示词
  const prompt = buildCompletePrompt(panel, characters, {
    preferredSource: "description",
    hasReferenceImages: referenceImages.length > 0,
  });
  
  // 6. 生成
  return await generateImage({
    panel_id: panelId,
    prompt,
    reference_image_urls: referenceImages,
  });
}
```

---

## 🎨 分镜规则评估

### ✅ 优点

你的分镜数据结构已经很专业：

1. **分镜类型完善**
   - `wide` (宽景) - 建立场景
   - `transition` (转场) - 场景过渡
   - `closeup` (特写) - 角色情绪
   - `dialogue` (对话) - 人物交流

2. **镜头语言专业**
   - `camera_angle`: 平视/俯视/仰视/鸟瞰/动态
   - `shot_size`: 特写/近景/中景/全景/远景
   - `camera_movement`: static/zoom/pan/pull_out/push_in

3. **叙事节奏合理**
   ```
   Panel 1: 建立场景 (都市) → wide
   Panel 2: 转场 (穿越) → transition + zoom
   Panel 3: 新场景 (古代) → wide
   Panel 4: 角色特写 (情绪) → closeup
   Panel 5: 引入新角色 → wide + pan
   Panel 6-7: 对话交流 → dialogue
   Panel 8: 悬念结尾 → transition + pull_out
   ```

### ⚠️ 需要优化

1. **添加角色关联**
   ```typescript
   // 当前
   character_id: null  // ❌
   
   // 优化后
   character_id: "char-wuhao"  // ✅
   ```

2. **添加场景关联**
   ```typescript
   // 当前
   scene_id: null  // ❌
   
   // 优化后
   scene_id: "scene-yard"  // ✅
   ```

3. **统一风格参考**
   ```typescript
   // 在 Chapter 或 Story 级别添加
   {
     style_reference_image: "https://cdn.example.com/style-ref.jpg",
     art_style: "Japanese manga, black and white, detailed line work"
   }
   ```

---

## 📊 效果对比

### 场景 1: 使用 prompt_used（不推荐）

```typescript
// 第一次生成
prompt_used: "吴昊睁开眼睛..."

// 第二次生成（使用 prompt_used）
prompt_used: "吴昊睁开眼睛...\n\nCharacters: 吴昊\n\nImportant: ..."

// 第三次生成（指令叠加！）
prompt_used: "吴昊睁开眼睛...\n\nCharacters: 吴昊\n\nImportant: ...\n\nCharacters: 吴昊\n\nImportant: ..."
```

**结果**: ❌ 指令重复，生成效果变差

### 场景 2: 使用 description（推荐）

```typescript
// 每次都使用原始 description
const basePrompt = panel.description;

// 每次都重新构建增强提示词
const enhanced = buildCompletePrompt(panel, characters, options);
```

**结果**: ✅ 提示词干净，生成效果稳定

---

## 🔧 实施步骤

### 步骤 1: 准备角色和场景资产（1-2小时）

```sql
-- 1. 创建主要角色
INSERT INTO Character (id, name, reference_image, base_prompt, user_id) 
SELECT 
  gen_random_uuid(),
  '吴昊',
  'https://your-cdn.com/characters/wuhao.jpg',
  '年轻男子，25岁，现代服饰，黑色短发，困惑表情',
  'your-user-id'
WHERE NOT EXISTS (SELECT 1 FROM Character WHERE name = '吴昊');

-- 2. 创建场景
INSERT INTO Scene (id, name, scene_type, description, user_id)
SELECT
  gen_random_uuid(),
  '古代庭院',
  'outdoor',
  '青石铺地，木质建筑，古朴宁静，晨光照射',
  'your-user-id'
WHERE NOT EXISTS (SELECT 1 FROM Scene WHERE name = '古代庭院');
```

### 步骤 2: 关联现有分镜（10分钟）

```sql
-- 关联角色
UPDATE Panel p
SET character_id = (SELECT id FROM Character WHERE name = '吴昊' LIMIT 1)
WHERE p.description LIKE '%吴昊%'
  AND p.character_id IS NULL;

UPDATE Panel p
SET character_id = (SELECT id FROM Character WHERE name = '神秘侠客' LIMIT 1)
WHERE p.description LIKE '%侠客%'
  AND p.character_id IS NULL;

-- 关联场景
UPDATE Panel p
SET scene_id = (SELECT id FROM Scene WHERE name = '古代庭院' LIMIT 1)
WHERE p.description LIKE '%庭院%'
  AND p.scene_id IS NULL;
```

### 步骤 3: 修改生成代码（30分钟）

```typescript
// 在 PanelConfigSidebar.tsx 或生成 API 中
import { buildCompletePrompt } from "@/lib/panel-prompt-builder";

// 修改 handleGenerateImage 函数
const handleGenerateImage = async () => {
  // ✅ 使用 description
  const basePrompt = panel.description || panel.visual_prompt;
  
  // ✅ 获取关联的角色和场景
  const characters = await getRelatedCharacters(panel);
  const scene = await getRelatedScene(panel);
  
  // ✅ 收集参考图
  const referenceImages = [
    ...characters.map(c => c.reference_image).filter(Boolean),
    scene?.reference_image,
  ].filter(Boolean);
  
  // ✅ 构建提示词
  const prompt = buildCompletePrompt(panel, characters, {
    preferredSource: "description",
    hasReferenceImages: referenceImages.length > 0,
  });
  
  // ✅ 生成
  await generateImage(panel.id, {
    customPrompt: prompt,
    referenceImages,
    // ... 其他参数
  });
};
```

### 步骤 4: 测试验证（1小时）

1. **单分镜测试**
   - 生成 Panel 1（无角色）
   - 生成 Panel 2（有角色）
   - 对比效果

2. **批量生成测试**
   - 批量生成整章
   - 检查风格一致性

3. **重复生成测试**
   - 多次生成同一分镜
   - 确认无指令叠加

---

## 💡 最佳实践总结

### ✅ 推荐做法

1. **提示词来源**: 使用 `description` 而不是 `prompt_used`
2. **角色关联**: 为每个分镜关联 `character_id`
3. **场景关联**: 为每个分镜关联 `scene_id`
4. **参考图管理**: 在角色和场景资产中维护参考图
5. **提示词构建**: 使用 `buildCompletePrompt` 统一构建
6. **风格统一**: 在章节或故事级别设置风格参考

### ❌ 避免做法

1. **避免使用 `prompt_used`**: 会导致指令叠加
2. **避免硬编码角色名**: 应该通过关联获取
3. **避免重复增强**: 清理旧指令后再增强
4. **避免忽略镜头语言**: 充分利用 camera_angle 等字段

---

## 🎯 预期效果

### 优化前
- ⚠️ 每次生成风格不同
- ⚠️ 角色外观不一致
- ⚠️ 提示词可能重复叠加

### 优化后
- ✅ 风格统一稳定
- ✅ 角色外观一致
- ✅ 提示词干净高效
- ✅ 生成质量提升 30-50%

---

## 📚 相关文档

- [Gemini 角色一致性指南](./gemini-character-consistency-guide.md)
- [提示词构建器 API](../src/lib/panel-prompt-builder.ts)
- [专注模式使用指南](./focus-mode-user-guide.md)

---

**更新时间**: 2026-01-09  
**版本**: v1.0
