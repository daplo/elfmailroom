export const consentKey='elf-cookie-consent-v1';
export const consentLifetime=180*24*60*60*1000;
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
 if(!/^G-[A-Z0-9]+$/.test(id||'')||!/^\/(de\/|es\/|fr\/|pl\/)?$/.test(location.pathname)||window.__elfAnalyticsLoaded)return false;
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
 window.gtag('event','page_view',{page_location:location.origin+location.pathname,page_referrer:'',page_title:'Elf Mailroom'});
 const script=document.createElement('script');script.id='elf-analytics';script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(script);
 return true;
}
export function stopAnalytics(id){
 if(id)window['ga-disable-'+id]=true;
 clearAnalyticsCookies();
 // Reload removes the already-running Google script and its event listeners.
 if(window.__elfAnalyticsLoaded)location.reload();
}
