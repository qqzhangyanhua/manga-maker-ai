# 小说是项目的来源，不是项目

小说模块 (`NovelProject`/`NovelChapter`，由 Python 服务读写) 面向文字写作，有自己的世界观、版本和 RAG 索引。漫画项目只需要它的章节文本和人物设定作为输入。我们决定保持小说独立，用一个真实外键（替换现在的软关联 `source_novel_id`）把项目指向它的来源小说。小说转漫画时，创建或更新一个项目，而不是创建 Story。画布流水线中的 `ScriptSegment`/`ShotDesign` 逐步收敛到统一的剧本片段和分镜模型。

## Consequences

- 一部小说可以对应多个项目（例如不同画风或不同取舍的改编），所以项目上的来源外键不加唯一约束。画布时间线必须直接指向它所属的项目，不能再通过小说反推。

- Python 服务的表不需要改动，影响面集中在 Next.js 的 `convert-to-comic` 和 canvas API。
- 在 `ShotDesign` 并入 `Panel` 之前，画布线和项目分镜会短暂并存，并通过 `CanvasTimeline` 上新增的项目外键关联。
