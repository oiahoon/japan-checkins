import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyJournal,journalSchema,photoEntry,manageItems,sharedJournal,assertOwner} from '../lib/travel-data.ts';
import {mutateEntry,entryMutation} from '../lib/journal-entries.ts';
import {chronicleItems,timelineGroups} from '../lib/timeline.ts';
import {journalAPI} from '../lib/github-service.ts';
import {blankPhotoDetails,savePhotoDetails} from '../lib/photo-records.ts';
import {GitHubStore} from '../lib/github-store.ts';
import {appendVisit,visitInput} from '../lib/travel-data.ts';
const owner='synthetic-owner',trip='synthetic-trip-01',second='synthetic-trip-02';
function fixture(){const j=emptyJournal(owner);for(let i=1;i<=3;i++)j.photos.push({id:'synthetic-photo-0'+i,owner,checkin:null,sha:'a'.repeat(40),digest:'fixture',created:'2026-01-01',details:{...blankPhotoDetails,date:'2026-01-0'+i,note:'合成笔记 '+i}});return j}
const save={op:'save' as const,id:trip,type:'trip' as const,title:'合成旅程',date:'2026-01-02',note:'合成笔记',photos:['synthetic-photo-01','synthetic-photo-02']};
test('explicit albums preserve per-photo metadata, locations and independent map consent; retries are idempotent',()=>{
 const j=fixture(),before=structuredClone(j.photos);assert.equal(mutateEntry(j,owner,save),true);assert.equal(mutateEntry(j,owner,save),false);assert.equal(j.entries.length,1);assert.equal(j.checkins.length,0);
 for(let i=0;i<2;i++){assert.deepEqual(j.photos[i].details,before[i].details);assert.equal(j.photos[i].checkin,null);assert.equal(photoEntry(j.photos[i]),trip)}
 assert.equal(photoEntry(j.photos[2]),null);const reloaded=journalSchema.parse(JSON.parse(JSON.stringify(j)));assert.equal(photoEntry(reloaded.photos[0]),trip);
 mutateEntry(j,owner,{op:'detach',id:trip,photos:['synthetic-photo-01']});assert.equal(photoEntry(j.photos[0]),null);assert.equal(mutateEntry(j,owner,{op:'detach',id:trip,photos:['synthetic-photo-01']}),false);assert.deepEqual(j.photos[0].details,before[0].details);
});
test('conflicting, removed and foreign photos fail atomically before changing an album',()=>{
 const j=fixture();mutateEntry(j,owner,save);mutateEntry(j,owner,{...save,id:second,photos:[]});const snapshot=JSON.stringify(j);
 assert.throws(()=>mutateEntry(j,owner,{op:'attach',id:second,photos:['synthetic-photo-03','synthetic-photo-01']}));assert.equal(JSON.stringify(j),snapshot);
 assert.throws(()=>mutateEntry(j,'foreign-owner',save));assert.throws(()=>mutateEntry(j,owner,{op:'attach',id:trip,photos:['synthetic-missing']}));assert.equal(mutateEntry(j,owner,{op:'detach',id:trip,photos:['synthetic-photo-03']}),false);
 assert.throws(()=>mutateEntry(j,owner,{op:'attach',id:trip,photos:['synthetic-photo-03','synthetic-photo-03']}));assert.equal(JSON.stringify(j),snapshot);
 j.photos[2].owner='foreign-owner';assert.throws(()=>mutateEntry(j,owner,{op:'attach',id:trip,photos:['synthetic-photo-03']}));assert.throws(()=>assertOwner(j,owner));
 assert.equal(entryMutation.safeParse({...save,photos:Array(101).fill('synthetic-photo-03')}).success,false);assert.equal(entryMutation.safeParse({...save,date:'2026-02-30'}).success,false);
});
test('private albums hide their map visits on removal and cannot accidentally publish members or bypass authenticated blob guards',async()=>{
 const j=fixture();savePhotoDetails(j,owner,j.photos[0].id,{details:{...blankPhotoDetails,country:'JP',prefecture:'架空県',place:'合成地点',date:'2026-01-01'},confirmed:true});mutateEntry(j,owner,save);
 j.checkins[0].published=true;assert.equal(sharedJournal(j).checkins.length,0);assert.equal(sharedJournal(j).photos.length,0);
 const store=new GitHubStore({repository:'synthetic/private',branch:'main',ownerId:owner,token:'synthetic'},async()=>{throw Error('Unexpected blob request')});store.read=async()=>structuredClone(j);
 assert.equal(await store.photo(j.photos[0].id,owner,true),null);await assert.rejects(()=>store.photo(j.photos[0].id,'another-owner'));
 const context={userId:owner,origin:'https://synthetic.test',store};
 const publish=new Request(context.origin+'/api/publish',{method:'POST',headers:{Origin:context.origin,'Content-Type':'application/json'},body:JSON.stringify({id:j.checkins[0].id,published:true})});
 store.mutate=async(o,fn)=>{assert.equal(o,owner);fn(j)};
 assert.equal((await journalAPI(context,publish,'publish')).status,400);
 manageItems(j,owner,'records',[trip],true);assert.equal(await store.photo(j.photos[0].id,owner),null);
 assert.throws(()=>savePhotoDetails(j,owner,j.photos[0].id,{details:j.photos[0].details!,confirmed:false}));
 const hidden:any=await (await journalAPI(context,undefined,'list')).json();assert.equal(hidden.checkins.length,0);assert.equal(hidden.photos.length,0);assert.equal(hidden.drafts.length,1);
 manageItems(j,owner,'records',[trip],false);const restored:any=await (await journalAPI(context,undefined,'list')).json();assert.equal(restored.checkins.length,1);assert.equal(restored.photos.length,1);assert.equal(restored.drafts.length,2);
});
test('editing a legacy album member keeps explicit album membership after its map visit splits',()=>{
 const j=fixture();appendVisit(j,owner,visitInput.parse({id:trip,country:'JP',prefecture:'架空県',city:'架空市',place:'合成地点',placeKey:'synthetic-key',kind:'place',date:'2026-01-01',note:'旧相册',depth:0,prefDepth:0,cityDepth:0,eaten:false,photos:j.photos.slice(0,2).map(p=>p.id),location:null}));
 savePhotoDetails(j,owner,j.photos[0].id,{details:{...blankPhotoDetails,country:'JP',prefecture:'架空県',place:'另一个合成地点',date:'2026-01-02'},confirmed:true});
 assert.equal(j.photos[0].checkin,j.photos[0].id);assert.equal(photoEntry(j.photos[0]),trip);assert.equal(photoEntry(j.photos[1]),trip);assert.equal(j.checkins[0].place,'合成地点');manageItems(j,owner,'records',[trip],true);assert.throws(()=>savePhotoDetails(j,owner,j.photos[0].id,{details:j.photos[0].details!,confirmed:false}));manageItems(j,owner,'records',[trip],false);
 mutateEntry(j,owner,{op:'detach',id:trip,photos:[j.photos[0].id]});assert.equal(photoEntry(j.photos[0]),null);assert.equal(j.photos[0].checkin,j.photos[0].id);
});
test('text records need meaningful notes and cannot claim photos; deletion and restoration retain album association',()=>{
 const j=fixture();assert.throws(()=>mutateEntry(j,owner,{...save,type:'text',photos:[],note:''}));mutateEntry(j,owner,save);
 mutateEntry(j,owner,{...save,id:second,type:'text',photos:[],note:'合成文字'});assert.throws(()=>mutateEntry(j,owner,{op:'attach',id:second,photos:['synthetic-photo-03']}));
 manageItems(j,owner,'records',[trip],true);assert.throws(()=>mutateEntry(j,owner,{op:'attach',id:trip,photos:['synthetic-photo-03']}));manageItems(j,owner,'photos',['synthetic-photo-01'],true);assert.throws(()=>manageItems(j,owner,'photos',['synthetic-photo-01'],false));
 manageItems(j,owner,'records',[trip],false);assert.equal(j.photos[0].removed,true);assert.equal(photoEntry(j.photos[1]),trip);manageItems(j,owner,'photos',['synthetic-photo-01'],false);assert.equal(photoEntry(j.photos[0]),trip);
 assert.equal(sharedJournal(j).entries.length,0);assert.equal(sharedJournal(j).photos.length,0);
});
test('timeline shows explicit trips, independent photos and prose once; EXIF proposal dates remain unconfirmed',()=>{
 const p=(id:string,entry:string|null,date:string)=>({id,url:'/synthetic/'+id,entry,marked:false,details:{...blankPhotoDetails,date,note:'合成笔记'}});
 const items=chronicleItems([{id:trip,title:'合成旅程',date:'2026-01-02',note:'相册',type:'trip'},{id:second,title:'一段文字',date:'2026-01-03',note:'文字',type:'text'}],[p('p1',trip,'2026-01-01'),p('p2',trip,'2026-01-02'),{...p('p3',null,''),proposal:{date:'2026-01-04'}}]);
 assert.equal(items.length,3);assert.equal(items.filter(i=>i.type==='photo').length,1);assert.equal(items[0].photos.length,2);assert.equal(items[2].proposedDate,true);assert.equal(items[2].mapId,undefined);assert.equal(timelineGroups(items)[0].days[0].date,'2026-01-04');
});
test('a grouped photo can still explicitly confirm its own location without changing record metadata',()=>{
 const j=fixture();mutateEntry(j,owner,save);const d={...blankPhotoDetails,country:'JP',prefecture:'架空県',city:'架空市',place:'合成地点',date:'2026-01-01',note:'照片笔记'};
 savePhotoDetails(j,owner,j.photos[0].id,{details:d,confirmed:true});assert.equal(j.checkins.length,1);assert.equal(j.checkins[0].id,j.photos[0].id);assert.equal(photoEntry(j.photos[0]),trip);assert.equal(j.entries[0].note,save.note);
 mutateEntry(j,owner,{op:'detach',id:trip,photos:[j.photos[0].id]});assert.equal(j.photos[0].checkin,j.checkins[0].id);assert.deepEqual(j.photos[0].details,d);
});
test('association endpoint enforces readonly, Origin and owner and reloads persisted links without public exposure',async()=>{
 let journal=fixture();const store={read:async()=>structuredClone(journal),mutate:async(o:string,fn:(j:typeof journal)=>unknown)=>{assert.equal(o,owner);const next=structuredClone(journal);fn(next);journal=journalSchema.parse(JSON.parse(JSON.stringify(next)))}};
 const context={userId:owner,origin:'https://synthetic.test',store:store as any};const request=(origin:string,b:unknown)=>new Request('https://synthetic.test/api/entries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(b)});
 assert.equal((await journalAPI({...context,readOnly:true},request(context.origin,save),'entry')).status,403);assert.equal((await journalAPI(context,request('https://foreign.test',save),'entry')).status,403);
 assert.equal((await journalAPI(context,request(context.origin,save),'entry')).status,200);const data:any=await (await journalAPI(context,undefined,'list')).json();assert.equal(data.entries.length,1);assert.equal(data.drafts[0].entry,trip);
 const shared:any=await (await journalAPI({...context,readOnly:true,sharedOnly:true},undefined,'list')).json();assert.equal(shared.entries.length,0);assert.equal(shared.drafts.length,0);
 manageItems(journal,owner,'records',[trip],true);const hidden:any=await (await journalAPI(context,undefined,'list')).json();assert.equal(hidden.drafts.length,1);assert.equal(hidden.removedEntries.length,1);
});
