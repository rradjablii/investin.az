# INVESTIN.AZ — FRONTEND REDESIGN MASTER PROMPT
## Apple-Inspired Design System · Map-First Real Estate Discovery · Baku, Azerbaijan

You are a senior product designer, frontend architect, and design engineer with experience building refined, high-quality consumer interfaces inspired by Apple's design principles.

Your task is to redesign the existing Investin.az frontend into a polished, premium, map-first real estate discovery experience.

This is an implementation task, not a brainstorming exercise. Inspect the existing repository, understand the current frontend and backend integration, establish a consistent design system, implement the redesign, and verify that it works.

Do not return only a plan, design proposal, or code snippets. Modify the actual application.

---

# 1. PRODUCT VISION

Investin.az is a map-first real estate discovery platform focused initially on Baku, Azerbaijan, with international buyers and investors as an important audience.

The defining feature is the interactive map.

Users should be able to understand the geography of the market, discover available properties, compare locations, explore neighborhoods, and open property details without fighting the interface.

The experience should feel calm, precise, intuitive, and premium.

The visual direction is inspired by Apple's design philosophy:
- Simplicity over decoration.
- Clear hierarchy over excessive information.
- Excellent spacing and typography.
- Subtle surfaces and restrained colors.
- Smooth, purposeful interactions.
- Strong consistency between components.
- Content that feels carefully designed rather than generated from a generic template.

Do not copy Apple's website or macOS interface literally. Apply the principles to a real-estate discovery product.

The result must look like a credible, professionally designed product that could be used for extended browsing sessions.

## The fundamental principle

THE MAP IS THE MAIN PRODUCT SURFACE.

The map must receive the greatest visual attention and usable screen area on the primary discovery page. Property cards, filters, navigation, and neighborhood information support the map rather than competing with it.

Do not turn the website into a conventional real-estate listing grid with a small map attached.

---

# 2. FIRST STEP: AUDIT THE EXISTING PROJECT

Before changing code, inspect:
- The frontend framework and routing structure.
- Existing page layouts and reusable components.
- The current CSS, Tailwind configuration, design tokens, and fonts.
- The MapLibre implementation and its existing map interactions.
- The property search and marker APIs.
- URL-based search state and filter synchronization.
- The property detail and neighborhood pages.
- Saved properties and comparison functionality.
- Loading, empty, error, and mobile states.
- Existing frontend tests and Playwright selectors.

Read the relevant documentation, especially `README.md` and `ARCHITECTURE.md`.

Preserve the existing Spring Boot backend, REST API contracts, PostgreSQL/PostGIS architecture, authentication, and data model.

Do not rewrite working backend functionality just to accommodate the redesign.

Do not remove existing product capabilities. Improve their presentation and usability.

Identify the smallest reasonable set of frontend changes needed to achieve the new visual direction.

---

# 3. VISUAL DESIGN SYSTEM

## 3.1 Color philosophy

Use a pale, low-saturation, light color palette that is comfortable for extended viewing.

The interface must not rely on bright colors, aggressive contrast blocks, saturated gradients, or decorative colors to appear premium.

Use neutral colors as the foundation. One restrained accent color should provide visual identity and communicate important actions.

Start with these design tokens, adjusting them only when necessary for contrast, map legibility, or consistency.

### Base palette

- Main page background: `#F7F8FA`
- Primary surface: `#FFFFFF`
- Secondary surface: `#F1F3F5`
- Subtle hover surface: `#ECEFF2`
- Primary text: `#20242A`
- Secondary text: `#69717D`
- Muted text: `#858D98`
- Borders: `#E5E8EC`
- Stronger separators: `#D9DEE5`
- Primary accent: `#526C63`
- Accent hover: `#43594F`
- Accent-tinted surface: `#EDF2EF`
- Focus indicator: a clearly visible, accessible accent outline.

Use the muted green accent sparingly for selected states, primary actions, and important indicators. It must not become a large colored background across the interface.

Use neutral gray for most icons, secondary controls, dividers, and metadata.

For semantic states, use restrained colors with readable text:
- Success: muted green.
- Warning: muted amber.
- Error: muted red.
- Informational: subdued blue-gray.

Avoid using color alone to communicate a status.

### Important restrictions

Do not introduce:
- Neon colors.
- Bright purple or pink accents.
- Large blue gradients.
- Glassmorphism everywhere.
- Strong shadows around every card.
- Pure black sections used merely for dramatic contrast.
- Multiple competing accent colors.
- Decorative gradient backgrounds.
- Excessively tinted panels.
- Large blurred color blobs.
- Random colorful icons.

