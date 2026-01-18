# 小说项目角色管理 - 图片生成功能设计方案

## 📋 需求概述

在小说项目的"角色管理"标签页中，为角色添加图片生成功能，并与资产库（Assets Library）关联。

### 核心需求

1. ✅ 在 CharacterCard 显示角色头像（已生成的图片）
2. ✅ 添加"生成图片"按钮到 CharacterCard
3. ✅ 弹出生成对话框，支持：
   - 选择漫画风格
   - 补充/编辑提示词
   - AI 推荐提示词强化
4. ✅ 生成的图片自动同步到资产库（Characters 表）
5. ✅ 在角色管理 tab 立即显示生成的头像

---

## 🏗️ 架构设计

### 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│          小说项目角色管理 (CharacterManager)                 │
│  NovelProject.characters (JSONB)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 1. 点击"生成图片"
                        ▼
┌─────────────────────────────────────────────────────────────┐
│      GenerateCharacterImageDialog                          │
│  - 选择风格                                                 │
│  - 编辑提示词                                               │
│  - AI 推荐强化                                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 2. 调用 API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/novel/character/generate-image                  │
│  - 检查角色是否已在 Characters 表中                          │
│  - 如果不存在，创建 Character 记录                           │
│  - 生成图片并保存到 MinIO                                    │
│  - 更新 Character.base_image_url                           │
│  - 更新 NovelProject.characters (添加 assetCharacterId)     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 3. 返回结果
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          Characters 表（资产库）                             │
│  - id (UUID)                                               │
│  - name                                                     │
│  - description                                              │
│  - base_image_url ← 生成的图片URL                           │
│  - source_type = "novel"                                   │
│  - source_reference = { novelProjectId, characterId }     │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ 4. 同步显示
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          CharacterCard 显示头像                              │
│  - AvatarImage: base_image_url                             │
│  - AvatarFallback: 首字母                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 数据模型设计

### NovelProject.characters (JSONB) 扩展

```typescript
interface NovelCharacter {
  id: string;                    // 临时ID (novel-char-0)
  name: string;
  role: string;
  description: string;
  traits?: string[];
  relationships?: Record<string, string>;

  // ✨ 新增字段
  assetCharacterId?: string;     // 关联的 Characters 表 ID
  generatedImageUrl?: string;    // 冗余存储，便于快速显示
  lastGeneratedAt?: string;      // 最后生成时间
}
```

### Character 表（已存在）

```prisma
model Character {
  id                String   @id @default(uuid())
  user_id           String
  name              String
  description       String?
  base_prompt       String   // 生成提示词
  base_image_url    String?  // ← 生成的图片URL
  comic_style_id    String?
  training_status   String   @default("pending")
  source_type       String?  // ← "novel"
  source_reference  Json?    // ← { novelProjectId, characterId }

  // 其他字段...
}
```

---

## 🎨 UI 组件设计

### 1. CharacterCard 修改

**当前状态**（第 26-30 行）：
```tsx
<Avatar>
  <AvatarFallback className={getRoleColor(character.role)}>
    {character.name.charAt(0) || "?"}
  </AvatarFallback>
</Avatar>
```

**修改后**：
```tsx
<Avatar className="h-12 w-12">
  {character.generatedImageUrl ? (
    <AvatarImage src={character.generatedImageUrl} alt={character.name} />
  ) : null}
  <AvatarFallback className={getRoleColor(character.role)}>
    {character.name.charAt(0) || "?"}
  </AvatarFallback>
</Avatar>
```

