# Telegram checkout notifications

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in the VPS `.env`, then recreate the app container. Start a conversation with the bot first or add it to the intended group. Never commit its token.

Enable these events on the Stripe webhook destination in the same sandbox/live account:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `payment_intent.payment_failed`
- `checkout.session.expired`

Checkout creation queues a started notification. Paid sessions queue completion; unpaid delayed sessions wait for payment confirmation. Declines notify per Stripe event, while repeated delivery of that event is deduplicated. Expiry is reported separately from failure. Closing a browser does not immediately generate an expiry event. PaymentIntent metadata is attached to newly created sessions, so older sessions may not produce decline notifications.

Only the order reference, event label and live/sandbox indicator are sent—no child data, buyer email, payment details or private purchase links. Messages persist in a SQLite outbox and retry up to ten attempts. Telegram downtime does not wait on checkout requests. A network timeout after Telegram accepted a message can cause a duplicate on retry; exactly-once delivery is not guaranteed. Inspect failed rows in `telegram_notifications` when troubleshooting; never log token-bearing request URLs.

Sending is inactive unless both environment settings exist. Test with a sandbox checkout after deployment. Add Telegram to the provider disclosure before activating it.
