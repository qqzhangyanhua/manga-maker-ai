# Gemini-Pro 角色一致性生成指南

## 🎯 功能概述

本功能实现了使用 Gemini-Pro 生成图片时，自动使用推荐角色的人物模样，并保持风格一致。

---

## 🏗️ 技术架构

### 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│  1. 用户选择角色                                              │
│     ↓                                                        │
│  2. 自动获取角色参考图 (reference_image / base_image_url)    │
│     ↓                                                        │
│  3. 合并手动参考图 + 角色参考图                               │
│     ↓                                                        │
│  4. 增强提示词（添加角色信息 + 风格一致性指令）                │
│     ↓                                                        │
│  5. 传递给 Gemini-Pro API                                    │
│     ↓                                                        │
│  6. Gemini 理解参考图并生成一致风格的图片                     │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. **智能参考图收集** (`collectCharacterReferenceImages`)

```typescript
// 功能：自动收集选中角色的参考图
// 优先级：reference_image > base_image_url
// 去重：避免重复添加相同的参考图

const enhancedReferenceImages = await collectCharacterReferenceImages(
  state.config.selectedCharacters,  // 用户选择的角色ID列表
  state.config.referenceImages       // 用户手动选择的参考图
);
```

**输出示例**:
```json
[
  {
    "id": "manual-1",
    "url": "https://example.com/style-ref.jpg",
    "label": "风格参考",
    "type": "style"
  },
  {
    "id": "character-abc123",
    "url": "https://example.com/character-1.jpg",
    "label": "角色: 小明",
    "type": "character"
  },
  {
    "id": "character-def456",
    "url": "https://example.com/character-2.jpg",
    "label": "角色: 小红",
    "type": "character"
  }
]
```

#### 2. **提示词增强** (`buildEnhancedPrompt`)

```typescript
// 功能：在原始提示词基础上添加：
// 1. 角色名称列表
// 2. 风格一致性指令
// 3. 漫画风格标签

const enhancedPrompt = buildEnhancedPrompt(
  basePrompt,                        // 原始提示词
  state.config.selectedCharacters,   // 选中的角色
  enhancedReferenceImages.length     // 参考图数量
);
```

**输出示例**:
```
原始提示词: "A girl standing in a classroom"

增强后:
"A girl standing in a classroom

Characters in this scene: 小明, 小红

Important: Please generate the image in the EXACT SAME STYLE as the reference images provided. 
Maintain consistent character appearance, art style, line work, and color palette. 
The characters should look identical to their reference images.

Art style: Japanese manga/comic style"
```

---

## 📖 使用指南

### 步骤 1: 准备角色参考图

确保角色有可用的参考图（任选其一）：

1. **reference_image** (推荐) - 专用参考图
2. **base_image_url** - 角色主图

**检查方法**:
```sql
SELECT id, name, reference_image, base_image_url 
FROM Character 
WHERE user_id = 'your-user-id';
```

### 步骤 2: 在专注模式中选择角色

1. 打开专注模式
2. 在右侧配置面板找到"出场角色"
3. 点击选择需要的角色（支持多选）
4. 看到蓝色提示：💡 选择的角色将自动使用其参考图生成

### 步骤 3: （可选）添加风格参考图

1. 点击"参考图片"
2. 选择额外的风格参考图
3. 这些图片会与角色参考图合并

### 步骤 4: 生成图片

1. 编辑提示词（描述场景）
2. 点击"生成图片"按钮
3. 系统自动：
   - 收集角色参考图
   - 增强提示词
   - 传递给 Gemini-Pro

---

## 🎨 最佳实践

### 1. 角色参考图质量

**推荐**:
- ✅ 清晰的正面照
- ✅ 完整的人物形象
- ✅ 统一的画风
- ✅ 高分辨率（至少 512x512）

**避免**:
- ❌ 模糊或低分辨率图片
- ❌ 侧面或背面照
- ❌ 多人合照
- ❌ 风格差异过大

### 2. 提示词编写

**推荐格式**:
```
[场景描述], [动作], [表情], [环境细节]

示例:
"A young girl with long black hair standing in a sunny classroom, 
smiling gently, holding a book, sunlight streaming through windows"
```

**关键词**:
- 场景: `classroom`, `park`, `street`, `room`
- 动作: `standing`, `sitting`, `running`, `talking`
- 表情: `smiling`, `sad`, `surprised`, `angry`
- 视角: `front view`, `side view`, `close-up`

### 3. 参考图数量

**建议配置**:
- 1-2 个角色: 最佳效果
- 3-4 个角色: 良好效果
- 5+ 个角色: 可能降低一致性

