import test from 'node:test';
import assert from 'node:assert/strict';
import {revealWindow} from '../lib/reveal-window.ts';
import {segmentTarget} from '../lib/segment-navigation.ts';
test('presentation window reveals more and resets for a different filter without changing total',()=>{
 assert.deepEqual(revealWindow(144,48,{key:'all',limit:48},'all'),{visible:48,next:96,remaining:96});
 assert.deepEqual(revealWindow(144,48,{key:'all',limit:96},'all'),{visible:96,next:144,remaining:48});
 assert.deepEqual(revealWindow(25,48,{key:'all',limit:144},'search'),{visible:25,next:25,remaining:0});
 assert.deepEqual(revealWindow(0,24,{key:'month',limit:24},'month'),{visible:0,next:0,remaining:0});
 assert.equal(revealWindow(185,24,{key:'all',limit:96},'old-month').visible,24);
});
test('segmented navigation wraps both directions and supports first/last without stealing unrelated keys',()=>{
 assert.equal(segmentTarget('ArrowLeft',0,3),2);assert.equal(segmentTarget('ArrowRight',2,3),0);
 assert.equal(segmentTarget('ArrowUp',1,3),0);assert.equal(segmentTarget('ArrowDown',1,3),2);
 assert.equal(segmentTarget('Home',2,3),0);assert.equal(segmentTarget('End',0,3),2);
 assert.equal(segmentTarget('Tab',0,3),null);assert.equal(segmentTarget('ArrowRight',0,0),null);
});
