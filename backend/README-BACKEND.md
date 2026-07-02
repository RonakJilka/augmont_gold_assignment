# Backend

## Run

```
docker compose up -d                  # from repo root — starts postgres + redis
cp backend/.env.example backend/.env
cd backend && npm install
npm run prisma:migrate                # creates tables
psql "$DATABASE_URL" -f prisma/migrations/manual_trgm.sql   # trigram GIN indexes + unique active-name idx
npm run dev                           # terminal 1 — HTTP API on :3000
npm run dev:worker                    # terminal 2 — BullMQ worker for bulk upload + report export
```

## Why two processes

Bulk product upload and report export are enqueued to BullMQ and return `202 { jobId }` immediately.
The worker does the heavy work off the request path, so HTTP never hits a 504.

## Notes

- Prisma does not manage the `pg_trgm` extension or the GIN indexes on `products.name` and `categories.name`.
  Apply `prisma/migrations/manual_trgm.sql` manually via psql. It also creates
  `ux_categories_name_active` — a case-insensitive unique index on active categories.
- Public identifiers (`CAT-XXXXXX`, `PRD-XXXXXX`) are generated with nanoid (v3 for CJS compatibility)
  using an unambiguous alphabet.
- All list endpoints support server-side pagination. Products list additionally supports
  `sort=price:asc|price:desc` and `search=<term>` matching product OR category name (ILIKE).
- Soft delete via `deleted_at` on categories and products.

## Postman

See `../postman/assignment.postman_collection.json`. Import it, run `Auth → Login`, and the
Bearer token is captured automatically.
