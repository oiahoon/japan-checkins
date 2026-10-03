import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPlaces,admitPlaceSearch} from '../lib/place-search-service.ts';
import {parsePlaceResults,applySearchPlace} from '../lib/place-search.ts';
import {photoSaveIntent} from '../lib/photo-save-intent.ts';
import {blankPhotoDetails,savePhotoDetails} from '../lib/photo-records.ts';
import {emptyJournal,journalSchema,sharedJournal} from '../lib/travel-data.ts';
import {buildPoster} from '../lib/travel-poster.ts';
import type {MapFeature} from '../lib/geography.ts';
const origin='https://synthetic.invalid',access={userId:'synthetic-owner',role:'admin' as const};
const request=(value:unknown={query:'合成车站'},requestOrigin=origin)=>new Request(origin+'/api/places',{method:'POST',headers:{Origin:requestOrigin},body:JSON.stringify(value)});
const provider={results:[{name:'合成车站',formatted:'合成市 · 合成地区',country_code:'jp',state:'translated state',city:'translated city',lat:0,lon:0,result_type:'amenity',apiKey:'never-project-secret'}]};
const feature=(name:string):MapFeature=>({properties:{id:1,name,...{prefecture:'架空県'}},geometry:{type:'MultiPolygon',coordinates:[[[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]]]}});
test('place service denies anonymous, viewer and foreign Origin before contacting provider',async()=>{
 let called=0;const fetcher:typeof fetch=async()=>{called++;return Response.json(provider)};
 for(const [session,from,status]of [[null,origin,401],[{...access,role:'viewer' as const},origin,403],[access,'https://other.invalid',403]] as const){const response=await searchPlaces(request({},from),{access:session,origin,apiKey:'synthetic-key',fetcher});assert.equal(response.status,status)}
 assert.equal(called,0);
});
test('configuration is private, no key means no external search, invalid or oversized requests are bounded',async()=>{
 const config=await searchPlaces(new Request(origin+'/api/places'),{access,origin});assert.deepEqual(await config.json(),{enabled:false,provider:null});assert.match(config.headers.get('cache-control')!,/no-store/);
 let called=0;const fetcher:typeof fetch=async()=>{called++;return Response.json(provider)};
 assert.deepEqual(await (await searchPlaces(request(),{access,origin,fetcher})).json(),{enabled:false,results:[]});
 for(const body of [{query:'字'},{query:'x'.repeat(151)},{query:'合成',latitude:1},{query:'合成',unexpected:'x'.repeat(3000)}])assert.equal((await searchPlaces(request(body),{access,origin,apiKey:'synthetic-key',fetcher})).status,400);
 assert.equal(called,0);
});
test('provider request sends only typed keyword; failures do not expose key and retries remain possible',async()=>{
 const fetcher:typeof fetch=async(input,options)=>{const url=new URL(String(input));assert.equal(url.origin,'https://api.geoapify.com');assert.equal(url.searchParams.get('text'),'合成车站');assert.deepEqual([...url.searchParams.keys()].sort(),['apiKey','format','lang','limit','text']);assert.equal(options?.redirect,'error');assert.ok(options?.signal);return Response.json(provider)};
 const response=await searchPlaces(request(),{access,origin,apiKey:'synthetic-secret',fetcher});assert.equal(response.status,200);const output=JSON.stringify(await response.json());assert.ok(!output.includes('secret'));assert.ok(!output.includes('apiKey'));
 for(const response of [new Response('',{status:429}),Response.json({wrong:true}),new Response('x'.repeat(131073))]){const result=await searchPlaces(request(),{access,origin,apiKey:'synthetic-secret',fetcher:async()=>response});assert.ok([429,503].includes(result.status));assert.ok(!(await result.text()).includes('synthetic-secret'))}
 assert.equal((await searchPlaces(request(),{access,origin,apiKey:'synthetic-secret',fetcher})).status,200);
});
test('malformed GPS and ambiguous provider results are filtered rather than guessed',()=>{
 const candidates=parsePlaceResults({results:[...provider.results,...provider.results,{...provider.results[0],name:'另一合成市',lon:.5},{...provider.results[0],lat:91},{...provider.results[0],lon:'0'},{...provider.results[0],country_code:''}]});assert.equal(candidates.length,2);assert.equal(candidates[0].latitude,0);assert.equal(candidates[1].name,'另一合成市');assert.throws(()=>parsePlaceResults({}));
 assert.equal(parsePlaceResults({results:[{...provider.results[0],result_type:'city'}]})[0].precision,'area');
});
test('selection canonicalizes region/city, preserves date and note, never saves; administrative centroids are not precise points',()=>{
 const d={...blankPhotoDetails,date:'2026-01-02',note:'合成笔记'},geos={japan:[feature('架空県')],japanCities:[feature('架空市')],china:[],sichuan:[]},match=parsePlaceResults(provider)[0];
 const next=applySearchPlace(d,match,geos);assert.equal(next.prefecture,'架空県');assert.equal(next.city,'架空市');assert.equal(next.date,d.date);assert.equal(next.note,d.note);assert.equal(next.placeSource,'geoapify');assert.equal(d.country,'');
 assert.equal(applySearchPlace(d,{...match,precision:'area'},geos).latitude,null);
 const incomplete=photoSaveIntent(blankPhotoDetails);assert.equal(incomplete.confirmed,false);assert.equal(incomplete.error,'');assert.equal(photoSaveIntent({...next,longitude:null}).confirmed,false);assert.ok(photoSaveIntent({...next,date:'2026-02-30'}).error);
});
test('explicit Save-and-map creates one independent visit; drafts remain unmarked and source attribution survives reload/share/export',()=>{
 const j=emptyJournal(access.userId);j.photos.push({id:'synthetic-photo-01',owner:access.userId,sha:'a'.repeat(40),digest:'synthetic',created:'2026-01-01',checkin:null});
 const details={...blankPhotoDetails,country:'CN',prefecture:'合成省',city:'合成市',place:'合成地点',date:'2026-01-02',placeSource:'geoapify' as const};
 savePhotoDetails(j,access.userId,j.photos[0].id,{details:{...details,date:''},confirmed:photoSaveIntent({...details,date:''}).confirmed});assert.equal(j.checkins.length,0);
 for(let i=0;i<2;i++)savePhotoDetails(j,access.userId,j.photos[0].id,{details,confirmed:photoSaveIntent(details).confirmed});assert.equal(j.checkins.length,1);assert.equal(j.checkins[0].place_source,'geoapify');
 const restored=journalSchema.parse(JSON.parse(JSON.stringify(j)));assert.equal(restored.photos[0].details?.placeSource,'geoapify');restored.checkins[0].published=true;assert.equal(sharedJournal(restored).checkins[0].place_source,'geoapify');
 assert.match(buildPoster({scope:'china',features:[feature('合成省')],visits:restored.checkins,title:'合成旅行',format:'print'}),/地点：Geoapify/);
 savePhotoDetails(restored,access.userId,j.photos[0].id,{details:{...details,placeSource:undefined},confirmed:true});assert.equal(restored.checkins[0].place_source,undefined);
});
test('place-search budget is owner scoped and bounded over time',()=>{for(let i=0;i<30;i++)assert.equal(admitPlaceSearch('synthetic-rate-owner',1000),true);assert.equal(admitPlaceSearch('synthetic-rate-owner',1000),false);assert.equal(admitPlaceSearch('synthetic-second-owner',1000),true);assert.equal(admitPlaceSearch('synthetic-rate-owner',61001),true)});
