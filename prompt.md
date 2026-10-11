# MASTER BUILD PROMPT — AZERBAIJAN REAL ESTATE DISCOVERY PLATFORM

## 1. YOUR ROLE

Act as a senior full-stack software engineer, product engineer, database architect, and pragmatic technical lead.

Your task is to BUILD a functional, production-minded MVP of a map-first real estate discovery platform focused initially on Baku, Azerbaijan.

Do not merely describe the implementation, generate a design proposal, create a static mockup, or give me a tutorial. Work directly in the available project repository. Create and modify the necessary files, install appropriate dependencies, implement the application, run it, test it, and fix errors.

I want a working software product, not a collection of disconnected components.

Make reasonable technical decisions independently. Ask me questions only when a genuinely blocking decision cannot be resolved safely from the requirements.

Do not stop after planning. After a brief inspection and implementation plan, start building.

If a feature cannot be completed because credentials, external services, or infrastructure are unavailable, implement the appropriate abstraction and a clearly documented local alternative. Do not pretend the feature has been tested or completed when it has not.

## 2. PRODUCT VISION

Build an intuitive, map-first property discovery platform for people who want to explore real estate opportunities in Azerbaijan but may have little knowledge of the local market.

The initial market is Baku.

The primary user is an international property buyer who wants to:

1. Explore Baku geographically.
2. Discover properties directly on an interactive map.
3. Understand different neighborhoods.
4. Filter and compare available properties.
5. Inspect property details, photographs, prices, and locations.
6. Save interesting properties.
7. Contact the relevant seller or agency.

The product should feel like a coherent geographic discovery experience rather than a traditional classifieds website with an additional map.

The map is the primary interface. Property listings, neighborhood information, and property details must integrate naturally into that interface.

### Product positioning

We are not building another generic property listing website.

Our differentiation is ease of exploration, clear geographic context, reliable listing information, and a frictionless path from discovering a location to inspecting a property.

The initial product must prioritize:

- Interactive map discovery.
- Visually rich property cards.
- Simple, intuitive filters.
- Neighborhood exploration.
- Seamless navigation between map markers, listings, and details.
- Data quality and source transparency.
- Responsive desktop and mobile experiences.

Investment analytics, sophisticated recommendations, and advanced market statistics are future extensions. Do not let them delay the core discovery experience.

## 3. NON-NEGOTIABLE DEVELOPMENT RULES

Follow these rules throughout implementation.

1. Inspect the existing repository before making architectural decisions.
2. Preserve useful existing code, conventions, dependencies, and project structure.
3. Do not replace a working project with a new scaffold without a clear technical reason.
4. Implement complete user flows, including loading, empty, error, and success states.
5. Do not use static mock data as a substitute for backend functionality.
6. Do not hardcode property results directly into React components.
7. Do not leave core interactions as decorative buttons.
8. Do not create fake authentication, fake APIs, or simulated success responses for operations that should reach the backend.
9. Do not invent real property listings, property availability, rental yields, market statistics, seller identities, or verification claims.
10. If demonstration properties are required, mark them explicitly as fictional demonstration data and keep them separate from genuine listings.
11. Never expose secrets, database credentials, private contact information, or unpublished listings through public endpoints.
12. Use environment variables for configuration and provide an accurate .env.example file.
13. Implement database migrations and reproducible development setup.
14. Run available builds, tests, static checks, and integration checks.
15. Fix implementation errors instead of merely reporting them.
16. Do not claim that tests passed unless you actually ran them.
17. Avoid unnecessary abstractions, microservices, complicated state management, and premature optimization.
18. Keep the application understandable and maintainable for a developer who will continue extending it.
19. Do not build the entire product in a single giant component.
20. Do not stop at a project plan. Implement the MVP.

## 4. TECHNICAL ARCHITECTURE

Use a simple modular monolith architecture.

Preferred technology stack:

### Frontend
- Next.js with App Router.
- React.
- TypeScript in strict mode.
- Tailwind CSS.
- A consistent component system, using accessible primitives where useful.
- TanStack Query or an equivalent well-justified approach for server-state management.
- React Hook Form and Zod where form complexity justifies them.

### Backend
- Java with Spring Boot.
- Spring Web for REST APIs.
- Spring Data JPA.
- Hibernate Spatial or an equivalent compatible approach for geographic persistence.
- Bean Validation.
- Spring Security for administrative authentication and authorization.
- Flyway for database migrations.

