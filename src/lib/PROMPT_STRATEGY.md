# 提示词策略对比文档

## 核心原则

### 有参考图时
**原则**: 参考图是绝对主导，提示词尽量简洁

**为什么**:
1. 参考图已经包含了所有角色信息（脸型、发型、体型、画风等）
2. 过多的文字描述会干扰模型，导致偏离参考图
3. 模型应该"看图说话"，而不是"听话画图"

### 无参考图时
**原则**: 需要详细的文字描述

**为什么**:
1. 模型只能依靠文字理解角色
2. 需要明确指定画风、画质、构图等
3. 需要更多的修饰词来引导生成

---

## 提示词对比

### 服装生成 (`outfit-generation.ts`)

#### 有参考图模式 ✅ 推荐

```typescript
// 核心指令
const fullPrompt = [
  // 1. 强调必须一致
  `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,

  // 2. 列出需要保持的要素
  `Keep everything identical: face, body type, proportions, art style, colors.`,

  // 3. 明确唯一改变的内容
  `Only change: outfit to ${outfitPrompt}${customPart}.`,

  // 4. 构图要求
  `Full body view, standing pose, simple white background.`,

  // 5. 再次强调
  `Do NOT change the character's appearance, style, or proportions.`
].join(" ");

// 负面提示词：防止偏离
const negativePrompt = "different character, altered face, changed body type, different art style, modified proportions, different person, multiple characters, inconsistent style, blurry, low quality";
```

**特点**:
- ✅ 极简（约 50 个单词）
- ✅ 强调"EXACT SAME"、"identical"、"Do NOT change"
- ✅ 只描述需要改变的部分（服装）
- ✅ 负面提示词针对性强（防止偏离）

#### 无参考图模式

```typescript
const fullPrompt = [
  characterDescription,
  `wearing ${outfitPrompt}${customPart}`,
  `full body, standing pose, white background`,
  `character design, anime style, clean illustration`
].join(", ");

const negativePrompt = "blurry, low quality, bad anatomy, cropped, complex background, text, watermark, multiple characters";
```

**特点**:
- 包含完整角色描述
- 添加画风和画质词
- 负面提示词更通用

---

### 三视图生成 (`image-generation.ts`)

#### 修改前 ❌ 问题

```typescript
// 无论是否有参考图，都使用相同的复杂提示词
const basePrompt = `${characterDescription}, character turnaround reference sheet, T-pose standing, full body, clean white background, professional character design, anime style, consistent detailed appearance, sharp focus, high quality illustration, character model sheet, reference design`;

const prompts = {
  front: `${basePrompt}, front view, facing forward, straight ahead, centered composition, symmetrical`,
  side: `${basePrompt}, side view, 90 degree profile, side angle, lateral view, side perspective`,
  back: `${basePrompt}, back view, rear view, from behind, backside, posterior view`,
};
```

**问题**:
- ❌ 有参考图时提示词过于复杂（约 100+ 单词）
- ❌ 没有强调"必须与参考图一致"
- ❌ 包含过多画质词（`sharp focus`, `high quality illustration`）
- ❌ 角色描述与参考图冲突，导致脸型变化

#### 修改后 ✅ 优化

**有参考图模式**:

```typescript
// 核心指令：必须与参考图一致
const coreInstruction = [
  `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
  `Keep everything identical: face, facial features, body type, proportions, art style, colors, hair, eyes.`,
  `Character turnaround sheet, T-pose standing, full body, clean white background.`,
  `Do NOT change the character's appearance, face, or style.`
].join(" ");

const prompts = {
  front: `${coreInstruction} Front view, facing forward, straight ahead, centered, symmetrical.`,
  side: `${coreInstruction} Side view, 90 degree profile, lateral view.`,
  back: `${coreInstruction} Back view, rear view, from behind.`,
};

// 负面提示词：防止偏离参考图
const negativePrompt = `different character, altered face, changed facial features, different body type, different art style, modified proportions, different person, multiple characters, inconsistent style, different poses, sitting, action pose, blurry, low quality, bad anatomy, cropped, background elements, text, watermark`;
```

**改进点**:
- ✅ 极简提示词（约 60 个单词）
- ✅ 强调"EXACT SAME"、"identical"、"Do NOT change"
- ✅ 明确列出需要保持的要素（face, facial features, body type, proportions, art style, colors, hair, eyes）
- ✅ 移除画质词，让模型专注于参考图
- ✅ 负面提示词针对性强

**无参考图模式**（保持不变）:

```typescript
const basePrompt = `${characterDescription}, character turnaround reference sheet, T-pose standing, full body, clean white background, professional character design, anime style, consistent detailed appearance, sharp focus, high quality illustration, character model sheet, reference design`;

