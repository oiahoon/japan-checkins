import {isPhotoSource,readPhotoVariant} from './photo-source.ts';
/** Browser-only reader. External delivery is a short-lived capability, never persisted. */
export function createPhotoDeliveryReader(read:typeof fetch=fetch,options:{headerMs?:number;idleMs?:number}={}){
 let failures=0,until=0;
 return async(src:string,signal:AbortSignal)=>{
  if(!isPhotoSource(src))throw Error('Invalid photo source');
  const budget=AbortSignal.any([signal,AbortSignal.timeout(readPhotoVariant(src)==='thumbnail'?30000:90000)]);
  const local=(delivery:string)=>{const url=new URL(src,'https://journal.invalid');url.searchParams.set('delivery',delivery);return url.pathname+url.search};
  const git=async(warm=false)=>{const url=new URL(local('git'),'https://journal.invalid');if(warm)url.searchParams.set('warm','1');const r=await read(url.pathname+url.search,{signal:budget,credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('照片读取失败');return r.blob()};
  if(until>Date.now())return git(true);
  const response=await read(local('auto'),{signal:budget,credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('照片读取失败');
  if(!response.headers.get('content-type')?.includes('application/json'))return response.blob();
  try{
   const data=await response.json() as {delivery?:string;url?:string;expiresAt?:number};const u=new URL(data.url||'');
   if(data.delivery!=='imagekit'||u.protocol!=='https:'||u.hostname!=='ik.imagekit.io'||u.port||u.username||u.password||!/^\/[A-Za-z0-9_-]+\/travel-journal\/[a-f0-9]{32}\/[a-f0-9]{64}\.jpg$/.test(u.pathname)||!u.searchParams.has('ik-s')||!u.searchParams.has('ik-t')||!data.expiresAt||data.expiresAt*1000<=Date.now()||data.expiresAt*1000>Date.now()+90000)throw Error('Invalid photo ticket');
   const deadline=new AbortController();let timer=setTimeout(()=>deadline.abort(),options.headerMs??2500);
   try{const image=await read(u.href,{signal:AbortSignal.any([budget,deadline.signal]),credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store'});clearTimeout(timer);if(!image.ok||!image.headers.get('content-type')?.startsWith('image/jpeg')||!image.body)throw Error('Accelerator unavailable');
    const reader=image.body.getReader(),chunks:Uint8Array[]= [];let size=0;
    try{while(true){timer=setTimeout(()=>deadline.abort(),options.idleMs??12000);const chunk=await reader.read();clearTimeout(timer);if(chunk.done)break;size+=chunk.value.length;if(size>3*1024*1024)throw Error('Invalid image');chunks.push(chunk.value)}if(!size)throw Error('Invalid image');failures=0;return new Blob(chunks as BlobPart[],{type:'image/jpeg'})}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}}finally{clearTimeout(timer)}
  }catch{
   if(budget.aborted)throw new DOMException('Photo read cancelled','AbortError');if(++failures>=3){until=Date.now()+30000;failures=0}return git(true);
  }
 };
}
