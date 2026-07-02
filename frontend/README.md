# Assignment Frontend

Angular 22 standalone SPA that integrates with the Express + Prisma + Postgres + BullMQ backend.

Note: `package.json` pins Angular at `^19` because that is the latest stable release at the time
of writing that installs cleanly. Bump to `^22` once available; the source code targets
Angular 22 features (standalone components, signals, `@if`/`@for`, `provideHttpClient`,
`provideRouter`).

## How to run

```
cd frontend
npm install
npm start
```

The dev server proxies `/api/*` to `http://localhost:3000` via `proxy.conf.json`, so the
backend must be running on port 3000. Open http://localhost:4200.
