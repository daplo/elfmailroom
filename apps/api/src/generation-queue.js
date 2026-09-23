import {expiredOrder} from './retention.js';
import {createHash,randomUUID} from 'node:crypto';
import {migrateRevisions,generatedVersion} from './letter-revisions.js';
export function migrateGeneration(db){
 const columns=[['child_details','TEXT'],['generation_status',"TEXT NOT NULL DEFAULT 'queued'"],['generation_attempts','INTEGER NOT NULL DEFAULT 0'],['generation_lease','INTEGER NOT NULL DEFAULT 0'],['generation_token','TEXT'],['generation_next','INTEGER NOT NULL DEFAULT 0'],['generation_error','TEXT'],['generation_model','TEXT'],['generation_response_id','TEXT'],['letter_hash','TEXT']];
 const existing=new Set(db.prepare('PRAGMA table_info(orders)').all().map(c=>c.name));
 for(const [name,type] of columns)if(!existing.has(name))db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
 // Keep existing purchased keepsakes intact; never regenerate them.
 db.exec("UPDATE orders SET generation_status='ready' WHERE letter!='' AND child_details IS NULL; CREATE UNIQUE INDEX IF NOT EXISTS unique_letter_hash ON orders(letter_hash) WHERE letter_hash IS NOT NULL;");
 migrateRevisions(db);
}
export function createGenerationQueue({db,generate,now=Date.now,maxAttempts=3,retryDelay=30000}){
 let busy=false;
 async function runOnce(){
  if(busy)return false;busy=true;
  try{
   const time=now();
   db.prepare("UPDATE orders SET generation_status='failed',generation_error='generation_interrupted' WHERE status='paid' AND generation_status='generating' AND generation_lease<=? AND generation_attempts>=?").run(time,maxAttempts);
   db.exec("UPDATE rewrite_requests SET status='failed' WHERE status='queued' AND id IN (SELECT active_request_id FROM orders WHERE generation_status='failed');");
   const order=db.prepare("SELECT * FROM orders WHERE status='paid' AND child_details IS NOT NULL AND generation_attempts<? AND generation_next<=? AND (generation_status IN ('queued','retrying') OR (generation_status='generating' AND generation_lease<=?)) ORDER BY rowid LIMIT 1").get(maxAttempts,time,time);
   if(!order||expiredOrder(order,time))return false;
   const token=randomUUID();
   const lock=db.prepare("UPDATE orders SET generation_status='generating',generation_attempts=generation_attempts+1,generation_lease=?,generation_token=? WHERE id=? AND generation_attempts=? AND (generation_status IN ('queued','retrying') OR generation_lease<=?)").run(time+180000,token,order.id,order.generation_attempts,time);
   if(!lock.changes)return false;
   try{
    const requests=db.prepare("SELECT instructions,avoid FROM rewrite_requests WHERE order_id=? AND status IN ('ready','queued') ORDER BY created_at").all(order.id);
    const revision=order.active_request_id?{previousLetter:order.letter,requests:requests.map(r=>({instructions:r.instructions,avoid:JSON.parse(r.avoid)}))}:undefined;
    const result=await generate(JSON.parse(order.child_details),revision);
    const fingerprint=createHash('sha256').update(result.body.toLowerCase().replace(/\s+/g,' ').trim()).digest('hex');
    generatedVersion(db,order,result,fingerprint,token);
   }catch{
    const attempts=order.generation_attempts+1;
    db.prepare("UPDATE orders SET generation_status=?,generation_error='generation_unavailable',generation_next=?,generation_lease=0 WHERE id=? AND generation_token=?").run(attempts>=maxAttempts?'failed':'retrying',now()+retryDelay*attempts,order.id,token);
    if(attempts>=maxAttempts&&order.active_request_id)db.prepare("UPDATE rewrite_requests SET status='failed' WHERE id=?").run(order.active_request_id);
   }
   return true;
  }finally{busy=false;}
 }
 return {runOnce,start(){const timer=setInterval(()=>{runOnce().catch(()=>console.error('Letter worker could not process its queue.'));},2000);timer.unref();return()=>clearInterval(timer);}};
}
