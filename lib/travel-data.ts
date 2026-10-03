import {z} from 'zod';
import {statusPrefix} from './geography.ts';
import {confirmedLocation, validDate} from './photo-metadata.ts';
export const recordId = z.string().regex(/^[a-zA-Z0-9-]{10,60}$/);
const depth = z.number().int().min(0).max(5);
const short = (n: number) => z.string().trim().min(1).max(n);
const marker = z.object({scope:z.enum(['prefecture','city','place']),label:short(250),depth,eaten:z.boolean()});
export const markersInput = z.object({markers:z.array(marker).min(1).max(3)});
export const visitInput = z.object({
  country:z.string().regex(/^[A-Z]{2,3}$/).default('JP'),id:recordId,prefecture:short(50),city:z.string().trim().max(100),district:z.string().trim().max(100).default(''),place:short(150),placeKey:short(250),
  kind:z.enum(['restaurant','place']),date:z.string().refine(validDate),note:z.string().max(1000),
  depth,prefDepth:depth,cityDepth:depth,eaten:z.boolean(),photos:z.array(recordId).max(6).refine(a=>new Set(a).size===a.length),
  published:z.boolean().default(false),
  location:z.unknown(),
}).transform(b=>({...b,location:confirmedLocation(b.location,b.country)}));
const storedVisit = z.object({removed:z.boolean().optional(),country:z.string().regex(/^[A-Z]{2,3}$/).default('JP'),published:z.boolean().default(false),pref_depth:depth.default(0),city_depth:depth.default(0),id:recordId,owner:z.string(),prefecture:z.string(),city:z.string(),district:z.string().default(''),place:z.string(),place_key:z.string(),kind:z.string(),date:z.string(),note:z.string(),depth,eaten:z.number().int().min(0).max(1),created:z.string(),latitude:z.number().nullable(),longitude:z.number().nullable(),location_source:z.string().nullable()});
const storedStatus = z.object({owner:z.string(),scope:z.enum(['prefecture','city','place']),label:z.string(),depth,eaten:z.number().int().min(0).max(1)});
export const cameraMetadataSchema=z.object({make:z.string().max(120).optional(),model:z.string().max(120).optional(),lens:z.string().max(120).optional(),aperture:z.number().positive().finite().optional(),exposureSeconds:z.number().positive().finite().optional(),iso:z.number().positive().finite().optional(),focalLength:z.number().positive().finite().optional()}).strict();
export const photoProposalSchema=z.object({date:z.string().refine(validDate).optional(),gps:z.object({latitude:z.number().min(-90).max(90).finite(),longitude:z.number().min(-180).max(180).finite()}).strict().optional()}).strict();
export const photoDetailsSchema=z.object({country:z.string().regex(/^[A-Z]{2,3}$/).or(z.literal('')),prefecture:z.string().trim().max(50),city:z.string().trim().max(100),place:z.string().trim().max(150),date:z.string().refine(v=>!v||validDate(v)),note:z.string().max(1000),latitude:z.number().min(-90).max(90).finite().nullable(),longitude:z.number().min(-180).max(180).finite().nullable()}).strict();
export type PhotoDetails=z.infer<typeof photoDetailsSchema>;
export type PhotoProposal=z.infer<typeof photoProposalSchema>;
const storedPhoto = z.object({details:photoDetailsSchema.optional(),proposal:photoProposalSchema.optional(),removed:z.boolean().optional(),id:recordId,owner:z.string(),checkin:recordId.nullable(),sha:z.string().regex(/^[a-f0-9]{40}$/),digest:z.string(),metadata:cameraMetadataSchema.optional(),created:z.string()});
export const journalSchema = z.object({version:z.literal(1),owner:z.string(),checkins:z.array(storedVisit),statuses:z.array(storedStatus),photos:z.array(storedPhoto)});
export type Journal = z.infer<typeof journalSchema>;
export function emptyJournal(owner: string):Journal {return {version:1,owner,checkins:[],statuses:[],photos:[]};}
export function assertOwner(journal: Journal, owner: string) {
  if (journal.owner !== owner || [...journal.checkins,...journal.statuses,...journal.photos].some(row=>row.owner!==owner)) throw new Error('Journal owner mismatch');
}
export class InputError extends Error {}
export function setMarkers(journal:Journal,owner:string,markers:z.infer<typeof marker>[]) {
  assertOwner(journal,owner);
  for (const m of markers) {
    const next = {owner,scope:m.scope,label:m.label,depth:m.depth,eaten:m.eaten?1:0};
    const i = journal.statuses.findIndex(s=>s.owner===owner&&s.scope===m.scope&&s.label===m.label);
    if(i<0)journal.statuses.push(next);else journal.statuses[i]=next;
  }
}
export function appendVisit(journal:Journal,owner:string,b:z.infer<typeof visitInput>) {
  assertOwner(journal,owner);
  if(journal.checkins.some(c=>c.id===b.id&&c.owner===owner))return false;
  for(const id of b.photos)if(!journal.photos.some(p=>p.id===id&&p.owner===owner&&!p.removed&&p.checkin===null))throw new InputError('照片不存在或已使用');
  journal.checkins.push({country:b.country,published:b.published,pref_depth:b.prefDepth,city_depth:b.cityDepth,id:b.id,owner,prefecture:b.prefecture,city:b.city,district:b.district,place:b.place,place_key:b.placeKey,kind:b.kind,date:b.date,note:b.note,depth:b.depth,eaten:b.eaten?1:0,created:new Date().toISOString(),latitude:b.location?.latitude??null,longitude:b.location?.longitude??null,location_source:b.location?.source??null});
  setMarkers(journal,owner,[{scope:'prefecture',label:statusPrefix(b.country,b.prefecture),depth:b.prefDepth,eaten:false},...(b.city?[{scope:'city' as const,label:statusPrefix(b.country,b.prefecture)+' / '+b.city,depth:b.cityDepth,eaten:false}]:[]),{scope:'place',label:b.placeKey,depth:b.depth,eaten:b.eaten}]);
  for(const p of journal.photos)if(b.photos.includes(p.id))p.checkin=b.id;
  return true;
}

