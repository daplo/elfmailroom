export function createTelegramNotifications({db,env=process.env,fetchImpl=fetch,now=Date.now}){
 db.exec("CREATE TABLE IF NOT EXISTS telegram_notifications(id TEXT PRIMARY KEY,text TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL)");
 const enabled=Boolean(env.TELEGRAM_BOT_TOKEN&&env.TELEGRAM_CHAT_ID);
 function enqueue(id,kind,orderId,live){
  if(!enabled)return;
  const titles={started:'🛒 Checkout started',completed:'✅ Payment completed',failed:'❌ Payment attempt failed',expired:'⌛ Checkout expired',unavailable:'⚠️ Checkout could not open'};
  if(!titles[kind])return;
  const text=`${titles[kind]}\n${live?'LIVE':'SANDBOX'} · Elf Mailroom\nOrder: ${orderId}`;
  db.prepare('INSERT OR IGNORE INTO telegram_notifications(id,text,created_at) VALUES(?,?,?)').run(id,text,now());
 }
 function event(event){
  const object=event.data.object,id=object.metadata?.orderId;if(!id)return;
  const order=db.prepare('SELECT checkout_id FROM orders WHERE id=?').get(id);if(!order)return;
  if(event.type.startsWith('checkout.session.')&&order.checkout_id!==object.id)return;
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&object.payment_status==='paid')enqueue('paid:'+object.id,'completed',id,event.livemode);
  else if(['payment_intent.payment_failed','checkout.session.async_payment_failed'].includes(event.type))enqueue(event.id,'failed',id,event.livemode);
  else if(event.type==='checkout.session.expired')enqueue(event.id,'expired',id,event.livemode);
 }
 let busy=false;
 async function runOnce(){
  if(!enabled||busy)return;busy=true;
  try{
   const row=db.prepare("SELECT * FROM telegram_notifications WHERE status='queued' AND next_at<=? ORDER BY created_at LIMIT 1").get(now());if(!row)return;
   try{
    const response=await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:row.text}),signal:AbortSignal.timeout(10000)});
    const body=await response.json();if(!response.ok||!body.ok)throw new Error('telegram_delivery_failed');
    db.prepare("UPDATE telegram_notifications SET status='sent' WHERE id=?").run(row.id);
   }catch{
    db.prepare('UPDATE telegram_notifications SET attempts=attempts+1,next_at=?,status=? WHERE id=?').run(now()+Math.min(3600000,30000*2**row.attempts),row.attempts>=9?'failed':'queued',row.id);
   }
  }finally{busy=false;}
 }
 return{enqueue,event,runOnce,start(){if(!enabled)return;const timer=setInterval(()=>runOnce().catch(()=>console.error('Telegram queue unavailable.')),3000);timer.unref();return()=>clearInterval(timer)}};
}
