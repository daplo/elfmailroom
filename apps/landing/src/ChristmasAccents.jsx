import React,{useEffect,useState} from 'react';
import {Snowflake} from 'lucide-react';
import {useLocale} from '@elf/shared/i18n';

const snowLabels={en:'Let it snow',de:'Lass es schneien',es:'Que nieve',fr:'Que la neige tombe',pl:'Niech pada śnieg'};

export function Holly({className=''}){
 return <svg className={`christmas-holly ${className}`} viewBox="0 0 90 60" fill="none" aria-hidden="true" focusable="false">
  <path d="M44 43C24 43 9 31 8 10L20 15 24 5 32 18 43 16 40 28 49 34Z" fill="#587653"/>
  <path d="M47 42C51 21 66 10 84 13L77 24 86 31 72 34 70 45 60 41 54 50Z" fill="#365d45"/>
  <path d="M18 19 45 43M75 22 50 43" stroke="#c4d0ab" strokeWidth="1.3" strokeLinecap="round"/>
  <circle cx="43" cy="43" r="6" fill="#aa443e"/><circle cx="54" cy="44" r="6" fill="#c05a49"/><circle cx="48" cy="52" r="6" fill="#963c38"/>
  <circle cx="41" cy="41" r="1.5" fill="#e8bcb0"/><circle cx="52" cy="42" r="1.5" fill="#ecc5b3"/>
 </svg>;
}

export default function ChristmasAccents(){
 const{language}=useLocale();
 const[snowing,setSnowing]=useState(false);
 useEffect(()=>{if(!snowing)return;const timer=setTimeout(()=>setSnowing(false),4500);return()=>clearTimeout(timer)},[snowing]);
 return <>
  <svg className="christmas-lights" viewBox="0 0 560 100" fill="none" aria-hidden="true" focusable="false">
   <path d="M5 12Q280 120 555 12" stroke="#859176" strokeWidth="1.5"/>
   {[{x:45,y:26},{x:120,y:48},{x:200,y:62},{x:280,y:66},{x:360,y:62},{x:440,y:48},{x:515,y:26}].map(({x,y},i)=><g key={x} className={`christmas-bulb bulb-${i%3}`} style={{'--bulb-delay':`${i*150}ms`}}>
    <path d={`M${x} ${y}v9`} stroke="#859176" strokeWidth="1.5"/>
    <ellipse cx={x} cy={y+16} rx="5" ry="7" fill="currentColor"/>
    <path d={`M${x-2} ${y+14}v3`} stroke="#fff9e8" strokeWidth="1.5" strokeLinecap="round"/>
   </g>)}
  </svg>
  <span className="christmas-spark spark-one" aria-hidden="true">✧</span>
  <span className="christmas-spark spark-two" aria-hidden="true">✦</span>
  <Holly className="hero-holly"/>
  {snowing&&<div className="christmas-snow" aria-hidden="true">{Array.from({length:24},(_,i)=><span key={i} style={{'--snow-x':`${8+(i*37)%84}%`,'--snow-delay':`${(i%8)*100}ms`,'--snow-size':`${3+i%4}px`,'--snow-drift':`${(i%2?1:-1)*(15+i%5*8)}px`}}/>)}</div>}
  <button type="button" className="snow-button" aria-pressed={snowing} onClick={()=>setSnowing(value=>!value)}><Snowflake size={16} aria-hidden="true"/>{snowLabels[language]||snowLabels.en}</button>
 </>;
}
