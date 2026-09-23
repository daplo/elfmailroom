import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readdir} from 'node:fs/promises';
import {designs} from '../packages/shared/config.js';
import {languages,translations} from '../packages/shared/locales.js';

test('all six stationery designs have matching browser and PDF assets and localized copy',async()=>{
 assert.equal(designs.length,6);
 assert.equal(new Set(designs.map(d=>d.id)).size,6);
 for(const design of designs){
  const web=await sharp(`public/assets/stationery/${design.art}-thumb.webp`).metadata();
  const pdf=await sharp(`apps/api/assets/stationery/${design.art}.jpg`).metadata();
  assert.equal(web.width/web.height,2/3,design.id);
  assert.equal(web.width,192);assert.equal(web.height,288);
  const preview=await sharp(`public/assets/stationery/${design.art}-preview.webp`).metadata();
  assert.equal(preview.width,512);assert.equal(preview.height,768);
  assert(pdf.width>preview.width);assert(pdf.height>preview.height);
  for(const {code}of languages){
   assert.ok(translations[code][design.name],`${code}: ${design.name}`);
   assert.ok(translations[code][design.description],`${code}: ${design.description}`);
  }
 }
 for(const id of ['beach','barbecue'])assert.equal(designs.find(d=>d.id===id).background,'#fffdf5');
});

test('public stationery contains only reduced derivatives, never print originals',async()=>{
 const files=await readdir('public/assets/stationery');
 assert.deepEqual(files.sort(),designs.flatMap(({art})=>[`${art}-thumb.webp`,`${art}-preview.webp`]).sort());
});
