import {PhotoLoader} from './photo-loader.ts';
import {onPhotoActivity} from './photo-activity.ts';
import {publicAsset} from './public-asset.ts';
import catalog from './japan-city-catalog.json' with {type:'json'};
import type {MapFeature} from './geography.ts';
const codes=new Set(catalog.prefectures.map(p=>p.code));
const chinaCodes=new Set('11 12 13 14 15 21 22 23 31 32 33 34 35 36 37 41 42 43 44 45 46 50 51 52 53 54 61 62 63 64 65 71 81 82'.split(' '));
export function boundaryPathAllowed(path:string){const jp=/^\/japan-cities\/(\d{2})\.json$/.exec(path);if(jp)return codes.has(jp[1]);const cn=/^\/china-(?:cities|districts)\/(\d{2})\.json$/.exec(path);return !!cn&&chinaCodes.has(cn[1])}
/** Separate public cache, one low-priority transfer, suspended by any private photo read. */
export function createBoundaryLoader(read:typeof fetch){
 const parsed=new Map<string,MapFeature[]>();
 const queue=new PhotoLoader(async(path,signal)=>{
  const r=await read(path,{signal:AbortSignal.any([signal,AbortSignal.timeout(60000)]),priority:'low'});if(!r.ok)throw Error('地区边界读取失败');
  const text=await r.text();if(text.length>8*1024*1024)throw Error('地区边界过大');
  const value=JSON.parse(text) as {type:string;features:MapFeature[]};
  if(value.type!=='FeatureCollection'||!Array.isArray(value.features)||path.startsWith('/japan-cities/')&&!value.features.length||value.features.some(f=>!f.properties||typeof f.properties.id!=='number'||typeof f.properties.name!=='string'||!Array.isArray(f.geometry?.coordinates)))throw Error('地区边界无效');
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');parsed.set(path,value.features);return new Blob([text],{type:'application/json'});
 },{photographic:false,passiveLimit:1});
 const off=onPhotoActivity(busy=>queue.setSuspended(busy));
 return {async load(path:string,signal?:AbortSignal){if(!boundaryPathAllowed(path))throw Error('不允许的地区边界');await queue.blob(path,{signal,priority:'background'});return parsed.get(path)!},close(){off();queue.close();parsed.clear()}};
}
let shared:ReturnType<typeof createBoundaryLoader>|undefined;
export function loadBoundary(path:string,signal?:AbortSignal){if(typeof window==='undefined')throw Error('Browser boundary reader only');return (shared??=createBoundaryLoader((path,init)=>fetch(publicAsset(String(path)),init))).load(path,signal)}
