# 项目文档索引

本目录包含 Manga Maker AI 的架构、API、功能文档。过时的完成报告与调试/修复类文档已删除，仅保留一份历史迁移参考在 `archive/migrations/`。

## 根目录 · 常用文档

| 文档 | 说明 |
|------|------|
| [DATABASE_SETUP.md](DATABASE_SETUP.md) | 数据库设置与迁移（README/AGENTS 引用） |
| [testing/test-db.md](testing/test-db.md) | 本地 Postgres 的 `pnpm test:db` 通道 |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | API 接口说明 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速参考 |
| [QUICK_REFERENCE_SERIALIZED_COMIC.md](QUICK_REFERENCE_SERIALIZED_COMIC.md) | 连载漫画功能快速参考 |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | 集成与部署指南 |
| [LOGGING_GUIDE.md](LOGGING_GUIDE.md) | 日志配置 |
| [NOVEL_TO_COMIC.md](NOVEL_TO_COMIC.md) | 小说转漫画流程 |
| [NOVEL_TO_COMIC_INTEGRATION.md](NOVEL_TO_COMIC_INTEGRATION.md) | 小说转漫画集成说明 |
| [version-management-user-guide.md](version-management-user-guide.md) | 版本管理使用指南 |
| [version-management-complete-guide.md](version-management-complete-guide.md) | 版本管理完整指南 |

## 功能与规范

| 文档 | 说明 |
|------|------|
| [NINE_GRID_FEATURE.md](NINE_GRID_FEATURE.md) | 九宫格功能说明 |
| [COMIC_STYLE_AI_GENERATION.md](COMIC_STYLE_AI_GENERATION.md) | 漫画风格 AI 生成 |
| [COMIC_STYLE_EXPORT.md](COMIC_STYLE_EXPORT.md) | 漫画风格导出 |
| [COMIC_STYLE_IMAGE_PREVIEW.md](COMIC_STYLE_IMAGE_PREVIEW.md) | 漫画风格图片预览 |
| [canvas-settings-quickstart.md](canvas-settings-quickstart.md) | Canvas 设置快速上手 |
| [novel-cover-quickref.md](novel-cover-quickref.md) | 小说封面快速参考 |
| [panel-generation-best-practices.md](panel-generation-best-practices.md) | 分镜生成最佳实践 |
| [gemini-quick-reference.md](gemini-quick-reference.md) | Gemini 快速参考 |
| [gemini-character-consistency-guide.md](gemini-character-consistency-guide.md) | 角色一致性指南 |
| [image-edit-provider.md](image-edit-provider.md) | 图像编辑 Provider |
| [IMAGE_DOWNLOAD_PROXY.md](IMAGE_DOWNLOAD_PROXY.md) | 图片下载代理 |

## 子目录

- **api/** — API 变更与配置（如 timeline-config-update）
- **architecture/** — 架构设计（如 comic-layout-export-design）
- **features/** — 功能说明（九宫格、分组生成等）
- **plans/** — 设计/实施计划（按日期命名）
- **prd/** — 产品需求（如 P0-comic-layout-export）
- **specs/** — 规范（如风格）
- **testing/** — 当前测试说明与总结

## 历史文档（archive/）

| 子目录 | 内容 |
|--------|------|
| **archive/migrations** | [MIGRATION_GUIDE.md](archive/migrations/MIGRATION_GUIDE.md) — 历史迁移流程参考 |
