# Detailed admin panel audit — 28 October 2026

## Confirmed live findings and fixes

1. The dashboard and Customer Orders requested the customer-only order feed. Authorized order staff now receive the shared order queue. The live delivery module showed two existing orders while the dashboard showed zero, confirming the mismatch.
2. Kitchen and support roles were checked against obsolete role names in the order API. Current role permissions now determine reads and status changes.
3. Anonymous requests without a session no longer list orders with an empty session identifier.
4. Dashboard quick status updates swallowed errors and could record successful advancement after failed writes. They now use the checked update helper, show failures, prevent repeated clicks while saving, and refresh the order queue after success.
5. Dashboard counts and WooCommerce exports now receive the admin catalog, including drafts, rather than only published storefront products.
6. Dashboard labels distinguish non-cancelled order value from settled revenue and catalog image references from verified uploaded media assets.
7. Category Tree & SEO was a static reference screen containing sample product counts. The default view now loads database categories and supports adding/editing categories, parents, order, images, descriptions and SEO fields. The old reference architecture remains explicitly labeled as reference material.
8. Category parent writes reject missing parents and cycles through descendants. Category deletion protects subcategories and products. Category slugs are normalized before uniqueness checks.
9. Product category choices now load actual database categories instead of only bundled sample categories. Price and inventory labels now interpolate the selected selling unit correctly.
10. Specialist managers were implicitly granted most unrelated permissions by both authorization helpers. Permission checks now respect the defined role matrix.
11. Main admin API reads and writes now enforce section/action permissions. Dedicated catalog, products, recipes, ingredient, media, SKU and import endpoints have module permission checks. Inventory writes through GET are rejected.
12. Inactive and suspended staff no longer retain API access through an existing cookie. Active sessions use the current database role.
13. Staff rows now display the actual super-admin role, prevent accidental super-admin dropdown changes, show actual role permissions, and make the View action functional.
14. Staff creation now provisions or links a Firebase sign-in identity and links its UID to the database row. Existing Firebase passwords are not reset. Newly created identities are cleaned up if database persistence fails. No real staff account was created during this audit.
15. The public settings API now selects only explicit storefront configuration keys. The admin settings view requires super-admin access and uses masked settings.
16. Image optimization saves now validate dimensions and quality, transactionally merge only optimization fields, and preserve the existing business configuration. The form loads saved values.
17. Hamper settings report success and update client state only after a successful server save; failures retain the draft and show an error.
18. The header connection indicator now shows failure on network or HTTP errors and uses a bounded connection check.
19. Review loading errors are surfaced, successful moderation removes rows from incompatible filtered lists, and the Reviews navigation uses review permissions.
20. Campaign dispatch no longer swallows failed responses or falsely reports scheduling. The unconfigured sending route explicitly reports that nothing was sent or scheduled.
21. The missing client audit endpoint now records authenticated admin observations with server-derived actor identity and a CLIENT_ prefix to distinguish them from authoritative server mutation events.

## Live inspection

Authenticated inspection covered dashboard, product catalog and edit form, analytics, order queue and date/status filters, payment overview and webhook diagnostics, delivery dispatch, category architecture, ingredients, media, reviews, marketing/coupons, staff, festivals, hampers, WooCommerce, security logs and System Health.

System Health reported Healthy / Database Connected / Firebase Ready. A pre-deployment database backup was created successfully: `tvoflavours_backup_20261028094701.db`, 1.62 MB, QuickCheck OK.

The payment dashboard contains historical rejected webhook-signature events from September. Existing payment keys and gateway state were not changed. No real payment, refund, campaign delivery, order status, staff permission or product data was changed during live inspection.

## Verification

- Automated regression suite: 604 tests passed across 55 files.
- TypeScript: passed.
- Changed application files: ESLint passed without errors; existing warnings remain.
- Category operations are tested against an isolated in-memory SQLite database, including parent cycles and deletion protection.
- Staff provisioning tests mock Firebase and cover identity linking, existing-password preservation and failure cleanup.
- Production build and deployed-state verification are recorded after the final deployment below.
