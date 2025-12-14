#!/bin/bash
# Database initialization script for Manga Maker AI
# This script ensures the database is properly set up using Prisma migrations

set -e

echo "🔍 Checking database connection..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
  echo "❌ Cannot connect to database. Please check DATABASE_URL in .env"
  exit 1
fi

echo "✅ Database connection successful"

echo ""
echo "📊 Checking migration status..."
PENDING=$(npx prisma migrate status 2>&1 || true)

if echo "$PENDING" | grep -q "Database schema is up to date"; then
  echo "✅ Database schema is up to date"
elif echo "$PENDING" | grep -q "Following migration have not yet been applied"; then
  echo "⚠️  Pending migrations detected"
  echo ""
  echo "🚀 Applying migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Database may need initialization"
  echo ""
  echo "🚀 Applying migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations applied successfully"
fi

echo ""
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo ""
echo "✅ Database initialization complete!"
echo ""
echo "📝 Next steps:"
echo "   - Run 'npm run dev' to start the development server"
echo "   - Set INITIAL_ADMIN_EMAIL in .env to promote a user to admin"
