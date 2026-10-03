import {sanitizeJPEG} from '../lib/photo.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readPhotoMetadata,confirmedLocation,prefectureAt,validDate} from '../lib/photo-metadata.ts';
// Generated synthetic TIFF, no personal photo or real travel history.
function fixture(little=true){const t=new Uint8Array(400),v=new DataView(t.buffer);const u16=(o:number,n:number)=>v.setUint16(o,n,little),u32=(o:number,n:number)=>v.setUint32(o,n,little);t.set(little?[73,73]:[77,77]);u16(2,42);u32(4,8);
const entry=(o:number,tag:number,type:number,count:number,value:number)=>{u16(o,tag);u16(o+2,type);u32(o+4,count);type===3&&count===1?u16(o+8,value):u32(o+8,value);};
u16(8,3);entry(10,0x112,3,1,6);entry(22,0x8825,4,1,60);entry(34,0x8769,4,1,120);
u16(60,4);entry(62,1,2,2,0);t[70]=78;entry(74,2,5,3,180);entry(86,3,2,2,0);t[94]=69;entry(98,4,5,3,204);
for(const [at,values] of [[180,[35,40,0]],[204,[139,45,0]]] as [number,number[]][]){values.forEach((n,i)=>{u32(at+i*8,n);u32(at+i*8+4,1);});}
u16(120,2);entry(122,0x9003,2,20,230);entry(134,0x9011,2,7,250);t.set(new TextEncoder().encode('2024:02:29 23:45:59\0'),230);t.set(new TextEncoder().encode('+09:00\0'),250);
const payload=new Uint8Array(6+t.length);payload.set([69,120,105,102,0,0]);payload.set(t,6);const b=new Uint8Array(payload.length+8);b.set([255,216,255,225,(payload.length+2)>>8,(payload.length+2)&255]);b.set(payload,6);b.set([255,217],b.length-2);return b;}
for(const little of [true,false])test('bounded TIFF endian GPS/date/orientation '+little,()=>{const m=readPhotoMetadata(fixture(little));assert.equal(m.gps?.latitude,35+40/60);assert.equal(m.gps?.longitude,139.75);assert.equal(m.date,'2024-02-29');assert.equal(m.offset,'+09:00');assert.equal(m.orientation,6);});
test('absent metadata is honest manual fallback',()=>assert.equal(readPhotoMetadata(new Uint8Array([255,216,255,217])).gps,undefined));
test('truncated and malicious offsets never throw or invent coordinates',()=>{const b=fixture();assert.equal(readPhotoMetadata(b.slice(0,100)).gps,undefined);new DataView(b.buffer).setUint32(12,0xffffffff,true);assert.equal(readPhotoMetadata(b).gps,undefined);});
test('unknown timezone preserves camera date without conversion',()=>{const b=fixture();b.fill(0,262,269);const m=readPhotoMetadata(b);assert.equal(m.date,'2024-02-29');assert.equal(m.offset,undefined);});
test('invalid dates are rejected',()=>{assert.equal(validDate('2024-02-30'),false);assert.equal(validDate('2024-02-29'),true);});
test('confirmation is mandatory and coordinates are bounded',()=>{assert.equal(confirmedLocation(null),null);assert.throws(()=>confirmedLocation({latitude:35,longitude:139,source:'photo'}));assert.throws(()=>confirmedLocation({confirmed:true,latitude:NaN,longitude:139,source:'manual'}));assert.throws(()=>confirmedLocation({confirmed:true,latitude:0,longitude:0,source:'manual'}));assert.deepEqual(confirmedLocation({confirmed:true,latitude:35,longitude:139,source:'manual'}),{latitude:35,longitude:139,source:'manual'});});
test('polygon proposal respects holes, boundary and unknown regions',()=>{const f=[{properties:{name:'synthetic'},geometry:{coordinates:[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]]}}];assert.equal(prefectureAt(2,2,f),'synthetic');assert.equal(prefectureAt(5,5,f),undefined);assert.equal(prefectureAt(0,0,f),'synthetic');assert.equal(prefectureAt(20,20,f),undefined);});
test('multiple photos remain independent proposals',()=>{const a=fixture(),b=fixture();new DataView(b.buffer).setUint32(192,36,true);assert.notEqual(readPhotoMetadata(a).gps?.latitude,readPhotoMetadata(b).gps?.latitude);});

test('server strips synthetic GPS/date/orientation EXIF before photo storage',()=>{const exif=fixture().slice(2,-2);const frame=new Uint8Array([255,192,0,11,8,0,1,0,1,1,1,17,0]);const scan=new Uint8Array([255,218,0,8,1,1,0,0,63,0,0,255,217]);const image=new Uint8Array(2+exif.length+frame.length+scan.length);image.set([255,216]);image.set(exif,2);image.set(frame,2+exif.length);image.set(scan,2+exif.length+frame.length);assert.ok(readPhotoMetadata(image).gps);const clean=sanitizeJPEG(image);assert.equal(readPhotoMetadata(clean).gps,undefined);assert.equal(readPhotoMetadata(clean).date,undefined);assert.equal(readPhotoMetadata(clean).orientation,undefined);});

// Multi-format metadata: synthetic coordinates only, never a user's photo.
import {inspectPhoto,normalizeMetadata,boundedSource} from '../lib/photo-import.ts';
import {cameraMetadataSchema,journalSchema,emptyJournal} from '../lib/travel-data.ts';
test('TIFF/DNG EXIF proposals support both byte orders',async()=>{for(const little of [true,false]){const jpeg=fixture(little);const tiff=jpeg.slice(12,-2);const m=await inspectPhoto(new Blob([tiff]));assert.equal(m.gps?.longitude,139.75);assert.equal(m.date,'2024-02-29');}});
test('camera metadata is bounded and does not persist unconfirmed GPS',()=>{const m=normalizeMetadata({Make:'LEICA',Model:'Q3',LensModel:'test lens',ISO:100,FNumber:2,latitude:0,longitude:0,DateTimeOriginal:'2024:02:30 12:00:00'});assert.equal(m.date,undefined);assert.equal(m.gps?.latitude,0);assert.equal(m.camera?.model,'Q3');assert.throws(()=>cameraMetadataSchema.parse({...m.camera,latitude:0}));const j=emptyJournal('test-owner');assert.equal(journalSchema.parse(j).photos.length,0);});
test('malformed multi-format metadata falls back without invented GPS',async()=>{const m=await inspectPhoto(new Blob([new Uint8Array(40)]));assert.equal(m.gps,undefined);assert.ok(m.warning);assert.throws(()=>boundedSource({size:101*1024*1024} as Blob));});
