#!/usr/bin/env bash
set -e

echo "🔧 Setting up Equiscore development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy env files
if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo "✅ Created apps/web/.env.local — fill in your Clerk keys"
fi

if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "✅ Created apps/api/.env — fill in your credentials"
fi

# Start Docker services
echo "🐳 Starting PostgreSQL and Redis..."
docker compose up -d

# Wait for postgres
echo "⏳ Waiting for PostgreSQL..."
until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

# Run Prisma generate + migrate
echo "🗄️  Running database migrations..."
cd packages/database && npm run db:generate && npm run db:push && cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start development with:"
echo "  npm run dev"
echo ""
echo "Apps:"
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:4000"
echo "  Docs: http://localhost:4000/api/docs"
echo "  DB:   npx prisma studio (from packages/database)"
