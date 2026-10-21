import {createHmac,randomUUID} from 'node:crypto';
import {sanitizeJPEG} from './photo.ts';
import type {PhotoVariant} from './photo-source.ts';
export type ImageKitConfig={endpoint:string;privateKey:string;namespace:string};
export type PhotoMirror={id:string;sha:string;variant:PhotoVariant};
export type PhotoTicket={delivery:'imagekit';url:string;expiresAt:number};
/** Server-only opt-in. Incomplete/invalid optional configuration must leave Git usable. */
export function imageKitConfig(env:Record<string,string|undefined>=process.env):ImageKitConfig|null{
 if(!env.PHOTO_DELIVERY||env.PHOTO_DELIVERY==='git')return null;
 if(env.PHOTO_DELIVERY!=='imagekit'||env.IMAGEKIT_PRIVATE_DELIVERY_CONFIRMED!=='true')throw Error('ImageKit protection not confirmed');
 const endpoint=(env.IMAGEKIT_URL_ENDPOINT||'').replace(/\/$/,'');
 if(!/^https:\/\/ik\.imagekit\.io\/[A-Za-z0-9_-]{1,100}$/.test(endpoint))throw Error('Use the standard ImageKit URL endpoint');
 const privateKey=env.IMAGEKIT_PRIVATE_KEY||'';if(!/^private_[A-Za-z0-9+/=_-]{16,500}$/.test(privateKey))throw Error('Invalid ImageKit key');
 if(!env.GITHUB_DATA_REPOSITORY||!env.JOURNAL_OWNER_ID)throw Error('Missing mirror scope');
 const namespace=createHmac('sha256',privateKey).update(JSON.stringify([env.GITHUB_DATA_REPOSITORY.toLowerCase(),env.GITHUB_DATA_BRANCH||'main',env.JOURNAL_OWNER_ID])).digest('hex').slice(0,32);
 return {endpoint,privateKey,namespace};
}
/** Matches ImageKit's official SDK: relative URL (including query) + expiry. */
export function signImageKitURL(config:Pick<ImageKitConfig,'endpoint'|'privateKey'>,path:string,expiresAt:number){
 if(!/^\/[A-Za-z0-9/_-]+\.jpg$/.test(path)||!Number.isSafeInteger(expiresAt)||expiresAt<=0)throw Error('Invalid signed photo path');
 const relative=path.slice(1)+'?tr=orig-true',url=config.endpoint+'/'+relative;
 const signature=createHmac('sha1',config.privateKey).update(relative+expiresAt).digest('hex');
 return url+'&ik-t='+expiresAt+'&ik-s='+signature;
}
export class ImageKitDelivery{
 private config:ImageKitConfig;private read:typeof fetch;private now:()=>number;
 private protection:Promise<boolean>|undefined;private verifiedUntil=0;private failedUntil=0;
 private pending=new Map<string,Promise<void>>();private completed=new Set<string>();
 constructor(config:ImageKitConfig,read:typeof fetch=fetch,now=()=>Date.now()){this.config=config;this.read=read;this.now=now}
 private remember(path:string){this.completed.add(path);if(this.completed.size>256)this.completed.delete(this.completed.values().next().value!)}
 path(ref:PhotoMirror){if(!/^[\w-]{8,100}$/.test(ref.id)||!/^[a-f0-9]{40}$/.test(ref.sha)||!['original','thumbnail'].includes(ref.variant))throw Error('Invalid mirror reference');const key=createHmac('sha256',this.config.privateKey).update(JSON.stringify([ref.id,ref.sha,ref.variant])).digest('hex');return '/travel-journal/'+this.config.namespace+'/'+key+'.jpg'}
 ticket(ref:PhotoMirror):PhotoTicket|null{if(this.verifiedUntil<=this.now()||this.failedUntil>this.now())return null;const expiresAt=Math.floor(this.now()/1000)+60;return {delivery:'imagekit',url:signImageKitURL(this.config,this.path(ref),expiresAt),expiresAt}}
 private async request(url:string,init:RequestInit={}){return this.read(url,{...init,cache:'no-store',redirect:'error',signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(8000)])})}
 private async upload(path:string,bytes:Uint8Array,privateFile=true){
  const form=new FormData();form.set('file',new Blob([new Uint8Array(bytes)],{type:'image/jpeg'}),'image.jpg');form.set('fileName',path.split('/').at(-1)!);form.set('folder',path.slice(0,path.lastIndexOf('/')));form.set('useUniqueFileName','false');form.set('overwriteFile','true');form.set('isPrivateFile',String(privateFile));form.set('responseFields','isPrivateFile');
  const response=await this.request('https://upload.imagekit.io/api/v1/files/upload',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(this.config.privateKey+':').toString('base64')},body:form});
  if(!response.ok)throw Error('ImageKit upload failed');const value=await response.json() as {fileId?:string;filePath?:string;isPrivateFile?:boolean};
  if(!value.fileId||!/^[A-Za-z0-9_-]{1,150}$/.test(value.fileId)||value.filePath!==path||privateFile&&value.isPrivateFile!==true)throw Error('Invalid private upload response');return value.fileId;
 }
 /** Only synthetic, non-personal pixels are used to verify unsigned access is denied. */
 async verify(){
  if(this.verifiedUntil>this.now())return true;if(this.failedUntil>this.now())return false;if(this.protection)return this.protection;
  const task=this.verifyProtection().then(ok=>{if(ok)this.verifiedUntil=this.now()+300000;else this.failedUntil=this.now()+30000;return ok}).catch(()=>{this.failedUntil=this.now()+30000;return false}).finally(()=>{this.protection=undefined});this.protection=task;return task;
 }
 private async verifyProtection(){
  const {default:sharp}=await import('sharp');const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#e0e0e0'}}).jpeg().toBuffer();
  const path='/travel-journal/'+this.config.namespace+'/probe-'+randomUUID()+'.jpg';let fileId:string|undefined;
  try{
   // This intentionally public *synthetic* canary checks global enforcement, not only a private original.
   fileId=await this.upload(path,bytes,false);
   for(const query of ['', '?tr=w-4']){const r=await this.request(this.config.endpoint+path+query);await r.body?.cancel();if(![401,403].includes(r.status))return false}
   const signed=await this.request(signImageKitURL(this.config,path,Math.floor(this.now()/1000)+60));const delivered=new Uint8Array(await signed.arrayBuffer());return signed.ok&&Buffer.from(delivered).equals(bytes);
  }finally{if(fileId){try{const r=await this.request('https://api.imagekit.io/v1/files/'+fileId,{method:'DELETE',headers:{Authorization:'Basic '+Buffer.from(this.config.privateKey+':').toString('base64')}});await r.body?.cancel()}catch{/* Synthetic canary may need manual cleanup; never log credentials/URLs. */}}}
 }
 /** Background best effort; Git is already saved and is never modified here. */
 async mirror(ref:PhotoMirror,load:()=>Promise<Uint8Array|null>,refresh=false){
  const path=this.path(ref);if(refresh)this.completed.delete(path);if(this.failedUntil>this.now())return;const existing=this.pending.get(path);if(existing)return existing;if(this.pending.size>=4)return;
  const task=(async()=>{if(!await this.verify()||this.completed.has(path))return;const existing=await this.request(signImageKitURL(this.config,path,Math.floor(this.now()/1000)+60),{method:'HEAD'});await existing.body?.cancel();if(existing.ok){this.remember(path);return;}if(existing.status!==404)throw Error('Mirror unavailable');const bytes=await load();if(!bytes)return;await this.upload(path,sanitizeJPEG(bytes));this.remember(path);})().catch(()=>{this.failedUntil=this.now()+30000}).finally(()=>this.pending.delete(path));this.pending.set(path,task);return task;
 }
}
let shared:ImageKitDelivery|undefined,identity='';
export function configuredImageKit(){try{const config=imageKitConfig();if(!config)return null;const key=JSON.stringify(config);if(identity!==key){shared=new ImageKitDelivery(config);identity=key}return shared!}catch{return null}}
