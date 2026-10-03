import {z} from 'zod';
import {recordId,assertOwner,InputError,photoEntry,photoParentRemoved,type Journal} from './travel-data.ts';
export {photoEntry} from './travel-data.ts';
export type {JournalEntry} from './travel-data.ts';
import {validDate} from './photo-metadata.ts';
export const entryMutation=z.discriminatedUnion('op',[
 z.object({op:z.literal('save'),id:recordId,type:z.enum(['trip','text']),title:z.string().trim().min(1).max(150),date:z.string().refine(v=>!v||validDate(v)),note:z.string().max(1000),photos:z.array(recordId).max(100)}).strict(),
 z.object({op:z.enum(['attach','detach']),id:recordId,photos:z.array(recordId).min(1).max(100)}).strict()
]);
export function mutateEntry(j:Journal,owner:string,b:z.infer<typeof entryMutation>){
 assertOwner(j,owner);const ids=[...new Set(b.photos)];if(ids.length!==b.photos.length)throw new InputError('照片不能重复选择');
 const entry=j.entries.find(e=>e.id===b.id),legacy=j.checkins.find(e=>e.id===b.id),target=entry||legacy;
 if((b.op!=='save'&&!target)||target?.removed)throw new InputError('记录不存在或已移除');
 if(b.op==='save'&&(legacy||j.photos.some(p=>p.id===b.id)))throw new InputError('旧记录请从记录内管理照片');
 if(b.op==='save'&&b.type==='text'&&(ids.length||!b.note.trim()))throw new InputError('文字记录需要笔记，不能添加照片');
 if(b.op==='attach'&&entry?.type==='text')throw new InputError('请把照片加入旅行记录');
 const selected=ids.map(id=>{const p=j.photos.find(p=>p.id===id&&!p.removed);if(!p||photoParentRemoved(j,p))throw new InputError('部分照片不可用，请刷新后重试');const linked=photoEntry(p);if(linked!==null&&linked!==b.id)throw new InputError(b.op==='detach'?'照片已不在这条记录中':'部分照片已加入其他记录，请先移除关联');return p});
 const count=j.photos.filter(p=>photoEntry(p)===b.id&&!p.removed).length+selected.filter(p=>photoEntry(p)!==b.id).length;
 if(b.op!=='detach'&&count>100)throw new InputError('每条旅行记录最多 100 张照片');
 const before=JSON.stringify(j);
 if(b.op==='save'){
  if(entry){if(entry.type!==b.type&&j.photos.some(p=>photoEntry(p)===entry.id))throw new InputError('请先移除照片再改为文字记录');Object.assign(entry,{type:b.type,title:b.title,date:b.date,note:b.note})}
  else j.entries.push({id:b.id,owner,type:b.type,title:b.title,date:b.date,note:b.note,created:new Date().toISOString()});
 }
 for(const p of selected){if(b.op==='detach'&&photoEntry(p)===null)continue;p.entry=b.op==='detach'?null:b.id;const visit=j.checkins.find(c=>c.id===p.checkin);if(visit)visit.published=false}
 if(legacy)legacy.published=false;
 return JSON.stringify(j)!==before;
}
