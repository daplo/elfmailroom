import express from 'express';
import path from 'node:path';

const year=365*24*60*60,week=7*24*60*60;
const media=/\.(?:avif|webp|png|jpe?g|gif|svg|ico|woff2?|ttf|otf)$/i;
// Only Vite's content-hashed bundles get immutable caching, not named public files.
const bundle=/^assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css)$/;
function headers(directory,privateHtml=false){return(res,file)=>{
 const relative=path.relative(directory,file).split(path.sep).join('/');
 const seconds=bundle.test(relative)?year:media.test(relative)?week:0;
 const privatePage=privateHtml&&path.extname(file)==='.html';
 res.setHeader('Cache-Control',privatePage?'no-store':seconds?`public, max-age=${seconds}${seconds===year?', immutable':''}`:'no-cache');
 res.setHeader('Expires',new Date(seconds?Date.now()+seconds*1000:0).toUTCString());
};}

export function mountStaticFiles(app,{landingDir,letterDir}){
 app.use('/write',(req,res,next)=>{res.set('X-Robots-Tag','noindex, nofollow');next();});
 app.use('/write',express.static(letterDir,{setHeaders:headers(letterDir,true)}));
 app.get('/write/{*path}',(req,res)=>{
  res.set({'Cache-Control':'no-store',Expires:new Date(0).toUTCString()});
  res.sendFile(path.join(letterDir,'index.html'),{cacheControl:false});
 });
 app.use(express.static(landingDir,{setHeaders:headers(landingDir)}));
}
