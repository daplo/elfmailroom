import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import OpenAI from 'openai';
import {createLetterGenerator} from '../apps/api/src/letter-generator.js';
import {createGenerationQueue,migrateGeneration} from '../apps/api/src/generation-queue.js';
const details={name:'Zoë',wish:'a bicycle',proud:'learning to swim',pet:'Biscuit',message:'How do reindeer fly?'};
const content={paragraphs:['A snowy robin brought your little letter to my cosy desk this morning.','Learning to swim takes courage, and I hope you feel proud of each little splash.','Biscuit would love the snowy garden! The reindeer fly with a little Christmas magic. I have noted your bicycle wish.'],closing:'With a big snowy hug,'};
function database(){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE orders(id TEXT PRIMARY KEY,status TEXT NOT NULL,letter TEXT NOT NULL)");migrateGeneration(db);return db;}
function add(db,id,status='paid'){db.prepare('INSERT INTO orders(id,status,letter,child_details) VALUES(?,?,?,?)').run(id,status,'',JSON.stringify(details));}
function generated(body='A fresh Christmas letter.'){return {letter:'Dear Zoë,\n\n'+body,body,model:'test-model',responseId:'resp_test'};}
test('real SDK sends structured Responses request, includes message and keeps private data out of metadata',async()=>{
 const requests=[];const client=new OpenAI({apiKey:'test-key',maxRetries:0,fetch:async(url,options)=>{requests.push({url:String(url),body:JSON.parse(options.body)});return new Response(JSON.stringify({id:'resp_test',object:'response',status:'completed',model:'gpt-4.1-mini',output:[{type:'message',id:'msg_test',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify(content),annotations:[]}]}]}),{headers:{'content-type':'application/json'}});}});
 const generate=createLetterGenerator({client});const one=await generate(details);await generate(details);
 assert.match(requests[0].url,/\/responses$/);assert.equal(requests[0].body.store,false);assert.equal(requests[0].body.text.format.strict,true);assert.equal(requests[0].body.metadata,undefined);assert.equal(JSON.parse(requests[0].body.input).child_details.message,details.message);assert.notEqual(JSON.parse(requests[0].body.input).variation_id,JSON.parse(requests[1].body.input).variation_id);assert.match(one.letter,/Dear Zoë/);assert.match(one.letter,/Biscuit/);assert.match(requests[0].body.instructions,/untrusted/);
});
test('missing credentials, refusals and incomplete or malformed outputs never return template letters',async()=>{
 await assert.rejects(createLetterGenerator({apiKey:''})(details),/not_configured/);
 for(const response of [{status:'incomplete',output_text:JSON.stringify(content)},{status:'completed',output_text:''},{status:'completed',output_text:'not json'},{status:'completed',output_text:'{"paragraphs":[],"closing":""}'}])await assert.rejects(createLetterGenerator({client:{responses:{create:async()=>response}}})(details));
});
test('only paid orders generate, result persists, duplicate polling does not regenerate',async()=>{
 const db=database();add(db,'unpaid','pending');add(db,'paid');let calls=0;const queue=createGenerationQueue({db,generate:async()=>{calls++;return generated();}});await Promise.all([queue.runOnce(),queue.runOnce()]);await queue.runOnce();assert.equal(calls,1);assert.equal(db.prepare('SELECT letter FROM orders WHERE id=?').get('unpaid').letter,'');const paid=db.prepare('SELECT * FROM orders WHERE id=?').get('paid');assert.equal(paid.generation_status,'ready');assert.deepEqual(JSON.parse(paid.child_details),details);assert.match(paid.letter,/Dear Zoë/);migrateGeneration(db);assert.equal(db.prepare('SELECT letter FROM orders WHERE id=?').get('paid').letter,paid.letter);db.close();
});
test('duplicate prose is rejected and a fresh response is saved on bounded retry',async()=>{
 const db=database();add(db,'one');add(db,'two');let calls=0;const queue=createGenerationQueue({db,retryDelay:0,generate:async()=>generated(++calls<3?'same letter prose':'different Christmas story')});await queue.runOnce();await queue.runOnce();assert.equal(db.prepare('SELECT generation_status FROM orders WHERE id=?').get('two').generation_status,'retrying');await queue.runOnce();const rows=db.prepare('SELECT * FROM orders ORDER BY id').all();assert.notEqual(rows[0].letter_hash,rows[1].letter_hash);assert.equal(rows[1].generation_status,'ready');db.close();
});
test('provider failures back off, stop after three attempts and preserve paid status',async()=>{
 const db=database();add(db,'one');let time=1000;let calls=0;const queue=createGenerationQueue({db,now:()=>time,retryDelay:100,generate:async()=>{calls++;throw new Error('private provider payload');}});await queue.runOnce();assert.equal(await queue.runOnce(),false);time+=100;await queue.runOnce();time+=200;await queue.runOnce();time+=10000;assert.equal(await queue.runOnce(),false);const row=db.prepare('SELECT * FROM orders').get();assert.equal(calls,3);assert.equal(row.status,'paid');assert.equal(row.generation_status,'failed');assert.equal(row.letter,'');assert.equal(row.generation_error,'generation_unavailable');assert(row.child_details);db.close();
});
test('expired worker leases recover without losing the order',async()=>{
 const db=database();add(db,'one');db.prepare("UPDATE orders SET generation_status='generating',generation_attempts=1,generation_lease=1").run();const queue=createGenerationQueue({db,generate:async()=>generated()});await queue.runOnce();assert.equal(db.prepare('SELECT generation_status FROM orders').get().generation_status,'ready');db.close();
});
