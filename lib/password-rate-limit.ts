// Instance-local admission control supplements the deployment's distributed WAF.
// It must never be presented as a serverless-wide limiter.
const buckets=new Map<string,{count:number;until:number}>();
export function admitPasswordAttempt(key:string,now=Date.now()){
  for(const [id,b] of buckets)if(b.until<=now)buckets.delete(id);
  const b=buckets.get(key)||{count:0,until:now+60000};b.count++;buckets.set(key,b);
  return b.count<=5;
}
export function productionRateLimitReady(){
  return process.env.NODE_ENV!=='production'||(process.env.VERCEL==='1'&&process.env.PASSWORD_RATE_LIMIT==='vercel-waf');
}
