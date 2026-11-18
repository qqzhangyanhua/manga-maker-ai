# 过渡期用数据库触发器把 Story 的写入同步到 Project

阶段 3 读切换之前，Story、Chapter.story_id、StoryCharacter、SuggestedCharacter.story_id 仍由现有代码写入（`story` 写入点 11 处、`chapter` 15 处、`storyCharacter` 11 处、`suggestedCharacter` 6 处），Project 一侧的设定、章节归属和项目角色必须跟着保持一致。我们决定在数据库里用触发器做单向同步（Story -> 主项目），而不是在每个写入点补一段双写代码。主项目指 `projects.story_id` 等于该故事 id 的那个项目，用唯一索引 `unique_projects_story` 保证每个故事最多一个。新建故事时触发器同时创建主项目，所以"先有项目"在数据层面成立。

迁移：`prisma/migrations/manual/20261119_project_root_phase2.sql`，回滚：`20261119_project_root_phase2_rollback.sql`。

## Considered Options

- **在应用层每个写入点双写**：逻辑在 TypeScript 里，便于单测，但要改 40 多处，漏掉一处就会产生不一致，而且 Python 服务、脚本和手工 SQL 绕过应用层时无法保证。
- **Prisma 中间件双写**：只能拦截经过同一个 Prisma Client 的写入，嵌套写入和 `$executeRaw` 都拦不到。

## Consequences

- 同步方向只有 Story -> Project。阶段 3 之前不要直接改 Project 上的设定字段，否则会被下一次故事更新覆盖；项目标题例外，只在故事改名时才被覆盖。
- 应用代码通过 `src/lib/project` 的 `ensureStoryProject` 取主项目，不再自己创建带 `story_id` 的项目。触发器未部署的库上它会自行创建，所以代码和迁移哪个先上线都可以。
- 为已有分镜或剧本的故事再次生成分镜（`/api/storyboard`）时，新项目不写 `story_id`，作为独立项目存在；主项目还空着时分镜写入主项目。
- 删除故事时项目保留为独立项目（`story_id` 置空），项目角色不随级联删除的故事角色一起删除。
- 唯一索引只在 SQL 中维护，Prisma 关系仍是一对多。不要对这个库执行 `prisma db push` 或 `migrate dev`，它们会删除 schema 中没有声明的索引和触发器。
- 阶段 6 删除 Story 时一并删除这些触发器和函数。