**添加生成按钮**（第 38-52 行按钮区域）：
```tsx
<div className="flex gap-1">
  {/* ✨ 新增：生成图片按钮 */}
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onGenerateImage(character)}
    title={character.generatedImageUrl ? "重新生成图片" : "生成图片"}
  >
    <Sparkles className={cn(
      "h-4 w-4",
      character.generatedImageUrl && "text-amber-400"
    )} />
  </Button>

  <Button variant="ghost" size="sm" onClick={() => onEdit(character)}>
    <Edit className="h-4 w-4" />
  </Button>

  <Button variant="ghost" size="sm" onClick={() => onDelete(character.id)}>
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

**状态徽章**（CardContent 底部添加）：
```tsx
{character.generatedImageUrl && (
  <div className="flex items-center gap-1 text-xs text-green-600">
    <CheckCircle2 className="h-3 w-3" />
    <span>已生成图片</span>
  </div>
)}
```

---

### 2. GenerateCharacterImageDialog 组件（新建）

**文件位置**: `src/app/(novel)/novel/[id]/components/GenerateCharacterImageDialog.tsx`

**功能模块**:

#### 模块 1: 风格选择
```tsx
<div className="space-y-3">
  <Label>选择漫画风格</Label>
  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
    <SelectTrigger>
      <SelectValue placeholder="选择风格（可选）" />
    </SelectTrigger>
    <SelectContent>
      {styles.map(style => (
        <SelectItem key={style.id} value={style.id}>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: style.tag_color }}
            />
            {style.name_zh}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* 风格预览图 */}
  {selectedStyle && (
    <img
      src={selectedStyle.image_url}
      alt={selectedStyle.name_zh}
      className="w-full h-32 object-cover rounded-lg"
    />
  )}
</div>
```

#### 模块 2: 提示词编辑器
```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <Label>生成提示词</Label>
    <Button
      variant="ghost"
      size="sm"
      onClick={handleEnhancePrompt}
      disabled={isEnhancing}
    >
      {isEnhancing ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          AI 强化中...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-1" />
          AI 推荐强化
        </>
      )}
    </Button>
  </div>

  <Textarea
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="输入角色外观描述，或点击 AI 强化自动生成..."
    rows={6}
    className="font-mono text-sm"
  />

  <div className="text-xs text-muted-foreground">
    <p>基础信息: {character.name} - {character.description}</p>
    {selectedStyle && (
      <p className="text-amber-600">
        将应用风格: {selectedStyle.name_zh}
      </p>
    )}
  </div>
</div>
```

#### 模块 3: 预览和确认
```tsx
<div className="flex items-center justify-between">
  <div className="text-sm text-muted-foreground">
    预计消耗算力: ~50 积分
  </div>

  <div className="flex gap-2">
    <Button variant="outline" onClick={onClose}>
      取消
    </Button>
    <Button
      onClick={handleGenerate}
      disabled={isGenerating || !prompt}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          生成中...
        </>
      ) : (
        <>
          <Image className="h-4 w-4 mr-2" />
          生成图片
        </>
      )}
    </Button>
  </div>
</div>
```

---

## 🔌 API 设计

### POST /api/novel/character/generate-image

**请求参数**:
```typescript
{
  novelProjectId: string;      // 小说项目ID
  characterId: string;          // NovelCharacter.id (novel-char-0)
  characterName: string;        // 角色名称
  characterDescription: string; // 角色描述
  prompt: string;               // 生成提示词
  comicStyleId?: string;        // 可选的漫画风格ID
}
```

**响应结果**:
```typescript
{
  success: boolean;
  assetCharacterId: string;     // Characters 表 ID
  imageUrl: string;             // 生成的图片URL
  isNew: boolean;               // 是否新创建的角色
  message: string;
}
```

**实现逻辑**:
```typescript
// 1. 查找或创建 Character 记录
const existingChar = await prisma.character.findFirst({
  where: {
    user_id: payload.userId,
    name: characterName,
    source_type: "novel",
  }
});

let assetCharacter;
if (existingChar) {
  assetCharacter = existingChar;
} else {
  // 创建新 Character 记录
  assetCharacter = await prisma.character.create({
    data: {
      user_id: payload.userId,
      name: characterName,
      description: characterDescription,
      base_prompt: prompt,
      comic_style_id: comicStyleId,
      training_status: "pending",
      source_type: "novel",
      source_reference: {
        novelProjectId,
        characterId,
      },
    },
  });
}

// 2. 调用图片生成 API
const result = await callImageGenerationByType({
  providerType: "character_generation",
  prompt: buildFullPrompt(prompt, comicStyle),
  negative_prompt: buildNegativePrompt(),
  width: 512,
  height: 768,
  steps: 25,
  cfg_scale: 7.5,
  options: { userId: payload.userId },
});

