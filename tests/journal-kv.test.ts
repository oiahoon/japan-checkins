import test from 'node:test';
import assert from 'node:assert/strict';
import {redisConfig,JournalRedis,CoordinationUnavailable,JournalBusy,LOGIN_SCRIPT,RELEASE_SCRIPT,withJournalWriteLease} from '../lib/journal-kv.ts';
import {admitLoginAttempt,productionRateLimitReady} from '../lib/password-rate-limit.ts';
import {prepareSetup,serializeEnv} from '../lib/setup-env.mjs';
import {GitHubStore} from '../lib/github-store.ts';
import {journalAPI} from '../lib/github-service.ts';
import {emptyJournal,appendVisit,visitInput,type Journal} from '../lib/travel-data.ts';
import {verifyRedisCoordination} from '../lib/journal-kv-check.ts';
import {deploymentChecks} from '../lib/deployment-check.ts';
const config={url:'https://synthetic.upstash.io',token:'synthetic-secret',namespace:'synthetic:production'};
const env={JOURNAL_KV:'redis',JOURNAL_KV_NAMESPACE:config.namespace,UPSTASH_REDIS_REST_URL:config.url,UPSTASH_REDIS_REST_TOKEN:config.token};

function memoryRedis(){
 let now=0,fail=false;
 const rows=new Map<string,{value:string;until:number}>(),calls:(string|number)[][]=[];
 const get=(key:string)=>{const row=rows.get(key);if(row&&row.until<=now)rows.delete(key);return rows.get(key)};
 const transport:typeof fetch=async(url,init)=>{
  assert.equal(url,config.url);assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.equal(init?.method,'POST');
  assert.equal((init?.headers as Record<string,string>).Authorization,`Bearer ${config.token}`);
  const command=JSON.parse(String(init?.body));calls.push(command);
  if(fail)throw Error('provider secret synthetic-secret');
  const [op,arg,,key,token]=command;
  let result:unknown;
  if(op==='PING')result='PONG';
  else if(op==='GET')result=get(command[1])?.value??null;
  else if(op==='TTL')result=get(command[1])?Math.ceil((get(command[1])!.until-now)/1000):-2;
  else if(op==='SET'){
   const name=command[1];result=get(name)?null:'OK';
   if(result)rows.set(name,{value:command[2],until:now+Number(command[5])*1000});
  }else if(op==='EVAL'&&arg===RELEASE_SCRIPT){result=get(key)?.value===token?Number(rows.delete(key)):0;}
  else if(op==='EVAL'&&arg===LOGIN_SCRIPT){
   const row=get(key),n=Number(row?.value||0);result=n<5?1:0;
   if(n<5)rows.set(key,{value:String(n+1),until:row?.until??now+60000});
  }else throw Error('unexpected command');
  return Response.json({result});
 };
 return {redis:new JournalRedis(config,transport),transport,calls,rows,advance:(ms:number)=>{now+=ms},fail:()=>{fail=true}};
}

test('KV is explicitly optional; credentials stay paired, scoped and on trusted HTTPS origins',()=>{
 assert.equal(redisConfig({}),undefined);assert.equal(redisConfig({...env,JOURNAL_KV:'off'}),undefined);
 assert.deepEqual(redisConfig(env),config);
 assert.deepEqual(redisConfig({JOURNAL_KV:'redis',JOURNAL_KV_NAMESPACE:config.namespace,KV_REST_API_URL:config.url,KV_REST_API_TOKEN:config.token}),config);
 for(const patch of [{JOURNAL_KV:'memory'},{JOURNAL_KV_NAMESPACE:''},{JOURNAL_KV_NAMESPACE:'space name'},{UPSTASH_REDIS_REST_TOKEN:''},...['http://synthetic.upstash.io','https://upstash.io.evil.test','https://synthetic.upstash.io/path','https://user:secret@synthetic.upstash.io','https://synthetic.upstash.io?secret=1'].map(UPSTASH_REDIS_REST_URL=>({UPSTASH_REDIS_REST_URL}))])assert.throws(()=>redisConfig({...env,...patch}),CoordinationUnavailable);
 assert.throws(()=>redisConfig({...env,UPSTASH_REDIS_REST_TOKEN:'',KV_REST_API_TOKEN:config.token}),CoordinationUnavailable);
});

test('REST failures, quota errors, unexpected responses and timeouts never retry or leak credentials',async()=>{
 for(const transport of [async()=>new Response(null,{status:429}),async()=>Response.json({error:'secret synthetic-secret'}),async()=>Response.json({unexpected:'secret'}),async()=>{throw Error('synthetic-secret')}] as typeof fetch[]){
  let calls=0;const client=new JournalRedis(config,async(...args)=>{calls++;return transport(...args)});
  await assert.rejects(client.withWriteLease('scope',async()=>assert.fail('Must not run')),e=>e instanceof CoordinationUnavailable&&!e.message.includes('synthetic-secret'));assert.equal(calls,1);
 }
 const client=new JournalRedis(config,async(_url,init)=>new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true})}));
 const keepAlive=setInterval(()=>{},1000);
 try{const start=Date.now();await assert.rejects(client.ping(),CoordinationUnavailable);assert.ok(Date.now()-start<4000);}finally{clearInterval(keepAlive)}
 await assert.rejects(new JournalRedis(config,async()=>Response.json({result:7})).admitLogin(),CoordinationUnavailable);
});

