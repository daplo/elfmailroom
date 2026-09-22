import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readConsent,saveConsent,consentKey,consentLifetime,sanitizeEvent,trackEvent} from '../packages/shared/analytics.js';
test('analytics accepts only known events and enumerated parameters, never personal content',()=>{
 assert.equal(sanitizeEvent('child_name',{name:'Sophie'}),null);
 assert.equal(sanitizeEvent('constructor',{}),null);
 assert.deepEqual(sanitizeEvent('create_letter_click',{placement:'hero',email:'private@example.com',text:'secret',page_location:'https://example.com/#secret'}),{placement:'hero'});
 assert.equal(sanitizeEvent('template_select',{template_id:'private-name'}),null);
 assert.equal(sanitizeEvent('scroll_depth',{percent_scrolled:45}),null);
 assert.equal(sanitizeEvent('faq_open',{faq_id:'a private question'}),null);
 assert.equal(sanitizeEvent('language_select',{target_language:'en',placement:'private'}),null);
 for(const template_id of ['classic','woodland','starlight','jolly','beach','barbecue'])assert.deepEqual(sanitizeEvent('template_select',{template_id}),{template_id});
 assert.equal(trackEvent('landing_view'),false,'No events before consent starts analytics');
});
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
