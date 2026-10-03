import type {PhotoMetadata} from './photo-metadata.ts';
export function batchReview(items:{metadata?:PhotoMetadata}[]){
 const dated=items.flatMap(p=>p.metadata?.date?[p.metadata.date]:[]),located=items.flatMap(p=>p.metadata?.gps?[p.metadata.gps]:[]);
 const distinctDates=new Set(dated).size>1;
 const radians=(n:number)=>n*Math.PI/180;
 const separated=located.some((a,i)=>located.slice(i+1).some(b=>{const x=Math.sin(radians(b.latitude-a.latitude)/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(radians(b.longitude-a.longitude)/2)**2;return 6371*2*Math.atan2(Math.sqrt(Math.min(1,x)),Math.sqrt(Math.max(0,1-x)))>5;}));
 return {distinctDates,separated,missingLocation:items.length-located.length,missingDate:items.length-dated.length};
}
