import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {mountStaticFiles} from '../apps/api/src/static-files.js';

test('static HTTP caching distinguishes versioned bundles, media, public HTML and private HTML',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'elf-cache-'));
 const landingDir=path.join(temp,'landing'),letterDir=path.join(temp,'letter');
 for(const dir of [landingDir,letterDir]){
  await mkdir(path.join(dir,'assets/stationery'),{recursive:true});
  await writeFile(path.join(dir,'assets/stationery/santa.webp'),'private original must never be served');
  for(const file of ['index.html','legal.css','sitemap.xml','assets/index-Ab12_cd3.js','assets/index-Xy12-z34.css','assets/photo.webp','assets/font.ttf'])await writeFile(path.join(dir,file),'fixture');
 }
 const app=express();mountStaticFiles(app,{landingDir,letterDir});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const prefix of ['', '/write'])for(const[file,age]of [['assets/index-Ab12_cd3.js',31536000],['assets/index-Xy12-z34.css',31536000],['assets/photo.webp',604800],['assets/font.ttf',604800]]){
   const response=await fetch(`${origin}${prefix}/${file}`);assert.equal(response.status,200);
   assert.equal(response.headers.get('cache-control'),`public, max-age=${age}${age===31536000?', immutable':''}`);
   assert(Math.abs(Date.parse(response.headers.get('expires'))-Date.now()-age*1000)<5000);
   const conditional=await fetch(`${origin}${prefix}/${file}`,{headers:{'If-None-Match':response.headers.get('etag'),'Cache-Control':'max-age=0'}});
   assert.equal(conditional.status,304);assert.equal(conditional.headers.get('cache-control'),response.headers.get('cache-control'));
  }
  for(const route of ['/','/index.html','/legal.css','/sitemap.xml']){
   const response=await fetch(origin+route);assert.equal(response.headers.get('cache-control'),'no-cache');
   assert.equal(Date.parse(response.headers.get('expires')),0);
  }
  for(const route of ['/write/','/write/index.html','/write/admin','/write/purchase/example']){
   const response=await fetch(origin+route);assert.equal(response.status,200);
   assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('x-robots-tag'),/noindex/);
  }
  for(const prefix of ['', '/write']){
   const original=await fetch(origin+prefix+'/assets/stationery/santa.webp');
   assert.equal(original.status,404);assert.equal(original.headers.get('cache-control'),'no-store');
   assert.equal(await original.text(),'');
  }
  const missing=await fetch(origin+'/assets/missing-Ab12_cd3.js');assert.equal(missing.status,404);assert.equal(missing.headers.get('expires'),null);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
});
