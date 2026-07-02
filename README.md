# Product Management System

Full-stack **Product Management System**: **Angular 22 + Node.js/Express + PostgreSQL** with async bulk-upload and report-export pipelines that are structurally immune to HTTP 504 timeouts.

---

## 1. What's inside

```
assignment/
├── docker-compose.yml           # Postgres 16 + Redis 7
├── postgres-init/               # auto-runs CREATE EXTENSION citext, pg_trgm
├── backend/                     # Express + Prisma + BullMQ (TypeScript)
│   ├── src/server.ts            #   HTTP entrypoint  (port 3000)
│   ├── src/worker.ts            #   BullMQ worker entrypoint
│   └── prisma/                  #   schema + manual trigram migration
├── frontend/                    # Angular (standalone components, signals)
├── postman/                     # Postman collection + sample CSV
│   ├── assignment.postman_collection.json
│   └── sample-products.csv
└── README.md                    # this file
```

---

## 2. Prerequisites

- Docker + Docker Compose
- Node.js 20 LTS
- npm 10+
- psql client (for the manual trigram migration)

---

## 3. Run it (first time)

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate            # creates tables
psql "$DATABASE_URL" -f prisma/migrations/manual_trgm.sql   # trigram + partial indexes

# 3. Backend HTTP (terminal A)
npm run dev                       # http://localhost:3000

# 4. Backend Worker (terminal B) — bulk-upload + report-export processor
npm run dev:worker

# 5. Frontend (terminal C)
cd ../frontend
npm install
npm start                         # http://localhost:4200
```

The Angular dev server proxies `/api/*` → `http://localhost:3000` (see `frontend/proxy.conf.json`), so no CORS setup needed for local dev.

---

## 4. Try it end-to-end

1. Open `http://localhost:4200/register` → create an account.
2. Go to **Categories** → add "Phones", "Laptops".
3. Go to **Products → New** → add a couple of products with an image.
4. Go to **Products** — try pagination, sort by price, search "phone".
5. Go to **Bulk Upload** → upload `postman/sample-products.csv` (edit the `categoryUniqueId` column first to match one of your categories) → watch the progress bar.
6. Go to **Reports** → generate XLSX → download when status = completed.

For API-only testing, import `postman/assignment.postman_collection.json`. Run **Auth → Register** or **Login** first; the collection auto-captures the JWT into `{{token}}`.

---

## 5. Architecture at a glance

```
┌──────────────┐    HTTP     ┌──────────────────┐    SQL    ┌──────────────┐
│  Angular 22  │ ──────────► │ Express (server) │ ────────► │ PostgreSQL   │
│   :4200      │ ◄────────── │      :3000       │           │   :5432      │
└──────────────┘             │  - auth (JWT)    │           └──────────────┘
                             │  - CRUD          │
                             │  - enqueue jobs  │
                             │      │           │
                             │      ▼           │
                             │  BullMQ Queue    │           ┌──────────────┐
                             │      │           │ ────────► │  Redis :6379 │
                             └──────┼───────────┘           └──────────────┘
                                    │
                                    ▼
                             ┌──────────────────┐    SQL    ┌──────────────┐
                             │ Express (worker) │ ────────► │ PostgreSQL   │
                             │  - bulk upload   │           └──────────────┘
                             │  - report export │
                             └──────────────────┘
```

**Key idea for the 504 requirement**: bulk upload and report export never do work inside the HTTP request. They insert a row into `jobs`, enqueue a BullMQ job, and return `202 Accepted` with a `jobId`. The Angular UI polls `GET /jobs/:id` every 2 seconds and shows a progress bar.

---

## 6. Environment variables (`backend/.env`)

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://assignment:assignment@localhost:5432/assignment` | Postgres URL |
| `REDIS_HOST` | `localhost` | BullMQ |
| `REDIS_PORT` | `6379` | |
| `JWT_SECRET` | *(required)* | any long random string |
| `JWT_EXPIRES_IN` | `24h` | |
| `BCRYPT_ROUNDS` | `10` | password hash cost |
| `PORT` | `3000` | HTTP |
| `UPLOAD_DIR` / `TMP_DIR` / `REPORTS_DIR` | `./uploads` etc. | on-disk storage |

---

## 7. Notes / deviations

- `frontend/package.json` currently pins **Angular ^19** (latest install-able at build time). The code uses only Angular 22-compatible patterns (standalone, signals, new control flow, functional interceptors/guards). Run `npx @angular/cli@latest update @angular/core@22 @angular/cli@22` after `npm install` to move to 22.
- Trigram indexes are created via a raw SQL file (`prisma/migrations/manual_trgm.sql`) because Prisma doesn't model GIN + pg_trgm operator classes yet.
- Public IDs (`CAT-XXXXXX`, `PRD-XXXXXX`) come from `nanoid` with an alphabet that excludes ambiguous characters (`I`, `O`, `0`, `1`).

---

## 8. Bulk upload sample

`postman/sample-products.csv` contains ~135 realistic products across 8 categories so the app looks populated after a single upload. Before uploading:

1. Create these categories from the **Categories** page: **Phones**, **Laptops**, **Accessories**, **Displays**, **Audio**, **Tablets**, **Wearables**, **Gaming**.
2. Copy each category's `uniqueId` (shown in the table) and find-and-replace the placeholders in the CSV:
   - `CAT-PHONES` → Phones uniqueId
   - `CAT-LAPTOP` → Laptops uniqueId
   - `CAT-ACCESS` → Accessories uniqueId
   - `CAT-DISPLAY` → Displays uniqueId
   - `CAT-AUDIO` → Audio uniqueId
   - `CAT-TABLET` → Tablets uniqueId
   - `CAT-WEAR` → Wearables uniqueId
   - `CAT-GAMING` → Gaming uniqueId
3. Upload from the **Bulk Upload** page.
