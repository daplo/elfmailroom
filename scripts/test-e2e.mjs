import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'elf-e2e-'));
const origin='http://127.0.0.1:3212';
const env={...process.env,PORT:'3212',PUBLIC_URL:origin,DATABASE_PATH:path.join(temp,'orders.sqlite'),OPENAI_API_KEY:'',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:'',EMAIL_ENABLED:'false',SALES_ENABLED:'false',ADMIN_EMAIL:'',ADMIN_PASSWORD_HASH:'',ORDER_LINK_SECRET:'e2e-only-secret-not-for-production-12345678',E2E_BASE_URL:origin};
let output='';
const server=spawn(process.execPath,['apps/api/src/server.js'],{env,stdio:['ignore','pipe','pipe']});
server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
let startupError;server.on('error',e=>startupError=e);
async function run(file){
 console.log('\nE2E: '+file);
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[file],{env,stdio:'inherit'});
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error(file+' timed out'))},180000);
  child.on('error',e=>{clearTimeout(timer);reject(e)});
  child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(file+' failed ('+code+')'))});
 });
}
try{
 await mkdir('test-results',{recursive:true});
 let ready=false;
 for(let i=0;i<100;i++){
  if(startupError||server.exitCode!==null)throw startupError||new Error(output);
  try{if((await fetch(origin+'/api/config')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 if(!ready)throw new Error('Test API startup timed out: '+output);
 for(const file of ['tests/browser.mjs','tests/languages-browser.mjs','tests/review-browser.mjs','tests/seo-browser.mjs','tests/cookies-browser.mjs'])await run(file);
}finally{
 server.kill();
 if(server.exitCode===null)await new Promise(resolve=>server.once('exit',resolve));
 await rm(temp,{recursive:true,force:true});
}
