// Visual QA for the Australian templates using the application's real PDF renderer.
// Run: node scripts/render-stationery.mjs
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {createLetterPdf} from '../apps/api/src/pdf.js';
import {makeReply} from '../packages/shared/config.js';

await mkdir('tmp/pdfs',{recursive:true});
for(const design of ['beach','barbecue']){
 const pdf=await createLetterPdf(makeReply({name:'Sophie',wish:'a surfboard',proud:'learning to swim'}),design,'en-AU');
 await writeFile(`tmp/pdfs/${design}.pdf`,pdf);
 const loadingTask=getDocument({data:new Uint8Array(pdf),useSystemFonts:true});
 const document=await loadingTask.promise;
 for(let i=1;i<=document.numPages;i++){
  const page=await document.getPage(i),viewport=page.getViewport({scale:1.5});
  const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  await writeFile(`tmp/pdfs/${design}-${i}.png`,canvas.toBuffer('image/png'));
 }
 console.log(`${design}: ${document.numPages} page(s) rendered to tmp/pdfs`);
 await loadingTask.destroy();
}
