const baseURL=process.env.E2E_BASE_URL||'http://localhost:5173';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import {designs} from '../packages/shared/config.js';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(baseURL);await page.getByRole('button',{name:'Reject',exact:true}).click();await page.getByRole('heading',{level:1}).waitFor();await page.screenshot({path:'tests/desktop.png',fullPage:true});
assert.equal(await page.locator('.sample-design-picker input').count(),designs.length);
await page.locator('.raster-preview>img').waitFor();
await page.waitForFunction(()=>['ElfLetter','ElfSignature'].every(family=>[...document.fonts].some(font=>font.family===family&&font.status==='loaded')));
assert(await page.evaluate(()=>document.fonts.check('400 16px ElfLetter')&&document.fonts.check('600 32px ElfSignature')));
for(const width of [1440,360]){
 await page.setViewportSize({width,height:1000});
 for(const design of designs.filter(d=>['beach','barbecue'].includes(d.id))){
  await page.locator('.sample-design-option').filter({hasText:design.name}).click();
  assert(await page.locator(`.sample-design-picker input[value="${design.id}"]`).isChecked());
  await page.locator(`.design-${design.id}>img`).waitFor();
  await page.locator('.selected-sample').screenshot({path:`tests/australian-${design.id}-${width}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
}
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Oliver’s letter'}).click();assert.match(await page.locator('.preview-accessible p').textContent(),/Dear Oliver/);
await page.getByText('Is the letter really personalised?',{exact:true}).click();assert(await page.locator('.faq-list details').first().getAttribute('open')!==null);
await page.getByRole('link',{name:'Write a letter to Santa',exact:true}).click();await page.getByLabel('Their first name').fill('Mila');await page.getByLabel('What’s on their Christmas wish list?').fill('a telescope');await page.getByLabel('Something they’re proud of').fill('learning to swim');await page.getByRole('button',{name:'Pick a design',exact:true}).click();assert.equal(await page.locator('.letter-card').count(),0);assert.equal(await page.getByRole('radio').count(),designs.length);assert.equal(await page.locator('.raster-preview').count(),0);await page.getByRole('radio',{name:/Reindeer Wishes/}).check();assert(await page.getByRole('radio',{name:/Reindeer Wishes/}).isChecked());assert.equal(await page.getByRole('button',{name:'Edit the words'}).count(),0);await page.screenshot({path:'tests/designs-desktop.png',fullPage:true});await page.getByRole('button',{name:'Back to details'}).click();assert.equal(await page.getByLabel('Their first name').inputValue(),'Mila');await page.getByRole('button',{name:'Pick a design',exact:true}).click();assert.equal(await page.locator('.letter-card').count(),0);assert.equal(await page.getByRole('radio').count(),designs.length);await page.getByRole('button',{name:'Continue to payment'}).click();await page.getByLabel('Your email address').waitFor();assert.equal(await page.getByLabel('Password',{exact:false}).count(),0);assert.match(await page.locator('.order-summary').innerText(),/Reindeer Wishes/);assert(await page.getByRole('button',{name:'Pay US$3.99 & get my letter',exact:true}).isDisabled());assert.equal(await page.locator('.raster-preview').count(),0);await page.getByRole('button',{name:'Back to designs'}).click();await page.setViewportSize({width:360,height:800});await page.screenshot({path:'tests/designs-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.setViewportSize({width:360,height:800});await page.goto(baseURL);await page.screenshot({path:'tests/mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'Toggle menu'}).click();await page.getByRole('link',{name:'The letters',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Toggle menu'}).getAttribute('aria-expanded'),'false');assert.deepEqual(errors,[]);await browser.close();console.log('Desktop, mobile, navigation, examples, FAQ and letter builder passed.');
