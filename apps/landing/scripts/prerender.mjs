import {createServer,loadEnv} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {legalConfig,policyVersion,policyDocument,legalPath} from '../../../packages/shared/legal.js';
import {languages} from '../../../packages/shared/locales.js';
import {blogArticles,blogPath} from '../../../packages/shared/blog.js';
import {blogSeoData,seoData,seoHead,siteOrigin,defaultSiteUrl,sitemap,languagePath} from '../../../packages/shared/seo.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist');
const env=loadEnv('production',path.join(root,'../..'),'VITE_');
const origin=siteOrigin(process.env.VITE_SITE_URL||env.VITE_SITE_URL||defaultSiteUrl);
const server=await createServer({root,server:{middlewareMode:true},appType:'custom'});
try{
 const{render}=await server.ssrLoadModule('/src/render.jsx');const template=await readFile(path.join(dist,'index.html'),'utf8');
 async function writePage(route,code,data){const directory=route==='/'?dist:path.join(dist,route);await mkdir(directory,{recursive:true});const html=template.replace('<html lang="en">',`<html lang="${code}">`).replace(/<!-- SEO START -->[\s\S]*?<!-- SEO END -->/,`<!-- SEO START -->${seoHead(data)}<!-- SEO END -->`).replace('<div id="root"></div>',()=>`<div id="root">${render(code,route)}</div>`);await writeFile(path.join(directory,'index.html'),html);}
 for(const{code}of languages){await writePage(languagePath(code),code,seoData(code,{origin}));await writePage(blogPath(code),code,blogSeoData(code,'',origin));for(const article of blogArticles)await writePage(blogPath(code,article.slug),code,blogSeoData(code,article.slug,origin));}
 const policies=legalConfig({...env,...process.env});
 await writeFile(path.join(dist,'legal-manifest.json'),JSON.stringify({version:policyVersion,config:policies}));
 await writeFile(path.join(dist,'legal.css'),await readFile(path.join(root,'src/legal.css')));
 for(const{code}of languages)for(const type of ['privacy','terms']){const directory=path.join(dist,legalPath(type,code));await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'index.html'),policyDocument(type,code,policies,{origin,stylesheet:'/legal.css'}));}
 await writeFile(path.join(dist,'sitemap.xml'),sitemap(origin));
 // Let crawlers see /write/ noindex rather than blocking that instruction in robots.txt.
 await writeFile(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
 console.log('Pre-rendered landing pages and blog articles in English, German, Spanish, French and Polish; generated sitemap and robots.txt.');
}finally{await server.close()}
