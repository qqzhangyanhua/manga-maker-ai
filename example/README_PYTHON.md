# Python漫画生成测试脚本使用指南

## 功能介绍

`test_comic_generation.py` 是一个完整的AI漫画生成测试脚本，实现了以下功能：

1. 📸 **读取图片** - 读取指定的角色图片
2. 📝 **生成分镜脚本** - 使用AI分析图片并生成详细的漫画分镜脚本
3. 🎨 **生成漫画图片** - 根据分镜脚本生成每一格漫画
4. 💾 **保存结果** - 自动保存分镜脚本和生成的图片

## 工作流程

```
读取角色图片 → AI生成分镜脚本 → AI生成漫画图片 → 保存结果
```

## 快速开始

### 1. 安装依赖

```bash
pip install requests
```

### 2. 准备图片

确保 `Gemini_Generated_Image_2djzjd2djzjd2djz.png` 在 `example` 目录下。

### 3. 运行脚本

```bash
cd example
python test_comic_generation.py
```

## 配置说明

脚本使用 `ComicGenerationConfig` 类进行配置，默认配置与 `js/config.js` 保持一致：

```python
class ComicGenerationConfig:
    # 分镜生成配置（GPT模型）
    STORYBOARD_API_KEY = 'your-api-key'
    STORYBOARD_API_BASE = 'https://api.moonshot.cn/v1'
    STORYBOARD_MODEL = 'kimi-k2-0905-preview'
    
    # 漫画生成配置（图像生成模型）
    COMIC_API_KEY = 'your-api-key'
    COMIC_API_BASE = 'https://ai.xiangcao.de/v1'
    COMIC_MODEL = 'gemini-3-pro-image-preview'
    
    # 其他配置
    DEFAULT_PANEL_COUNT = 6
    OUTPUT_DIR = Path(__file__).parent / 'output'
```

## 自定义参数

在 `main()` 函数中可以自定义以下参数：

```python
# 输入图片路径
image_path = 'path/to/your/image.png'

# 故事描述
story_description = """
你的故事描述...
"""

# 分镜数量（4-9格）
panel_count = 6

# 是否在对话框中生成文字（True/False）
enable_text = False
```

## 输出文件

脚本会在 `example/output/` 目录下生成以下文件：

```
output/
├── storyboard.json       # 分镜脚本JSON文件
├── comic_results.json    # 完整的生成结果
├── panel_1.png          # 第1格漫画
├── panel_2.png          # 第2格漫画
├── panel_3.png          # 第3格漫画
├── panel_4.png          # 第4格漫画
├── panel_5.png          # 第5格漫画
└── panel_6.png          # 第6格漫画
```

## 分镜脚本格式

生成的 `storyboard.json` 包含以下信息：

```json
{
  "title": "故事标题",
  "style": "漫画风格描述",
  "panels": [
    {
      "panel_number": 1,
      "scene_description": "场景描述（中文）",
      "character_action": "角色动作（中文）",
      "dialogue": "对话内容（中文）",
      "visual_prompt": "详细的英文视觉提示词",
      "image_url": null
    }
  ]
}
```

## 主要类说明

### StoryboardGenerator
负责生成分镜脚本：
- `generate_storyboard()` - 根据图片和描述生成分镜
- 支持多模态输入（图片+文字）
- 自动解析JSON响应

### ComicGenerator
负责生成漫画图片：
- `generate_all_panels()` - 生成所有分镜图片
- `_generate_panel_image()` - 生成单个分镜
- 支持对话文字生成（可选）

### ComicGenerationWorkflow
完整的工作流管理：
- `run()` - 运行完整流程
- 自动保存中间结果
- 下载并保存生成的图片

## 示例故事描述

### 奇幻冒险
```python
story_description = """
一个可爱的卡通角色的奇幻冒险故事。
从平凡的日常生活开始，意外发现了一个神奇的世界。
经历了惊险刺激的冒险，遇到了新朋友，克服了困难，
最终成长为一个勇敢的冒险家。
故事要充满想象力、幽默感和正能量。
"""
```

### 励志成长
```python
story_description = """
一个角色从新手小白成长为专家的励志故事。
包含初次尝试的紧张、刻苦练习的过程、遇到挫折的困惑、
得到帮助的惊喜、突破自我的兴奋，最后展示成功的自信。
"""
```

### 日常温馨
```python
story_description = """
一个温馨的日常生活故事。
展现角色在日常生活中的小确幸、小烦恼、
与朋友的互动、解决问题的智慧，
最后以温暖的结局收尾。
"""
```

## 注意事项

1. **API限流**: 脚本会在每个分镜之间自动延迟2秒，避免触发API限流
2. **图片质量**: 使用清晰的角色图片可获得更好的效果
3. **描述详细度**: 故事描述越详细，生成的分镜越精彩
4. **网络连接**: 需要稳定的网络连接到API服务
5. **API密钥**: 确保配置了有效的API密钥

## 故障排除

### API错误
- 检查API密钥是否正确
- 确认账户有足够余额
- 检查网络连接和API地址

### 生成失败
- 尝试减少分镜数量
- 简化故事描述
- 检查图片格式和大小

### 图片下载失败
- 检查网络连接
- 确认输出目录有写入权限
- 检查磁盘空间

## 成本估算

**完整流程（6格漫画）：**
- 分镜生成: ~$0.10-0.30
- 图片生成: ~$0.24-0.48 (6格)
- **总计**: 约 $0.35-0.80

## 技术栈

- **Python 3.7+**
- **requests** - HTTP请求库
- **OpenAI API** - 分镜脚本生成
- **Gemini API** - 图像生成

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
