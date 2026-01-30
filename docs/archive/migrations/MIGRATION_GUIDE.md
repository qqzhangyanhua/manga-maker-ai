# Migration Guide: From Runtime DDL to Prisma Migrations

## What Changed?

The database initialization system has been completely refactored to use Prisma's standard migration system instead of runtime DDL execution.

### Before (❌ Problematic)

```typescript
// src/lib/db.ts
const bootstrapSqlStatements = [
  `CREATE TABLE IF NOT EXISTS users (...)`,
  `CREATE TABLE IF NOT EXISTS llm_providers (...)`,
  // ... only 6 tables covered
];

export const ensureDb = async () => {
  for (const sql of bootstrapSqlStatements) {
    await prisma.$executeRawUnsafe(sql);
  }
};

// Every API route
import { ensureDb } from "@/lib/db";
await ensureDb();
```

**Problems:**
1. **Dual source of truth**: DDL covered 6 tables, `schema.prisma` defined 30+ tables
2. **Missing fields**: DDL lacked `credits`, `total_credits_used`, `credits_cost`, etc.
3. **No foreign keys**: Data integrity not enforced
4. **No version tracking**: Impossible to know which schema version is running
5. **Environment drift**: Different environments could have different schemas

### After (✅ Correct)

```typescript
// src/lib/db.ts
export const initializeAdmin = async (): Promise<void> => {
  // Only handles admin promotion, not schema creation
};

// Database initialization
./scripts/init-db.sh  // or: npx prisma migrate deploy
```

**Benefits:**
1. **Single source of truth**: `schema.prisma` only
2. **Version control**: All schema changes tracked in `prisma/migrations/`
3. **Reproducibility**: Same schema across all environments
4. **Data safety**: Migrations can include data transformations
5. **Team collaboration**: No schema conflicts

## Migration Steps

### For Existing Deployments

If you have an existing database created by the old `ensureDb()` system:

#### 1. Backup Your Database

```bash
pg_dump -U user -d manga_maker_ai > backup_$(date +%Y%m%d).sql
```

#### 2. Pull Latest Code

```bash
git pull origin main
npm install  # or pnpm install
```

#### 3. Check Current Schema

```bash
npx prisma db pull
# This will show you what's currently in your database
```

#### 4. Apply Migrations

```bash
# Apply all migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

#### 5. Verify Schema

```bash
# Check migration status
npx prisma migrate status

# Should show: "Database schema is up to date!"
```

#### 6. Restart Application

```bash
pm2 restart manga-maker-ai
# or: npm run dev (for development)
```

### For New Deployments

Simply run:

```bash
./scripts/init-db.sh
```

Or manually:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Code Changes Summary

### Files Modified

1. **`src/lib/db.ts`**
   - ❌ Removed: `bootstrapSqlStatements` array (155 lines of DDL)
   - ❌ Removed: `ensureDb()` function
   - ✅ Added: `initializeAdmin()` function (admin promotion only)

2. **22 API routes and lib files**
   - ❌ Removed: `import { ensureDb } from "@/lib/db"`
   - ❌ Removed: `await ensureDb()` calls
   - ✅ Updated: Import only `prisma` from `@/lib/db`

3. **`src/app/api/auth/login/route.ts`**
   - ✅ Added: `await initializeAdmin()` call (admin promotion on first login)

### Files Added

1. **`scripts/init-db.sh`**
   - Database initialization script
   - Checks connection, applies migrations, generates client

2. **`docs/DATABASE_SETUP.md`**
   - Comprehensive database setup guide
   - Migration best practices
   - Troubleshooting guide

3. **`docs/MIGRATION_GUIDE.md`** (this file)
   - Migration instructions for existing deployments

### Files Updated

1. **`README.md`**
   - Updated installation instructions
   - Added reference to database setup guide
   - Added `INITIAL_ADMIN_EMAIL` environment variable

## Breaking Changes

### ❌ Removed Functions

- `ensureDb()` - No longer exists. Use Prisma migrations instead.

### ⚠️ Behavior Changes

1. **Database must be initialized before first run**
   - Old: Tables created automatically on first API call
   - New: Must run `npx prisma migrate deploy` before starting app

2. **Admin promotion timing**
   - Old: Checked on every `ensureDb()` call
   - New: Checked only on login (more efficient)

3. **Schema changes**
   - Old: Edit DDL strings, restart app
   - New: Edit `schema.prisma`, create migration, apply migration

## Environment Variables

### New (Optional)

```bash
INITIAL_ADMIN_EMAIL=admin@example.com
```

When set, the first user with this email will be automatically promoted to admin on their first login.

## Troubleshooting

### "Table does not exist" errors

Your database needs migrations applied:

```bash
npx prisma migrate deploy
```

### "Prisma Client is not generated"

```bash
npx prisma generate
```

### "Migration history conflicts"

This shouldn't happen with the new system, but if it does:

```bash
# Check status
npx prisma migrate status

# Resolve conflicts
npx prisma migrate resolve --applied <migration_name>
```

### "Missing columns" errors

Your database schema is out of sync. Apply migrations:

```bash
npx prisma migrate deploy
```

## Rollback Plan

If you need to rollback to the old system (not recommended):

1. Restore database from backup:
   ```bash
   psql -U user -d manga_maker_ai < backup_YYYYMMDD.sql
   ```

2. Checkout previous commit:
   ```bash
   git checkout <previous_commit_hash>
   npm install
   npm run dev
   ```

## FAQ

### Q: Why was this change necessary?

**A:** The old system maintained schema definitions in two places (DDL strings + `schema.prisma`) that were guaranteed to drift. This caused production failures when tables or columns were missing.

### Q: Will this affect my existing data?

**A:** No. Migrations only modify schema structure, not data. Your existing data is safe.

### Q: Do I need to run migrations on every deployment?

**A:** Only if there are new migrations. Check with `npx prisma migrate status`.

### Q: Can I still use `npx prisma studio`?

**A:** Yes! Prisma Studio works exactly the same.

### Q: What if I need to add a new table?

**A:** Edit `schema.prisma`, then run `npx prisma migrate dev --name add_new_table`. See [DATABASE_SETUP.md](DATABASE_SETUP.md) for details.

### Q: Is this change backward compatible?

**A:** Yes, for existing databases. Just apply migrations once and you're good to go.

## Support

If you encounter issues during migration:

1. Check [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions
2. Verify your `DATABASE_URL` is correct
3. Ensure PostgreSQL is running and accessible
4. Check migration status: `npx prisma migrate status`
5. Review application logs for specific errors

## Architectural Rationale

This change follows the principle of **"Single Source of Truth"**:

- **Before**: Schema defined in DDL strings + `schema.prisma` → guaranteed drift
- **After**: Schema defined only in `schema.prisma` → migrations generated automatically

This is the standard approach used by all modern ORMs (Prisma, TypeORM, Sequelize, Django ORM, Rails ActiveRecord, etc.) because it:

1. Prevents schema drift between environments
2. Provides version control for database changes
3. Enables safe rollbacks
4. Facilitates team collaboration
5. Ensures data integrity through proper constraints

**"Don't fight the framework. Use it."** - Linus Torvalds (paraphrased)
