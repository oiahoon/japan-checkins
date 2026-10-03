import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverPhotos,nextPhotoId,photoDetailsChanged,readyPhoto} from '../lib/photo-discovery.ts';
import {blankPhotoDetails} from '../lib/photo-records.ts';
const items=[
 {id:'a',entry:null,marked:false,details:{...blankPhotoDetails,country:'JP',prefecture:'福岡県',city:'福岡市',date:'2026-01-01',note:'合成晨间笔记'}},
 {id:'b',entry:'album',marked:true,details:{...blankPhotoDetails,country:'CN',prefecture:'合成省',city:'合成市',date:'2026-01-03'}},
 {id:'c',entry:null,marked:false,details:blankPhotoDetails,proposal:{date:'2026-01-02'}},
 {id:'d',entry:null,marked:false,details:blankPhotoDetails},
];
test('photo search intersects text, consent and membership filters without mutating photos',()=>{
 const before=JSON.stringify(items),records=[{id:'album',title:'测试相册'}];
 assert.deepEqual(discoverPhotos(items,{query:'福冈 2026/01 晨间',unmarked:true}).map(p=>p.id),['a']);
 assert.deepEqual(discoverPhotos(items,{query:'测试相册',records}).map(p=>p.id),['b']);
 assert.equal(discoverPhotos(items,{query:'测试相册',records,entry:'free'}).length,0);
 assert.equal(discoverPhotos(items,{query:'晨间',noNotes:true}).length,0);
 assert.deepEqual(discoverPhotos(items,{query:'日本'}).map(p=>p.id),['a']);
 assert.equal(JSON.stringify(items),before);assert.equal(items[2].details.date,'');assert.equal(items[2].marked,false);
});
test('capture ordering uses saved dates before EXIF suggestions and leaves absent dates last',()=>{
 assert.deepEqual(discoverPhotos(items,{sort:'date-asc'}).map(p=>p.id),['a','c','b','d']);
 assert.deepEqual(discoverPhotos(items,{sort:'date-desc'}).map(p=>p.id),['b','c','a','d']);
 assert.deepEqual(discoverPhotos(items).map(p=>p.id),['d','c','b','a']);
 const tied=items.map(p=>({...p,details:{...p.details,date:'2026-01-01'}}));
 assert.deepEqual(discoverPhotos(tied,{sort:'date-desc'}).map(p=>p.id),['d','c','b','a']);
});
test('edit queue preserves discovery order and skips vanished, uploading and failed photos',()=>{
 const queue=['a','missing','b','c','d'];const active=items.map(p=>({...p,error:p.id==='b'?'synthetic failure':undefined,uploading:p.id==='c'}));
 assert.equal(nextPhotoId(queue,'a',active),'d');assert.equal(nextPhotoId(queue,'d',active),undefined);
 assert.equal(nextPhotoId(queue,'unknown',active),undefined);assert.equal(readyPhoto({...items[0],progress:99}),false);
 assert.equal(readyPhoto({...items[0],progress:100}),true);
});
test('unsaved edit detection compares all photo fields and ignores object insertion order',()=>{
 assert.equal(photoDetailsChanged(blankPhotoDetails,Object.fromEntries(Object.entries(blankPhotoDetails).reverse()) as typeof blankPhotoDetails),false);
 assert.equal(photoDetailsChanged(blankPhotoDetails,{...blankPhotoDetails,note:'合成笔记'}),true);
 assert.equal(photoDetailsChanged(blankPhotoDetails,{...blankPhotoDetails,latitude:0,longitude:0}),true);
 assert.equal(photoDetailsChanged(blankPhotoDetails,{...blankPhotoDetails,placeSource:'geoapify'}),true);
});
