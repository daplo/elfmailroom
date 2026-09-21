import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mountAdmin} from '../apps/api/src/admin.js';
import {createLetterGenerator} from '../apps/api/src/letter-generator.js';

const details={language:'en-AU',name:'Sophie',wish:'a bicycle',proud:'learning to swim',pet:'Biscuit',message:'How do the reindeer fly?'};
const payload={details,design:'woodland'};
const content={paragraphs:['Your lovely letter has arrived at the North Pole, and I am delighted to read it.','Learning to swim takes practice and courage, and every small step is something to celebrate.','The reindeer are getting ready for Christmas while the elves tie ribbons around their parcels.'],closing:'With a warm Christmas hug,'};

async function fixture(t,generate,{configured=true}={}){
 const db=new DatabaseSync(':memory:');
 const env={OPENAI_API_KEY:configured?'test-key':''};
 const app=express();app.use(express.json());
 mountAdmin(app,db,{origin:'http://localhost',env,generate});
 const token='test-admin-session';
 db.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),'admin@example.com',Date.now()+60000);
 const server=await new Promise(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();});
 const request=(body=payload,authenticated=true)=>fetch(`http://127.0.0.1:${server.address().port}/api/admin/test-letters`,{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Cookie:`elf_admin=${token}`}:{})},body:JSON.stringify(body)});
 return {db,request};
}

test('admin test generation requires a session, validates details, uses regional prompts and creates no purchase records',async t=>{
 const calls=[];
 const generate=createLetterGenerator({client:{responses:{create:async request=>{calls.push(request);return {status:'completed',model:'test-model',output_text:JSON.stringify(content)};}}}});
 const{db,request}=await fixture(t,generate);
 assert.equal((await request(payload,false)).status,401);
 assert.equal(calls.length,0);
 assert.equal((await request({details:{...details,name:''},design:'unknown'})).status,400);
 assert.equal(calls.length,0);
 for(const [language,prompt]of [['en-GB','British English'],['en-US','American English'],['en-AU','Australian English'],['pl','Polish']]){
  const response=await request({details:{...details,language},design:'woodland'});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const result=await response.json();assert.equal(result.model,'test-model');assert.equal(result.design,'woodland');assert.equal(result.details.language,language);assert.match(result.letter,language==='pl'?/^Cześć, Sophie!/:/^Dear Sophie,/);
  assert(calls.at(-1).instructions.includes(`Required output language: ${prompt}.`));
  assert.deepEqual(JSON.parse(calls.at(-1).input).child_details,{...details,language});
 }
 assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name),['admin_sessions']);
 const limited=await request();assert.equal(limited.status,429);assert.match((await limited.json()).error,/wait a minute/);assert.equal(calls.length,4);
});

test('Australian stationery is accepted for admin test letters',async t=>{
 const {request}=await fixture(t,async()=>({letter:'Dear Sophie, have a wonderful sunny Christmas!',model:'test-model'}));
 for(const design of ['beach','barbecue']){
  const response=await request({details,design});
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.design,design);assert.equal(result.details.language,'en-AU');
 }
});

test('missing configuration and provider failures return actionable errors without leaking provider data',async t=>{
 let called=false;
 const missing=await fixture(t,async()=>{called=true},{configured:false});
 const unavailable=await missing.request();assert.equal(unavailable.status,503);assert.match((await unavailable.json()).error,/OPENAI_API_KEY/);assert.equal(called,false);
 let attempts=0;
 const failing=await fixture(t,async()=>{if(++attempts===1)throw new Error('secret-provider-detail');return {letter:'Dear Sophie, a new test letter.',model:'test-model'};});
 const failed=await failing.request();assert.equal(failed.status,502);assert.doesNotMatch(JSON.stringify(await failed.json()),/secret-provider-detail/);
 assert.equal((await failing.request()).status,200);
});

test('only one admin test request runs at a time and the lock is released on completion',async t=>{
 let release,started;
 const ready=new Promise(resolve=>{started=resolve});
 const{request}=await fixture(t,()=>{started();return new Promise(resolve=>{release=resolve});});
 const first=request();await ready;
 const overlap=await request();assert.equal(overlap.status,409);assert.match((await overlap.json()).error,/already being generated/);
 release({letter:'Dear Sophie, a new test letter.',model:'test-model'});
 assert.equal((await first).status,200);
});
