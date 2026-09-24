import {createTelegramNotifications} from './telegram.js';
import {migrateRetention,purgeExpiredLetters,expiredOrder,retentionDeadline,markOrderPaid} from './retention.js';
import express from 'express';
import {mountStaticFiles} from './static-files.js';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import Stripe from 'stripe';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {z} from 'zod';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createLetterCheckout} from './checkout.js';
import {migratePdfStore,storedPdf} from './pdf-store.js';
import {designs,santaLetterPrice} from '../../../packages/shared/config.js';
import {createLetterGenerator,letterDetailsSchema} from './letter-generator.js';
import {createGenerationQueue,migrateGeneration} from './generation-queue.js';
import {emailConfigured,createEmailSender} from './email.js';
import {migrateEmail,createEmailQueue} from './email-queue.js';
import {purchaseUrl,purchaseToken,tokenHash,validPurchaseToken,linkConfigured} from './purchase-links.js';
import {queueRewrite,acceptLetter,maxRewrites,isWorking} from './letter-revisions.js';
import {orderLanguage} from '../../../packages/shared/locales.js';
import {publishedPolicies} from './legal-policy.js';
import {policyVersion,policyDocument} from '../../../packages/shared/legal.js';
import {mountAdmin} from './admin.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const app=express();
app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
const db=new DatabaseSync(process.env.DATABASE_PATH||path.join(root,'mailroom.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,letter TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',checkout_id TEXT);`);
for(const [name,type] of [['design',"TEXT NOT NULL DEFAULT 'classic'"],['access_token','TEXT']]){if(!db.prepare('PRAGMA table_info(orders)').all().some(c=>c.name===name))db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);}
migrateGeneration(db);
migrateEmail(db);
migratePdfStore(db);
migrateRetention(db);
purgeExpiredLetters(db);
const retentionTimer=setInterval(()=>{try{purgeExpiredLetters(db)}catch{console.error('Retention cleanup failed.')}},60000);retentionTimer.unref();
app.use('/api',(req,res,next)=>{try{purgeExpiredLetters(db);next()}catch(error){next(error)}});
const emailEnabled=emailConfigured();
if(emailEnabled)createEmailQueue({db,send:createEmailSender({pdf:(_letter,_design,order)=>storedPdf(db,order)})}).start();
const generationQueue=createGenerationQueue({db,generate:createLetterGenerator()});
if(process.env.OPENAI_API_KEY)generationQueue.start();
const telegram=createTelegramNotifications({db});telegram.start();
const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY):null;
const origin=process.env.PUBLIC_URL||'http://localhost:5173';
const policyState=publishedPolicies(process.env,path.join(root,'apps/landing/dist/legal-manifest.json'));
const policies=policyState.config;
const ready=Boolean(policyState.ready&&linkConfigured()&&process.env.OPENAI_API_KEY&&stripe&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.SALES_ENABLED==='true'&&process.env.PRIVACY_URL&&process.env.TERMS_URL);
app.use(helmet({contentSecurityPolicy:false,referrerPolicy:{policy:'no-referrer'}}));
app.post('/api/webhook',express.raw({type:'application/json'}),(req,res)=>{if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET)return res.sendStatus(503);try{const event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){const session=event.data.object;if(session.payment_status==='paid')markOrderPaid(db,session.metadata.orderId,session.id,event.created*1000);}telegram.event(event);res.json({received:true});}catch{res.status(400).json({error:'Invalid webhook signature.'});}});
app.use(express.json({limit:'24kb'}));
app.use('/api',(req,res,next)=>{res.set('X-Robots-Tag','noindex, nofollow');next();});
app.use('/api',rateLimit({windowMs:60000,limit:90,standardHeaders:'draft-8',legacyHeaders:false}));
app.use('/api',(req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==origin)return res.status(403).json({error:'Please use the Elf Mailroom website.'});next();});
const authLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-8',legacyHeaders:false});
const credentials=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(10).max(128)});
function hash(value){return createHash('sha256').update(value).digest('hex');}
function user(req){const token=req.headers.cookie?.split('; ').find(x=>x.startsWith('elf_session='))?.slice(12);if(!token)return null;return db.prepare('SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now())||null;}
function authenticated(req,res,next){req.user=user(req);if(!req.user)return res.status(401).json({error:'Please sign in to continue.'});next();}
function session(res,id){const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),id,Date.now()+7*86400000);res.cookie('elf_session',token,{httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:'),maxAge:7*86400000,path:'/'});}
app.get('/api/config',(req,res)=>res.json({checkoutEnabled:ready,emailEnabled,priceLabel:santaLetterPrice.label,amount:santaLetterPrice.amount,currency:santaLetterPrice.currency,privacyUrl:process.env.PRIVACY_URL||'/privacy/',termsUrl:process.env.TERMS_URL||'/terms/',policiesReady:policyState.ready,supportEmail:policies.email||null}));
app.post('/api/signup',authLimit,(req,res)=>{if(!process.env.PRIVACY_URL)return res.status(503).json({error:'Account creation opens when our privacy policy is published. You can still personalise and preview your letter.'});const parsed=credentials.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Use a valid email and a password of 10–128 characters.'});const {email,password}=parsed.data;const salt=randomBytes(16).toString('hex');const id=randomBytes(16).toString('hex');try{db.prepare('INSERT INTO users VALUES(?,?,?)').run(id,email,`${salt}:${scryptSync(password,salt,64).toString('hex')}`);session(res,id);res.status(201).json({email});}catch{res.status(409).json({error:'Unable to create an account with that email. Try signing in.'});}});
app.post('/api/login',authLimit,(req,res)=>{const parsed=credentials.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Check your email and password.'});const row=db.prepare('SELECT * FROM users WHERE email=?').get(parsed.data.email);const [salt,stored]=(row?.password||`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');const valid=timingSafeEqual(scryptSync(parsed.data.password,salt,64),Buffer.from(stored,'hex'));if(!row||!valid)return res.status(401).json({error:'Check your email and password.'});session(res,row.id);res.json({email:row.email});});
app.get('/api/me',(req,res)=>res.json({user:user(req)}));
app.post('/api/logout',(req,res)=>{const token=req.headers.cookie?.split('; ').find(x=>x.startsWith('elf_session='))?.slice(12);if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));res.clearCookie('elf_session',{path:'/'});res.json({ok:true});});
function guestToken(req){return req.headers.cookie?.split('; ').find(x=>x.startsWith('elf_guest='))?.slice(10);}
function ownedOrder(req){
 const order=db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);if(!order||expiredOrder(order))return null;
 const bearer=req.headers.authorization?.replace(/^Bearer /,'');if(validPurchaseToken(bearer,order.link_token_hash))return order;
 const account=user(req);const token=guestToken(req);if((account&&order.user_id===account.id)||(token&&order.access_token===hash(token)))return order;
 return null;
}
app.post('/api/checkout',async(req,res)=>{
 const parsed=z.object({uiLanguage:z.enum(['en','de','es','fr','pl']).default('en'),details:letterDetailsSchema,design:z.enum(designs.map(d=>d.id)),email:z.email().max(254),consent:z.literal(true)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Add your email, choose a design and accept the purchase terms.'});
 if(!ready)return res.status(503).json({error:'The mailroom is not taking payments yet. Your preview is ready to enjoy.'});
 const token=/^[a-f0-9]{64}$/.test(guestToken(req)||'')?guestToken(req):randomBytes(32).toString('hex');
 res.cookie('elf_guest',token,{httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:'),maxAge:30*86400000,path:'/'});
 const id=randomUUID();const {details,design,email}=parsed.data;
 db.prepare('INSERT INTO orders(id,user_id,letter,design,access_token,child_details,buyer_email,email_status,link_token_hash,created_at,amount_cents,terms_version,terms_accepted_at,terms_language,terms_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user(req)?.id||'guest','',design,hash(token),JSON.stringify(details),email,emailEnabled?'queued':'not_requested',tokenHash(purchaseToken(id)),Date.now(),santaLetterPrice.amount,policyVersion,Date.now(),parsed.data.uiLanguage,policyDocument('terms',parsed.data.uiLanguage,policies,{origin}));
 db.prepare('UPDATE orders SET expires_at=? WHERE id=?').run(retentionDeadline(Date.now()),id);
 try{const checkout=await createLetterCheckout(stripe,{email,language:parsed.data.uiLanguage,orderId:id,origin,returnUrl:purchaseUrl(id,{origin})});db.prepare('UPDATE orders SET checkout_id=? WHERE id=?').run(checkout.id,id);telegram.enqueue('started:'+checkout.id,'started',id,checkout.livemode);res.json({url:checkout.url,purchaseUrl:purchaseUrl(id,{origin})});}catch{telegram.enqueue('unavailable:'+id,'unavailable',id,/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||''));res.status(502).json({error:'Checkout could not open. Please try again in a moment.'});}
});
app.use('/api/orders',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/api/orders/:id',async(req,res)=>{
 const order=ownedOrder(req);if(!order)return res.status(404).json({error:'Open the complete private link for this purchase, including its token.'});
 if(order.status!=='paid'&&stripe&&order.checkout_id){try{const checkout=await stripe.checkout.sessions.retrieve(order.checkout_id);if(checkout.payment_status==='paid'){markOrderPaid(db,order.id,order.checkout_id);order.status='paid';}}catch{}}
 res.json({id:order.id,language:orderLanguage(order),status:order.status,design:order.design,generationStatus:order.generation_status,emailStatus:order.email_status,version:order.letter_version,accepted:order.accepted_version===order.letter_version&&Boolean(order.letter),rewritesRemaining:Math.max(0,maxRewrites()-order.rewrite_count),canRewrite:Boolean(order.child_details),purchaseUrl:order.link_token_hash&&linkConfigured()?purchaseUrl(order.id,{origin}):null,letter:order.status==='paid'&&order.letter?order.letter:null});
});
app.get('/api/orders/:id/pdf',async(req,res)=>{
 const order=ownedOrder(req);if(!order)return res.status(404).json({error:'Purchase not found. Use its complete private link.'});
 if(order.status!=='paid')return res.status(402).json({error:'Your PDF will be ready once payment is confirmed.'});
 if(!order.letter)return res.status(409).json({error:'Santa is still preparing your letter. Please check its status before downloading.'});
 if(order.accepted_version!==order.letter_version||isWorking(order))return res.status(409).json({error:'Please review and accept the current letter before downloading.'});
 const pdf=await storedPdf(db,order);res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="letter-from-santa.pdf"'}).send(pdf);
});
app.post('/api/orders/:id/rewrite',async(req,res)=>{
 const order=ownedOrder(req);if(!order)return res.status(404).json({error:'Purchase not found.'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Rewriting is temporarily unavailable. Your current letter is saved.'});
 const parsed=z.object({version:z.number().int().nonnegative(),instructions:z.string().trim().min(3).max(1500),avoid:z.array(z.string().trim().min(1).max(80)).max(20).default([])}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'Describe the changes in 3–1,500 characters and use up to 20 short exclusions.'});
 queueRewrite(db,order.id,parsed.data);res.status(202).json({ok:true});
});
app.post('/api/orders/:id/accept',(req,res)=>{
 const order=ownedOrder(req);if(!order)return res.status(404).json({error:'Purchase not found.'});
 const parsed=z.object({version:z.number().int().nonnegative()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Choose the current letter version.'});
 acceptLetter(db,order.id,parsed.data.version);res.json({ok:true});
});
mountAdmin(app,db,{origin});
app.use('/api',(req,res)=>res.status(404).json({error:'Not found.'}));
mountStaticFiles(app,{landingDir:path.join(root,'apps/landing/dist'),letterDir:path.join(root,'apps/letter/dist')});
app.use((err,req,res,next)=>res.status(err.status||500).json({error:err.status?err.message:'Something went wrong. Please try again.'}));
app.listen(process.env.PORT||3001,()=>console.log(`Elf Mailroom API listening on ${process.env.PORT||3001}`));