Use a current stable Java LTS release and a compatible Spring Boot release. Pin compatible dependency versions rather than using unspecified versions.

### Database
- PostgreSQL.
- PostGIS.
- UUID identifiers.
- Spatial indexes for geographic searches.
- Explicit database constraints and migrations.

### Map
- MapLibre GL JS.
- A configurable map style URL.
- Price markers, marker selection, clustering, and geographic search.
- A tile provider configured through environment variables or documented configuration.

Do not assume that a public tile service can be used without limits or attribution. Follow the selected provider's usage policy. Do not introduce a paid API dependency that requires a secret key without documenting the setup.

### Supporting services
- Docker Compose for local development.
- PostgreSQL/PostGIS container.
- Object storage abstraction for property images.
- Local development image support that can be replaced by S3-compatible storage or another production provider.
- Backend API documentation through OpenAPI.
- Automated tests.

If the existing repository already uses a different stack, inspect it first and preserve a suitable established architecture. Do not introduce Java solely to replace a working backend. If there is no existing application, use the preferred stack above.

### Repository structure

For a new project, use a maintainable monorepo with separate frontend and backend directories, for example:

- frontend/
- backend/
- infrastructure/
- docs/

Include the Docker Compose configuration, environment examples, development scripts, database migrations, and documentation in appropriate locations.

Do not create a microservices architecture.

## 5. DESIGN DIRECTION

The interface must be visually polished, restrained, and highly usable.

The design direction is minimal, property-focused, and map-first.

Do not begin with a generic real estate landing page full of marketing sections. The principal experience is the discovery application.

### Visual principles

- Use a restrained, professional color palette.
- Prioritize map visibility.
- Use clear typography and consistent spacing.
- Use property photographs as the primary visual content.
- Avoid unnecessary gradients, glassmorphism, oversized headings, excessive rounded cards, and decorative animations.
- Avoid dashboard-like panels full of statistics that do not help the user discover properties.
- Avoid cluttered map labels.
- Avoid too many competing buttons.
- Use clear visual hierarchy between property prices, property attributes, and secondary information.
- Use consistent interaction patterns across the application.
- Make loading and empty states intentional rather than leaving blank areas.
- Provide clear focus states and keyboard-accessible controls.
- Use a consistent icon library such as Lucide.

Do not sacrifice functionality for visual appearance.

Do not produce an elaborate UI design document instead of implementing the application. Build the interface directly, then inspect and refine it.

## 6. RESPONSIVE REQUIREMENTS

Responsive behavior is required from the beginning.

### Desktop

The main discovery screen should use a map and a synchronized property-results panel.

The map must remain large enough to be useful. The results panel must show enough information to make browsing efficient.

The exact panel arrangement is your implementation decision, but it must support simultaneous geographic exploration and property browsing.

### Tablet

The map and results panel may adapt their proportions. Filters must remain accessible, and the selected property must remain easy to inspect.

### Mobile

The default discovery experience should prioritize the map.

Provide:

- A full-screen or near-full-screen map.
- An accessible search control.
- Compact filter access.
- A clear map/list toggle.
- A selected-property preview.
- An expandable property card or detail view.
- Touch-friendly controls.
- A way to return to the previous map state.

Do not simply shrink the desktop layout to fit a phone.

Avoid horizontal overflow. Do not depend on hover interactions. Account for mobile browser viewport behavior and safe areas where appropriate.

## 7. APPLICATION ROUTES

Implement the following routes.

### Public routes

- / — redirect to the main exploration experience or present a minimal entry point that immediately leads to it.
- /explore — primary map discovery interface.
- /properties/[slug] — property details.
- /neighborhoods — neighborhood directory.
- /neighborhoods/[slug] — neighborhood detail.
- /saved — locally saved properties.
- /about — concise explanation of the platform, its data practices, and limitations.

### Administrative routes

- /admin
- /admin/listings
- /admin/listings/new
- /admin/listings/[id]/edit
- /admin/review

Protect administrative routes and all administrative API endpoints with real server-side authorization.

Do not rely on hiding admin navigation in the frontend.

Do not require users to register just to browse properties.

## 8. PRIMARY FEATURE: INTERACTIVE MAP

