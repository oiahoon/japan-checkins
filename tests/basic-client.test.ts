import test from 'node:test';import assert from 'node:assert/strict';
import {BrowserJournal} from '../basic/client.ts';
import {emptyJournal,setMarkers,type Journal} from '../lib/travel-data.ts';
import {encodeBase64,decodeBase64} from '../lib/base64.ts';
const jpeg=new Uint8Array([255,216,255,224,0,6,74,70,73,70,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,2,3,255,217]);
function fake({publicRepo=false,conflict=false,loss=false,owner='journal-owner'}={}){
 let j:Journal=emptyJournal(owner),head='head0',pending='',count=0,writes=0;const commits=new Map<string,string>();let image=jpeg;
 const read:typeof fetch=async(url,init)=>{const path=new URL(String(url)).pathname.replace('/repos/synthetic/private','');const body=init?.body?JSON.parse(String(init.body)):{};const ok=(d:unknown)=>Response.json(d);
  assert.equal(new URL(String(url)).origin,'https://api.github.com');assert.ok(new Headers(init?.headers).get('Authorization')?.startsWith('Bearer '));
  if(!path)return ok({private:!publicRepo});if(path.startsWith('/git/ref/'))return ok({object:{sha:head}});if(path.startsWith('/git/commits/'))return ok({tree:{sha:'tree0'}});
  if(path==='/contents/travel/index.json')return ok({encoding:'base64',size:100,content:encodeBase64(new TextEncoder().encode(JSON.stringify(j)))});
  if(path.startsWith('/git/blobs/'))return ok({encoding:'base64',size:image.length,content:encodeBase64(image)});
  if(path==='/git/blobs'){image=decodeBase64(body.content);return ok({sha:'a'.repeat(40)})}
  if(path==='/git/trees'){pending=body.tree[0].content;return ok({sha:'newtree'})}
  if(path==='/git/commits'){const sha='commit'+(++count);commits.set(sha,pending);return ok({sha})}
  if(path.startsWith('/git/refs/')){writes++;assert.equal(body.force,false);if(conflict&&writes===1){setMarkers(j,owner,[{scope:'city',label:'合成并发',depth:1,eaten:false}]);return new Response(null,{status:422})}j=JSON.parse(commits.get(body.sha)!);head=body.sha;if(loss&&writes===1)throw Error('Synthetic lost response');return ok({object:{sha:head}})}throw Error(path);
 };
 return {read,data:()=>j,writes:()=>writes,client:()=>new BrowserJournal('synthetic/private','main','synthetic-token-only',read)};
}
const upload=(id='synthetic-photo-01')=>({method:'POST',headers:{'X-Upload-Id':id,'X-Photo-Proposal':encodeURIComponent(JSON.stringify({date:'2020-01-02',dateStatus:'read',dateSource:'original'}))},body:new Blob([jpeg],{type:'image/jpeg'})});
const details={country:'JP',prefecture:'福岡県',city:'福岡市',district:'',place:'合成地点',date:'2020-01-02',note:'合成笔记',latitude:null,longitude:null};
test('browser private journal supports upload, explicit photo confirmation, trip association and reload without exposing credentials',async()=>{
 const f=fake(),c=f.client();await c.connect();assert.equal((await c.request('/api/photos',upload())).status,201);assert.equal(f.data().checkins.length,0);assert.equal(f.data().photos[0].proposal?.date,'2020-01-02');
 const patch={method:'PATCH',body:JSON.stringify({details,confirmed:true})};assert.equal((await c.request('/api/photos/synthetic-photo-01',patch)).status,200);assert.equal(f.data().checkins.length,1);await c.request('/api/photos/synthetic-photo-01',patch);assert.equal(f.data().checkins.length,1);
 assert.equal((await c.request('/api/entries',{method:'POST',body:JSON.stringify({op:'save',id:'synthetic-trip-01',type:'trip',title:'合成旅行',date:'2020-01-02',note:'',photos:['synthetic-photo-01']})})).status,200);
 const next=f.client();await next.connect();const projection=await (await next.request('/api/checkins')).json() as {photos:{entry:string}[]};assert.equal(projection.photos[0].entry,'synthetic-trip-01');assert.ok(!JSON.stringify(projection).includes('synthetic-token-only'));assert.equal((await next.photo('/api/photos/synthetic-photo-01')).type,'image/jpeg');
 c.disconnect();assert.equal((await c.request('/api/checkins')).status,401);
});
test('browser journal rejects public storage, malformed input and duplicate upload content; conflict and lost response are recoverable',async()=>{
 await assert.rejects(fake({publicRepo:true}).client().connect());assert.throws(()=>new BrowserJournal('bad/repo/extra','main','synthetic'));
 for(const options of [{conflict:true},{loss:true}]){const f=fake(options),c=f.client();await c.connect();await c.request('/api/photos',upload());assert.equal((await c.request('/api/photos',upload())).status,201);assert.equal(f.data().photos.length,1);if('conflict'in options)assert.ok(f.data().statuses.some(s=>s.label==='合成并发'));}
 const f=fake(),c=f.client();await c.connect();const bad=await c.request('/api/photos',{...upload(),body:new Blob(['not an image'])});assert.equal(bad.status,400);assert.equal(f.writes(),0);
 const unconfirmed=await c.request('/api/photos/synthetic-photo-01',{method:'PATCH',body:JSON.stringify({details,confirmed:false})});assert.equal(unconfirmed.status,400);
});
test('UTF-8 base64 round trip keeps Chinese notes and binary JPEG intact',()=>{const text='福岡 · 合成笔记';assert.equal(new TextDecoder().decode(decodeBase64(encodeBase64(new TextEncoder().encode(text)))),text);assert.deepEqual(decodeBase64(encodeBase64(jpeg)),jpeg)});
