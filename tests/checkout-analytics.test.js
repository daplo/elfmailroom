import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createCheckoutAnalytics} from '../apps/api/src/checkout-analytics.js';
test('checkout analytics respects consent, Stripe totals, deduplication, sandbox separation and withdrawal',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE orders(id TEXT PRIMARY KEY,checkout_id TEXT,design TEXT);INSERT INTO orders VALUES('o','cs_test','beach')");
 const sent=[];let fail=true;const now=()=>1000000000000;
 const a=createCheckoutAnalytics({db,now,env:{GA4_MEASUREMENT_ID:'G-TEST123',GA4_API_SECRET:'secret'},fetchImpl:async(url,options)=>{assert.equal(url.hostname,'region1.google-analytics.com');if(fail)throw Error('offline');sent.push(JSON.parse(options.body));return {ok:true}}});
 const object={id:'cs_test',metadata:{orderId:'o'},payment_status:'paid',amount_total:1499,currency:'pln',total_details:{amount_tax:99},customer_email:'private@example.com'};
 const event={id:'evt_1',type:'checkout.session.completed',livemode:true,data:{object}};
 a.event(event);assert.equal(db.prepare('SELECT COUNT(*) n FROM analytics_events').get().n,0);
 a.attach('o',{clientId:'123.456',sessionId:123,expires:now()+100000,consent:'accepted'});
 a.event(event);a.event({...event,id:'evt_2',type:'checkout.session.async_payment_succeeded'});
 assert.equal(db.prepare('SELECT COUNT(*) n FROM analytics_events').get().n,1);
 await a.runOnce();assert.equal(sent.length,0);assert.equal(db.prepare('SELECT attempts FROM analytics_events').get().attempts,1);
 fail=false;db.exec('UPDATE analytics_events SET next_at=0');await a.runOnce();
 const p=sent[0].events[0];assert.equal(p.name,'purchase');assert.equal(p.params.currency,'PLN');assert.equal(p.params.value,14);assert.equal(p.params.tax,.99);assert.equal(p.params.items[0].item_variant,'beach');assert.doesNotMatch(JSON.stringify(sent),/private@example|secret|letter text/);
 db.exec('DELETE FROM analytics_events');a.event({...event,livemode:false});await a.runOnce();assert.equal(sent[1].events[0].name,'sandbox_purchase');
 a.event({...event,id:'evt_fail',type:'payment_intent.payment_failed',data:{object:{metadata:{orderId:'o'}}}});assert.equal(db.prepare("SELECT COUNT(*) n FROM analytics_events WHERE status='queued'").get().n,1);
 a.revoke('123.456');await a.runOnce();assert.equal(sent.length,2);a.event(event);assert.equal(db.prepare('SELECT COUNT(*) n FROM analytics_orders').get().n,0);db.close();
});
test('browser only attaches checkout analytics after consent and reuses its identity',async()=>{
 const {checkoutAnalyticsContext}=await import('../packages/shared/checkout-analytics.js');
 const {saveConsent}=await import('../packages/shared/analytics.js');
 const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
 globalThis.localStorage=store();globalThis.sessionStorage=store();globalThis.document={cookie:''};
 try{
  assert.equal(checkoutAnalyticsContext(),undefined);saveConsent(localStorage,'rejected');assert.equal(checkoutAnalyticsContext(),undefined);
  saveConsent(localStorage,'accepted');const first=checkoutAnalyticsContext();assert.match(first.clientId,/^\d+\.\d+$/);assert.deepEqual(checkoutAnalyticsContext(),first);
  document.cookie='_ga=GA1.1.12345.67890';assert.equal(checkoutAnalyticsContext().clientId,'12345.67890');
  saveConsent(localStorage,'rejected');assert.equal(checkoutAnalyticsContext(),undefined);
 }finally{delete globalThis.localStorage;delete globalThis.sessionStorage;delete globalThis.document;}
});