This is the most important part of the product.

Implement the map as a functional application component, not a static background image.

### Required behavior

1. Display the initial Baku map view.
2. Display published properties as price markers.
3. Use the listing's original asking currency when displaying marker prices, unless the user explicitly selects another display currency.
4. Cluster markers when zoomed out.
5. Expand clusters as the map zooms in.
6. Select a marker to highlight the associated property.
7. Display a compact property preview for the selected property.
8. Synchronize the selected marker with the corresponding result card.
9. Selecting a result card must highlight the corresponding marker.
10. Allow users to pan and zoom.
11. Fetch results according to the current geographic bounds and filters.
12. Preserve the current map position when opening and closing property details.
13. Provide loading, empty, and error states.
14. Support a list-based fallback if map rendering fails.
15. Ensure the selected property can be identified accessibly outside the map.

### Geographic search

Use a bounding-box search contract.

The frontend should send the current map bounds to the backend. The backend should query published listings within those bounds using PostGIS.

Use geographic indexes. Avoid loading the entire property database into the browser.

Debounce viewport-driven requests or use an explicit "Search this area" action where appropriate. Prevent obsolete requests from overwriting newer results.

Use request cancellation or another appropriate concurrency strategy.

Avoid making a request for every individual map movement event.

### Price markers

Markers should be readable at a glance.

Use a consistent marker format and currency display. Long prices should be abbreviated only if the exact value remains available in the property preview.

Handle multiple currencies without silently comparing unconverted numeric values.

Do not invent exchange rates. If currency conversion is implemented, use a documented source and timestamp, and distinguish converted display values from original asking prices.

### Map provider configuration

Do not assume a map token, style URL, or unrestricted tile endpoint exists.

Make the style URL configurable. Document any required provider configuration and attribution.

If an external map provider cannot be reached, provide a useful error state and preserve list-based property discovery.

## 9. PROPERTY DISCOVERY AND FILTERS

Implement the following filters where supported by the catalog:

- Property type.
- Minimum asking price.
- Maximum asking price.
- Currency.
- Minimum bedrooms.
- Maximum bedrooms.
- Minimum area in square meters.
- Maximum area in square meters.
- Construction status.
- Neighborhood.
- Listing freshness, if meaningful freshness data is available.

Property types:

- Apartment.
- House.
- Land.
- Commercial property.

Construction statuses:

- Completed.
- Under construction.
- Off-plan.
- Unknown, where appropriate.

### Filter behavior

- Filters must work in combination.
- Filters must update both the map and the results list.
- Active filters must be visible.
- Users must be able to remove individual filters.
- Provide a reset-all action.
- Validate invalid numeric ranges.
- Preserve the current geographic bounds.
- Reflect applied filters in URL query parameters.
- Restore supported filters when opening a shared URL.
- Restore state on browser back and forward navigation.
- Do not show unsupported filters as though they are operational.

On mobile, provide an explicit Apply action for the filter panel.

Separate pending filter edits from applied filters when necessary.

Do not confuse missing property attributes with zero values.

For example, an unknown bedroom count must not be interpreted as zero bedrooms.

### Result cards

Each card should show available information:

- Primary photograph.
- Asking price and currency.
- Property type.
- Location or neighborhood.
- Area in square meters.
- Bedrooms and bathrooms, when applicable.
- Construction status, when known.
- Saved-property control.

Cards should have consistent heights where practical without truncating important information.

Provide useful placeholders when optional data is missing.

### Sorting

Implement at least:

- Price ascending.
- Price descending.
- Recently updated or published, based on reliable timestamps.

Do not sort different original currencies by their raw numeric values as if they were comparable.

If normalized currency sorting is unavailable, require a consistent currency or clearly limit the available sort options.

## 10. PROPERTY DETAIL EXPERIENCE

Implement a complete property detail page.

Include:

- Property photographs and gallery navigation.
- Asking price and original currency.
- Property type.
- Location and neighborhood.
- Floor area or land area, with clear semantics.
- Bedrooms and bathrooms when applicable.
- Construction status.
- Description.
- Amenities where supported.
- Developer information where supported.
- Approximate or exact map location, according to the permitted location precision.
- Listing source.
- Last-checked timestamp.
- Verification information.
- Save-property action.
- Seller inquiry action.
- Similar properties only if a defensible matching method is available.

