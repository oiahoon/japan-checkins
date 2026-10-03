/** In-memory, deduplicated reads of allowlisted public assets only. Never use for owner data. */
const publicPaths=['/china-admin.json','/restaurants.json','/japan-simple.json','/china-simple.json','/sichuan-cities.json','/chengdu-districts.json','/world-simple.json','/japan-cities.json','/place-index.json'] as const;
export type PublicJsonPath=typeof publicPaths[number];
export function createPublicJsonLoader(read:typeof fetch,timeoutMs=15000){
 const cache=new Map<PublicJsonPath,Promise<unknown>>();
 return function load<T>(path:PublicJsonPath):Promise<T>{
  if(!publicPaths.includes(path))return Promise.reject(new Error('仅允许读取公开地图资料'));
  const previous=cache.get(path);if(previous)return previous as Promise<T>;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const task=Promise.resolve().then(()=>read(path,{signal:controller.signal})).then(async response=>{
   if(!response.ok)throw new Error('资料读取失败');return response.json();
  }).finally(()=>clearTimeout(timer)).catch(error=>{if(cache.get(path)===task)cache.delete(path);throw error});
  cache.set(path,task);return task as Promise<T>;
 };
}
export const loadPublicJson=createPublicJsonLoader((...args)=>fetch(...args));
