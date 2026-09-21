import React from 'react';
import {useLocale} from './i18n';
import {languagePath} from './seo.js';
import { ArrowRight, Sparkles } from 'lucide-react';
export function Logo(){const{t,language}=useLocale();return <a className="logo" href={languagePath(language)} aria-label="Elf Mailroom home"><img className="logo-stamp" src="/assets/elf-mailroom-stamp.svg" width="54" height="60" alt=""/><span>elf mailroom<small>{t('THE NORTH POLE POSTAL SERVICE')}</small></span></a>}
export function Button({children,href='/write/',secondary=false,...props}){return href?<a className={`button ${secondary?'secondary':''}`} href={href} {...props}>{children}<ArrowRight size={17}/></a>:<button className={`button ${secondary?'secondary':''}`} {...props}>{children}<ArrowRight size={17}/></button>}
export function SectionHeading({eyebrow,title,children}){return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children&&<p>{children}</p>}</div>}
export function Stamp({small=false}){return <div className={`stamp ${small?'small':''}`}><span>NORTH POLE</span><Sparkles size={small?22:30}/><span>SPECIAL DELIVERY</span></div>}
export {default as LetterCard} from './LetterPreview.jsx';