The overall interface should remain predominantly white, pale gray, and soft neutral tones.

## 3.2 Comfort during long browsing sessions

A light palette is not automatically comfortable. Pay attention to actual contrast, visual density, and spacing.

Requirements:
- Avoid excessively bright, decorative white panels surrounded by strong shadows.
- Use subtle boundaries instead of relying on shadows to separate every surface.
- Maintain readable text contrast according to WCAG 2.2 AA where applicable.
- Use approximately 15–17px body text for normal desktop reading.
- Keep secondary metadata readable rather than reducing it to tiny gray text.
- Use comfortable line heights, generally around 1.45–1.65 for body text.
- Avoid very thin font weights for essential information.
- Keep interactive targets large enough for comfortable mouse and touch use.
- Do not rely on low-contrast gray text to create a minimalist appearance.
- Avoid flashing animations, constant motion, and unnecessary transitions.
- Respect `prefers-reduced-motion`.
- Use consistent spacing and a restrained number of visual layers.

The map itself must remain legible and must not compete with overly saturated property markers.

## 3.3 Typography

Use a modern, restrained sans-serif system.

Prefer:
- The existing font if it is already suitable.
- Apple's system-style typography through an appropriate system font stack.
- Inter or another high-quality sans-serif if the project already uses it or adding it is justified.

Do not load unnecessary font libraries.

Suggested hierarchy:
- Page title: 28–34px, semibold.
- Section title: 20–24px, semibold.
- Property title: 17–20px, medium or semibold.
- Body text: 15–17px.
- Labels and metadata: 13–14px, with sufficient contrast.
- Small auxiliary text: never smaller than needed for comfortable reading.

Avoid oversized marketing headlines inside the actual search application.

Use tabular numerals for prices, areas, and other values where supported.

Prices and important property attributes should be easy to scan quickly.

## 3.4 Shape, borders, and elevation

Use consistent radii:
- Small controls: 8–10px.
- Inputs and buttons: 10–12px.
- Cards and panels: 12–16px.
- Large floating map panels: 14–18px.

Use thin neutral borders and minimal shadows.

A shadow should indicate layering, such as a floating search panel over the map. It should not be used as a universal decorative effect.

Avoid excessively rounded pill shapes on every element. Reserve pill styling for compact filters, price markers, or selected states where it improves usability.

## 3.5 Icons

Use one consistent outline icon family, preferably the one already installed in the project.

If the project does not have an icon library, Lucide is a reasonable option.

Use icons consistently for search, location, filters, favorites, bedrooms, bathrooms, area, and navigation.

Avoid emoji as interface icons.

Icons must have consistent stroke weights and alignment. Decorative icons should not be added merely to fill empty space.

---

# 4. THE EXPLORE PAGE — THE CORE EXPERIENCE

The primary route is `/explore`.

This is the most important page in the entire product. Spend the majority of frontend design effort here.

The page should feel like a carefully designed spatial application rather than a traditional real-estate portal.

## 4.1 Desktop layout

At a typical desktop viewport of 1440 × 900, the map should occupy approximately 60–70% of the usable content width, with a synchronized property results panel occupying the remainder.

Use a structure similar to:

┌─────────────────────────────────────────────────────────────┐
│ Logo       Explore  Neighborhoods      Saved      About     │
├─────────────────────────────────────────────────────────────┤
│ Search location       Filters              Sort   Map/List  │
├──────────────────────────────┬──────────────────────────────┤
│                              │ Results count                │
│                              │                              │
│                              │ Property card                │
│                              │                              │
│          INTERACTIVE         │ Property card                │
│             MAP              │                              │
│                              │ Property card                │
│                              │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘

This diagram represents the hierarchy, not a rigid implementation.

The map and results area should use the available viewport height efficiently.

Avoid a giant promotional hero section that pushes the map below the fold.

The primary discovery experience should be visible immediately when the page opens.

## 4.2 Top navigation

Build a restrained, compact navigation bar.

Include:
- Investin.az wordmark.
- Explore.
- Neighborhoods.
- Saved properties.
- About.
- An appropriate contact or inquiry entry point if it fits the existing product.

The wordmark should be typographic and unobtrusive unless a suitable existing logo is already present.

Navigation should be clear, not decorative.

