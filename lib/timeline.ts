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
