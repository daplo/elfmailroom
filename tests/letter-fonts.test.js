import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openSync} from 'fontkit';
import {createLetterPdf} from '../apps/api/src/pdf.js';
import {localizedSample} from '../packages/shared/locales.js';

test('the same Garamond font is bundled for browser and PDF with international glyphs and license',()=>{
 const browser='public/assets/fonts/EBGaramond.ttf',pdf='apps/api/assets/fonts/EBGaramond.ttf';
 assert.deepEqual(readFileSync(browser),readFileSync(pdf));
 const font=openSync(browser);assert.equal(font.familyName,'EB Garamond');
 for(const char of 'Zoë Łucja Jaś Małgosia Noël Émilie Grüße España Œuvre')assert(font.hasGlyphForCodePoint(char.codePointAt(0)),`Missing glyph: ${char}`);
 for(const root of ['public/assets/fonts','apps/api/assets/fonts'])assert.match(readFileSync(`${root}/OFL-EBGaramond.txt`,'utf8'),/SIL OPEN FONT LICENSE/);
});

test('PDF embeds Garamond body text while retaining the Caveat signature',async()=>{
 const pdf=await createLetterPdf(localizedSample('en'),'classic');
 assert.match(pdf.toString('latin1'),/EBGaramond/);
 assert.match(pdf.toString('latin1'),/Caveat/);
});
