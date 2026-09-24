import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mountAdmin} from '../apps/api/src/admin.js';
import {migrateGeneration} from '../apps/api/src/generation-queue.js';
import {migrateEmail} from '../apps/api/src/email-queue.js';
import {migratePdfStore} from '../apps/api/src/pdf-store.js';
import {migrateRetention} from '../apps/api/src/retention.js';
test('admin PDFs require authentication, render sample artwork and reject expired letters',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE orders(id TEXT PRIMARY KEY,status TEXT,letter TEXT,design TEXT)');migrateGeneration(db);migrateEmail(db);migratePdfStore(db);migrateRetention(db);
 const app=express();app.use(express.json());mountAdmin(app,db,{origin:'http://localhost',env:{},generate:async()=>{}});
 const token='admin-pdf-test';db.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),'admin@example.com',Date.now()+60000);
 db.prepare("INSERT INTO orders(id,status,letter,design,letter_version,generation_status) VALUES('sample','sample',?,'classic',1,'ready')").run('Dear Sophie,\n\nYour lovely letter has arrived at the North Pole. The reindeer are practising their gentle landings while the elves prepare for Christmas.\n\nWith a snowy hug,');
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/api/admin/orders/sample/pdf`;const headers={Cookie:`elf_admin=${token}`};
 try{
 assert.equal((await fetch(url)).status,401);
 const r=await fetch(url,{headers});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.match(r.headers.get('content-disposition'),/^inline/);
 const pdf=Buffer.from(await r.arrayBuffer());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert(pdf.includes(Buffer.from('/Subtype /Image')));
 assert.equal(db.prepare('SELECT COUNT(*) n FROM letter_pdfs').get().n,1);
 db.prepare('UPDATE letter_pdfs SET renderer_version=0,pdf=?').run(Buffer.from('obsolete renderer'));
 const refreshed=Buffer.from(await(await fetch(url,{headers})).arrayBuffer());assert.equal(refreshed.subarray(0,5).toString(),'%PDF-');
 assert.equal(db.prepare('SELECT renderer_version FROM letter_pdfs').get().renderer_version,5);
 db.prepare("UPDATE orders SET expires_at=? WHERE id='sample'").run(Date.now()-1);assert.equal((await fetch(url,{headers})).status,404);
 }finally{await new Promise(r=>server.close(r));db.close();}
});
