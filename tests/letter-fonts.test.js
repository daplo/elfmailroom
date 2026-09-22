import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openSync} from 'fontkit';
import {createLetterPdf} from '../apps/api/src/pdf.js';
import {localizedSample} from '../packages/shared/locales.js';
import {designs,letterBodyInk,letterBorderInk} from '../packages/shared/config.js';

test('the same Garamond font is bundled for browser and PDF with international glyphs and license',()=>{
 const browser='public/assets/fonts/EBGaramond.ttf',pdf='apps/api/assets/fonts/EBGaramond.ttf';
 assert.deepEqual(readFileSync(browser),readFileSync(pdf));
 const font=openSync(browser);assert.equal(font.familyName,'EB Garamond');
 for(const char of 'Zoë Łucja Jaś Małgosia Noël Émilie Grüße España Œuvre')assert(font.hasGlyphForCodePoint(char.codePointAt(0)),`Missing glyph: ${char}`);
 for(const root of ['public/assets/fonts','apps/api/assets/fonts'])assert.match(readFileSync(`${root}/OFL-EBGaramond.txt`,'utf8'),/SIL OPEN FONT LICENSE/);
});

test('Allura is identical in browser and PDF and covers the supported languages',()=>{
 assert.deepEqual(readFileSync('public/assets/fonts/Allura-Regular.ttf'),readFileSync('apps/api/assets/fonts/Allura-Regular.ttf'));
 const font=openSync('public/assets/fonts/Allura-Regular.ttf');assert.equal(font.familyName,'Allura');
 for(const char of 'Dear Zoë Łucja Jaś Małgosia Noël Émilie Grüße España Œuvre')assert(font.hasGlyphForCodePoint(char.codePointAt(0)),`Missing glyph: ${char}`);
 for(const root of ['public/assets/fonts','apps/api/assets/fonts'])assert.match(readFileSync(`${root}/OFL-Allura.txt`,'utf8'),/SIL OPEN FONT LICENSE/);
});

test('every design uses neutral cream paper, never blue or green body panels',()=>{
 for(const design of designs){
  assert.equal(design.background,'#fffdf5',design.id);
  for(const key of ['frameInset','frameTop','frameBottom'])assert(design[key]>.015&&design[key]<.05,`${design.id} ${key}`);
 }
 assert.equal(letterBodyInk,'#294e3d');
 assert.equal(letterBorderInk,'#d2ad64');
});

test('PDF embeds Garamond body text and elegant Allura script, not Caveat',async()=>{
 const pdf=await createLetterPdf(localizedSample('en'),'classic');
 assert.match(pdf.toString('latin1'),/EBGaramond/);
 assert.match(pdf.toString('latin1'),/Allura/);
 assert.doesNotMatch(pdf.toString('latin1'),/Caveat/);
});
