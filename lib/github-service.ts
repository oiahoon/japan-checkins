import {z} from 'zod';
import {cameraMetadataSchema} from './travel-data.ts';
import {createHash} from 'node:crypto';
import {GitHubStore} from './github-store.ts';
import {sanitizeJPEG} from './photo.ts';
import {manageItems,appendVisit, setMarkers, recordId, visitInput, markersInput, InputError,sharedJournal} from './travel-data.ts';
const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
export async function boundedBytes(request:Request,limit:number) {
  if(Number(request.headers.get('content-length'))>limit)throw new InputError('上传内容过大');
  const reader=request.body?.getReader();if(!reader)throw new InputError('请求内容为空');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>limit){await reader.cancel();throw new InputError('上传内容过大');}chunks.push(chunk.value);}
  return Buffer.concat(chunks,size);
}
export type Action = 'list'|'save'|'markers'|'upload'|'photo'|'delete'|'publish'|'hide-photo'|'restore-photo'|'manage';
export async function journalAPI(context:{userId:string;origin:string;store:GitHubStore;readOnly?:boolean;sharedOnly?:boolean},request:Request|undefined,action:Action,id?:string) {
  const user={userId:context.userId};
  try {
    if(context.readOnly&&!['list','photo'].includes(action))return json({error:'只读访问不能修改记录'},403);
    const config={origin:context.origin};
    if(request&&['save','markers','upload','delete','publish','hide-photo','restore-photo','manage'].includes(action)&&request.headers.get('origin')!==config.origin)return json({error:'无效请求来源'},403);
    const store=context.store;
    if(action==='list') {
      const original=await store.read(user.userId);
      const data=context.sharedOnly?sharedJournal(original):original;
      return json({removedCheckins:context.readOnly?[]:data.checkins.filter(c=>c.removed),checkins:data.checkins.filter(c=>!c.removed).sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created)),statuses:data.statuses,removedPhotos:context.readOnly?[]:data.photos.filter(p=>p.removed).map(p=>({id:p.id,checkin:p.checkin})),photos:data.photos.filter(p=>!p.removed&&p.checkin!==null&&!data.checkins.some(c=>c.id===p.checkin&&c.removed)).map(p=>({id:p.id,checkin:p.checkin,...(!context.sharedOnly?{metadata:p.metadata}:{})})),drafts:context.readOnly?[]:data.photos.filter(p=>!p.removed&&p.checkin===null).map(p=>({id:p.id,metadata:p.metadata}))});
    }
    if(action==='photo'||action==='delete') {
      if(!recordId.safeParse(id).success)return json({error:'照片不存在'},404);
      if(action==='photo') {const photo=await store.photo(id!,user.userId,context.sharedOnly);return photo?new Response(photo,{headers:{...privateHeaders,'Content-Type':'image/jpeg','Content-Disposition':'inline'}}):json({error:'照片不存在'},404);}
      let blocked=false;
      await store.mutate(user.userId,j=>{const row=j.photos.find(p=>p.id===id&&p.owner===user.userId);if(!row)return {changed:false};if(row.checkin!==null){blocked=true;return {changed:false};}j.photos=j.photos.filter(p=>p.id!==id);return {changed:true,files:[{path:`travel/photos/${id}.jpg`,mode:'100644',type:'blob',sha:null}]};});
      return new Response(null,{status:blocked?409:204,headers:privateHeaders});
    }
    if(action==='manage'){let body;try{body=z.object({kind:z.enum(['records','photos']),ids:z.array(recordId).min(1).max(100),removed:z.boolean()}).strict().parse(JSON.parse((await boundedBytes(request!,20000)).toString('utf8')))}catch{return json({error:'请选择有效的项目，每次最多 100 项'},400)}await store.mutate(user.userId,j=>({changed:manageItems(j,user.userId,body.kind,body.ids,body.removed)}));return json({saved:true});}
    if(action==='hide-photo'||action==='restore-photo'){if(!recordId.safeParse(id).success)return json({error:'照片不存在'},404);await store.mutate(user.userId,j=>({changed:manageItems(j,user.userId,'photos',[id!],action==='hide-photo')}));return json({saved:true});}
    if(action==='upload') {
      const photoId=request!.headers.get('x-upload-id');
      let metadata;try{const raw=request!.headers.get('x-photo-metadata');if(raw&&raw.length>4096)throw Error();metadata=raw?cameraMetadataSchema.parse(JSON.parse(decodeURIComponent(raw))):undefined;}catch{return json({error:'相机信息无效'},400);}
      if(!recordId.safeParse(photoId).success)return json({error:'上传标识无效'},400);
      let bytes:Uint8Array;try{bytes=sanitizeJPEG(await boundedBytes(request!,3*1024*1024));}catch{return json({error:'请选择有效的 JPEG 照片，最多 3 MB'},400);}
      const digest=createHash('sha256').update(bytes).digest('hex');
      // Validate privacy and existing request before creating any photo object.
      const current=await store.read(user.userId);
      const previous=current.photos.find(p=>p.id===photoId&&p.owner===user.userId);
      if(previous){if(previous.digest!==digest)throw new InputError('上传标识已用于另一张照片');return json({id:photoId},201);}
      if(current.photos.filter(p=>!p.removed&&p.checkin===null).length>=30)throw new InputError('未完成照片过多，请先保存或移除');
      const sha=await store.blob(bytes);
      await store.mutate(user.userId,j=>{const existing=j.photos.find(p=>p.id===photoId&&p.owner===user.userId);if(existing){if(existing.digest!==digest)throw new InputError('上传标识已用于另一张照片');return {changed:false};}if(j.photos.filter(p=>!p.removed&&p.checkin===null).length>=30)throw new InputError('未完成照片过多');j.photos.push({id:photoId!,owner:user.userId,checkin:null,sha,digest,metadata,created:new Date().toISOString()});return {changed:true,files:[{path:`travel/photos/${photoId}.jpg`,mode:'100644',type:'blob',sha}]};});
      return json({id:photoId},201);
    }
    let body:unknown;try{body=JSON.parse((await boundedBytes(request!,20000)).toString('utf8'));}catch{return json({error:'请求内容无效或过长'},400);}
    if(action==='publish'){
      const b=body as {id?:unknown;published?:unknown};
      if(!b||!recordId.safeParse(b.id).success||typeof b.published!=='boolean')return json({error:'公开设置无效'},400);
      const published=b.published;let found=false;await store.mutate(user.userId,j=>{const visit=j.checkins.find(v=>v.id===b.id&&v.owner===user.userId&&!v.removed);if(!visit)return {changed:false};found=true;if(visit.published===published)return {changed:false};visit.published=published;return {changed:true};});
      return found?json({saved:true}):json({error:'记录不存在'},404);
    }
    if(action==='save') {
      let b;try{b=visitInput.parse(body);}catch{return json({error:'请检查地点、日期并确认有效地图坐标'},400);}
      await store.mutate(user.userId,j=>({changed:appendVisit(j,user.userId,b)}));
      return json({id:b.id,saved:true},201);
    }
    const b=markersInput.safeParse(body);if(!b.success)return json({error:'标记无效'},400);
    await store.mutate(user.userId,j=>{setMarkers(j,user.userId,b.data.markers);return {changed:true};});return json({saved:true});
  } catch(e) {
    if(e instanceof InputError)return json({error:e.message},400);
    return json({error:'私有仓库暂时无法访问或保存，请保留内容后重试；检查仓库权限与部署配置'},503);
  }
}
