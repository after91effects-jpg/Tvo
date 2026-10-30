# Payment and delivery audit — 30 October 2026

1. Gateway configuration and safe secret handling; server verification must match payment amount, currency, gateway order and captured state. Prevent stale callbacks or failures from overwriting paid/refunded records.
2. Refunds: production must never simulate success without keys; reserve refund balance before outbound calls; use durable idempotency identifiers; pending/processed/failed states must be truthful. Deduplicate callbacks and gateway refunds atomically.
3. Webhooks: signed raw body; provider event-id header or stable digest; atomic updates; retry processing failures; reject amount/order mismatches and out-of-order downgrades.
4. Delivery: one date/slot policy shared with checkout; strict calendar dates, weekdays, disabled slots, per-date capacity, cutoffs and kitchen capacity. Correct pickup behavior and shipping-zone validation.
5. Fleet: validate driver/status changes, preserve final orders, keep assignment and driver availability consistent, and record tracking history.
6. Dashboard: accurate India-date filters, pagination, errors and refund states. Validate live read endpoints; use local fixtures/mocked gateway for all monetary mutations. No real charge/refund or outbound customer message.

Implementation and verification details are in PAYMENT_DELIVERY_AUDIT_RESULTS.md. Core changes and isolated safety checks are complete. Final steps: production build, deploy to the already approved tvoflavours.com target, then live read checks and visual confirmation. Do not enable the mismatched payment configuration or perform monetary actions.
