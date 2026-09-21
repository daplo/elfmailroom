import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import nodemailer from 'nodemailer';
import {createEmailSender,emailConfigured} from '../apps/api/src/email.js';
import {migrateEmail,createEmailQueue} from '../apps/api/src/email-queue.js';
import {designs} from '../packages/shared/config.js';
function database(){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE orders(id TEXT PRIMARY KEY,status TEXT,letter TEXT,design TEXT,generation_status TEXT DEFAULT 'ready')");migrateEmail(db);return db;}
function add(db,id,status='paid',letter='Dear Sophie, a special letter from Santa.'){db.prepare("INSERT INTO orders(id,status,letter,design,buyer_email,email_status) VALUES(?,?,?,'classic','parent@example.com','queued')").run(id,status,letter);}
test('email uses the selected illustrated PDF and a real multipart message without network delivery',async()=>{
 const transport=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});const messages=[];const raw=[];
 const sender=createEmailSender({env:{EMAIL_FROM:'santa@example.com'},transport:{sendMail:async message=>{messages.push(message);const result=await transport.sendMail(message);raw.push(result.message.toString());return {...result,accepted:['parent@example.com']};}}});
 for(const design of designs)await sender({id:'order-'+design.id,status:'paid',letter:'Dear Sophie, a little Christmas magic is on its way to you.',design:design.id,buyer_email:'parent@example.com'});
 for(let i=0;i<designs.length;i++){const message=messages[i];assert.equal(message.to.address,'parent@example.com');assert.equal(message.attachments[0].content.subarray(0,5).toString(),'%PDF-');assert.equal(message.attachments[0].contentType,'application/pdf');assert.equal(message.attachments[1].cid,'stationery');assert.match(message.html,/cid:stationery/);assert(message.text.includes(designs[i].name));assert.match(raw[i],/Content-Type: application\/pdf/);assert.match(raw[i],/Content-Disposition: attachment/);assert.match(raw[i],/Content-ID: <stationery>/);assert(!message.html.includes('Dear Sophie'));}
 assert.equal(emailConfigured({}),false);await assert.rejects(createEmailSender({env:{}})({}),/not_configured/);
});
test('email worker sends only ready, paid letters and does not resend completed jobs',async()=>{
 const db=database();add(db,'unpaid','pending');add(db,'not-ready','paid','');add(db,'ready');let calls=0;const queue=createEmailQueue({db,send:async order=>{calls++;assert.equal(order.id,'ready');return {messageId:'message-1'};}});await Promise.all([queue.runOnce(),queue.runOnce()]);await queue.runOnce();assert.equal(calls,1);assert.equal(db.prepare("SELECT email_status FROM orders WHERE id='ready'").get().email_status,'sent');assert.equal(db.prepare("SELECT letter FROM orders WHERE id='ready'").get().letter,'Dear Sophie, a special letter from Santa.');db.close();
});
test('transient failures back off and stop without breaking the paid letter',async()=>{
 const db=database();add(db,'one');let time=1000;let calls=0;const queue=createEmailQueue({db,now:()=>time,retryDelay:100,send:async()=>{calls++;throw Object.assign(new Error('temporary SMTP issue'),{responseCode:451});}});await queue.runOnce();assert.equal(await queue.runOnce(),false);time+=100;await queue.runOnce();time+=200;await queue.runOnce();time+=1000;assert.equal(await queue.runOnce(),false);const order=db.prepare('SELECT * FROM orders').get();assert.equal(calls,3);assert.equal(order.email_status,'failed');assert.equal(order.status,'paid');assert(order.letter);db.close();
});
test('ambiguous timeouts and interrupted sends require review instead of automatic duplicates',async()=>{
 const db=database();add(db,'timeout');const queue=createEmailQueue({db,send:async()=>{throw Object.assign(new Error('timeout'),{code:'ETIMEDOUT'});}});await queue.runOnce();assert.equal(db.prepare("SELECT email_error FROM orders WHERE id='timeout'").get().email_error,'delivery_unknown');add(db,'crashed');db.prepare("UPDATE orders SET email_status='sending',email_lease=1 WHERE id='crashed'").run();assert.equal(await queue.runOnce(),false);assert.equal(db.prepare("SELECT email_error FROM orders WHERE id='crashed'").get().email_error,'delivery_unknown');db.close();
});

test('unaccepted purchases receive only a private review link; accepted versions receive the PDF',async()=>{
 const messages=[];let renders=0;
 const sender=createEmailSender({env:{EMAIL_FROM:'santa@example.com',PUBLIC_URL:'https://elfmailroom.com',ORDER_LINK_SECRET:'a-long-test-secret-with-at-least-32-characters'},pdf:async()=>{renders++;return Buffer.from('%PDF-test');},transport:{sendMail:async message=>{messages.push(message);return {messageId:'msg',accepted:['parent@example.com']};}}});
 const order={id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',status:'paid',letter:'Dear Sophie, here is your Christmas letter.',design:'jolly',buyer_email:'parent@example.com',link_token_hash:'hash',letter_version:2,accepted_version:null};
 await sender(order);assert.equal(renders,0);assert.equal(messages[0].attachments.length,1);assert.match(messages[0].text,/\/write\/purchase\/.*#token=/);assert.match(messages[0].subject,/review/);
 await sender({...order,accepted_version:2});assert.equal(renders,1);assert.equal(messages[1].attachments[0].contentType,'application/pdf');assert.notEqual(messages[0].messageId,messages[1].messageId);
});
