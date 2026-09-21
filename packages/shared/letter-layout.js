import {localeCode,stationery} from './locales.js';

// Only separate a standalone greeting in the saved letter's language.
// Legacy/custom letters without one must retain their complete first paragraph.
export function splitLetterGreeting(text,language='en'){
 const normalized=text.replace(/\r\n?/g,'\n');
 const [first,...rest]=normalized.split('\n');
 const greeting=first.trim();
 const [prefix,suffix]=stationery[localeCode(language)].greeting('\0').split('\0');
 const name=greeting.slice(prefix.length,suffix?-suffix.length:undefined);
 if(!greeting.startsWith(prefix)||!greeting.endsWith(suffix)||!name.trim()||greeting.length>160)return {greeting:'',body:normalized};
 return {greeting,body:rest.join('\n').replace(/^\n+/,'')};
}
