const baseURL=process.env.E2E_BASE_URL||'http://localhost:5173';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import {designs} from '../packages/shared/config.js';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.letterPaints=[];const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,...args){
  if(this.font.includes('Elf'))window.letterPaints.push({font:this.font,fill:this.fillStyle,ready:document.fonts.check(this.font,text)});
  return fill.call(this,text,...args);
 };
});
await page.goto(baseURL);await page.getByRole('button',{name:'Reject',exact:true}).click();await page.getByRole('heading',{level:1}).waitFor();await page.screenshot({path:'tests/desktop.png',fullPage:true});
assert.equal(await page.locator('.sample-design-picker input').count(),designs.length);
assert.equal(await page.getByText('Six illustrated themes',{exact:true}).count(),3);
const themeRow=page.locator('.sample-design-grid');
assert(await themeRow.evaluate(row=>row.scrollWidth>row.clientWidth));
assert.equal(await page.locator('.sample-design-option').evaluateAll(cards=>new Set(cards.map(card=>card.offsetTop)).size),1);
await page.locator('.raster-preview>img').waitFor();
assert(await page.evaluate(()=>['ElfLetterCanvas','ElfScriptCanvas'].every(family=>[...document.fonts].some(face=>face.family===family&&face.status==='loaded'))));
assert(await page.evaluate(()=>window.letterPaints.length>5&&window.letterPaints.every(p=>p.ready)));
assert(await page.evaluate(()=>window.letterPaints.some(p=>p.font==='18px ElfLetterCanvas')&&window.letterPaints.some(p=>p.font==='40px ElfScriptCanvas')));
for(const design of designs){
 await page.locator(`input[name="sample-design"][value="${design.id}"]`).locator('..').click();
 const preview=page.locator(`.design-${design.id}>img`);await preview.waitFor();
 const pixel=await preview.evaluate(image=>{
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  return [...ctx.getImageData(12,Math.floor(canvas.height*.45),1,1).data];
 });
 assert(pixel.slice(0,3).every((channel,i)=>Math.abs(channel-[255,253,245][i])<=3),`${design.id}: body paper ${pixel}`);
}
assert(await page.evaluate(()=>window.letterPaints.filter(p=>p.font==='18px ElfLetterCanvas').every(p=>p.fill==='#294e3d')),'All preview body text uses the same evergreen ink');
for(const font of ['EBGaramond.ttf','Allura-Regular.ttf']){
 const missingFontPage=await browser.newPage();
 await missingFontPage.route('**/assets/fonts/'+font,route=>route.abort());
 await missingFontPage.goto(baseURL);
 await missingFontPage.getByText('Preview unavailable. Please try again.',{exact:true}).waitFor();
 assert.equal(await missingFontPage.locator('.raster-preview>img').count(),0,'Do not bake fallback fonts into a preview');
 await missingFontPage.close();
}
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
// Mobile preview scroll changes the design without returning to the thumbnail row.
const carousel=page.locator('.sample-preview-carousel');
for(const index of [0,1,5,4]){
 await carousel.evaluate((el,index)=>el.scrollTo({left:el.clientWidth*index,behavior:'instant'}),index);
 await page.waitForFunction(id=>document.querySelector(`input[name="sample-design"][value="${id}"]`).checked,designs[index].id);
 assert.equal(await page.locator('.sample-caption strong').textContent(),designs[index].name);
}
await carousel.focus();await page.keyboard.press('ArrowLeft');
await page.waitForFunction(id=>document.querySelector(`input[name="sample-design"][value="${id}"]`).checked,designs[3].id);
await page.locator('.sample-design-option').first().click();
await page.waitForFunction(()=>document.querySelector('.sample-preview-carousel').scrollLeft===0);
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Oliver’s letter'}).click();assert.match(await page.locator('.preview-accessible p').textContent(),/Dear Oliver/);
await page.getByText('Is the letter really personalised?',{exact:true}).click();assert(await page.locator('.faq-list details').first().getAttribute('open')!==null);
await page.getByRole('link',{name:'Write a letter to Santa',exact:true}).click();await page.getByLabel('Their first name').fill('Mila');await page.getByLabel('What’s on their Christmas wish list?').fill('a telescope');await page.getByLabel('Something they’re proud of').fill('learning to swim');await page.getByRole('button',{name:'Pick a design',exact:true}).click();assert.equal(await page.locator('.letter-card').count(),0);assert.equal(await page.getByRole('radio').count(),designs.length);assert.equal(await page.locator('.raster-preview').count(),0);await page.getByRole('radio',{name:/Reindeer Wishes/}).check();assert(await page.getByRole('radio',{name:/Reindeer Wishes/}).isChecked());assert.equal(await page.getByRole('button',{name:'Edit the words'}).count(),0);await page.screenshot({path:'tests/designs-desktop.png',fullPage:true});await page.getByRole('button',{name:'Back to details'}).click();assert.equal(await page.getByLabel('Their first name').inputValue(),'Mila');await page.getByRole('button',{name:'Pick a design',exact:true}).click();assert.equal(await page.locator('.letter-card').count(),0);assert.equal(await page.getByRole('radio').count(),designs.length);await page.getByRole('button',{name:'Continue to payment'}).click();await page.getByLabel('Your email address').waitFor();assert.equal(await page.getByLabel('Password',{exact:false}).count(),0);assert.match(await page.locator('.order-summary').innerText(),/Reindeer Wishes/);assert(await page.getByRole('button',{name:'Pay US$3.99 & get my letter',exact:true}).isDisabled());assert.equal(await page.locator('.raster-preview').count(),0);await page.getByRole('button',{name:'Back to designs'}).click();await page.setViewportSize({width:360,height:800});await page.screenshot({path:'tests/designs-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.setViewportSize({width:360,height:800});await page.goto(baseURL);await page.screenshot({path:'tests/mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'Toggle menu'}).click();await page.getByRole('link',{name:'The letters',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Toggle menu'}).getAttribute('aria-expanded'),'false');assert.deepEqual(errors,[]);await browser.close();console.log('Desktop, mobile, navigation, examples, FAQ and letter builder passed.');