test('write lease excludes concurrent requests, expires after a crash and cannot delete its successor',async()=>{
 const {redis,advance,calls}=memoryRedis();let finish!:()=>void,started!:()=>void;
 const entered=new Promise<void>(r=>{started=r}),pending=new Promise<void>(r=>{finish=r});
 const first=redis.withWriteLease('same-repo-owner',async()=>{started();await pending;return 'first'});await entered;
 await assert.rejects(redis.withWriteLease('same-repo-owner',async()=>assert.fail()),JournalBusy);
 assert.equal(await redis.withWriteLease('another-owner',async()=>'other'),'other');
 advance(60001);
 let endSecond!:()=>void,secondStarted!:()=>void;
 const secondEntered=new Promise<void>(r=>{secondStarted=r});
 const second=redis.withWriteLease('same-repo-owner',async()=>{secondStarted();await new Promise<void>(r=>{endSecond=r})});await secondEntered;
 finish();assert.equal(await first,'first');
 await assert.rejects(redis.withWriteLease('same-repo-owner',async()=>assert.fail()),JournalBusy);
 endSecond();await second;assert.equal(await redis.withWriteLease('same-repo-owner',async()=>42),42);
 assert.ok(calls.filter(c=>c[0]==='SET').every(c=>c[3]==='NX'&&c[4]==='EX'&&c[5]===60));
 assert.ok(calls.every(c=>!JSON.stringify(c).includes('same-repo-owner')));
});

test('work errors release the lease, and release failures preserve committed success',async()=>{
 const {redis,fail}=memoryRedis();await assert.rejects(redis.withWriteLease('repo',async()=>{throw Error('work failed')}),/work failed/);
 assert.equal(await redis.withWriteLease('repo',async()=>{fail();return 'committed'}),'committed');
});

test('distributed login admission admits exactly five concurrent attempts and keeps a bounded TTL',async()=>{
 const {redis,advance,rows}=memoryRedis();
 assert.equal((await Promise.all(Array.from({length:20},()=>redis.admitLogin()))).filter(Boolean).length,5);
 assert.equal(rows.size,1);advance(59999);assert.equal(await redis.admitLogin(),false);
 advance(1);assert.equal(await redis.admitLogin(),true);
 assert.notEqual(redis.key('write','same'),new JournalRedis({...config,namespace:'synthetic:preview'}).key('write','same'));
});

test('explicit Redis login mode requires valid config even in development and never falls back',async()=>{
 const names=[...Object.keys(env),'PASSWORD_RATE_LIMIT'],saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));const original=globalThis.fetch;
 try{
  Object.assign(process.env,env,{PASSWORD_RATE_LIMIT:'redis'});assert.equal(productionRateLimitReady(),true);
  const memory=memoryRedis();globalThis.fetch=memory.transport;
  assert.equal((await Promise.all(Array.from({length:8},(_,i)=>admitLoginAttempt(`untrusted-ip-${i}`)))).filter(Boolean).length,5);
  memory.fail();await assert.rejects(admitLoginAttempt('different-ip'),CoordinationUnavailable);
  delete process.env.UPSTASH_REDIS_REST_TOKEN;assert.equal(productionRateLimitReady(),false);await assert.rejects(admitLoginAttempt('ip'),CoordinationUnavailable);
  process.env.JOURNAL_KV='off';let ran=false;await withJournalWriteLease('scope',async()=>{ran=true});assert.equal(ran,true);
 }finally{globalThis.fetch=original;for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}
});

test('setup preserves existing KV settings and never creates new credentials for it',async()=>{
 const source=serializeEnv({...env,PASSWORD_RATE_LIMIT:'redis',ADMIN_PASSWORD_HASH:'synthetic-existing-hash'});
 const next=await prepareSetup(source,{target:'vercel'});assert.equal(next.deployment.PASSWORD_RATE_LIMIT,'redis');
 for(const [key,value] of Object.entries(env))assert.equal(next.deployment[key],value);
});

