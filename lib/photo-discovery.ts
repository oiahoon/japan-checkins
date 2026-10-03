import type {PhotoDetails,PhotoProposal} from './travel-data.ts';
export type DiscoverablePhoto={id:string;entry?:string|null;marked:boolean;details:PhotoDetails;proposal?:PhotoProposal;uploading?:boolean;error?:string;progress?:number};
export type PhotoSort='added'|'date-desc'|'date-asc';
const normalize=(value:string)=>value.normalize('NFKC').replace(/[冈东儿岛广长县臺]/g,c=>({冈:'岡',东:'東',儿:'児',岛:'島',广:'廣',长:'長',县:'県',臺:'台'}[c]!)).replace(/[/.]/g,'-').toLocaleLowerCase().trim();
export function discoverPhotos<T extends DiscoverablePhoto>(items:T[],{query='',sort='added',unmarked=false,noNotes=false,entry='all',records=[]}:{query?:string;sort?:PhotoSort;unmarked?:boolean;noNotes?:boolean;entry?:string;records?:{id:string;title:string}[]}={}){
 const words=normalize(query).split(/\s+/).filter(Boolean);
 const recordTitles=new Map(records.map(r=>[r.id,r.title]));
 const found=[...items].reverse().filter(p=>{
  const text=normalize([p.details.country,p.details.country==='JP'?'日本':p.details.country==='CN'?'中国':'',p.details.prefecture,p.details.city,p.details.district,p.details.place,p.details.date||p.proposal?.date,p.details.note,p.entry?recordTitles.get(p.entry):undefined].filter(Boolean).join(' '));
  return (!unmarked||!p.marked)&&(!noNotes||!p.details.note.trim())&&(entry==='all'||(entry==='free'?!p.entry:p.entry===entry))&&words.every(w=>text.includes(w));
 });
 if(sort!=='added')found.sort((a,b)=>{
  const ad=a.details.date||a.proposal?.date||'',bd=b.details.date||b.proposal?.date||'';
  // Missing dates always remain below dated memories. Stable ties preserve upload order.
  if(!ad||!bd)return ad?-1:bd?1:0;
  return sort==='date-asc'?ad.localeCompare(bd):bd.localeCompare(ad);
 });
 return found;
}
export function readyPhoto(p:DiscoverablePhoto){return !p.uploading&&!p.error&&(p.progress===undefined||p.progress===100)}
export function nextPhotoId(queue:string[],current:string,items:DiscoverablePhoto[]){const index=queue.indexOf(current);if(index<0)return;return queue.slice(index+1).find(id=>items.some(p=>p.id===id&&readyPhoto(p)))}
export function photoDetailsChanged(before:PhotoDetails,after:PhotoDetails){return [...new Set([...Object.keys(before),...Object.keys(after)])].some(k=>before[k as keyof PhotoDetails]!==after[k as keyof PhotoDetails]);}
