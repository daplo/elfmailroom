import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createTelegramNotifications} from '../apps/api/src/telegram.js';
test('Telegram notifications deduplicate paid events, retry delivery and exclude private data',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE orders(id TEXT,checkout_id TEXT);INSERT INTO orders VALUES('order','cs')");let calls=0,time=1000;const sent=[];
 const queue=createTelegramNotifications({db,env:{TELEGRAM_BOT_TOKEN:'test',TELEGRAM_CHAT_ID:'123'},now:()=>time,fetchImpl:async(_url,options)=>{sent.push(JSON.parse(options.body));if(++calls===1)throw Error('offline');return{ok:true,json:async()=>({ok:true})}}});
 const object={id:'cs',payment_status:'paid',metadata:{orderId:'order',child:'secret'},customer_email:'secret@example.com'};
 queue.event({id:'evt1',type:'checkout.session.completed',livemode:false,data:{object}});queue.event({id:'evt2',type:'checkout.session.async_payment_succeeded',livemode:false,data:{object}});
 assert.equal(db.prepare('SELECT COUNT(*) n FROM telegram_notifications').get().n,1);
 await queue.runOnce();assert.equal(db.prepare('SELECT status FROM telegram_notifications').get().status,'queued');time+=30000;await queue.runOnce();assert.equal(db.prepare('SELECT status FROM telegram_notifications').get().status,'sent');assert.match(sent[1].text,/SANDBOX/);assert(!sent[1].text.includes('secret'));
 queue.event({id:'evt3',type:'payment_intent.payment_failed',livemode:false,data:{object:{id:'pi',metadata:{orderId:'order'}}}});assert.equal(db.prepare('SELECT COUNT(*) n FROM telegram_notifications').get().n,2);db.close();
});
