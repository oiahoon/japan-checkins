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

test('camera metadata survives retries and stays private; GPS header rejected',async()=>{const git=fakeGit(),ctx={userId:owner,origin:'https://journal.test',store:git.store};const request=()=>{const r=uploadRequest();r.headers.set('X-Photo-Metadata',encodeURIComponent(JSON.stringify({make:'Synthetic',model:'Test Q',iso:100})));return r;};assert.equal((await journalAPI(ctx,request(),'upload')).status,201);assert.equal((await journalAPI(ctx,request(),'upload')).status,201);assert.equal(git.data().photos.length,1);assert.equal(git.data().photos[0].metadata?.model,'Test Q');const list=await (await journalAPI(ctx,undefined,'list')).json() as {drafts:{metadata:{iso:number}}[]};assert.equal(list.drafts[0].metadata.iso,100);const invalid=uploadRequest();invalid.headers.set('X-Photo-Metadata',encodeURIComponent(JSON.stringify({latitude:0})));assert.equal((await journalAPI(ctx,invalid,'upload')).status,400);});

import {setPhotoRemoved,journalSchema,sharedJournal} from '../lib/travel-data.ts';
test('photo removal is recoverable, idempotent, owner-scoped and hides public media only',()=>{
 const j=emptyJournal(owner);j.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null});
 appendVisit(j,owner,{...input(),published:true,photos:['synthetic-photo-01']});
 assert.equal(setPhotoRemoved(j,owner,'synthetic-photo-01',true),true);assert.equal(setPhotoRemoved(j,owner,'synthetic-photo-01',true),false);
 assert.equal(j.checkins.length,1);assert.equal(j.photos[0].checkin,j.checkins[0].id);assert.equal(sharedJournal(j).photos.length,0);
 assert.throws(()=>setPhotoRemoved(j,'wrong-owner','synthetic-photo-01',false));assert.throws(()=>setPhotoRemoved(j,owner,'missing-photo-01',true));
 assert.equal(journalSchema.parse(j).photos[0].removed,true);assert.equal(setPhotoRemoved(j,owner,'synthetic-photo-01',false),true);assert.equal(sharedJournal(j).photos.length,1);
});
test('removed drafts cannot be silently reused in a new visit',()=>{
 const j=emptyJournal(owner);j.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null,removed:true});
 assert.throws(()=>appendVisit(j,owner,{...input(),photos:['synthetic-photo-01']}));assert.equal(j.checkins.length,0);
});

test('photo management API rejects read-only and cross-origin callers before mutation',async()=>{
 let calls=0;const store={mutate:async()=>{calls++}} as unknown as GitHubStore;
 const context={userId:owner,origin:'https://synthetic.example',store};
 const valid=new Request('https://synthetic.example/api/photos/synthetic-photo-01',{method:'PATCH',headers:{origin:'https://synthetic.example'}});
 assert.equal((await journalAPI({...context,readOnly:true},valid,'hide-photo','synthetic-photo-01')).status,403);
 const foreign=new Request('https://synthetic.example/api/photos/synthetic-photo-01',{method:'PATCH',headers:{origin:'https://another.example'}});
 assert.equal((await journalAPI(context,foreign,'restore-photo','synthetic-photo-01')).status,403);assert.equal(calls,0);
});

test('removed photos stay out of normal and shared lists while admin can restore',async()=>{
 const j=emptyJournal(owner);j.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null});appendVisit(j,owner,{...input(),published:true,photos:['synthetic-photo-01']});
 const store={read:async()=>j,mutate:async(_owner:string,change:(j:Journal)=>unknown)=>{change(j)}} as unknown as GitHubStore;
 const context={userId:owner,origin:'https://synthetic.example',store},request=new Request('https://synthetic.example/api/photos/synthetic-photo-01',{method:'PATCH',headers:{origin:'https://synthetic.example'}});
 assert.equal((await journalAPI(context,request,'hide-photo','synthetic-photo-01')).status,200);
 type Listed={photos:unknown[];removedPhotos:unknown[];checkins:unknown[]};
 const own=await (await journalAPI(context,undefined,'list')).json() as Listed;assert.equal(own.photos.length,0);assert.equal(own.removedPhotos.length,1);assert.equal(own.checkins.length,1);
 const shared=await (await journalAPI({...context,readOnly:true,sharedOnly:true},undefined,'list')).json() as Listed;assert.equal(shared.photos.length,0);assert.deepEqual(shared.removedPhotos,[]);
 assert.equal((await journalAPI(context,request,'restore-photo','synthetic-photo-01')).status,200);const restored=await (await journalAPI(context,undefined,'list')).json() as Listed;assert.equal(restored.photos.length,1);
});

