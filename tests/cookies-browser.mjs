import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
const origin='http://localhost:5199';
const server=spawn('npm',['run','dev','-w','@elf/landing','--','--port','5199'],{env:{...process.env,VITE_GOOGLE_ANALYTICS_ID:'G-TEST123'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:360,height:800}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let loads=0;
 await context.route('https://www.googletagmanager.com/**',route=>{loads++;return route.fulfill({contentType:'text/javascript',body:''})});
 await context.route('**/api/config',route=>route.fulfill({json:{checkoutEnabled:false,supportEmail:''}}));
 await page.goto(origin+'/?private=secret#token');await page.locator('#cookie-banner').waitFor();
 assert.equal(loads,0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.snow-button').click({force:true});
 assert.equal(await page.evaluate(()=>window.dataLayer?.length||0),0,'Interactions before consent are discarded');
 await page.getByRole('button',{name:'Reject',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Cookie settings',exact:true}).waitFor();assert.equal(await page.locator('#cookie-banner').count(),0);assert.equal(loads,0);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByRole('button',{name:'Accept',exact:true}).click();
 await page.waitForFunction(()=>!!document.getElementById('elf-analytics'));await page.waitForTimeout(100);assert.equal(loads,1);
 const commands=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 const event=commands.find(x=>x[0]==='event');assert.equal(event[2].page_location,origin+'/');assert.equal(event[2].page_referrer,'');assert(!JSON.stringify(commands).includes('secret'));
 const events=()=>page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]})));
 assert.equal((await events()).filter(x=>x.name==='landing_view').length,1);
 assert.equal((await events()).filter(x=>x.name==='page_view').length,1);
 assert.equal((await events()).filter(x=>x.name==='festive_interaction').length,0,'No pre-consent replay');
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByRole('button',{name:'Accept',exact:true}).click();
 assert.equal((await events()).filter(x=>x.name==='page_view').length,1,'Repeated acceptance must not duplicate tracking');
 await page.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('a[href="/write/"],footer a'))e.preventDefault()}));
 await page.setViewportSize({width:1440,height:1000});
 for(const selector of ['.navbar','.hero','#letters','#pricing','.final-cta'])await page.locator(selector+' a.button').click({force:true});
 assert.deepEqual((await events()).filter(x=>x.name==='create_letter_click').map(x=>x.params.placement),['header','hero','samples','pricing','final']);
 await page.setViewportSize({width:360,height:800});
 for(const design of ['woodland','starlight','jolly','beach','barbecue','classic']){
  const input=page.locator('input[name="sample-design"][value="'+design+'"]');
  await input.locator('..').click();assert(await input.isChecked());
 }
 assert.equal((await events()).filter(x=>x.name==='template_select').length,6);
 await page.locator('.sample-tabs button').nth(1).click();
 await page.locator('.faq-list summary').first().click();
 await page.waitForFunction(()=>window.dataLayer.some(x=>x[1]==='faq_open'));
 await page.locator('.snow-button').click({force:true});
 await page.locator('.surprise-bell button').click({force:true});
 await page.locator('.menu-toggle').click({force:true});
 await page.locator('.navbar nav a').first().click({force:true});
 await page.locator('.language-picker select').selectOption('pl');
 await page.waitForFunction(()=>window.dataLayer.some(x=>x[1]==='page_view'&&x[2].site_language==='pl'));
 await page.locator('.language-picker select').selectOption('en');
 await page.waitForFunction(()=>window.dataLayer.filter(x=>x[1]==='page_view').length===3);
 await page.goBack();await page.waitForFunction(()=>window.dataLayer.filter(x=>x[1]==='page_view').length===4);
 await page.goForward();await page.waitForFunction(()=>window.dataLayer.filter(x=>x[1]==='page_view').length===5);
 for(const destination of ['privacy','terms','cancellation'])await page.locator('footer .footer-top a[href*="'+destination+'"]').first().click();
 await page.locator('footer .footer-top button').click();
 await page.locator('.language-links a[lang="pl"]').click();
 for(const selector of ['.hero h1','#how-it-works h2','#letters h2','#parents h2','#pricing h2','#faq h2','.final-cta h2','footer .footer-bottom']){
  await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(120);
 }
 for(let i=0;i<2;i++){
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(50);
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(100);
 }
 const tracked=await events();
 assert.deepEqual(tracked.filter(x=>x.name==='scroll_depth').map(x=>x.params.percent_scrolled).sort((a,b)=>a-b),[25,50,75,90,100]);
 assert.deepEqual(tracked.filter(x=>x.name==='section_view').map(x=>x.params.section_id).sort(),['hero','how-it-works','letters','parents','pricing','faq','final','footer'].sort());
 for(const name of ['sample_letter_select','faq_open','festive_interaction','menu_toggle','navigation_click','language_select'])assert(tracked.some(x=>x.name===name),name);
 assert.deepEqual(tracked.filter(x=>x.name==='footer_link_click').map(x=>x.params.destination),['privacy','terms','refunds','contact']);
 assert(tracked.some(x=>x.name==='language_select'&&x.params.placement==='footer'));
 assert(!JSON.stringify(tracked).match(/secret|Sophie|Oliver|private@/));
 await context.addCookies([{name:'_ga',value:'test',url:origin}]);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();
 await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Reject',exact:true}).click()]);
 assert.equal(loads,1);assert(!(await context.cookies()).some(x=>x.name==='_ga'));
 // The consent is shared with a second tab.
 const other=await context.newPage();await other.goto(origin);await other.getByRole('button',{name:'Cookie settings',exact:true}).click();
 await other.getByRole('button',{name:'Accept',exact:true}).click();await page.waitForFunction(()=>!!document.getElementById('elf-analytics'));
 for(const [locale,reject] of [['de','Ablehnen'],['es','Rechazar'],['fr','Refuser'],['pl','Odrzuć']]){
  await page.evaluate(()=>localStorage.clear());await page.goto(origin+'/'+locale+'/');await page.getByRole('button',{name:reject,exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 // Invalid and expired choices must not count as consent.
 const result=await page.evaluate(async url=>{const m=await import(url);const storage={getItem:()=>JSON.stringify({version:1,choice:'accepted',expires:Date.now()-1})};history.replaceState(null,'','/write/purchase/private-id#private-token');window.__elfAnalyticsLoaded=false;return {expired:m.readConsent(storage),privateLoaded:m.startAnalytics('G-TEST123')}},'/@fs/'+path.resolve('packages/shared/analytics.js'));
 assert.deepEqual(result,{expired:null,privateLoaded:false});assert.deepEqual(errors,[]);
 // Keep accelerated time separate from cross-tab expiry checks (which need a shared real clock).
 await other.close();await page.clock.install();await page.goto(origin);
 await page.getByRole('button',{name:'Accept',exact:true}).click();
 await page.clock.runFor(61000);
 assert.deepEqual((await events()).filter(x=>x.name==='landing_engagement').map(x=>x.params.seconds),[15,30,60]);
 console.log('Landing events, CTA placements, six templates, scroll/section deduplication, engagement, locale pageviews, consent, sanitization and mobile translations passed.');
}finally{await browser?.close();server.kill('SIGTERM')}
