# Payment and delivery audit — 30 October 2026

Scope: Payments & Razorpay, refunds, webhooks, checkout fees/availability, Delivery & Fleet and the related admin screens. No real charge, refund, customer notification or live order mutation was used for verification.

## Fixed

- Checkout payment confirmation checks the gateway payment's captured state, exact amount, INR currency and order binding. A valid signature alone cannot mark an authorized payment paid.
- Payment creation/failure actions require the order owner's authenticated identity or private checkout session. Public tracking no longer exposes that session. New checkout sessions use cryptographic UUIDs.
- Existing pending gateway attempts are reused. Order binding and the pending ledger insert commit together. Signed callbacks for known older attempts can still be verified.
- Paid/refunded records survive stale failure/authorization/capture callbacks. Cancelled orders stay cancelled if capture arrives late; refund review is recorded.
- Refunds reserve available balance before contacting Razorpay, preventing concurrent over-refunds. Durable request IDs and Razorpay refund idempotency keys survive retries/restarts. Pending, completed and failed states remain separate.
- Refund callbacks and admin responses use one ledger; repeated created/processed callbacks and callbacks arriving before the provider response cannot count a refund twice. Network uncertainty keeps funds reserved for reconciliation. Failed requests cannot be silently replayed after another refund consumes their balance.
- Production missing credentials cannot simulate successful refunds. Provider refund amounts are checked, and missing provider status stays pending.
- Signed webhook handling deduplicates the provider event ID (or stable body hash). Database changes and processed status commit atomically. Temporary database failures return a retryable response. Invalid financial payloads are recorded as rejected.
- Saved gateway mode and key prefix must match before payment creation/activation. The dashboard explains mismatches without exposing credentials.
- Payment date filters use India business dates, validate calendar dates and handle invalid pagination. CSV export is correctly labelled as the current page and escapes spreadsheet formulas. Refund input requires at least ₹1 and two decimal places at most.
- Delivery availability and final checkout share one policy for real calendar dates, past dates, booking horizon, blackouts, weekdays, inactive/unknown slots, date-specific capacity, minimum notice and India-time cutoff.
- Historical slot booking counters do not block unrelated dates. Zero capacity and zero delivery thresholds are preserved. Pickup respects blackouts and daily kitchen capacity, does not reserve a road-delivery slot and has no driver/slot fee.
- Checkout requires a serviceable delivery zone and its minimum order value. Slot surcharges come exclusively from server settings, including a genuine zero fee; client-supplied charges cannot override them.
- Driver reassignment updates both old/new availability. Dispatch requires an active on-duty assigned driver. Final orders cannot be reassigned/dispatched. Pickup can be collected without a driver. Failure/return requires a reason.
- Delivery completion/cancellation synchronizes public order state and releases drivers. Cancellation does not pretend a paid order has been refunded.
- Zone, PIN, date, slot, buffer, capacity and driver inputs have stronger validation. Admin screens surface fetch failures and block invalid actions. Preparation estimates are labelled separately from the enforced minimum notice rule.
- Successful login and sign-in across tabs reset the inactivity clock. Logout propagates across tabs so a stale admin screen cannot remain after its session is removed.

## Verification

- Full automated suite: 678 passed; 21 conditional MySQL tests skipped because the local disposable MySQL harness is not running. Includes 21 payment safety tests and 8 delivery safety tests with isolated fixtures/mocked gateway responses.
- TypeScript: passed separately from the build. ESLint: no errors; existing typing/dependency warnings remain.
- Isolated Next.js production build: passed. All changed monetary/delivery safety cases were rechecked afterward (33 focused tests passed). Deployment commit: e98f10e. Post-deploy checks are recorded below after completion.
- Monetary edge cases are tested locally; no claim is made that a real end-to-end payment/refund has been exercised.

## Live configuration requiring owner action

- Public gateway configuration is TEST and disabled. A read-only provider connection test succeeded and identified a LIVE key, so the saved environment/key pair is inconsistent. The new guard keeps checkout off until matching credentials/mode are deliberately saved.
- LIVE activation requires an owner-reviewed mode/key configuration, the matching Razorpay webhook setup and an owner-operated real payment/refund smoke test. Existing credentials were not replaced and online payments were not enabled by this audit.
- Delivery configuration currently contains 6 slots, 4 zones and 85 PIN codes, with no drivers. Add actual driver details before road dispatch. Existing orders and customers were not changed by the audit.
- Other preparation buffer values are planning estimates; enforced customer slot rules are minimum notice, slot cutoff, availability, blackouts and total daily capacity. Cake/custom capacity columns are retained for planning and are not represented as enforced product-specific quotas.

## Provider references

- [Razorpay payment API](https://d6xcmfyh68wv8.cloudfront.net/docs/api/payments/)
- [Razorpay refund idempotency](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md)

Live verification of the first deployment: an unknown slot is now unavailable (previously incorrectly available), and invalid calendar dates return HTTP 400 (previously accepted). Final visual and API evidence is saved under artifacts/payment-delivery/.
