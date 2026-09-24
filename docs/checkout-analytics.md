# Checkout analytics

Configure the production server `.env` (never GitHub public build variables):

```
GA4_MEASUREMENT_ID=G-K14KH84TGG
GA4_API_SECRET=<Measurement Protocol API secret for that web stream>
```

Create the secret in GA Admin → Data streams → web stream → Measurement Protocol API secrets. Recreate the app container after deploying and saving configuration.

Only analytics-consented checkouts attach a pseudonymous client/session identity. Existing landing-page GA identity is reused; direct builder visitors receive a random identity after consent. No Google scripts run on private forms, purchases or admin pages. No names, emails, child information, letter text, payment error messages or private URLs are transmitted.

Events:
- `begin_checkout`: Stripe successfully creates a hosted session; includes item, actual currency and value.
- `purchase`: Stripe confirms a **live** payment; includes transaction ID, item, actual currency, tax and value excluding tax.
- `sandbox_purchase`: sandbox success; deliberately does not inflate live GA ecommerce revenue.
- `checkout_failed`: Stripe reports a failed payment attempt, or session creation fails (`failure_reason`). A failed attempt can later succeed.
- `checkout_expired`: Stripe reports an expired session; not a declined payment.

Enable these Stripe webhook events in both sandbox and live destinations:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `payment_intent.payment_failed`, `checkout.session.expired`.

Success also reconciles when the customer returns and the server retrieves a paid Stripe session. Duplicate success events share a transaction key. Delivery is queued in SQLite and retries up to ten times. HTTP acceptance is not proof of GA report processing; validate payloads with Google's debug Measurement Protocol endpoint, then verify a new consented sandbox checkout under GA Events. `sandbox_purchase` is a custom event, not the ecommerce Purchases report. Live `purchase` events populate ecommerce reports after processing. Historical checkouts without recorded consent are not backfilled.

Local event payloads expire after 72 hours; order consent associations expire with the browser's consent (at most 180 days). Cookie rejection requests removal of queued events and consent associations for the browser's identity. Previously sent events are not erased. If the withdrawal request cannot reach the server, the saved consent expires normally. Browser storage restrictions or analytics rejection can prevent tracking. Stripe remains the payment source of truth.
