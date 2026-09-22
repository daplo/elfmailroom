import React,{useEffect,useRef,useState} from 'react';
import {getDesign,letterBodyInk,letterBorderInk} from './config.js';
import {localeCode,stationery} from './locales.js';
import {useLocale} from './i18n';
import {splitLetterGreeting} from './letter-layout.js';
import {loadLetterFonts,letterFontFamilies} from './letter-fonts.js';
function wrap(ctx,text,maxWidth){const lines=[];for(const paragraph of text.split('\n')){if(!paragraph.trim()){lines.push('');continue}let line='';for(const word of paragraph.split(/\s+/)){if(ctx.measureText(line+(line?' ':'')+word).width<=maxWidth){line+=(line?' ':'')+word;continue}if(line)lines.push(line);line='';for(const char of word){if(ctx.measureText(line+char).width>maxWidth){lines.push(line);line=''}line+=char}}if(line)lines.push(line)}return lines;}
export async function renderPreview({text,design,language,width}){
 const theme=getDesign(design),copy=stationery[localeCode(language)];
 await loadLetterFonts();
 const art=new Image();art.src=`/assets/stationery/${theme.art}.webp`;await art.decode();
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const margin=width<400?28:45,font=width<400?16:18,lineHeight=font*1.6;
 const {greeting,body}=splitLetterGreeting(text,language);
 const greetingFont=width<400?34:40,greetingLineHeight=greetingFont*1.2;
 ctx.font=`400 ${greetingFont}px ${letterFontFamilies.script}`;
 const greetingLines=greeting?wrap(ctx,greeting,width-margin*2):[];
 const greetingHeight=greetingLines.length?greetingLines.length*greetingLineHeight+16:0;
 ctx.font=`400 ${font}px ${letterFontFamilies.body}`;const lines=wrap(ctx,body,width-margin*2);
 // Include the full footer scene: .47 cropped Santa's hat and the reindeer's antlers.
 const top=Math.max(width*.31,180),bodyTop=top+greetingHeight,footer=width*(theme.previewFooterRatio??(design==='jolly'?.67:.55)),height=Math.ceil(bodyTop+lines.length*lineHeight+110+footer);
 canvas.width=Math.ceil(width*2);canvas.height=height*2;ctx.scale(2,2);
 ctx.fillStyle=theme.background;ctx.fillRect(0,0,width,height);
 const artHeight=art.height*width/art.width;
 ctx.save();ctx.beginPath();ctx.rect(0,0,width,width*.31);ctx.clip();ctx.drawImage(art,0,0,width,artHeight);ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(0,height-footer,width,footer);ctx.clip();ctx.drawImage(art,0,height-artHeight,width,artHeight);ctx.restore();
 // Cover each source artwork's original side rule and continue one consistent frame through the writing area.
 const frameInset=width*theme.frameInset;
 const frameTop=width*theme.frameTop,frameBottom=width*theme.frameBottom;
 ctx.save();ctx.strokeStyle=letterBorderInk;ctx.lineWidth=2.5;
 ctx.beginPath();ctx.moveTo(frameInset,frameTop);ctx.lineTo(frameInset,height-frameBottom);ctx.moveTo(width-frameInset,frameTop);ctx.lineTo(width-frameInset,height-frameBottom);ctx.moveTo(frameInset,frameTop);ctx.lineTo(width-frameInset,frameTop);ctx.moveTo(frameInset,height-frameBottom);ctx.lineTo(width-frameInset,height-frameBottom);ctx.stroke();
 ctx.restore();
 ctx.fillStyle=theme.accent;ctx.textAlign='center';ctx.font='8px Arial';ctx.fillText(copy.desk,width/2,top-85);
 ctx.font=`400 ${width<400?30:36}px ${letterFontFamilies.body}`;ctx.fillStyle=theme.ink;ctx.fillText(copy.santa,width/2,top-48,width-margin*2);
 ctx.strokeStyle=theme.border;ctx.beginPath();ctx.moveTo(margin,top-29);ctx.lineTo(width-margin,top-29);ctx.stroke();
 ctx.font='7px Arial';ctx.fillText(copy.post,width/2,top-14,width-margin*2);
 ctx.textAlign='left';ctx.fillStyle=theme.accent;ctx.font=`400 ${greetingFont}px ${letterFontFamilies.script}`;
 greetingLines.forEach((line,i)=>ctx.fillText(line,margin,top+greetingFont+i*greetingLineHeight));
 ctx.fillStyle=letterBodyInk;ctx.font=`400 ${font}px ${letterFontFamilies.body}`;lines.forEach((line,i)=>ctx.fillText(line,margin,bodyTop+22+i*lineHeight));
 const signY=bodyTop+lines.length*lineHeight+46;ctx.fillStyle=theme.accent;ctx.font=`400 ${width<400?34:40}px ${letterFontFamilies.script}`;ctx.fillText(copy.signature||copy.santa,margin,signY,width-margin*2);
 ctx.textAlign='center';ctx.font='6px Arial';ctx.fillText(copy.footer,width/2,signY+32,width-margin*2);
 // Watermark is part of the JPEG pixels, not a removable CSS overlay.
 ctx.fillStyle='rgba(125,73,62,0.23)';ctx.font=`bold ${width<400?15:23}px Arial`;ctx.textAlign='center';
 for(let y=95;y<height;y+=180){ctx.save();ctx.translate(width/2,y);ctx.rotate(-Math.PI/7);ctx.fillText(copy.watermark,0,0,width*.92);ctx.restore()}
 return canvas.toDataURL('image/jpeg',.88);
}
export default function LetterPreview({text,design='classic',sample=false,language}){
 const{language:uiLanguage,t}=useLocale();const code=localeCode(language||uiLanguage);const host=useRef(null);const[width,setWidth]=useState(0);const[state,setState]=useState({});
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setWidth(Math.round(entry.contentRect.width)));observer.observe(host.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!width)return;let active=true;setState({});renderPreview({text,design,language:code,width}).then(src=>{if(active)setState({src})}).catch(()=>{if(active)setState({error:true})});return()=>{active=false}},[text,design,code,width]);
 return <article ref={host} className={`letter-card raster-preview design-${design} ${sample?'sample-letter':''}`} lang={code} aria-label={t('Watermarked letter preview')}>
 {state.src?<img src={state.src} alt={t('Watermarked letter preview')} draggable={false} onContextMenu={e=>e.preventDefault()}/>:<p role="status">{t(state.error?'Preview unavailable. Please try again.':'Preparing preview…')}</p>}
 <details className="preview-accessible"><summary>{t('Show accessible text')}</summary><p>{text}</p></details>
 </article>;
}
