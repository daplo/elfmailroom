import {defineConfig,loadEnv} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {legalConfig,policyDocument} from '../../packages/shared/legal.js';
import {blogSeoData,languageFromPath,seoData,seoHead,defaultSiteUrl} from '../../packages/shared/seo.js';
import {findBlogArticle} from '../../packages/shared/blog.js';
export default defineConfig(({mode})=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),env={...loadEnv(mode,root,'VITE_'),...process.env};
 const origin=env.VITE_SITE_URL||defaultSiteUrl;
 return {
  envDir:'../..',publicDir:'../../public',ssr:{noExternal:['@elf/shared']},
  plugins:[{
   name:'localized-public-pages',
   configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
     const pathname=new URL(req.url,'http://localhost').pathname;
     const policy=/^\/(?:(de|es|fr|pl)\/)?(privacy|terms)\/?$/.exec(pathname);
     try{
      if(policy){
       res.setHeader('Content-Type','text/html; charset=utf-8');
       res.setHeader('X-Robots-Tag','noindex, follow');
       return res.end(policyDocument(policy[2],policy[1]||'en',legalConfig(env),{origin}));
      }
      const blog=/^\/(?:(de|es|fr|pl)\/)?blog(?:\/([^/]+))?\/?$/.exec(pathname);
      if(!['GET','HEAD'].includes(req.method)||(!/^\/(?:(de|es|fr|pl)\/?)?$/.test(pathname)&&!blog))return next();
      if(blog?.[2]&&!findBlogArticle(blog[2]))return next();
      // Match production: crawlers and link previews receive localized HTML without running React.
      const language=languageFromPath(pathname);
      const{render}=await server.ssrLoadModule('/src/render.jsx');
      let html=await readFile(new URL('./index.html',import.meta.url),'utf8');
      const data=blog?blogSeoData(language,blog[2]||'',origin):seoData(language,{origin});
      html=html.replace('<html lang="en">',`<html lang="${language}">`)
       .replace(/<!-- SEO START -->[\s\S]*?<!-- SEO END -->/,`<!-- SEO START -->${seoHead(data)}<!-- SEO END -->`)
       .replace('<div id="root"></div>',()=>`<div id="root">${render(language,pathname)}</div>`);
      html=await server.transformIndexHtml(req.url,html);
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(req.method==='HEAD'?undefined:html);
     }catch(error){server.ssrFixStacktrace(error);next(error)}
    });
   }
  }],
  server:{proxy:{'/api':'http://localhost:3001','/write':{target:'http://localhost:5174',ws:true}}}
 };
});
