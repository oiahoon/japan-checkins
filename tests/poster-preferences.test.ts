import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPosterPreferences,readPosterStyles,writePosterStyles} from '../lib/poster-preferences.ts';
import {posterCollections,collectionVisits} from '../lib/poster-collections.ts';
const settings={style:'night',format:'phone',colors:{accent:'#123456',background:'javascript:no'},mapScale:Infinity,mapOffset:{x:9,y:NaN},precise:true,puzzle:true,title:'private',year:'2025',photos:['secret'],subtitle:'note',visits:[{latitude:35}]};
test('saved designs whitelist styling only, bound composition and reject corrupt storage',()=>{
 const cleaned=cleanPosterPreferences(settings)!;assert.equal(cleaned.mapScale,1);assert.deepEqual(cleaned.mapOffset,{x:.5,y:0});assert.deepEqual(cleaned.colors,{accent:'#123456'});
 const raw=writePosterStyles([{id:'sample-id',name:' 暖纸 ',settings:cleaned}]);for(const word of ['private','secret','latitude','precise','puzzle','subtitle','year'])assert.ok(!raw.includes(word));
 assert.equal(readPosterStyles(raw)[0].name,'暖纸');assert.deepEqual(readPosterStyles('{'),[]);assert.deepEqual(readPosterStyles(JSON.stringify({version:2,styles:[]})),[]);
 assert.equal(cleanPosterPreferences({style:'other',format:'print'}),null);assert.equal(readPosterStyles(JSON.stringify({version:1,styles:Array(8).fill({id:'same',name:'重复',settings:cleaned})})).length,1);
});
test('trip export contains only explicit member visits within its geographic lens, never proposals or other album photos',()=>{
 const visits=['confirmed-a','legacy'].map(id=>({id,country:'JP',prefecture:'合成县',city:'合成市',date:'2025-01-01',place:'合成地点'}));
 const photos=[{id:'a',checkin:'confirmed-a',entry:'trip-a'},{id:'b',checkin:null,entry:'trip-a'},{id:'other',checkin:'outside-country',entry:'trip-a'},{id:'legacy-photo',checkin:'legacy'},{id:'free',checkin:'confirmed-a',entry:null}];
 const entries=[{id:'trip-a',title:'合成旅行',type:'trip'},{id:'trip-b',title:'空相册',type:'trip'},{id:'text',title:'文字',type:'text'},{id:'legacy',title:'旧相册',type:'trip'}];
 const sets=posterCollections(entries,photos,visits,p=>p.entry!==undefined?p.entry:p.checkin&&p.checkin!==p.id?p.checkin:null);
 assert.deepEqual(sets.map(s=>s.id),['trip-a','legacy']);assert.deepEqual(sets[0].visitIds,['confirmed-a']);assert.deepEqual(collectionVisits(visits,sets,'trip-a').map(v=>v.id),['confirmed-a']);assert.deepEqual(collectionVisits(visits,sets,'removed'),[]);assert.equal(collectionVisits(visits,sets,''),visits);
});
