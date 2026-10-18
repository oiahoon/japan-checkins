import {GitHubStore,GitHubError} from '../lib/github-store.ts';
import {decodeBase64} from '../lib/base64.ts';
import {journalSchema,assertOwner,photoParentRemoved,photoEntry,recordId,cameraMetadataSchema,photoProposalSchema,visitInput,appendVisit,setMarkers,markersInput,manageItems,InputError,type Journal} from '../lib/travel-data.ts';
import {savePhotoDetails,photoEditInput} from '../lib/photo-records.ts';
import {entryMutation,mutateEntry} from '../lib/journal-entries.ts';
import {journalProjection} from '../lib/journal-projection.ts';
import {sanitizeJPEG} from '../lib/photo.ts';
import {prefectureAt} from '../lib/photo-metadata.ts';
import {loadPublicJson} from '../lib/public-json.ts';
import type {JournalTransport} from '../app/journal-transport';
const json=(data:unknown,status=200)=>Response.json(data,{status});
export class BrowserJournal implements JournalTransport{
 private config:{repository:string;branch:string;token:string;ownerId:string};
 private abort=new AbortController();private closed=false;
 private read:typeof fetch;
 private images=new Map<string,Promise<Blob>>();private urls=new Map<string,Promise<string>>();
 constructor(repository:string,branch:string,token:string,read:typeof fetch=fetch){
  if(!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository)||!/^\w[\w-]*$/.test(branch)||repository.length>200||branch.length>100||!token.trim()||token.length>4096||/[\r\n]/.test(token))throw Error('请填写私有仓库和连接令牌');
  this.read=(input,init)=>read(input,init);this.config={repository,branch,token:token.trim(),ownerId:'journal-owner'};
 }
 private transport:typeof fetch=async(input,init)=>{
  if(this.closed)throw Error('已断开连接');
  const url=new URL(String(input));if(url.origin!=='https://api.github.com'||!url.pathname.startsWith('/repos/'+this.config.repository+'/')&&url.pathname!=='/repos/'+this.config.repository)throw Error('连接只能访问选定的 GitHub 仓库');
  return this.read(input,{...init,redirect:'error',credentials:'omit',signal:AbortSignal.any([this.abort.signal,...(init?.signal?[init.signal]:[])])});
 };
 private store(){return new GitHubStore(this.config,this.transport)}
 private async connectData(){
  const root='https://api.github.com/repos/'+this.config.repository,headers={Authorization:'Bearer '+this.config.token,Accept:'application/vnd.github+json'};
  const r=await this.transport(root,{headers,signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error('无法连接仓库，请检查令牌选中的仓库、有效期和权限');const meta=await r.json() as {private:boolean};if(meta.private!==true)throw Error('请选择 private 数据仓库，不能将照片保存在公开仓库');
  const index=await this.transport(root+'/contents/travel/index.json?ref='+encodeURIComponent(this.config.branch),{headers,signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(index.ok){const file=await index.json() as {encoding:string;size:number;content:string};if(file.encoding!=='base64'||file.size>512*1024)throw Error('日志索引过大或无效');const journal=journalSchema.parse(JSON.parse(new TextDecoder().decode(decodeBase64(file.content))));assertOwner(journal,journal.owner);this.config.ownerId=journal.owner;}
  else if(index.status!==404)throw Error('无法读取日志，请检查仓库和分支');
  await this.store().read(this.config.ownerId);
 }
 async connect(){try{await this.connectData()}catch(e){if(e instanceof TypeError||e instanceof Error&&['AbortError','TimeoutError'].includes(e.name))throw Error('暂时无法连接 GitHub，请检查网络后重试');if(e instanceof GitHubError)throw Error(e.status===404?'找不到数据分支，请先在私有仓库创建 README':e.status===403?'请检查令牌权限或 GitHub 请求额度':'私有仓库暂时无法读取，请重试');throw e}}
 disconnect=()=>{this.closed=true;this.abort.abort();this.config.token='';for(const p of this.urls.values())void p.then(url=>URL.revokeObjectURL(url)).catch(()=>{});this.urls.clear();this.images.clear();};
 photo=(src:string)=>{
  let pending=this.images.get(src);if(pending)return pending;
  const id=src.split('/').at(-1)!.split('?')[0];recordId.parse(id);
  pending=this.store().photo(id,this.config.ownerId).then(bytes=>{if(!bytes)throw Error('照片不存在');return new Blob([bytes],{type:'image/jpeg'})}).catch(e=>{this.images.delete(src);throw e});this.images.set(src,pending);return pending;
 };
 photoURL=(src:string)=>{let pending=this.urls.get(src);if(!pending){pending=this.photo(src).then(blob=>{if(this.closed)throw Error('已断开连接');return URL.createObjectURL(blob)}).catch(e=>{this.urls.delete(src);throw e});this.urls.set(src,pending)}return pending};
 request=async(url:string,init?:RequestInit):Promise<Response>=>{
  if(this.closed)return json({error:'请重新连接仓库'},401);
  const method=init?.method||'GET',path=url.split('?')[0],owner=this.config.ownerId,store=this.store();
  try{
   if(path==='/api/places')return json({enabled:false,results:[]});
   if(path==='/api/checkins'&&method==='GET')return json(journalProjection(await store.read(owner)));
   if(path==='/api/photos'&&method==='POST'){
    const headers=new Headers(init?.headers),id=recordId.parse(headers.get('X-Upload-Id'));
    const blob=init?.body;if(!(blob instanceof Blob)||blob.size>3*1024*1024)throw new InputError('请选择处理后不超过3MB的JPEG');
    const bytes=sanitizeJPEG(new Uint8Array(await blob.arrayBuffer())),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(n=>n.toString(16).padStart(2,'0')).join('');
    const rawCamera=headers.get('X-Photo-Metadata'),rawProposal=headers.get('X-Photo-Proposal');if((rawCamera?.length||0)>4096||(rawProposal?.length||0)>2048)throw new InputError('照片信息过长');
    const metadata=rawCamera?cameraMetadataSchema.parse(JSON.parse(decodeURIComponent(rawCamera))):undefined,proposal=rawProposal?photoProposalSchema.parse(JSON.parse(decodeURIComponent(rawProposal))):undefined;
    const current=await store.read(owner),previous=current.photos.find(p=>p.id===id);if(previous){if(previous.digest!==digest)throw new InputError('上传标识已用于另一张照片');return json({id},201)}
    if(current.photos.filter(p=>!p.removed&&p.checkin===null&&!photoEntry(p)).length>=30)throw new InputError('请先整理已有照片');
    const sha=await store.blob(bytes);await store.mutate(owner,j=>{const old=j.photos.find(p=>p.id===id);if(old){if(old.digest!==digest)throw new InputError('上传标识冲突');return {changed:false}}if(j.photos.filter(p=>!p.removed&&p.checkin===null&&!photoEntry(p)).length>=30)throw new InputError('请先整理已有照片');j.photos.push({id,owner,sha,digest,created:new Date().toISOString(),checkin:null,metadata,proposal});return {changed:true,files:[{path:`travel/photos/${id}.jpg`,mode:'100644',type:'blob',sha}]}});return json({id},201);
   }
   const id=path.startsWith('/api/photos/')?recordId.parse(path.split('/').at(-1)):undefined;
   if(id&&method==='GET')return new Response(await this.photo(path),{headers:{'Content-Type':'image/jpeg'}});
   if(id&&method==='DELETE'){await store.mutate(owner,j=>{const p=j.photos.find(p=>p.id===id);if(!p)return {changed:false};if(p.checkin!==null)throw new InputError('请使用照片回收站');j.photos=j.photos.filter(p=>p.id!==id);return {changed:true,files:[{path:`travel/photos/${id}.jpg`,mode:'100644',type:'blob',sha:null}]}});return new Response(null,{status:204});}
   const body=JSON.parse(String(init?.body||'{}'));
   if(id&&method==='PATCH'){
    if('details' in body){const input=photoEditInput.parse(body),d=input.details;
     if(input.confirmed&&d.latitude!==null&&d.longitude!==null&&['JP','CN'].includes(d.country)){
      const geo=await loadPublicJson<{features:Parameters<typeof prefectureAt>[2]}>(d.country==='JP'?'/japan-simple.json':'/china-simple.json');if(prefectureAt(d.latitude,d.longitude,geo.features)!==d.prefecture)throw new InputError('坐标与所属地区不一致');
      if(d.country==='CN'&&d.prefecture==='四川省'&&d.city){const sc=await loadPublicJson<{features:Parameters<typeof prefectureAt>[2]}>('/sichuan-cities.json');const city=prefectureAt(d.latitude,d.longitude,sc.features);if(city&&city!==d.city)throw new InputError('坐标与四川市州不一致');}
     }
     await store.mutate(owner,j=>({changed:savePhotoDetails(j,owner,id,input)}));
    }else{if(typeof body.removed!=='boolean')throw new InputError('照片操作无效');await store.mutate(owner,j=>({changed:manageItems(j,owner,'photos',[id],body.removed)}));}return json({saved:true});
   }
   if(path==='/api/entries'&&method==='POST'){const b=entryMutation.parse(body);await store.mutate(owner,j=>({changed:mutateEntry(j,owner,b)}));return json({saved:true})}
   if(path==='/api/manage'&&method==='POST'){if(!['records','photos'].includes(body.kind)||!Array.isArray(body.ids)||typeof body.removed!=='boolean')throw new InputError('管理操作无效');await store.mutate(owner,j=>({changed:manageItems(j,owner,body.kind,body.ids,body.removed)}));return json({saved:true})}
   if(path==='/api/checkins'&&method==='POST'){const b=visitInput.parse(body);await store.mutate(owner,j=>({changed:appendVisit(j,owner,b)}));return json({id:b.id,saved:true},201)}
   if(path==='/api/statuses'&&method==='POST'){const b=markersInput.parse(body);await store.mutate(owner,j=>{const before=JSON.stringify(j);setMarkers(j,owner,b.markers);return {changed:JSON.stringify(j)!==before}});return json({saved:true})}
   return json({error:'此操作需要进阶服务端版本'},400);
  }catch(e){return json({error:e instanceof GitHubError?(e.status===401?'连接已过期，请重新连接仓库':e.status===403?'没有写入权限或GitHub额度暂不可用':e.status===404?'仓库或分支不可访问，请检查设置':'GitHub暂不可用，请保留内容并重试'):e instanceof InputError?e.message:e instanceof Error&&/timeout|abort/i.test(e.name+' '+e.message)?'连接 GitHub 超时，请保留照片并重试':e instanceof TypeError?'网络连接失败，请保留照片并重试':'操作未完成，请检查输入、令牌权限或网络后重试'},e instanceof GitHubError?503:400)}
 };
}
