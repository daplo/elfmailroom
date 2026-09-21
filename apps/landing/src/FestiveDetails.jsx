import React,{useEffect,useState} from 'react';
import {useLocale} from '@elf/shared/i18n';

// Small vector doodles use the same evergreen, cranberry and biscuit palette as the stationery.
export function ChristmasDoodle({kind,className=''}){
 const drawings={
  bell:<><path d="M32 25Q32 10 47 10Q62 10 62 25" stroke="#587653"/><path d="M25 54Q33 42 32 31Q32 20 47 20Q62 20 62 31Q61 42 69 54Z" fill="#dfbd78"/><path d="M23 54Q46 63 71 54L69 62Q46 69 25 62Z" fill="#d0a660"/><path d="M41 67Q47 78 53 67" fill="#a67942"/><path d="M46 20Q24 18 29 9Q36 3 46 20ZM48 20Q71 18 66 9Q59 3 48 20Z" fill="#ad5149" stroke="#ad5149"/><path d="M38 32Q36 42 33 46" stroke="#fff4cf" strokeWidth="3"/></>,
  mug:<><g className="cocoa-steam" stroke="#b39877"><path d="M31 25C20 16 39 16 31 6M45 23C35 13 53 14 45 3M58 26C48 16 66 16 58 7"/></g><path d="M66 37H73Q87 37 82 52Q78 60 66 58" stroke="#ad5149" strokeWidth="5"/><path d="M20 32H68V62Q68 74 55 74H33Q20 74 20 62Z" fill="#b85c50" stroke="#9f493f"/><ellipse cx="44" cy="33" rx="24" ry="5" fill="#76513c" stroke="#9f493f"/><rect x="30" y="28" width="10" height="8" rx="3" fill="#fff3dc" stroke="none"/><rect x="47" y="29" width="11" height="8" rx="3" fill="#fff3dc" stroke="none"/><path d="M44 62 33 52C25 43 39 40 44 48C50 39 62 44 55 52Z" fill="#fff0d4" stroke="none"/><path d="M15 79H76" stroke="#c6b89d"/></>,
  gift:<><g className="gift-box"><rect x="20" y="39" width="54" height="38" rx="3" fill="#dce4c7"/><path d="M43 39H52V77H43Z" fill="#ad5149" stroke="none"/></g><g className="gift-lid"><rect x="15" y="29" width="64" height="13" rx="3" fill="#e8ecd9"/><path d="M43 29H52V42H43Z" fill="#ad5149" stroke="none"/><path d="M47 29C20 31 23 7 36 13Q44 16 47 29ZM47 29C74 31 71 7 58 13Q50 16 47 29Z" fill="#bb6254" stroke="#a44c43"/></g><path d="m48 48 3 7 7 1-5 5 1 8-6-4-7 4 2-8-6-5 8-1Z" fill="#dfbd78" stroke="none"/></>,
  tree:<><path d="M43 67H53V81H43Z" fill="#bb9162"/><path d="M48 16 28 39H36L19 57H30L13 73H82L65 57H75L58 39H67Z" fill="#688367"/><path d="M32 43Q49 53 64 47M27 60Q48 72 70 64" stroke="#ebd9a7"/><path d="m48 3 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#dfbd78" stroke="#bc9452"/><g fill="#b75449" stroke="none"><circle cx="43" cy="36" r="3"/><circle cx="55" cy="57" r="3"/><circle cx="36" cy="65" r="3"/></g></>,
  stocking:<><path d="M36 24H65V53L76 61Q85 72 72 79Q65 83 56 78L28 60Q20 54 27 44Z" fill="#b75c50" stroke="#9d493f"/><path d="M32 19Q49 15 69 21L66 33Q50 28 30 31Z" fill="#f5ead4"/><path d="M30 45Q37 47 36 60M66 57Q58 65 61 80" stroke="#f5ead4" strokeWidth="4"/><path d="M38 18V9Q41 3 46 9V17" stroke="#587653"/><path d="m49 38 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1Z" fill="#ead3a0" stroke="none"/></>,
  letter:<><rect x="16" y="30" width="63" height="43" rx="4" fill="#f2e4c9"/><path d="m17 32 30 25 31-25M18 72 39 52M77 72 55 52" fill="none"/><path d="M31 31V15H65V31" fill="#fff7e8"/><path d="M38 22H57M39 27H52" stroke="#b7ac91"/><circle cx="47" cy="55" r="8" fill="#ad5149" stroke="#ad5149"/><path d="m47 50 2 3 4 1-3 2 1 4-4-2-3 2 1-4-3-2 4-1Z" fill="#edcf9b" stroke="none"/></>,
  heart:<><path d="M47 72 21 47C0 21 35 9 47 30C60 9 94 21 74 47Z" fill="#bc685b" stroke="#a45349"/><path d="M26 29Q33 24 37 29" stroke="#f5d6bd" strokeWidth="3"/><path d="m68 13 2-8M77 19l7-4M18 62l-7 4" stroke="#bb985c"/></>,
  robin:<><path d="m24 53-13 9 17 3" fill="#7e7256"/><ellipse cx="49" cy="49" rx="25" ry="22" fill="#ad9671"/><path d="M53 28Q83 26 76 52Q74 65 53 65Q36 46 53 28Z" fill="#b65c49" stroke="none"/><path d="M35 43Q57 45 50 58Q39 61 35 43Z" fill="#8f805e"/><circle cx="66" cy="36" r="2.5" fill="#394d3c" stroke="none"/><path d="m76 42 10 4-11 3" fill="#c49d57"/><path d="m44 71-3 9M57 71l3 9M23 81H74" stroke="#837552"/><path d="M54 27 65 10 80 30Z" fill="#ad5149" stroke="#ad5149"/><path d="M54 28Q69 24 80 30" stroke="#f3ead8" strokeWidth="6"/><circle cx="66" cy="10" r="4" fill="#f3ead8" stroke="none"/></>,
  gingerbread:<><path d="M34 30C19 10 48-2 56 16Q58 24 51 30L72 36Q82 41 76 49Q72 54 65 51L56 48 67 70Q71 79 61 82Q54 84 50 74L43 61 34 76Q29 86 21 80Q15 76 20 68L30 48 20 52Q9 54 8 45Q7 38 16 36Z" fill="#c79862" stroke="#ab7c4d"/><g stroke="#fff0d5"><path d="M17 40 20 47M65 39 69 46M24 69 31 74M55 73 62 70M35 23Q42 29 49 23"/></g><g fill="#735039" stroke="none"><circle cx="35" cy="18" r="2"/><circle cx="47" cy="18" r="2"/></g><circle cx="41" cy="43" r="3" fill="#ad5149" stroke="none"/><circle cx="42" cy="53" r="3" fill="#587653" stroke="none"/><path d="m40 33-9-4v9l9-4 10 5V29Z" fill="#ad5149" stroke="none"/></>
 };
 return <svg className={`christmas-doodle doodle-${kind} ${className}`} viewBox="0 0 96 90" fill="none" stroke="#647458" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{drawings[kind]||drawings.tree}</svg>;
}

