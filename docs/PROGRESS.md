# Progress log

Last updated: 2026-10-11. Repo: https://github.com/rradjablii/investin.az (branch `main`).

## Where things stand

The MVP described in `prompt.md` is built, running locally, tested and pushed. Follow-up work (stacked markers,
inquiry e-mail, admin user management, production-readiness items) is also done.

## Timeline

1. **Foundation** — inspected the empty repo; Docker, Java 21, Node 24 available; Maven via wrapper.
   Chose Spring Boot 4.0.8 (the 3.x line is end-of-life), JDBC + PostGIS SQL instead of JPA (see ARCHITECTURE.md).
2. **Backend** — Flyway schema (V1) + Baku districts (V2) + generated fictional demo seed (dev profile only),
   public API (search by bounding box, markers, detail, neighborhoods, places, suggestions, inquiries, media),
   admin API (listings lifecycle, media upload, verifications, review queue, data sources, inquiries, audit),
   session-cookie auth + CSRF + roles, rate limiting, OpenAPI.
3. **Frontend** — explore map (clustering, price pills, synced cards, filters, URL state, mobile switch, fallback),
   detail, neighborhoods, saved + compare, about, admin UI.
4. **Verification** — backend tests on real PostGIS (Testcontainers), Vitest, Playwright e2e (desktop + mobile),
   axe accessibility scans, spatial-index check on 200k rows (~27 ms), security curl checks, Docker images build.
5. **Follow-ups** — stacked-marker fan-out, SMTP inquiry notification, `/admin/users` + session revocation,
   S3-compatible storage (tested on Adobe S3Mock), nonce-based CSP, deployment notes.
6. **Housekeeping** — git init, pushed to GitHub; fixed mail health check reporting DOWN without SMTP.

## Test status (last run)

Backend 67 passed · frontend unit 63 passed · Playwright 17 passed · typecheck and lint clean · production build OK.

## How to start tomorrow

```bash
docker compose up -d db          # Docker Desktop must be running
scripts/dev-backend.sh           # backend :8080 (dev profile: fictional demo data)
cd frontend && npm run dev       # frontend :3000
```

Local-only admin login (from the git-ignored `.env`): `admin@example.test` / `dev-admin-pass-12345`.
`.env` is not in git; recreate from `.env.example` on another machine.
Tests: see README "Testing and checks". E2E writes rows into the dev DB; `scripts/reset-dev-db.sh` wipes it.

## Known gaps (also in docs/ARCHITECTURE.md → "Honest status")

- No manual screen-reader / real-device / tablet testing.
- E-mail verified with a mocked sender only; S3 verified on S3Mock only; deployment checklist never run on a real host.
- CSP keeps `'unsafe-inline'` for styles; only checked with OpenFreeMap tiles.
- Rate limiter and HTTP sessions are in-memory (single backend instance).
- Neighborhoods have centre points only: no boundaries or sourced descriptions yet.
- Image resize is JPEG/PNG only; no malware scanning.

## Candidate next steps

1. Sourced neighborhood descriptions/boundaries (needs real, citable data).
2. Real listing import from a permission-cleared source using `scripts/import_listings.py`.
3. Production tile provider + real S3/R2 bucket + deploy to a host following `docs/DEPLOYMENT.md`.
4. Manual accessibility pass and real-device testing.
5. Spring Session (JDBC/Redis) and shared rate limiting before running multiple backend instances.
6. Saved searches / alerts, price history, multi-language (deliberately deferred).
