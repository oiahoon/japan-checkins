import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,validPasswordHash} from '../lib/password.ts';
import {admitPasswordAttempt,productionRateLimitReady} from '../lib/password-rate-limit.ts';
import {sharedJournal,emptyJournal,appendVisit,visitInput,journalSchema} from '../lib/travel-data.ts';
import {journalAPI} from '../lib/github-service.ts';
import {GitHubStore} from '../lib/github-store.ts';
import {passwordConfig} from '../lib/self-host-config.ts';
test('password hashes are salted, bounded and reject wrong passwords or malformed parameters',async()=>{
 const password='synthetic-long-password';const first=await hashPassword(password),second=await hashPassword(password);
 assert.notEqual(first,second);assert.ok(validPasswordHash(first));assert.ok(await verifyPassword(password,first));assert.equal(await verifyPassword('wrong-password',first),false);assert.equal(await verifyPassword(password,first.replace('131072','1')),false);await assert.rejects(hashPassword('short'));await assert.rejects(hashPassword('x'.repeat(257)));
});
test('production password login requires configured distributed platform limiter',()=>{
 const old={node:process.env.NODE_ENV,vercel:process.env.VERCEL,limit:process.env.PASSWORD_RATE_LIMIT};
 try{Reflect.set(process.env,'NODE_ENV','production');delete process.env.VERCEL;delete process.env.PASSWORD_RATE_LIMIT;assert.equal(productionRateLimitReady(),false);process.env.VERCEL='1';assert.equal(productionRateLimitReady(),false);process.env.PASSWORD_RATE_LIMIT='vercel-waf';assert.equal(productionRateLimitReady(),true);}
 finally{for(const [name,value] of Object.entries({NODE_ENV:old.node,VERCEL:old.vercel,PASSWORD_RATE_LIMIT:old.limit}))if(value===undefined)delete process.env[name];else process.env[name]=value;}
 for(let i=0;i<5;i++)assert.equal(admitPasswordAttempt('synthetic-key',1000),true);assert.equal(admitPasswordAttempt('synthetic-key',1000),false);assert.equal(admitPasswordAttempt('synthetic-key',61000),true);
});
const visit=(id:string,published=false)=>visitInput.parse({id,published,prefecture:'架空県',city:'合成市',place:id,placeKey:id,kind:'place',date:'2026-01-02',note:'synthetic',depth:2,prefDepth:2,cityDepth:1,eaten:false,photos:[],location:null});
test('public view excludes drafts, private visits and private status aggregates; old records stay private',()=>{
 const j=emptyJournal('synthetic-owner');appendVisit(j,j.owner,visit('synthetic-public-01',true));appendVisit(j,j.owner,visit('synthetic-private-01'));
 j.statuses.push({owner:j.owner,scope:'city',label:'private-only-city',depth:5,eaten:0});
 j.photos.push({owner:j.owner,id:'synthetic-photo-01',checkin:'synthetic-public-01',sha:'a'.repeat(40),digest:'',created:''},{owner:j.owner,id:'synthetic-photo-02',checkin:'synthetic-private-01',sha:'b'.repeat(40),digest:'',created:''},{owner:j.owner,id:'synthetic-photo-03',checkin:null,sha:'c'.repeat(40),digest:'',created:''});
 const shared=sharedJournal(j);assert.equal(shared.checkins.length,1);assert.equal(shared.photos.length,1);assert.ok(!JSON.stringify(shared).includes('private-only-city'));assert.ok(!JSON.stringify(shared).includes('synthetic-private-01'));
 const old={...j,checkins:[{...j.checkins[0],published:undefined}]};assert.equal(journalSchema.parse(old).checkins[0].published,false);
});
test('viewers cannot save, upload, delete, publish or mark even with correct origin',async()=>{
 const store=new GitHubStore({repository:'synthetic/private',branch:'main',ownerId:'synthetic-owner',token:'synthetic-token'},async()=>{throw new Error('Must not hit GitHub for denied writes');});
 for(const action of ['save','upload','delete','publish','markers'] as const){const response=await journalAPI({store,userId:'synthetic-owner',origin:'https://synthetic.test',readOnly:true},new Request('https://synthetic.test/api',{method:'POST',headers:{origin:'https://synthetic.test'}}),action,'synthetic-photo-01');assert.equal(response.status,403);}
});
test('password changes rotate session version; equal hashes for roles reject',async()=>{
 const saved={...process.env};try{process.env.APP_URL='https://synthetic.test';process.env.SESSION_SECRET='synthetic-secret-for-isolated-tests-only';process.env.ADMIN_PASSWORD_HASH=await hashPassword('synthetic-admin-password');delete process.env.VIEWER_PASSWORD_HASH;const before=passwordConfig().version;process.env.VIEWER_PASSWORD_HASH=await hashPassword('synthetic-viewer-password');assert.notEqual(passwordConfig().version,before);process.env.VIEWER_PASSWORD_HASH=process.env.ADMIN_PASSWORD_HASH;assert.throws(()=>passwordConfig());}finally{for(const key of ['APP_URL','SESSION_SECRET','ADMIN_PASSWORD_HASH','VIEWER_PASSWORD_HASH'])if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
