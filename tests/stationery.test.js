import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {designs} from '../packages/shared/config.js';
import {languages,translations} from '../packages/shared/locales.js';

test('all six stationery designs have matching browser and PDF assets and localized copy',async()=>{
 assert.equal(designs.length,6);
 assert.equal(new Set(designs.map(d=>d.id)).size,6);
 for(const design of designs){
  const web=await sharp(`public/assets/stationery/${design.art}.webp`).metadata();
  const pdf=await sharp(`apps/api/assets/stationery/${design.art}.jpg`).metadata();
  assert.equal(web.width/web.height,2/3,design.id);
  assert.equal(web.width,pdf.width,design.id);assert.equal(web.height,pdf.height,design.id);
  for(const {code}of languages){
   assert.ok(translations[code][design.name],`${code}: ${design.name}`);
   assert.ok(translations[code][design.description],`${code}: ${design.description}`);
  }
 }
 for(const id of ['beach','barbecue'])assert.equal(designs.find(d=>d.id===id).background,'#fffdf5');
});
