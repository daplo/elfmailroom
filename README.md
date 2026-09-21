# Elf Mailroom

A warm, responsive Santa-letter experience in an npm workspaces monorepo.

- `apps/landing`: React + Vite public site, illustrated hero, watermarked examples, digital product and FAQs.
- `apps/letter`: React + Vite application at `/write/`, with four steps: letter details → pick a design → pay → download PDF.
- `apps/api`: Express API, SQLite orders and sessions, guest Stripe Checkout, signed webhooks, an OpenAI generation worker, PDF generation and optional SMTP delivery.
- `packages/shared`: product/copy configuration, reply composer, components and visual system.

## Run locally

Requires Node 24+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:5173. The landing server proxies `/write/` and `/api` so cookies and navigation stay on one origin. API: 3001; application development server: 5174 (use the landing origin for normal browsing).

```sh
npm run build
npm start
```

Production builds are served together on port 3001. Set `PUBLIC_URL` to the deployed HTTPS origin (or `http://localhost:3001` for a local production preview). SQLite must be on a persistent disk. Deploy a single API instance or replace SQLite with a shared database before scaling horizontally.

## Enable purchases

Copy `.env.example` to `.env` and configure:

1. Publish real privacy and purchase policies; set `PRIVACY_URL` and `TERMS_URL`. Publish an actual support contact before launch.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Checkout creates a one-time US$3.99 price (399 USD cents); no separate Stripe Price ID is needed.
3. Register `/api/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Set `OPENAI_API_KEY` and a random `ORDER_LINK_SECRET` of at least 32 characters. Keep the link secret stable and backed up. A local secret has already been generated in this workspace’s ignored `.env`; for another environment generate one with `openssl rand -hex 32`.
5. Set `SALES_ENABLED=true` only after testing the full flow in Stripe test mode and reviewing business policies. The approved price is US$3.99 per letter, configured in `packages/shared/config.js`.

Checkout validates and saves the supplied child details, and uses a guest email and a server-enforced US$3.99 price. After payment is verified, a durable worker writes the letter using the OpenAI Responses API. The return page verifies the payment server-side; an unverified redirect never unlocks an order. Signed webhooks also mark paid orders. The purchased letter downloads directly as an A4 PDF generated with PDFKit and embedded fonts. Four illustrated stationery designs are shared with the sample preview. Long letters span multiple decorated pages. Optional email delivery sends a private review link, then attaches the accepted PDF; physical delivery is not implemented.

Integration reference: [Stripe Checkout sessions](https://docs.stripe.com/api/checkout/sessions/create) and [Stripe webhook signature verification](https://docs.stripe.com/webhooks/signatures).

## Current scope and launch requirements

Without configuration the whole personalisation/preview flow works, but payment and paid downloads remain unavailable. Guest checkout requires no signup. The server calls OpenAI with the child’s details and optional original message, including questions for Santa. The browser never receives the API key. The static sample copy is used only for fictional previews and PDF fixtures, never for new purchases. Pre-payment previews always use a fixed fictional sample; the child’s personalised letter is revealed only in the paid order and PDF. Parents can change their supplied details before checkout.

Drafts use sessionStorage, and are sent to the server only at checkout; the guest email is submitted at checkout. Existing account endpoints are retained for compatibility, but aren’t part of the purchase journey. Passwords use salted scrypt, session tokens are hashed in the database, cookies are HttpOnly and same-site, mutation endpoints check origin, and authentication is rate-limited. HTTPS enables Secure cookies.

Each new purchase has a UUID and a signed private access token. The token is in the URL fragment and sent to the API as a bearer token; only its hash is stored in SQLite. The link works across devices, and anyone with it can access that purchase. Legacy browser access remains supported. Only paid, accepted letter versions are downloadable; an order ID alone cannot unlock a file. Before a public commercial launch, add deletion/retention workflows, real support details, final legal policies, database backups, operational monitoring and a reviewed CSP. If exposing account features later, add email verification and password recovery. Complete Stripe test-mode payment/webhook tests. Live Stripe and fulfillment were not tested without credentials. No shipping dates or Christmas deadlines are fabricated.

## Checks

```sh
npm ci
npx playwright install chromium
npm run test:ci
# Or separately:
npm run test:unit
npm run build
npm run test:e2e
```

GitHub Actions runs the unit/API tests and browser checks on pushes and pull requests. Browser checks launch their own isolated server and database, cover all five languages, consent, desktop/mobile, SEO, purchase review and admin editing, and upload screenshots. External payment, generation and email providers are mocked; no live credentials are required. See [CI and deployment details](docs/deployment.md).

## Content and artwork

Edit `packages/shared/locales.js` for customer translations, digital-delivery notices and fictional sample letters; `packages/shared/config.js` for stationery and price; `packages/shared/styles.css` for the shared visual system. The illustration is optimized WebP at `public/assets/mailroom.webp`; generation provenance and prompt are in `docs/artwork.md`.

Illustrated stationery source prompts and saved asset paths are in `docs/stationery-artwork.md`. The web uses optimized WebP backgrounds; PDFs embed JPEG artwork locally on every page.

The landing-page sample gallery shows all six stationery thumbnails. Selecting a design updates the full watermarked fictional letter; the Sophie/Oliver selector and website language work with every design. Design names are localized and selection supports keyboard navigation.

The Australian summer designs are **Santa’s Beach Christmas** and **Kangaroo Christmas BBQ**, with cream writing areas, seaside artwork and flip-flops. Both also appear in the builder, admin test form, purchase reviews and PDF exports. The existing four designs are unchanged. Artwork prompts and asset paths are recorded in [Australian stationery](docs/australian-stationery.md).

All six letters use self-hosted **EB Garamond** for their traditional serif heading and body text, both in canvas previews and embedded PDFs. A standalone localized greeting (for example, “Dear Sophie,”) is drawn separately in large handwritten Caveat, matching Santa’s unchanged signature. Long names wrap, and the greeting appears only once in PDFs. Letters without a recognized greeting retain their full original text. The preview waits for both fonts before measuring or drawing text; longer text still expands the preview or flows to another PDF page. Font files and SIL Open Font License notices are included in both browser and API assets. Source: [Google Fonts EB Garamond](https://github.com/google/fonts/tree/main/ofl/ebgaramond).

Landing-page Christmas accents live in `apps/landing/src/ChristmasAccents.jsx`, `FestiveDetails.jsx` and `christmas.css`: fairy lights, holly, hanging ornaments, Christmas doodles, and localized bell, cocoa, gift and gingerbread surprises throughout the page. Decorative entrance animations play once as sections enter view; buttons, sample tabs and FAQ cards have small hover/focus interactions. Surprises work on tap and keyboard, have localized status messages, and finish after 2.4 seconds. The “Let it snow” button stops after 4.5 seconds or a second click. Reduced-motion preferences disable animations and show static decorations; the existing artwork is unchanged.

## OpenAI letter generation

Set these **server-only** variables in the root `.env`, then restart the API:

```dotenv
OPENAI_API_KEY=your-key-set-locally
OPENAI_MODEL=gpt-4.1-mini
```

The default is a configurable, structured-output-capable model. Requests use the official SDK’s Responses API with strict JSON output and `store: false`. This disables response storage; it is not a claim of zero retention. Include your use of OpenAI and the supplied child information in the published privacy policy. Payment readiness requires the OpenAI key as well as the Stripe and policy settings; configuration presence does not validate credentials or available balance.

The worker checks SQLite every two seconds. Only verified paid orders are eligible. Each new order gets a separate generation request with varied creative direction. A unique normalized prose hash rejects exact duplicate text, retrying for another response. Semantically similar wording is still possible; uniqueness is not a guarantee that no phrase ever repeats.

Original input details, generated text, model, provider response ID, rewrite requests and all letter versions are retained in SQLite. Each downloaded version’s PDF is cached in the database so email and repeat downloads use identical bytes. Failures and refusals do not fall back to a template. Jobs retry at most three times with backoff; leases recover interrupted jobs after a restart. The browser polls for completion and distinguishes payment confirmation from letter preparation. A failed generation retains the paid order and its input for support recovery.

After resolving a provider/key/billing problem, retry a failed paid order locally:

```sh
npm run retry-letter -w @elf/api -- ORDER_ID
```

This operator command requeues failed, paid orders, including failed rewrites. A rewrite preserves the current letter until its replacement succeeds, and keeps previous versions in history. The current worker processes one letter at a time; add bounded worker concurrency and load testing before larger launches.

No live OpenAI request was run during implementation because no key was configured. Test live generation and review real letter quality before enabling sales.

Official references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Email delivery

The backend uses Nodemailer with SMTP, so it can connect to your chosen transactional email provider. New orders save the parent's supplied email address. When enabled, a durable SQLite worker waits for confirmed payment and a finished letter, then sends an illustrated email containing the private review link. After the parent accepts the current version, a second email attaches that version’s PDF. Each revision starts a new review cycle. Email uses the saved letter and cached PDF, never another OpenAI generation.

Configure the root `.env` and restart the API:

```dotenv
EMAIL_ENABLED=true
EMAIL_FROM=your-verified-sender@example.com
EMAIL_REPLY_TO=your-support-address@example.com
SMTP_HOST=your-provider-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

