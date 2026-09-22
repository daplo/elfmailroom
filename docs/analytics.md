# Optional Google Analytics

Set the public GA4 measurement ID in the root .env:

VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

Rebuild and restart after changing it. This is a public identifier, not an API secret. A blank or invalid ID disables loading, while the consent banner remains available.

The English, German, Spanish, French and Polish banner offers equally prominent accept/reject buttons. Essential storage remains available. The choice expires after 180 days and Cookie settings lets visitors change it. No Google Analytics script or analytics request is initiated before acceptance (basic consent approach). Choices sync across same-origin tabs. Rejection after acceptance disables measurement, deletes accessible _ga cookies and reloads to remove active Google listeners. Previously collected data is not deleted by withdrawing consent.

Analytics is restricted to the five public landing URLs. The letter builder, purchase and admin routes never load the tag, even after consent. Configured page views strip queries, fragments and referrers, use a fixed page title, and disable Google signals and advertising personalization.

In the GA4 web stream, **turn off Enhanced Measurement**, including automatic history page views, form interactions and outbound clicks. This integration sends its own sanitized events. Do not add separate Google tags or automatic event tracking without extending the consent controls and reviewing their payloads. No purchase conversions are sent; `create_letter_click` measures intent, not a completed order.

## Events

All events include `site_language` and a public page URL without query parameters or fragments. Referrers are blank and titles are fixed. Names, letter text, emails, private purchase IDs/tokens, arbitrary link URLs and arbitrary event parameters are never included in these application-generated events.

| Event | When / parameters |
| --- | --- |
| `page_view` | Once after consent on a landing load, then on an in-page locale route change (including back/forward). |
| `landing_view` | Once per full landing load after consent. |
| `scroll_depth` | 25, 50, 75, 90 and 100 percent of scrollable distance; `percent_scrolled`, each once per load. |
| `section_view` | Heading enters the viewport; `section_id`: hero, how-it-works, letters, parents, pricing, faq, final, footer; each once per load. |
| `landing_engagement` | 15, 30 and 60 seconds with the tab visible after consent; `seconds`. Measures visible time, not proof of reading. |
| `create_letter_click` | Every create/write CTA click; `placement`: header, hero, samples, pricing or final. |
| `navigation_click` | Section navigation; `section_id`, `placement`. |
| `template_select` | Sample design changed; `template_id`: classic, woodland, starlight, jolly, beach or barbecue. |
| `sample_letter_select` | Fictional example selected; `sample_id`: sample_1 or sample_2, not a name. |
| `faq_open` | FAQ expanded; `faq_id`: one-based position in the FAQ list. |
| `language_select` | Language dropdown or footer language link; `target_language`, `placement`. |
| `menu_toggle` | Mobile menu; `action`: open or close. |
| `festive_interaction` | Snow, bell, mug, gift or gingerbread; `interaction`, `action`. |
| `footer_link_click` | Privacy, terms, refunds or contact; `destination` category only. |

Interactions before acceptance are discarded, not queued or replayed. Visibility/time counters start on acceptance. Locale changes within the page do not reset scroll, section or engagement milestones. Rejecting removes this integration's observers/listeners/timers before the existing reload removes Google itself. Repeated acceptance does not install duplicate tracking.

## View the data in GA4

1. Configure the measurement ID, rebuild/restart, open the public landing page and accept cookies. Ad blockers can prevent collection.
2. Use **Reports → Realtime** to check event names while clicking and scrolling. Standard reports are not immediate.
3. Under **Admin → Custom definitions**, register event-scoped dimensions for the parameters you want to break down: `site_language`, `placement`, `section_id`, `template_id`, `sample_id`, `faq_id`, `target_language`, `interaction`, `action`, `destination`, `percent_scrolled` and `seconds`.
4. Optionally mark `create_letter_click` as a key event for creation intent. It is not payment/revenue tracking. Use Explorations to compare CTA placement, template popularity and the landing-to-create funnel.

The builder, checkout, private review/download and admin still have no analytics tag or events. Dashboard configuration must be performed in your Google account; it is not changed by this code. Local browser tests intercept Google script requests and inspect sanitized queued commands; they do not send test activity to a live property.

Set and document actual GA4 event retention and Google processing/transfer details in VITE_PRIVACY_RETENTION and VITE_PRIVACY_PROVIDERS before publishing the privacy policy. Browser cookie lifetime is distinct from Google's server-side retention.

Official implementation references:
- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://developers.google.com/tag-platform/security/guides/privacy
- https://support.google.com/analytics/answer/9216061
- https://support.google.com/analytics/answer/12229021
- https://support.google.com/analytics/answer/6366371
