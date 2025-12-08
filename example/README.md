# AI漫画生成器

将照片转换成分镜漫画的AI工具。

## 功能特点

- 📸 **上传照片** - 支持JPG、PNG、WebP格式
- 📝 **智能分镜** - AI自动生成漫画分镜脚本
- 🎨 **漫画生成** - 基于分镜生成完整漫画
- 🔄 **流程可视化** - 清晰的工作流指示

## 工作流程

```
上传角色照片 → 输入故事描述 → AI生成分镜脚本 → AI生成漫画图片
```

### 步骤1：上传照片
上传一张人物或角色照片，AI会分析其特征

### 步骤2：输入故事
描述你想要讲述的故事，可以包含：
- 情节发展（起承转合）
- 情绪变化（喜怒哀乐）
- 场景转换（健身房、办公室等）

### 步骤3：生成分镜
AI会基于照片和故事生成详细的分镜脚本，包括：
- 场景描述
- 角色动作
- 对话内容
- 视觉提示

### 步骤4：生成漫画
AI会为每一格分镜生成漫画图片，保持角色一致性

## 快速开始

### 1. 配置API密钥

编辑 `js/config.js`，填入你的OpenAI API密钥：

```javascript
const CONFIG = {
  OPENAI_API_KEY: 'sk-your-openai-api-key-here', // 替换为你的密钥
  // ... 其他配置
};
```

### 2. 本地运行

```bash
# 使用任何HTTP服务器，例如：
python -m http.server 8000
# 或
npx serve .
```

然后访问 `http://localhost:8000/index.html`

### 3. 开始创作

1. 上传一张照片（建议人物清晰的照片）
2. 输入故事描述
3. 选择分镜数量（4-9格）
4. 点击"生成分镜脚本"
5. 查看分镜后，点击"生成完整漫画"
6. 等待AI生成所有分镜图片

## 文件结构

```
example/
├── index.html              # 主页面
├── css/
│   └── styles.css         # 样式文件
├── js/
│   ├── config.js          # API配置
│   ├── storyboard-generator.js  # 分镜生成器
│   ├── comic-generator.js       # 漫画生成器
│   └── app.js             # 主应用逻辑
└── README.md              # 本文件
```

## API配置说明

### OpenAI API密钥

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录并进入 API Keys 页面
3. 创建新的API密钥
4. 复制密钥并填入 `config.js`

**配置说明：**

系统需要配置两个API密钥：
- `STORYBOARD_API_KEY` - 用于GPT模型生成分镜脚本
- `COMIC_API_KEY` - 用于DALL-E模型生成漫画图片

**两种配置方式：**

**方式1：使用相同的API密钥（推荐新手）**
```javascript
STORYBOARD_API_KEY: 'sk-proj-abcdefg...xyz',
COMIC_API_KEY: 'sk-proj-abcdefg...xyz',  // 相同的密钥
```

**方式2：使用不同的API密钥（推荐进阶用户）**
```javascript
STORYBOARD_API_KEY: 'sk-account1-...xyz',  // 账号1的密钥
COMIC_API_KEY: 'sk-account2-...xyz',       // 账号2的密钥
```

**分开配置的好处：**
- 💰 分散API额度，避免单个账号限额
- 🌐 可以使用不同的代理地址
- 📊 更精细的成本控制和监控

### 模型选择

**分镜生成（GPT模型）：**
- `gpt-4o` - 最新模型，效果最好（推荐）
- `gpt-4-turbo` - 平衡性能和成本
- `gpt-3.5-turbo` - 最经济

**漫画生成（DALL-E模型）：**
- `dall-e-3` - 最新模型，质量最高（推荐）
- `dall-e-2` - 较经济的选择

### 成本估算

**分镜生成（6格）：**
- GPT-4o: ~$0.10-0.30
- GPT-4-turbo: ~$0.05-0.15
- GPT-3.5-turbo: ~$0.01-0.03

**漫画生成（6格）：**
- DALL-E 3 (标准): ~$0.24 (6 × $0.04)
- DALL-E 3 (HD): ~$0.48 (6 × $0.08)
- DALL-E 2: ~$0.12 (6 × $0.02)

**总计（6格漫画）：** 约 $0.35-0.80

## 高级配置

### 调整分镜生成参数

在 `config.js` 中：

```javascript
STORYBOARD_MODEL: 'gpt-4o',
STORYBOARD_TEMPERATURE: 0.7,  // 创意程度 (0-1)
```

### 调整漫画生成参数

```javascript
COMIC_MODEL: 'dall-e-3',
COMIC_SIZE: '1024x1024',      // 图片尺寸
COMIC_QUALITY: 'standard',    // 'standard' 或 'hd'
COMIC_STYLE: 'vivid',         // 'vivid' 或 'natural'
```

### 自定义分镜数量

```javascript
DEFAULT_PANEL_COUNT: 6,       // 默认分镜数量
```

## 示例故事

### 励志成长故事
```
一只可爱的兔子在健身房锻炼，从新手小白成长为肌肉达人的励志故事。
包含它第一次进健身房的紧张、刻苦训练的过程、遇到挫折的困惑、
得到AI教练指导的惊喜、突破自我的兴奋，最后展示健美身材的自信。
```

### 职场逆袭故事
```
一个程序员从加班熬夜到掌握AI工具提升效率的故事。
展现从疲惫不堪、发现AI工具、学习使用、效率提升、
获得认可、升职加薪的完整过程。
```

### 奇幻冒险故事
```
一个普通学生意外获得魔法能力的冒险。包含发现魔法书、
第一次施法失败、苦练魔法、遭遇危险、运用魔法解决问题、
成为魔法大师的成长历程。
```

## 技术栈

- **前端**: 纯HTML/CSS/JavaScript
- **AI服务**: OpenAI API
  - GPT-4/GPT-3.5: 分镜脚本生成
  - DALL-E 3/2: 图像生成

## 注意事项

1. **API限流**: DALL-E有生成速率限制，程序会自动延迟请求
2. **图片质量**: 上传清晰的照片可获得更好效果
3. **描述详细度**: 故事描述越详细，分镜越精彩
4. **角色一致性**: AI会尽力保持角色特征，但可能有细微差异
5. **网络连接**: 需要稳定的网络连接到OpenAI服务

## 故障排除

### API错误
- 检查API密钥是否正确
- 确认账户有足够余额
- 检查网络连接

### 生成失败
- 尝试减少分镜数量
- 简化故事描述
- 重新上传照片

### 图片加载慢
- OpenAI生成需要时间，请耐心等待
- 每格约需10-30秒

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

