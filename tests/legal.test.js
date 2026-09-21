import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {legalConfig,policyDocument,policyVersion} from '../packages/shared/legal.js';
import {publishedPolicies} from '../apps/api/src/legal-policy.js';
const env={VITE_BUSINESS_NAME:'Webz Australia',VITE_BUSINESS_COUNTRY:'Australia',VITE_BUSINESS_ADDRESS:'Test business address',VITE_SUPPORT_EMAIL:'support@example.com',VITE_PRIVACY_RETENTION:'Test retention schedule',VITE_PRIVACY_PROVIDERS:'Test provider information'};
test('policy drafts are explicit and populated values are escaped in all five languages',()=>{
 assert.equal(legalConfig({VITE_BUSINESS_NAME:'Webz Australia'}).ready,false);
 for(const code of ['en','de','es','fr','pl'])for(const type of ['privacy','terms']){const html=policyDocument(type,code,legalConfig({}));assert(html.includes('class="legal-draft"'));assert(html.includes(`lang="${code}"`));assert(html.includes('noindex,follow'));const complete=policyDocument(type,code,legalConfig({...env,VITE_BUSINESS_NAME:'<script>alert(1)</script>'}));assert(!complete.includes('<script>'));assert(complete.includes('&lt;script&gt;'));assert(!complete.includes('class="legal-draft"'));if(type==='terms'){assert(complete.includes('id="cancellation"'));assert(complete.includes('Australian Consumer Law'));}}
 const terms=policyDocument('terms','en',legalConfig(env));assert(terms.includes('This checkout does not ask you to waive that right'));assert(terms.includes('Simply changing your mind'));assert(terms.includes(policyVersion));
});
test('sales require complete public details and a matching built policy version',()=>{
 const temp=mkdtempSync(path.join(tmpdir(),'elf-legal-')),file=path.join(temp,'manifest.json');try{assert.equal(publishedPolicies(env,file).ready,false);writeFileSync(file,JSON.stringify({version:policyVersion,config:legalConfig(env)}));assert.equal(publishedPolicies(env,file).ready,true);assert.equal(publishedPolicies({...env,VITE_SUPPORT_EMAIL:'changed@example.com'},file).ready,false);assert.equal(publishedPolicies({...env,VITE_PRIVACY_RETENTION:''},file).ready,false);writeFileSync(file,JSON.stringify({version:'old',config:legalConfig(env)}));assert.equal(publishedPolicies(env,file).ready,false)}finally{rmSync(temp,{recursive:true,force:true})}
});