test('deployment checks distinguish disabled, unverified, connected and invalid KV without leaking secrets',async()=>{
 const names=[...Object.keys(env),'PASSWORD_RATE_LIMIT','GITHUB_DATA_TOKEN'],saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));const original=globalThis.fetch;
 try{
  delete process.env.GITHUB_DATA_TOKEN;delete process.env.PASSWORD_RATE_LIMIT;Object.assign(process.env,env);
  let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({result:'PONG'})};
  const unverified=(await deploymentChecks(false)).find(c=>c.id==='kv');assert.equal(unverified?.ok,true);assert.ok(unverified?.message.includes('尚未连接'));assert.equal(calls,0);
  assert.equal((await deploymentChecks(true)).find(c=>c.id==='kv')?.ok,true);assert.equal(calls,1);
  globalThis.fetch=async()=>{throw Error(config.token)};
  const failed=await deploymentChecks(true);assert.equal(failed.find(c=>c.id==='kv')?.ok,false);assert.ok(!JSON.stringify(failed).includes(config.token));
  process.env.JOURNAL_KV='off';assert.equal((await deploymentChecks(false)).find(c=>c.id==='kv')?.ok,true);
  process.env.PASSWORD_RATE_LIMIT='redis';assert.equal((await deploymentChecks(false)).find(c=>c.id==='kv')?.ok,false);
 }finally{globalThis.fetch=original;for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}
});

test('coordinated Git writes retain idempotency after a lost successful response and enforce owner',async()=>{
 const {redis}=memoryRedis(),owner='synthetic-owner';let journal=emptyJournal(owner),index='',updates=0,lost=true;
 const transport:typeof fetch=async(url,init)=>{
  const path=new URL(String(url)).pathname.replace('/repos/synthetic/private',''),body=init?.body?JSON.parse(String(init.body)):{};
  if(path==='')return Response.json({private:true});
  if(path.startsWith('/git/ref/'))return Response.json({object:{sha:'head'}});
  if(path.startsWith('/git/commits/'))return Response.json({tree:{sha:'tree'}});
  if(path==='/contents/travel/index.json')return Response.json({encoding:'base64',size:100,content:Buffer.from(JSON.stringify(journal)).toString('base64')});
  if(path==='/git/trees'){index=body.tree[0].content;return Response.json({sha:'tree'})}
  if(path==='/git/commits')return Response.json({sha:'commit'});
  if(path.startsWith('/git/refs/')){assert.equal(body.force,false);journal=JSON.parse(index);updates++;if(lost){lost=false;throw Error('lost response')}return Response.json({});}
  throw Error('unexpected Git request');
 };
 const store=new GitHubStore({repository:'synthetic/private',branch:'main',token:'synthetic-github-token',ownerId:owner},transport,(scope,work)=>redis.withWriteLease(scope,work));
 const input=visitInput.parse({id:'synthetic-visit-01',prefecture:'架空県',city:'合成市',place:'合成地点',placeKey:'synthetic',date:'2026-01-02',kind:'place',note:'',depth:2,prefDepth:2,cityDepth:1,eaten:false,photos:[],location:null});
 const change=(j:Journal)=>({changed:appendVisit(j,owner,input)});
 await assert.rejects(store.mutate(owner,change));await store.mutate(owner,change);
 assert.equal(journal.checkins.length,1);assert.equal(updates,1);await assert.rejects(store.mutate('foreign',change),/Owner denied/);
 const context={userId:owner,origin:'https://synthetic.test',store};
 const busy=new GitHubStore({repository:'synthetic/private',branch:'main',token:'synthetic',ownerId:owner},transport,async()=>{throw new JournalBusy()});
 const response=await journalAPI({...context,store:busy},new Request('https://synthetic.test/api',{method:'POST',headers:{origin:'https://synthetic.test'},body:JSON.stringify(input)}),'save');
 assert.equal(response.status,409);assert.equal(response.headers.get('Retry-After'),'2');assert.equal(updates,1);
 const unavailable=new GitHubStore({repository:'synthetic/private',branch:'main',token:'synthetic',ownerId:owner},transport,async()=>{throw new CoordinationUnavailable()});
 const failed=await journalAPI({...context,store:unavailable},new Request('https://synthetic.test/api',{method:'POST',headers:{origin:'https://synthetic.test'},body:JSON.stringify(input)}),'save');
 assert.equal(failed.status,503);assert.equal(updates,1);
});

 test('operator check verifies real command contract in isolated TTL keys and detects broken locks',async()=>{
 const memory=memoryRedis();const result=await verifyRedisCoordination(config,memory.transport,async ms=>{memory.advance(ms)});assert.equal(result.ok,true);
 assert.equal(memory.rows.size,0);assert.ok(memory.calls.filter(c=>c[0]==='SET'||c[0]==='EVAL').every(c=>String(c[c[0]==='SET'?1:3]).startsWith(config.namespace+':verify:')));
 const broken:typeof fetch=async(_url,init)=>{const command=JSON.parse(String(init?.body));return Response.json({result:command[0]==='PING'?'PONG':command[0]==='SET'?'OK':-1})};
 await assert.rejects(verifyRedisCoordination(config,broken));
 });
