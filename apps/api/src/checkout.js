import {localeCode,translate,digitalNotice} from '../../../packages/shared/locales.js';
import {santaLetterPrice} from '../../../packages/shared/config.js';
export function createLetterCheckout(stripe,{email,orderId,origin,returnUrl,language='en'}, {priceId=process.env.STRIPE_PRICE_ID}={}){
 if(priceId&&!/^price_[A-Za-z0-9]+$/.test(priceId))throw new Error('Invalid configured Stripe price ID');
 const code=localeCode(language),t=key=>translate(code,key);
 return stripe.checkout.sessions.create({
  mode:'payment',customer_email:email,locale:code,
  line_items:[{quantity:1,...(priceId?{price:priceId}:{price_data:{currency:santaLetterPrice.currency,unit_amount:santaLetterPrice.amount,product_data:{name:t('Personalised Santa Letter'),description:t(digitalNotice)}}})}],
  consent_collection:{terms_of_service:'required'},billing_address_collection:'auto',
  adaptive_pricing:{enabled:false},allow_promotion_codes:false,
  metadata:{orderId},success_url:returnUrl||`${origin}/write/?order=${orderId}`,cancel_url:`${origin}/write/?cancelled=1`
 },{idempotencyKey:orderId});
}
