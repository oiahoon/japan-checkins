// Optional integration check. Uses installed Redis binaries and an isolated Unix socket.
// No network listener, external account, credentials, or production data.
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {verifyRedisCoordination} from '../lib/journal-kv-check.ts';
import {JournalRedis,JournalBusy} from '../lib/journal-kv.ts';
const exec=promisify(execFile),directory=await mkdtemp(join(tmpdir(),'journal-kv-')),socket=join(directory,'redis.sock');
const server=spawn('redis-server',['--port','0','--unixsocket',socket,'--unixsocketperm','700','--save','','--appendonly','no'],{stdio:'ignore'});
let failure;server.on('error',e=>{failure=e});
const command=async args=>JSON.parse((await exec('redis-cli',['-s',socket,'--json',...args.map(String)],{timeout:3000})).stdout);
try{
 let ready=false;
 for(let n=0;n<30;n++){if(failure)throw failure;try{ready=await command(['PING'])==='PONG';if(ready)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.ok(ready,'Isolated Redis did not start');
 const redis=new JournalRedis({url:'https://synthetic.upstash.io',token:'synthetic-only',namespace:'local:synthetic'},async(_url,init)=>Response.json({result:await command(JSON.parse(String(init.body)))}));
 await redis.ping();
 const admissions=await Promise.all(Array.from({length:20},()=>redis.admitLogin()));assert.equal(admissions.filter(Boolean).length,5);
 const ttl=await command(['TTL',redis.key('login','global')]);assert.ok(ttl>0&&ttl<=60);
 let finish,entered;
 const started=new Promise(r=>{entered=r});
 const pending=redis.withWriteLease('synthetic-repo-owner',async()=>{entered();await new Promise(r=>{finish=r})});await started;
 await assert.rejects(redis.withWriteLease('synthetic-repo-owner',async()=>assert.fail()),JournalBusy);
 // Simulate a crashed worker's lease expiry, then prove its delayed release is safe.
 await command(['PEXPIRE',redis.key('write','synthetic-repo-owner'),0]);
 let finishNext,enteredNext;
 const nextStarted=new Promise(r=>{enteredNext=r});
 const next=redis.withWriteLease('synthetic-repo-owner',async()=>{enteredNext();await new Promise(r=>{finishNext=r})});await nextStarted;
 finish();await pending;
 await assert.rejects(redis.withWriteLease('synthetic-repo-owner',async()=>assert.fail()),JournalBusy);
 finishNext();await next;
 assert.equal(await command(['EXISTS',redis.key('write','synthetic-repo-owner')]),0);
 await verifyRedisCoordination({url:'https://synthetic.upstash.io',token:'synthetic-only',namespace:'local:operator-check'},async(_url,init)=>Response.json({result:await command(JSON.parse(String(init.body)))}));
 console.log('PASS: real Redis Lua, 20 concurrent login attempts / 5 admissions, TTL, lease exclusion, expiry and successor-safe release.');
}finally{
 if(server.exitCode===null&&!failure){server.kill('SIGTERM');await new Promise(r=>{server.once('exit',r);setTimeout(()=>{server.kill('SIGKILL');r()},2000).unref()});}
 await rm(directory,{recursive:true,force:true});
}