Use a pale background, a subtle bottom border, and comfortable horizontal spacing.

Keep the navigation compact enough to preserve vertical space for the map.

Do not add unnecessary login, registration, pricing, or account controls unless they already serve a real function.

## 4.3 Search and filters

Place the main location search and essential filters directly above the map/results workspace.

Include the existing supported filters:
- Location or neighborhood.
- Property type.
- Minimum and maximum price.
- Currency.
- Bedrooms.
- Property area.
- Construction or listing status, where supported.
- Additional filters only when the existing API supports them.

Keep the default toolbar simple.

Do not show every possible filter as a permanent control if it makes the interface crowded. Use a compact filter popover or side panel for secondary filters.

Display active filters as removable chips.

Provide a clear way to reset filters.

Show the number of active filters when useful.

All filters must continue to work with the existing API. Do not create purely visual controls that do nothing.

Preserve filter state in the URL and maintain browser back/forward behavior.

Search suggestions should be readable, keyboard-accessible, and visually restrained.

## 4.4 Map design and behavior

Use the existing MapLibre implementation. Do not replace it with a static image, decorative mock map, or non-interactive map.

The map must remain the visual centerpiece.

### Map appearance

Use a light, low-saturation map style.

The geographic background should use:
- Pale warm or cool gray land.
- Subtle white or light-gray roads.
- Muted labels.
- Restrained park colors.
- Soft blue-gray water.
- Clear but unobtrusive neighborhood and place labels.

Avoid highly saturated default map themes, dark maps, high-contrast road colors, or dense visual clutter.

Choose a production-appropriate map style that works with the existing configuration. Keep the style URL configurable through environment variables.

Do not assume a particular provider will be available in production. Preserve attribution and document provider configuration requirements.

The map should make streets, coastline, districts, and the relationship between properties easy to understand.

### Price markers

Property markers are one of the most important UI components.

Design small, elegant price labels that sit naturally on the map.

Default state:
- White or very pale background.
- Dark neutral text.
- Thin border.
- Subtle shadow only if needed.
- Compact padding.
- Rounded corners.
- Readable price formatting.
- Consistent dimensions where possible.

Selected state:
- Muted green background or restrained accent treatment.
- Stronger visual emphasis.
- Clear selected-property association.

Hover state:
- Subtle background or border change.
- No dramatic scaling or bouncing.

Clustered markers:
- Display the number of properties.
- Use neutral surfaces and clear text.
- Avoid large colorful cluster circles.
- Preserve a clear visual difference between individual listings and clusters.

Where several properties share the same coordinates, preserve the existing stacked-marker fan-out behavior. Ensure that users can reach each property without markers becoming permanently scattered across the map.

Do not display fabricated prices for properties without valid prices.

For different currencies, format the values correctly and do not imply that mixed-currency prices are directly comparable.

### Map interactions

Implement and preserve:
- Marker selection.
- Marker-to-card synchronization.
- Card-to-marker synchronization.
- Hover feedback where practical.
- Marker clustering.
- Stacked-marker handling.
- Zoom and pan controls.
- A clear way to return to the relevant results area or reset the map view.
- Map viewport-based search.
- URL state synchronization.
- Loading and error states.
- A useful fallback if the map cannot load.

When a user selects a marker:
1. Highlight that marker.
2. Identify the matching property card.
3. Scroll the results panel to the corresponding card when appropriate.
4. Keep the interaction predictable and avoid unnecessary map movement.

When a user selects a property card:
1. Highlight its map marker.
2. Pan or zoom only as needed.
3. Preserve the current search context.
4. Avoid repeatedly resetting the map viewport.

Do not trigger a new network request for every tiny pointer movement. Debounce viewport-based searches and cancel obsolete requests where appropriate.

Keep map interactions smooth on typical laptops and mobile devices.

Do not sacrifice map usability to add decorative controls.

### Map overlays

Use floating controls only when they serve a clear purpose.

Possible controls:
- Zoom in and out.
- Locate or return to Baku when supported.
- Re-search this area.
- Toggle map/list view on mobile.

Keep overlays compact and visually separated from the map using subtle borders or shadows.

Never cover important property markers with oversized controls.

---

# 5. PROPERTY RESULTS PANEL

The results panel must complement the map.

It should be a scrollable panel with its own result count and clear property cards.

Avoid making the panel feel like an independent marketplace that happens to sit beside a map.

## 5.1 Property card design

