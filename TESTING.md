## Safe testing environment (isolated)

This project supports a **separate TEST mode** that uses:
- a **separate database** (no production impact)
- **test-only API endpoints** (only enabled when `TEST_MODE=true`)
- a **Test Lab UI** (only enabled when `VITE_TEST_MODE=true`)

Nothing here changes production behavior unless you explicitly enable test mode.

---

## 1) Backend (Laravel) on port 3000 with a test database

### Create a dedicated test DB
Create an empty MySQL database named:
- `wabot_testing`

### Configure test env
Backend file:
- `WaBoT/back-end/.env.testing`

Set DB credentials (`DB_USERNAME`, `DB_PASSWORD`) to your local MySQL user.

### Run backend on port 3000 (testing env)
From `WaBoT/back-end/`:

```bash
php artisan key:generate --env=testing
php artisan migrate:fresh --env=testing --seed --seeder=TestingSeeder
php artisan serve --env=testing --port=3000
```

This runs **fully isolated** from your normal `.env` database.

---

## 2) Frontend (Vite) in test mode

Frontend file:
- `WaBoT/front-end/.env.test`

It points the frontend to:
- `VITE_API_URL=http://127.0.0.1:3000/api`

Run frontend (example port 3001) from `WaBoT/front-end/`:

```bash
npm install
npm run dev -- --port 3001 --mode test
```

Open:
- `http://127.0.0.1:3001/test-lab`

---

## 3) What seed data is created

Seeder:
- `WaBoT/back-end/database/seeders/TestingSeeder.php`

It creates:
- Users in `active / expired / pending` states
- Businesses + products
- Messages + a few orders
- Payment logs (amount `50.00`) distributed across last 12 months
- Support messages

Admin credentials in test DB:
- Email: `admin@test.local`
- Password: `password123`

---

## 4) Test-only API endpoints

Enabled **only** when `TEST_MODE=true` (in `.env.testing`):
- `POST /api/test/ai` (AI prompt test, no WhatsApp send)
- `POST /api/test/whatsapp-sandbox` (stores message + generates AI reply, **no Meta API send**)

---

## 5) Reset & re-run (safe)

To reset test DB any time:

```bash
php artisan migrate:fresh --env=testing --seed --seeder=TestingSeeder
```

