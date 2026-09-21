# Privacy, terms and digital-content refunds

The seller information provided so far is **Webz Australia, Australia**, with worldwide digital sales confirmed. No ABN, business address, support email, production hosting/email provider details or retention schedule have been supplied. Those facts are not invented in the policies.

## Pages

- `/privacy/` — privacy policy
- `/terms/` — terms and conditions
- `/terms/#cancellation` — cancellation and refund terms
- German, Spanish, French and Polish equivalents under `/de/`, `/es/`, `/fr/` and `/pl/`.

Pages are available in development and generated as standalone HTML in the production build. They work without JavaScript, print cleanly, are linked from the footer and checkout, and are noindex while serving as supporting legal pages. Draft notices identify incomplete public details.

## Public configuration

Set these root `.env` values. They appear on the public policies; **never put credentials or other secrets in them**:

```dotenv
VITE_BUSINESS_NAME=Webz Australia
VITE_BUSINESS_COUNTRY=Australia
VITE_BUSINESS_ADDRESS=
VITE_BUSINESS_ABN=
VITE_SUPPORT_EMAIL=
VITE_PRIVACY_RETENTION=
VITE_PRIVACY_PROVIDERS=
PRIVACY_URL=/privacy/
TERMS_URL=/terms/
```

The ABN field is optional in code; supply the real number if applicable. The other public details must be populated before this implementation treats the policies as ready. `VITE_PRIVACY_PROVIDERS` should identify the actual hosting/email providers, overseas recipient countries where practicable, and applicable transfer arrangements. `VITE_PRIVACY_RETENTION` should specify actual periods or criteria for child/letter data, order and tax records, operational logs and backups. The app does not currently run automatic deletion after generation; do not claim an automated deletion schedule without implementing it.

Run `npm run build` and restart the API after changing these settings. The API checks the built policy manifest against the current public configuration and version. Checkout remains unavailable if the fields are incomplete or the published build is stale, even if payment credentials are present. `SALES_ENABLED` still controls the separate sales switch; this work does not turn it on. Populate truthful details and review the actual policy text before launch; passing this configuration check is not legal certification.

The existing terms checkbox remains an acknowledgement of the digital product and purchase terms. It is **not** a waiver of withdrawal rights. New checkout records preserve the policy version, acceptance timestamp, interface language and terms HTML snapshot. Changing these policy terms requires incrementing `policyVersion` in `packages/shared/legal.js` and rebuilding. Historical purchases are not backfilled with invented consent.

## Worldwide sales

The terms in all five languages state worldwide availability, subject to payment availability and legal restrictions, US$3.99 charged in USD, potential bank conversion fees, supported letter languages and PDF-only delivery. They preserve applicable local consumer rights. This describes the intended market; it does not enable checkout or configure international tax collection.

## Refund approach

There is no physical item to return. Under Australian Consumer Law, a business must preserve applicable consumer guarantees; the available remedy depends on the nature and seriousness of a failure. A blanket “no refunds for digital products” rule is inappropriate. Simply changing one's mind does not generally create a refund right under the ACL. The drafted terms do not promise an additional automatic change-of-mind guarantee.

The international clause preserves applicable withdrawal rights, including EU/EEA rights where they apply. This checkout does **not** implement the separate express-consent, acknowledgement and durable-confirmation workflow needed to rely on the digital-content withdrawal exception. Do not change the terms to say that payment or PDF acceptance automatically removes withdrawal rights. Worldwide sales are intended, so applicable overseas rules need to be assessed for the markets served, including EU consumers targeted by the service. Being based in Australia does not by itself exclude those rights.

Rewrites are a product feature, not a substitute for statutory remedies. A major failure must not be restricted to repeated rewrites where the law gives the customer another remedy. The refund section provides contact instructions and an optional cancellation message. There is no new automatic refund button or Stripe refund execution in this change; support must assess requests and process any required refund through Stripe.

## Privacy completion

The privacy notice reflects stored child details, versions, PDF blobs, private links, OpenAI generation, Stripe payments, optional SMTP, browser storage and Google Fonts. Before launch, determine Australian Privacy Act coverage (including relevant exceptions to the small-business exemption), applicable overseas laws, and an appropriate documented basis and safeguards for children's information. The draft expressly identifies that unfinished assessment rather than assuming that agreeing to purchase terms gives blanket privacy consent.

The provider and retention sections require actual operating details. Access/correction/deletion and complaint requests are handled through the public support contact; the current admin UI does not automate those workflows. The policy does not assert that OpenAI has zero retention. Legal translations and the final notice should be checked against the confirmed business model and countries of sale.

## Official references checked

- [ACCC: repair, replace, refund, cancel](https://www.accc.gov.au/consumers/problem-with-a-product-or-service-you-bought/repair-replace-refund-cancel)
- [OAIC: Privacy Act coverage for small businesses](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business)
- [OAIC: Australian Privacy Principles](https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles)
- [EU guidance: purchases from non-EU traders](https://europa.eu/youreurope/citizens/consumers/shopping/shopping-consumer-rights/index_en.htm)
- [EU guidance: digital-content withdrawal and remedies](https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/faq/index_en.htm)
- [OpenAI: API data controls](https://developers.openai.com/api/docs/guides/your-data)
