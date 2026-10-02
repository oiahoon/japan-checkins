import {journalAPI} from '../lib/github-service.ts';
import {sanitizeJPEG} from '../lib/photo.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {signSession,verifySession,challenge} from '../lib/session.ts';
import {GitHubStore} from '../lib/github-store.ts';
import {emptyJournal,appendVisit,assertOwner,visitInput,setMarkers,type Journal} from '../lib/travel-data.ts';
const owner='123456';
const secret='synthetic-session-secret-for-tests-only';
const config={repository:'synthetic/private-journal',branch:'main',token:'synthetic-test-token',ownerId:owner};
const input=(id='synthetic-visit-01')=>visitInput.parse({id,prefecture:'架空県',city:'架空市',place:'合成地点',placeKey:'synthetic-place',kind:'place',date:'2026-01-02',note:'',depth:2,prefDepth:2,cityDepth:2,eaten:false,photos:[],location:null});
test('signed sessions reject forgery, expiry, wrong owner and wrong purpose',()=>{
 const token=signSession({purpose:'session',sub:owner,exp:2000},secret);
 assert.ok(verifySession(token,secret,'session',owner,1000));
 assert.equal(verifySession(token,secret,'session',owner,2000),null);
 assert.equal(verifySession(token,secret,'session','another-owner',1000),null);
 assert.equal(verifySession(token,secret,'oauth',owner,1000),null);
 assert.equal(verifySession(token+'x',secret,'session',owner,1000),null);
 assert.equal(verifySession(token,'wrong-secret','session',owner,1000),null);
 assert.equal(challenge('synthetic-verifier').length,43);
});
test('record retry is idempotent; another visit to same place appends',()=>{
 const j=emptyJournal(owner);assert.equal(appendVisit(j,owner,input()),true);assert.equal(appendVisit(j,owner,input()),false);assert.equal(appendVisit(j,owner,input('synthetic-visit-02')),true);assert.equal(j.checkins.length,2);
});
test('photos require ownership and unused drafts; failure does not partially append',()=>{
 const j=emptyJournal(owner),b={...input(),photos:['synthetic-photo-01']};
 assert.throws(()=>appendVisit(j,owner,b));assert.equal(j.checkins.length,0);
 j.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null});
 appendVisit(j,owner,b);assert.equal(j.photos[0].checkin,b.id);
 assert.throws(()=>appendVisit(j,owner,{...b,id:'synthetic-visit-02'}));
 assert.throws(()=>assertOwner(j,'another-owner'));
 j.photos[0].owner='another-owner';assert.throws(()=>assertOwner(j,owner));
});
test('invalid dates, duplicate photos and unconfirmed coordinates reject',()=>{
 const b=input();assert.throws(()=>visitInput.parse({...b,date:'2026-02-30'}));assert.throws(()=>visitInput.parse({...b,photos:['synthetic-photo-01','synthetic-photo-01']}));
 assert.throws(()=>visitInput.parse({...b,location:{latitude:35,longitude:139,source:'photo'}}));
});
function fakeGit(options:{conflict?:boolean;lostResponse?:boolean;public?:boolean;alwaysConflict?:boolean;uploadFailure?:boolean;initial?:Journal}={}) {
 let journal:Journal=options.initial?structuredClone(options.initial):emptyJournal(owner),head='head0',treeIndex='',count=0,updates=0;
 const commits=new Map<string,string>();
 const transport:typeof fetch=async(url,init)=>{
  const path=new URL(String(url)).pathname.replace('/repos/synthetic/private-journal','');
  const body=init?.body?JSON.parse(String(init.body)):{};
  const ok=(data:unknown)=>Response.json(data);
  if(path==='')return ok({private:!options.public});
  if(path.startsWith('/git/ref/'))return ok({object:{sha:head}});
  if(path.startsWith('/git/commits/'))return ok({tree:{sha:'tree0'}});
  if(path==='/contents/travel/index.json')return ok({encoding:'base64',size:100,content:Buffer.from(JSON.stringify(journal)).toString('base64')});
  if(path.startsWith('/git/blobs/'))return ok({encoding:'base64',size:syntheticJPEG.length,content:syntheticJPEG.toString('base64')});
  if(path==='/git/blobs'){if(options.uploadFailure)throw new Error('Synthetic upload failure');return ok({sha:'a'.repeat(40)});}
  if(path==='/git/trees'){treeIndex=body.tree[0].content;return ok({sha:'newtree'});}
  if(path==='/git/commits'){const sha='commit'+(++count);commits.set(sha,treeIndex);return ok({sha});}
  if(path.startsWith('/git/refs/')) {
   updates++;assert.equal(body.force,false);
   if(options.alwaysConflict)return new Response(null,{status:409});
   if(options.conflict&&updates===1){setMarkers(journal,owner,[{scope:'city',label:'并发合成地点',depth:3,eaten:false}]);head='other-head';return new Response(null,{status:422});}
   journal=JSON.parse(commits.get(body.sha)!);head=body.sha;
   if(options.lostResponse&&updates===1)throw new Error('Synthetic connection loss after commit');
   return ok({object:{sha:head}});
  }
  throw new Error('Unexpected endpoint '+path);
 };
 return {store:new GitHubStore(config,transport),data:()=>journal,updates:()=>updates};
}
test('concurrent ref rejection re-reads and preserves other update',async()=>{
 const git=fakeGit({conflict:true});await git.store.mutate(owner,j=>({changed:appendVisit(j,owner,input())}));assert.equal(git.data().checkins.length,1);assert.equal(git.data().statuses.find(s=>s.label==='并发合成地点')?.depth,3);assert.equal(git.updates(),2);
});
test('lost save response followed by same request recovers without duplicate',async()=>{
 const git=fakeGit({lostResponse:true});await assert.rejects(git.store.mutate(owner,j=>({changed:appendVisit(j,owner,input())})));await git.store.mutate(owner,j=>({changed:appendVisit(j,owner,input())}));assert.equal(git.data().checkins.length,1);assert.equal(git.updates(),1);
});
test('public repository, wrong owner and endless conflicts fail closed',async()=>{
 await assert.rejects(fakeGit({public:true}).store.read(owner));
 const git=fakeGit();await assert.rejects(git.store.mutate('another-owner',()=>({changed:true})));await assert.rejects(git.store.photo('synthetic-photo-01','another-owner'));
 const conflicts=fakeGit({alwaysConflict:true});await assert.rejects(conflicts.store.mutate(owner,j=>({changed:appendVisit(j,owner,input())})));assert.equal(conflicts.updates(),3);
});