test('batch record removal hides linked photos and shared content without erasing independent photo choices',async()=>{
 const {manageItems}=await import('../lib/travel-data.ts');const j=emptyJournal(owner);
 j.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null},{id:'synthetic-photo-02',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null});
 appendVisit(j,owner,{...input(),published:true,photos:['synthetic-photo-01','synthetic-photo-02']});manageItems(j,owner,'photos',['synthetic-photo-02'],true);
 assert.equal(manageItems(j,owner,'records',['synthetic-visit-01'],true),true);assert.equal(manageItems(j,owner,'records',['synthetic-visit-01'],true),false);assert.equal(sharedJournal(j).checkins.length,0);
 const store={read:async()=>j} as unknown as GitHubStore,context={userId:owner,origin:'https://synthetic.example',store};
 const hidden=await (await journalAPI(context,undefined,'list')).json() as {checkins:unknown[];photos:unknown[];removedCheckins:unknown[]};assert.equal(hidden.checkins.length,0);assert.equal(hidden.photos.length,0);assert.equal(hidden.removedCheckins.length,1);
 assert.throws(()=>manageItems(j,owner,'photos',['synthetic-photo-02'],false),/先恢复/);
 manageItems(j,owner,'records',['synthetic-visit-01'],false);assert.equal(sharedJournal(j).photos.length,1);assert.equal(j.photos[1].removed,true);assert.equal(j.photos.length,2);
});
test('batch mutation validates all items first and enforces owner, bounded selection and retry semantics',async()=>{
 const {manageItems}=await import('../lib/travel-data.ts');const j=emptyJournal(owner);appendVisit(j,owner,input());
 assert.throws(()=>manageItems(j,owner,'records',['synthetic-visit-01','synthetic-missing-01'],true),/不存在/);assert.equal(j.checkins[0].removed,undefined);
 assert.throws(()=>manageItems(j,'other-owner','records',['synthetic-visit-01'],true),/owner mismatch/);
 assert.throws(()=>manageItems(j,owner,'records',Array.from({length:101},(_,i)=>'synthetic-id-'+i),true),/100/);
 assert.equal(manageItems(j,owner,'records',['synthetic-visit-01','synthetic-visit-01'],true),true);assert.equal(manageItems(j,owner,'records',['synthetic-visit-01'],true),false);
 assert.equal(appendVisit(j,owner,input()),false);assert.equal(j.checkins[0].removed,true);
});
test('batch API rejects read-only, foreign origin and invalid selection without mutation',async()=>{
 let calls=0;const store={mutate:async()=>{calls++}} as unknown as GitHubStore;const context={userId:owner,origin:'https://synthetic.example',store};
 const req=(origin='https://synthetic.example',body:unknown={kind:'records',ids:['synthetic-visit-01'],removed:true})=>new Request('https://synthetic.example/api/manage',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await journalAPI({...context,readOnly:true},req(),'manage')).status,403);assert.equal((await journalAPI(context,req('https://foreign.example'),'manage')).status,403);assert.equal((await journalAPI(context,req(undefined,{kind:'records',ids:[],removed:true}),'manage')).status,400);assert.equal(calls,0);
});
test('direct photo reads reject a removed parent record before requesting the blob',async()=>{
 const {manageItems}=await import('../lib/travel-data.ts');const j=emptyJournal(owner);j.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',created:'',checkin:null});appendVisit(j,owner,{...input(),photos:['synthetic-photo-01']});manageItems(j,owner,'records',['synthetic-visit-01'],true);
 const store=new GitHubStore(config);store.read=async()=>j;assert.equal(await store.photo('synthetic-photo-01',owner),null);
});
test('batch API applies a single atomic change and accepts repeated removal and restoration',async()=>{
 const j=emptyJournal(owner);appendVisit(j,owner,input());appendVisit(j,owner,input('synthetic-visit-02'));let changes=0;
 const store={read:async()=>j,mutate:async(_owner:string,change:(j:Journal)=>{changed:boolean})=>{const result=change(j);if(result.changed)changes++}} as unknown as GitHubStore;
 const context={userId:owner,origin:'https://synthetic.example',store};const req=(removed:boolean)=>new Request('https://synthetic.example/api/manage',{method:'POST',headers:{origin:context.origin},body:JSON.stringify({kind:'records',ids:['synthetic-visit-01','synthetic-visit-02'],removed})});
 assert.equal((await journalAPI(context,req(true),'manage')).status,200);assert.equal((await journalAPI(context,req(true),'manage')).status,200);assert.equal(changes,1);assert.equal(j.checkins.filter(c=>c.removed).length,2);
 assert.equal((await journalAPI(context,req(false),'manage')).status,200);assert.equal(changes,2);assert.equal(j.checkins.filter(c=>c.removed).length,0);
});
test('photo edits enforce role/origin and recover a lost save response without another visit',async()=>{
 const initial=emptyJournal(owner);initial.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',checkin:null,created:''});const git=fakeGit({lostResponse:true,initial}),ctx={userId:owner,origin:'https://journal.test',store:git.store};
 const details={country:'JP',prefecture:'架空県',city:'',place:'合成地点',date:'2026-01-02',note:'合成笔记',latitude:null,longitude:null};
 const req=(origin='https://journal.test')=>new Request(origin+'/api/photos/synthetic-photo-01',{method:'PATCH',headers:{origin},body:JSON.stringify({details,confirmed:true})});
 assert.equal((await journalAPI({...ctx,readOnly:true},req(),'edit-photo','synthetic-photo-01')).status,403);
 assert.equal((await journalAPI(ctx,req('https://foreign.test'),'edit-photo','synthetic-photo-01')).status,403);
 assert.equal(git.data().checkins.length,0);
 assert.equal((await journalAPI(ctx,req(),'edit-photo','synthetic-photo-01')).status,503);
 assert.equal((await journalAPI(ctx,req(),'edit-photo','synthetic-photo-01')).status,200);
 assert.equal(git.data().checkins.length,1);
 assert.equal((await journalAPI(ctx,req(),'edit-photo','missing-photo-01')).status,400);
 const mismatch=new Request('https://journal.test/api/photos/synthetic-photo-01',{method:'PATCH',headers:{origin:ctx.origin},body:JSON.stringify({details:{...details,latitude:0,longitude:0},confirmed:true})});
 assert.equal((await journalAPI(ctx,mismatch,'edit-photo','synthetic-photo-01')).status,400);assert.equal(git.data().checkins[0].latitude,null);
});
test('draft EXIF proposals are private, bounded and distinct from confirmed map history',async()=>{
 const git=fakeGit(),ctx={userId:owner,origin:'https://journal.test',store:git.store};
 const req=uploadRequest();req.headers.set('X-Photo-Proposal',encodeURIComponent(JSON.stringify({date:'2026-01-02',gps:{latitude:0,longitude:0}})));
 assert.equal((await journalAPI(ctx,req,'upload')).status,201);assert.equal(git.data().checkins.length,0);
 const data=await (await journalAPI(ctx,undefined,'list')).json() as {drafts:{proposal:{date:string}}[]};assert.equal(data.drafts[0].proposal.date,'2026-01-02');
 const shared=await (await journalAPI({...ctx,sharedOnly:true,readOnly:true},undefined,'list')).json() as {drafts:unknown[];photos:unknown[]};assert.equal(shared.drafts.length,0);assert.equal(shared.photos.length,0);
 const bad=uploadRequest();bad.headers.set('X-Photo-Proposal',encodeURIComponent(JSON.stringify({gps:{latitude:NaN,longitude:0}})));assert.equal((await journalAPI(ctx,bad,'upload')).status,400);
});

