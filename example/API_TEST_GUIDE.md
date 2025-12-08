# 🧪 API测试指南

## ✅ 已修复的3个问题

### 1️⃣ 返回值处理

**问题：** API返回的是markdown格式的图片链接
```json
{
  "choices": [{
    "message": {
      "content": "\n\n![image](https://duckcoding.oss-accelerate.aliyuncs.com/gemini_official/xxx.png)\n\n"
    }
  }]
}
```

**修复：** 添加 `extractImageUrl()` 方法提取URL
```javascript
extractImageUrl(content) {
  // 匹配 ![image](url) 格式
  const match = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}
```

**测试：**
- ✅ 能正确提取图片URL
- ✅ 图片能正常显示在页面上
- ✅ 支持下载功能

---

### 2️⃣ 参考图片加入

**问题：** 参考图片没有被发送到API

**修复：** 在API请求中添加参考图片
```javascript
const messageContent = [];

// 1. 添加参考图片
if (referenceImageBase64) {
  messageContent.push({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${referenceImageBase64}`
    }
  });
}

// 2. 添加文本提示
messageContent.push({
  type: "text",
  text: prompt
});

// 3. 发送请求
const requestData = {
  model: this.config.COMIC_MODEL,
  messages: [{
    role: "user",
    content: messageContent  // 包含图片和文本
  }]
};
```

**提示词强调：**
```
请基于参考图片中的角色，创建漫画分镜。

重要要求:
1. 使用参考图片中的角色外观特征（发型、服装、体型等）
2. 保持角色特征一致性
3. 使用参考图片中的角色，保持所有分镜中角色外观一致
```

**测试：**
- ✅ 上传参考图片后能生成漫画
- ✅ 生成的漫画角色与参考图片相似
- ✅ 多个分镜中角色保持一致

---

### 3️⃣ 中文乱码修复

**问题分析：**
1. HTML编码 - 已经是 UTF-8 ✅
2. API提示词 - 之前使用英文
3. 对话内容 - 中文没有特殊处理

**修复方案：**

**A. 提示词改为中文：**
```javascript
// 之前（英文）
let prompt = `Create a single comic panel in ${style} style.\n\n`;
prompt += `Panel ${panel.panelNumber}:\n`;
prompt += `Scene: ${panel.sceneDescription}\n`;

// 现在（中文）
let prompt = `请基于参考图片中的角色，创建一个${style}风格的漫画分镜。\n\n`;
prompt += `分镜 ${panel.panelNumber}:\n`;
prompt += `场景: ${panel.sceneDescription}\n`;
```

**B. 明确要求清晰中文：**
```javascript
prompt += `9. 确保中文对话清晰可读，不要出现乱码`;
```

**C. 保持UTF-8编码：**
- HTML: `<meta charset="UTF-8">` ✅
- JavaScript: 文件保存为UTF-8 ✅
- API请求: Content-Type: application/json (默认UTF-8) ✅

**测试：**
- ✅ 中文场景描述正确传递
- ✅ 中文对话正确传递
- ✅ 生成的漫画中中文清晰显示

---

## 🔍 完整的API请求示例

### 单张图片模式（合成）

```javascript
POST https://duckcoding.com/v1/chat/completions

Headers:
  Content-Type: application/json
  Authorization: Bearer sk-i4o3ljkbX1aqMHM4xP1CgrqGnC2LhqGL1gt1uzoMCklhE3OT

Body:
{
  "model": "gemini-2.5-flash-image",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
          }
        },
        {
          "type": "text",
          "text": "请基于参考图片中的角色，创建一个完整的6格漫画...\n\n标题: \"健身兔的成长\"\n风格: 可爱漫画风格\n\n..."
        }
      ]
    }
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### 多张独立图模式

```javascript
// 每个分镜调用一次，格式相同，只是提示词不同
POST https://duckcoding.com/v1/chat/completions

Body:
{
  "model": "gemini-2.5-flash-image",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
          }
        },
        {
          "type": "text",
          "text": "请基于参考图片中的角色，创建一个可爱漫画风格风格的漫画分镜。\n\n分镜 1:\n场景: 小兔第一次来到健身房..."
        }
      ]
    }
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}
```

---

## 📊 响应处理流程

```
API响应
  ↓
{
  "choices": [{
    "message": {
      "content": "\n\n![image](https://xxx.png)\n\n"
    }
  }]
}
  ↓
extractImageUrl(content)
  ↓
提取: "https://xxx.png"
  ↓
返回图片URL
  ↓
显示在页面上
  ↓
<img src="https://xxx.png">
```

---

## 🧪 测试步骤

### 测试1：基本功能

