import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicJsonLoader,type PublicJsonPath} from '../lib/public-json.ts';
test('public reads deduplicate in-flight requests and parsed results across consumers',async()=>{
 let calls=0,parsed=0;const loader=createPublicJsonLoader(async()=>{calls++;return {ok:true,json:async()=>{parsed++;return {features:['synthetic']}}} as Response});
 const first=loader('/japan-cities.json'),second=loader('/japan-cities.json');assert.equal(first,second);
 assert.deepEqual(await first,{features:['synthetic']});assert.equal(await first,await loader('/japan-cities.json'));
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
