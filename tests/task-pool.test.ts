import test from 'node:test';
import assert from 'node:assert/strict';
import {taskPool} from '../lib/task-pool.ts';
test('photo pool caps concurrent whole operations and releases slots after failures',async()=>{
 const run=taskPool(3);let active=0,peak=0;const order:number[]=[];
 const jobs=Array.from({length:48},(_,i)=>run(async()=>{active++;peak=Math.max(peak,active);order.push(i);await new Promise(resolve=>setTimeout(resolve,1));active--;if(i===2)throw Error('synthetic network failure');return i}));
 const results=await Promise.allSettled(jobs);assert.equal(peak,3);assert.equal(active,0);assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.deepEqual(order,Array.from({length:48},(_,i)=>i));assert.equal(await run(async()=>99),99);
});
test('photo pool refuses invalid concurrency',()=>{for(const n of [0,-1,1.5,NaN])assert.throws(()=>taskPool(n))});
