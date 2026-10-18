import {readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {z} from 'zod';
import {inspectPhoto,MAX_SOURCE_BYTES} from './photo-import.ts';
import {prefectureAt} from './photo-metadata.ts';
import {sanitizeJPEG} from './photo.ts';
import {journalSchema,emptyJournal,assertOwner,photoDetailsSchema,recordId,manageItems,type Journal} from './travel-data.ts';
import {blankPhotoDetails,savePhotoDetails} from './photo-records.ts';
import {entryMutation,mutateEntry} from './journal-entries.ts';

const filePath=z.string().min(7).max(250).refine(v=>v.startsWith('inbox/')&&!v.includes('\\')&&!v.split('/').some(p=>!p||p==='.'||p==='..'));
export const importManifest=z.object({
 owner:z.string().min(1).max(100).default('journal-owner'),
 photos:z.array(z.object({file:filePath,details:photoDetailsSchema.default(blankPhotoDetails),confirmed:z.boolean().default(false),removed:z.boolean().optional()}).strict()).max(1000).default([]),
 entries:z.array(z.object({id:recordId,type:z.enum(['trip','text']),title:z.string().max(150),date:z.string(),note:z.string().max(1000),photos:z.array(filePath).max(100),removed:z.boolean().optional()}).strict()).max(1000).default([]),
}).strict();
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const gitBlob=(bytes:Uint8Array)=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
async function inside(root:string,path:string){
 const full=resolve(root,path);if(!full.startsWith(root+'/'))throw Error('Invalid data path');
 let current=root;for(const part of relative(root,full).split('/')){current=join(current,part);try{if((await lstat(current)).isSymbolicLink())throw Error('Symlinks are not supported')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}}
 return full;
}
async function readOptional(root:string,path:string){try{const full=await inside(root,path);if((await lstat(full)).size>512*1024)throw Error('Data file too large');return await readFile(full,'utf8')}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e}}
async function inbox(root:string){const files:string[]=[];async function walk(path:string){let entries;try{entries=await readdir(await inside(root,path),{withFileTypes:true})}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e}for(const entry of entries){if(entry.isSymbolicLink())throw Error('Symlinks are not supported');const child=path+'/'+entry.name;if(entry.isDirectory())await walk(child);else if(/\.(jpe?g|png|webp|avif|tiff?|heic|heif|dng|nef|cr2|arw|pef|raw)$/i.test(entry.name))files.push(child);if(files.length>1000)throw Error('Inbox file limit reached')}}await walk('inbox');return files.sort()}

