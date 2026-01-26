# 小说转漫画工作流重构设计文档

> **创建日期**: 2026-01-26  
> **设计目标**: 优化小说转漫画工作流，引入角色身份证系统和九宫格筛选机制  
> **影响范围**: `/novel/canvas/[id]`, Canvas 相关组件, 数据库模型

---

## 📋 目录

1. [背景与目标](#背景与目标)
2. [核心变更对比](#核心变更对比)
3. [新流程设计](#新流程设计)
4. [数据模型设计](#数据模型设计)
5. [UI/UX 设计](#uiux-设计)
6. [API 接口设计](#api-接口设计)
7. [实现路线图](#实现路线图)
8. [测试策略](#测试策略)

---

## 背景与目标

### 当前问题

1. **角色一致性难以保证**: 每次生成图片时，角色外貌可能不一致
2. **Prompt 管理混乱**: 角色描述、场景描述混在一起，难以复用
3. **生成结果不可控**: 单图生成，用户无法快速对比选择
4. **角色管理粗糙**: 仅有章节级绑定，缺乏标准化的角色 Prompt 管理

### 设计目标

✅ **角色一致性**: 引入"角色身份证"系统，标准化角色的图像生成 Prompt  
✅ **提高生产效率**: 九宫格生成让用户快速筛选最佳结果  
✅ **灵活性与可控性**: 支持 Prompt 微调和角色版本管理  
✅ **跨项目复用**: 角色身份证可在多个项目中复用

---

## 核心变更对比

| 维度 | 当前流程（4阶段） | 新流程（7阶段） |
|------|------------------|----------------|
| **阶段** | 剧本分析 → 镜头规划 → 场景图 → 最终漫画 | 剧本结构化 → 角色设定 → 分镜脚本 → 角色Prompt → 分镜Prompt → AI生成 → 人工筛选 |
| **角色管理** | 章节级 `character_ids[]` | 全局角色库 + 角色身份证 Prompt |
| **Prompt策略** | 场景 + 镜头直接拼接 | 角色Prompt + 场景Prompt 分离合成 |
| **图像生成** | 单图生成 | 九宫格生成（9张候选） |
| **筛选机制** | 无 | 九宫格快速选择 + Prompt微调重绘 |
| **角色版本** | 单一 | 基础版 + 变体版（战斗装/正装/休闲装等） |
| **复用能力** | 项目内 | 跨项目复用角色身份证 |

---

## 新流程设计

### 完整工作流

```
📖 小说章节文本
    ↓
[阶段1] 剧本结构化（Novel Backend）
    → LLM 将章节拆分为 3-8 个剧本片段（ScriptSegment）
    ↓
[阶段2] 分镜脚本生成（Novel Backend）
    → LLM 为每个片段设计 2-5 个镜头（ShotDesign）
    ↓
[阶段3] 角色设定表（手动触发）
    → 用户在角色库为每个角色生成"角色身份证"（CharacterPromptTemplate）
    → 支持创建变体版本（战斗装、正装等）
    ↓
[阶段4] 分镜中的角色绑定
    → 用户/AI 为每个 ShotDesign 选择涉及的角色
    → 自动选择合适的角色 Prompt 版本（基础版/变体版）
    ↓
[阶段5] 角色 Prompt 提取
    → 从角色身份证中提取该分镜所需角色的 Prompt
    ↓
[阶段6] 分镜 Prompt 合成（ShotPromptComposition）
    → 合成：角色Prompt + 场景Prompt + 动作Prompt + 氛围Prompt + 风格
    ↓
[阶段7] 九宫格生成 + 人工筛选
    → AI 生成 9 张候选图（串行生成）
    → 用户选择最佳图片
    → 可选：微调 Prompt 重新生成单图
    ↓
✅ 最终选定的分镜图片
```

---

## 数据模型设计

### 1. 角色身份证表（character_prompt_templates）

```sql
CREATE TABLE character_prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 关联关系
  character_id UUID NOT NULL REFERENCES novel_characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- 版本管理
  version VARCHAR(20) NOT NULL DEFAULT 'base', -- 'base' | 'variant'
  variant_name VARCHAR(100),                   -- 变体名称（如 "战斗装", "正装"）
  
  -- Prompt 组成部分（分字段存储，便于单独修改）
  appearance_prompt TEXT NOT NULL,             -- 外貌（发型、脸型、身高、体型）
  clothing_prompt TEXT NOT NULL,               -- 服装（款式、颜色）
  style_prompt TEXT NOT NULL,                  -- 画风（manga/anime/realistic）
  characteristic_prompt TEXT,                  -- 特征标识（疤痕、配饰、纹身）
  
  -- 合成后的完整 Prompt
  full_prompt TEXT NOT NULL,                   -- 拼接后的完整提示词
  negative_prompt TEXT NOT NULL DEFAULT '',    -- 负面提示词
  
  -- 元数据
  reference_image_url TEXT,                    -- 参考图（可选）
  is_active BOOLEAN DEFAULT true,              -- 是否启用
  usage_count INT DEFAULT 0,                   -- 使用次数（统计）
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 约束
  UNIQUE(character_id, version, variant_name), -- 同一角色的同名变体唯一
  CHECK (version IN ('base', 'variant')),
  CHECK (version = 'base' OR variant_name IS NOT NULL) -- 变体版本必须有名称
);

CREATE INDEX idx_character_prompt_templates_character ON character_prompt_templates(character_id);
CREATE INDEX idx_character_prompt_templates_user ON character_prompt_templates(user_id);
```

### 2. 分镜 Prompt 合成表（shot_prompt_compositions）

```sql
CREATE TABLE shot_prompt_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 关联关系
  shot_design_id UUID NOT NULL UNIQUE REFERENCES shot_designs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- 角色 Prompt 引用（JSON 数组）
  character_prompts JSONB NOT NULL DEFAULT '[]', 
  -- 格式: [{"character_id": "uuid", "template_id": "uuid", "position_hint": "left"}]
  
  -- Prompt 组成部分
  scene_prompt TEXT NOT NULL,                  -- 场景/背景描述
  action_prompt TEXT NOT NULL,                 -- 动作描述
  atmosphere_prompt TEXT NOT NULL,             -- 氛围描述（lighting, mood, weather）
  camera_prompt TEXT NOT NULL,                 -- 相机参数（angle, shot_size）
  
  -- 最终合成的 Prompt
  final_prompt TEXT NOT NULL,                  -- 组合后的完整提示词
  final_negative_prompt TEXT NOT NULL DEFAULT '',
  
  -- 元数据
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shot_prompt_compositions_shot ON shot_prompt_compositions(shot_design_id);
```

### 3. 九宫格生成记录表（nine_grid_generations）

```sql
CREATE TABLE nine_grid_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 关联关系
  shot_design_id UUID NOT NULL REFERENCES shot_designs(id) ON DELETE CASCADE,
  prompt_composition_id UUID NOT NULL REFERENCES shot_prompt_compositions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- 生成参数
  generation_params JSONB NOT NULL,            -- 生成参数（width, height, steps, cfg_scale, seed）
  
  -- 九宫格图片（JSON 数组）
  images JSONB NOT NULL DEFAULT '[]',
  -- 格式: [{"grid_position": 1, "image_url": "https://...", "seed": 12345, "metadata": {}}]
  
  -- 用户选择
  selected_grid_position INT,                  -- 用户选择的位置（1-9）
  selected_image_url TEXT,                     -- 选中的图片 URL
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'generating' | 'completed' | 'error'
  error_message TEXT,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  CHECK (status IN ('pending', 'generating', 'completed', 'error')),
  CHECK (selected_grid_position IS NULL OR (selected_grid_position >= 1 AND selected_grid_position <= 9))
);

CREATE INDEX idx_nine_grid_generations_shot ON nine_grid_generations(shot_design_id);
CREATE INDEX idx_nine_grid_generations_status ON nine_grid_generations(status);
```

### 4. 修改现有表（shot_designs）

```sql
-- 为 shot_designs 表添加新字段
ALTER TABLE shot_designs 
  ADD COLUMN character_prompt_template_ids UUID[] DEFAULT '{}',  -- 使用的角色 Prompt 模板 ID 列表
  ADD COLUMN prompt_composition_id UUID REFERENCES shot_prompt_compositions(id),
  ADD COLUMN nine_grid_generation_id UUID REFERENCES nine_grid_generations(id),
  
  -- 生成状态细化
  ADD COLUMN character_prompt_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN final_prompt_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN nine_grid_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN selection_status VARCHAR(20) DEFAULT 'pending';  -- 'pending' | 'selected' | 'refined'

-- 添加约束
ALTER TABLE shot_designs 
  ADD CONSTRAINT check_character_prompt_status 
    CHECK (character_prompt_status IN ('pending', 'generating', 'completed', 'error')),
  ADD CONSTRAINT check_final_prompt_status 
    CHECK (final_prompt_status IN ('pending', 'generating', 'completed', 'error')),
  ADD CONSTRAINT check_nine_grid_status 
    CHECK (nine_grid_status IN ('pending', 'generating', 'completed', 'error')),
  ADD CONSTRAINT check_selection_status 
    CHECK (selection_status IN ('pending', 'selected', 'refined'));

CREATE INDEX idx_shot_designs_nine_grid ON shot_designs(nine_grid_generation_id);
```

### 5. TypeScript 类型定义

```typescript
// src/types/character-prompt.ts

export interface CharacterPromptTemplate {
  id: string;
  character_id: string;
  user_id: string;
  version: "base" | "variant";
  variant_name?: string;
  
  // Prompt 组成
  appearance_prompt: string;
  clothing_prompt: string;
  style_prompt: string;
  characteristic_prompt?: string;
  
  // 合成结果
  full_prompt: string;
  negative_prompt: string;
  
  // 元数据
  reference_image_url?: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShotPromptComposition {
  id: string;
  shot_design_id: string;
  user_id: string;
  
  character_prompts: {
    character_id: string;
    template_id: string;
    position_hint?: "left" | "center" | "right" | "foreground" | "background";
  }[];
  
  scene_prompt: string;
  action_prompt: string;
  atmosphere_prompt: string;
  camera_prompt: string;
  
  final_prompt: string;
  final_negative_prompt: string;
  
  created_at: string;
  updated_at: string;
}

export interface NineGridGeneration {
  id: string;
  shot_design_id: string;
  prompt_composition_id: string;
  user_id: string;
  
  generation_params: {
    width: number;
    height: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
  };
  
  images: {
    grid_position: number; // 1-9
    image_url: string;
    seed: number;
    metadata?: Record<string, unknown>;
  }[];
  
  selected_grid_position?: number;
  selected_image_url?: string;
  
  status: "pending" | "generating" | "completed" | "error";
  error_message?: string;
  
  created_at: string;
  completed_at?: string;
}
```

---

## UI/UX 设计

### 1. Canvas 页面布局（保持现有树状结构）

#### 1.1 页面整体布局

```
┌────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│  [< 返回] 项目标题 | 默认风格: [下拉选择] | [角色库] 按钮     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ReactFlow 画布区域                                            │
│                                                                 │
│  章节 1 [ChapterHeaderNode]                                    │
│    │                                                           │
│    ├─ 剧本片段 1 [ScriptNode]                                 │
│    │    │                                                      │
│    │    ├─ 分镜 1-1 [ShotNode] ───┐                          │
│    │    │   └─ 状态: 已选图 ✓      │  [点击展开详情]         │
│    │    │                          │                          │
│    │    └─ 分镜 1-2 [ShotNode] ───┘                          │
│    │        └─ 状态: 待生成        │                          │
│    │                                                           │
│    └─ 剧本片段 2 [ScriptNode]                                 │
│                                                                 │
│  章节 2 [ChapterHeaderNode]                                    │
│    └─ ...                                                      │
│                                                                 │
│  [右侧抽屉: 角色库面板 - 按需打开]                            │
└────────────────────────────────────────────────────────────────┘
```

#### 1.2 增强的 ShotNode 设计

```tsx
<div className="shot-node bg-zinc-900/80 border border-zinc-700 rounded-lg p-4">
  {/* 原有内容：镜头描述 */}
  <div className="shot-info">
    <span className="text-sm text-zinc-400">镜头 {shot.shot_order}</span>
    <p className="text-white">{shot.shot_description}</p>
    <div className="flex gap-2 mt-2">
      <Badge variant="outline">{shot.camera_angle}</Badge>
      <Badge variant="outline">{shot.shot_size}</Badge>
    </div>
  </div>
  
  {/* 新增：角色身份证标签 */}
  <div className="character-tags mt-3">
    <span className="text-xs text-zinc-500">涉及角色:</span>
    <div className="flex flex-wrap gap-2 mt-1">
      {shot.character_prompt_templates.map(template => (
        <Badge key={template.id} variant="secondary" className="text-xs">
          {template.character_name}
          {template.variant_name && (
            <span className="ml-1 text-purple-400">({template.variant_name})</span>
          )}
        </Badge>
      ))}
    </div>
  </div>
  
  {/* 新增：生成状态指示 */}
  <div className="status-indicators mt-3 space-y-2">
    <StatusItem 
      label="角色Prompt" 
      status={shot.character_prompt_status} 
    />
    <StatusItem 
      label="分镜Prompt" 
      status={shot.final_prompt_status} 
    />
    <StatusItem 
      label="九宫格生成" 
      status={shot.nine_grid_status} 
    />
  </div>
  
  {/* 新增：操作按钮 */}
  <div className="actions mt-4 flex gap-2">
    {shot.nine_grid_status === "pending" && (
      <Button 
        size="sm" 
        variant="default"
        onClick={() => openNineGridDialog(shot.id)}
      >
        生成九宫格
      </Button>
    )}
    
    {shot.nine_grid_status === "completed" && shot.selection_status === "pending" && (
      <Button 
        size="sm" 
        variant="secondary"
        onClick={() => openNineGridDialog(shot.id)}
      >
        查看并选择
      </Button>
    )}
    
    {shot.selection_status === "selected" && (
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => openRefineDialog(shot.id)}
      >
        微调Prompt
      </Button>
    )}
  </div>
  
  {/* 新增：已选图片预览 */}
  {shot.selection_status === "selected" && shot.selected_image_url && (
    <div className="selected-preview mt-4">
      <span className="text-xs text-zinc-500">已选择:</span>
      <img 
        src={shot.selected_image_url} 
        alt="已选择的图片"
        className="w-full h-auto rounded mt-2 border border-purple-500/50"
      />
    </div>
  )}
</div>
```

### 2. 角色库抽屉面板（CharacterLibraryDrawer）

```tsx
<Sheet open={characterLibraryOpen} onOpenChange={setCharacterLibraryOpen}>
  <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
    <SheetHeader>
      <SheetTitle>角色库</SheetTitle>
      <SheetDescription>
        管理项目角色和角色身份证 Prompt
      </SheetDescription>
    </SheetHeader>
    
    <div className="py-4">
      {/* 角色列表 */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        {characters.map(character => (
          <div key={character.id} className="character-item mb-4 p-4 border rounded">
            {/* 角色基本信息 */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={character.image_url} />
                <AvatarFallback>{character.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold">{character.name}</h4>
                <p className="text-sm text-zinc-500">{character.description}</p>
              </div>
            </div>
            
            {/* 角色身份证管理 */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">角色身份证 Prompt</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openCharacterPromptEditor(character.id)}
                >
                  管理
                </Button>
              </div>
              
              {/* 显示已有的 Prompt 模板 */}
              <div className="space-y-2">
                {character.prompt_templates?.map(template => (
                  <div key={template.id} className="template-card p-2 bg-zinc-900 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {template.version === "base" ? "基础版" : template.variant_name}
                      </span>
                      <div className="flex gap-2">
                        <Button size="xs" variant="ghost" onClick={() => editTemplate(template.id)}>
                          编辑
                        </Button>
                        {template.version === "variant" && (
                          <Button size="xs" variant="ghost" onClick={() => deleteTemplate(template.id)}>
                            删除
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 truncate">
                      {template.full_prompt}
                    </p>
                  </div>
                ))}
                
                {/* 生成基础版按钮 */}
                {!character.prompt_templates?.some(t => t.version === "base") && (
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => generateBasePrompt(character.id)}
                  >
                    生成基础 Prompt
                  </Button>
                )}
                
                {/* 添加变体按钮 */}
                {character.prompt_templates?.some(t => t.version === "base") && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => addVariantPrompt(character.id)}
                  >
                    + 添加变体版本
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  </SheetContent>
</Sheet>
```

### 3. 角色 Prompt 编辑器对话框（CharacterPromptEditorDialog）

```tsx
<Dialog open={promptEditorOpen} onOpenChange={setPromptEditorOpen}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {isNewTemplate ? "生成角色身份证" : "编辑角色 Prompt"}
      </DialogTitle>
      <DialogDescription>
        {character.name} - {templateVersion === "base" ? "基础版" : variantName}
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-6">
      {/* 版本选择（仅新建时） */}
      {isNewTemplate && (
        <div className="space-y-2">
          <Label>版本类型</Label>
          <RadioGroup value={templateVersion} onValueChange={setTemplateVersion}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="base" id="base" />
              <Label htmlFor="base">基础版（默认外观）</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="variant" id="variant" />
              <Label htmlFor="variant">变体版（特定场景）</Label>
            </div>
          </RadioGroup>
          
          {templateVersion === "variant" && (
            <Input 
              placeholder="变体名称（如：战斗装、正装、休闲装）" 
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
            />
          )}
        </div>
      )}
      
      {/* AI 生成按钮 */}
      <Button 
        onClick={handleGeneratePrompt} 
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? "AI 生成中..." : "AI 自动生成 Prompt"}
      </Button>
      
      <Separator />
      
      {/* Prompt 组成部分（可独立编辑） */}
      <div className="space-y-4">
        <div>
          <Label>外貌 Prompt</Label>
          <Textarea 
            placeholder="发型、脸型、肤色、身高、体型..."
            value={appearancePrompt}
            onChange={(e) => setAppearancePrompt(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-zinc-500 mt-1">
            示例: long silver hair, blue eyes, slender build, 170cm tall, fair skin
          </p>
        </div>
        
        <div>
          <Label>服装 Prompt</Label>
          <Textarea 
            placeholder="服装款式、颜色、配饰..."
            value={clothingPrompt}
            onChange={(e) => setClothingPrompt(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-zinc-500 mt-1">
            示例: white school uniform, blue tie, black skirt, sneakers
          </p>
        </div>
        
        <div>
          <Label>画风 Prompt</Label>
          <Select value={stylePrompt} onValueChange={setStylePrompt}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manga style, black and white">日式漫画风格</SelectItem>
              <SelectItem value="anime style, vibrant colors">动漫风格</SelectItem>
              <SelectItem value="semi-realistic, detailed">半写实风格</SelectItem>
              <SelectItem value="webtoon style, digital art">韩漫风格</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>特征标识 Prompt（可选）</Label>
          <Textarea 
            placeholder="疤痕、纹身、特殊配饰等独特标识..."
            value={characteristicPrompt}
            onChange={(e) => setCharacteristicPrompt(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-zinc-500 mt-1">
            示例: scar on left cheek, silver earring, dragon tattoo on arm
          </p>
        </div>
        
        <Separator />
        
        <div>
          <Label>负面 Prompt</Label>
          <Textarea 
            placeholder="不希望出现的元素..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-zinc-500 mt-1">
            示例: blurry, low quality, deformed, extra limbs, bad anatomy
          </p>
        </div>
        
        <Separator />
        
        {/* 预览合成后的完整 Prompt */}
        <div>
          <Label>完整 Prompt 预览</Label>
          <div className="p-3 bg-zinc-900 rounded border border-zinc-700 text-sm">
            <pre className="whitespace-pre-wrap">
              {generateFullPrompt()}
            </pre>
          </div>
        </div>
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setPromptEditorOpen(false)}>
        取消
      </Button>
      <Button onClick={handleSaveTemplate} disabled={!canSave()}>
        保存
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. 九宫格生成对话框（NineGridGenerationDialog）

```tsx
<Dialog open={nineGridDialogOpen} onOpenChange={setNineGridDialogOpen}>
  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>九宫格生成 - {shotDesign.shot_description}</DialogTitle>
      <DialogDescription>
        AI 将生成 9 张候选图片，请选择最符合你预期的一张
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-6">
      {/* 涉及的角色 Prompt 预览 */}
      <div>
        <Label className="text-base">涉及角色</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {shotDesign.character_prompt_templates.map(template => (
            <Card key={template.id} className="p-3 w-fit">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={template.character.image_url} />
                  <AvatarFallback>{template.character.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{template.character.name}</p>
                  <p className="text-xs text-zinc-500">
                    {template.version === "base" ? "基础版" : template.variant_name}
                  </p>
                </div>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-purple-400 mt-1">
                  查看 Prompt
                </CollapsibleTrigger>
                <CollapsibleContent className="text-xs text-zinc-400 mt-1">
                  {template.full_prompt}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
      
      {/* 最终 Prompt 预览与编辑 */}
      <div>
        <Label className="text-base">最终生成 Prompt</Label>
        <Textarea 
          value={finalPrompt} 
          onChange={(e) => setFinalPrompt(e.target.value)}
          rows={4}
          className="mt-2 font-mono text-sm"
        />
        <p className="text-xs text-zinc-500 mt-1">
          可以手动调整 Prompt，修改后将应用到所有 9 张图片
        </p>
      </div>
      
      {/* 生成参数 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>画风</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manga">日式漫画</SelectItem>
              <SelectItem value="anime">动漫风格</SelectItem>
              <SelectItem value="realistic">写实风格</SelectItem>
              <SelectItem value="webtoon">韩漫风格</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>多样性 (CFG Scale)</Label>
          <Slider 
            value={[cfgScale]} 
            onValueChange={([val]) => setCfgScale(val)}
            min={5}
            max={15}
            step={0.5}
          />
          <p className="text-xs text-zinc-500 mt-1">当前: {cfgScale}</p>
        </div>
      </div>
      
      {/* 生成按钮 */}
      {nineGridStatus === "pending" && (
        <Button 
          onClick={handleGenerateNineGrid} 
          className="w-full"
          disabled={isGenerating}
        >
          {isGenerating ? "生成中..." : "开始生成 9 张图片"}
        </Button>
      )}
      
      {/* 生成进度 */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generationProgress} className="w-full" />
          <p className="text-sm text-center text-zinc-400">
            正在生成第 {currentGeneratingIndex} / 9 张...
          </p>
        </div>
      )}
      
      {/* 九宫格展示 */}
      {nineGridImages.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base">选择最佳图片</Label>
          <div className="grid grid-cols-3 gap-4">
            {nineGridImages.map((img, idx) => (
              <div 
                key={idx}
                className={cn(
                  "relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                  selectedIndex === idx 
                    ? "border-purple-500 shadow-lg shadow-purple-500/50" 
                    : "border-zinc-700 hover:border-zinc-500"
                )}
                onClick={() => setSelectedIndex(idx)}
              >
                <img 
                  src={img.image_url} 
                  alt={`候选 ${idx + 1}`}
                  className="w-full h-auto"
                />
                
                {/* 选中标记 */}
                {selectedIndex === idx && (
                  <div className="absolute top-2 right-2 bg-purple-500 rounded-full p-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                
                {/* 编号 */}
                <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 text-xs">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 操作按钮 */}
      {nineGridImages.length > 0 && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRegenerateAll}
            disabled={isGenerating}
          >
            全部重新生成
          </Button>
          <Button 
            onClick={handleConfirmSelection} 
            disabled={selectedIndex === null}
            className="flex-1"
          >
            确认选择
          </Button>
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
```

### 5. Prompt 微调对话框（PromptRefineDialog）

```tsx
<Dialog open={refineDialogOpen} onOpenChange={setRefineDialogOpen}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>微调 Prompt</DialogTitle>
      <DialogDescription>
        调整 Prompt 后将重新生成单张图片
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-6">
      {/* 当前选择的图片 */}
      <div>
        <Label className="text-base">当前选择的图片</Label>
        <img 
          src={currentSelectedImage} 
          alt="当前选择"
          className="w-full h-auto rounded-lg border border-zinc-700 mt-2"
        />
      </div>
      
      {/* Prompt 编辑 */}
      <div>
        <Label className="text-base">调整 Prompt</Label>
        <Textarea 
          value={refinedPrompt}
          onChange={(e) => setRefinedPrompt(e.target.value)}
          rows={6}
          className="mt-2 font-mono text-sm"
        />
        <p className="text-xs text-zinc-500 mt-1">
          提示: 可以增加更多细节描述，或调整画风、氛围等参数
        </p>
      </div>
      
      {/* 对比视图（如果已重新生成） */}
      {refinedImage && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">原图</Label>
            <img src={currentSelectedImage} className="w-full rounded" />
          </div>
          <div>
            <Label className="text-sm">微调后</Label>
            <img src={refinedImage} className="w-full rounded" />
          </div>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex gap-2">
        {!refinedImage ? (
          <Button 
            onClick={handleRegenerateSingle}
            disabled={isRegenerating}
            className="flex-1"
          >
            {isRegenerating ? "重新生成中..." : "重新生成"}
          </Button>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={handleKeepOriginal}
            >
              保留原图
            </Button>
            <Button 
              onClick={handleUseRefined}
              className="flex-1"
            >
              使用微调后的图片
            </Button>
          </>
        )}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## API 接口设计

### 1. 角色身份证管理

#### 1.1 生成角色身份证（AI 自动生成）

```typescript
POST /api/canvas/character-prompt/generate

Request:
{
  character_id: string;
  version: "base" | "variant";
  variant_name?: string;
  user_guidance?: string;  // 用户补充的指导（可选）
}

Response:
{
  id: string;
  character_id: string;
  version: "base" | "variant";
  variant_name?: string;
  appearance_prompt: string;
  clothing_prompt: string;
  style_prompt: string;
  characteristic_prompt: string;
  full_prompt: string;
  negative_prompt: string;
}

LLM Prompt 模板:
你是专业的图像生成提示词工程师。根据角色信息生成标准化的 Stable Diffusion Prompt。

角色信息：
- 姓名：{character.name}
- 年龄：{character.age}
- 性别：{character.gender}
- 外貌描述：{character.appearance}
- 性格：{character.personality}
- 背景：{character.background}

{version === "variant" && `
变体类型：{variant_name}
说明：请为该角色在「{variant_name}」场景下生成适合的服装和造型描述。
`}

要求：
1. appearance_prompt：描述发型、脸型、肤色、身高、体型（使用英文，逗号分隔）
2. clothing_prompt：描述服装款式、颜色、配饰（符合变体场景，如有）
3. characteristic_prompt：描述独特标识（疤痕、配饰、纹身等，如无可留空）
4. style_prompt：选择合适的画风（manga style/anime style/semi-realistic）
5. negative_prompt：生成负面提示词（避免的元素）

输出严格的 JSON 格式：
{
  "appearance_prompt": "...",
  "clothing_prompt": "...",
  "characteristic_prompt": "...",
  "style_prompt": "...",
  "negative_prompt": "..."
}
```

#### 1.2 更新角色身份证

```typescript
PUT /api/canvas/character-prompt/:id

Request:
{
  appearance_prompt?: string;
  clothing_prompt?: string;
  style_prompt?: string;
  characteristic_prompt?: string;
  negative_prompt?: string;
}

Response:
{
  id: string;
  full_prompt: string;  // 自动重新拼接
  updated_at: string;
}
```

#### 1.3 删除角色身份证

```typescript
DELETE /api/canvas/character-prompt/:id

Response:
{
  success: true;
}
```

#### 1.4 获取角色的所有身份证

```typescript
GET /api/canvas/character/:characterId/prompts

Response:
{
  prompts: CharacterPromptTemplate[];
}
```

---

### 2. 分镜 Prompt 合成

#### 2.1 为分镜合成最终 Prompt

```typescript
POST /api/canvas/shot/:shotId/compose-prompt

Request:
{
  character_template_ids: string[];  // 该分镜使用的角色 Prompt 模板 ID
  character_positions?: {            // 可选：角色位置提示
    [character_id: string]: "left" | "center" | "right" | "foreground" | "background";
  };
  manual_adjustments?: string;       // 可选：用户手动补充的内容
}

Response:
{
  id: string;
  shot_design_id: string;
  character_prompts: {
    character_id: string;
    template_id: string;
    position_hint?: string;
  }[];
  scene_prompt: string;
  action_prompt: string;
  atmosphere_prompt: string;
  camera_prompt: string;
  final_prompt: string;
  final_negative_prompt: string;
}

逻辑:
1. 从 shot_design 获取: scene_description, shot_description, camera_angle, shot_size
2. 从 character_prompt_templates 获取: 每个角色的 full_prompt
3. 从 timeline.config 获取: default_comic_style_id (风格前缀)
4. 合成最终 Prompt:
   {character_prompts.join(", ")}, {scene_prompt}, {action_prompt}, 
   {atmosphere_prompt}, {camera_prompt}, {style_prefix}, {manual_adjustments}
```

---

### 3. 九宫格生成

#### 3.1 生成九宫格（串行生成）

```typescript
POST /api/canvas/shot/:shotId/generate-nine-grid

Request:
{
  prompt_composition_id: string;
  generation_params?: {
    width?: number;        // 默认 1024
    height?: number;       // 默认 768
    steps?: number;        // 默认 30
    cfg_scale?: number;    // 默认 7.5
  };
}

Response (SSE 流式返回):
{
  event: "progress";
  data: {
    current: number;      // 当前生成到第几张 (1-9)
    total: 9;
    status: "generating";
  }
}

{
  event: "image";
  data: {
    grid_position: number;
    image_url: string;
    seed: number;
  }
}

{
  event: "completed";
  data: {
    nine_grid_generation_id: string;
    images: {
      grid_position: number;
      image_url: string;
      seed: number;
    }[];
  }
}

{
  event: "error";
  data: {
    message: string;
  }
}

逻辑（串行生成）:
for (let i = 1; i <= 9; i++) {
  const seed = baseSeed + i;
  const image = await generateImage(finalPrompt, { ...params, seed });
  
  // 存储到数据库
  await saveNineGridImage(nineGridId, {
    grid_position: i,
    image_url: image.url,
    seed: seed,
  });
  
  // 推送进度
  sendSSE({ event: "image", data: { grid_position: i, image_url: image.url, seed } });
}
```

#### 3.2 选择九宫格图片

```typescript
POST /api/canvas/nine-grid/:nineGridId/select

Request:
{
  grid_position: number;  // 1-9
}

Response:
{
  success: true;
  selected_image_url: string;
  shot_design_id: string;
}

副作用:
- 更新 nine_grid_generations.selected_grid_position
- 更新 shot_designs.selection_status = "selected"
- 更新 shot_designs.generated_image_url = selected_image_url
```

---

### 4. Prompt 微调与重新生成

#### 4.1 微调 Prompt 并重新生成单图

```typescript
POST /api/canvas/shot/:shotId/refine-prompt

Request:
{
  refined_prompt: string;
  generation_params?: {
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
  };
}

Response:
{
  refined_image_url: string;
  seed: number;
}

副作用:
- 生成新图片
- 不修改 nine_grid_generations 记录（保留历史）
- 可选：创建新的 ShotPromptComposition 记录（标记为 refined 版本）
```

#### 4.2 确认使用微调后的图片

```typescript
POST /api/canvas/shot/:shotId/confirm-refined

Request:
{
  refined_image_url: string;
}

Response:
{
  success: true;
}

副作用:
- 更新 shot_designs.generated_image_url = refined_image_url
- 更新 shot_designs.selection_status = "refined"
```

---

## 实现路线图

### Phase 1: 数据库迁移与基础模型（第 1-2 天）

**任务清单:**
- [ ] 创建数据库迁移文件
  - [ ] `character_prompt_templates` 表
  - [ ] `shot_prompt_compositions` 表
  - [ ] `nine_grid_generations` 表
  - [ ] 修改 `shot_designs` 表（添加新字段）
- [ ] 创建 Prisma Schema 定义
- [ ] 生成 Prisma Client
- [ ] 编写 TypeScript 类型定义（`src/types/character-prompt.ts`）
- [ ] 测试数据库迁移（开发环境）

**验收标准:**
- 数据库迁移成功执行
- Prisma Client 可正常查询新表
- 类型定义无 TypeScript 错误

---

### Phase 2: 角色身份证系统（第 3-5 天）

**任务清单:**
- [ ] 后端 API 实现
  - [ ] `POST /api/canvas/character-prompt/generate`（AI 生成）
  - [ ] `PUT /api/canvas/character-prompt/:id`（更新）
  - [ ] `DELETE /api/canvas/character-prompt/:id`（删除）
  - [ ] `GET /api/canvas/character/:characterId/prompts`（查询）
- [ ] 前端组件开发
  - [ ] `CharacterLibraryDrawer` 组件（角色库抽屉）
  - [ ] `CharacterPromptEditorDialog` 组件（编辑器对话框）
  - [ ] 集成到 `Canvas` 页面（添加"角色库"按钮）
- [ ] LLM Prompt 模板优化
  - [ ] 测试生成质量
  - [ ] 调整模板参数
- [ ] 测试
  - [ ] 单元测试（API 路由）
  - [ ] E2E 测试（生成流程）

**验收标准:**
- 用户可在角色库为角色生成基础版 Prompt
- 用户可添加变体版本（战斗装、正装等）
- AI 生成的 Prompt 质量符合预期
- 可手动编辑各字段并保存

---

### Phase 3: 分镜 Prompt 合成（第 6-7 天）

**任务清单:**
- [ ] 后端 API 实现
  - [ ] `POST /api/canvas/shot/:shotId/compose-prompt`
- [ ] 修改 `ShotNode` 组件
  - [ ] 显示涉及的角色标签
  - [ ] 显示 Prompt 合成状态
  - [ ] 添加"生成九宫格"按钮
- [ ] Prompt 合成逻辑
  - [ ] 角色 Prompt 拼接
  - [ ] 场景/动作/氛围提取
  - [ ] 风格前缀集成
- [ ] 测试
  - [ ] 单元测试（合成逻辑）
  - [ ] 集成测试（完整流程）

**验收标准:**
- 点击"生成九宫格"时自动合成 Prompt
- 合成的 Prompt 包含所有必要元素
- 可在九宫格对话框中预览和编辑最终 Prompt

---

### Phase 4: 九宫格生成与筛选（第 8-11 天）

**任务清单:**
- [ ] 后端 API 实现
  - [ ] `POST /api/canvas/shot/:shotId/generate-nine-grid`（SSE 流式）
  - [ ] `POST /api/canvas/nine-grid/:id/select`（选择图片）
- [ ] 前端组件开发
  - [ ] `NineGridGenerationDialog` 组件
  - [ ] SSE 进度监听
  - [ ] 九宫格图片展示与选择交互
- [ ] 图像生成逻辑
  - [ ] 串行生成策略（避免资源耗尽）
  - [ ] Seed 管理（确保可复现）
  - [ ] 错误处理与重试
- [ ] 存储与缓存
  - [ ] 九宫格图片存储（MinIO）
  - [ ] 数据库记录更新
- [ ] 测试
  - [ ] API 测试（生成流程）
  - [ ] 前端测试（UI 交互）

**验收标准:**
- 点击"生成九宫格"后能看到实时进度
- 9 张图片依次生成并展示
- 用户可点击选择图片
- 选中的图片高亮显示并保存

---

### Phase 5: Prompt 微调与重绘（第 12-13 天）

**任务清单:**
- [ ] 后端 API 实现
  - [ ] `POST /api/canvas/shot/:shotId/refine-prompt`
  - [ ] `POST /api/canvas/shot/:shotId/confirm-refined`
- [ ] 前端组件开发
  - [ ] `PromptRefineDialog` 组件
  - [ ] 对比视图（原图 vs 微调后）
- [ ] 测试
  - [ ] API 测试
  - [ ] UI 测试

**验收标准:**
- 选择图片后可点击"微调 Prompt"
- 修改 Prompt 后可重新生成单图
- 可对比原图和微调后的图片
- 确认后保存最终选择

---

### Phase 6: UI 优化与完善（第 14-15 天）

**任务清单:**
- [ ] 状态指示器优化
  - [ ] 各阶段生成状态可视化
  - [ ] 进度条与加载动画
- [ ] 错误处理与提示
  - [ ] 生成失败的友好提示
  - [ ] 重试机制
- [ ] 性能优化
  - [ ] 图片懒加载
  - [ ] React Query 缓存策略
- [ ] 响应式设计
  - [ ] 移动端适配（如需要）
- [ ] 无障碍性
  - [ ] 键盘导航支持
  - [ ] ARIA 标签

**验收标准:**
- 各状态清晰可见
- 错误提示友好且可操作
- 页面加载流畅
- 支持键盘操作

---

### Phase 7: 测试与文档（第 16-17 天）

**任务清单:**
- [ ] 编写单元测试
  - [ ] API 路由测试
  - [ ] 工具函数测试
- [ ] 编写集成测试
  - [ ] 完整工作流测试
- [ ] 编写 E2E 测试（可选）
  - [ ] 用户操作流程测试
- [ ] 更新文档
  - [ ] API 文档
  - [ ] 用户指南
  - [ ] 开发者文档
- [ ] Code Review
  - [ ] 代码质量检查
  - [ ] 性能审查

**验收标准:**
- 测试覆盖率 > 70%
- 所有测试通过
- 文档完整且准确
- Code Review 无阻塞问题

---

### Phase 8: 部署与监控（第 18 天）

**任务清单:**
- [ ] 数据库迁移（生产环境）
- [ ] 部署新版本
- [ ] 监控关键指标
  - [ ] API 响应时间
  - [ ] 图像生成成功率
  - [ ] 错误日志
- [ ] 用户反馈收集

**验收标准:**
- 生产环境迁移成功
- 无严重 Bug
- 监控指标正常

---

## 测试策略

### 1. 单元测试

**测试文件:**
- `src/lib/character-prompt-generator.test.ts`
- `src/lib/shot-prompt-composer.test.ts`
- `src/app/api/canvas/character-prompt/generate/route.test.ts`

**测试用例:**
```typescript
describe("CharacterPromptGenerator", () => {
  it("应该根据角色信息生成基础版 Prompt", async () => {
    const character = {
      name: "测试角色",
      age: 18,
      gender: "female",
      appearance: "银色长发，蓝色眼睛",
    };
    
    const result = await generateCharacterPrompt(character, "base");
    
    expect(result.appearance_prompt).toContain("silver hair");
    expect(result.appearance_prompt).toContain("blue eyes");
    expect(result.full_prompt).toBeTruthy();
  });
  
  it("应该为变体版本生成不同的服装 Prompt", async () => {
    const character = { /* ... */ };
    
    const baseResult = await generateCharacterPrompt(character, "base");
    const variantResult = await generateCharacterPrompt(character, "variant", "战斗装");
    
    expect(baseResult.clothing_prompt).not.toEqual(variantResult.clothing_prompt);
    expect(variantResult.clothing_prompt).toContain("armor"); // 战斗装应该包含护甲
  });
});

describe("ShotPromptComposer", () => {
  it("应该正确合成分镜 Prompt", async () => {
    const shotDesign = { /* ... */ };
    const characterPrompts = [ /* ... */ ];
    
    const result = await composeShotPrompt(shotDesign, characterPrompts);
    
    expect(result.final_prompt).toContain(characterPrompts[0].full_prompt);
    expect(result.final_prompt).toContain(shotDesign.scene_description);
  });
});
```

### 2. 集成测试

**测试场景:**
1. 完整的角色身份证生成流程
2. 九宫格生成与选择流程
3. Prompt 微调与重绘流程

```typescript
describe("角色身份证完整流程", () => {
  it("应该能够生成、编辑、保存角色身份证", async () => {
    // 1. 生成基础版
    const { body: basePrompt } = await request(app)
      .post("/api/canvas/character-prompt/generate")
      .send({ character_id: "test-id", version: "base" })
      .expect(200);
    
    expect(basePrompt.full_prompt).toBeTruthy();
    
    // 2. 编辑
    const { body: updated } = await request(app)
      .put(`/api/canvas/character-prompt/${basePrompt.id}`)
      .send({ appearance_prompt: "updated appearance" })
      .expect(200);
    
    expect(updated.full_prompt).toContain("updated appearance");
    
    // 3. 添加变体
    const { body: variant } = await request(app)
      .post("/api/canvas/character-prompt/generate")
      .send({ character_id: "test-id", version: "variant", variant_name: "战斗装" })
      .expect(200);
    
    expect(variant.variant_name).toBe("战斗装");
  });
});
```

### 3. E2E 测试（可选）

使用 Playwright 测试用户操作流程:

```typescript
test("用户完整工作流", async ({ page }) => {
  // 1. 进入 Canvas 页面
  await page.goto("/novel/canvas/test-timeline-id");
  
  // 2. 打开角色库
  await page.click('button:has-text("角色库")');
  
  // 3. 生成角色身份证
  await page.click('button:has-text("生成基础 Prompt")');
  await page.waitForSelector('text=生成成功');
  
  // 4. 生成九宫格
  await page.click('button:has-text("生成九宫格")');
  await page.waitForSelector('.grid-cols-3');
  
  // 5. 选择图片
  await page.click('.grid-cols-3 > div:nth-child(3)'); // 选择第 3 张
  await page.click('button:has-text("确认选择")');
  
  // 6. 验证结果
  await expect(page.locator('.selected-preview img')).toBeVisible();
});
```

---

## 风险与缓解策略

### 风险 1: AI 生成质量不稳定

**缓解措施:**
- 多次测试并调优 LLM Prompt 模板
- 提供手动编辑功能，用户可修正 AI 生成结果
- 收集用户反馈，持续优化

### 风险 2: 九宫格生成耗时过长

**缓解措施:**
- 串行生成策略（避免资源耗尽）
- SSE 实时反馈进度
- 提供"后台生成"选项（可选）

### 风险 3: 角色一致性仍不理想

**缓解措施:**
- 支持上传参考图（ControlNet）
- 提供负面 Prompt 定制
- 持续优化角色 Prompt 模板

### 风险 4: 数据库迁移失败

**缓解措施:**
- 开发环境充分测试
- 生产环境先备份数据
- 准备回滚方案

---

## 后续优化方向

1. **批量九宫格生成**: 支持一次性为多个分镜生成九宫格
2. **角色 Prompt 市场**: 用户可分享/购买优质角色 Prompt 模板
3. **ControlNet 集成**: 使用参考图提升生成一致性
4. **风格迁移**: 支持将已生成的图片转换为不同画风
5. **自动场景检测**: AI 自动识别剧情场景，推荐合适的角色 Prompt 变体
6. **WebSocket 实时协作**: 多人同时编辑同一个项目

---

**文档版本**: v1.0  
**最后更新**: 2026-01-26  
**负责人**: ComicAI Team
