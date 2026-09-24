import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrateGeneration} from '../apps/api/src/generation-queue.js';
import {migrateEmail} from '../apps/api/src/email-queue.js';
import {migratePdfStore} from '../apps/api/src/pdf-store.js';
import {generatedVersion,saveManualLetter} from '../apps/api/src/letter-revisions.js';
import {migrateRetention,retentionDeadline,purgeExpiredLetters,expiredOrder,markOrderPaid} from '../apps/api/src/retention.js';
const now=Date.UTC(2026,8,23);
function setup(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE orders(id TEXT PRIMARY KEY,user_id TEXT,status TEXT,letter TEXT,access_token TEXT,checkout_id TEXT)');migrateGeneration(db);migrateEmail(db);migratePdfStore(db);return db;}
test('six calendar months clamp month-end and preserve UTC time',()=>{
 assert.equal(new Date(retentionDeadline(Date.UTC(2026,7,31,12))).toISOString(),'2027-02-28T12:00:00.000Z');
 assert.equal(new Date(retentionDeadline(Date.UTC(2023,7,31))).toISOString(),'2024-02-29T00:00:00.000Z');
});
test('cleanup removes every content store and token, preserves accounting and cannot resurrect letters',()=>{
 const db=setup();
 db.prepare("INSERT INTO orders(id,status,letter,created_at,checkout_id,buyer_email,child_details,access_token,link_token_hash,generation_status,generation_token,amount_cents) VALUES('old','paid','Child secret',?,'cs_old','buyer@example.com','child data','guest','private','generating','worker',399)").run(Date.UTC(2026,2,23));
 db.prepare("INSERT INTO orders(id,status,letter,created_at) VALUES('new','pending','keep',?)").run(now);
 migrateRetention(db,now);const old=db.prepare("SELECT * FROM orders WHERE id='old'").get();
 db.prepare("INSERT INTO letter_versions(order_id,version,letter,source,created_at) VALUES('old',1,'Child secret','generated',?)").run(now);
 db.prepare("INSERT INTO rewrite_requests VALUES('rewrite','old','private instructions','[]',1,'queued',?)").run(now);
 db.prepare("INSERT INTO letter_pdfs(order_id,version,pdf,created_at) VALUES('old',1,?,?)").run(Buffer.from('private PDF'),now);
 assert.equal(purgeExpiredLetters(db,now-1),0);assert.equal(purgeExpiredLetters(db,now),1);assert.equal(purgeExpiredLetters(db,now),0);
 const clean=db.prepare("SELECT * FROM orders WHERE id='old'").get();assert(expiredOrder(clean,now));
 for(const name of ['child_details','access_token','link_token_hash','generation_token','email_token'])assert.equal(clean[name],null);
 assert.equal(clean.letter,'');assert.equal(clean.amount_cents,399);assert.equal(clean.checkout_id,'cs_old');
 for(const table of ['letter_versions','rewrite_requests','letter_pdfs'])assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,0);
 assert.equal(generatedVersion(db,old,{letter:'late secret'},'hash','worker'),false);
 assert.throws(()=>saveManualLetter(db,'old',{version:0,letter:'new secret',editor:'admin'}),/expired/);
 markOrderPaid(db,'old','cs_old',now);assert(expiredOrder(db.prepare("SELECT * FROM orders WHERE id='old'").get(),now));
 assert.equal(db.prepare("SELECT letter FROM orders WHERE id='new'").get().letter,'keep');db.close();
});
test('first payment starts retention; duplicate events do not extend it; unknown legacy dates get migration grace',()=>{
 const db=setup();db.exec("INSERT INTO orders(id,status,letter,checkout_id) VALUES('order','pending','','cs')");migrateRetention(db,now);
 assert.equal(db.prepare('SELECT expires_at FROM orders').get().expires_at,retentionDeadline(now));
 markOrderPaid(db,'order','cs',now+1000);markOrderPaid(db,'order','cs',now+999999);
 assert.equal(db.prepare('SELECT expires_at FROM orders').get().expires_at,retentionDeadline(now+1000));db.close();
});

test('privacy and purchase terms expose the same retention rule in every language',async()=>{
 const {policyData}=await import('../packages/shared/legal.js');
 const {retentionCopy}=await import('../packages/shared/retention-copy.js');
 for(const [language,section] of Object.entries(retentionCopy)){
  for(const type of ['privacy','terms'])assert(policyData(type,language).sections.some(([heading,body])=>heading===section[0]&&body===section[1]));
 }
 assert(!policyData('privacy').sections.some(([,body])=>body.includes('does not currently delete')));
});
