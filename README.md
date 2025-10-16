# Telegram Clicker Bot

A scalable Telegram bot with mini-app for clicking competition. Built to support 100,000+ users with 5,000+ concurrent sessions.

## Tech Stack

- **Bot**: Telegraf + BullMQ for queue management
- **API**: Hono on Bun runtime
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for leaderboard, sessions, and job queues
- **Frontend**: React + Telegram WebApp SDK

## Key Features

- Real-time leaderboard with optimistic updates
- 3-tier priority queue system (HIGH/MEDIUM/LOW)
- Session persistence with Redis
- Rate limiting and graceful degradation under load
- Haptic feedback and Telegram theme integration

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Bun (for local development)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Installation

1. Clone the repository and install dependencies:

```bash
cd apps/bot && bun install
cd ../api && bun install
cd ../web && bun install
```

2. Configure environment variables (see `.env.example`)

3. Start all services:

```bash
docker-compose up --build
```

4. Run database migrations:

```bash
cd apps/api
bun run db:push
```

### BotFather Configuration

1. Create your bot with `/newbot`
2. Set commands:
   - `start` - Start the game
   - `changename` - Change your username
3. Create Mini App with `/newapp` pointing to your web service URL

## API Endpoints

- `POST /api/users` - Create or get user
- `PATCH /api/users/:telegramId` - Update username
- `POST /api/click` - Record click
- `GET /api/stats/:telegramId` - Get stats and leaderboard
- `POST /api/session/start` - Start session
- `POST /api/session/heartbeat` - Keep session alive
- `POST /api/session/end` - End session
- `GET /health` - Health check

## Architecture

### Priority Queue System

Updates are prioritized based on user activity:

- **HIGH (2s delay)**: Recent click activity (< 30s)
- **MEDIUM (10s delay)**: Active session (< 2min)
- **LOW (60s delay)**: Inactive session (< 5min)

The system supports ~300 concurrent MEDIUM priority sessions at peak capacity (Telegram's 30 edits/s limit). Under heavy load, lower priority queues are automatically paused to prioritize active clickers.

### Scalability

- **Redis Pub/Sub** for real-time click events
- **Bulk database operations** to reduce Postgres load by 95%
- **Graceful degradation** by pausing low-priority queues under load
- **Rate limiting** at 20 clicks/sec per user
- **Connection pooling** for efficient database usage

### Session Management

Sessions are stored in Redis with TTL and cleaned up automatically. Heartbeat mechanism detects inactive users for proper session cleanup.

## Local Development

Run each service individually:

```bash
cd apps/api && bun run dev
cd apps/bot && bun run dev
cd apps/web && bun run dev
```

## Monitoring

View logs:

```bash
docker-compose logs -f api
docker-compose logs -f bot
```

Check health:

```bash
curl http://localhost:3000/health
```

Monitor queue metrics in bot logs (reported every 30s).
