import test from 'node:test';
import assert from 'node:assert/strict';
import {blankPhotoDetails} from '../lib/photo-records.ts';
import {photoSummary} from '../lib/photo-summary.ts';
test('saved region and city remain visible without a place or map consent',()=>{
 const d={...blankPhotoDetails,country:'JP',prefecture:'架空県',city:'架空市'};
 const s=photoSummary(d,false);
 assert.equal(s.location,'日本 · 架空県 · 架空市');assert.equal(s.locationMissing,false);
 assert.equal(s.marking,'具体地点待补充 · 未标记地图');
 assert.equal(s.date,'时间待补充');assert.equal(s.note,'笔记待补充');
});
test('saved values outrank proposals and empty notes remain missing',()=>{
 const d={...blankPhotoDetails,country:'CN',prefecture:'合成省',place:'合成地点',date:'2026-01-02',note:'  合成笔记  '};
 const s=photoSummary(d,false,{date:'2026-01-01',gps:{latitude:0,longitude:0}});
 assert.equal(s.location,'中国 · 合成省 · 合成地点');assert.equal(s.date,'2026-01-02');
 assert.equal(s.dateProposal,false);assert.equal(s.note,'合成笔记');assert.equal(s.marking,'尚未确认地图标记');
 assert.equal(photoSummary({...d,note:' '},true).noteMissing,true);
});
test('absent and GPS-only information does not claim a saved location',()=>{
 assert.equal(photoSummary(blankPhotoDetails,false).location,'地点待补充');
 const s=photoSummary(blankPhotoDetails,false,{date:'2026-01-01',gps:{latitude:0,longitude:0}});
 assert.equal(s.location,'定位待确认');assert.equal(s.locationMissing,true);assert.equal(s.dateProposal,true);
 assert.equal(s.marking,'未标记地图');
});
