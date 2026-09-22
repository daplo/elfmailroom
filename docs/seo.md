# Public-site SEO review

## Copy and search intent

The main product is a personalised digital Santa letter, downloaded as a PDF and printed at home. The previous H1, “Santa’s mailroom is open,” was brand-led but did not name that product. The new H1 is **“Personalised Santa letters to download and print.”** It describes the product and format without implying postal delivery.

The opening paragraph now explains what makes the letter personal: the child’s name, wishes and proud moments. The digital-delivery explanation remains in that paragraph rather than a separate hero notice. Supporting headings describe the creation process, a personalised example, the price and product questions. The design-selection step describes the four actual thumbnail choices. The sample section explains that AI creates the letter and that the parent reviews it.

FAQs answer personalisation, postal delivery, revisions, languages, price and download timing. Wording does not promise immediate generation, physical shipping or search rankings. These changes are based on product relevance, not invented keyword volumes; no Search Console or keyword-volume data was available for this review.

## Implemented technical changes

- Localized title tags, meta descriptions, Open Graph and Twitter cards.
- One descriptive H1 per page and a translated alt description for the main illustration. Decorative images remain empty-alt.
- English at `/`, German at `/de/`, Spanish at `/es/`, French at `/fr/`, Polish at `/pl/`.
- Self-referencing canonical links and reciprocal `hreflang` links for `en`, `de`, `es`, `fr` and `x-default`.
- Actual language links in the footer, plus language-selector URL changes and back/forward navigation. A language URL takes priority over a saved browser preference.
- Build-time React rendering: each language’s public copy and metadata are present in the initial HTML. The same components hydrate in the browser; there is no separate bot-only page.
- `Organization`, `WebSite`, `WebPage` and `Product` JSON-LD with linked identifiers. No fabricated ratings, reviews, business addresses, social profiles or deadlines.
- When `/api/config` confirms checkout is enabled, client-rendered product schema adds an `Offer` for USD 3.99 with availability. Pre-rendered schema omits an active offer by default, so closed sales are not advertised as in stock. Core product schema remains present without JavaScript. No merchant shipping or return-policy values were invented for the digital product.
- Generated `sitemap.xml` containing the 25 public home and blog pages, with matching language alternates; generated `robots.txt` points to it.
- `/write/` pages retain `noindex,nofollow` and receive an additional `X-Robots-Tag` header. They are omitted from the sitemap. They are not disallowed in robots.txt, so crawlers can see the noindex instruction. API routes are disallowed; authentication still protects private data.
- Production requests for nonexistent public pages return HTTP 404 instead of the landing page.

The internal admin interface remains in English. SEO metadata targets public customer pages, not private purchase URLs.

## Blog

`/blog/` and its three article routes are fully translated and pre-rendered in all five website languages. The guides cover writing a letter to Santa, calm Christmas Eve traditions and presenting a printable Santa letter. Each article has unique titles and descriptions, reciprocal hreflang links, breadcrumbs, `BlogPosting` structured data, related-article links and a relevant link into the letter builder. The articles use evergreen editorial advice and make no claims about search volume or ranking.

## Build and deployment

Set `VITE_SITE_URL` in the root `.env` to the real public origin, for example `https://elfmailroom.com`, then run `npm run build`. This is a public build variable; never put a secret in it. The existing project domain is the default. Canonicals, social images and sitemap URLs all use this one origin. `PUBLIC_URL` remains the backend’s runtime origin for Stripe return links, email links and origin checks.

The landing build runs Vite, then `apps/landing/scripts/prerender.mjs`. It writes each localized home, blog index and article route as a real `index.html`, plus `/robots.txt` and `/sitemap.xml`, to `apps/landing/dist`. `npm start` serves them through Express. Rebuild when changing public copy, translations or the canonical origin. Static hosting should serve these real files and return 404 for unknown public paths.

Run:

```sh
npm run build
npm test
node tests/seo-browser.mjs
# With npm run dev running:
node tests/browser.mjs
node tests/languages-browser.mjs
node tests/review-browser.mjs
```

The SEO browser test uses the production Express server and generated files. It checks every localized home and blog route with JavaScript disabled, plus hydration, URL/metadata changes, live offer gating, responsive headings, schema, sitemap and private-page indexing instructions. These are local checks, not a claim of Google indexing or a passed live Rich Results Test.

After deployment, verify the real domain in Search Console, submit `/sitemap.xml`, inspect representative home and blog URLs in every language, and run Google's Rich Results Test on the live pages. Search appearance is decided by Google; valid structured data does not guarantee a rich result. Complete the real contact, privacy and purchase policies before opening sales. This change does not invent those policies or claim they exist.

## Official references

- [Google: descriptive title links and prominent headings](https://developers.google.com/search/docs/appearance/title-link)
- [Google: language-specific URLs and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: JavaScript SEO and rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: Product and Offer structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