test('partial and complete photo information survives Git commit, list projection and a fresh read',async()=>{
 const initial=emptyJournal(owner);initial.photos.push({id:'synthetic-photo-01',owner,sha:'a'.repeat(40),digest:'synthetic',checkin:null,created:''});
 const git=fakeGit({initial}),ctx={userId:owner,origin:'https://journal.test',store:git.store};
 const partial={country:'JP',prefecture:'架空県',city:'',place:'',date:'',note:'仅有笔记',latitude:null,longitude:null};
 const save=async(details:typeof partial,confirmed=false)=>journalAPI(ctx,new Request(ctx.origin+'/api/photos/synthetic-photo-01',{method:'PATCH',headers:{origin:ctx.origin},body:JSON.stringify({details,confirmed})}),'edit-photo','synthetic-photo-01');
 assert.equal((await save(partial)).status,200);
 type Listing={drafts:Journal['photos'];photos:Journal['photos'];checkins:Journal['checkins']};
 const list=async()=> (await journalAPI({...ctx,store:fakeGit({initial:git.data()}).store},undefined,'list')).json() as Promise<Listing>;
 let data=await list();assert.deepEqual(data.drafts[0].details,partial);assert.equal(data.checkins.length,0);
 const complete={...partial,city:'合成市',place:'合成地点',date:'2026-01-02',note:'新笔记'};
 assert.equal((await save(complete)).status,200);data=await list();assert.deepEqual(data.drafts[0].details,complete);assert.equal(data.checkins.length,0);
 assert.equal((await save(complete,true)).status,200);data=await list();assert.equal(data.drafts.length,0);assert.deepEqual(data.photos[0].details,complete);assert.equal(data.checkins.length,1);
 assert.equal((await save({...complete,note:''},true)).status,200);data=await list();assert.equal(data.photos[0].details!.note,'');assert.equal(data.checkins[0].note,'');assert.equal(data.checkins.length,1);
 const shared=await (await journalAPI({...ctx,readOnly:true,sharedOnly:true},undefined,'list')).json() as Listing;assert.equal(shared.photos.length,0);assert.equal(shared.drafts.length,0);
});