/** Prepare the whole batch before writing anything. No EXIF proposal creates a visit. */
export async function planGitImport(directory:string,geographyDirectory:string){
 const root=await realpath(directory),rawManifest=await readOptional(root,'travel/import.json'),manifest=importManifest.parse(rawManifest?JSON.parse(rawManifest):{});
 if(new Set(manifest.photos.map(p=>p.file)).size!==manifest.photos.length||new Set(manifest.entries.map(e=>e.id)).size!==manifest.entries.length)throw Error('Duplicate manifest item');
 const original=await readOptional(root,'travel/index.json');const journal:Journal=original?journalSchema.parse(JSON.parse(original)):emptyJournal(manifest.owner);if(original&&!rawManifest)manifest.owner=journal.owner;assertOwner(journal,manifest.owner);
 const rawState=await readOptional(root,'travel/import-state.json'),state=z.object({photos:z.record(z.string()),entries:z.record(z.string())}).strict().parse(rawState?JSON.parse(rawState):{photos:{},entries:{}});
 const files=await inbox(root);for(const file of files)if(!manifest.photos.some(p=>p.file===file))manifest.photos.push({file,details:{...blankPhotoDetails},confirmed:false});
 if(manifest.photos.length>1000)throw Error('Manifest file limit reached');
 const writes=new Map<string,Uint8Array>(),ids=new Map<string,string>(),review:{file:string;id:string;proposal:unknown;metadata:unknown}[]=[];let added=0,total=0;
 for(const item of manifest.photos){
  const path=await inside(root,item.file);let stat;try{stat=await lstat(path)}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e}
  if(!stat.isFile()||stat.size>MAX_SOURCE_BYTES)throw Error('Unsupported source size');total+=stat.size;if(total>500*1024*1024)throw Error('Batch source budget exceeded');
  const bytes=await readFile(path),id='git-'+digest(bytes).slice(0,48);ids.set(item.file,id);let photo=journal.photos.find(p=>p.id===id);
  if(!photo){
   if(++added>30)throw Error('Import at most 30 new photos per run');
   const meta=await inspectPhoto(new Blob([bytes]));let jpeg:Uint8Array;
   try{jpeg=sanitizeJPEG(await sharp(bytes,{limitInputPixels:80000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:82}).toBuffer())}catch{throw Error('Photo conversion failed; export a JPEG retaining EXIF and retry')}
   if(jpeg.length>3*1024*1024)throw Error('Converted JPEG too large');
   photo={id,owner:manifest.owner,sha:gitBlob(jpeg),digest:digest(jpeg),checkin:null,created:new Date().toISOString(),metadata:meta.camera,proposal:{date:meta.date,dateSource:meta.dateSource,dateStatus:meta.dateStatus,gps:meta.gps}};journal.photos.push(photo);writes.set('travel/photos/'+id+'.jpg',jpeg);
  }
  review.push({file:item.file,id,proposal:photo.proposal||{},metadata:photo.metadata||{}});
  const signature=digest(Buffer.from(JSON.stringify(item))),changed=state.photos[id]!==signature,customized=item.confirmed||Object.values(item.details).some(v=>v!==''&&v!==null&&v!==undefined);
  if(changed&&item.removed!==undefined&&item.removed!==!!photo.removed)manageItems(journal,manifest.owner,'photos',[id],item.removed);
  if(changed&&customized&&!photo.removed){
   const d=item.details;
   if(item.confirmed&&d.latitude!==null&&d.longitude!==null&&['JP','CN'].includes(d.country)){
    const geo=JSON.parse(await readFile(resolve(geographyDirectory,d.country==='JP'?'japan-simple.json':'china-simple.json'),'utf8'));
    if(prefectureAt(d.latitude,d.longitude,geo.features)!==d.prefecture)throw Error('Confirmed coordinates do not match region');
    if(d.country==='CN'&&d.prefecture==='四川省'&&d.city){const sc=JSON.parse(await readFile(resolve(geographyDirectory,'sichuan-cities.json'),'utf8'));const city=prefectureAt(d.latitude,d.longitude,sc.features);if(city&&city!==d.city)throw Error('Confirmed coordinates do not match city')}
   }
   savePhotoDetails(journal,manifest.owner,id,{details:d,confirmed:item.confirmed});
  }
  state.photos[id]=signature;
 }
 for(const e of manifest.entries){
  const signature=digest(Buffer.from(JSON.stringify(e)));if(state.entries[e.id]===signature)continue;state.entries[e.id]=signature;
  const photos=e.photos.map(file=>{const id=ids.get(file);if(!id)throw Error('Entry references a missing photo');return id});
  if(e.removed&&journal.entries.some(v=>v.id===e.id)){manageItems(journal,manifest.owner,'records',[e.id],true);continue}
  if(e.removed===false&&journal.entries.some(v=>v.id===e.id&&v.removed))manageItems(journal,manifest.owner,'records',[e.id],false);
  const members=new Set(photos),detach=journal.photos.filter(p=>p.entry===e.id&&!members.has(p.id)).map(p=>p.id);if(detach.length)mutateEntry(journal,manifest.owner,entryMutation.parse({op:'detach',id:e.id,photos:detach}));
  mutateEntry(journal,manifest.owner,entryMutation.parse({op:'save',id:e.id,type:e.type,title:e.title,date:e.date,note:e.note,photos}));if(e.removed)manageItems(journal,manifest.owner,'records',[e.id],true);
 }
 assertOwner(journal,manifest.owner);const text=JSON.stringify(journalSchema.parse(journal));if(Buffer.byteLength(text)>512*1024)throw Error('Journal size limit reached');
 writes.set('travel/index.json',Buffer.from(text+'\n'));writes.set('travel/import.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));writes.set('travel/review.json',Buffer.from(JSON.stringify({photos:review},null,2)+'\n'));writes.set('travel/import-state.json',Buffer.from(JSON.stringify(state)+'\n'));
 for(const [path,bytes] of writes){const full=await inside(root,path);try{if((await readFile(full)).equals(Buffer.from(bytes)))writes.delete(path)}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}}
 return {writes,added,photos:journal.photos.length,visits:journal.checkins.length};
}