A property detail page must have a stable, shareable URL.

It must also work when opened directly rather than only from the map.

If the property is no longer published, return an appropriate unavailable state.

Never claim that a property is verified merely because an administrator entered its details.

Use specific verification labels, such as "Location reviewed" or "Source contacted," only when the corresponding action has actually occurred.

## 11. NEIGHBORHOOD EXPERIENCE

Implement a basic neighborhood directory and neighborhood detail page.

Neighborhood information should be curated and sourced, not generated as unsupported factual claims.

Each neighborhood record may contain:

- Name.
- Slug.
- Description.
- Geographic boundary or documented approximate area.
- Representative images with appropriate publication rights.
- Nearby points of interest.
- Current listing count.
- Asking-price statistics where the available sample supports them.
- Data coverage and update timestamp.

Provide an action that opens the main map with the neighborhood selected.

If there is insufficient market data, show a clear unavailable or insufficient-data state.

Do not generate fictitious rental demand, appreciation rates, property prices, or neighborhood investment rankings.

Do not assume that every local neighborhood has an authoritative boundary dataset.

## 12. PROPERTY SAVING AND COMPARISON

Implement browser-local property saving for v1.

Use localStorage or another suitable browser-local persistence mechanism.

The saved-properties feature must:

- Save a property.
- Remove a saved property.
- Persist across refreshes in the same browser.
- Display a saved-property list.
- Open saved properties in the main discovery interface.
- Handle removed or unavailable properties.
- Avoid requiring authentication.

Prevent server-rendering and hydration errors when reading browser-local state.

Implement a basic property comparison experience for up to four properties.

Compare only fields with defined meanings:

- Asking price and currency.
- Property type.
- Area.
- Bedrooms and bathrooms.
- Neighborhood.
- Construction status.
- Last-checked date.

Clearly display unavailable values.

Do not pretend local saves synchronize across browsers or devices.

## 13. DATA MODEL

Use PostgreSQL and PostGIS.

Implement the following entities through real database migrations.

### Property

Represents the underlying physical property.

Suggested fields:

- id: UUID.
- slug: unique stable public identifier.
- property_type.
- location: PostGIS geography point.
- location_precision.
- neighborhood_id, nullable.
- area_sqm, nullable.
- land_area_sqm, nullable.
- bedrooms, nullable.
- bathrooms, nullable.
- created_at.
- updated_at.

Define area semantics by property type.

Do not overload a single area field when internal floor area and land area have different meanings.

### Listing

Represents a particular advertisement.

Suggested fields:

- id: UUID.
- property_id.
- data_source_id.
- external_reference, nullable.
- title.
- description.
- asking_price.
- currency_code.
- construction_status, nullable.
- publication_status.
- published_at, nullable.
- last_checked_at, nullable.
- source_updated_at, nullable.
- created_at.
- updated_at.

Separate property records from advertisements so that multiple agents can advertise the same physical property.

Keep source-specific information rather than overwriting conflicting claims without review.

### PropertyMedia

Fields:

- id.
- property_id.
- listing_id, nullable.
- storage_key or asset URL.
- alt_text.
- display_order.
- is_primary.
- rights_reference.
- created_at.

Store image files in appropriate object storage or an image service rather than directly in PostgreSQL.

### Neighborhood

Fields:

- id.
- slug.
- name.
- description.
- geographic boundary, nullable.
- boundary_source.
- data_updated_at.

### Place

Fields:

- id.
- name.
- category.
- geographic location.
- data_source_id.
- last_checked_at.

### DataSource

Fields:

- id.
- name.
- source_type.
- source_url, where appropriate.
- permission_status.
- attribution_requirements.
- update_method.
- last_checked_at.

Record the origin and permission status of listing data and media.

### Inquiry

Fields:

- id.
- property_id.
- listing_id.
- name.
- email or other permitted contact information.
- message.
- status.
- created_at.

Restrict access to inquiry data. Validate submissions and implement reasonable spam protection.

### Supporting tables

Implement status history and administrative audit logging.

Account-based saved properties can be added later. Do not introduce mandatory public authentication simply to implement local saving.

### Data integrity

Implement:

- Foreign-key constraints.
- Unique public identifiers.
- Appropriate indexes.
- A GiST index on geographic columns.
- Validation for positive asking prices and valid area values.
- Valid currency codes.
- Consistent timestamps.
- Controlled publication states.
- Protection against orphaned records.
- Safe handling of duplicate listings.

