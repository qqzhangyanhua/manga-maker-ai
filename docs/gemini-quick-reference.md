# Gemini 角色一致性 - 快速参考

## 🚀 快速开始（3 步）

### 1️⃣ 准备角色参考图
```sql
-- 确保角色有参考图
UPDATE Character 
SET reference_image = 'https://your-image-url.jpg'
WHERE id = 'character-id';
```

### 2️⃣ 选择角色
- 打开专注模式
- 右侧面板 → "出场角色"
- 点击选择角色

### 3️⃣ 生成图片
- 编辑提示词
- 点击"生成图片"
- ✅ 自动使用角色参考图

---

## 📋 工作原理

```
用户选择角色 
  ↓
自动获取 reference_image 或 base_image_url
  ↓
合并到参考图列表
  ↓
增强提示词（添加角色信息 + 风格指令）
  ↓
传递给 Gemini-Pro
  ↓
生成一致风格的图片 ✨
```

---

## 🎯 推荐配置

### 角色一致性优先
```typescript
{
  modelName: "gemini-2.0-flash-exp",
  numInferenceSteps: 60,
  guidanceScale: 10,
  aspectRatio: "16:9"
}
```

### 速度优先
```typescript
{
  modelName: "gemini-2.0-flash-exp",
  numInferenceSteps: 35,
  guidanceScale: 8,
}
```

---

## 💡 最佳实践

### ✅ 推荐
- 使用清晰的正面照作为参考图
- 1-3 个角色效果最佳
- 参考图总数 2-4 张
- 提示词描述场景，不描述角色外观

### ❌ 避免
- 模糊或低分辨率参考图
- 超过 5 个角色
- 参考图风格差异过大
- 在提示词中详细描述角色外观（会冲突）

---

## 🔧 参数对照表

| 参数 | 角色一致性 | 速度 | 创意性 |
|------|-----------|------|--------|
| **guidanceScale: 12** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **guidanceScale: 10** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **guidanceScale: 7** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **steps: 70** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **steps: 50** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **steps: 30** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🐛 快速诊断

### 角色不像参考图？
```
1. 检查参考图质量（清晰度、角度）
2. 提高 guidanceScale 到 10-12
3. 增加 numInferenceSteps 到 60-70
4. 确认参考图 URL 可访问
```

### 风格不一致？
```
1. 确保所有参考图风格统一
2. 减少参考图数量
3. 在提示词中添加风格描述
4. 使用同一批次生成的角色图
```

### 生成失败？
```
1. 查看控制台日志
2. 检查 API Key 配置
3. 验证参考图 URL
4. 确认网络连接
```

---

## 📊 效果示例

### 场景 1: 单角色
```
角色: 小明 (reference_image: ✅)
提示词: "A boy reading a book in library"
参考图: 1 张（小明）
结果: ⭐⭐⭐⭐⭐ 完美一致
```

### 场景 2: 多角色
```
角色: 小明 + 小红 (reference_image: ✅)
提示词: "Two students talking in classroom"
参考图: 2 张（小明 + 小红）
结果: ⭐⭐⭐⭐ 很好，偶尔需要重生成
```

### 场景 3: 风格参考
```
角色: 小明 (reference_image: ✅)
提示词: "A boy in manga style"
参考图: 2 张（小明 + 风格参考）
结果: ⭐⭐⭐⭐⭐ 完美，角色和风格都一致
```

---

## 🎨 提示词模板

### 模板 1: 日常场景
```
[角色] [动作] in [地点], [表情], [环境细节]

示例:
"A girl walking in a park, smiling, cherry blossoms falling"
```

### 模板 2: 对话场景
```
[角色1] and [角色2] [动作], [表情], [环境]

示例:
"A boy and a girl talking at a cafe, happy expressions, warm lighting"
```

### 模板 3: 动作场景
```
[角色] [动作细节], [视角], [环境], [氛围]

示例:
"A girl running through the rain, side view, city street, dramatic lighting"
```

---

## 🔗 相关链接

- [完整指南](./gemini-character-consistency-guide.md)
- [专注模式文档](./focus-mode-user-guide.md)
- [API 文档](../src/app/api/panel/generate-image/route.ts)

---

**提示**: 保存此文档到书签，生成图片时随时查阅！
