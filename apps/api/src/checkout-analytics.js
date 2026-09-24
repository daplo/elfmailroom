const lifetime=180*86400000;
export function createCheckoutAnalytics({db,env=process.env,fetchImpl=fetch,now=Date.now}){
 db.exec(`CREATE TABLE IF NOT EXISTS analytics_orders(order_id TEXT PRIMARY KEY,client_id TEXT NOT NULL,session_id INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS analytics_events(id TEXT PRIMARY KEY,order_id TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);`);
 const measurementId=env.GA4_MEASUREMENT_ID||env.VITE_GOOGLE_ANALYTICS_ID;
 const enabled=Boolean(/^G-[A-Z0-9]+$/.test(measurementId||'')&&env.GA4_API_SECRET);
 function attach(orderId,context){
  if(!context||!/^\d{1,20}\.\d{1,20}$/.test(context.clientId||'')||!Number.isSafeInteger(context.sessionId)||context.sessionId<=0||context.consent!=='accepted'||!Number.isSafeInteger(context.expires)||context.expires<=now()||context.expires>now()+lifetime)return;
  db.prepare('INSERT OR IGNORE INTO analytics_orders VALUES(?,?,?,?)').run(orderId,context.clientId,context.sessionId,context.expires);
 }
 function revoke(clientId){
  db.prepare("DELETE FROM analytics_events WHERE order_id IN (SELECT order_id FROM analytics_orders WHERE client_id=?) AND status='queued'").run(clientId);
  db.prepare('DELETE FROM analytics_orders WHERE client_id=?').run(clientId);
 }
 function enqueue(key,orderId,name,object={}){
  if(!enabled)return;
  const context=db.prepare('SELECT * FROM analytics_orders WHERE order_id=? AND expires>?').get(orderId,now());if(!context)return;
  const order=db.prepare('SELECT design FROM orders WHERE id=?').get(orderId);if(!order)return;
  const params={session_id:context.session_id,engagement_time_msec:1,payment_mode:object.livemode?'live':'sandbox'};
  if(name==='purchase'||name==='begin_checkout'){
   if(!Number.isSafeInteger(object.amount_total)||object.amount_total<0||!['usd','aud','cad','eur','gbp','pln'].includes(object.currency))return;
   const tax=object.total_details?.amount_tax||0;
   if(name==='purchase')params.transaction_id=object.id;params.currency=object.currency.toUpperCase();params.value=(object.amount_total-tax)/100;params.tax=tax/100;
   params.items=[{item_id:'santa-letter',item_name:'Personalised Santa Letter',item_variant:order.design,price:params.value,quantity:1}];
   if(!object.livemode&&name==='purchase')name='sandbox_purchase';
  }
  if(name==='checkout_failed')params.failure_reason=object.reason||'payment_failed';
  const payload={client_id:context.client_id,timestamp_micros:now()*1000,consent:{ad_user_data:'DENIED',ad_personalization:'DENIED'},events:[{name,params}]};
  db.prepare('INSERT OR IGNORE INTO analytics_events(id,order_id,payload,created_at) VALUES(?,?,?,?)').run(key,orderId,JSON.stringify(payload),now());
 }
 function event(event){
  const object=event.data.object,orderId=object.metadata?.orderId;if(!orderId)return;
  const order=db.prepare('SELECT checkout_id FROM orders WHERE id=?').get(orderId);if(!order)return;
  if(event.type.startsWith('checkout.session.')&&order.checkout_id!==object.id)return;
  const details={...object,livemode:event.livemode};
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&object.payment_status==='paid')enqueue('purchase:'+object.id,orderId,'purchase',details);
  else if(['payment_intent.payment_failed','checkout.session.async_payment_failed'].includes(event.type))enqueue(event.id,orderId,'checkout_failed',details);
  else if(event.type==='checkout.session.expired')enqueue(event.id,orderId,'checkout_expired',details);
 }
 let busy=false;
 async function runOnce(){
  if(busy)return;busy=true;
  try{
   db.prepare('DELETE FROM analytics_events WHERE created_at<? OR order_id NOT IN (SELECT order_id FROM analytics_orders WHERE expires>?)').run(now()-72*3600000,now());
   db.prepare('DELETE FROM analytics_orders WHERE expires<=?').run(now());
   if(!enabled)return;
   const row=db.prepare("SELECT * FROM analytics_events WHERE status='queued' AND next_at<=? ORDER BY created_at LIMIT 1").get(now());if(!row)return;
   try{
    const url=new URL('https://region1.google-analytics.com/mp/collect');url.searchParams.set('measurement_id',measurementId);url.searchParams.set('api_secret',env.GA4_API_SECRET);
    const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},body:row.payload,signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('delivery_failed');
    db.prepare("UPDATE analytics_events SET status='sent' WHERE id=?").run(row.id);
   }catch{db.prepare('UPDATE analytics_events SET attempts=attempts+1,next_at=?,status=? WHERE id=?').run(now()+Math.min(3600000,30000*2**row.attempts),row.attempts>=9?'failed':'queued',row.id);}
  }finally{busy=false;}
 }
 return {attach,revoke,enqueue,event,runOnce,start(){const timer=setInterval(()=>runOnce().catch(()=>console.error('Checkout analytics queue unavailable.')),3000);timer.unref();return()=>clearInterval(timer)}};
}