// 3. 上传到 MinIO
const imageUrl = await uploadBase64Image(
  result.images[0],
  `characters/${assetCharacter.id}/base_image_${Date.now()}.png`
);

// 4. 更新 Character.base_image_url
await prisma.character.update({
  where: { id: assetCharacter.id },
  data: { base_image_url: imageUrl },
});

// 5. 更新 NovelProject.characters
const project = await prisma.novelProject.findUnique({
  where: { id: novelProjectId },
});

const updatedCharacters = (project.characters as any[]).map(c => {
  if (c.id === characterId) {
    return {
      ...c,
      assetCharacterId: assetCharacter.id,
      generatedImageUrl: imageUrl,
      lastGeneratedAt: new Date().toISOString(),
    };
  }
  return c;
});

await prisma.novelProject.update({
  where: { id: novelProjectId },
  data: { characters: updatedCharacters },
});
```

---

### POST /api/novel/character/enhance-prompt

**请求参数**:
```typescript
{
  characterName: string;
  characterDescription: string;
  traits?: string[];
  basePrompt?: string;          // 可选的初始提示词
}
```

**响应结果**:
```typescript
{
  enhancedPrompt: string;       // AI 强化后的提示词
  suggestions: string[];        // 额外的建议关键词
}
```

**实现逻辑**（调用 LLM）:
```typescript
const systemPrompt = `你是一个专业的角色形象描述专家。
根据角色信息，生成适合 AI 绘画的详细提示词。

要求：
1. 包含外貌特征（年龄、性别、发型、服装）
2. 包含气质和风格
3. 使用英文关键词，用逗号分隔
4. 避免抽象概念，使用具体描述`;

const userPrompt = `角色名称: ${characterName}
角色描述: ${characterDescription}
${traits ? `性格特质: ${traits.join(', ')}` : ''}

请生成适合 Stable Diffusion 的提示词：`;

