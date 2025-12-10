# 对话文字生成指南

## 概述

本系统现在支持两种对话框生成模式：

1. **空白对话框模式**（默认，推荐）：AI 只画对话框轮廓，不填充文字，避免中文乱码
2. **带文字模式**（实验性）：AI 尝试在对话框内生成文字，但成功率取决于文字复杂度

---

## 使用方式

### 方法 1：生成空白对话框（默认）

```javascript
// 生成单张完整漫画（所有分镜在一张图上）
const imageUrl = await comicGenerator.generateSingleComicImage(
  storyboard,
  referenceImageBase64,
  false  // enableText = false（默认），生成空白对话框
);

// 或者逐格生成
const imageUrl = await comicGenerator.generatePanelImage(
  panel,
  referenceImageBase64,
  style,
  false  // enableText = false（默认），生成空白对话框
);
```

**优点：**
- ✅ 避免中文乱码
- ✅ 生成速度更快
- ✅ 可后期使用 Canvas 或图片编辑工具添加完美的文字

---

### 方法 2：尝试生成带文字的对话框（实验性）

```javascript
// 生成带文字的完整漫画
const imageUrl = await comicGenerator.generateSingleComicImage(
  storyboard,
  referenceImageBase64,
  true  // enableText = true，尝试生成文字
);

// 或者逐格生成
const imageUrl = await comicGenerator.generatePanelImage(
  panel,
  referenceImageBase64,
  style,
  true  // enableText = true，尝试生成文字
);
```

**注意事项：**
- ⚠️ 中文成功率很低，超过 4 个字基本会乱码
- ⚠️ 英文短词成功率较高（如 "BUG!", "ERROR", "YES!"）
- ⚠️ 建议使用简化对话功能（见下文）

---

## 对话文字优化策略

### 1. 自动简化功能

系统内置了 `simplifyDialogue()` 方法，会自动将长句简化为短词：

| 原始对话 | 简化后 | 说明 |
|---------|--------|------|
| "再跑不通我就原地爆炸" | "BUG!!" | 转为英文短词 |
| "这个bug太难了" | "BUG!!" | 转为英文短词 |
| "代码出错了" | "ERROR" | 转为英文 |
| "终于成功了" | "YES!" | 转为英文 |
| "太好了" | "好!" | 中文截取到 4 字内 |
| "怎么办" | "啊!" | 中文截取到 4 字内 |

### 2. 自定义简化映射

你可以编辑 `comic-generator.js` 的 `simplifyDialogue` 方法，添加自己的映射规则：

```javascript
simplifyDialogue(dialogue) {
  if (!dialogue) return null;
  
  const simplifyMap = {
    '你的长对话': '短词',  // 添加你的映射
    '另一个长对话': 'OK!',
    // ... 更多映射
  };
  
  if (simplifyMap[dialogue]) {
    return simplifyMap[dialogue];
  }
  
  return dialogue.substring(0, 4);  // 默认截取前4字
}
```

### 3. AI 文字生成成功率提升技巧

如果一定要生成文字，遵循以下规则：

#### ✅ 高成功率（推荐）
- 英文短词：`"BUG!"`, `"ERROR"`, `"YES!"`, `"NO!"`
- 数字：`"404"`, `"100%"`
- 单个表情符号：`"!!!"`, `"???"`
- 极短中文（1-2字）：`"好!"`, `"啊!"`

#### ⚠️ 中等成功率
- 3-4 个中文字：`"太棒了"`, `"完成了"`
- 简单英文短语：`"Oh no"`, `"Fix it"`

#### ❌ 低成功率（不推荐）
- 超过 4 个中文字：`"再跑不通我就原地爆炸"`
- 复杂英文句子：`"The code is not working properly"`
- 中英混合：`"这个BUG太难了"`

---

## 提示词优化细节

### 对比：旧版 vs 新版

#### ❌ 旧版（会乱码）
```
对话: "再跑不通我就原地爆炸！"
要求: 确保中文对话清晰可读，不要出现乱码
```

#### ✅ 新版（空白对话框）
```
重要要求:
Draw speech bubbles for the characters, but keep the speech bubbles 
strictly empty and blank. Do not put any text inside the bubbles. 
I will add text later.
```

