# 实现说明

## 重要提示：关于参考图片的使用

### 当前限制

**DALL-E API不支持参考图片输入**

OpenAI的DALL-E 3/2 API目前只支持文本prompt生成图片，不支持将图片作为输入进行图像生成。这意味着我们无法直接使用上传的参考图片来生成漫画。

### 解决方案

我们提供以下两种方案：

#### 方案1：使用支持图像输入的API（推荐）

**国内可选的图像生成服务：**

1. **通义万相（阿里云）**
   - 支持参考图生成
   - API文档：https://help.aliyun.com/document_detail/2712560.html
   
2. **文心一格（百度）**
   - 支持图像参考
   - API文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html

3. **智谱清言 CogView**
   - 支持图生图
   - API文档：https://open.bigmodel.cn/dev/api

**实现方式：**

修改 `comic-generator.js`，根据不同的API提供商实现不同的调用逻辑：

```javascript
async generatePanelImage(panel, referenceImageBase64, style) {
  if (this.config.COMIC_API_PROVIDER === 'aliyun') {
    // 使用阿里云通义万相的图生图API
    return await this.generateWithAliyun(panel, referenceImageBase64, style);
  } else if (this.config.COMIC_API_PROVIDER === 'baidu') {
    // 使用百度文心一格的API
    return await this.generateWithBaidu(panel, referenceImageBase64, style);
  } else {
    // 使用DALL-E（仅文本prompt）
    return await this.generateWithDALLE(panel, style);
  }
}
```

#### 方案2：增强文本提示词（当前实现）

如果使用DALL-E，我们通过以下方式尽可能保持角色一致性：

1. **第一步：分析参考图片**
   - 使用GPT-4 Vision分析上传的参考图片
   - 提取详细的角色特征描述（外貌、服装、特征等）

2. **第二步：在每个分镜prompt中添加角色描述**
   - 将提取的角色特征添加到每个visual_prompt中
   - 强调角色一致性

**实现代码：**

```javascript
// 在生成分镜前，先分析参考图片
async analyzeReferenceImage(imageBase64) {
  const requestData = {
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请详细描述图片中的人物特征，包括：外貌、发型、服装、表情、体型等，用英文回答。这个描述将用于AI图像生成。'
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        }
      ]
    }],
    max_tokens: 500
  };
  
  const response = await fetch(`${this.config.STORYBOARD_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.STORYBOARD_API_KEY}`
    },
    body: JSON.stringify(requestData)
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// 在生成漫画时，将角色描述添加到prompt
buildImagePrompt(panel, characterDescription, style) {
  let prompt = `Comic book panel illustration in ${style} style. `;
  
  // 添加详细的角色描述
  prompt += `CHARACTER: ${characterDescription}. `;
  
  // 添加分镜内容
  prompt += panel.visualPrompt;
  
  prompt += ` Maintain consistent character appearance throughout. Professional comic art.`;
  
  return prompt;
}
```

### 推荐实现步骤

1. **短期（当前）：** 使用增强文本提示词方案
   - 添加GPT-4 Vision图片分析功能
   - 在分镜生成时提取角色特征
   - 在每个分镜的prompt中包含角色描述

2. **中期：** 支持多个图像生成API
   - 添加API提供商配置选项
   - 实现阿里云/百度等API的适配器
   - 让用户可以选择使用哪个服务

3. **长期：** 使用专业的角色一致性方案
   - 集成LoRA模型训练
   - 使用Stable Diffusion + ControlNet
   - 实现更精细的角色控制

## 当前实现状态

### 已实现功能

✅ 分镜脚本生成（纯文本，不需要图片）
✅ 分镜脚本编辑功能
✅ 重新生成分镜功能
✅ Loading状态显示
✅ 漫画图片生成（使用DALL-E + 文本prompt）

### 待实现功能

⏳ GPT-4 Vision分析参考图片
⏳ 将角色描述集成到分镜prompt
⏳ 支持其他图像生成API
⏳ 角色一致性优化

## 配置示例

### 使用DALL-E（当前）

```javascript
const CONFIG = {
  COMIC_API_KEY: 'sk-your-openai-key',
  COMIC_API_BASE: 'https://api.openai.com/v1',
  COMIC_MODEL: 'dall-e-3',
  COMIC_API_PROVIDER: 'openai', // 标识使用OpenAI
};
```

### 使用阿里云通义万相（未来）

```javascript
const CONFIG = {
  COMIC_API_KEY: 'your-aliyun-api-key',
  COMIC_API_BASE: 'https://dashscope.aliyuncs.com/api/v1',
  COMIC_MODEL: 'wanx-v1',
  COMIC_API_PROVIDER: 'aliyun',
};
```

## 用户指南

### 如何获得更好的角色一致性

1. **使用清晰的参考图片**
   - 正面照效果最好
   - 确保光线充足
   - 避免复杂背景

2. **在故事描述中详细说明角色特征**
   ```
   主角是一只白色的兔子，粉红色的耳朵，大大的眼睛，
   穿着黑色背心和蓝色运动裤...
   ```

3. **在分镜编辑中强调角色特征**
   - 编辑每个分镜的visual_prompt
   - 确保角色描述一致

4. **使用一致的风格描述**
   - 保持相同的画风描述
   - 使用相同的色调和质感描述

### 成本对比

| 方案 | 每格成本 | 角色一致性 | 实现难度 |
|------|---------|----------|---------|
| DALL-E 3 + 文本 | $0.04 | ⭐⭐⭐ | 简单 |
| 通义万相 + 参考图 | ¥0.02 | ⭐⭐⭐⭐ | 中等 |
| Stable Diffusion + LoRA | 免费 | ⭐⭐⭐⭐⭐ | 复杂 |

## 后续开发计划

### Phase 1: 图片分析（1-2天）
- [ ] 集成GPT-4 Vision
- [ ] 实现参考图片特征提取
- [ ] 将特征描述添加到分镜prompt

### Phase 2: 多API支持（3-5天）
- [ ] 设计API适配器架构
- [ ] 实现阿里云API适配
- [ ] 实现百度API适配
- [ ] 添加API选择配置

### Phase 3: 优化体验（2-3天）
- [ ] 添加角色预览
- [ ] 实现分镜预览
- [ ] 批量编辑功能
- [ ] 导出功能

## 技术参考

### GPT-4 Vision API

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this character in detail' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }
      ]
    }]
  })
});
```

### 阿里云通义万相 API

```javascript
const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image-synthesis/image-synthesis', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  body: JSON.stringify({
    model: 'wanx-v1',
    input: {
      prompt: 'your prompt',
      ref_img: 'base64 image' // 支持参考图
    }
  })
});
```

## 结论

当前实现已完成基础功能，但角色一致性受限于DALL-E API的限制。

**推荐方案：**
- **近期：** 添加GPT-4 Vision图片分析
- **中期：** 集成支持参考图的国内API
- **长期：** 考虑自建Stable Diffusion服务

用户可以根据自己的需求和预算选择合适的方案。

