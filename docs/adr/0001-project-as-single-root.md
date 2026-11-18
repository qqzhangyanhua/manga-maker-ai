# 以 Project 作为唯一的作品根，吸收 Story

此前一部漫画作品被拆成两半：`Story` 持有章节、角色关系和画风，`Project` 持有分镜、页面、版本和导出，两者通过可选的 `Project.story_id` 关联，形成一对多关系。实际上剧本编辑页 (`/api/story/[id]`) 只取最近更新的那一个 Project，说明系统一直默认两者是一对一的。我们决定保留 `projects` 表作为唯一的作品根，把 Story 的字段和关系迁到 Project 上，然后废弃 Story。

## Considered Options

- **Story 改名为项目，Project 降级为排版稿**：schema 改动小，但代码里 story/project 两个词会长期混用，而且 Project 已经挂着分镜、版本、导出等大量下游数据。
- **新建 Work 根表**：最干净，但要给三条线都加一层外键，迁移量最大，收益和本方案相同。

## Consequences

- 一个 Story 对应多个 Project 的历史数据需要逐条决定归属（见迁移计划中的数据审计）。
- `Panel` 最终必须属于某个章节，章节属于项目，`Panel.project_id` 只作为冗余字段保留，并且必须和 `chapter.project_id` 一致。
