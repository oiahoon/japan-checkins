/** Display groups only: never merges independent visits or guesses a trip. */
export type DatedRecord = {id:string;date:string};
export function calendarDate(value:string):Date|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?date:null;
}
export function timelineGroups<T extends DatedRecord>(records:readonly T[]) {
 const sorted=[...records].sort((a,b)=>{
  const left=calendarDate(a.date)?a.date:'',right=calendarDate(b.date)?b.date:'';
  return right.localeCompare(left);
 });
 const months: {key:string;label:string;count:number;days:{date:string;day:string;weekday:string;records:T[]}[]}[]=[];
 for(const record of sorted){
  const parsed=calendarDate(record.date),key=parsed?record.date.slice(0,7):'undated';
  let month=months[months.length-1];
  if(!month||month.key!==key){month={key,label:parsed?`${Number(key.slice(0,4))} 年 ${Number(key.slice(5))} 月`:'日期待补充',count:0,days:[]};months.push(month)}
  const date=parsed?record.date:'',last=month.days[month.days.length-1];
  const day=last?.date===date?last:{date,day:parsed?record.date.slice(8):'—',weekday:parsed?'周'+'日一二三四五六'[parsed.getUTCDay()]:'待补充',records:[]};
  if(day!==last)month.days.push(day);
  day.records.push(record);month.count++;
 }
 return months;
}

export type ChronicleRecord={id:string;title:string;date:string;note:string;type:'trip'|'text';legacy?:boolean;location?:string;kind?:string;depth?:number;eaten?:number};
export type ChroniclePhoto={id:string;url:string;entry?:string|null;marked:boolean;details:{date:string;place:string;city:string;prefecture:string;district?:string;note:string};proposal?:{date?:string};mapId?:string};
export type ChronicleItem={id:string;date:string;title:string;note:string;type:'trip'|'photo'|'text';photos:{id:string;url:string}[];location:string;mapId?:string;proposedDate?:boolean;kind?:string;depth?:number;eaten?:number};
/** Display aggregation uses explicit associations; no time/place heuristics or inferred visits. */
export function chronicleItems(records:ChronicleRecord[],photos:ChroniclePhoto[]):ChronicleItem[]{
 const byEntry=new Map<string,ChroniclePhoto[]>();for(const photo of photos){if(photo.entry){const members=byEntry.get(photo.entry)||[];members.push(photo);byEntry.set(photo.entry,members)}}
 const items:ChronicleItem[]=records.map(r=>{const members=byEntry.get(r.id)||[];return {id:'entry-'+r.id,date:r.date,title:r.title,note:r.note,type:r.type,kind:r.kind,depth:r.depth,eaten:r.eaten,photos:members.map(p=>({id:p.id,url:p.url})),location:[...new Set(members.map(p=>p.details.city||p.details.prefecture).filter(Boolean))].join(' / ')||r.location||'',mapId:r.legacy?r.id:members.find(p=>p.marked)?.mapId}});
 for(const p of photos.filter(p=>!p.entry))items.push({id:'photo-'+p.id,date:p.details.date||p.proposal?.date||'',title:p.details.place||p.details.city||'这一张的记忆',note:p.details.note,type:'photo',photos:[{id:p.id,url:p.url}],location:[p.details.prefecture,p.details.city,p.details.district].filter(Boolean).join(' / '),mapId:p.marked?p.mapId:undefined,proposedDate:!p.details.date&&!!p.proposal?.date});
 return items;
}
