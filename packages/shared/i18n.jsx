import React,{createContext,useContext,useEffect,useState} from 'react';
import {languages,localeCode,translate,digitalNotice} from './locales.js';
import {languageFromPath,localizedPath} from './seo.js';
import {refreshAnalyticsPage} from './analytics.js';
const Context=createContext({language:'en',setLanguage:()=>{},t:(key,values)=>translate('en',key,values)});
function initial(publicRoutes){if(typeof location==='undefined')return 'en';if(publicRoutes)return languageFromPath(location.pathname);try{return localeCode(new URLSearchParams(location.search).get('lang')||localStorage.getItem('elf-language')||'en')}catch{return 'en'}}
export function LocaleProvider({children,initialLanguage,publicRoutes=false}){
 const[language,setCurrent]=useState(()=>initialLanguage?localeCode(initialLanguage):initial(publicRoutes));
 function setLanguage(value){const code=localeCode(value);if(publicRoutes)history.pushState({},'',localizedPath(location.pathname,code)+location.hash);setCurrent(code)}
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('elf-language',language)}catch{}},[language]);
 useEffect(()=>{if(publicRoutes)refreshAnalyticsPage()},[language,publicRoutes]);
 useEffect(()=>{if(!publicRoutes)return;const navigate=()=>setCurrent(languageFromPath(location.pathname));window.addEventListener('popstate',navigate);return()=>window.removeEventListener('popstate',navigate)},[publicRoutes]);
 return <Context.Provider value={{language,setLanguage,t:(key,values)=>translate(language,key,values)}}>{children}</Context.Provider>
}
export const useLocale=()=>useContext(Context);
export function LanguagePicker(){const{language,setLanguage,t}=useLocale();return <label className="language-picker"><span className="sr-only">{t('Website language')}</span><select aria-label={t('Website language')} value={language} onChange={e=>setLanguage(e.target.value)}>{languages.map(x=><option key={x.code} value={x.code} lang={x.code}>{x.name}</option>)}</select></label>}
export function DigitalNotice(){const{t}=useLocale();return <p className="digital-notice">{t(digitalNotice)}</p>}
