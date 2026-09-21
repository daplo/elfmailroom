import {randomUUID} from 'node:crypto';
export function migrateEmail(db){
 const columns=[['buyer_email','TEXT'],['email_status',"TEXT NOT NULL DEFAULT 'not_requested'"],['email_attempts','INTEGER NOT NULL DEFAULT 0'],['email_next','INTEGER NOT NULL DEFAULT 0'],['email_lease','INTEGER NOT NULL DEFAULT 0'],['email_token','TEXT'],['email_error','TEXT'],['email_message_id','TEXT'],['email_sent_at','INTEGER']];
 const existing=new Set(db.prepare('PRAGMA table_info(orders)').all().map(c=>c.name));
 for(const [name,type] of columns)if(!existing.has(name))db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
}
export function createEmailQueue({db,send,now=Date.now,retryDelay=60000,maxAttempts=3}){
 let busy=false;
 async function runOnce(){
  if(busy)return false;busy=true;
  try{
   const time=now();
   // A crash during SMTP may happen after acceptance. Keep it for operator review instead of blindly resending.
   db.prepare("UPDATE orders SET email_status='failed',email_error='delivery_unknown' WHERE email_status='sending' AND email_lease<=?").run(time);
   const order=db.prepare("SELECT * FROM orders WHERE status='paid' AND letter!='' AND generation_status='ready' AND buyer_email IS NOT NULL AND email_status IN ('queued','retrying') AND email_attempts<? AND email_next<=? ORDER BY rowid LIMIT 1").get(maxAttempts,time);
   if(!order)return false;
   const token=randomUUID();
   const lock=db.prepare("UPDATE orders SET email_status='sending',email_attempts=email_attempts+1,email_lease=?,email_token=? WHERE id=? AND generation_status='ready' AND email_status IN ('queued','retrying') AND email_attempts=?").run(time+180000,token,order.id,order.email_attempts);
   if(!lock.changes)return false;
   try{
    const result=await send(order);
    db.prepare("UPDATE orders SET email_status='sent',email_message_id=?,email_sent_at=?,email_error=NULL,email_lease=0 WHERE id=? AND email_token=?").run(result.messageId,now(),order.id,token);
   }catch(error){
    const attempts=order.email_attempts+1;
    const ambiguous=['ETIMEDOUT','ESOCKET','ECONNECTION'].includes(error.code);
    const permanent=Number(error.responseCode)>=500||error.code==='EAUTH';
    const retry=!ambiguous&&!permanent&&attempts<maxAttempts;
    db.prepare('UPDATE orders SET email_status=?,email_error=?,email_next=?,email_lease=0 WHERE id=? AND email_token=?').run(retry?'retrying':'failed',ambiguous?'delivery_unknown':'email_unavailable',now()+retryDelay*attempts,order.id,token);
   }
   return true;
  }finally{busy=false;}
 }
 return {runOnce,start(){const timer=setInterval(()=>{runOnce().catch(()=>console.error('Email worker could not process its queue.'));},3000);timer.unref();return()=>clearInterval(timer);}};
}
