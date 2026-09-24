import {observeLandingEvents} from './landing-events.js';
export const consentKey='elf-cookie-consent-v1';
export const consentLifetime=180*24*60*60*1000;
const publicPath=path=>/^\/(de\/|es\/|fr\/|pl\/)?$/.test(path);
const languages=['en','de','es','fr','pl'];
const placements=['header','hero','samples','pricing','final','footer','other'];
const sections=['hero','how-it-works','letters','parents','pricing','faq','final','footer'];
const schema={
 landing_view:{},create_letter_click:{placement:placements},
 scroll_depth:{percent_scrolled:[25,50,75,90,100]},section_view:{section_id:sections},
 landing_engagement:{seconds:[15,30,60]},
 navigation_click:{section_id:sections,placement:placements},
 template_select:{template_id:['classic','woodland','starlight','jolly','beach','barbecue']},
 sample_letter_select:{sample_id:['sample_1','sample_2']},
 faq_open:{faq_id:[1,2,3,4,5,6,7,8,9,10,11,12]},
 language_select:{target_language:languages,placement:['header','footer']},
 menu_toggle:{action:['open','close']},
 festive_interaction:{interaction:['snow','bell','mug','gift','gingerbread'],action:['start','stop','play']},
 footer_link_click:{destination:['privacy','terms','refunds','contact']}
};
export function sanitizeEvent(name,parameters={}){
 if(!Object.hasOwn(schema,name))return null;
 const safe={};
 for(const [key,allowed] of Object.entries(schema[name])){
  if(!allowed.includes(parameters[key]))return null;
  safe[key]=parameters[key];
 }
 return safe;
}
let activeId=null,expires=0,cleanup=null,lastPage=null;
function enabled(){return !!activeId&&Date.now()<expires&&publicPath(location.pathname)&&!window['ga-disable-'+activeId]}
function pageParameters(){return {page_location:location.origin+location.pathname,page_referrer:'',page_title:'Elf Mailroom',site_language:location.pathname.split('/')[1]||'en'}}
export function trackEvent(name,parameters={}){
 if(!enabled())return false;
 const safe=sanitizeEvent(name,parameters);if(!safe)return false;
 window.gtag('event',name,{...safe,...pageParameters(),transport_type:'beacon'});
 return true;
}
export function refreshAnalyticsPage(){
 if(!enabled()||lastPage===location.pathname)return;
 lastPage=location.pathname;
 window.gtag('set',pageParameters());
 window.gtag('event','page_view',pageParameters());
}
export function readConsent(storage,now=Date.now()){
 try{const value=JSON.parse(storage.getItem(consentKey));return value?.version===1&&['accepted','rejected'].includes(value.choice)&&value.expires>now&&value.expires<=now+consentLifetime?value.choice:null}catch{return null}
}
export function saveConsent(storage,choice){try{storage.setItem(consentKey,JSON.stringify({version:1,choice,expires:Date.now()+consentLifetime}))}catch{/* Consent still applies to this page if storage is blocked. */}}
export function clearAnalyticsCookies(){
 const names=document.cookie.split(';').map(x=>x.trim().split('=')[0]).filter(x=>/^_ga(?:_|$)/.test(x));
 const parts=location.hostname.split('.');
 for(const name of names){document.cookie=`${name}=; Max-Age=0; Path=/`;for(let i=0;i<parts.length;i++)document.cookie=`${name}=; Max-Age=0; Path=/; Domain=${parts.slice(i).join('.')}`;}
}
export function startAnalytics(id){
 // Never run third-party analytics on forms, private purchases or admin routes.
 if(!/^G-[A-Z0-9]+$/.test(id||'')||!publicPath(location.pathname)||window.__elfAnalyticsLoaded)return false;
 activeId=id;expires=Date.now()+consentLifetime;
 try{const stored=JSON.parse(localStorage.getItem(consentKey));if(stored?.choice==='accepted')expires=Math.min(expires,stored.expires)}catch{}
 window.__elfAnalyticsLoaded=true;
 window['ga-disable-'+id]=false;
 window.dataLayer=window.dataLayer||[];
 window.gtag=function(){window.dataLayer.push(arguments)};
 window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 window.gtag('js',new Date());
 window.gtag('config',id,{
  send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
  cookie_expires:180*24*60*60,cookie_update:false,
  page_location:location.origin+location.pathname,page_referrer:'',page_title:'Elf Mailroom'
 });
 refreshAnalyticsPage();
 trackEvent('landing_view');
 cleanup=observeLandingEvents(trackEvent);
 window.gtag('get',id,'client_id',clientId=>window.gtag('get',id,'session_id',sessionId=>{
  try{if(readConsent(localStorage)==='accepted'&&/^\d+\.\d+$/.test(clientId)&&Number.isSafeInteger(Number(sessionId)))sessionStorage.setItem('elf-ga-session',JSON.stringify({clientId,sessionId:Number(sessionId)}))}catch{}
 }));
 const script=document.createElement('script');script.id='elf-analytics';script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(script);
 return true;
}
export function stopAnalytics(id){
 cleanup?.();cleanup=null;activeId=null;lastPage=null;
 if(id)window['ga-disable-'+id]=true;
 clearAnalyticsCookies();
 // Reload removes the already-running Google script and its event listeners.
 if(window.__elfAnalyticsLoaded)location.reload();
}
