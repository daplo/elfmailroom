import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import sharp from 'sharp';
import {createLetterPdf} from '../../apps/api/src/pdf.js';
import {designs} from '../../packages/shared/config.js';
import {localizedSample} from '../../packages/shared/locales.js';

const root='tmp/pdfs/layout-audit';await mkdir(root,{recursive:true});
const stats=[];
for(const design of designs){
 for(const [kind,text] of [['sample',localizedSample('en')],['long',Array.from({length:44},(_,i)=>`Line ${i+1}: Christmas wishes, kindness and warm hugs from the North Pole.`).join('\n')]]){
  const pdf=await createLetterPdf(text,design.id,'en');
  await writeFile(`${root}/${design.id}-${kind}.pdf`,pdf);
  const task=getDocument({data:new Uint8Array(pdf),useSystemFonts:true}),doc=await task.promise;
  for(let i=1;i<=doc.numPages;i++){
   const page=await doc.getPage(i),viewport=page.getViewport({scale:1.5});
   const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   await writeFile(`${root}/${design.id}-${kind}-${i}.png`,canvas.toBuffer('image/png'));
   const items=(await page.getTextContent()).items.filter(v=>v.str);
   const body=items.filter(v=>v.str.startsWith('Line '));
   const signature=items.find(v=>v.str==='Santa Claus'&&v.height>26);
   stats.push({design:design.id,kind,page:i,pages:doc.numPages,bodyBottom:body.length?Math.max(...body.map(v=>page.view[3]-v.transform[5])):null,signature:signature?{top:page.view[3]-signature.transform[5]-signature.height,bottom:page.view[3]-signature.transform[5]}:null});
  }
  await task.destroy();
 }
}
for(const kind of ['sample','long']){
 const tiles=await Promise.all(designs.map(async(d,i)=>({input:await sharp(`${root}/${d.id}-${kind}-1.png`).resize(360,510,{fit:'contain'}).png().toBuffer(),left:(i%3)*360,top:Math.floor(i/3)*510})));
 await sharp({create:{width:1080,height:1020,channels:3,background:'#dddddd'}}).composite(tiles).png().toFile(`${root}/${kind}-contact.png`);
}
await writeFile(`${root}/measurements.json`,JSON.stringify(stats,null,2));console.log(JSON.stringify(stats));