Each card should communicate the most important information immediately:
- Property image.
- Price and currency.
- Property type or short title.
- Location or neighborhood.
- Bedrooms, bathrooms, and area when available.
- Relevant status information.
- Favorite action.

Use a restrained card layout with clean alignment and consistent image treatment.

Use a landscape image with a consistent aspect ratio, approximately 4:3 or 3:2, depending on the existing content.

Images should have sensible object positioning and avoid arbitrary heights that make cards jump during loading.

Avoid excessive metadata, multiple badges, and decorative labels.

Price should be prominent but not oversized.

Use a subtle border or background change for selected cards.

Hover effects should be restrained and should not cause layout shifts.

Do not place large shadows around every card.

## 5.2 Property images

Use the existing media pipeline and image URLs.

Preserve image attribution and usage restrictions where applicable.

Do not invent real-looking listing photography and present it as genuine property inventory.

If an image is missing, show a consistent, neutral placeholder with a clear visual treatment.

Prevent layout shifts while images load.

Use appropriate image sizing and loading behavior. Lazy-load images that are not initially visible.

## 5.3 Result controls

Display:
- Total result count when available.
- Sort options supported by the API.
- Active filter summary.
- A clear empty state.
- A loading skeleton that resembles the final card layout.
- A useful error state with a retry action.

Avoid infinite loading indicators without explanations.

If a search returns no results, offer useful actions such as removing a filter or expanding the price range.

Do not imply that no properties exist in an area if the result is actually caused by an API error.

---

# 6. PROPERTY DETAIL PAGE

Redesign `/properties/[slug]` using the same visual system.

This page should feel calm, information-rich, and easy to navigate.

Recommended structure:

1. Breadcrumbs or a compact return-to-map action.
2. Property title and location.
3. Price and important status information.
4. A large image gallery.
5. Essential property attributes.
6. Description.
7. Map showing the property's location.
8. Neighborhood and nearby-place context where data exists.
9. Listing source and last-checked information.
10. Contact or inquiry action.
11. Related properties when supported by real data.

The gallery should receive significant attention without overwhelming the information users need to evaluate the property.

Avoid unnecessary carousels if a straightforward image grid or gallery provides a better experience.

Keep the inquiry action easy to find. On mobile, consider a compact sticky action area, but do not cover page content or interfere with browser navigation.

Clearly distinguish unavailable data from verified facts.

Never invent an address, ownership status, floor plan, price, neighborhood statistic, or feature.

Ensure the page remains usable when some attributes or images are missing.

---

# 7. NEIGHBORHOOD EXPERIENCE

Redesign `/neighborhoods` and `/neighborhoods/[slug]`.

Use the same calm, neutral aesthetic.

Neighborhood discovery should connect naturally with the map and property inventory.

The directory should provide:
- Clear neighborhood names.
- Brief descriptions when sourced or explicitly labeled as editorial.
- Property counts only when calculated from actual available listings.
- Links to explore the neighborhood on the map.

Neighborhood detail pages should provide:
- A useful geographic overview.
- A map focused on the neighborhood.
- A boundary overlay only when valid boundary data exists.
- Relevant nearby places.
- Available property listings.
- Sourced context about the area.

Do not invent demographic, safety, transport, school, rental, or investment statistics.

If the current database has only neighborhood center points, do not draw fake boundaries.

Use an elegant empty state for neighborhoods with insufficient data.

The neighborhood page must help users return to property discovery rather than becoming an unrelated editorial landing page.

---

# 8. SAVED PROPERTIES AND COMPARISON

Redesign `/saved` to match the overall system.

Keep existing local-storage behavior if that is how the application currently works.

Ensure that:
- Saving and removing properties work.
- Saved state is reflected in both cards and details.
- Empty saved state explains how to save a property.
- Comparison supports the existing limit.
- Removing a property updates the comparison interface immediately.

The comparison experience should emphasize useful differences:
- Price and currency.
- Area.
- Price per square metre when meaningful.
- Bedrooms and bathrooms.
- Property type.
- Location.
- Construction status.
- Availability of relevant attributes.

Do not compare incomparable currencies without an explicitly implemented and clearly labeled conversion policy.

Do not fabricate missing attributes.

Use compact tables or aligned comparison columns rather than oversized decorative cards.

---

# 9. RESPONSIVE DESIGN

Design desktop first for the map-heavy workspace, but implement responsive behavior properly rather than shrinking the desktop layout.

