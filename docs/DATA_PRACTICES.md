# Data practices and the import process

## Rules

1. **No scraping.** Listings are entered by people or imported from files that the source has given us permission to use.
2. **No invented data.** Nothing in the product is generated to look real. The development fixtures are labelled
   *fictional demonstration data* in the database (`data_source.is_demo`), in the API (`demonstration: true`) and in the UI.
3. **Every listing has a source** (`data_source`): its type, URL, permission status, attribution requirements and update method.
   A listing can only be published when its source's permission status is `granted` or `not_required`.
4. **Every image has a rights reference** (who owns it / which permission or licence) and alt text. Publishing is blocked otherwise.
   Do not hotlink external images; upload files so they are stored by us.
5. **Verification is factual.** "Location reviewed", "Source contacted" and "Documents reviewed" are recorded as
   explicit admin actions with who/when. The public page shows only recorded steps.
6. **Prices are asking prices in the original currency.** They are never converted.
7. **Freshness.** `last_checked_at` is required to publish. Published listings not re-checked for `STALE_AFTER_DAYS`
   (default 60) appear in the review queue; admins can *Mark checked*, *Flag as stale* (hides it from public search) or unpublish.
8. **Personal data.** Inquiries (name, email, optional phone, message) are visible only to authenticated admins and never in
   public responses. Logs record inquiry IDs, not content.

## Importing genuine, permission-cleared listings

1. In `/admin` → *Data sources*, add the source with the correct **permission status**. (ADMIN role.)
   Copy its UUID from `GET /api/v1/admin/data-sources`.
2. Prepare a CSV (columns documented at the top of `scripts/import_listings.py`). Use the source's own listing ID in
   `external_reference` — it makes re-imports idempotent.
3. Validate: `python3 scripts/import_listings.py file.csv --source-id <uuid> --dry-run`
4. Import drafts:
   `ADMIN_EMAIL=… ADMIN_PASSWORD=… python3 scripts/import_listings.py file.csv --source-id <uuid> [--api http://localhost:8080]`
   Rows go through the same server-side validation as manual entry. Rows already imported are skipped (HTTP 409 on the
   unique `(data_source, external_reference)` constraint); invalid rows are reported with reasons. Imported rows are always **drafts**.
5. In `/admin/listings/{id}/edit`: upload rights-cleared photographs (alt text + rights reference), record any verification
   steps that actually happened, *Submit for review*, then an ADMIN *Publish*es. The server lists exactly what still blocks publication.
6. To remove the fictional demo records from a database: `scripts/remove-demo-data.sh`. Production never loads them
   (they live under a Flyway location that only the `dev` profile enables).

## Neighborhood information

Descriptions, boundaries and photographs must be curated and sourced. Until then the product shows the district name with
an approximate centre point and says so. To add a sourced description, update `neighborhood.description` and set
`boundary_source` to the citation; add a Flyway migration so the change is reproducible.
