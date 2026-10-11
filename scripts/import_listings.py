#!/usr/bin/env python3
"""Import permission-cleared listings from a CSV as DRAFTS through the admin API.

Why the API and not SQL: every row goes through the same server-side validation, audit logging and duplicate
protection as manual entry. Rows are never published here; photographs (with rights references) are added in the
admin UI and a human publishes after review.

Usage:
  ADMIN_EMAIL=... ADMIN_PASSWORD=... python3 scripts/import_listings.py listings.csv --source-id <data-source-uuid> [--dry-run]
  --api defaults to http://localhost:8080 (point it at the backend, or at the frontend origin).

CSV columns (header required; empty cell = unknown/NULL):
  external_reference,title,description,asking_price,currency,property_type,construction_status,latitude,longitude,
  location_precision,neighborhood_slug,address,area_sqm,land_area_sqm,bedrooms,bathrooms,amenities,developer,last_checked,source_updated
  amenities is ';'-separated; dates are YYYY-MM-DD.
"""
import argparse, csv, http.cookiejar, json, os, sys, urllib.error, urllib.request

REQUIRED = ["external_reference", "title", "asking_price", "currency", "property_type", "latitude", "longitude", "last_checked"]


def num(v, cast=float):
    return None if v is None or v.strip() == "" else cast(v)


def row_to_form(r, source_id):
    day = lambda v: f"{v.strip()}T00:00:00Z" if v and v.strip() else None
    return {
        "title": r["title"].strip(), "description": (r.get("description") or "").strip() or None,
        "askingPrice": num(r["asking_price"]), "currencyCode": r["currency"].strip().upper(),
        "constructionStatus": (r.get("construction_status") or "").strip() or None,
        "amenities": [a.strip() for a in (r.get("amenities") or "").split(";") if a.strip()],
        "developerName": (r.get("developer") or "").strip() or None, "dataSourceId": source_id,
        "externalReference": r["external_reference"].strip(), "lastCheckedAt": day(r.get("last_checked")),
        "sourceUpdatedAt": day(r.get("source_updated")), "propertyType": r["property_type"].strip().lower(),
        "latitude": num(r["latitude"]), "longitude": num(r["longitude"]),
        "locationPrecision": (r.get("location_precision") or "approximate").strip(),
        "neighborhoodSlug": (r.get("neighborhood_slug") or "").strip() or None,
        "addressText": (r.get("address") or "").strip() or None,
        "areaSqm": num(r.get("area_sqm")), "landAreaSqm": num(r.get("land_area_sqm")),
        "bedrooms": num(r.get("bedrooms"), int), "bathrooms": num(r.get("bathrooms"), int),
    }


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = None

    def call(self, method, path, body=None):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if method != "GET" and self.csrf:
            headers[self.csrf[0]] = self.csrf[1]
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with self.opener.open(req) as res:
                return res.status, json.loads(res.read() or b"null")
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read())
            except Exception:
                return e.code, {"message": str(e)}

    def login(self, email, password):
        _, t = self.call("GET", "/api/v1/admin/auth/csrf")
        self.csrf = (t["headerName"], t["token"])
        status, body = self.call("POST", "/api/v1/admin/auth/login", {"email": email, "password": password})
        if status != 200:
            sys.exit(f"Login failed ({status}): {body.get('message')}")
        _, t = self.call("GET", "/api/v1/admin/auth/csrf")
        self.csrf = (t["headerName"], t["token"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_file")
    ap.add_argument("--source-id", required=True, help="UUID of the data source (create it in /admin first; it records permission status)")
    ap.add_argument("--api", default="http://localhost:8080")
    ap.add_argument("--dry-run", action="store_true", help="validate the file only; send nothing")
    a = ap.parse_args()

    with open(a.csv_file, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    problems, seen = [], set()
    for i, r in enumerate(rows, start=2):
        missing = [c for c in REQUIRED if not (r.get(c) or "").strip()]
        if missing:
            problems.append(f"line {i}: missing {', '.join(missing)}")
        ref = (r.get("external_reference") or "").strip()
        if ref in seen:
            problems.append(f"line {i}: duplicate external_reference '{ref}' inside the file")
        seen.add(ref)
    if problems:
        sys.exit("Fix the file first:\n  " + "\n  ".join(problems))
    print(f"{len(rows)} rows look structurally valid.")
    if a.dry_run:
        return

    email, password = os.environ.get("ADMIN_EMAIL"), os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        sys.exit("Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.")
    api = Api(a.api)
    api.login(email, password)
    created = dupes = failed = 0
    for i, r in enumerate(rows, start=2):
        status, body = api.call("POST", "/api/v1/admin/listings", row_to_form(r, a.source_id))
        if status == 201:
            created += 1
        elif status == 409:
            dupes += 1
            print(f"line {i}: skipped, already imported ({body.get('message')})")
        else:
            failed += 1
            print(f"line {i}: rejected ({status}): {body.get('message')} {body.get('details')}")
    print(f"done: {created} draft(s) created, {dupes} duplicate(s) skipped, {failed} rejected")


if __name__ == "__main__":
    main()