#### ⚠️ 新版（尝试生成文字）
```
--- 第 1 格 ---
场景: 程序员在电脑前抓狂
动作: 双手抱头
视觉: 屏幕显示代码错误
[TEXT] The speech bubble clearly says "BUG!!" in bold, legible text.
```

**关键点：**
1. 使用英文双引号 `""` 包裹文字
2. 用 `[TEXT]` 标签独立出文字指令
3. 强调 `bold, legible text` 提高清晰度
4. 文字越短越好

---

## 实际应用建议

### 推荐流程（两步走）

1. **第一步：生成空白对话框漫画**
   ```javascript
   const imageUrl = await comicGenerator.generateSingleComicImage(
     storyboard,
     referenceImageBase64,
     false  // 生成空白对话框
   );
   ```

2. **第二步：使用 Canvas 或图片编辑工具添加文字**
   - 可以使用 JavaScript Canvas API
   - 可以使用图片编辑软件（Photoshop, GIMP）
   - 可以开发一个简单的在线文字添加工具

### 高级用户（实验性）

如果你的对话都很短（4 字以内或英文短词），可以尝试：

```javascript
const imageUrl = await comicGenerator.generateSingleComicImage(
  storyboard,
  referenceImageBase64,
  true  // 尝试生成文字
);
```

**建议在使用前：**
1. 检查所有对话是否都很短
2. 准备好备用方案（空白对话框 + 后期添加文字）
3. 多生成几次，选择效果最好的

---

## 常见问题

### Q1: 为什么 AI 生成的中文会乱码？

**A:** AI 图像模型（如 DALL-E, Stable Diffusion）本质上是在"画"字，而不是"写"字。它们：
- 不理解汉字的笔画结构
- 只是根据训练数据模仿字的外观
- 复杂的笔画组合容易出错

### Q2: 英文也会乱码吗？

**A:** 英文成功率高很多，因为：
- 26 个字母的组合比汉字简单
- 训练数据中英文样本更多
- 但长句子依然会出错

### Q3: 能不能让 AI 学会正确写中文？

**A:** 目前的技术限制下很难。需要：
- 专门针对中文文字的训练
- 更大的模型和数据集
- 可能需要结合 OCR 和文字渲染技术

### Q4: 有没有其他方案？

**A:** 是的，推荐方案：

1. **方案 A：空白对话框 + Canvas 添加文字**
   - 最可靠的方案
   - 文字完美清晰
   - 可以自定义字体、大小、颜色

2. **方案 B：使用图像编辑工具**
   - 生成空白对话框漫画
   - 导出后用 Photoshop/GIMP 添加文字层

3. **方案 C：混合方案**
   - 简单对话（1-2 字）让 AI 生成
   - 复杂对话留空，后期添加

---

## 代码示例：后期添加文字

如果你选择生成空白对话框，可以使用以下代码添加文字：

```javascript
async function addTextToComic(imageUrl, textConfig) {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  // 绘制原图
  ctx.drawImage(img, 0, 0);
  
  // 添加文字
  textConfig.forEach(config => {
    ctx.font = `bold ${config.size}px Arial`;
    ctx.fillStyle = config.color || '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(config.text, config.x, config.y);
  });
  
  return canvas.toDataURL('image/png');
}

// 使用示例
const textConfig = [
  { text: '再跑不通我就原地爆炸！', x: 200, y: 100, size: 20 },
  { text: 'Segmentation Fault!', x: 200, y: 300, size: 18, color: '#FF0000' }
];

const finalImage = await addTextToComic(imageUrl, textConfig);
```

---

## 总结

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 空白对话框 | 避免乱码，后期灵活 | 需要额外步骤 | ⭐⭐⭐⭐⭐ |
| 英文短词 | 成功率较高 | 不适合中文漫画 | ⭐⭐⭐⭐ |
| 简化中文（1-4字） | 有一定成功率 | 依然可能乱码 | ⭐⭐⭐ |
| 原始长句 | 无需修改对话 | 基本必然乱码 | ⭐ |

**最佳实践：**
1. 默认使用空白对话框模式（`enableText = false`）
2. 开发一个简单的文字添加工具
3. 如果想实验，先用英文短词测试
4. 保持对话简短（4 字以内）





