-- Core schema. All timestamps are UTC (timestamptz). Prices are NUMERIC.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on older PG

CREATE TABLE admin_user (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'EDITOR')),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE data_source (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                     VARCHAR(200) NOT NULL UNIQUE,
    source_type              VARCHAR(30)  NOT NULL
        CHECK (source_type IN ('agency', 'developer', 'owner', 'public_dataset', 'editorial', 'demonstration')),
    source_url               VARCHAR(500),
    permission_status        VARCHAR(30)  NOT NULL
        CHECK (permission_status IN ('granted', 'pending', 'not_required', 'demonstration_only')),
    attribution_requirements TEXT,
    update_method            VARCHAR(30)  NOT NULL DEFAULT 'manual'
        CHECK (update_method IN ('manual', 'csv_import', 'api')),
    is_demo                  BOOLEAN      NOT NULL DEFAULT FALSE,
    last_checked_at          TIMESTAMPTZ,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (NOT is_demo OR permission_status = 'demonstration_only')
);

CREATE TABLE neighborhood (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(100) NOT NULL UNIQUE,
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    center           geography(Point, 4326) NOT NULL,
    boundary         geography(MultiPolygon, 4326),
    boundary_source  VARCHAR(300) NOT NULL DEFAULT 'No boundary dataset available',
    data_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX neighborhood_center_gix ON neighborhood USING GIST (center);
CREATE INDEX neighborhood_boundary_gix ON neighborhood USING GIST (boundary);

CREATE TABLE property (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               VARCHAR(160) NOT NULL UNIQUE,
    property_type      VARCHAR(20)  NOT NULL
        CHECK (property_type IN ('apartment', 'house', 'land', 'commercial')),
    location           geography(Point, 4326) NOT NULL,
    location_precision VARCHAR(12)  NOT NULL DEFAULT 'approximate'
        CHECK (location_precision IN ('exact', 'approximate')),
    neighborhood_id    UUID REFERENCES neighborhood (id) ON DELETE SET NULL,
    address_text       VARCHAR(300),
    -- area_sqm: internal floor area. land_area_sqm: plot area. NULL = unknown (never 0).
    area_sqm           NUMERIC(10, 2) CHECK (area_sqm IS NULL OR area_sqm > 0),
    land_area_sqm      NUMERIC(12, 2) CHECK (land_area_sqm IS NULL OR land_area_sqm > 0),
    bedrooms           SMALLINT CHECK (bedrooms IS NULL OR bedrooms BETWEEN 0 AND 50),
    bathrooms          SMALLINT CHECK (bathrooms IS NULL OR bathrooms BETWEEN 0 AND 50),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (property_type <> 'land' OR (bedrooms IS NULL AND bathrooms IS NULL AND area_sqm IS NULL))
);
CREATE INDEX property_location_gix ON property USING GIST (location);
CREATE INDEX property_neighborhood_idx ON property (neighborhood_id);
CREATE INDEX property_type_idx ON property (property_type);

CREATE TABLE listing (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id        UUID NOT NULL REFERENCES property (id) ON DELETE RESTRICT,
    data_source_id     UUID NOT NULL REFERENCES data_source (id) ON DELETE RESTRICT,
    external_reference VARCHAR(120),
    title              VARCHAR(200) NOT NULL,
    description        TEXT,
    asking_price       NUMERIC(16, 2) NOT NULL CHECK (asking_price > 0),
    currency_code      CHAR(3)      NOT NULL CHECK (currency_code IN ('AZN', 'USD', 'EUR', 'GBP', 'RUB', 'TRY')),
    construction_status VARCHAR(20) CHECK (construction_status IN ('completed', 'under_construction', 'off_plan')),
    amenities          TEXT[]       NOT NULL DEFAULT '{}',
    developer_name     VARCHAR(200),
    publication_status VARCHAR(20)  NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN ('draft', 'review', 'needs_review', 'published', 'unpublished', 'archived')),
    review_note        TEXT,
    published_at       TIMESTAMPTZ,
    last_checked_at    TIMESTAMPTZ,
    source_updated_at  TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (publication_status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX listing_property_idx ON listing (property_id);
CREATE INDEX listing_status_idx ON listing (publication_status);
CREATE INDEX listing_published_price_idx ON listing (currency_code, asking_price) WHERE publication_status = 'published';
-- Duplicate protection: one listing per (source, external reference); one non-archived listing per property per source.
CREATE UNIQUE INDEX listing_source_ref_uq ON listing (data_source_id, external_reference) WHERE external_reference IS NOT NULL;
CREATE UNIQUE INDEX listing_property_source_uq ON listing (property_id, data_source_id) WHERE publication_status <> 'archived';

CREATE TABLE property_media (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id      UUID NOT NULL REFERENCES property (id) ON DELETE CASCADE,
    listing_id       UUID REFERENCES listing (id) ON DELETE CASCADE,
    storage_key      VARCHAR(300) NOT NULL,
    alt_text         VARCHAR(300) NOT NULL,
    display_order    INTEGER      NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    is_primary       BOOLEAN      NOT NULL DEFAULT FALSE,
    rights_reference VARCHAR(500),
    is_demo          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX property_media_property_idx ON property_media (property_id, display_order);
CREATE UNIQUE INDEX property_media_primary_uq ON property_media (property_id) WHERE is_primary;

CREATE TABLE place (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(30)  NOT NULL
        CHECK (category IN ('transport', 'education', 'health', 'shopping', 'park', 'culture', 'other')),
    location        geography(Point, 4326) NOT NULL,
    data_source_id  UUID NOT NULL REFERENCES data_source (id) ON DELETE RESTRICT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX place_location_gix ON place USING GIST (location);

CREATE TABLE inquiry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES property (id) ON DELETE CASCADE,
    listing_id  UUID NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(254) NOT NULL,
    phone       VARCHAR(40),
    message     VARCHAR(2000) NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'forwarded', 'closed', 'spam')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX inquiry_listing_idx ON inquiry (listing_id, created_at DESC);

CREATE TABLE listing_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    changed_by  VARCHAR(254) NOT NULL,
    note        TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listing_status_history_idx ON listing_status_history (listing_id, changed_at);

-- A verification row exists only when the named action actually happened.
CREATE TABLE listing_verification (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID NOT NULL REFERENCES listing (id) ON DELETE CASCADE,
    kind         VARCHAR(30) NOT NULL CHECK (kind IN ('location_reviewed', 'source_contacted', 'documents_reviewed')),
    performed_by VARCHAR(254) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note         TEXT,
    UNIQUE (listing_id, kind)
);

CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor       VARCHAR(254) NOT NULL,
    action      VARCHAR(60)  NOT NULL,
    entity_type VARCHAR(40)  NOT NULL,
    entity_id   UUID,
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);
