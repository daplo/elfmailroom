import {useEffect} from 'react';
import {blogSeoData,seoData,seoHead,defaultSiteUrl} from '@elf/shared/seo';
export default function Seo({language,checkoutEnabled,blogSlug,blogIndex=false}){
 useEffect(()=>{
  const origin=import.meta.env.VITE_SITE_URL||defaultSiteUrl;
  const data=blogIndex||blogSlug!==undefined?blogSeoData(language,blogSlug||'',origin):seoData(language,{origin,checkoutEnabled});
  if(!data)return;
  const template=document.createElement('template');template.innerHTML=seoHead(data);
  for(const next of template.content.children){
   let selector;if(next.tagName==='TITLE')selector='title';else if(next.tagName==='SCRIPT')selector='#elf-schema';else if(next.tagName==='LINK')selector=next.rel==='canonical'?'link[rel="canonical"]':`link[rel="alternate"][hreflang="${next.hreflang}"]`;else selector=next.hasAttribute('property')?`meta[property="${next.getAttribute('property')}"]`:`meta[name="${next.name}"]`;
   const old=document.head.querySelector(selector);if(old)old.replaceWith(next.cloneNode(true));else document.head.appendChild(next.cloneNode(true));
  }
 },[language,checkoutEnabled,blogSlug,blogIndex]);
 return null;
}
