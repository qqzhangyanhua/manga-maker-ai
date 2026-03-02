[根目录](../CLAUDE.md) > **example**

# 变更记录 (Changelog)

- 2026-03-01 10:13:03: 深扫 `example/js/storyboard-generator.js` 与 `example/js/comic-generator.js`，补充分镜生成/流式图像生成链路与风险清单。
- 2026-03-01 09:32:34: 首次生成 example 模块文档；补充 Demo 架构、调用链、风险点与文件索引。

# 模块职责

`example` 是独立的演示与验证模块，用于快速体验“文本 -> 分镜 -> 图片/漫画”的流程，不依赖 Next.js 页面路由。

职责包括：
- 提供静态 Demo 页面（`index.html`）
- 封装前端调用流程（`js/app.js`、`js/storyboard-generator.js`、`js/comic-generator.js`）
- 提供 Mock 数据快速演示（`js/mock-data.js`）
- 提供 Python 侧 API 测试脚本（`test_api_simple.py`、`test_comic_generation.py`）

# 入口与启动

- 页面入口：`example/index.html`
- 主要脚本：`example/js/app.js`
- 样式文件：`example/css/styles.css`
- Python 依赖：`example/requirements.txt`

建议运行方式（本地静态服务）：
- 在仓库根目录起一个静态文件服务后访问 `example/index.html`

# 对外接口

- 不提供服务端 API。
- 作为 API 调用客户端，调用外部 LLM/图像模型接口。

## 本轮深扫：`storyboard-generator.js`

- 核心类：`StoryboardGenerator`
- 主流程：
  1. `buildStoryboardPrompt(description, panelCount)` 生成结构化中文要求 + 英文视觉提示字段要求。
  2. 调用 `${STORYBOARD_API_BASE}/chat/completions`。
  3. 直接 `JSON.parse(content)` 解析返回并映射为前端 panel 结构。
- 风险点：
  - 没有对“模型返回非 JSON”的稳健兜底（仅靠 try/catch）；
  - `generateStoryboardStream` 的参数签名与 `generateStoryboard` 不一致，内部调用也存在参数错位（技术债）。

## 本轮深扫：`comic-generator.js`

- 核心类：`ComicGenerator`
- 能力分层：
  1. 图像拼版：`mergeImagesIntoComic`（Canvas 合图 + 编号 + 边框）。
  2. 单格生成：`generatePanelImage`，支持 `image_url + text` 多模态消息。
  3. 整页生成：`generateSingleComicImage`（一次调用生成整张漫画页）。
  4. 流式处理：`handleStreamResponse` 解析 SSE `data:` 增量并提取 markdown 图片 URL。
  5. 文本策略：`simplifyDialogue` 对对白做压缩，提高图片模型落字成功率。
- 风险点：
  - Prompt 内包含特殊字符（如装饰符号）可能影响部分模型解析稳定性；
  - URL 提取只匹配 markdown 格式，若模型改为 JSON/裸 URL 会漏识别；
  - 顺序生成 `generateAllPanels` 仅靠固定 `delay(1000)` 限流，缺乏自适应重试策略。

# 关键依赖与配置

- 配置文件：`example/js/config.js`
- 关键配置项：
  - 分镜模型：`STORYBOARD_API_BASE` / `STORYBOARD_MODEL`
  - 图片模型：`COMIC_API_BASE` / `COMIC_MODEL`
  - 默认分镜数：`DEFAULT_PANEL_COUNT`

风险提醒：
- 当前 `example/js/config.js` 包含明文 API Key 样式配置，必须改为示例占位值或环境变量注入方案，避免泄漏。

# 数据模型

前端内存态主结构：
- `storyboard`: `{ title, style, panels[] }`
- `panel`: `{ panelNumber, sceneDescription, characterAction, dialogue, visualPrompt, imageUrl? }`
- `originalImageData`: 上传参考图的 base64 数据

# 测试与质量

- Python 测试脚本：
  - `example/test_api_simple.py`
  - `example/test_comic_generation.py`
- 文档说明：`QUICK_START.md`、`USAGE_GUIDE.md`、`TROUBLESHOOTING.md`

# 常见问题 (FAQ)

1. Demo 为什么不走项目 `/api/*` 路由？
   因为它是独立演示客户端，直接调用配置中的目标 API。

2. 为什么生成失败率不稳定？
   受外部模型可用性、速率限制和密钥权限影响较大。

3. 为什么不建议把这个模块直接用于生产？
   它偏演示用途，鉴权、密钥管理、错误隔离和审计都不够严格。

4. 为什么会出现“返回文字而非图片”的错误？
   `ComicGenerator` 强依赖模型返回 markdown 图片链接，模型若只返回描述文本就会报错。

# 相关文件清单

- `/Users/zhangyanhua/AI/manga-maker-ai/example/index.html`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/js/app.js`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/js/config.js`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/js/storyboard-generator.js`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/js/comic-generator.js`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/js/mock-data.js`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/test_api_simple.py`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/test_comic_generation.py`
- `/Users/zhangyanhua/AI/manga-maker-ai/example/requirements.txt`