const syntheticJPEG=Buffer.from([255,216,255,225,0,6,69,88,73,70,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);
const uploadRequest=(origin='https://journal.test',bytes=syntheticJPEG)=>new Request('https://journal.test/api/photos',{method:'POST',headers:{origin,'X-Upload-Id':'synthetic-photo-01'},body:bytes});
test('photo upload failures and lost responses recover; retry does not create drafts twice',async()=>{
 const failed=fakeGit({uploadFailure:true});
 const response=await journalAPI({userId:owner,origin:'https://journal.test',store:failed.store},uploadRequest(),'upload');
 assert.equal(response.status,503);assert.equal(failed.data().photos.length,0);
 const git=fakeGit({lostResponse:true}),ctx={userId:owner,origin:'https://journal.test',store:git.store};
 assert.equal((await journalAPI(ctx,uploadRequest(),'upload')).status,503);
 assert.equal((await journalAPI(ctx,uploadRequest(),'upload')).status,201);
 assert.equal(git.data().photos.length,1);assert.equal(git.updates(),1);
 assert.ok(sanitizeJPEG(syntheticJPEG).length<syntheticJPEG.length);
 const changed=Buffer.from(syntheticJPEG);changed[changed.length-3]=1;
 assert.equal((await journalAPI(ctx,uploadRequest('https://journal.test',changed),'upload')).status,400);
});
test('write endpoints reject absent/foreign origin, invalid uploads and excessive body',async()=>{
 const git=fakeGit(),ctx={userId:owner,origin:'https://journal.test',store:git.store};
 assert.equal((await journalAPI(ctx,uploadRequest('https://foreign.test'),'upload')).status,403);
 assert.equal((await journalAPI(ctx,new Request('https://journal.test/api/photos',{method:'POST',body:syntheticJPEG}),'upload')).status,403);
 assert.equal((await journalAPI(ctx,uploadRequest('https://journal.test',Buffer.from('bad-image')),'upload')).status,400);
 assert.equal((await journalAPI(ctx,uploadRequest('https://journal.test',Buffer.alloc(3*1024*1024+1)),'upload')).status,400);
 assert.equal(git.updates(),0);
});

test('public photo requests require a currently published visit; revocation takes effect',async()=>{
 const j=emptyJournal(owner);appendVisit(j,owner,{...input(),published:true});appendVisit(j,owner,input('synthetic-private-01'));
 j.photos.push({id:'synthetic-photo-01',owner,checkin:'synthetic-visit-01',sha:'a'.repeat(40),digest:'',created:''},{id:'synthetic-photo-02',owner,checkin:'synthetic-private-01',sha:'b'.repeat(40),digest:'',created:''},{id:'synthetic-photo-03',owner,checkin:null,sha:'c'.repeat(40),digest:'',created:''});
 const git=fakeGit({initial:j}),ctx={store:git.store,userId:owner,origin:'https://journal.test',readOnly:true,sharedOnly:true};
 assert.equal((await journalAPI(ctx,undefined,'photo','synthetic-photo-01')).status,200);
 for(const id of ['synthetic-photo-02','synthetic-photo-03'])assert.equal((await journalAPI(ctx,undefined,'photo',id)).status,404);
 const list=await (await journalAPI(ctx,undefined,'list')).json() as {checkins:unknown[];photos:unknown[];drafts:unknown[]};assert.equal(list.checkins.length,1);assert.equal(list.photos.length,1);assert.equal(list.drafts.length,0);
 const request=new Request('https://journal.test/api/checkins/publish',{method:'POST',headers:{origin:'https://journal.test'},body:JSON.stringify({id:'synthetic-visit-01',published:false})});
 assert.equal((await journalAPI({...ctx,readOnly:false,sharedOnly:false},request,'publish')).status,200);
 assert.equal((await journalAPI(ctx,undefined,'photo','synthetic-photo-01')).status,404);
});

test('global save endpoint preserves country and recovers a lost commit response',async()=>{
 const git=fakeGit({lostResponse:true}),ctx={userId:owner,origin:'https://journal.test',store:git.store};
 const body={...input(),country:'US',location:{confirmed:true,latitude:-1,longitude:-1,source:'manual'}};
 const request=()=>new Request('https://journal.test/api/checkins',{method:'POST',headers:{origin:'https://journal.test'},body:JSON.stringify(body)});
 assert.equal((await journalAPI(ctx,request(),'save')).status,503);
 assert.equal((await journalAPI(ctx,request(),'save')).status,201);
 assert.equal(git.data().checkins.length,1);assert.equal(git.data().checkins[0].country,'US');assert.equal(git.data().checkins[0].latitude,-1);assert.equal(git.updates(),1);
 assert.equal((await journalAPI({...ctx,readOnly:true},request(),'save')).status,403);
 const bad={...body,id:'synthetic-visit-03',location:{...body.location,confirmed:false}};
 assert.equal((await journalAPI(ctx,new Request('https://journal.test/api/checkins',{method:'POST',headers:{origin:'https://journal.test'},body:JSON.stringify(bad)}),'save')).status,400);
 assert.equal(git.data().checkins.length,1);
});
