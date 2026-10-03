import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarDate,timelineGroups} from '../lib/timeline.ts';
test('timeline sorts calendar days across years, preserving separate same-day records',()=>{
 const records=[{id:'old',date:'2025-12-31'},{id:'a',date:'2026-01-01'},{id:'b',date:'2026-01-01'},{id:'recent',date:'2026-10-03'}];
 const original=structuredClone(records),groups=timelineGroups(records);
 assert.deepEqual(groups.map(g=>g.key),['2026-10','2026-01','2025-12']);
 assert.deepEqual(groups[1].days[0].records.map(r=>r.id),['a','b']);
 assert.equal(groups[1].count,2);assert.equal(groups[0].days[0].weekday,'周六');
 assert.deepEqual(records,original);
});
test('timeline rejects rolled-over dates and keeps unknown dates visible at the end',()=>{
 assert.equal(calendarDate('2026-02-29'),null);assert.equal(calendarDate('2026-04-31'),null);
 assert.equal(calendarDate('2026-1-1'),null);assert.equal(calendarDate('2026-10-03T01:00:00Z'),null);
 assert.equal(calendarDate('2024-02-29')?.toISOString(),'2024-02-29T00:00:00.000Z');
 const groups=timelineGroups([{id:'missing',date:''},{id:'bad',date:'bad'},{id:'valid',date:'2024-02-29'}]);
 assert.deepEqual(groups.map(g=>g.key),['2024-02','undated']);
 assert.equal(groups[1].count,2);assert.deepEqual(groups[1].days[0].records.map(r=>r.id),['missing','bad']);
 assert.deepEqual(timelineGroups([]),[]);
});
