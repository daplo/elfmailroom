import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createLetterPdf} from '../apps/api/src/pdf.js';
import {makeReply,designs} from '../packages/shared/config.js';
async function read(pdf){const doc=await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;let text='';for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);text+=(await page.getTextContent()).items.map(i=>i.str).join(' ');}return {text,pages:doc.numPages,metadata:await doc.getMetadata()};}
test('all designs generate readable A4 PDFs with embedded international names',async()=>{for(const design of designs){const pdf=await createLetterPdf(makeReply({name:'Zoë Łucja',wish:'a teddy',proud:'learning to swim'}),design.id);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.match(pdf.toString('latin1'),/\/Subtype \/Image/);const result=await read(pdf);assert.match(result.text,/Zoë Łucja/);assert.match(result.text,/learning to swim/);assert.match(result.text,/a teddy/);assert.equal(result.metadata.info.Subject,design.name);assert.equal(result.pages,1);}});
test('long letters keep the final words across multiple decorated pages',async()=>{const text='Dear Sophie,\n\n'+('Christmas wishes and warm hugs from the North Pole. '.repeat(100))+'\n\nTHE VERY LAST WORDS';const result=await read(await createLetterPdf(text,'starlight'));assert(result.pages>1);assert.match(result.text,/THE VERY LAST WORDS/);assert.equal((result.text.replace(/\s/g,'').match(/FROMTHEDESKOF/g)||[]).length,result.pages);});
