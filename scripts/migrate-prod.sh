#!/bin/bash
# Production database migration script

echo "🚀 Running Prisma migrations in production..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker exec fulexo-postgres pg_isready -U postgres -d fulexo > /dev/null 2>&1; do
  echo "Database is not ready yet. Waiting..."
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Applying database migrations..."
docker exec fulexo-api npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully!"
else
  echo "❌ Migration failed!"
  exit 1
fi

echo "🌱 Database is up to date!"