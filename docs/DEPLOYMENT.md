# Deployment notes

Nothing here has been run on a real production host; treat it as a checklist, not a tested recipe.

1. **Profile and secrets.** Run the backend with `SPRING_PROFILES_ACTIVE=prod` (no demo data, secure cookies, OpenAPI docs off).
   Provide `DATABASE_*`, strong `POSTGRES_PASSWORD`, and `ADMIN_BOOTSTRAP_*` for the first start only; then remove the bootstrap variables.
   Keep secrets in your platform's secret store, not in the repository.
2. **TLS and proxy.** Terminate HTTPS in front of the frontend (the only public service). Route everything to Next.js; it proxies
   `/api/*` to the backend, which should not be publicly reachable. Set `FORWARD_HEADERS_STRATEGY=native` on the backend and make
   the proxy send `X-Forwarded-For`/`-Proto` so rate limits see real client IPs. `SESSION_COOKIE_SECURE` defaults to `true` in `prod`.
3. **Frontend build.** `BACKEND_URL` and `NEXT_PUBLIC_MAP_STYLE_URL` are read at **build** time (Docker build args). Rebuild after changing them.
4. **Map provider.** The default OpenFreeMap style is a free public service. For real traffic use a plan or self-hosted tiles
   (e.g. Protomaps/PMTiles, MapTiler, Stadia), keep attribution visible, and add any extra tile/glyph hosts to `CSP_MAP_ORIGINS`.
   Set `NEXT_PUBLIC_MAP_FONT` if the provider's glyph set has no "Noto Sans Bold".
5. **Image storage.** Set `STORAGE_TYPE=s3` with a **private** bucket and credentials limited to that bucket. Put a CDN in front of
   `/api/v1/media/*` if you need it (responses are cacheable for 7 days; keys are random and immutable).
6. **Database.** Use a managed PostgreSQL with the PostGIS extension available. Flyway runs on backend start. Enable backups and test a restore.
   Never run the `dev` profile or `scripts/reset-dev-db.sh` against it.
7. **E-mail.** Optional: set `MAIL_*` and `INQUIRY_NOTIFY_TO` for staff notifications.
8. **Scaling out.** The rate limiter is per-instance memory; add a gateway/Redis limiter before running several backend instances.
   Sessions are in-memory too — use sticky sessions or add Spring Session (JDBC/Redis) before scaling the backend horizontally.
9. **Health.** `GET /actuator/health` (liveness/readiness probes enabled).
