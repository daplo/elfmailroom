import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seoData,seoHead,seoCopy,languagePath,siteOrigin,sitemap,safeJson} from '../packages/shared/seo.js';
import {languages} from '../packages/shared/locales.js';
test('SEO metadata has distinct canonical language URLs, reciprocal alternates and truthful product data',()=>{
 for(const{code}of languages){const data=seoData(code,{origin:'https://example.com'});assert.equal(data.url,'https://example.com'+languagePath(code));assert.equal(data.alternates.length,languages.length+1);assert.equal(new Set(data.alternates.map(x=>x.language)).size,languages.length+1);assert.equal(data.title,seoCopy[code].title);assert(data.description.includes(code==='en'?'3.99':'3,99'));const product=data.schema['@graph'].find(x=>x['@type']==='Product');assert.equal(product.offers,undefined);assert.equal(product.aggregateRating,undefined);const live=seoData(code,{checkoutEnabled:true}).schema['@graph'].find(x=>x['@type']==='Product');assert.equal(live.offers.price,'3.99');assert.equal(live.offers.priceCurrency,'USD');assert.equal(live.offers.availability,'https://schema.org/InStock');assert(seoHead(data).includes('application/ld+json'));}
});
test('SEO output escapes HTML and rejects malformed canonical origins; sitemap lists only public locale pages',()=>{
 assert.throws(()=>siteOrigin('javascript:alert(1)'));assert.throws(()=>siteOrigin('https://example.com/path'));assert.throws(()=>siteOrigin('https://secret@example.com'));assert(!safeJson({text:'</script><script>alert(1)</script>'}).includes('<'));const xml=sitemap('https://example.com');assert.equal((xml.match(/<loc>/g)||[]).length,languages.length);assert.equal((xml.match(/hreflang="x-default"/g)||[]).length,languages.length);assert(!xml.includes('/write'));assert(!xml.includes('/api'));assert(seoHead({...seoData(),title:'<script>&"'}).includes('&lt;script&gt;&amp;&quot;'));
});
