import nodemailer from 'nodemailer';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {getDesign} from '../../../packages/shared/config.js';
import {createLetterPdf} from './pdf.js';
import {orderLanguage,translate,digitalNotice} from '../../../packages/shared/locales.js';
import {purchaseUrl} from './purchase-links.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function emailConfigured(env=process.env){return env.EMAIL_ENABLED==='true'&&Boolean(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASS&&env.EMAIL_FROM);}
export function createEmailSender({env=process.env,transport,pdf=(letter,design,order)=>createLetterPdf(letter,design,orderLanguage(order))}={}){
 const mailer=transport||(emailConfigured(env)?nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:env.SMTP_SECURE==='true',requireTLS:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000,disableFileAccess:true,disableUrlAccess:true}):null);
 return async order=>{
  if(!mailer)throw new Error('email_not_configured');
  const recipient=z.email().parse(order.buyer_email);
  if(order.status!=='paid'||!order.letter)throw new Error('letter_not_ready');
  const theme=getDesign(order.design);
  const language=orderLanguage(order),t=key=>translate(language,key);
  const review=Boolean(order.link_token_hash)&&order.accepted_version!==order.letter_version;
  const privateUrl=order.link_token_hash?purchaseUrl(order.id,{origin:env.PUBLIC_URL,secret:env.ORDER_LINK_SECRET}):null;
  const attachment=review?null:await pdf(order.letter,order.design,order);
  const illustration=await readFile(new URL(`../assets/stationery/${theme.art}.jpg`,import.meta.url));
  const from=z.email().parse(env.EMAIL_FROM);
  const result=await mailer.sendMail({from:{name:'Elf Mailroom',address:from},to:{address:recipient},...(env.EMAIL_REPLY_TO?{replyTo:{address:z.email().parse(env.EMAIL_REPLY_TO)}}:{}),messageId:`<elf-letter-${order.id}-v${order.letter_version||1}-${review?'review':'final'}@${from.split('@')[1]}>`,subject:t(review?'Your Santa letter is ready to review ✨':'A special delivery from Santa ✨'),
   text:`${t('A little magic has arrived.')}
${t(theme.name)}

${t(review?'Your letter is ready. Review it, request changes, or accept and download your PDF.':'Your accepted letter is attached as letter-from-santa.pdf. Print it at home and treasure it.')}

${t(digitalNotice)}${privateUrl?`

${t('Visit your purchase')}: ${privateUrl}
${t('Keep your private link safe. Anyone with it can view and revise this letter.')}`:''}

${t('With love from the elves')}
${t('Order reference')}: ${order.id}`,
   html:`<!doctype html><html lang="${language}"><body style="margin:0;background:#faf7ef;color:#294e3d;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="520" style="width:100%;max-width:520px;background:#fffdf5;border:1px solid #e5dcc7" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px"><p style="font-size:12px;letter-spacing:2px">ELF MAILROOM</p><h1 style="font:32px Georgia,serif">${escape(t('A little magic has arrived.'))}</h1><img src="cid:stationery" width="150" height="225" alt="${escape(t(theme.name))}" style="display:block;margin:24px auto;border:0"><p style="font-size:15px;line-height:1.8">${escape(t(review?'Your letter is ready. Review it, request changes, or accept and download your PDF.':'Your accepted letter is attached as letter-from-santa.pdf. Print it at home and treasure it.'))}${privateUrl?`<br><a href="${escape(privateUrl)}" style="color:#ad443e">${escape(t(review?'Review your letter':'Visit your purchase'))}</a><br><small>${escape(t('Keep your private link safe. Anyone with it can view and revise this letter.'))}</small>`:''}</p><p>${escape(t(digitalNotice))}</p><p style="font:22px Georgia,serif;color:#ad443e">${escape(t('With love from the elves'))}</p><p style="font-size:10px;color:#767b6b">${escape(t('Order reference'))}: ${escape(order.id)}</p></td></tr></table></td></tr></table></body></html>`,
   attachments:[...(attachment?[{filename:'letter-from-santa.pdf',content:attachment,contentType:'application/pdf',contentDisposition:'attachment'}]:[]),{filename:'stationery.jpg',content:illustration,contentType:'image/jpeg',cid:'stationery',contentDisposition:'inline'}],disableFileAccess:true,disableUrlAccess:true});
  if(!result.accepted?.length)throw new Error('email_rejected');
  return {messageId:result.messageId};
 };
}
