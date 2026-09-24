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
  assert(greeting);assert(body);assert.equal(greeting.height,30);assert(greeting.height>body.height*2);
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
  for(const item of items.filter(i=>i.height===30)){
   assert.equal(n,1);assert(item.transform[4]>=57.9);assert(item.transform[4]+item.width<=page.view[2]-57);
  }
 }
 assert.equal(count,1);assert(all.replace(/\s/g,'').includes(greeting.replace(/\s/g,'')));assert(all.includes('FINAL WORDS'));
 await task.destroy();
});

test('repeated Polish salutation is removed without losing the following sentence',()=>{
 assert.deepEqual(splitLetterGreeting('Cześć, Daniel!\n\nCześć Daniel! W mojej wierzbie dzwonki dźwięczą.','pl'),{greeting:'Cześć, Daniel!',body:'W mojej wierzbie dzwonki dźwięczą.'});
});

test('200-word letters keep their closing and signature on one page in all designs',async()=>{
 const paragraph='Your kindness brings joy to everyone around you. The elves are preparing wonderful surprises while the reindeer practise flying across the snowy sky. Keep learning and sharing your lovely smile with your family and friends. You make Christmas feel magical.';
 const letter='Dear Daniel,\n\n'+Array(5).fill(paragraph).join('\n\n')+'\n\nWarm wishes and a cosy night!';
 for(const design of designs){
  const task=getDocument({data:new Uint8Array(await createLetterPdf(letter,design.id)),useSystemFonts:true});
  const pdf=await task.promise;assert.equal(pdf.numPages,1,design.id);
  const items=(await(await pdf.getPage(1)).getTextContent()).items;
  assert(items.some(i=>i.str.includes('Warm wishes and a cosy night!')),design.id);
  assert(items.some(i=>i.str==='Santa Claus'&&i.height===32),design.id);
  await task.destroy();
 }
});

test('alternate greetings for the same child are removed without removing prose or other names',()=>{
 for(const hello of ['Hello Daniel!', 'Hi Daniel,', "G’day Daniel!"]){
  assert.deepEqual(splitLetterGreeting('Dear daniel,\n\n'+hello+' Your cookies arrived.'),{greeting:'Dear Daniel,',body:'Your cookies arrived.'});
 }
 assert.equal(splitLetterGreeting('Dear Daniel,\n\nHello Sophie! Keep smiling.').body,'Hello Sophie! Keep smiling.');
 assert.equal(splitLetterGreeting('Dear Daniel,\n\nHello from the North Pole!').body,'Hello from the North Pole!');
});

test('greeting capitalises name initials while preserving existing internal capitals',()=>{
 for(const [name,expected] of [['daniel','Daniel'],['zoë łucja','Zoë Łucja'],['anna-marie', 'Anna-Marie'],["o’neill",'O’Neill'],['McDonald','McDonald']]){
  assert.equal(splitLetterGreeting(`Dear ${name},\n\nChristmas is coming.`).greeting,`Dear ${expected},`);
 }
});
