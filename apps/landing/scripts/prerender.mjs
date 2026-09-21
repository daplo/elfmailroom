import {createServer,loadEnv} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {legalConfig,policyVersion,policyDocument,legalPath} from '../../../packages/shared/legal.js';
import {languages} from '../../../packages/shared/locales.js';
import {seoData,seoHead,siteOrigin,defaultSiteUrl,sitemap} from '../../../packages/shared/seo.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist');
const env=loadEnv('production',path.join(root,'../..'),'VITE_');
const origin=siteOrigin(process.env.VITE_SITE_URL||env.VITE_SITE_URL||defaultSiteUrl);
const server=await createServer({root,server:{middlewareMode:true},appType:'custom'});
try{
 const{render}=await server.ssrLoadModule('/src/render.jsx');const template=await readFile(path.join(dist,'index.html'),'utf8');
 for(const{code}of languages){const directory=code==='en'?dist:path.join(dist,code);await mkdir(directory,{recursive:true});const html=template.replace('<html lang="en">',`<html lang="${code}">`).replace(/<!-- SEO START -->[\s\S]*?<!-- SEO END -->/,`<!-- SEO START -->${seoHead(seoData(code,{origin}))}<!-- SEO END -->`).replace('<div id="root"></div>',()=>`<div id="root">${render(code)}</div>`);await writeFile(path.join(directory,'index.html'),html);}
 const policies=legalConfig({...env,...process.env});
 await writeFile(path.join(dist,'legal-manifest.json'),JSON.stringify({version:policyVersion,config:policies}));
 await writeFile(path.join(dist,'legal.css'),await readFile(path.join(root,'src/legal.css')));
 for(const{code}of languages)for(const type of ['privacy','terms']){const directory=path.join(dist,legalPath(type,code));await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'index.html'),policyDocument(type,code,policies,{origin,stylesheet:'/legal.css'}));}
 await writeFile(path.join(dist,'sitemap.xml'),sitemap(origin));
 // Let crawlers see /write/ noindex rather than blocking that instruction in robots.txt.
 await writeFile(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
 console.log('Pre-rendered English, German, Spanish, French and Polish landing pages; generated sitemap and robots.txt.');
}finally{await server.close()}
