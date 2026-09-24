import {localeCode,stationery} from './locales.js';

export function capitaliseName(name){return name.trim().replace(/(^|[\s’'\-])(\p{L}+)/gu,(_,separator,word)=>separator+(separator.trim()===''&&separator&&['i','and','et','und','y','e'].includes(word)?word:word[0].toLocaleUpperCase()+word.slice(1)));}

// Only separate a standalone greeting in the saved letter's language.
// Legacy/custom letters without one must retain their complete first paragraph.
export function splitLetterGreeting(text,language='en'){
 const normalized=text.replace(/\r\n?/g,'\n');
 const [first,...rest]=normalized.split('\n');
 const greeting=first.trim();
 const [prefix,suffix]=stationery[localeCode(language)].greeting('\0').split('\0');
 const name=greeting.slice(prefix.length,suffix?-suffix.length:undefined);
 if(!greeting.startsWith(prefix)||!greeting.endsWith(suffix)||!name.trim()||greeting.length>160)return {greeting:'',body:normalized};
 let body=rest.join('\n').replace(/^\n+/,'');
 // Generated prose can repeat the same salutation without the heading's comma.
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const words=greeting.replace(/[,!:.?]+/g,' ').trim().split(/\s+/).map(escape);
 const repeated=new RegExp('^'+words.join('[,\\s]+')+'[,!:.?]+(?:\\s+|$)','iu');
 body=body.replace(repeated,'');
 const salutations={en:['Dear','Hello','Hi','Hey',"G’day","G'day"],pl:['Cześć','Witaj','Drogi','Droga','Kochany','Kochana'],de:['Hallo','Liebe','Lieber'],fr:['Bonjour','Salut','Cher','Chère'],es:['Hola','Querido','Querida']};
 const alternatives=salutations[localeCode(language)]||salutations.en;
 const namedGreeting=new RegExp('^(?:'+alternatives.map(escape).join('|')+')[,\\s]+'+escape(name.trim())+'[,!:.?]+(?:\\s+|$)','iu');
 body=body.replace(namedGreeting,'');
 return {greeting:prefix+capitaliseName(name)+suffix,body};
}
