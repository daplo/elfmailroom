import React,{useEffect,useRef,useState} from 'react';
import {useLocale} from '@elf/shared/i18n';
import {orderRequest} from './purchase-access';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
export default function PaidLetterPreview({id,version,text,language}){
 const {t}=useLocale(),host=useRef(null),[state,setState]=useState('loading');
 useEffect(()=>{
  let active=true,task;const canvases=host.current;canvases.replaceChildren();setState('loading');
  (async()=>{
   const response=await orderRequest(id,'/preview');if(!response.ok)throw new Error('Preview unavailable');
   const data=new Uint8Array(await response.arrayBuffer());if(!active)return;
   const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist');if(!active)return;GlobalWorkerOptions.workerSrc=workerUrl;
   task=getDocument({data});const pdf=await task.promise;
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);if(!active)return;
    const viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.cssText='display:block;width:100%;height:auto;margin-bottom:16px';canvas.setAttribute('aria-hidden','true');
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;if(!active)return;canvases.appendChild(canvas);
   }
   if(active)setState('ready');
  })().catch(()=>{if(active)setState('error')});
  return()=>{active=false;task?.destroy()};
 },[id,version]);
 return <article lang={language} className="paid-letter-preview" style={{minWidth:0,width:'100%'}}>
 {state!=='ready'&&<p role="status">{t(state==='error'?'Preview unavailable. Please try again.':'Preparing preview…')}</p>}
 <div ref={host}/><details className="preview-accessible"><summary>{t('Show accessible text')}</summary><p>{text}</p></details>
 </article>;
}
