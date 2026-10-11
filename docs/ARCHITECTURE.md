# Architecture and decisions

## Shape

```
Browser ── /api/* (same origin) ──▶ Next.js (rewrites) ──▶ Spring Boot ──▶ PostgreSQL + PostGIS
   │                                     │ server components call the backend directly (BACKEND_URL)
   └─ map tiles ──▶ configurable MapLibre style provider
```

One backend, one frontend, one database — a modular monolith. Backend packages are by feature
(`property`, `neighborhood`, `place`, `inquiry`, `media`, `admin`, `config`, `common`).

## Decisions

| Decision | Why |
|---|---|
| **Spring Boot 4.0 + Java 21 (LTS)** | Current stable Spring line on a Java LTS; all versions pinned through the Boot BOM (+ springdoc 3.1.1). |
| **Spring JDBC (`JdbcClient`) + hand-written SQL instead of JPA/Hibernate Spatial** | Every interesting query is PostGIS SQL (`ST_Intersects`, `ST_MakeEnvelope`, `ST_DWithin`, lateral joins, `percentile_cont`). Hibernate Spatial would add a mapping layer over the part that matters least, with a Hibernate 7 compatibility risk. The schema is owned by Flyway, so there is no entity/DDL drift. Trade-off: no automatic dirty-checking; writes are explicit. |
| **`geography(Point, 4326)` + GiST indexes** | Correct distances in metres for `ST_DWithin`; bounding-box search is `ST_Intersects(location, envelope::geography)`, which uses `property_location_gix`. Verified: with 200 000 properties the planner uses a bitmap index scan on the GiST index and the filtered query runs in ≈27 ms. |
| **Property vs Listing split** | A physical property can be advertised by several sources. Search returns one row per property using a `LATERAL` join on its latest *published* listing that matches the listing-level filters; the detail page lists other published advertisements. |
| **No currency conversion** | There is no authoritative, timestamped rate source configured. Prices stay in their original currency; price filters and price sorting *require* a currency (API returns 400 otherwise; UI disables the options). |
| **Missing ≠ zero** | `bedrooms`, `bathrooms`, `area_sqm`, `land_area_sqm` are nullable; DB checks forbid 0 areas; a bedroom filter excludes unknown values; UI shows "Not stated". Land has `land_area_sqm` only (DB check). |
| **Approximate locations** | `location_precision = approximate` → coordinates are rounded to 3 decimals (~110 m) *in SQL* before leaving the server. Exact coordinates are never exposed for approximate listings. |
| **Admin auth: server session cookie + CSRF** | `HttpSession` cookie (HttpOnly, SameSite=Lax, Secure in prod), `CookieCsrfTokenRepository` for every admin mutation, BCrypt(12), uniform "invalid email or password", per-IP login rate limit. Roles `ADMIN`/`EDITOR` enforced by URL rules in `SecurityConfig` and by service logic (editing a published listing). The Next.js admin layout also verifies the session server-side, but is not the only line of defence. |
| **Inquiry endpoint is CSRF-exempt** | It carries no credentials and no admin session; protected by validation, a honeypot field, and an hourly per-IP limit instead. |
| **Uploads: magic-byte validation, SVG rejected** | Uploaded files are checked by content (JPEG/PNG/WebP), stored under server-generated names, size-capped (8 MB). Bundled demo SVGs are served with a sandboxing CSP. |
| **Storage abstraction** | `MediaStorage` interface with a local-disk implementation; an S3-compatible implementation can be added without touching callers. `?w=` resizes raster images on the fly (cached on disk). |
| **Rate limiting in memory** | Fine for one instance; replace by a gateway/Redis limiter when scaling out (documented in `RateLimitFilter`). |
| **TanStack Query for server state** | Keys include filters + rounded bounds, so a stale response can never overwrite a newer one; requests carry `AbortSignal`; `keepPreviousData` avoids flicker. |
| **URL is the source of truth for explore state** | `lat/lng/z`, `sel`, `v` and every filter live in the query string (native History API: `replaceState` for movement/selection, `pushState` for filters), so shared links, back/forward and "back from details" all restore state. |
| **Map bounds debounce** | One request per settled movement (350 ms) instead of one per `move` event. A neighbourhood filter replaces the viewport as the geographic constraint. |
| **MapLibre**: price pills as symbol layer (`icon-text-fit`), clustering via GeoJSON source | Clusters and pills are drawn by the GPU, so thousands of markers stay smooth. The selected marker lives in its own un-clustered source so it never hides inside a cluster. |
| **Neighborhoods** | Seeded with the 12 Baku administrative districts as **approximate centre points only**; no boundary and no description is asserted (`boundary_source` says so). Statistics appear only when ≥ 5 published listings share a currency. |
| **Verification labels** | `listing_verification` rows exist only when an admin records the action; the UI shows exactly those rows and otherwise says none were recorded. |
| **Demo data** | Separate Flyway location (`db/dev`) loaded only in the `dev` profile, tied to a data source with `is_demo = true`, labelled in UI, removable by script. |

## Database

Migrations are in `backend/src/main/resources/db/migration` (`V1` schema, `V2` Baku districts); the demo seed is
`db/dev/V100__demo_data.sql`, **generated** by `scripts/generate_demo_data.py` (deterministic).
Constraints include: positive prices, supported ISO currencies, controlled publication states, `published ⇒ published_at`,
one primary image per property, unique `(data_source, external_reference)` and one non-archived listing per
`(property, source)` (duplicate protection), `ON DELETE RESTRICT` from listings to properties and data sources.

## Honest status

Verified by running them (see the final report for exact numbers): backend unit + PostGIS integration tests,
frontend unit/component tests, production build, lint, type-check, Playwright end-to-end journeys (desktop + a mobile
viewport), automated axe-core accessibility scans.

Known gaps / not verified:

- **Manual assistive-technology testing** (screen readers, keyboard-only walkthrough of the map) was not done; axe finds
  only a subset of WCAG issues. The map canvas itself is not keyboard-operable beyond MapLibre defaults — the list
  provides the accessible equivalent.
- **Tablet** layout is verified by CSS breakpoints and one 820 px screenshot only, not by a dedicated tablet test; no real devices were used.
- **Stacked markers** (identical coordinates) are fanned out on a small ring for display only; positions are therefore
  slightly offset from the true point, and very large stacks (dozens) may still look crowded.
- **Marker cap**: the map receives at most 1 000 markers per request (the UI says so when truncated).
- **E-mail** is SMTP to a staff address only; verified with a mocked mail sender, not against a real mail server.
  No delivery to sellers/agencies is automated.
- **S3 storage** is verified against Adobe S3Mock (an S3-compatible server), not against AWS S3/R2 themselves.
- **CSP**: nonce-based scripts; `style-src` still allows `'unsafe-inline'` (MapLibre/React inline styles). Verified in Chromium
  with the default OpenFreeMap provider only; other providers may need `CSP_MAP_ORIGINS`.
- **Image processing**: resizing uses `javax.imageio` (JPEG/PNG only; WebP is served unscaled). No malware scanning.
- **Production deployment** (TLS, reverse proxy, backups, CDN for media) is documented but not tested.
- **No price-history, analytics, public accounts, languages** — intentionally deferred.