const prompts = {
  front: `${basePrompt}, front view, facing forward, straight ahead, centered composition, symmetrical`,
  side: `${basePrompt}, side view, 90 degree profile, side angle, lateral view, side perspective`,
  back: `${basePrompt}, back view, rear view, from behind, backside, posterior view`,
};
```

---

## 提示词长度对比

| 场景 | 修改前 | 修改后 | 变化 |
|------|--------|--------|------|
| **服装生成（有参考图）** | N/A | ~50 词 | 新增 |
| **服装生成（无参考图）** | N/A | ~80 词 | 新增 |
| **三视图（有参考图）** | ~120 词 | ~60 词 | **-50%** ⬇️ |
| **三视图（无参考图）** | ~120 词 | ~120 词 | 不变 |

---

## 关键词对比

### 修改前（三视图）

**强调的内容**:
- ❌ `professional character design`
- ❌ `anime style`
- ❌ `consistent detailed appearance`
- ❌ `sharp focus`
- ❌ `high quality illustration`
- ❌ `character model sheet`
- ❌ `reference design`

**问题**: 这些词会让模型"自由发挥"，而不是严格遵循参考图

### 修改后（三视图 + 参考图）

**强调的内容**:
- ✅ `EXACT SAME character`
- ✅ `Keep everything identical`
- ✅ `face, facial features, body type, proportions, art style, colors, hair, eyes`
- ✅ `Do NOT change`

**效果**: 明确告诉模型"不要改变任何东西"

---

## 负面提示词对比

### 修改前

```
blurry, low quality, distorted, deformed, ugly, bad anatomy, multiple characters, inconsistent style, cropped, background elements, scenery, text, watermark, signature, logo, different poses, sitting, action pose
```

**特点**: 通用的负面词，主要防止画质问题

### 修改后（有参考图）

```
different character, altered face, changed facial features, different body type, different art style, modified proportions, different person, multiple characters, inconsistent style, different poses, sitting, action pose, blurry, low quality, bad anatomy, cropped, background elements, text, watermark
```

**改进**:
- ✅ 新增 `different character`（防止画成不同角色）
- ✅ 新增 `altered face`（防止脸型改变）
- ✅ 新增 `changed facial features`（防止五官改变）
- ✅ 新增 `different body type`（防止体型改变）
- ✅ 新增 `different art style`（防止画风改变）
- ✅ 新增 `modified proportions`（防止比例改变）
- ✅ 新增 `different person`（防止画成另一个人）

---

## 实际效果对比

### 场景 1: 生成犀牛大叔的三视图

**修改前**:
```
提示词: 犀牛大叔, character turnaround reference sheet, T-pose standing, full body, clean white background, professional character design, anime style, consistent detailed appearance, sharp focus, high quality illustration, character model sheet, reference design, front view, facing forward, straight ahead, centered composition, symmetrical

结果: ❌ 脸型有差别，体型不一致
```

**修改后**:
```
提示词: IMPORTANT: You must draw the EXACT SAME character shown in the reference image. Keep everything identical: face, facial features, body type, proportions, art style, colors, hair, eyes. Character turnaround sheet, T-pose standing, full body, clean white background. Do NOT change the character's appearance, face, or style. Front view, facing forward, straight ahead, centered, symmetrical.

结果: ✅ 脸型一致，体型一致，画风一致
```

### 场景 2: 生成角色的新服装

**修改前**: 无参考图支持

**修改后**:
```
提示词: IMPORTANT: You must draw the EXACT SAME character shown in the reference image. Keep everything identical: face, body type, proportions, art style, colors. Only change: outfit to school uniform with blazer and tie. Full body view, standing pose, simple white background. Do NOT change the character's appearance, style, or proportions.

结果: ✅ 角色一致，只有服装改变
```

---

## 最佳实践

### 1. 有参考图时

**DO ✅**:
- 使用 `EXACT SAME`、`identical`、`Do NOT change` 等强调词
- 明确列出需要保持的要素
- 提示词保持简洁（< 80 词）
- 只描述需要改变的部分
- 负面提示词针对"偏离参考图"

**DON'T ❌**:
- 不要添加画质词（`high quality`, `sharp focus`, `detailed`）
- 不要添加画风词（`anime style`, `professional`）
- 不要重复描述角色特征（参考图已包含）
- 不要使用过长的提示词

### 2. 无参考图时

**DO ✅**:
- 详细描述角色特征
- 添加画风和画质词
- 明确指定构图和姿势
- 使用通用的负面提示词

**DON'T ❌**:
- 不要过于简洁（会导致生成质量差）
- 不要省略重要特征

---

## 调试技巧

### 1. 查看提示词日志

**服装生成**:
```
========== 服装生成提示词 ==========
服装类型: 校服
有参考图: 是
参考图: http://...
完整提示词:
IMPORTANT: You must draw the EXACT SAME character...
---
负面提示词:
different character, altered face...
==================================
```

**三视图生成**:
```
========== 三视图生成策略：参考图模式 ==========
参考图: http://...
策略: 极简提示词，强调保持角色一致性
==============================================

========== 三视图提示词 ==========
【正面】
IMPORTANT: You must draw the EXACT SAME character...
【侧面】
IMPORTANT: You must draw the EXACT SAME character...
【背面】
IMPORTANT: You must draw the EXACT SAME character...
【负面提示词】
different character, altered face...
==================================
```

### 2. 对比测试

**测试 A**: 使用旧提示词（复杂）
**测试 B**: 使用新提示词（简洁 + 强调一致性）

对比生成结果，验证脸型、体型、画风是否一致。

### 3. 调整策略

如果仍有偏差：
1. 检查参考图质量（是否清晰、是否包含完整角色）
2. 增加强调词（`MUST`, `EXACTLY`, `STRICTLY`）
3. 在负面提示词中添加更多"偏离"相关词
4. 调整 `cfg_scale`（增加到 8-10，增强提示词权重）

---

## 相关文件

- `src/lib/outfit-generation.ts` - 服装生成（参考实现）
- `src/lib/image-generation.ts` - 三视图生成（已优化）
- `src/app/api/character/outfits/route.ts` - 服装生成接口
- `src/app/api/character/generate-views/route.ts` - 三视图生成接口

## 更新日志

- **2025-12-12**: 优化三视图生成提示词，参考服装生成策略
- **2025-12-12**: 添加有参考图/无参考图两种模式
- **2025-12-12**: 强调"EXACT SAME"和"Do NOT change"
- **2025-12-12**: 移除画质词，让模型专注于参考图
