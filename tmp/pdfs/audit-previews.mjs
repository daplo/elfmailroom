import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {designs} from '../../packages/shared/config.js';
import {localizedSample} from '../../packages/shared/locales.js';
const root='tmp/pdfs/layout-audit';await mkdir(root,{recursive:true});
const browser=await chromium.launch();
try{
 const page=await browser.newPage();let current;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',token='a'.repeat(64);
 await page.route('**/api/orders/**',route=>route.fulfill({json:{id,status:'paid',design:current.design,language:'en',generationStatus:'ready',emailStatus:'not_requested',version:1,accepted:false,rewritesRemaining:5,canRewrite:true,letter:current.text}}));
 for(const width of [360,1440]){
  await page.setViewportSize({width,height:1000});
  for(const design of designs){
   for(const kind of ['sample','long','name']){
    current={design:design.id,text:kind==='name'?localizedSample('en','Alexandria Charlotte Zoë Łucja'):kind==='sample'?localizedSample('en'):Array.from({length:44},(_,i)=>`Line ${i+1}: Christmas wishes, kindness and warm hugs from the North Pole.`).join('\n')};
    await page.goto('about:blank');
    await page.goto(`http://localhost:3001/write/purchase/${id}#token=${token}`);
    await page.locator(`.design-${design.id}>img`).waitFor();
    const src=await page.locator('.raster-preview>img').getAttribute('src');
    await sharp(Buffer.from(src.split(',')[1],'base64')).png().toFile(`${root}/preview-${design.id}-${width}-${kind}.png`);
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error(`Overflow ${design.id} ${width}`);
   }
  }
  const tiles=await Promise.all(designs.map(async(d,i)=>({input:await sharp(`${root}/preview-${d.id}-${width}-sample.png`).resize(300,630,{fit:'contain'}).png().toBuffer(),left:(i%3)*300,top:Math.floor(i/3)*630})));
  await sharp({create:{width:900,height:1260,channels:3,background:'#ddd'}}).composite(tiles).png().toFile(`${root}/preview-${width}-contact.png`);
 }
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('All six designs: normal and long purchase previews rendered at 360px and 1440px, without page errors or horizontal overflow.');
}finally{await browser.close()}
