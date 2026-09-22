import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blogSeoData,seoData,seoHead,seoCopy,languagePath,siteOrigin,sitemap,safeJson} from '../packages/shared/seo.js';
import {languages} from '../packages/shared/locales.js';
import {articleTranslation,blogArticles,blogPath} from '../packages/shared/blog.js';
test('SEO metadata has distinct canonical language URLs, reciprocal alternates and truthful product data',()=>{
 for(const{code}of languages){const data=seoData(code,{origin:'https://example.com'});assert.equal(data.url,'https://example.com'+languagePath(code));assert.equal(data.alternates.length,languages.length+1);assert.equal(new Set(data.alternates.map(x=>x.language)).size,languages.length+1);assert.equal(data.title,seoCopy[code].title);assert(data.description.includes(code==='en'?'3.99':'3,99'));const product=data.schema['@graph'].find(x=>x['@type']==='Product');assert.equal(product.offers,undefined);assert.equal(product.aggregateRating,undefined);const live=seoData(code,{checkoutEnabled:true}).schema['@graph'].find(x=>x['@type']==='Product');assert.equal(live.offers.price,'3.99');assert.equal(live.offers.priceCurrency,'USD');assert.equal(live.offers.availability,'https://schema.org/InStock');assert(seoHead(data).includes('application/ld+json'));}
});
test('SEO output escapes HTML and rejects malformed canonical origins; sitemap lists all public pages',()=>{
 assert.throws(()=>siteOrigin('javascript:alert(1)'));assert.throws(()=>siteOrigin('https://example.com/path'));assert.throws(()=>siteOrigin('https://secret@example.com'));assert(!safeJson({text:'</script><script>alert(1)</script>'}).includes('<'));const xml=sitemap('https://example.com'),pageCount=languages.length*(blogArticles.length+2);assert.equal((xml.match(/<loc>/g)||[]).length,pageCount);assert.equal((xml.match(/hreflang="x-default"/g)||[]).length,pageCount);assert(!xml.includes('/write'));assert(!xml.includes('/api'));assert(seoHead({...seoData(),title:'<script>&"'}).includes('&lt;script&gt;&amp;&quot;'));
});
test('blog SEO gives every translated index and article a canonical, alternates and article schema',()=>{
 for(const{code}of languages){const index=blogSeoData(code,'','https://example.com');assert.equal(index.url,'https://example.com'+blogPath(code));assert.equal(index.alternates.length,languages.length+1);assert(index.schema['@graph'].some(x=>x['@type']==='ItemList'));for(const article of blogArticles){const data=blogSeoData(code,article.slug,'https://example.com');assert.equal(data.url,'https://example.com'+blogPath(code,article.slug));assert(data.title.includes(articleTranslation(article,code).title));assert.equal(data.ogType,'article');assert(data.schema['@graph'].some(x=>x['@type']==='BlogPosting'));assert.equal(data.alternates.length,languages.length+1);}}
 assert.equal(blogSeoData('en','missing','https://example.com'),null);
});
