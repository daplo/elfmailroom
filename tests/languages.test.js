import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {languages,letterLanguages,letterLocaleCode,stationery,localizedSample,translate,digitalNotice,translations,orderLanguage} from '../packages/shared/locales.js';
import {createLetterGenerator,letterDetailsSchema} from '../apps/api/src/letter-generator.js';
import {createLetterPdf} from '../apps/api/src/pdf.js';
import {createEmailSender} from '../apps/api/src/email.js';
const child={name:'Zoë',wish:'a bicycle',proud:'being kind'};
test('supported languages are validated, defaulted for legacy orders, and passed as trusted generation instructions on rewrites',async()=>{
 assert.equal(letterDetailsSchema.parse(child).language,'en-GB');assert.equal(orderLanguage({child_details:null}),'en');assert.throws(()=>letterDetailsSchema.parse({...child,language:'xx'}));
 for(const language of letterLanguages){let request;const generate=createLetterGenerator({client:{responses:{create:async value=>{request=value;return {status:'completed',output_text:JSON.stringify({paragraphs:['A fictional paragraph long enough for the schema.','A second fictional paragraph long enough for the schema.','A final fictional paragraph long enough for the schema.'],closing:'With a warm Christmas hug,'})}}}}});const result=await generate({...child,language:language.code},{previousLetter:'old prose',requests:[{instructions:'Make it shorter',avoid:[]}]});assert(request.instructions.includes(`Required output language: ${language.prompt}.`));assert(request.instructions.includes("regional variety's spelling"));assert.equal(JSON.parse(request.input).child_details.language,language.code);assert(result.letter.startsWith(stationery[letterLocaleCode(language.code)].greeting(child.name)));}
});
test('all five locales have complete strings and PDFs preserve accents, localized stationery and clean output',async()=>{
 for(const{code}of languages){for(const key of Object.keys(translations.en)){assert.equal(typeof translations[code][key],'string',`${code}: ${key}`);assert.deepEqual(translations[code][key].match(/\{\w+\}/g)||[],key.match(/\{\w+\}/g)||[],`Placeholders: ${code}: ${key}`);}const pdf=await createLetterPdf(localizedSample(code,'Zoë'),'jolly',code);const document=await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;let text='';for(let i=1;i<=document.numPages;i++)text+=(await(await document.getPage(i)).getTextContent()).items.map(i=>i.str).join(' ');assert(text.includes(stationery[code].santa));assert(text.includes('Zoë'));assert(!text.includes(stationery[code].watermark));const normalized=text.replace(/\s/g,'');assert(normalized.includes(localizedSample(code,'Zoë').split('\n').at(-1).replace(/\s/g,'')));}
});
test('review and PDF delivery emails follow the saved letter language and explain digital-only delivery',async()=>{
 for(const{code}of languages){const messages=[];const sender=createEmailSender({env:{EMAIL_FROM:'santa@example.com',PUBLIC_URL:'https://example.com',ORDER_LINK_SECRET:'a'.repeat(64)},pdf:async()=>Buffer.from('%PDF-test'),transport:{sendMail:async message=>{messages.push(message);return {messageId:'test',accepted:['parent@example.com']}}}});const order={id:'one',status:'paid',letter:localizedSample(code),design:'jolly',buyer_email:'parent@example.com',child_details:JSON.stringify({...child,language:code}),link_token_hash:'test',letter_version:1,accepted_version:null};await sender(order);await sender({...order,accepted_version:1});assert.equal(messages[0].subject,translate(code,'Your Santa letter is ready to review ✨'));for(const m of messages){assert(m.text.includes(translate(code,digitalNotice)));assert(m.html.includes(`lang="${code}"`))}assert.equal(messages[0].attachments.length,1);assert.equal(messages[1].attachments[0].contentType,'application/pdf');}
});

test('Polish PDFs preserve native names and diacritics',async()=>{
 const name='Łucja, Jaś i Małgosia';
 const pdf=await createLetterPdf(localizedSample('pl',name),'classic','pl');
 const doc=await getDocument({data:new Uint8Array(pdf),useSystemFonts:true}).promise;
 let text='';for(let i=1;i<=doc.numPages;i++)text+=(await(await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');
 assert(text.includes(name));assert(text.includes('Święty Mikołaj'));assert(text.includes('śnieżny'));
});