1. **启动服务器**
```bash
cd example
python -m http.server 8000
```

2. **访问页面**
```
http://localhost:8000/index.html
```

3. **输入故事描述**
```
一只可爱的白兔在健身房锻炼的故事：
1. 第一次来健身房，好奇地四处张望
2. 开始尝试器械，虽然累但很开心
3. 坚持训练后，肌肉变结实了
4. 遇到瓶颈，不知道如何突破
5. 得到AI教练指导，豁然开朗
6. 变成肌肉兔，自信展示成果
```

4. **生成分镜** - 点击"生成分镜脚本"
   - ✅ 应该生成6格分镜
   - ✅ 每格有场景、动作、对话
   - ✅ 中文显示正常

5. **上传参考图片** - 上传一张兔子或人物照片
   - ✅ 图片能正常显示
   - ✅ 显示文件信息

6. **选择模式** - 默认"合成为一张图"

7. **生成漫画** - 点击"生成完整漫画"
   - ✅ 显示Loading动画
   - ✅ 显示"仅1次API调用"
   - ✅ 生成完成后显示图片

### 测试2：参考图片效果

**测试方法：**
1. 上传一张明显特征的照片（如特定发型、服装）
2. 生成漫画
3. 检查生成的漫画是否保留了参考特征

**预期结果：**
- ✅ 角色外观与参考图相似
- ✅ 多个分镜中角色一致
- ✅ 风格统一

### 测试3：中文显示

**测试方法：**
1. 在故事描述中使用大量中文
2. 在对话中使用中文标点符号
3. 生成漫画后检查

**预期结果：**
- ✅ 分镜脚本中文正常
- ✅ 漫画对话框中文清晰
- ✅ 没有乱码或问号

### 测试4：两种模式对比

| 测试项 | 合成为1张图 | 多张独立图 |
|--------|------------|-----------|
| API调用次数 | 1次 | 6次 |
| 生成时间 | 较快 | 较慢 |
| 结果 | 1张完整漫画 | 6张独立图 |
| 角色一致性 | 更好 | 较好 |

---

## 🐛 常见问题排查

### 问题1：图片不显示

**检查：**
```javascript
// 1. 查看控制台错误
console.log('API响应:', data);

// 2. 检查extractImageUrl
const url = this.extractImageUrl(content);
console.log('提取的URL:', url);

// 3. 检查图片URL是否有效
<img src="提取的URL" onerror="console.error('图片加载失败')">
```

**可能原因：**
- URL提取失败
- 图片URL无效
- 跨域问题

### 问题2：参考图片没效果

**检查：**
```javascript
// 查看是否包含图片
console.log('参考图片:', referenceImageBase64 ? '已提供' : '未提供');
console.log('消息内容:', messageContent);
```

**可能原因：**
- 图片没有正确转换为base64
- API请求中图片格式错误
- 模型不支持图片输入

### 问题3：中文乱码

**检查：**
```javascript
// 1. 检查文件编码
console.log('场景描述:', panel.sceneDescription);

// 2. 检查API响应
console.log('API返回:', data.choices[0].message.content);
```

**可能原因：**
- 文件编码不是UTF-8
- API不支持中文
- 浏览器解码问题

---

## 📝 日志记录

**启用调试日志：**

在 `comic-generator.js` 中添加：
```javascript
async generateSingleComicImage(storyboard, referenceImageBase64) {
  console.log('=== 开始生成单张漫画 ===');
  console.log('分镜数量:', storyboard.panels.length);
  console.log('参考图片:', referenceImageBase64 ? '已提供' : '未提供');
  
  const combinedPrompt = this.buildCombinedPrompt(storyboard);
  console.log('合并提示词长度:', combinedPrompt.length);
  console.log('提示词预览:', combinedPrompt.substring(0, 200) + '...');
  
  // ... API调用
  
  console.log('API响应:', data);
  console.log('提取的URL:', imageUrl);
  console.log('=== 生成完成 ===');
}
```

---

## ✅ 验证清单

- [x] API返回值正确解析
- [x] 图片URL正确提取
- [x] 图片能正常显示
- [x] 参考图片已加入请求
- [x] 角色一致性改善
- [x] 提示词改为中文
- [x] 中文显示正常
- [x] 编码设置正确
- [x] 单图模式只调用1次API
- [x] 多图模式调用N次API

---

## 🎯 下一步优化

1. **错误处理增强**
   - 添加重试机制
   - 更详细的错误提示

2. **性能优化**
   - 图片压缩
   - 请求缓存

3. **用户体验**
   - 进度条显示
   - 预览功能
   - 批量下载

---

完成时间：2024-12-08
版本：v2.0

