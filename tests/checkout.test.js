import {test} from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {createLetterCheckout} from '../apps/api/src/checkout.js';
test('Stripe request charges exactly 399 USD cents once and ignores client price fields',async()=>{
 let request;
 const client=new Stripe('sk_test_not_a_real_key',{httpClient:Stripe.createFetchHttpClient(async(url,options)=>{request={url:String(url),params:new URLSearchParams(options.body),headers:options.headers};return new Response(JSON.stringify({id:'cs_test',url:'https://checkout.stripe.com/test'}),{headers:{'content-type':'application/json'}});})});
 const result=await createLetterCheckout(client,{email:'parent@example.com',orderId:'order-123',origin:'https://elfmailroom.com',amount:1,currency:'eur',quantity:100});
 assert.equal(result.id,'cs_test');assert.match(request.url,/checkout\/sessions/);assert.equal(request.params.get('mode'),'payment');assert.equal(request.params.get('line_items[0][price_data][unit_amount]'),'399');assert.equal(request.params.get('line_items[0][price_data][currency]'),'usd');assert.equal(request.params.get('line_items[0][quantity]'),'1');assert.equal(request.params.get('adaptive_pricing[enabled]'),'false');assert.equal(request.params.get('allow_promotion_codes'),'false');assert.equal(request.params.get('customer_email'),'parent@example.com');assert.equal(request.params.get('metadata[orderId]'),'order-123');assert.equal(request.params.get('success_url'),'https://elfmailroom.com/write/?order=order-123');assert.equal(request.params.get('line_items[0][price_data][recurring]'),null);
});

test('Stripe checkout follows the website locale and describes a digital download in that language',async()=>{
 const {languages,translate,digitalNotice}=await import('../packages/shared/locales.js');
 for(const{code}of languages){let request;await createLetterCheckout({checkout:{sessions:{create:async value=>{request=value;return {id:'test'}}}}},{email:'parent@example.com',orderId:'test',origin:'https://example.com',language:code});assert.equal(request.locale,code);assert.equal(request.line_items[0].price_data.product_data.description,translate(code,digitalNotice));assert.equal(request.line_items[0].price_data.unit_amount,399);}
});
