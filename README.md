# WaBoT

WhatsApp AI sales assistant SaaS — Laravel API, React dashboard, and Baileys WhatsApp bridge.

## Project structure

| Folder | Description |
|--------|-------------|
| `back-end/` | Laravel 10 API (auth, billing, orders, AI, webhooks) |
| `front-end/` | React + Vite admin & merchant dashboard |
| `whatsapp-service/` | Node.js Baileys microservice (per-user WhatsApp sessions) |

## Quick start (local)

### 1. Backend

```bash
cd back-end
cp .env.example .env
# Edit .env: DB, OPENAI_API_KEY, BAILEYS_SERVICE_SECRET, etc.
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

### 2. WhatsApp service

```bash
cd whatsapp-service
cp .env.example .env
# Set SERVICE_SECRET (same as BAILEYS_SERVICE_SECRET in Laravel)
npm install
npm start
```

### 3. Frontend

```bash
cd front-end
cp .env.example .env
# Set VITE_API_URL=http://127.0.0.1:8000/api
npm install
npm run dev
```

## Testing

See [TESTING.md](./TESTING.md) for isolated test mode (`TEST_MODE`, separate DB).

## Security

- Do **not** commit `.env` files or `.testsprite/` folders.
- Rotate secrets before production deploy.
- Use strong random values for `BAILEYS_SERVICE_SECRET` / `SERVICE_SECRET`.

## License

Private — all rights reserved unless otherwise specified.
