import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
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
test('article FAQ schema uses the visible localized answers and links to the article page',()=>{
 for(const{code}of languages){
  assert(!blogSeoData(code).schema['@graph'].some(node=>node['@type']==='FAQPage'));
  for(const article of blogArticles){
   const copy=articleTranslation(article,code),data=blogSeoData(code,article.slug,'https://example.com'),graph=data.schema['@graph'];
   const faq=graph.find(node=>node['@type']==='FAQPage'),posting=graph.find(node=>node['@type']==='BlogPosting'),page=graph.find(node=>node['@type']==='WebPage');
   assert(copy.faqs.length>0);
   assert.equal(faq['@id'],data.url+'#faq');
   assert.equal(faq.inLanguage,code);
   assert.equal(faq.isPartOf['@id'],page['@id']);
   assert.equal(page.mainEntity['@id'],posting['@id']);
   assert.equal(posting.hasPart['@id'],faq['@id']);
   assert.equal(posting.datePublished,article.date);
   assert.equal(posting.dateModified,article.updated);
   assert.deepEqual(faq.mainEntity.map(item=>{
    assert.equal(item['@type'],'Question');assert.equal(item.acceptedAnswer['@type'],'Answer');
    return [item.name,item.acceptedAnswer.text];
   }),copy.faqs);
  }
 }
});
test('each article has a distinct real featured image with matching localized social metadata',async()=>{
 assert.equal(new Set(blogArticles.map(article=>article.image.src)).size,blogArticles.length);
 for(const article of blogArticles){
  const full=await sharp(new URL('../public'+article.image.src,import.meta.url).pathname).metadata();
  const small=await sharp(new URL('../public'+article.image.thumbnail,import.meta.url).pathname).metadata();
  assert.equal(full.width,article.image.width);assert.equal(full.height,article.image.height);assert.equal(full.format,'webp');
  assert.equal(small.width,640);assert.equal(small.format,'webp');
  for(const{code}of languages){
   const data=blogSeoData(code,article.slug,'https://example.com');
   assert.equal(data.image,'https://example.com'+article.image.src);
   assert.equal(data.alt,article.image.alt[code]);assert(data.alt.length>20);
   assert.equal(data.imageWidth,full.width);assert.equal(data.imageHeight,full.height);
   assert.equal(data.schema['@graph'].find(node=>node['@type']==='BlogPosting').image,data.image);
  }
 }
});