## Desktop

Use a split map/results layout.

Keep the map visible and interactive while users browse results.

Avoid wasting vertical space on oversized navigation and headers.

## Tablet

Adjust the width of the results panel and map to preserve usability.

If necessary, provide a clear panel toggle rather than forcing two cramped columns.

Ensure filters do not overflow horizontally.

## Mobile

Map and list navigation must remain excellent on narrow screens.

Provide a clear map/list toggle.

Map mode:
- Map occupies most of the available screen.
- Search remains accessible.
- Essential controls remain within comfortable reach.
- Selected properties can open a compact bottom preview.
- Bottom previews must not obscure essential map controls.

List mode:
- Property cards use the full available width.
- Search and filters remain accessible.
- Scrolling is natural.
- No accidental horizontal overflow.

Use a bottom sheet or similarly restrained overlay for selected property previews if appropriate.

The mobile map must remain a real MapLibre map, not a screenshot.

Test at a minimum of:
- 390px mobile width.
- 768px tablet width.
- 1024px laptop width.
- 1440px desktop width.

Also check unusually narrow screens and browser zoom.

---

# 10. INTERACTION QUALITY

Every interactive element must work.

Do not create buttons, dropdowns, search fields, or icons that are decorative but nonfunctional.

Provide:
- Clear focus states.
- Keyboard navigation.
- Accessible labels.
- Predictable hover and selected states.
- Useful validation messages.
- Clear disabled states.
- Loading feedback for asynchronous actions.
- Appropriate success and error feedback.

Use subtle transitions, typically around 150–220ms for simple visual changes.

Do not animate everything.

Avoid unnecessary motion on map markers, cards, panels, and page transitions.

Respect reduced-motion preferences.

Do not introduce custom animation libraries unless the existing application genuinely needs them.

Preserve correct browser navigation and direct URL access to every existing route.

---

# 11. ACCESSIBILITY

Treat accessibility as a design requirement, not a final cosmetic task.

Check:
- Text and control contrast.
- Keyboard navigation.
- Visible focus indicators.
- Accessible form labels.
- Semantic headings.
- Screen-reader names for icon-only buttons.
- Dialog and popover focus behavior.
- Reduced-motion support.
- Image alternatives.
- Error-message associations.
- Touch-target sizing.

For the map, provide a usable results-list alternative so that users are not required to operate a map to discover properties.

Do not claim that the map itself is fully screen-reader accessible unless that has been tested. Make the surrounding search and results workflow accessible.

Run the existing accessibility tests and investigate any regressions.

---

# 12. TECHNICAL CONSTRAINTS

Preserve the existing project stack and implementation where practical.

Use the existing frontend framework, TypeScript conventions, CSS tooling, routing, API client, and MapLibre integration.

Do not introduce a second component library without a strong reason.

Do not rewrite the backend.

Do not break REST API contracts.

Do not hardcode property results in the frontend.

Do not add fake statistics or fictional listings to make the redesign look populated.

Do not introduce unnecessary dependencies.

Avoid creating a single enormous component. Use reusable components and clear boundaries.

Potential component responsibilities include:
- App navigation.
- Search toolbar.
- Filter controls.
- Explore layout.
- Map container.
- Price marker.
- Cluster marker.
- Results panel.
- Property card.
- Property preview.
- Property gallery.
- Neighborhood map.
- Saved properties.
- Comparison view.
- Loading and error states.

Adapt this structure to the existing codebase rather than duplicating components that already exist.

Keep the map's source data, selection state, viewport, and filter state synchronized through clear state ownership. Avoid unnecessary global state.

Use existing API functions rather than scattering raw fetch calls throughout components.

Prevent stale search responses from overwriting newer results.

Ensure map and results state remains consistent after filtering, selection, browser navigation, and viewport changes.

Maintain server/client rendering compatibility. Do not access browser-only APIs during server rendering.

Use the existing test framework.

---

# 13. PERFORMANCE

The interface should remain responsive during prolonged map exploration.

Requirements:
- Avoid unnecessary React re-renders of the entire map.
- Keep MapLibre initialization stable.
- Avoid rebuilding the map style or all marker elements on every state update.
- Debounce viewport-driven searches.
- Cancel obsolete requests.
- Cluster markers efficiently.
- Lazy-load noncritical images.
- Reserve image dimensions to prevent layout shifts.
- Avoid unnecessary client-side dependencies.
- Check bundle size before and after introducing libraries.
- Avoid expensive effects triggered by unrelated state changes.
- Provide reasonable loading states for slow networks.