Use decimal numeric types for prices, not floating-point types.

Use appropriate Java time types and UTC storage for timestamps.

## 14. DATA ACQUISITION AND DEMONSTRATION DATA

The real platform will initially use a manually curated catalog.

Build an admin workflow that allows an authorized administrator to create, edit, review, publish, and unpublish listings.

Do not automatically scrape existing real estate websites.

Do not copy listing photographs or descriptions without permission.

Do not invent real listings to make the map look populated.

If no real catalog is available during development, create a small, deterministic fixture dataset explicitly marked as fictional demonstration data.

Every demonstration record must be distinguishable from a genuine listing. Keep demonstration data out of production seeds and make it possible to disable or delete it easily.

Document the process for importing genuine, permission-cleared listings.

Support a repeatable seed or import process with validation and duplicate detection.

### Administrative listing lifecycle

Implement:

Draft → Review → Published.

Also support:

- Unpublished.
- Archived.
- Needs review.

Only published listings can appear through public search endpoints.

Require the necessary data and publication permissions before publishing.

Allow administrators to flag stale listings and record review actions.

## 15. REST API

Implement a versioned REST API under /api/v1.

### Public endpoints

GET /api/v1/properties

Supports geographic bounds, filters, sorting, and pagination.

GET /api/v1/properties/{slug}

Returns the public detail of a published listing.

GET /api/v1/neighborhoods

Returns the neighborhood directory.

GET /api/v1/neighborhoods/{slug}

Returns neighborhood details and supported statistics.

GET /api/v1/places

Returns permitted geographic points of interest for the requested area and categories.

GET /api/v1/search/suggestions

Returns supported location and neighborhood suggestions.

POST /api/v1/inquiries

Creates a validated inquiry associated with a property and listing.

### Administrative endpoints

POST /api/v1/admin/listings

Creates a draft listing.

PATCH /api/v1/admin/listings/{id}

Updates an existing listing.

POST /api/v1/admin/listings/{id}/publish

Publishes after server-side validation.

POST /api/v1/admin/listings/{id}/unpublish

Removes the listing from public discovery.

POST /api/v1/admin/listings/{id}/archive

Archives a listing.

GET /api/v1/admin/review-queue

Returns listings requiring review.

Implement additional endpoints for media management and audit history as necessary.

Document all implemented endpoints through OpenAPI.

### API behavior

- Validate requests on the server.
- Use consistent error response structures.
- Return meaningful HTTP status codes.
- Support bounded pagination.
- Validate geographic bounds.
- Reject invalid price ranges.
- Apply all supported filters consistently.
- Avoid returning unpublished or private data.
- Apply request limits and rate limiting where appropriate.
- Use transactions for multi-step database changes.
- Do not expose stack traces or secrets in API responses.

### Currency handling

Preserve the original asking price and ISO currency code.

Do not silently convert prices.

If conversion is implemented, keep the original value unchanged and record the conversion source and timestamp.

## 16. ADMIN AUTHENTICATION AND SECURITY

The admin interface must have real server-side access control.

For a local MVP, implement a practical development authentication setup and document how to configure the initial administrator securely.

Do not ship hardcoded production credentials.

Do not create an undocumented default admin password.

Never accept client-side claims of administrator privileges without validating them on the server.

Protect administrative endpoints, validate input, handle authentication errors safely, and restrict sensitive information.

Implement appropriate protections against:

- Unauthorized access.
- Cross-site scripting.
- Injection attacks.
- Cross-site request forgery where applicable.
- Malicious file uploads.
- Inquiry spam.
- Excessive request rates.
- Exposure of secrets or personal data.

Use HTTPS in deployment and secure cookie settings where cookie-based authentication is used.

Do not add a complex public account system to v1 unless the existing project already has one and it can be reused safely.

## 17. IMAGE HANDLING

Property photographs are essential to the experience.

Implement:

- A primary image.
- Multiple images per listing.
- Predictable gallery ordering.
- Alt text.
- Responsive image delivery.
- Loading placeholders.
- Missing-image fallbacks.
- Correct handling of broken image URLs.
- Media permission metadata.

For development, support local sample assets or clearly identified licensed demonstration images.

