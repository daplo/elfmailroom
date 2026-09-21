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
 await page.goto(origin+'/?private=secret#token');await page.locator('#cookie-banner').waitFor();
 assert.equal(loads,0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Reject',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Cookie settings',exact:true}).waitFor();assert.equal(await page.locator('#cookie-banner').count(),0);assert.equal(loads,0);
 await page.getByRole('button',{name:'Cookie settings',exact:true}).click();await page.getByRole('button',{name:'Accept',exact:true}).click();
 await page.waitForFunction(()=>!!document.getElementById('elf-analytics'));await page.waitForTimeout(100);assert.equal(loads,1);
 const commands=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 const event=commands.find(x=>x[0]==='event');assert.equal(event[2].page_location,origin+'/');assert.equal(event[2].page_referrer,'');assert(!JSON.stringify(commands).includes('secret'));
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
 console.log('Consent defaults, reject/accept/revoke, cookie deletion, cross-tab sync, sanitized events, expiry and mobile translations passed.');
}finally{await browser?.close();server.kill('SIGTERM')}
