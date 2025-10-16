#!/bin/bash

echo "🚀 Setting up Telegram Clicker Bot..."

echo "📦 Installing dependencies..."
cd apps/api && bun install
cd ../bot && bun install
cd ../web && bun install
cd ../..

echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "🗄️  Running database migrations..."
cd apps/api
bun run db:push

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create .env file at project root (see .env.example)"
echo "2. Set your BOT_TOKEN, MINI_APP_URL, and other variables"
echo "3. Run 'docker-compose up --build' to start all services"
echo ""
echo "For local development, run services individually:"
echo "   - API: cd apps/api && bun run dev"
echo "   - Bot: cd apps/bot && bun run dev"
echo "   - Web: cd apps/web && bun run dev"

