# investin.az — map-first property discovery for Baku

A modular monolith: a **Next.js** frontend and a **Spring Boot** backend on **PostgreSQL/PostGIS**.
Users explore Baku on an interactive map, filter and compare properties, save them locally and contact the
seller. Administrators curate the catalog (draft → review → published) through protected endpoints.

> **Demo data is fictional.** In the `dev` profile the backend loads clearly marked *fictional demonstration*
> records so the map is not empty. They are labelled in the UI, belong to a data source flagged `is_demo`, are never
> loaded in production, and can be removed with `scripts/remove-demo-data.sh`. No real listings, prices, sellers or
> market statistics are invented anywhere.

## Repository layout

```
backend/    Spring Boot 4 (Java 21), JDBC + PostGIS SQL, Flyway migrations, Spring Security, OpenAPI
frontend/   Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, TanStack Query, MapLibre GL
scripts/    dev helpers: run backend, reset DB, remove demo data, import CSV, regenerate the demo fixture
docs/       architecture decisions, data practices / import process
docker-compose.yml   PostGIS database (and optional full stack)
.env.example         every configuration variable, with comments
```

## Quick start (local development)

Prerequisites: Docker, Java 21, Node 20+ (tested with Node 24). Maven is provided by `backend/mvnw`.

```bash
# 1. configuration (the .env file is git-ignored)
cp .env.example .env
#    edit .env: set POSTGRES_PASSWORD and DATABASE_PASSWORD to the same value,
#    and set ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD (min. 12 chars) – see "Administrator" below

# 2. database (PostgreSQL 17 + PostGIS 3.5)
docker compose up -d db

# 3. backend on http://localhost:8080 (runs Flyway migrations; the 'dev' profile also loads the fictional demo data)
scripts/dev-backend.sh

# 4. frontend on http://localhost:3000   (in another terminal)
#    optional overrides (BACKEND_URL, NEXT_PUBLIC_MAP_STYLE_URL) go in frontend/.env.local
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000> → it redirects to `/explore`.

Useful URLs: API docs <http://localhost:8080/api/v1/docs> (OpenAPI JSON at `/api/v1/openapi`),
health <http://localhost:8080/actuator/health>.

### Everything in containers (optional)

```bash
docker compose --profile full up --build      # db + backend + frontend on :3000
```

### Administrator

There is **no default account**. On startup, if the `admin_user` table is empty and both
`ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (≥ 12 characters) are set, one `ADMIN` is created
(password stored as a BCrypt hash). Remove both variables afterwards. Sign in at `/admin/login`.

More accounts: `/admin/users` (ADMIN only) — create users, change roles, disable, reset passwords; everyone can change their own password there. The last enabled administrator and your own account cannot be demoted/disabled, and disabling or changing a role ends that person's current session immediately.

Roles: `ADMIN` can do everything; `EDITOR` can create/edit drafts and submit for review but cannot publish,
unpublish, archive, or create data sources. 

### Resetting local data

```bash
scripts/reset-dev-db.sh          # drops the schema and uploaded files; restart the backend to re-migrate + re-seed
scripts/remove-demo-data.sh      # removes only the fictional demo records
```

### Map tiles

The map style is a MapLibre style JSON URL set by `NEXT_PUBLIC_MAP_STYLE_URL` (read at **build** time).
The default is **OpenFreeMap** `https://tiles.openfreemap.org/styles/positron` — free, no API key, OpenStreetMap
data; its attribution (© OpenFreeMap, © OpenMapTiles, data from OpenStreetMap) is displayed by the map and must stay
visible. OpenFreeMap is a donation-funded public service: for production traffic either self-host tiles, use a
commercial provider, or follow their guidance. To use another provider (MapTiler, Stadia, Protomaps, your own),
set the style URL (including any key in the URL, which will be public in the browser — use a domain-restricted key) and,
if its glyph fonts differ, `NEXT_PUBLIC_MAP_FONT` (default `Noto Sans Bold`).
If the style cannot load, the app shows an explanatory message and keeps the list view fully working.

MapLibre 6's web worker is copied from `node_modules` into `frontend/public/maplibre/` by `npm run predev|prebuild`
(git-ignored) and referenced via `setWorkerUrl` — bundlers cannot resolve it reliably.

## Configuration reference

