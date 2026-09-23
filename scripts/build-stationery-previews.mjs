// Public derivatives only. Original print artwork stays under apps/api/assets.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {designs} from '../packages/shared/config.js';
await mkdir('public/assets/stationery',{recursive:true});
for(const {art} of designs){
 const source=`apps/api/assets/stationery/${art}.jpg`;
 for(const [kind,width] of [['thumb',192],['preview',512]]){
  const height=width*1.5;
  const marks=Array.from({length:8},(_,i)=>`<text x="${width/2}" y="${height*(i+.5)/8}" text-anchor="middle" font-family="sans-serif" font-size="${width*.045}" font-weight="bold" fill="#795b50" fill-opacity="0.32" transform="rotate(-15 ${width/2} ${height*(i+.5)/8})">ELF MAILROOM · PREVIEW</text>`).join('');
  await sharp(source).resize(width,height).composite([{input:Buffer.from(`<svg width="${width}" height="${height}">${marks}</svg>`)}]).webp({quality:75}).toFile(`public/assets/stationery/${art}-${kind}.webp`);
 }
}
