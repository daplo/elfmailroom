import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function linkConfigured(secret=process.env.ORDER_LINK_SECRET){return typeof secret==='string'&&secret.length>=32;}
export function purchaseToken(id,secret=process.env.ORDER_LINK_SECRET){if(!linkConfigured(secret))throw new Error('purchase_links_not_configured');return createHmac('sha256',secret).update(`elf-purchase:${id}`).digest('hex');}
export function purchaseUrl(id,{origin=process.env.PUBLIC_URL||'http://localhost:5173',secret=process.env.ORDER_LINK_SECRET}={}){return `${origin.replace(/\/$/,'')}/write/purchase/${encodeURIComponent(id)}#token=${purchaseToken(id,secret)}`;}
export function validPurchaseToken(token,storedHash){if(!/^[a-f0-9]{64}$/.test(token||'')||!/^[a-f0-9]{64}$/.test(storedHash||''))return false;return timingSafeEqual(Buffer.from(tokenHash(token),'hex'),Buffer.from(storedHash,'hex'));}
