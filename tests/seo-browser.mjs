import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {languages} from '../packages/shared/locales.js';
import {seoCopy,languagePath} from '../packages/shared/seo.js';
import {articleTranslation,blogArticles,blogCopy,blogPath} from '../packages/shared/blog.js';
async function checkArticle(page,article,code){
 const copy=articleTranslation(article,code);
 const graph=JSON.parse(await page.locator('#elf-schema').textContent())['@graph'];
 const faq=graph.find(node=>node['@type']==='FAQPage');
 const visible=[];
 for(const item of await page.locator('#faq .blog-faq-item').all()){
  assert(await item.isVisible());
  visible.push([await item.locator('h3').innerText(),await item.locator('p').innerText()]);
 }
 assert.deepEqual(visible,copy.faqs);
 assert.deepEqual(faq.mainEntity.map(item=>[item.name,item.acceptedAnswer.text]),visible);
 assert.equal(faq.inLanguage,code);
 assert.equal(await page.locator('#blog-faq-heading').innerText(),blogCopy[code].faq);
 assert.equal(await page.locator('.blog-elf-note').count(),2);
 assert.equal(await page.locator('.blog-byline time').getAttribute('datetime'),graph.find(node=>node['@type']==='BlogPosting').dateModified);
 assert.equal(await page.locator('.blog-article-body>section:last-child').getAttribute('id'),'faq');
 const image=page.locator('.blog-featured img');
 assert.equal(await image.getAttribute('src'),article.image.src);
 assert.equal(await image.getAttribute('alt'),article.image.alt[code]);
 assert.equal(await image.getAttribute('loading'),'eager');
 await image.evaluate(img=>img.decode());
 assert(await image.evaluate(img=>img.naturalWidth>0));
 const social=await page.locator('meta[property="og:image"]').getAttribute('content');
 assert.equal(new URL(social).pathname,article.image.src);
 assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'),social);
 assert.equal(await page.locator('meta[property="og:image:alt"]').getAttribute('content'),article.image.alt[code]);
 assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'),String(article.image.width));
 assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'),String(article.image.height));
 assert.equal(graph.find(node=>node['@type']==='BlogPosting').image,social);
}
async function checkCardImages(page,selector,code){
 const images=page.locator(selector);assert.equal(await images.count(),blogArticles.length);
 for(const[index,article]of blogArticles.entries()){
  const image=images.nth(index);
  assert.equal(await image.getAttribute('src'),article.image.src);
  assert.equal(await image.getAttribute('alt'),article.image.alt[code]);
  await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());
  assert(await image.evaluate(img=>img.naturalWidth>0));
 }
}
const temp=await mkdtemp(path.join(tmpdir(),'elf-seo-')),origin='http://localhost:3210';
const proc=spawn(process.execPath,['apps/api/src/server.js'],{env:{...process.env,PORT:'3210',PUBLIC_URL:origin,DATABASE_PATH:path.join(temp,'orders.sqlite'),OPENAI_API_KEY:'',STRIPE_SECRET_KEY:'',EMAIL_ENABLED:'false',SALES_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out')),8000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('error',reject)});browser=await chromium.launch();
 const nojs=await browser.newContext({javaScriptEnabled:false});const plain=await nojs.newPage();
 for(const{code}of languages){const url=origin+languagePath(code),response=await fetch(url),html=await response.text();assert.equal(response.status,200);assert(html.includes(seoCopy[code].h1));assert(html.includes('application/ld+json'));assert(!html.includes('noindex'));await plain.goto(url);assert.equal(await plain.locator('h1').count(),1);assert((await plain.locator('h1').innerText()).includes(seoCopy[code].h1));assert.equal(await plain.title(),seoCopy[code].title);assert.equal(await plain.locator('html').getAttribute('lang'),code);assert.equal(await plain.locator('meta[name="description"]').getAttribute('content'),seoCopy[code].description);assert.equal(await plain.locator('meta[property="og:title"]').getAttribute('content'),seoCopy[code].title);assert.equal(await plain.locator('meta[property="og:description"]').getAttribute('content'),seoCopy[code].description);assert.equal(await plain.locator('meta[name="twitter:title"]').getAttribute('content'),seoCopy[code].title);assert.equal(await plain.locator('meta[name="twitter:description"]').getAttribute('content'),seoCopy[code].description);assert.equal(await plain.locator('meta[property="og:locale"]').getAttribute('content'),{en:'en_GB',de:'de_DE',es:'es_ES',fr:'fr_FR',pl:'pl_PL'}[code]);assert.equal(new URL(await plain.locator('meta[property="og:url"]').getAttribute('content')).pathname,languagePath(code));assert.match(await plain.locator('meta[property="og:image"]').getAttribute('content'),/^https?:\/\//);if(code!=='en'){const direct=await fetch(origin+'/'+code,{redirect:'manual'});assert.equal(direct.status,301);assert.equal(new URL(direct.headers.get('location'),origin).pathname,languagePath(code));}assert.equal(await plain.locator('link[rel="alternate"][hreflang]').count(),languages.length+1);const canonical=await plain.locator('link[rel="canonical"]').getAttribute('href');assert.equal(new URL(canonical).pathname,languagePath(code));assert.equal(await plain.locator('.language-links a').count(),languages.length);assert.equal(await plain.locator('.home-blog-card').count(),blogArticles.length);await checkCardImages(plain,'.home-blog-mark img',code);assert.equal(new URL(await plain.locator('.home-blog-heading .button').getAttribute('href'),origin).pathname,blogPath(code));const schema=JSON.parse(await plain.locator('#elf-schema').textContent());assert.equal(schema['@graph'].length,4);assert.equal(schema['@graph'].find(x=>x['@type']==='Product').offers,undefined);}
 for(const{code}of languages){const indexUrl=origin+blogPath(code);await plain.goto(indexUrl);assert.equal(await plain.locator('html').getAttribute('lang'),code);assert.equal(await plain.locator('h1').innerText(),blogCopy[code].title);assert.equal(await plain.locator('.blog-card').count(),blogArticles.length);await checkCardImages(plain,'.blog-card-art img',code);assert.equal(new URL(await plain.locator('link[rel="canonical"]').getAttribute('href')).pathname,blogPath(code));assert.equal(new URL(await plain.locator('.language-links a[lang="pl"]').getAttribute('href'),origin).pathname,blogPath('pl'));for(const article of blogArticles){const copy=articleTranslation(article,code),url=origin+blogPath(code,article.slug),response=await fetch(url);assert.equal(response.status,200);assert((await response.text()).includes(copy.title));await plain.goto(url);assert.equal(await plain.locator('h1').innerText(),copy.title);assert.equal(await plain.locator('.blog-article-body section').count(),copy.sections.length+1);await checkArticle(plain,article,code);assert.equal(await plain.locator('meta[property="og:type"]').getAttribute('content'),'article');assert.equal(new URL(await plain.locator('.language-links a[lang="fr"]').getAttribute('href'),origin).pathname,blogPath('fr',article.slug));assert(JSON.parse(await plain.locator('#elf-schema').textContent())['@graph'].some(x=>x['@type']==='BlogPosting'));}}
 for(const{code}of languages)for(const type of ['privacy','terms']){const url=origin+languagePath(code)+type+'/';const response=await fetch(url);assert.equal(response.status,200);await plain.goto(url);assert.equal(await plain.locator('h1').count(),1);assert.equal(await plain.locator('html').getAttribute('lang'),code);assert((await plain.locator('body').innerText()).includes('Webz Australia'));assert.equal(await plain.locator('.language-links a').count(),languages.length);if(type==='terms')assert.equal(await plain.locator('#cancellation').count(),1);}
 await nojs.close();
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 // A saved preference must not replace an explicitly requested language URL during hydration.
 await context.addInitScript(()=>localStorage.setItem('elf-language','fr'));
 await page.goto(origin+'/de/');await page.getByRole('heading',{level:1}).waitFor();await page.locator('.raster-preview>img').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'de');
 await page.locator('.language-picker select').selectOption('es');assert.equal(new URL(page.url()).pathname,'/es/');await page.waitForFunction(title=>document.title===title,seoCopy.es.title);assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname,'/es/');assert.equal(JSON.parse(await page.locator('#elf-schema').textContent())['@graph'].find(x=>x['@type']==='WebPage').inLanguage,'es');
 await page.reload();await page.locator('.raster-preview>img').waitFor();assert.equal(await page.title(),seoCopy.es.title);await page.goBack();await page.waitForFunction(title=>document.title===title,seoCopy.de.title);
 for(const width of [1440,1024,768,390,360]){await page.setViewportSize({width,height:1000});for(const{code}of languages){await page.locator('.language-picker select').selectOption(code);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code} overflow at ${width}`);if(code==='en'&&(width===1440||width===360))await page.locator('.hero').screenshot({path:`tests/seo-hero-${width}.png`});}}
 await page.goto(origin+blogPath('en'));await page.locator('.language-picker select').selectOption('pl');assert.equal(new URL(page.url()).pathname,blogPath('pl'));await page.waitForFunction(title=>document.title===title,blogCopy.pl.title+' | Elf Mailroom');await page.locator('.language-picker select').selectOption('en');for(const width of [1440,390,360]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`blog overflow at ${width}`);}
 for(const{code}of languages)for(const article of blogArticles){
  await page.goto(origin+blogPath(code,article.slug));
  await page.locator('.blog-faq').waitFor();
  await checkArticle(page,article,code);
  assert.equal(await page.locator('#elf-schema').count(),1);
  for(const width of [1440,390,360]){
   await page.setViewportSize({width,height:1000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code} ${article.slug} overflow at ${width}`);
  }
 }
 await page.goto(origin+blogPath('en',blogArticles[0].slug));
 await page.locator('.language-picker select').selectOption('pl');
 await page.waitForFunction(title=>document.title===title,articleTranslation(blogArticles[0],'pl').title+' | Elf Mailroom');
 await checkArticle(page,blogArticles[0],'pl');
 assert.equal(new URL(page.url()).pathname,blogPath('pl',blogArticles[0].slug));
 await page.reload();await checkArticle(page,blogArticles[0],'pl');
 await page.getByRole('button',{name:'Odrzuć',exact:true}).click();
 await page.getByRole('button',{name:'Odrzuć',exact:true}).waitFor({state:'hidden'});
 await page.locator('.blog-featured').screenshot({path:'test-results/blog-featured-mobile-pl.png'});
 await page.locator('.blog-faq').screenshot({path:'test-results/blog-faq-mobile-pl.png'});
 await page.locator('.blog-elf-note').first().screenshot({path:'test-results/blog-note-mobile-pl.png'});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.blog-featured').screenshot({path:'test-results/blog-featured-desktop-pl.png'});
 await page.locator('.blog-faq').screenshot({path:'test-results/blog-faq-desktop-pl.png'});
 await page.route('**/api/config',route=>route.fulfill({json:{checkoutEnabled:true}}));await page.goto(origin+'/');await page.waitForFunction(()=>JSON.parse(document.querySelector('#elf-schema').textContent)['@graph'].some(x=>x['@type']==='Product'&&x.offers?.price==='3.99'));assert.equal(await page.locator('#elf-schema').count(),1);assert.equal(await page.locator('link[rel=canonical]').count(),1);
 await checkCardImages(page,'.home-blog-mark img','en');
 await page.locator('.home-blog-grid').screenshot({path:'test-results/blog-home-images-desktop.png'});
 await page.goto(origin+blogPath('en'));await checkCardImages(page,'.blog-card-art img','en');
 await page.locator('.blog-grid').screenshot({path:'test-results/blog-index-images-desktop.png'});
 await page.setViewportSize({width:360,height:1000});
 await page.locator('.blog-grid').screenshot({path:'test-results/blog-index-images-mobile.png'});
 const robots=await fetch(origin+'/robots.txt').then(r=>r.text());assert(robots.includes('Sitemap:'));assert(!robots.includes('Disallow: /write'));const sitemap=await fetch(origin+'/sitemap.xml').then(r=>r.text());assert.equal((sitemap.match(/<loc>/g)||[]).length,languages.length*(blogArticles.length+2));
 for(const pathname of ['/write/','/write/admin','/write/purchase/test']){const response=await fetch(origin+pathname);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(await response.text(),/name="robots" content="noindex,nofollow"/)}assert.equal((await fetch(origin+'/missing-page')).status,404);
 assert.deepEqual(errors,[]);console.log('SEO: all pre-rendered locales work without JavaScript; hydration, canonical/hreflang/schema, language navigation, responsive headings, sitemap and private-page noindex passed.');
}finally{await browser?.close();proc.kill();if(proc.exitCode===null)await new Promise(r=>proc.once('exit',r));await rm(temp,{recursive:true,force:true})}
