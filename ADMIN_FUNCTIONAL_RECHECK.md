# Admin functional recheck

Date: 29 October 2026. Target: https://tvoflavours.com.

## Coverage
All 17 admin sections opened in the authenticated live UI: dashboard, analytics, products, categories, hampers, festivals, marketing/CRM, media, orders, payments, delivery, ingredients/recipes, reviews, WooCommerce CSV, staff, audit and system health. Live API reads cover 39 endpoints; mutations use a private socket-only MySQL rehearsal database, never customer orders.

## Fixes
- Product partial edits preserve existing media, stock and publication. Removing draft media does not delete a saved file before Save; referenced files cannot be physically deleted.
- CSV imports use each row's real category, price and images, detect duplicates across the full catalog, preserve existing variants and return a working summary. They no longer invent weight variants. CSV exports escape spreadsheet formulas and export the complete requested dataset.
- Admin catalog pagination now loads beyond 200 items. WooCommerce export retrieves the complete catalog.
- Reports attribute sales to actual purchased line items, validate dates and use India calendar dates. Dashboard no longer calls an unsupported SQLite aggregate on MySQL. Report/export/media permissions are checked.
- Customer CRM nested updates reach the correct route. Failed admin operations return an error HTTP status.
- Recipe replacement is atomic, validates ingredient references and quantities before replacing saved lines. Ingredient cost/stock values reject negative and non-finite inputs.
- Delivery slots preserve zero settings, validate times and correctly read day arrays. Driver assignment preserves order production status.
- All order cancellation/status routes share one transaction: duplicate cancellation cannot restock twice; cancelled/delivered orders are final; slot bookings decrement once. Cancellation does not falsely claim a gateway refund.
- Festival archive/restore preserves product mappings. Coupon amounts, limits and date ranges are validated.
- New product images/videos use durable domain storage outside Hostinger replaceable builds, with compatible URLs and byte-range video delivery.

## Validation
- TypeScript compilation: passed.
- Full project test suite: 617 passed; 21 conditional tests skipped without the private MySQL configuration.
- Dedicated private MySQL run: 25 passed, including admin mutations, reporting at India midnight, permissions, cancellation idempotency and database reconnection coverage.
- Production build and live post-deployment checks: recorded below after completion.

## Limits
No real payment charge/refund, campaign broadcast or customer notification was sent during this audit. Those provider operations require a configured provider/test transaction; their absence is not reported as a successful real transaction. Existing live records were not changed for mutation tests.