// 调用 LLM API...
```

---

## 🔄 数据同步策略

### 双向关联

1. **NovelProject.characters → Character**
   - `assetCharacterId` 存储 Character 表 ID
   - `generatedImageUrl` 冗余存储图片 URL（便于快速显示）

2. **Character → NovelProject**
   - `source_type = "novel"`
   - `source_reference = { novelProjectId, characterId }`

### 同步时机

| 操作 | NovelProject.characters | Character 表 |
|------|------------------------|--------------|
| 生成图片 | 更新 assetCharacterId, generatedImageUrl | 创建/更新 base_image_url |
| 在资产库删除角色 | 清空 assetCharacterId, generatedImageUrl | 删除记录 |
| 在小说项目删除角色 | 删除记录 | 不删除（保留资产） |
| 在资产库重新生成图片 | 更新 generatedImageUrl | 更新 base_image_url |

---

## 🎯 实施步骤

### Phase 1: 基础功能（1-2 天）

**任务 1.1**: 修改 CharacterCard 组件
- [ ] 添加 AvatarImage 显示生成的图片
- [ ] 添加"生成图片"按钮（Sparkles 图标）
- [ ] 添加 onGenerateImage 回调

**任务 1.2**: 创建 GenerateCharacterImageDialog 组件
- [ ] 基础对话框结构
- [ ] 提示词编辑器（Textarea）
- [ ] 风格选择器（ComicStyle 下拉）
- [ ] 生成按钮和加载状态

**任务 1.3**: 创建 API 端点
- [ ] `POST /api/novel/character/generate-image`
- [ ] 查找/创建 Character 记录
- [ ] 调用图片生成 API
- [ ] 更新 NovelProject.characters

**任务 1.4**: 集成到 CharacterManager
- [ ] 添加对话框状态管理
- [ ] 处理生成回调
- [ ] 更新本地 characters 状态

---

### Phase 2: AI 强化功能（1 天）

**任务 2.1**: 创建提示词强化 API
- [ ] `POST /api/novel/character/enhance-prompt`
- [ ] 调用 LLM 生成强化提示词
- [ ] 返回建议关键词

**任务 2.2**: 集成到对话框
- [ ] 添加"AI 推荐强化"按钮
- [ ] 调用强化 API
- [ ] 自动填充 Textarea

---

### Phase 3: 高级功能（可选）

**任务 3.1**: 批量生成
- [ ] 添加批量选择模式
- [ ] 批量生成对话框
- [ ] 进度条显示

**任务 3.2**: 图片预览和编辑
- [ ] 生成后预览对话框
- [ ] "重新生成"按钮
- [ ] "保存"/"取消"操作

**任务 3.3**: 资产库同步
- [ ] 在资产库显示来源标签（"来自小说项目"）
- [ ] 支持从资产库跳转到小说项目

---

## 📊 UI 效果图（文字描述）

### CharacterCard - 无图片状态
```
┌────────────────────────────────────┐
│ [头像占位]  张三                     │
│    Z         主角                   │
│                            [✨][✏️][🗑️]│
├────────────────────────────────────┤
│ 主角，正义感强的侦探，30岁左右       │
│ [聪明] [勇敢] [细心]                │
└────────────────────────────────────┘
```

### CharacterCard - 有图片状态
```
┌────────────────────────────────────┐
│ [生成的图]  张三                     │
│   (头像)    主角                     │
│                          [✨⭐][✏️][🗑️]│
├────────────────────────────────────┤
│ 主角，正义感强的侦探，30岁左右       │
│ [聪明] [勇敢] [细心]                │
│ ✅ 已生成图片                        │
└────────────────────────────────────┘
```

### GenerateCharacterImageDialog
```
┌─────────────────────────────────────────┐
│ 为角色生成图片                      [×] │
├─────────────────────────────────────────┤
│ 选择漫画风格                             │
│ [下拉选择: 日式少年漫 ▼]                │
│ [风格预览图]                             │
│                                          │
│ 生成提示词              [✨ AI 推荐强化] │
│ ┌────────────────────────────────────┐ │
│ │ a young detective, 30 years old,   │ │
│ │ wearing a trench coat, sharp eyes, │ │
│ │ determined expression, standing    │ │
│ │ in urban background               │ │
│ └────────────────────────────────────┘ │
│ 基础信息: 张三 - 主角，正义感强的侦探    │
│ 将应用风格: 日式少年漫                   │
│                                          │
│ 预计消耗算力: ~50 积分  [取消] [生成图片]│
└─────────────────────────────────────────┘
```

---

## 🔧 技术约束

1. ✅ **TypeScript strict mode** - 无 any 类型
2. ✅ **单文件 ≤ 500 行** - 拆分子组件
3. ✅ **使用 @/ 路径别名**
4. ✅ **shadcn/ui 组件库**
5. ✅ **lucide-react 图标**
6. ✅ **React Query** - 管理 API 调用

---

## 🧪 测试计划

### 单元测试

1. **CharacterCard 显示测试**
   - 无图片时显示首字母
   - 有图片时显示图片
   - 生成按钮状态正确

2. **GenerateCharacterImageDialog 测试**
   - 风格选择工作正常
   - 提示词编辑正常
   - AI 强化调用正确

3. **API 测试**
   - 创建新 Character 记录
   - 更新现有 Character
   - 图片生成成功
   - NovelProject.characters 同步正确

### 集成测试

1. **端到端流程**
   - 点击生成按钮
   - 选择风格和编辑提示词
   - 生成图片
   - CharacterCard 立即显示新头像
   - 资产库中能看到角色

2. **数据同步测试**
   - 在小说项目生成图片
   - 在资产库查看角色
   - 在资产库重新生成图片
   - 在小说项目查看更新

---

## 📚 相关文档

- [角色准备功能实现](./2026-01-17-character-preparation-frontend-integration.md)
- [角色形象图片维护指南](./2026-01-17-character-image-management-guide.md)
- [角色升级 API 实现](./2026-01-17-character-upgrade-api-implementation.md)

---

**设计日期**: 2026-01-17
**设计状态**: ✅ 设计完成，待实施
**预计工期**: 2-4 天
