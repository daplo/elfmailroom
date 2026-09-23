import CookieConsent from '@elf/shared/cookies';
import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Check,LockKeyhole} from 'lucide-react';
import {designs,getDesign,santaLetterPrice} from '@elf/shared';
import {letterLanguages,letterLanguageCode,letterLocaleCode,stationery} from '@elf/shared/locales';
import {LocaleProvider,useLocale,LanguagePicker,DigitalNotice} from '@elf/shared/i18n';
import {Logo,Button,SectionHeading} from '@elf/shared/ui';
import '@elf/shared/styles';
import {languagePath} from '@elf/shared/seo';
import {legalPath} from '@elf/shared/seo';
import Purchase from './Purchase';
import Admin from './Admin';
import {purchaseId} from './purchase-access';
async function api(url,data){const response=await fetch(`/api/${url}`,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const body=await response.json();if(!response.ok)throw new Error(body.error||'Please try again.');return body;}
function initial(){try{return JSON.parse(sessionStorage.getItem('elf-draft'))||{}}catch{return {}}}
const blank={name:'',wish:'',proud:'',pet:'',message:''};
const steps=['Letter details','Pick a design','Pay','Download PDF'];
function Progress({step}){const{t}=useLocale();return <ol className="progress four-steps">{steps.map((label,i)=><li key={label} className={step>=i+1?'current':''} aria-current={step===i+1?'step':undefined}><span>{step>i+1?<Check size={14}/>:i+1}</span>{t(label)}</li>)}</ol>}
function App(){
 const{language,t}=useLocale();const[saved]=useState(initial);const[step,setStep]=useState(1);
 const[details,setDetails]=useState(()=>({...blank,...saved.details,language:letterLanguageCode(saved.details?.language||language)}));
 const[design,setDesign]=useState(getDesign(saved.design).id);const[config,setConfig]=useState(null);const[error,setError]=useState('');const[busy,setBusy]=useState(false);const[consent,setConsent]=useState(false);const[email,setEmail]=useState(saved.email||'');
 useEffect(()=>{api('config').then(setConfig).catch(()=>setError('Please try again.'));if(new URLSearchParams(location.search).has('cancelled')){setStep(3);setError('You left checkout before finishing. Your details are still here.')}},[]);
 useEffect(()=>{document.title=`${t('Personalised Santa Letter')} | Elf Mailroom`},[language]);
 useEffect(()=>{try{sessionStorage.setItem('elf-draft',JSON.stringify({details,design,email}))}catch{}},[details,design,email]);
 function go(next){setError('');setStep(next);window.scrollTo(0,0)}
 function update(e){setDetails({...details,[e.target.name]:e.target.value})}
 async function checkout(e){e.preventDefault();setBusy(true);setError('');try{const result=await api('checkout',{details,design,email,consent,uiLanguage:language});if(result.purchaseUrl)sessionStorage.setItem('elf-latest-purchase',result.purchaseUrl);location.assign(result.url)}catch(e){setError(e.message);setBusy(false)}}
 return <><header className="builder-header"><Logo/><div className="customer-nav"><LanguagePicker/><a href={languagePath(language)}>← {t('Back to the mailroom')}</a></div></header><main className="builder">
 <SectionHeading title={t(['','Every bit of magic starts with them.','Dress their letter in Christmas magic.','A little magic, ready to make theirs.'][step])}/><DigitalNotice/><Progress step={step}/>
 {error&&step!==3&&<p className="error" role="alert">{t(error)}</p>}
 {step===1?<div className="builder-layout"><form className="form-card" onSubmit={e=>{e.preventDefault();go(2)}}><h2>{t('Tell Santa a little about them')}</h2><p>{t('First names and small details are perfect. No address or date of birth needed.')}</p>
 <label htmlFor="language">{t('Letter language')}</label><select id="language" name="language" value={details.language} onChange={update}>{letterLanguages.map(x=><option key={x.code} value={x.code}>{x.name}</option>)}</select>
 {[['name','Their first name',50],['wish','What’s on their Christmas wish list?',200],['proud','Something they’re proud of',200],['pet','A pet or special toy',80]].map(([key,label,maxLength])=><React.Fragment key={key}><label htmlFor={key}>{t(label)}{key==='pet'&&<small> · {t('optional')}</small>}</label><input id={key} name={key} autoComplete="off" required={key!=='pet'} maxLength={maxLength} value={details[key]} onChange={update}/></React.Fragment>)}
 <label htmlFor="message">{t('Their letter to Santa')} <small>· {t('optional')}</small></label><textarea id="message" name="message" maxLength={2000} value={details.message} onChange={update}/><Button href={null} type="submit">{t('Pick a design')}</Button><p className="helper">{t('Free to preview. No account or card needed.')}</p>
 </form><aside className="builder-aside"><img src="/assets/mailroom.webp" alt=""/><p>{t('A little letter. A whole lot of Christmas magic.')}</p><div className="notice">{t('Your draft stays in this browser tab until checkout.')}</div></aside></div>:step===2?<div className="design-stage">
 <fieldset className="design-options"><legend className="sr-only">{t('Choose your letter design')}</legend>{designs.map(theme=><label className={`design-option ${design===theme.id?'selected':''}`} key={theme.id}><input type="radio" name="design" value={theme.id} checked={design===theme.id} onChange={()=>setDesign(theme.id)}/><span className={`design-thumbnail illustrated-thumbnail thumb-${theme.id}`} aria-hidden="true" style={{backgroundImage:`url(/assets/stationery/${theme.art}-thumb.webp)`}}><b>{stationery[letterLocaleCode(details.language)].santa}</b><span className="mini-lines"/><i>{stationery[letterLocaleCode(details.language)].santa}</i></span><span className="design-option-heading">{t(theme.name)}<span className="design-check">{design===theme.id&&<Check size={13}/>}</span></span><small>{t(theme.description)}</small></label>)}</fieldset>
 <div className="review-actions design-navigation"><Button href={null} secondary onClick={()=>go(1)}>{t('Back to details')}</Button><Button href={null} onClick={()=>go(3)}>{t('Continue to payment')}</Button></div>
 </div>:<div className="builder-layout payment-layout payment-single"><form className="form-card" onSubmit={checkout}><h2>{t('Your Christmas delivery')}</h2><DigitalNotice/><div className="order-summary"><div><strong>{t('Personalised Santa Letter')}</strong><span>{t(getDesign(design).name)} · {letterLanguages.find(x=>x.code===details.language).name} · PDF</span></div><strong>{config?.priceLabel||santaLetterPrice.label}</strong></div><ul className="check-list"><li><Check size={15}/>{t('A downloadable, print-ready PDF')}</li><li><Check size={15}/>{t('Five rewrite requests included')}</li></ul>
 <label htmlFor="email">{t('Your email address')}</label><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/><p className="helper">{t(config?.emailEnabled?'We’ll email your private review link, then the PDF after you accept.':'Used for payment. Return to your private link to review and download.')}</p>
 <label className="check-label"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{t('I understand this is a digital PDF, with no postal delivery, and agree to the purchase terms.')}</span></label>
 <p className="helper policy-links"><a href={legalPath('terms',language)} target="_blank" rel="noreferrer">{t('Purchase terms')}</a><a href={legalPath('privacy',language)} target="_blank" rel="noreferrer">{t('Privacy')}</a><a href={legalPath('terms',language)+'#cancellation'} target="_blank" rel="noreferrer">{t('Cancellations and refunds')}</a></p>
 {error&&<p className="error" role="alert">{t(error)}</p>}<Button href={null} type="submit" disabled={busy||!config?.checkoutEnabled||!consent}><LockKeyhole size={16}/>{t(busy?'Opening secure checkout…':'Pay {price} & get my letter',{price:config?.priceLabel||santaLetterPrice.label})}</Button><p className="helper payment-note">{t('Secure payment with Stripe · No subscription')}</p>
 {!config?.checkoutEnabled&&<div className="notice">{t('Payments aren’t open yet. You can still preview the sample designs.')}</div>}<button type="button" className="link-button" onClick={()=>go(2)}>← {t('Back to designs')}</button>
 </form></div>}
 </main></>;
}
const id=purchaseId();createRoot(document.getElementById('root')).render(<LocaleProvider><CookieConsent/>{location.pathname.startsWith('/write/admin')?<Admin/>:id?<Purchase id={id}/>:<App/>}</LocaleProvider>);
