import {readConsent,consentKey} from './analytics.js';
// Reuse the consented landing-page identity without loading Google on private pages.
export function checkoutAnalyticsContext(){
 try{
  if(readConsent(localStorage)!=='accepted')return undefined;
  let clientId=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('_ga='))?.match(/^_ga=GA\d+\.\d+\.(\d+\.\d+)$/)?.[1];
  const saved=JSON.parse(sessionStorage.getItem('elf-ga-session')||'null');
  clientId ||= saved?.clientId||`${crypto.getRandomValues(new Uint32Array(1))[0]}.${Math.floor(Date.now()/1000)}`;
  const sessionId=saved?.clientId===clientId&&Number.isSafeInteger(saved.sessionId)?saved.sessionId:Math.floor(Date.now()/1000);
  sessionStorage.setItem('elf-ga-session',JSON.stringify({clientId,sessionId}));
  return {clientId,sessionId,consent:'accepted',expires:JSON.parse(localStorage.getItem(consentKey)).expires};
 }catch{return undefined;}
}
export function revokeCheckoutAnalytics(){
 try{
  const clientId=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('_ga='))?.match(/^_ga=GA\d+\.\d+\.(\d+\.\d+)$/)?.[1];
  const saved=JSON.parse(sessionStorage.getItem('elf-ga-session')||'null');
  for(const id of new Set([clientId,saved?.clientId].filter(Boolean)))fetch('/api/analytics/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:id}),keepalive:true}).catch(()=>{});
  sessionStorage.removeItem('elf-ga-session');
 }catch{}
}