`EMAIL_FROM` must be a plain verified email address. Port 587 requires STARTTLS; for port 465 use `SMTP_SECURE=true`. Publish your provider's SPF/DKIM settings and configure DMARC. These variables are server-only. Email is disabled by default; existing orders are not retroactively emailed when it is enabled. The UI only offers email delivery when configuration is present. Configuration presence is not a connectivity or deliverability check.

Transient failures retry up to three times with backoff. Completed jobs are not resent. An SMTP timeout or process interruption may happen after provider acceptance, so ambiguous jobs stop for operator review. A stable Message-ID is used, but SMTP cannot guarantee exactly-once delivery. `sent` means accepted by the SMTP server, not inbox delivery; provider bounce/complaint webhooks are not yet integrated. Email failure never removes the letter or prevents its download.

After checking provider logs for ambiguous sends and resolving the cause, retry a failed email:

```sh
npm run retry-email -w @elf/api -- ORDER_ID
```

The tests compose real MIME messages entirely in memory and verify all six illustrated PDFs, attachments, paid-only eligibility, retries and duplicate prevention. No real email has been sent or live SMTP credentials tested.

Implementation references: [Nodemailer SMTP](https://nodemailer.com/smtp), [PDF and inline image attachments](https://nodemailer.com/message/attachments).

Stripe Checkout fixes quantity to one, disables promotion codes and Adaptive Pricing, and charges USD 399 cents once. The browser cannot supply or override the amount. No shipping or extra line items are added.

## Purchase review and admin

A purchase link looks like `/write/purchase/<uuid>#token=<private-token>`. After payment, parents can read the generated letter, request a rewrite with instructions and words/topics to avoid, or accept and download. Five rewrites are included by default (`MAX_REWRITES_PER_ORDER`). Previous successful rewrite instructions accompany subsequent requests. While a rewrite is in progress, the old copy remains visible; a failed rewrite does not delete it. Accepting always applies to the current version, with conflicting edits rejected.

Admin lives at http://localhost:5173/write/admin (production: `/write/admin`). There is no default admin password:

1. Run `npm run admin-password -w @elf/api` and enter a password of at least 16 characters.
2. Set `ADMIN_EMAIL` and the printed `ADMIN_PASSWORD_HASH` in the root `.env`.
3. Restart the API and sign in with that email and password.

The admin view lists all purchases with search, payment filters and pagination. Open a purchase to see its original details, generated letters, rewrite requests and version history. Saving a manual edit creates a new version and asks the parent to review it again. Admin sessions expire after eight hours and use hashed session tokens in HttpOnly cookies. Database backups must include original purchase data, revision history and PDF blobs; retain the stable link secret separately.

Use **Generate test letter** in the admin purchase list to try the real generator without checkout. The form includes fictional sample details, every letter language (including UK, US and Australian English) and all six stationery designs. It uses the same generation prompt and configured `OPENAI_MODEL` as purchased letters, requires `OPENAI_API_KEY`, and incurs normal provider usage. The result includes the generated text, model and illustrated preview. Tests create no order, revenue or email and are not saved; leaving the form or reloading clears them. Only signed-in admins can generate tests, with one test request in progress at a time and a limit of five requests per minute. Failed attempts keep the previous result visible.

Automated purchase tests cover private-link authorization, rewrite conflicts, exclusion requests, acceptance, cached PDF downloads, admin authentication and versioned edits. Browser checks cover the review/rewrite/download flow and the admin editor on desktop and mobile using mocked services. Real Stripe, OpenAI and SMTP flows still require configured credentials and live integration testing.

## Languages and watermarked previews

The customer site, builder, checkout and purchase-review controls support English, German, Spanish, French and Polish. The website language selector persists locally across navigation. A separate **Letter language** field is saved with the original order details; changing the website language does not silently change it. Generated text, greetings, stationery headings, signatures and delivery emails use the saved letter language, including on rewrites. Older orders without a language default to English. The internal admin controls remain in English and display the saved language under the original details.

Stripe Checkout uses the website language and still charges **US$3.99**, regardless of language. The landing page, builder, consent checkbox, purchase page, Stripe product description and email explicitly state that the purchase is a **digital PDF to download and print at home**, with **no physical postal delivery**. Physical-product teasers have been removed from the customer site.

All letter previews render the artwork and text together into a JPEG with repeated diagonal watermarks baked into its pixels. Pre-payment samples contain only fictional information; after payment, the review uses the saved generated text. The PDF endpoint continues to require a paid purchase and acceptance of its current version, and the PDF has no watermark. Previews disable normal image dragging and the image context menu as a convenience, but cannot prevent screenshots or saving the watermarked image. An expandable accessible-text alternative is deliberately provided for screen-reader users. Watermarks are a visual deterrent, not DRM or authorization.

Automated tests verify language validation, persisted language through rewrite/retrieval, localized greetings and generation instructions, Unicode PDF output, translated review/final emails and digital-only copy. Browser checks cover all five website languages, separate letter-language persistence, JPEG rendering, checkout consent and mobile layouts. Live model language quality still needs review with a configured OpenAI key; tests use a mocked provider.

Implementation references: [OpenAI text generation instructions](https://developers.openai.com/api/docs/guides/text) and [Stripe Checkout locale](https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-locale).

The builder now shows all six selectable design thumbnails; full-size sample previews have been removed from the design and payment steps. The landing-page example and paid purchase-review image remain available.

## Search visibility

The landing build pre-renders public pages at `/`, `/de/`, `/es/`, `/fr/` and `/pl/`, with localized headings, metadata, canonical/hreflang links and JSON-LD. It generates `sitemap.xml` and `robots.txt`. Set the public build variable `VITE_SITE_URL` to your production origin before `npm run build`; the default matches the project's existing `https://elfmailroom.com` domain. Private app routes remain noindex. See [the SEO review and deployment checks](docs/seo.md) for the copy changes, schema behavior and local validation. Run `node tests/seo-browser.mjs` after building to test the production HTML and language routes.

## Privacy, terms and refunds

Privacy and terms pages now exist at `/privacy/` and `/terms/`, with German, Spanish, French and Polish equivalents. They name **Webz Australia, Australia**, and include digital-content cancellation/refund terms preserving Australian consumer guarantees. They remain drafts until the missing public business, contact, provider and retention details are completed. See [legal setup and remaining facts](docs/legal-setup.md). The root `.env` contains the public fields; build and restart after updating them. Checkout checks that the policy build matches the configured details. The checkout terms checkbox does not waive any statutory withdrawal rights.