**参考图总数**:
- 推荐: 2-4 张（1 风格 + 1-3 角色）
- 最大: 6 张（Gemini 限制）

### 4. 模型参数调优

**角色一致性优先**:
```typescript
{
  modelName: "gemini-2.0-flash-exp",  // 推荐模型
  numInferenceSteps: 50-70,            // 更高步数 = 更准确
  guidanceScale: 8-12,                 // 更高引导 = 更贴近参考
  aspectRatio: "16:9"                  // 根据需求调整
}
```

**速度优先**:
```typescript
{
  modelName: "gemini-2.0-flash-exp",
  numInferenceSteps: 30-40,
  guidanceScale: 7-9,
}
```

---

## 🔧 高级配置

### 自定义风格一致性指令

如果需要更精确的控制，可以在提示词中添加：

```
IMPORTANT STYLE REQUIREMENTS:
1. Character appearance MUST match the reference images exactly
2. Maintain consistent line thickness and shading style
3. Use the same color palette as reference images
4. Keep facial features identical to references
5. Preserve character proportions and body types
```

### 批量生成配置

批量生成时，系统会：
1. 为每个分镜自动选择对应的角色
2. 复用相同的参考图配置
3. 保持风格一致性

**注意**: 批量生成前建议先测试 1-2 个分镜，确认效果满意。

---

## 🐛 常见问题

### Q1: 生成的角色和参考图不像？

**可能原因**:
1. 参考图质量不佳
2. 提示词与参考图冲突
3. 引导强度（guidance_scale）太低

**解决方案**:
- 使用更清晰的参考图
- 提高 `guidanceScale` 到 10-12
- 在提示词中明确描述角色特征

### Q2: 多个角色时风格不一致？

**可能原因**:
1. 参考图风格差异大
2. 参考图数量过多

**解决方案**:
- 确保所有参考图风格统一
- 减少参考图数量（保留最重要的）
- 使用同一批次生成的角色图

### Q3: 生成速度慢？

**可能原因**:
1. 参考图过大
2. 推理步数过高
3. 网络延迟

**解决方案**:
- 压缩参考图到 1024x1024
- 降低 `numInferenceSteps` 到 30-40
- 配置代理（如果在国内）

### Q4: 参考图没有生效？

**检查清单**:
- [ ] 角色是否有 `reference_image` 或 `base_image_url`
- [ ] 参考图 URL 是否可访问
- [ ] 是否选择了角色
- [ ] 查看控制台日志确认参考图已收集

---

## 📊 效果对比

### 不使用参考图
```
提示词: "A girl in a classroom"
结果: 随机生成，每次都不同
```

### 使用参考图
```
提示词: "A girl in a classroom"
参考图: character-1.jpg
结果: 角色外观与参考图一致，风格统一
```

### 使用参考图 + 增强提示词
```
提示词: "A girl in a classroom\n\nCharacters: 小明\n\nMaintain consistent style..."
参考图: character-1.jpg, style-ref.jpg
结果: 最佳效果，角色和风格都一致
```

---

## 🔍 调试技巧

### 查看日志

生成时查看控制台输出：

```bash
# 参考图收集日志
✓ 添加角色参考图: 小明 → https://...
✓ 共收集 3 张参考图（1 手动 + 2 角色）

# 提示词增强日志
📝 增强后的提示词: ...

# API 调用日志
========== OpenAI/Gemini API 调用详情 ==========
参考图数量: 3
参考图总大小: 245.67 KB (base64)
```

### 测试参考图

使用 API 测试工具验证参考图：

```bash
curl -X POST https://your-api/api/panel/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "panel_id": "test-panel",
    "prompt": "A girl standing",
    "reference_image_urls": [
      "https://example.com/character-1.jpg"
    ]
  }'
```

---

## 📚 相关文档

- [Gemini API 文档](https://ai.google.dev/docs)
- [角色参考图管理](./character-reference.md)
- [专注模式使用指南](./focus-mode-user-guide.md)
- [批量生成最佳实践](./batch-generation-guide.md)

---

## 🎉 总结

通过本功能，你可以：

1. ✅ **自动使用角色参考图** - 无需手动选择
2. ✅ **保持风格一致** - 智能提示词增强
3. ✅ **支持多角色** - 同时处理多个角色
4. ✅ **灵活配置** - 手动参考图 + 自动角色参考图

**最佳实践**: 先准备好高质量的角色参考图，然后在专注模式中选择角色，系统会自动处理其余部分！

---

**更新时间**: 2026-01-09  
**版本**: v1.0  
**作者**: AI Assistant