Do not trade reliable marker selection or correct map behavior for superficial animation performance.

---

# 14. PAGE-BY-PAGE VISUAL CONSISTENCY

Apply the design system consistently to:
- `/`
- `/explore`
- `/properties/[slug]`
- `/neighborhoods`
- `/neighborhoods/[slug]`
- `/saved`
- `/about`
- All existing admin routes.

The admin interface should use the same typography, colors, spacing, and form principles, while remaining optimized for operational work.

Do not spend equal effort on every page. The exploration experience is the priority.

Preserve the functionality of admin workflows, media upload, inquiry management, listing verification, and user management.

Do not weaken access control or expose administrative information to public routes.

---

# 15. TESTING AND VERIFICATION

After implementing the redesign:

1. Run the frontend typecheck.
2. Run lint.
3. Run the frontend unit tests.
4. Run the production build.
5. Run existing Playwright tests.
6. Run accessibility checks.
7. Check desktop, tablet, and mobile layouts.
8. Verify the map loads and uses the configured style.
9. Verify marker clustering and stacked markers.
10. Verify selecting a marker highlights the correct result.
11. Verify selecting a result highlights the correct marker.
12. Verify filters and URL state remain synchronized.
13. Verify browser back and forward behavior.
14. Verify saved properties and comparison.
15. Verify property details and neighborhood navigation.
16. Check empty, loading, error, and missing-image states.
17. Inspect the browser console for errors and warnings.

Update tests and selectors only when justified by actual design changes. Do not delete meaningful tests to make the suite pass.

If a map provider or external service is unavailable, distinguish that environment limitation from an implementation failure.

Do not claim a test passed unless you actually ran it.

---

# 16. IMPLEMENTATION WORKFLOW

Work in the following sequence.

### Step 1 — Inspect

Understand the existing frontend and map implementation. Identify reusable code, regressions to avoid, and the current design structure.

### Step 2 — Define tokens

Implement a small, consistent design system for colors, typography, spacing, radii, borders, shadows, focus states, and transitions.

Avoid scattering arbitrary colors and dimensions throughout the codebase.

### Step 3 — Redesign the explore workspace

Start with the map, toolbar, property markers, results panel, and synchronized selection behavior.

This is the main deliverable.

### Step 4 — Redesign supporting pages

Apply the same visual system to property details, neighborhoods, saved properties, comparisons, about, and the existing admin interface.

### Step 5 — Responsive refinement

Verify desktop, tablet, and mobile layouts. Refine the mobile map/list experience and selected-property preview.

### Step 6 — Test and refine

Run the existing checks. Fix visual and functional regressions. Inspect real rendered pages rather than relying exclusively on code review.

If browser screenshots or browser automation are available, use them to inspect the actual application at the target viewport sizes.

If screenshots are not available, use the existing Playwright tests and available local verification tools. Do not claim visual inspection was performed if it was not.

### Step 7 — Report

Summarize:
- Pages and components redesigned.
- Design tokens introduced.
- Map-specific changes.
- Responsive improvements.
- Existing functionality preserved.
- Tests actually executed and their results.
- Any remaining visual or functional issues.

---

# 17. FINAL ACCEPTANCE CRITERIA

The redesign is complete only when:

- The application looks cohesive, restrained, and premium.
- The palette is pale and low-saturation without sacrificing readability.
- The interface has no unnecessary bright colors, gradients, or decorative clutter.
- The map is the main visual and functional focus of `/explore`.
- Price markers are elegant, readable, and easy to select.
- Marker selection and property-card selection stay synchronized.
- Search, filters, and URL state work.
- Desktop users can browse the map and results simultaneously.
- Mobile users can switch naturally between map and list.
- Property details and neighborhood pages use the same design system.
- All existing product capabilities remain functional.
- The application does not rely on fabricated property data.
- Keyboard, focus, and accessibility behavior remain usable.
- Performance remains reasonable during map interactions.
- Existing tests pass, or any remaining failures are clearly documented.
- The production build succeeds.

The target is not a flashy redesign.

The target is a restrained, carefully engineered interface where the geography is clear, the property information is easy to scan, and nothing distracts users from discovering the right location.

**Begin by inspecting the existing repository. Then implement the redesign directly, starting with `/explore` and the map experience. Do not stop after writing a plan.**