export function sharedJournal(journal:Journal):Journal{
  const checkins=journal.checkins.filter(v=>v.published&&!v.removed),ids=new Set(checkins.map(v=>v.id));
  const shared:Journal={version:1,owner:journal.owner,checkins,statuses:[],photos:journal.photos.filter(p=>!p.removed&&p.checkin!==null&&ids.has(p.checkin))};
  // Only explicit status choices saved with published visits; never expose private aggregates.
  for(const v of [...checkins].sort((a,b)=>a.created.localeCompare(b.created)))setMarkers(shared,journal.owner,[{scope:'prefecture',label:statusPrefix(v.country,v.prefecture),depth:v.pref_depth,eaten:false},...(v.city?[{scope:'city' as const,label:statusPrefix(v.country,v.prefecture)+' / '+v.city,depth:v.city_depth,eaten:false}]:[]),{scope:'place',label:v.place_key,depth:v.depth,eaten:!!v.eaten}]);
  return shared;
}

export function setPhotoRemoved(journal:Journal,owner:string,id:string,removed:boolean){return manageItems(journal,owner,'photos',[id],removed)}

export function manageItems(journal:Journal,owner:string,kind:'records'|'photos',ids:string[],removed:boolean){
 assertOwner(journal,owner);const unique=[...new Set(ids)];if(!unique.length||unique.length>100)throw new InputError('每次请选择 1–100 项');
 const rows=unique.map(id=>{const row=(kind==='records'?journal.checkins:journal.photos).find(r=>r.id===id&&r.owner===owner);if(!row)throw new InputError('部分项目不存在，请刷新后重试');if(kind==='photos'&&!removed){const photo=journal.photos.find(p=>p.id===id)!;if(journal.checkins.some(c=>c.id===photo.checkin&&c.removed))throw new InputError('请先恢复照片所属的到访记录');}return row});
 let changed=false;for(const row of rows)if(Boolean(row.removed)!==removed){row.removed=removed;changed=true}return changed;
}