const copy={
 en:{bell:['A little jingle?','Jingle, jingle!'],mug:['A little warmth?','A warm North Pole hug.'],gift:['A tiny surprise?','Wrapped in Christmas magic.'],gingerbread:['Say hello','Hello, little Christmas friend!']},
 de:{bell:['Ein kleines Klingeln?','Kling, Glöckchen, kling!'],mug:['Ein wenig Wärme?','Eine warme Umarmung vom Nordpol.'],gift:['Eine kleine Überraschung?','In Weihnachtszauber verpackt.'],gingerbread:['Sag Hallo','Hallo, kleiner Weihnachtsfreund!']},
 es:{bell:['¿Un tintineo?','¡Tilín, tilín!'],mug:['¿Un poquito de calor?','Un abrazo cálido del Polo Norte.'],gift:['¿Una sorpresita?','Envuelto en magia navideña.'],gingerbread:['Saluda','¡Hola, amiguito de Navidad!']},
 fr:{bell:['Un petit tintement ?','Ding, ding !'],mug:['Un peu de chaleur ?','Un câlin tout chaud du pôle Nord.'],gift:['Une petite surprise ?','Emballé de magie de Noël.'],gingerbread:['Dis bonjour','Bonjour, petit ami de Noël !']},
 pl:{bell:['Trochę dzwoneczków?','Dzyń, dzyń!'],mug:['Odrobina ciepła?','Ciepły uścisk z bieguna północnego.'],gift:['Mała niespodzianka?','Zapakowane w świąteczną magię.'],gingerbread:['Przywitaj się','Cześć, świąteczny przyjacielu!']}
};

export function CozySurprise({kind}){
 const{language}=useLocale();
 const[playing,setPlaying]=useState(false);
 const[label,message]=(copy[language]||copy.en)[kind];
 useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>setPlaying(false),2400);return()=>clearTimeout(timer)},[playing]);
 return <div className={`cozy-surprise surprise-${kind} ${playing?'is-playing':''}`} data-festive-enter>
  <button type="button" className="cozy-surprise-button" aria-label={label} onClick={()=>setPlaying(true)}>
   <span className="surprise-drawing"><ChristmasDoodle kind={kind}/><span className="surprise-sparkles" aria-hidden="true"><i>✧</i><i>✦</i><i>♡</i></span></span>
   <span className="surprise-label">{label}<span aria-hidden="true"> ↗</span></span>
  </button>
  <span className="surprise-message" role="status">{playing?message:''}</span>
 </div>;
}

export function FestiveFlourish({kind='tree'}){
 return <div className="festive-flourish" aria-hidden="true" data-festive-enter><span/><ChristmasDoodle kind={kind}/><span/></div>;
}

export function HangingOrnaments(){
 return <div className="hanging-ornaments" aria-hidden="true"><svg viewBox="0 0 130 150" fill="none" strokeLinecap="round"><path d="M29 0V55M91 0V90" stroke="#b8a984"/><g className="hanging-bauble"><path d="M24 55H34V63H24Z" fill="#b59859"/><circle cx="29" cy="83" r="22" fill="#b46557"/><path d="M9 82Q29 68 49 82M10 88Q29 75 49 88" stroke="#f1d6b0" strokeWidth="2"/><path d="M19 67 15 73" stroke="#f5d9c1" strokeWidth="3"/></g><g className="hanging-star"><path d="m91 89 6 13 14 2-10 10 2 14-12-7-13 7 3-14-11-10 15-2Z" fill="#dbba79" stroke="#be9b58"/></g></svg></div>;
}

export function useFestiveEntrances(){
 useEffect(()=>{
  if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('has-arrived');observer.unobserve(entry.target)}},{threshold:.35});
  document.querySelectorAll('[data-festive-enter]').forEach(element=>observer.observe(element));
  return()=>observer.disconnect();
 },[]);
}
