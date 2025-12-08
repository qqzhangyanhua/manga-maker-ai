# 漫画描述优化功能使用指南

## 功能概述

为了帮助用户更好地描述漫画场景，我们新增了两个强大的辅助功能：

### 1. 📝 AI 描述优化助手
当用户描述不够清晰或缺乏细节时，AI 会：
- 分析原始描述的问题
- 生成优化后的详细描述
- 提供具体的改进建议
- 以漫画对话框风格展示对比

### 2. 💡 示例库
提供 12+ 精选的优秀描述案例，涵盖：
- 🎬 动作场景（英雄登场、剑术对决、极速追逐）
- 😊 情感表达（失意与决心、重逢瞬间、战前宣言）
- 🌳 环境氛围（魔法森林、赛博酒吧、废墟探索）
- 💬 对话互动（师徒传承、秘密揭晓、告白时刻）

---

## 管理员配置

### 前置要求

要启用 AI 优化功能，需要配置 **prompt_optimizer** 类型的 LLM Provider。

### 配置步骤

#### 方式 1：管理后台配置（推荐）

1. 访问 `/admin/llm-providers`
2. 点击"新增配置"
3. 填写以下信息：

| 字段 | 值 |
|------|-----|
| **provider_type** | `prompt_optimizer` |
| **provider_name** | `openai` |
| **model** | `gpt-4o-mini` 或 `gpt-4` |
| **base_url** | `https://api.openai.com` |
| **api_key** | 你的 OpenAI API Key |
| **priority** | `1` |
| **enabled** | ✅ 勾选 |

4. 保存配置

#### 方式 2：直接操作数据库

```sql
INSERT INTO llm_providers (
  provider_type, 
  provider_name, 
  model, 
  base_url, 
  api_key, 
  priority, 
  enabled
) VALUES (
  'prompt_optimizer',
  'openai',
  'gpt-4o-mini',
  'https://api.openai.com',
  'sk-your-api-key-here',
  1,
  true
);
```

### 推荐模型

| 模型 | 优点 | 缺点 | 推荐场景 |
|------|------|------|----------|
| **gpt-4o-mini** | 速度快，成本低 | 偶尔会过度优化 | 日常使用 |
| **gpt-4** | 质量高，理解力强 | 速度慢，成本高 | 专业用户 |
| **claude-3-5-sonnet** | 创意丰富，中文好 | 需要 Anthropic Key | 创意型项目 |

### 兼容性说明

系统使用 OpenAI-compatible API，支持任何符合该规范的服务：
- ✅ OpenAI 官方 API
- ✅ Azure OpenAI
- ✅ Anthropic Claude（需转接）
- ✅ 本地模型（Ollama、vLLM 等）

---

## 用户使用流程

### 场景 1：优化现有描述

1. 在首页生成器中输入描述，如：
   ```
   战士和龙
   ```

2. 点击 **"AI 优化描述"** 按钮

3. AI 会展示：
   - **分析**："描述过于简单，缺少动作、环境和情感细节"
   - **优化后**："勇敢的战士手持闪光之剑，面对喷火的巨龙，眼神坚定。背后是燃烧的城堡废墟，夕阳余晖透过烟雾照射下来..."
   - **建议**：
     - 添加具体的武器和装备描述
     - 描述战斗场景的环境氛围
     - 强化角色的情感和动作

4. 点击 **"应用优化"** 自动填充优化后的描述

### 场景 2：从示例开始

1. 点击 **"查看示例"** 按钮

2. 浏览分类示例：
   - 全部
   - 动作场景
   - 情感表达
   - 环境氛围
   - 对话互动

3. 使用搜索功能查找关键词（如"雨中"、"英雄"、"夕阳"）

4. 点击任意示例卡片，自动填充到输入框

5. 根据需要修改描述

---

## API 接口文档

### POST /api/prompt/optimize

优化用户输入的漫画描述。

**请求参数：**

```json
{
  "prompt": "战士和龙",
  "style": "日式漫画",
  "character": "幻想战士"
}
```

**成功响应（200）：**

```json
{
  "analysis": "描述过于简单，缺少视觉细节",
  "optimized": "勇敢的战士手持闪光之剑，面对喷火的巨龙...",
  "suggestions": [
    "添加具体的动作和表情",
    "描述环境和氛围",
    "增加光影和构图细节"
  ],
  "original": "战士和龙"
}
```

**错误响应：**

- `400`：描述为空或无效
- `503`：未配置 prompt_optimizer

---

## 示例库配置

示例数据位于 `src/config/prompt-examples.ts`。

### 添加新示例

```typescript
{
  id: "custom-1",
  title: "你的标题",
  category: "action", // action | emotion | environment | dialogue
  prompt: "详细的场景描述...",
  tags: ["标签1", "标签2"]
}
```

### 自定义分类颜色

在 `getCategoryColor()` 函数中修改：

```typescript
const map = {
  action: "bg-comic-red/20 text-comic-red border-comic-red/30",
  // 添加新分类颜色...
};
```

---

## 最佳实践

### 对于管理员

1. **优先配置轻量模型**：先用 `gpt-4o-mini` 测试，成本低速度快
2. **设置多个 Provider**：配置不同优先级的备用模型，避免单点故障
3. **监控 API 成本**：定期检查 OpenAI Dashboard 的使用量

### 对于用户

1. **先写简单描述**：不用担心写得不够好，AI 会帮你优化
2. **善用示例库**：从示例开始学习如何描述场景
3. **结合使用**：可以先选示例，再用 AI 优化调整
4. **保存好的描述**：优化后的描述可以复用到多个场景

---

## 故障排查

### 问题：点击"AI 优化"无反应

**解决方案：**
1. 确认描述长度 > 10 字
2. 打开浏览器控制台查看错误
3. 检查管理后台是否配置了 `prompt_optimizer`

### 问题：返回"AI 优化功能未配置"

**解决方案：**
1. 访问 `/admin/llm-providers`
2. 检查是否有 `provider_type = "prompt_optimizer"` 的记录
3. 确认 `enabled` 字段为 `true`

### 问题：优化结果质量不佳

**解决方案：**
1. 尝试更换为 `gpt-4` 模型
2. 在原始描述中多提供一些关键信息（角色、场景、情感）
3. 调整系统提示词（修改 `src/app/api/prompt/optimize/route.ts`）

### 问题：API 超时

**解决方案：**
1. 检查 `base_url` 是否正确（不要有多余的 `/v1`）
2. 测试 API Key 是否有效
3. 考虑增加请求超时时间

---

## 技术架构

```
用户输入 → GeneratorSection 
         ↓
    点击"AI 优化" 
         ↓
PromptOptimizationDialog → POST /api/prompt/optimize
         ↓
    callChatCompletionByType("prompt_optimizer")
         ↓
    查询 llm_providers 表（按 priority 排序）
         ↓
    调用 OpenAI-compatible API
         ↓
    解析 JSON 响应
         ↓
    展示对比界面（漫画风格）
         ↓
    用户点击"应用优化"
         ↓
    自动填充到输入框
```

---

## 未来计划

- [ ] 支持历史记录（保存用户优化过的描述）
- [ ] 用户自定义示例库
- [ ] 批量优化多个描述
- [ ] 集成到分镜编辑器
- [ ] 多语言支持（英文/日文提示词）
- [ ] 风格迁移（将一个风格的描述转换为另一个风格）

---

## 参考资料

- [LLM Provider 配置文档](./CHARACTER_SYSTEM_README.md#llm-providers)
- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [shadcn/ui Dialog 组件](https://ui.shadcn.com/docs/components/dialog)
