import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {splitLetterGreeting} from '../packages/shared/letter-layout.js';
import {stationery,languages} from '../packages/shared/locales.js';
import {designs} from '../packages/shared/config.js';
import {createLetterPdf} from '../apps/api/src/pdf.js';

test('standalone greetings are separated in every language without changing names or body',()=>{
 for(const {code}of languages){
  const greeting=stationery[code].greeting('Zoë Łucja');
  assert.deepEqual(splitLetterGreeting(`${greeting}\r\n\r\nA kind Christmas wish.`,code),{greeting,body:'A kind Christmas wish.'});
 }
 assert.deepEqual(splitLetterGreeting('Dear Sophie,\n\nHello!','en-AU'),{greeting:'Dear Sophie,',body:'Hello!'});
 for(const body of ['A letter without a greeting.','Dear Sophie, here is your Christmas letter.\n\nKeep being kind.','Dear ,\n\nHello.'])assert.deepEqual(splitLetterGreeting(body),{greeting:'',body});
});

test('every design prints a large script greeting exactly once and keeps the body in serif',async()=>{
 for(const design of designs){
  const text='Dear Zoë Łucja,\n\nA warm Christmas wish for you.\n\nWith love,';
  const pdf=await createLetterPdf(text,design.id);
  const task=getDocument({data:new Uint8Array(pdf),useSystemFonts:true});const doc=await task.promise;
  const items=(await(await doc.getPage(1)).getTextContent()).items;
  const greeting=items.find(i=>i.str==='Dear Zoë Łucja,');
  const body=items.find(i=>i.str==='A warm Christmas wish for you.');
  assert(greeting);assert(body);assert.equal(greeting.height,26);assert(greeting.height>body.height*2);
  assert.notEqual(greeting.fontName,body.fontName);
  assert(items.some(i=>i.str==='Santa Claus'&&i.fontName===greeting.fontName));
  assert.equal(items.filter(i=>i.str.includes('Dear Zoë')).length,1);
  assert(greeting.transform[5]>body.transform[5]+20);
  await task.destroy();
 }
});

test('wide names wrap inside PDF margins and long letters keep their final words',async()=>{
 const name='W'.repeat(50),greeting=`Dear ${name},`;
 const pdf=await createLetterPdf(`${greeting}\n\n${'A warm Christmas wish for you. '.repeat(140)}\n\nFINAL WORDS`,'jolly');
 const task=getDocument({data:new Uint8Array(pdf),useSystemFonts:true});const doc=await task.promise;
 assert(doc.numPages>1);let all='';let count=0;
 for(let n=1;n<=doc.numPages;n++){
  const page=await doc.getPage(n),items=(await page.getTextContent()).items;
  all+=items.map(i=>i.str).join(' ');
  count+=items.filter(i=>i.str.includes('Dear')).length;
  for(const item of items.filter(i=>i.height===26)){
   assert.equal(n,1);assert(item.transform[4]>=57.9);assert(item.transform[4]+item.width<=page.view[2]-57);
  }
 }
 assert.equal(count,1);assert(all.replace(/\s/g,'').includes(greeting.replace(/\s/g,'')));assert(all.includes('FINAL WORDS'));
 await task.destroy();
});
