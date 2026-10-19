import {publicAsset} from './public-asset.ts';
import {PhotoLoader} from './photo-loader.ts';
import {onPhotoActivity} from './photo-activity.ts';
/** In-memory, deduplicated reads of allowlisted public assets only. Never use for owner data. */
const publicPaths=['/china-admin.json','/restaurants.json','/japan-simple.json','/china-simple.json','/sichuan-cities.json','/chengdu-districts.json','/world-simple.json','/place-index.json'] as const;
export type PublicJsonPath=typeof publicPaths[number];
// Directory transfers share mobile bandwidth with photos; keep a bounded slow-network budget.
export function createPublicJsonLoader(read:typeof fetch,timeoutMs=45000){
 const cache=new Map<PublicJsonPath,Promise<unknown>>(),parsed=new Map<string,unknown>();
 const queue=new PhotoLoader(async(path,signal)=>{
  const deadline=new AbortController(),timer=setTimeout(()=>deadline.abort(),timeoutMs);
  try{const response=await read(path,{signal:AbortSignal.any([signal,deadline.signal]),priority:'low'});
   if(!response.ok)throw Error('资料读取失败');const value=await response.json();
   if(signal.aborted)throw new DOMException('Cancelled','AbortError');parsed.set(path,value);return new Blob([]);
  }finally{clearTimeout(timer)}
 },{photographic:false,passiveLimit:2});
 const off=onPhotoActivity(busy=>queue.setSuspended(busy));
 function load<T>(path:PublicJsonPath):Promise<T>{
  if(!publicPaths.includes(path))return Promise.reject(new Error('仅允许读取公开地图资料'));
  const previous=cache.get(path);if(previous)return previous as Promise<T>;
  const task=queue.blob(path,{priority:'background'}).then(()=>parsed.get(path)).catch(error=>{if(cache.get(path)===task)cache.delete(path);throw error});
  cache.set(path,task);return task as Promise<T>;
 }
 load.close=()=>{off();queue.close();cache.clear();parsed.clear()};return load;
}
export const loadPublicJson=createPublicJsonLoader((path,init)=>fetch(publicAsset(String(path)),init));
