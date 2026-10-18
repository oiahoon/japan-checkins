import {createHash, randomUUID} from 'node:crypto';

// Server-only, short-lived coordination. GitHub remains the durable source of truth.
type Environment = Record<string, string | undefined>;
export type RedisConfig = {url:string;token:string;namespace:string};
export class CoordinationUnavailable extends Error {
  constructor(){super('Temporary coordination unavailable');}
}
export class JournalBusy extends Error {
  constructor(){super('Journal write in progress');}
}

export function redisConfig(env:Environment=process.env):RedisConfig|undefined {
  const mode=env.JOURNAL_KV||'off';
  if(mode==='off')return;
  if(mode!=='redis')throw new CoordinationUnavailable();
  // Never combine a URL from one credential pair with a token from another.
  const primary=Boolean(env.UPSTASH_REDIS_REST_URL||env.UPSTASH_REDIS_REST_TOKEN);
  const url=primary?env.UPSTASH_REDIS_REST_URL:env.KV_REST_API_URL;
  const token=primary?env.UPSTASH_REDIS_REST_TOKEN:env.KV_REST_API_TOKEN;
  const namespace=env.JOURNAL_KV_NAMESPACE;
  if(!url||!token||/[\r\n]/.test(token)||!namespace||!/[a-z0-9]/i.test(namespace)||!/^[-a-zA-Z0-9_:]{3,100}$/.test(namespace))throw new CoordinationUnavailable();
  try{
    const parsed=new URL(url);
    // Credentials must only go to an Upstash HTTPS origin, never redirects or query strings.
    if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.upstash.io')||parsed.port||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw Error();
    return {url:parsed.origin,token,namespace};
  }catch{throw new CoordinationUnavailable();}
}

export class JournalRedis {
  private config:RedisConfig;
  private transport:typeof fetch;
  constructor(config:RedisConfig,transport:typeof fetch=fetch){this.config=config;this.transport=transport;}
  key(purpose:'write'|'login',scope:string){
    return `${this.config.namespace}:v1:${purpose}:${createHash('sha256').update(scope).digest('hex')}`;
  }
  async command(args:(string|number)[]):Promise<unknown>{
    try{
      // No automatic retries: a timeout may have executed SET/EVAL remotely.
      const response=await this.transport(this.config.url,{method:'POST',headers:{Authorization:`Bearer ${this.config.token}`,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(2000)});
      if(!response.ok)throw Error();
      const body=await response.json();
      if(!body||typeof body!=='object'||!Object.hasOwn(body,'result')||Object.hasOwn(body,'error'))throw Error();
      return (body as {result:unknown}).result;
    }catch{throw new CoordinationUnavailable();} // Never expose provider errors, URLs or tokens.
  }
  async ping(){if(await this.command(['PING'])!=='PONG')throw new CoordinationUnavailable();}
  async admitLogin(){
    // One global five-attempt / 60s window per namespace, starting at first attempt.
    // Atomic Lua gives every instance the same answer; denied attempts do not extend TTL.
    const result=await this.command(['EVAL',LOGIN_SCRIPT,1,this.key('login','global')]);
    if(result!==0&&result!==1)throw new CoordinationUnavailable();
    return result===1;
  }
  async withWriteLease<T>(scope:string,work:()=>Promise<T>):Promise<T>{
    const key=this.key('write',scope),token=randomUUID();
    const acquired=await this.command(['SET',key,token,'NX','EX',60]);
    if(acquired===null)throw new JournalBusy();
    if(acquired!=='OK')throw new CoordinationUnavailable();
    try{return await work();}
    finally{
      // A failed release must not turn a completed Git commit into a failed save.
      // TTL recovers a crashed worker; compare/delete cannot erase a successor's lease.
      await this.command(['EVAL',RELEASE_SCRIPT,1,key,token]).catch(()=>undefined);
    }
  }
}
export const LOGIN_SCRIPT=`local n = tonumber(redis.call('GET', KEYS[1]) or '0')
if n >= 5 then return 0 end
if n == 0 then redis.call('SET', KEYS[1], 1, 'EX', 60)
else redis.call('INCR', KEYS[1]) end
return 1`;
export const RELEASE_SCRIPT=`if redis.call('GET', KEYS[1]) == ARGV[1] then
return redis.call('DEL', KEYS[1]) end
return 0`;

export function journalRedis(){const config=redisConfig();return config?new JournalRedis(config):undefined;}
export async function withJournalWriteLease<T>(scope:string,work:()=>Promise<T>){
  const redis=journalRedis();return redis?redis.withWriteLease(scope,work):work();
}
