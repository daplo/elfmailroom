import {revokeCheckoutAnalytics} from './checkout-analytics.js';
import React,{useEffect,useRef,useState} from 'react';
import {useLocale} from './i18n';
import {legalPath} from './seo';
import {consentKey,readConsent,saveConsent,startAnalytics,stopAnalytics} from './analytics';
const copy={
 pl:{title:'Kilka słów o plikach cookie',body:'Niezbędna pamięć pozwala Ci tworzyć list. Za Twoją zgodą opcjonalne pliki cookie pomagają nam zrozumieć, jak używane są nasze publiczne strony i płatności. Możesz odmówić i nadal korzystać ze wszystkich funkcji.',accept:'Akceptuj',reject:'Odrzuć',settings:'Ustawienia plików cookie',privacy:'Polityka prywatności',close:'Zamknij'},
 en:{title:'A little note about cookies',body:'We use essential storage to keep your letter journey working. With your permission, optional cookies help us understand how our public pages and checkout are used. You can say no and still use everything.',accept:'Accept',reject:'Reject',settings:'Cookie settings',privacy:'Privacy policy',close:'Close'},
 de:{title:'Ein kleiner Hinweis zu Cookies',body:'Notwendiger Speicher sorgt dafür, dass du deinen Brief erstellen kannst. Mit deiner Erlaubnis helfen uns optionale Cookies zu verstehen, wie unsere öffentlichen Seiten und der Checkout genutzt werden. Du kannst ablehnen und trotzdem alles nutzen.',accept:'Akzeptieren',reject:'Ablehnen',settings:'Cookie-Einstellungen',privacy:'Datenschutzerklärung',close:'Schließen'},
 es:{title:'Una pequeña nota sobre las cookies',body:'Usamos almacenamiento esencial para que puedas crear tu carta. Con tu permiso, las cookies opcionales nos ayudan a entender cómo se usan nuestras páginas públicas y el proceso de pago. Puedes rechazarlo y seguir usando todo.',accept:'Aceptar',reject:'Rechazar',settings:'Ajustes de cookies',privacy:'Política de privacidad',close:'Cerrar'},
 fr:{title:'Un petit mot sur les cookies',body:'Nous utilisons un stockage essentiel pour vous permettre de créer votre lettre. Avec votre accord, des cookies facultatifs nous aident à comprendre comment nos pages publiques et le paiement sont utilisés. Vous pouvez refuser et continuer à tout utiliser.',accept:'Accepter',reject:'Refuser',settings:'Paramètres des cookies',privacy:'Confidentialité',close:'Fermer'}
};
export default function CookieConsent(){
 const{language}=useLocale();const c=copy[language]||copy.en;
 const[open,setOpen]=useState(false);const[choice,setChoice]=useState(null);const heading=useRef(null);const trigger=useRef(null);
 const id=import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
 useEffect(()=>{
  function restore(){let value=null;try{value=readConsent(localStorage)}catch{}setChoice(value);setOpen(!value);if(value==='accepted')startAnalytics(id);else stopAnalytics(id)}
  restore();const sync=e=>{if(e.key===consentKey||e.key===null)restore()};window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[id]);
 function choose(value){if(value==='rejected')revokeCheckoutAnalytics();try{saveConsent(localStorage,value)}catch{}setChoice(value);setOpen(false);if(value==='accepted')startAnalytics(id);else stopAnalytics(id);requestAnimationFrame(()=>trigger.current?.focus())}
 return <><button className="cookie-settings" ref={trigger} onClick={()=>{setOpen(true);requestAnimationFrame(()=>heading.current?.focus())}} aria-expanded={open} aria-controls="cookie-banner">{c.settings}</button>{open&&<section id="cookie-banner" className="cookie-banner" role="region" aria-labelledby="cookie-title"><div><h2 id="cookie-title" ref={heading} tabIndex={-1}>{c.title}</h2><p>{c.body} <a href={legalPath('privacy',language)}>{c.privacy}</a></p></div><div className="cookie-actions"><button onClick={()=>choose('rejected')}>{c.reject}</button><button onClick={()=>choose('accepted')}>{c.accept}</button>{choice&&<button onClick={()=>{setOpen(false);trigger.current?.focus()}}>{c.close}</button>}</div></section>}</>;
}
