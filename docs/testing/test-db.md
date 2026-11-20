# test:db：本地 Postgres 测试通道

`pnpm test` 只跑 mock。`pnpm test:db` 使用另一份 Vitest 配置，只收集 `src/**/*.db.test.ts`，并在跑测试前准备一个本机数据库。

## 启动测试库

只启动 Postgres，不必启动 MinIO：

```bash
docker compose up -d postgres
```

默认账号来自 `docker-compose.yml`：用户 `manga`，密码 `manga123`，端口 `5432`。测试库名是 `manga_test`，由 `pnpm test:db` 在不存在时创建。compose 自己创建的 `manga` 库不会被使用。

在项目根目录写 `.env.test`（已 gitignore）：

```bash
TEST_DATABASE_URL=postgresql://manga:manga123@127.0.0.1:5432/manga_test
```

也可以直接设环境变量，不必写文件。环境变量优先于 `.env.test`。

然后：

```bash
pnpm test:db
```

## 未配置时

没有 `TEST_DATABASE_URL`，或值只有空白时，命令打印「已跳过」并退出码 0。它不读取 `DATABASE_URL`。应用库可能是远端库，不能拿来执行迁移。

主机必须是 `127.0.0.1`、`localhost` 或 `::1`。库名必须包含 `test`，并且只含字母、数字和下划线。不满足时退出码为 1。

## 准备数据库时做了什么

1. 连到本机的 `postgres` 维护库，必要时 `CREATE DATABASE`。
2. 空库按 `schema.prisma` 执行 `prisma db push`。仓库里的 Prisma 迁移是增量补丁，没有从空库创建 `users` 等基表的初始迁移。
3. 迁移历史还是空的时候，把当前迁移目录标成已应用，再执行 `prisma migrate deploy`。`db push` 已经按 `schema.prisma` 建好表，这些历史迁移不必再跑一遍。之后新增的迁移不会被标成已应用，`migrate deploy` 会执行它们的 SQL。历史迁移里的函数和触发器不在 schema 里，准备时会按语句再执行一遍。
4. 按文件名顺序执行 `prisma/migrations/manual/*.sql`，跳过文件名含 `rollback` 的脚本。对象已经存在的语句会跳过。补列和索引如果缺表或缺列，先记下，等别的脚本执行完再试；仍然没有的对象才跳过。函数、触发器和 `DO` 块缺依赖时整份回滚后再试，最后仍失败则整次命令失败。

`prisma/migrations/migration_lock.toml` 是 `prisma migrate` 需要的提供方锁，内容只有 `provider = "postgresql"`。

`prisma/migrations/manual/` 里还有一个只含 `SELECT 1` 的 `migration.sql`。Prisma 会把每个子目录当成一次迁移，没有这个文件时 `migrate deploy` 报 P3015。真正的手工脚本仍按文件名单独执行，不会把 `migration.sql` 再跑一遍。

## 测试之间不互相污染

每个 `*.db.test.ts` 都包在一个会回滚的事务里。测试里的写入在测试结束时撤销。配置把 Vitest 限制为单 worker、文件内顺序执行。

示例是 `src/test-db/example.db.test.ts`：写入一行用户，读回来，下一个测试确认这行已经不在。

## `pnpm test` 不收集这些测试

`vitest.config.ts` 排除 `**/*.db.test.ts`。数据库测试文件名必须是 `*.db.test.ts`。不连数据库的纯函数测试仍用 `*.test.ts`，跟 `pnpm test` 一起跑。

## 重置

准备失败或想清空时，删掉测试库再跑：

```bash
docker compose exec postgres psql -U manga -d postgres -c "DROP DATABASE IF EXISTS manga_test"
pnpm test:db
```
