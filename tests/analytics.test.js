import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readConsent,saveConsent,consentKey,consentLifetime} from '../packages/shared/analytics.js';
test('consent requires a valid choice, version and unexpired bounded lifetime',()=>{
 const now=1000000,storage=value=>({getItem:()=>JSON.stringify(value)});
 for(const choice of ['accepted','rejected'])assert.equal(readConsent(storage({version:1,choice,expires:now+consentLifetime}),now),choice);
 for(const value of [null,{}, {version:2,choice:'accepted',expires:now+100}, {version:1,choice:'yes',expires:now+100}, {version:1,choice:'accepted',expires:now}, {version:1,choice:'accepted',expires:now+consentLifetime+1}])assert.equal(readConsent(storage(value),now),null);
 assert.equal(readConsent({getItem:()=>'{broken'}),null);
 assert.equal(readConsent({getItem:()=>{throw Error('storage blocked')}}),null);
});
test('consent persists both acceptance and rejection without breaking blocked-storage browsers',()=>{
 let key,value;const storage={setItem:(k,v)=>{key=k;value=v},getItem:()=>value};
 for(const choice of ['accepted','rejected']){saveConsent(storage,choice);assert.equal(key,consentKey);assert.equal(readConsent(storage),choice)}
 assert.doesNotThrow(()=>saveConsent({setItem:()=>{throw Error('quota')}},'rejected'));
});
