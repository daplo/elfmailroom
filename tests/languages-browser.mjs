import {createLetterPdf} from '../apps/api/src/pdf.js';
const baseURL=process.env.E2E_BASE_URL||'http://localhost:5173';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {seoCopy,languagePath} from '../packages/shared/seo.js';
import {languages,letterLanguages,translate,localizedSample,digitalNotice} from '../packages/shared/locales.js';
const browser=await chromium.launch();const errors=[];
try{
 for(const {code} of languages){
  const letterCode=code==='en'?'en-GB':code;
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const t=(key,values)=>translate(code,key,values);
  await page.goto(baseURL);await page.getByRole('button',{name:'Reject',exact:true}).click();await page.locator('.language-picker select').selectOption(code);
  assert.equal(await page.locator('html').getAttribute('lang'),code);await page.getByRole('heading',{name:seoCopy[code].h1}).waitFor();assert(await page.getByText(t(digitalNotice),{exact:true}).count()>=2);
  await page.locator('.raster-preview:not([inert] *)>img').waitFor();assert((await page.locator('.raster-preview:not([inert] *)>img').getAttribute('src')).startsWith('data:image/jpeg;base64,'));
  await page.getByRole('link',{name:t('Write a letter to Santa'),exact:true}).click();await page.getByLabel(t('Letter language'),{exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('lang'),code);assert.equal(await page.getByLabel(t('Letter language'),{exact:true}).inputValue(),letterCode);
  await page.getByLabel(t('Their first name'),{exact:true}).fill('Zoë');await page.getByLabel(t('What’s on their Christmas wish list?'),{exact:true}).fill('a telescope');await page.getByLabel(t('Something they’re proud of'),{exact:true}).fill('being kind');
  await page.getByRole('button',{name:t('Pick a design'),exact:true}).click();await page.getByRole('radio',{name:new RegExp(t('Jolly Christmas Pals'))}).check();assert.equal(await page.getByRole('radio').count(),6);
  assert.equal(await page.locator('.raster-preview').count(),0);
  await page.locator('.design-stage').screenshot({path:`tests/preview-${code}.png`});
  // UI switching never changes the selected letter language or the saved draft.
  const alternate=code==='fr'?'en':'fr';await page.locator('.language-picker select').selectOption(alternate);await page.getByRole('button',{name:translate(alternate,'Back to details'),exact:true}).click();assert.equal(await page.getByLabel(translate(alternate,'Letter language'),{exact:true}).inputValue(),letterCode);assert.equal(await page.locator('#name').inputValue(),'Zoë');
  await page.locator('.language-picker select').selectOption(code);await page.reload();assert.equal(await page.locator('#language').inputValue(),letterCode);assert.equal(await page.locator('#name').inputValue(),'Zoë');
  await page.getByRole('button',{name:t('Pick a design'),exact:true}).click();await page.getByRole('button',{name:t('Continue to payment'),exact:true}).click();await page.getByLabel(t('Your email address'),{exact:true}).waitFor();assert.match(await page.locator('.check-label').innerText(),new RegExp(t('I understand this is a digital PDF, with no postal delivery, and agree to the purchase terms.').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert((await page.locator('.order-summary').innerText()).includes(letterLanguages.find(x=>x.code===letterCode).name));
  await page.setViewportSize({width:360,height:800});assert.equal(await page.locator('.raster-preview').count(),0);await page.screenshot({path:`tests/checkout-${code}-mobile.png`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code} checkout overflow`);
  await page.goto(baseURL+languagePath(code));await page.locator('.raster-preview:not([inert] *)>img').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code} landing overflow`);await page.screenshot({path:`tests/landing-${code}-mobile.png`,fullPage:true});const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',token='a'.repeat(64);
  await page.route('**/api/orders/**',async route=>new URL(route.request().url()).pathname.endsWith('/preview')?route.fulfill({contentType:'application/pdf',body:await createLetterPdf(localizedSample(code,'Zoë'),'jolly',code)}):route.fulfill({json:{id,status:'paid',design:'jolly',language:code,generationStatus:'ready',emailStatus:'not_requested',version:1,accepted:false,rewritesRemaining:5,canRewrite:true,letter:localizedSample(code,'Zoë')}}));
  await page.goto(`${baseURL}/write/purchase/${id}#token=${token}`);await page.getByRole('button',{name:t('Request changes'),exact:true}).click();await page.getByLabel(t('What would you like Santa to change?'),{exact:true}).waitFor();assert.equal(await page.locator('.paid-letter-preview').getAttribute('lang'),code);await page.locator('.paid-letter-preview canvas').first().waitFor();assert.equal(await page.locator('.preview-accessible p').textContent(),localizedSample(code,'Zoë'));await page.getByRole('button',{name:t('Accept & download PDF'),exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code} purchase overflow`);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Five languages: JPEG previews, persisted letter/UI choices, translated checkout, digital-only consent, desktop/mobile passed.');
}finally{await browser.close()}