For production, support an appropriate object-storage provider.

Do not rely on arbitrary external image URLs that may disappear or prohibit hotlinking.

Do not generate fake property photographs and present them as genuine photographs of a listed property.

## 18. TESTING REQUIREMENTS

Write tests as part of the implementation.

### Backend unit tests

Cover:

- Property validation.
- Listing publication rules.
- Price and currency handling.
- Filter validation.
- Inquiry validation.
- Administrative authorization.
- Listing lifecycle transitions.

### Backend integration tests

Cover:

- Database migrations.
- Geographic search.
- Bounding-box queries.
- Combined filters.
- Publication-status filtering.
- Neighborhood retrieval.
- Inquiry creation.
- Unpublished listing protection.
- Administrative endpoint authorization.

Use a realistic PostgreSQL/PostGIS test environment when testing spatial functionality. Do not assume an in-memory database behaves identically to PostGIS.

### Frontend tests

Cover:

- Map selection state.
- Marker and card synchronization.
- Filter application and reset.
- URL query-state restoration.
- Saved properties.
- Empty results.
- API error handling.
- Property detail loading.
- Mobile map/list switching.

### End-to-end tests

Implement the following user journeys where the environment supports them:

1. Open the explore page.
2. Load the map and property results.
3. Apply a price filter.
4. Select a marker.
5. Open the matching property detail.
6. Return to the map without losing search state.
7. Save a property.
8. Refresh and confirm the property remains saved.
9. Open a neighborhood and explore its properties.
10. Submit a valid inquiry.
11. Confirm an unauthorized visitor cannot publish a listing.
12. Confirm an authorized administrator can create and publish a valid listing.

If browser automation is available, use Playwright or an equivalent tool.

Do not claim end-to-end tests passed if they were not executed.

## 19. PERFORMANCE AND ACCESSIBILITY

Build for practical usability rather than theoretical optimization.

- Use spatial indexes.
- Limit map queries to the current viewport.
- Use clustering.
- Avoid loading all listings into the browser.
- Paginate or incrementally load results.
- Optimize image sizes.
- Prevent repeated API calls during map movement.
- Cancel obsolete requests where appropriate.
- Avoid unnecessary rerenders of the map.
- Lazy-load nonessential components where useful.
- Keep loading indicators responsive.
- Provide keyboard-accessible property results.
- Ensure that map information is also available in the list.
- Provide visible focus states.
- Support accessible names and labels.
- Avoid relying solely on color to communicate selected or saved states.

Aim for WCAG 2.2 AA and reasonable mobile performance.

Do not compromise correctness to meet arbitrary benchmark numbers.

## 20. LOCAL DEVELOPMENT EXPERIENCE

A developer must be able to clone or open the repository, configure environment variables, start the application, seed development data, and begin working without undocumented manual steps.

Provide:

- Docker Compose.
- Database initialization.
- PostGIS-enabled PostgreSQL.
- Flyway migrations.
- Development seed data.
- A documented administrator bootstrap procedure.
- Frontend and backend run commands.
- Health-check endpoints.
- API documentation.
- .env.example.
- A README with setup and troubleshooting.
- Tests and build commands.
- A documented method for resetting local development data.

Do not commit real secrets.

Do not assume external API keys are already available.

If map tiles require external configuration, explain exactly how to configure them and provide a suitable documented development fallback.

## 21. DEVELOPMENT PHASES

Work in the following order.

### Phase 1 — Repository inspection and planning

Inspect the current project structure, package files, dependencies, configuration, and existing implementation.

Identify what already works and what is missing.

Write a concise implementation plan and record important architectural decisions.

Do not spend excessive time planning. Move into implementation after the inspection.

### Phase 2 — Database and backend foundation

Implement:

- Database migrations.
- Core entities and relationships.
- Geographic indexes.
- Data validation.
- Public property search.
- Property detail retrieval.
- Neighborhood endpoints.
- Administrative listing lifecycle.
- API documentation.
- Backend tests.

Verify geographic search against a real PostGIS database.

### Phase 3 — Map-first frontend

Implement:

- Main exploration screen.
- Map integration.
- Price markers.
- Clustering.
- Property result cards.
- Synchronized marker and card selection.
- Search and filters.
- URL state.
- Responsive map/list behavior.
- Loading and error states.

