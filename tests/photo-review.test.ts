import test from 'node:test';
import assert from 'node:assert/strict';
import {batchReview} from '../lib/photo-review.ts';
test('batch review detects differing dates and distant locations without inferring visits',()=>{const r=batchReview([{metadata:{date:'2026-01-01',gps:{latitude:0,longitude:0}}},{metadata:{date:'2026-01-02',gps:{latitude:1,longitude:0}}},{}]);assert.deepEqual(r,{distinctDates:true,separated:true,missingLocation:1,missingDate:1});});
test('close and absent metadata do not manufacture conflicting visits',()=>{assert.equal(batchReview([{metadata:{gps:{latitude:0,longitude:0}}},{metadata:{gps:{latitude:.001,longitude:.001}}}]).separated,false);assert.deepEqual(batchReview([{},{}]),{distinctDates:false,separated:false,missingLocation:2,missingDate:2});});
