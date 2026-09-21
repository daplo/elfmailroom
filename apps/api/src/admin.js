import {randomBytes,createHash,timingSafeEqual,scryptSync} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import {z} from 'zod';
import {saveManualLetter} from './letter-revisions.js';
import {createLetterGenerator,letterDetailsSchema} from './letter-generator.js';
import {designs} from '../../../packages/shared/config.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function passwordHash(password,salt=randomBytes(16).toString('hex')){return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
function checkPassword(password,stored){const [salt,digest]=(stored||'').split(':');if(!salt||!/^[a-f0-9]{128}$/.test(digest||''))return false;return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(digest,'hex'));}
export function mountAdmin(app,db,{origin,env=process.env,generate=createLetterGenerator({apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL})}){
 db.exec('CREATE TABLE IF NOT EXISTS admin_sessions(token TEXT PRIMARY KEY,email TEXT NOT NULL,expires INTEGER NOT NULL)');
 function current(req){const token=req.headers.cookie?.split('; ').find(v=>v.startsWith('elf_admin='))?.slice(10);return token?db.prepare('SELECT email FROM admin_sessions WHERE token=? AND expires>?').get(hash(token),Date.now()):null;}
 app.use('/api/admin',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.post('/api/admin/login',rateLimit({windowMs:15*60000,limit:10,standardHeaders:'draft-8',legacyHeaders:false}), (req,res)=>{
  if(!env.ADMIN_EMAIL||!env.ADMIN_PASSWORD_HASH)return res.status(503).json({error:'Admin access has not been configured.'});
  const parsed=z.object({email:z.email().max(254),password:z.string().min(1).max(256)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Enter your admin email and password.'});
  const valid=checkPassword(parsed.data.password,env.ADMIN_PASSWORD_HASH);if(!valid||parsed.data.email.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())return res.status(401).json({error:'Check your admin email and password.'});
  const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM admin_sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(hash(token),env.ADMIN_EMAIL,Date.now()+8*3600000);
  res.cookie('elf_admin',token,{httpOnly:true,sameSite:'strict',secure:origin.startsWith('https:'),maxAge:8*3600000,path:'/api/admin'});res.json({email:env.ADMIN_EMAIL});
 });
 app.use('/api/admin',(req,res,next)=>{req.admin=current(req);if(!req.admin)return res.status(401).json({error:'Sign in to the admin mailroom.'});next();});
 app.get('/api/admin/me',(req,res)=>res.json(req.admin));
 app.post('/api/admin/logout',(req,res)=>{const token=req.headers.cookie?.split('; ').find(v=>v.startsWith('elf_admin='))?.slice(10);if(token)db.prepare('DELETE FROM admin_sessions WHERE token=?').run(hash(token));res.clearCookie('elf_admin',{path:'/api/admin'});res.json({ok:true});});
 const testLetterSchema=z.object({details:letterDetailsSchema,design:z.enum(designs.map(design=>design.id))});
 let testing=false;
 app.post('/api/admin/test-letters',rateLimit({windowMs:60000,limit:5,keyGenerator:req=>req.admin.email.toLowerCase(),standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait a minute before generating more test letters.'}}),async(req,res)=>{
  const parsed=testLetterSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Choose a language and design, and provide a name, Christmas wish and proud moment within the field limits.'});
  if(!env.OPENAI_API_KEY)return res.status(503).json({error:'Test generation is unavailable. Set OPENAI_API_KEY on the API server and restart it.'});
  if(testing)return res.status(409).json({error:'A test letter is already being generated. Please wait for it to finish.'});
  testing=true;
  try{
   const result=await generate(parsed.data.details);
   // Deliberately separate from purchase records, generation queues and email delivery.
   res.json({letter:result.letter,model:result.model,details:parsed.data.details,design:parsed.data.design});
  }catch{
   res.status(502).json({error:'The test letter could not be generated. Check the server’s OpenAI configuration and usage limits, then try again. No purchase was created.'});
  }finally{testing=false;}
 });
 app.get('/api/admin/orders',(req,res)=>{
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page)||1));const search=String(req.query.search||'').slice(0,200);const status=['paid','pending'].includes(req.query.status)?req.query.status:'';
  const where="WHERE (?='' OR status=?) AND (?='' OR id LIKE ? OR buyer_email LIKE ?)";const params=[status,status,search,`%${search}%`,`%${search}%`];
  const rows=db.prepare(`SELECT id,buyer_email,status,design,created_at,amount_cents,letter_version,accepted_version,generation_status,email_status,rewrite_count FROM orders ${where} ORDER BY rowid DESC LIMIT 25 OFFSET ?`).all(...params,(page-1)*25);
  const total=db.prepare(`SELECT COUNT(*) AS total FROM orders ${where}`).get(...params).total;
  const summary=db.prepare("SELECT COUNT(*) AS purchases,SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid,SUM(CASE WHEN letter!='' THEN 1 ELSE 0 END) AS letters,SUM(CASE WHEN status='paid' THEN COALESCE(amount_cents,0) ELSE 0 END) AS revenue FROM orders").get();
  res.json({orders:rows,total,page,pageSize:25,summary});
 });
 app.get('/api/admin/orders/:id',(req,res)=>{
  const order=db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);if(!order)return res.status(404).json({error:'Purchase not found.'});
  const {access_token,link_token_hash,generation_token,email_token,...safe}=order;
  res.json({order:{...safe,child_details:order.child_details?JSON.parse(order.child_details):null},versions:db.prepare('SELECT * FROM letter_versions WHERE order_id=? ORDER BY version DESC').all(order.id),requests:db.prepare('SELECT * FROM rewrite_requests WHERE order_id=? ORDER BY created_at DESC').all(order.id)});
 });
 app.post('/api/admin/orders/:id/letter',(req,res)=>{
  const parsed=z.object({version:z.number().int().nonnegative(),letter:z.string().trim().min(30).max(6000)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'A letter must contain 30–6,000 characters.'});
  const version=saveManualLetter(db,req.params.id,{...parsed.data,editor:req.admin.email});res.json({version});
 });
}
