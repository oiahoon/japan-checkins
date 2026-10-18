import {randomUUID} from 'node:crypto';
import {JournalRedis,JournalBusy,RELEASE_SCRIPT,redisConfig,type RedisConfig} from './journal-kv.ts';

// Operator-triggered, isolated TTL keys only; callers cannot supply keys or commands.
export async function verifyRedisCoordination(config:RedisConfig,transport:typeof fetch=fetch,pause:(ms:number)=>Promise<void>=ms=>new Promise(r=>setTimeout(r,ms))){
 const redis=new JournalRedis({...config,namespace:`${config.namespace}:verify:${randomUUID()}`},transport);
 const requireResult=(ok:boolean)=>{if(!ok)throw Error('Redis coordination verification failed')};
 await redis.ping();
 const key=redis.key('write','lease');
 await redis.withWriteLease('lease',async()=>{
  const ttl=await redis.command(['TTL',key]);requireResult(typeof ttl==='number'&&ttl>0&&ttl<=60);
  let excluded=false;
  try{await redis.withWriteLease('lease',async()=>{})}catch(e){if(e instanceof JournalBusy)excluded=true;else throw e}
  requireResult(excluded);
  requireResult(await redis.command(['EVAL',RELEASE_SCRIPT,1,key,'synthetic-wrong-holder'])===0);
  requireResult(typeof await redis.command(['GET',key])==='string');
 });
 requireResult(await redis.command(['GET',key])===null);
 await redis.withWriteLease('lease',async()=>{});
 requireResult(await redis.command(['GET',key])===null);
 const expiry=redis.key('write','expiry'),first=randomUUID(),next=randomUUID();
 requireResult(await redis.command(['SET',expiry,first,'NX','EX',2])==='OK');
 const ttl=await redis.command(['TTL',expiry]);requireResult(typeof ttl==='number'&&ttl>0&&ttl<=2);
 await pause(2100);
 requireResult(await redis.command(['SET',expiry,next,'NX','EX',5])==='OK');
 try{
  requireResult(await redis.command(['EVAL',RELEASE_SCRIPT,1,expiry,first])===0);
  requireResult(await redis.command(['GET',expiry])===next);
 }finally{await redis.command(['EVAL',RELEASE_SCRIPT,1,expiry,next]).catch(()=>undefined)}
 return {ok:true as const,message:'真实 Redis PING、SET NX、EVAL、TTL 到期、锁互斥及旧持有者安全释放通过；未操作照片或记录。'};
}
export async function checkConfiguredRedis(){
 try{
  const config=redisConfig();
  if(!config)return {ok:false,message:'尚未启用 Redis 协调。'};
  return await verifyRedisCoordination(config);
 }catch{return {ok:false,message:'Redis 写入锁验证未通过，请检查连接、SET/EVAL 权限或额度；测试键最迟60秒到期。'};}
}