| Variable | Used by | Purpose |
|---|---|---|
| `POSTGRES_DB/USER/PASSWORD/PORT` | docker compose | database container (password has no default) |
| `DATABASE_URL/USER/PASSWORD` | backend | JDBC connection |
| `SPRING_PROFILES_ACTIVE` | backend | `dev` = demo data + dev conveniences; `prod` = no demo data, secure cookies, docs off |
| `STORAGE_TYPE`, `STORAGE_DIR` | backend | `local` (disk) or `s3`; `STORAGE_DIR` is also the resize cache |
| `S3_BUCKET/REGION/ENDPOINT/ACCESS_KEY/SECRET_KEY/PATH_STYLE` | backend | S3-compatible storage when `STORAGE_TYPE=s3` (private bucket) |
| `MAIL_HOST/PORT/USERNAME/PASSWORD/FROM`, `INQUIRY_NOTIFY_TO` | backend | optional SMTP e-mail to staff for each new inquiry (both host and recipient must be set) |
| `CSP_MAP_ORIGINS` | frontend (runtime) | extra origins allowed by the Content-Security-Policy for map tiles/glyphs |
| `SESSION_COOKIE_SECURE` | backend | `true` behind HTTPS (default `true` in `prod`) |
| `FORWARD_HEADERS_STRATEGY` | backend | `native` behind a reverse proxy so rate limiting sees client IPs |
| `ADMIN_BOOTSTRAP_EMAIL/PASSWORD` | backend | first administrator, only while none exists |
| `STALE_AFTER_DAYS` | backend | published listings not re-checked for this long appear in the review queue (60) |
| `RATE_LIMIT_ENABLED`, `API_REQUESTS_PER_MINUTE`, `INQUIRIES_PER_HOUR`, `LOGIN_ATTEMPTS_PER_15_MIN` | backend | in-memory per-IP limits |
| `SPRINGDOC_ENABLED` | backend (prod) | re-enable OpenAPI docs in `prod` |
| `BACKEND_URL` | frontend (build **and** server) | where `/api/*` is proxied and server components fetch. The proxy rewrite is baked in at `next build`, so rebuild after changing it (the Docker image takes it as a build arg) |
| `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_MAP_FONT` | frontend (build) | map style and label font |

## Testing and checks

```bash
# Backend: unit + integration tests. Integration tests start a real PostGIS container with Testcontainers (Docker required).
cd backend && ./mvnw test

# Frontend
cd frontend
npm run typecheck
npm run lint
npm test                      # Vitest: filters/URL state, saved properties, cards, filter sheet, explore sync, pages
npm run build

# End-to-end + accessibility (Playwright, Chromium). Needs the backend running with the dev profile (demo data).
npx playwright install chromium            # once
E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
```

E2E builds the frontend with `NEXT_PUBLIC_E2E=1` (exposes the map instance to the test so markers can be clicked on
the WebGL canvas) and serves it on port 3100. The admin journey **creates real rows in the dev database**
(a data source and a published listing); run `scripts/reset-dev-db.sh` afterwards if you want a clean slate.
Without `E2E_ADMIN_*` the admin journey is skipped and the "unauthorized visitor" test still runs.

## Production notes

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): `prod` profile, TLS/proxy, S3 storage, map provider, CSP, backups.

## What is implemented

**Public:** `/explore` (map + synchronised results, clustering, price markers, filters, sorting, URL state,
mobile map/list switch, selected-property preview, list fallback when the map fails), `/properties/[slug]`
(gallery, facts, source, last-checked, verification, location map, inquiry form), `/neighborhoods`,
`/neighborhoods/[slug]`, `/saved` (browser-local saves, comparison of up to four), `/about`.

**Admin:** `/admin` (counts, inquiries, data sources), `/admin/listings` (+ `new`, `[id]/edit`), `/admin/review`.
Session-cookie login, CSRF protection, server-side role checks, audit log, status history, image upload with
alt text and rights reference, verification steps recorded only when they happen.

**API:** versioned under `/api/v1` — see `/api/v1/docs`. Public: `properties`, `properties/markers`,
`properties/{slug}`, `neighborhoods[/{slug}]`, `places`, `search/suggestions`, `inquiries`, `media/**`.
Admin (`/api/v1/admin/**`): auth, listings CRUD + lifecycle (`submit-review`, `publish`, `unpublish`, `archive`,
`restore`, `flag-stale`, `mark-checked`), `verifications`, `media`, `review-queue`, `summary`, `data-sources`, `inquiries`.

## Importing genuine listings

See [docs/DATA_PRACTICES.md](docs/DATA_PRACTICES.md). In short: create a **data source** recording permission,
import drafts with `scripts/import_listings.py` (validated, duplicate-protected, never auto-published), attach
rights-cleared photographs in the admin UI, then review and publish.

## Troubleshooting

- **`no matching manifest for linux/arm64`** — the compose file uses `imresamu/postgis`, a multi-arch PostGIS image
  (the official `postgis/postgis` image has no arm64 build). On x86-only hosts you may switch to `postgis/postgis:17-3.5`.
- **Backend: `password authentication failed`** — `DATABASE_PASSWORD` must equal `POSTGRES_PASSWORD`; if you changed the
  password after the volume was created, run `docker compose down -v` (destroys local data).
- **Blank map, "Worker failed to load"** — run `npm run predev` (copies the MapLibre worker into `public/maplibre/`).
- **Map shows an error panel** — the style URL is unreachable/blocked or WebGL is unavailable; the list still works.
- **Admin pages redirect to login** — the session expired or the backend is unreachable; check `BACKEND_URL`.
- **Testcontainers cannot start** — make sure Docker is running; the first run pulls the PostGIS image.
- **Port in use** — change `SERVER_PORT` (backend) or run `npm run dev -- -p 3001`.

## Known limitations

See "Honest status" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
