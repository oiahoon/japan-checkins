import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cityDistricts,regionCities,type ChinaDirectory} from '../lib/china-admin.ts';
import {lookupPlace,type PlaceMatch} from '../lib/place-lookup.ts';
import {createExplorerTree,explorerPath,nodeForVisit,visitInExplorerNode,detailNodeAt,fitCamera,searchExplorer} from '../lib/map-explorer.ts';
import {emptyJournal,journalSchema} from '../lib/travel-data.ts';
import {blankPhotoDetails,savePhotoDetails} from '../lib/photo-records.ts';
import {photoSummary} from '../lib/photo-summary.ts';
import {photoAreas} from '../lib/photo-puzzle.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL('../public/'+name+'.json',import.meta.url),'utf8'));
const directory:ChinaDirectory=read('china-admin'),coverage=read('china-coverage'),cities=read('china-cities').features;
const districts=directory.regions.flatMap(r=>read('china-districts/'+r.code).features);
const places:PlaceMatch[]=read('place-index');
const geos={japan:read('japan-simple').features,japanCities:read('japan-cities').features,china:read('china-simple').features,world:read('world-simple').features,sichuan:read('sichuan-cities').features,chengdu:read('chengdu-districts').features,chinaAdmin:directory,chinaCities:cities,chinaDistricts:districts};
const tree=createExplorerTree(geos);
test('national directory contains complete pinned name counts and no fabricated county layer',()=>{
 assert.equal(directory.mainlandAsOf,'2023-06-30');assert.equal(directory.regions.length,34);
 assert.equal(directory.regions.flatMap(r=>r.cities).length,393);
 assert.equal(directory.regions.flatMap(r=>r.cities.flatMap(c=>c.districts)).length,3336);
 const codes=directory.regions.flatMap(r=>[r.code,...r.cities.flatMap(c=>[c.code,...c.districts.map(d=>d.code)])]);assert.equal(new Set(codes).size,codes.length);
 for(const r of directory.regions)for(const c of r.cities){assert.ok(!['市辖区','县','省直辖县级行政区划','自治区直辖县级行政区划'].includes(c.name));for(const d of c.districts)assert.ok(d.code.startsWith('tw:')||d.code.length===6)}
 for(const [name,count]of [['北京市',16],['天津市',16],['上海市',16],['重庆市',38]] as const){assert.equal(regionCities(directory,name).length,1);assert.equal(cityDistricts(directory,name,name).length,count)}
 assert.equal(cityDistricts(directory,'广东省','东莞市').length,0);assert.equal(cityDistricts(directory,'广东省','中山市').length,0);assert.equal(cityDistricts(directory,'甘肃省','嘉峪关市').length,0);
 assert.equal(regionCities(directory,'河南省').find(c=>c.name==='济源市')?.kind,'direct');assert.equal(regionCities(directory,'湖北省').find(c=>c.name==='仙桃市')?.kind,'direct');
 assert.equal(cityDistricts(directory,'四川省','成都市').length,20);assert.equal(regionCities(directory,'台湾省').length,22);assert.equal(regionCities(directory,'台湾省').flatMap(c=>c.districts).length,368);assert.equal(cityDistricts(directory,'香港特别行政区','香港').length,18);assert.equal(cityDistricts(directory,'澳门特别行政区','澳门').length,8);
});
test('same-name districts retain full parent paths and resolve only with sufficient context',()=>{
 const siblings=lookupPlace('城区',places);assert.equal(siblings.automatic,undefined);assert.ok(siblings.candidates.some(m=>m.city==='阳泉市'));assert.ok(siblings.candidates.some(m=>m.city==='晋城市'));
 for(const [query,province,city,district] of [['阳泉城区','山西省','阳泉市','城区'],['晋城城区','山西省','晋城市','城区'],['北京朝阳区','北京市','北京市','朝阳区'],['深圳南山区','广东省','深圳市','南山区'],['台北中正区','台湾省','台北市','中正區'],['香港灣仔區','香港特别行政区','香港','湾仔区']]){const m=lookupPlace(query,places).automatic;assert.equal(m?.prefecture,province,query);assert.equal(m?.city,city,query);assert.equal(m?.district,district,query)}
 for(const q of ['朝阳区','福冈 成都','北区','不存在的合成区县'])assert.equal(lookupPlace(q,places).automatic,undefined,q);
 for(const city of ['杭州市','广州市','西安市','乌鲁木齐市'])assert.equal(lookupPlace(city,places).automatic?.country,'CN',city);
});
test('public historical geometry and per-province coverage agree; missing names never get invented polygons',()=>{
 assert.equal(districts.filter((f:any)=>f.properties.prefecture==='北京市').length,16);assert.ok(districts.some((f:any)=>f.properties.adminCode==='110105'&&f.properties.sourceName==='Chaoyang District'));
 assert.equal(cities.length,382);assert.equal(districts.length,2663);
 for(const r of directory.regions)assert.deepEqual(read('china-cities/'+r.code).features,cities.filter((f:any)=>f.properties.prefecture===r.name));
 for(const fs of [cities,districts]){assert.equal(new Set(fs.map((f:any)=>f.properties.adminCode)).size,fs.length);for(const f of fs){assert.equal(f.geometry.type,'MultiPolygon');assert.ok(f.geometry.coordinates.length);assert.ok(f.geometry.coordinates.flat(3).every(Number.isFinite));assert.ok(f.properties.source);assert.ok([2017,2019,2020,2021].includes(f.properties.year));}}
 for(const row of coverage.regions){assert.equal(cities.filter((f:any)=>f.properties.prefecture===row.name).length,row.mappedCities);assert.equal(districts.filter((f:any)=>f.properties.prefecture===row.name).length,row.mappedDistricts)}
 for(const code of coverage.missingDistrictCodes)assert.ok(!districts.some((f:any)=>f.properties.adminCode===code));
 const missing=tree.get('cn-district:810002')!;assert.equal(missing.hasBoundary,false);assert.equal(missing.features.length,0);assert.ok(Object.values(fitCamera(missing,1.8)).every(Number.isFinite));assert.notEqual(detailNodeAt(tree,missing.parent!,fitCamera(missing,1.8),1.8).id,missing.id);
});
test('national explorer paths and filters use province, city and district without recording a visit on navigation',()=>{
 const synthetic={id:'synthetic-cn-photo',country:'CN',prefecture:'浙江省',city:'杭州市',district:'西湖区',place:'合成地点',date:'2026-01-02'};
 const n=nodeForVisit(tree,synthetic)!;assert.deepEqual(explorerPath(tree,n.id).map(n=>n.name),['世界','亚洲','中国','浙江省','杭州市','西湖区']);assert.equal(visitInExplorerNode(synthetic,n),true);
 assert.equal(visitInExplorerNode({...synthetic,prefecture:'江西省',city:'南昌市'},n),false);assert.equal(visitInExplorerNode({...synthetic,district:undefined},n),false);
 const empty=createExplorerTree({...geos,chinaCities:[],chinaDistricts:[]});assert.equal(empty.get(n.id)!.features.length,0);assert.deepEqual(explorerPath(empty,n.id).map(n=>n.name),explorerPath(tree,n.id).map(n=>n.name));
 assert.ok(searchExplorer(tree,'杭州西湖区').some(match=>match.id===n.id));
 const beijing=tree.get('cn-district:110108')!;assert.deepEqual(explorerPath(tree,beijing.id).map(n=>n.name),['世界','亚洲','中国','北京市','海淀区']);
 const parent=tree.get('cn-city:3301')!;assert.equal(parent.children.length,cityDistricts(directory,'浙江省','杭州市').length);
});
test('district photo edits survive reload, retain consent, ownership and retry semantics',()=>{
 const owner='synthetic-owner',j=emptyJournal(owner),id='synthetic-photo-01';j.photos.push({id,owner,sha:'a'.repeat(40),digest:'fixture',checkin:null,created:'2026-01-01'});
 const details={...blankPhotoDetails,country:'CN',prefecture:'合成省',city:'合成市',district:'合成区',place:'合成地点',date:'2026-01-02'};
 savePhotoDetails(j,owner,id,{details,confirmed:false});assert.equal(j.checkins.length,0);savePhotoDetails(j,owner,id,{details,confirmed:true});assert.equal(j.checkins[0].district,details.district);
 const restored=journalSchema.parse(JSON.parse(JSON.stringify(j)));assert.equal(restored.photos[0].details?.district,details.district);assert.ok(photoSummary(details,true).location.includes(details.district));savePhotoDetails(restored,owner,id,{details,confirmed:true});assert.equal(savePhotoDetails(restored,owner,id,{details,confirmed:true}),false);assert.equal(restored.checkins.length,1);
 assert.throws(()=>savePhotoDetails(restored,'other-owner',id,{details,confirmed:true}));assert.throws(()=>savePhotoDetails(restored,owner,id,{details:{...details,district:'另一合成区'},confirmed:false}));
 savePhotoDetails(restored,owner,id,{details:{...details,country:'JP',prefecture:'架空県',city:'架空市',district:''},confirmed:true});assert.equal(restored.checkins[0].district,'');assert.equal(restored.checkins[0].latitude,null);
});
test('domestic photo puzzle respects county parent paths and excludes unconfirmed photos',()=>{
 const synthetic={id:'synthetic-visit',country:'CN',prefecture:'浙江省',city:'杭州市',district:'西湖区',place:'合成地点',date:'2026-01-02'};
 const photos=[{id:'synthetic-photo',checkin:synthetic.id,url:'data:image/svg+xml,<svg/>'},{id:'synthetic-draft',checkin:null,url:'data:image/svg+xml,<svg/>'}];
 const regions=photoAreas('china',districts,[synthetic],photos);assert.equal(regions.length,1);assert.equal(regions[0].feature.properties.district,'西湖区');assert.equal(regions[0].photos.length,1);
 assert.equal(photoAreas('china',districts,[{...synthetic,city:'南昌市'}],photos).length,0);assert.equal(photoAreas('china',districts,[{...synthetic,district:undefined}],photos).length,0);
});
