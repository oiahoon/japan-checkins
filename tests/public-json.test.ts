import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicJsonLoader,type PublicJsonPath} from '../lib/public-json.ts';
import {PhotoLoader} from '../lib/photo-loader.ts';
test('public reads deduplicate in-flight requests and parsed results across consumers',async()=>{
 let calls=0,parsed=0;const loader=createPublicJsonLoader(async(_url,init)=>{calls++;assert.equal(init?.priority,'low');return {ok:true,json:async()=>{parsed++;return {features:['synthetic']}}} as Response});
 const first=loader('/world-simple.json'),second=loader('/world-simple.json');assert.equal(first,second);
 assert.deepEqual(await first,{features:['synthetic']});assert.equal(await first,await loader('/world-simple.json'));
 assert.equal(calls,1);assert.equal(parsed,1);
});
test('private and external URLs never enter the public asset cache',async()=>{
 let calls=0;const loader=createPublicJsonLoader(async()=>{calls++;return new Response('{}')});
 for(const path of ['/api/checkins','/api/photos/private','https://example.com/geometry.json'])await assert.rejects(loader(path as PublicJsonPath),/仅允许/);
 assert.equal(calls,0);
});
test('failed status and malformed JSON are evicted so the next attempt really retries',async()=>{
 let calls=0;const loader=createPublicJsonLoader(async()=>{calls++;return calls===1?new Response('',{status:503}):calls===2?new Response('bad json'):new Response('{"ok":true}')});
 await assert.rejects(loader('/place-index.json'));await assert.rejects(loader('/place-index.json'));
 assert.deepEqual(await loader('/place-index.json'),{ok:true});assert.equal(calls,3);
});
test('slow public reads abort within the bound and can be retried',async()=>{
 let calls=0;const loader=createPublicJsonLoader(async(_url,init)=>{calls++;if(calls>1)return new Response('{}');return new Promise<Response>((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new Error('synthetic timeout')),{once:true})})},10);
 await assert.rejects(loader('/world-simple.json'),/synthetic timeout/);assert.deepEqual(await loader('/world-simple.json'),{});assert.equal(calls,2);
});
test('queued map/directory reads wait for visible photos without consuming their timeout', {timeout:3000},async()=>{
 let finish!:()=>void,calls=0;const photos=new PhotoLoader(async()=>new Promise<Blob>(r=>{finish=()=>r(new Blob(['synthetic']))}));const photo=photos.blob('synthetic-photo',{priority:'visible'}),loader=createPublicJsonLoader(async()=>{calls++;return new Response('{"ok":true}')},10),data=loader('/china-admin.json');
 try{await new Promise(r=>setTimeout(r,30));assert.equal(calls,0);finish();await photo;assert.deepEqual(await data,{ok:true});assert.equal(calls,1)}finally{photos.close();loader.close();await Promise.allSettled([photo,data])}
});
test('an in-flight public directory pauses for a foreground photo and resumes the same consumer',{timeout:3000},async()=>{
 let calls=0,interrupts=0,finishPhoto!:()=>void;
 const loader=createPublicJsonLoader(async(_path,init)=>{calls++;if(calls===1)return new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>{interrupts++;reject(new DOMException('cancelled','AbortError'))},{once:true}));return new Response('{"ready":true}')});
 const photos=new PhotoLoader(async()=>new Promise<Blob>(r=>{finishPhoto=()=>r(new Blob(['synthetic']))})),directory=loader('/place-index.json');let image:Promise<Blob>|undefined;
 try{await new Promise(r=>setImmediate(r));image=photos.blob('synthetic-viewer',{priority:'foreground'});await new Promise(r=>setImmediate(r));assert.equal(interrupts,1);assert.equal(calls,1);finishPhoto();await image;assert.deepEqual(await directory,{ready:true});assert.equal(calls,2)}finally{photos.close();loader.close();await Promise.allSettled([directory,...(image?[image]:[])])}
});
