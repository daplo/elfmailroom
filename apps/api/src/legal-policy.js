import {readFileSync} from 'node:fs';
import {legalConfig,policyVersion} from '../../../packages/shared/legal.js';
export function publishedPolicies(env,manifestPath){
 const config=legalConfig(env);let ready=false;
 try{const published=JSON.parse(readFileSync(manifestPath,'utf8'));ready=config.ready&&published.version===policyVersion&&JSON.stringify(published.config)===JSON.stringify(config)}catch{}
 return {config,ready};
}
