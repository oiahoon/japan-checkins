import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPosterPhotos} from '../lib/poster-photos.ts';
const items=[1,2,1,3].map(id=>({id:String(id),checkin:'saved',url:'/api/photos/'+id}));
test('export reads at most two unique photos in parallel, preserves order and reports progress',async()=>{
 let active=0,peak=0,reads=0;const progress:number[]=[];
 const result=await loadPosterPhotos(items,{signal:new AbortController().signal,read:async()=>{reads++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,3));active--;return new Blob(['image'],{type:'image/jpeg'})},encode:async()=> 'data:image/jpeg;base64,synthetic',onProgress:n=>progress.push(n)});
 assert.equal(reads,3);assert.equal(peak,2);assert.deepEqual(result.map(p=>p.id),['1','2','1','3']);assert.deepEqual(progress,[0,1,2,3]);assert.ok(result.every(p=>p.url.startsWith('data:image/jpeg')));
});
test('timeout, abort, bad format and excessive total bytes fail without a partial export; subsequent retries succeed',async()=>{
 const encode=async()=> 'data:image/jpeg;base64,synthetic',read=async()=>new Blob(['image'],{type:'image/jpeg'});
 await assert.rejects(loadPosterPhotos(items,{signal:new AbortController().signal,read:async(_,signal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})),encode,requestMs:8,budgetMs:30}),/超时/);
 await assert.rejects(loadPosterPhotos(items,{signal:new AbortController().signal,read:async(_,signal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})),encode,requestMs:30,budgetMs:8}),/超时/);
 await assert.rejects(loadPosterPhotos(items,{signal:new AbortController().signal,read,encode,maxBytes:8}),/照片较多/);
 await assert.rejects(loadPosterPhotos(items,{signal:new AbortController().signal,read:async()=>new Blob(['bad'],{type:'text/html'}),encode}),/格式/);
 const abort=new AbortController();abort.abort();await assert.rejects(loadPosterPhotos(items,{signal:abort.signal,read,encode}));
 assert.equal((await loadPosterPhotos(items,{signal:new AbortController().signal,read,encode})).length,4);
 await assert.rejects(loadPosterPhotos(Array.from({length:101},(_,id)=>({id:String(id),checkin:'saved',url:'/api/photos/'+id})),{signal:new AbortController().signal,read,encode}),/照片较多/);
});
