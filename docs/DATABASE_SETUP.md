# Database Setup Guide

## Overview

This project uses **Prisma** as the ORM and **PostgreSQL** as the database. All schema changes are managed through Prisma migrations.

## Quick Start

### 1. Configure Database Connection

Create a `.env` file with your database URL:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/manga_maker_ai"
```

### 2. Initialize Database

Run the initialization script:

```bash
./scripts/init-db.sh
```

This script will:
- Verify database connection
- Apply all pending migrations
- Generate Prisma Client

### 3. (Optional) Set Initial Admin

Add to `.env`:

```bash
INITIAL_ADMIN_EMAIL="admin@example.com"
```

The first user with this email will be automatically promoted to admin on their first login.

## Development Workflow

### Creating a New Migration

When you modify `prisma/schema.prisma`:

```bash
# Create and apply migration
npx prisma migrate dev --name descriptive_migration_name

# Example:
npx prisma migrate dev --name add_user_avatar_field
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Apply the migration to your development database
3. Regenerate Prisma Client

### Viewing Database

Open Prisma Studio to browse your data:

```bash
npx prisma studio
```

### Resetting Database (Development Only)

**WARNING**: This will delete all data!

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Recreate it
3. Apply all migrations
4. Run seed script (if configured)

## Production Deployment

### Initial Deployment

```bash
# Apply all migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Updating Production

```bash
# Pull latest code with new migrations
git pull

# Apply new migrations
npx prisma migrate deploy

# Restart application
pm2 restart manga-maker-ai
```

## Migration Best Practices

### 1. Never Edit Migration Files

Once a migration is created and committed, **never edit it**. Create a new migration instead.

### 2. Test Migrations Locally First

Always test migrations on a local database before deploying to production:

```bash
# Create migration
npx prisma migrate dev --name my_change

# Test application
npm run dev

# Commit if everything works
git add prisma/migrations
git commit -m "feat: add my_change migration"
```

### 3. Handle Data Migrations Carefully

For complex data transformations, use Prisma's migration SQL:

```sql
-- Migration: 20231214120000_migrate_user_data/migration.sql

-- Add new column
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;

-- Migrate existing data
UPDATE "users" SET "full_name" = CONCAT("first_name", ' ', "last_name");

-- Make column required (after data migration)
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;

-- Drop old columns
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
```

### 4. Backward Compatibility

When possible, make changes in multiple steps to maintain backward compatibility:

**Step 1**: Add new column (optional)
```prisma
model User {
  old_field String?
  new_field String?  // Add as optional first
}
```

**Step 2**: Deploy code that writes to both fields

**Step 3**: Migrate data from old to new field

**Step 4**: Make new field required, drop old field
```prisma
model User {
  new_field String  // Now required
}
```

## Troubleshooting

### "Database schema is not in sync"

```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy
```

### "Prisma Client is not generated"

```bash
npx prisma generate
```

### "Migration failed"

1. Check the error message carefully
2. Fix the issue in `schema.prisma`
3. Delete the failed migration folder
4. Create a new migration:

```bash
rm -rf prisma/migrations/YYYYMMDDHHMMSS_failed_migration
npx prisma migrate dev --name fixed_migration
```

### "Database already exists but is empty"

This happens when the database was created but migrations weren't applied:

```bash
npx prisma migrate deploy
```

### "Migration history conflicts"

If you have local migrations that conflict with remote:

```bash
# Backup your local changes
git stash

# Pull latest migrations
git pull

# Apply migrations
npx prisma migrate deploy

# Restore your changes and create new migration
git stash pop
npx prisma migrate dev --name my_local_changes
```

## Schema Management

### Single Source of Truth

**`prisma/schema.prisma` is the ONLY source of truth for the database schema.**

- ❌ DO NOT create tables manually with SQL
- ❌ DO NOT use runtime DDL (like the old `ensureDb()` function)
- ✅ DO modify `schema.prisma` and create migrations
- ✅ DO use Prisma Client for all database operations

### Why Migrations?

1. **Version Control**: Track schema changes over time
2. **Reproducibility**: Same schema across all environments
3. **Rollback**: Revert changes if needed
4. **Team Collaboration**: Avoid schema conflicts
5. **Data Safety**: Migrations can include data transformations

## Common Operations

### Add a New Table

1. Edit `prisma/schema.prisma`:

```prisma
model NewFeature {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id    String   @db.Uuid
  name       String
  created_at DateTime @default(now()) @db.Timestamptz(6)

  @@index([user_id])
  @@map("new_features")
}
```

2. Create migration:

```bash
npx prisma migrate dev --name add_new_feature_table
```

### Add a Column

1. Edit the model in `schema.prisma`:

```prisma
model User {
  // ... existing fields
  avatar_url String?  // Add new field
}
```

2. Create migration:

```bash
npx prisma migrate dev --name add_user_avatar
```

### Rename a Column

**IMPORTANT**: Prisma cannot detect renames automatically. You must use custom SQL:

1. Create empty migration:

```bash
npx prisma migrate dev --create-only --name rename_user_image_to_avatar
```

2. Edit the generated migration file:

```sql
-- Rename column instead of drop + create
ALTER TABLE "users" RENAME COLUMN "image" TO "avatar_url";
```

3. Apply migration:

```bash
npx prisma migrate dev
```

### Add an Index

1. Edit `schema.prisma`:

```prisma
model Panel {
  // ... fields

  @@index([project_id, panel_order])
  @@index([character_id])
}
```

2. Create migration:

```bash
npx prisma migrate dev --name add_panel_indexes
```

## Environment-Specific Notes

### Development

- Use `npx prisma migrate dev` - creates and applies migrations
- Database can be reset freely with `npx prisma migrate reset`

### Staging

- Use `npx prisma migrate deploy` - only applies existing migrations
- Test migrations here before production

### Production

- Use `npx prisma migrate deploy` - only applies existing migrations
- **NEVER** use `migrate dev` or `migrate reset` in production
- Always backup database before applying migrations
- Consider using database migration tools for zero-downtime deployments

## Migration Checklist

Before deploying a migration to production:

- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Database backup created
- [ ] Migration is backward compatible (if possible)
- [ ] Data migration script tested (if applicable)
- [ ] Rollback plan prepared
- [ ] Team notified of schema changes
- [ ] Application code updated to handle new schema
- [ ] Deployment window scheduled (if downtime needed)

## 本地测试库（`pnpm test:db`）

`pnpm test` 只跑 mock，不连接数据库。需要真实 Postgres 时使用单独通道，步骤和跳过规则见 [testing/test-db.md](testing/test-db.md)。

```bash
docker compose up -d postgres
```

`.env.test`：

```bash
TEST_DATABASE_URL=postgresql://manga:manga123@127.0.0.1:5432/manga_test
```

```bash
pnpm test:db
```

没有 `TEST_DATABASE_URL` 时命令打印「已跳过」并以退出码 0 结束。它不会读取应用的 `DATABASE_URL`。

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
