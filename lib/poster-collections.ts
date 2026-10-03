import type {GeographicVisit} from './geography.ts';
export type PosterCollection={id:string;title:string;visitIds:string[];photoIds:string[]};
export function posterCollections(records:{id:string;title:string;type:string}[],photos:{id:string;checkin:string|null;entry?:string|null}[],visits:GeographicVisit[],entryOf:(p:{id:string;checkin:string|null;entry?:string|null})=>string|null):PosterCollection[]{
 const visitIds=new Set(visits.map(v=>v.id));
 return records.filter(r=>r.type==='trip').flatMap(r=>{const members=photos.filter(p=>entryOf(p)===r.id),ids=[...new Set(members.flatMap(p=>p.checkin&&visitIds.has(p.checkin)?[p.checkin]:[]))];
 // An old multi-photo visit is itself an explicitly confirmed geographic record.
 if(visitIds.has(r.id)&&!ids.includes(r.id))ids.push(r.id);
 return ids.length?[{id:r.id,title:r.title,visitIds:ids,photoIds:members.map(p=>p.id)}]:[]});
}
export function collectionVisits(visits:GeographicVisit[],collections:PosterCollection[],id:string){if(!id)return visits;const selected=collections.find(c=>c.id===id);return selected?visits.filter(v=>selected.visitIds.includes(v.id)):[]}