This phase must produce a genuinely usable discovery experience, not a static design.

### Phase 4 — Details and neighborhoods

Implement:

- Property detail pages.
- Photo gallery.
- Neighborhood directory.
- Neighborhood detail pages.
- Nearby points of interest where data is available.
- Navigation between neighborhoods, map results, and properties.

### Phase 5 — Saving and contact

Implement:

- Browser-local saved properties.
- Property comparison.
- Inquiry forms.
- Backend validation.
- Inquiry persistence.
- Safe notification handling.

### Phase 6 — Administration

Implement:

- Secure admin authentication.
- Listing creation and editing.
- Media registration.
- Publication and archival.
- Review queue.
- Listing freshness management.
- Audit logging.

### Phase 7 — Verification and refinement

Run:

- Frontend production build.
- Backend tests.
- Database migration checks.
- Integration tests.
- End-to-end tests where available.
- Static checks.
- Responsive layout checks.
- Security checks.
- Performance checks.

Fix failures before declaring the MVP complete.

Do not generate a fresh visual redesign at the end. Refine the existing implementation to improve consistency, usability, and reliability.

## 22. MVP ACCEPTANCE CRITERIA

The MVP is not complete merely because the application starts.

It is complete only when the following are implemented and verified:

1. A user can open the explore page.
2. The map renders using the configured provider.
3. Published properties appear as price markers.
4. Markers cluster at lower zoom levels.
5. Marker and property-card selection remain synchronized.
6. Search uses real backend queries.
7. Geographic bounds and filters work together.
8. Property details load from the backend.
9. Shared property URLs work directly.
10. Neighborhood pages load real stored records.
11. Saved properties persist locally.
12. Property comparison works for supported fields.
13. Contact forms create persisted inquiries.
14. Administrators can manage listings through protected endpoints.
15. Unpublished listings are excluded from public discovery.
16. Listing sources and media permissions are recorded.
17. The interface works on desktop, tablet, and mobile.
18. Loading, empty, unavailable, and error states are implemented.
19. Database migrations and development setup are reproducible.
20. Automated tests cover the important business rules and user journeys.
21. The README accurately explains how to run and test the product.
22. No core feature relies on hardcoded frontend mock results.
23. No fictional demonstration property is presented as a real listing.
24. No credentials or secrets are committed to the repository.

Any acceptance criterion that has not been verified must be explicitly identified as unverified.

## 23. FUTURE EXTENSIONS — DO NOT LET THESE BLOCK THE MVP

Design the architecture so these can be added later, but do not implement them at the expense of core discovery:

- Advanced rental-yield calculations.
- Verified rental-market data.
- Price history.
- Comparable-property analytics.
- Saved searches and alerts.
- User accounts and cross-device synchronization.
- Multiple languages.
- Additional Azerbaijani cities.
- Agency subscriptions.
- Paid listings.
- Developer project pages.
- Investment reports.
- Personalized recommendations.

Do not build speculative infrastructure for features that are not required by the initial product.

## 24. FINAL EXECUTION INSTRUCTIONS

Start by inspecting the repository and reporting, briefly:

- The existing architecture.
- The main implementation gaps.
- Any blocking external dependencies.
- The sequence you will follow.

Then implement the product in the phases described above.

Work directly in the files. Use appropriate terminal commands and tools. Install dependencies where necessary and compatible.

After each major phase, run the relevant tests and builds, fix errors, and continue.

Do not stop after writing the plan, creating the database entities, or producing the frontend shell.

If the available execution environment prevents a step, complete the parts that can be completed and document the precise blocker.

Do not ask me to approve every ordinary engineering decision.

Do not fabricate test results, external data, API credentials, or completed functionality.

When finished, provide a concise implementation report containing:

1. Features implemented.
2. Repository structure and major architectural decisions.
3. Database migrations and initial data setup.
4. Required environment variables.
5. Exact commands to run the application locally.
6. Exact commands to run tests.
7. Tests actually executed and their results.
8. Any features or checks still incomplete.
9. External services or credentials required.
10. Recommended next development tasks.

The final goal is a functional, maintainable MVP that can be run locally, demonstrated to users, and extended into a real Azerbaijan property discovery business.

BUILD THE APPLICATION NOW. Do not return only a plan or code snippets. Work in the repository, verify the implementation, and report honestly on what is complete.
