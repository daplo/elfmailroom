# Optional Google Analytics

Set the public GA4 measurement ID in the root .env:

VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

Rebuild and restart after changing it. This is a public identifier, not an API secret. A blank or invalid ID disables loading, while the consent banner remains available.

The English, German, Spanish, French and Polish banner offers equally prominent accept/reject buttons. Essential storage remains available. The choice expires after 180 days and Cookie settings lets visitors change it. No Google Analytics script or analytics request is initiated before acceptance (basic consent approach). Choices sync across same-origin tabs. Rejection after acceptance disables measurement, deletes accessible _ga cookies and reloads to remove active Google listeners. Previously collected data is not deleted by withdrawing consent.

Analytics is restricted to the five public landing URLs. The letter builder, purchase and admin routes never load the tag, even after consent. Configured page views strip queries, fragments and referrers, use a fixed page title, and disable Google signals and advertising personalization.

In the GA4 web stream, **turn off Enhanced Measurement**, including automatic history page views, form interactions and outbound clicks. This integration deliberately sends only a sanitized page view per full landing page load. Do not add separate Google tags or automatic event tracking without extending the consent controls and reviewing their payloads. No purchase conversions are sent.

Set and document actual GA4 event retention and Google processing/transfer details in VITE_PRIVACY_RETENTION and VITE_PRIVACY_PROVIDERS before publishing the privacy policy. Browser cookie lifetime is distinct from Google's server-side retention.

Official implementation references:
- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://developers.google.com/tag-platform/security/guides/privacy
