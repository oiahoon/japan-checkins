import {z} from 'zod';
import {prefectureAt} from './photo-metadata.ts';
import type {MapFeature} from './geography.ts';
import type {PhotoDetails} from './travel-data.ts';

export const placeQuery=z.object({query:z.string().trim().min(2).max(150)}).strict();
export const placeSuggestion=z.object({id:z.string().max(300),name:z.string().min(1).max(150),label:z.string().max(300),country:z.string().regex(/^[A-Z]{2}$/),prefecture:z.string().max(50),city:z.string().max(100),latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),precision:z.enum(['place','area']),source:z.literal('geoapify')}).strict();
export type PlaceSuggestion=z.infer<typeof placeSuggestion>;
const text=(value:unknown,limit:number)=>typeof value==='string'?value.trim().slice(0,limit):'';
// Project only useful address fields; never return provider URLs, keys or arbitrary HTML.
export function parsePlaceResults(value:unknown):PlaceSuggestion[]{
 const results=(value as {results?:unknown})?.results;if(!Array.isArray(results))throw Error('Invalid provider response');
 const unique=new Map<string,PlaceSuggestion>();
 for(const raw of results.slice(0,20)){
  if(!raw||typeof raw!=='object')continue;const p=raw as Record<string,unknown>;
  const name=text(p.name||p.address_line1||p.city||p.state||p.country,150),country=typeof p.country_code==='string'&&/^[a-z]{2}$/i.test(p.country_code)?p.country_code.toUpperCase():'';
  const id=`${country}:${p.lat}:${p.lon}:${name}`;
  const result=placeSuggestion.safeParse({id,name,label:text(p.formatted||p.address_line2,300),country,prefecture:text(p.state,50),city:text(p.city||p.town||p.village,100),latitude:p.lat,longitude:p.lon,precision:['amenity','building','street'].includes(String(p.result_type))?'place':'area',source:'geoapify'});
  if(result.success)unique.set(id,result.data);
 }
 return [...unique.values()].slice(0,6);
}
export type PlaceGeographies={japan:MapFeature[];china:MapFeature[];sichuan:MapFeature[];japanCities?:MapFeature[]};
export function applySearchPlace(details:PhotoDetails,match:PlaceSuggestion,geos:PlaceGeographies):PhotoDetails{
 const {latitude,longitude,country}=match;
 // Use the same WGS84 boundaries as server validation, rather than translated API state names.
 const features=country==='JP'?geos.japan:country==='CN'?geos.china:[];
 const prefecture=prefectureAt(latitude,longitude,features)||match.prefecture;
 const cities=country==='JP'?(geos.japanCities||[]).filter(f=>(f.properties as {prefecture?:string}).prefecture===prefecture):country==='CN'&&prefecture==='四川省'?geos.sichuan:[];
 const city=prefectureAt(latitude,longitude,cities)||match.city;
 // Administrative centroids are approximate. Only specific POIs receive precise map coordinates.
 return {...details,place:match.name,country,prefecture,city,district:'',latitude:match.precision==='place'?latitude:null,longitude:match.precision==='place'?longitude:null,placeSource:'geoapify'};
}
