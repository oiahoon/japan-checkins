import {randomBytes} from 'node:crypto';
import {hashPassword} from './password.ts';

/** @param {string} source @returns {Record<string,string>} */
export function parseEnv(source){
 const values={};
 for(const line of source.split('\n')){const m=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);if(!m)continue;let value=m[2].trim();if(value.startsWith('"')&&value.endsWith('"')){try{value=JSON.parse(value)}catch{}}else if(value.startsWith("'")&&value.endsWith("'"))value=value.slice(1,-1);values[m[1]]=value;}
 return values;
}
const keys=['AUTH_PROVIDER','JOURNAL_VISIBILITY','APP_URL','SESSION_SECRET','JOURNAL_OWNER_ID','ADMIN_PASSWORD_HASH','VIEWER_PASSWORD_HASH','PASSWORD_RATE_LIMIT','PASSWORD_RATE_LIMIT_DIR','GITHUB_DATA_REPOSITORY','GITHUB_DATA_BRANCH','GITHUB_DATA_TOKEN','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','GITHUB_ALLOWED_USER_ID','GEOAPIFY_API_KEY','JOURNAL_KV','JOURNAL_KV_NAMESPACE','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN','PHOTO_DELIVERY','IMAGEKIT_URL_ENDPOINT','IMAGEKIT_PRIVATE_KEY','IMAGEKIT_PRIVATE_DELIVERY_CONFIRMED'];
export const serializeEnv=values=>keys.filter(key=>values[key]!==undefined).map(key=>`${key}=${JSON.stringify(values[key])}`).join('\n')+'\n';
/** @param {string} source @param {{target?:string,repository?:string,token?:string,url?:string,wafConfigured?:boolean,photoDelivery?:string,imagekit?:{endpoint:string,privateKey:string,confirmed:boolean}} options */
export async function prepareSetup(source,{target='local',repository,token,url,wafConfigured=false,photoDelivery,imagekit}={}){
 if(!['local','vercel','server'].includes(target))throw Error('target 只能为 local、vercel 或 server');
 const values=parseEnv(source);
 const password=values.ADMIN_PASSWORD_HASH?null:randomBytes(20).toString('base64url');
 const defaults={AUTH_PROVIDER:'password',JOURNAL_VISIBILITY:'private',APP_URL:'http://localhost:3000',JOURNAL_OWNER_ID:'journal-owner',SESSION_SECRET:randomBytes(32).toString('hex'),GITHUB_DATA_BRANCH:'main',PHOTO_DELIVERY:'git'};
 for(const [key,value] of Object.entries(defaults))if(!values[key])values[key]=value;
 if(password)values.ADMIN_PASSWORD_HASH=await hashPassword(password);
 if(repository!==undefined)values.GITHUB_DATA_REPOSITORY=repository;
 if(token!==undefined)values.GITHUB_DATA_TOKEN=token;
 if(url!==undefined)values.APP_URL=url;
 if(values.GITHUB_DATA_REPOSITORY&&!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(values.GITHUB_DATA_REPOSITORY))throw Error('数据仓库使用 owner/repository 格式');
 if(photoDelivery!==undefined){if(!['git','imagekit'].includes(photoDelivery))throw Error('图片加速只能为 git 或 imagekit');values.PHOTO_DELIVERY=photoDelivery;}
 if(imagekit){values.IMAGEKIT_URL_ENDPOINT=imagekit.endpoint;values.IMAGEKIT_PRIVATE_KEY=imagekit.privateKey;values.IMAGEKIT_PRIVATE_DELIVERY_CONFIRMED=String(imagekit.confirmed);}
 const deployment={...values};
 if(target==='vercel'){
  if(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(deployment.APP_URL))delete deployment.APP_URL;
  deployment.PASSWORD_RATE_LIMIT=values.PASSWORD_RATE_LIMIT==='redis'?'redis':wafConfigured||values.PASSWORD_RATE_LIMIT==='vercel-waf'?'vercel-waf':'';
 }else if(target==='server'){
  const address=new URL(deployment.APP_URL);if(address.protocol!=='https:'||address.pathname!=='/'||address.search||address.hash||address.username||address.password)throw Error('自有服务器需要 --url https://你的域名，不能包含路径或登录信息');
  deployment.PASSWORD_RATE_LIMIT=values.PASSWORD_RATE_LIMIT==='redis'?'redis':'file';
 }
 return {values,deployment,password,target};
}
