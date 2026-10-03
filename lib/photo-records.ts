import {z} from 'zod';
import {photoDetailsSchema,appendVisit,assertOwner,visitInput,InputError,type Journal,type PhotoDetails} from './travel-data.ts';
export const photoEditInput=z.object({details:photoDetailsSchema,confirmed:z.boolean()}).strict();
export const blankPhotoDetails:PhotoDetails={country:'',prefecture:'',city:'',place:'',date:'',note:'',latitude:null,longitude:null};
export function savePhotoDetails(j:Journal,owner:string,id:string,input:z.infer<typeof photoEditInput>){
 assertOwner(j,owner);const p=j.photos.find(p=>p.id===id&&p.owner===owner&&!p.removed);
 if(!p||j.checkins.some(c=>c.id===p.checkin&&c.removed))throw new InputError('照片不存在或已移除');
 const before=JSON.stringify(j),old=j.checkins.find(c=>c.id===p.checkin),d=input.details;
 if(!input.confirmed){
  if(old&&[old.country,old.prefecture,old.city,old.place,old.date,old.latitude,old.longitude].some((v,i)=>v!==[d.country,d.prefecture,d.city,d.place,d.date,d.latitude,d.longitude][i]))throw new InputError('修改已标记地点或日期后，请重新确认再保存');
  p.details=d;if(old){if(j.photos.filter(photo=>photo.checkin===old.id).length===1)old.note=d.note;old.published=false;if(d.placeSource)old.place_source=d.placeSource;else delete old.place_source}return JSON.stringify(j)!==before;
 }
 if(!d.country||!d.prefecture||!d.place||!d.date)throw new InputError('标记地图前请补充国家、地区、地点和日期');
 if((d.latitude===null)!==(d.longitude===null))throw new InputError('请同时填写经纬度，或清除坐标');
 const visit=visitInput.parse({id:old?.id||id,country:d.country,prefecture:d.prefecture,city:d.city,district:old?.country===d.country&&old.prefecture===d.prefecture&&old.city===d.city?(old.district||''):'',place:d.place,placeKey:old&&old.country===d.country&&old.prefecture===d.prefecture&&old.city===d.city&&old.place===d.place?old.place_key:JSON.stringify([d.country,d.prefecture,d.city,d.place,old?.kind||'place']),kind:old?.kind||'place',date:d.date,note:d.note,depth:old?.depth||0,prefDepth:old?.pref_depth||0,cityDepth:old?.city_depth||0,eaten:!!old?.eaten,photos:[],location:d.latitude!==null?{latitude:d.latitude,longitude:d.longitude,confirmed:true,source:p.proposal?.gps?.latitude===d.latitude&&p.proposal?.gps?.longitude===d.longitude?'photo':'manual'}:null});
 if(old&&j.photos.filter(v=>v.checkin===old.id).length===1){
  Object.assign(old,{country:visit.country,prefecture:visit.prefecture,city:visit.city,district:visit.district,place:visit.place,place_key:visit.placeKey,date:visit.date,note:visit.note,latitude:visit.location?.latitude??null,longitude:visit.location?.longitude??null,location_source:visit.location?.source??null,published:false});
 }else{
  // An old multi-photo visit remains intact; this photo becomes its own explicit visit.
  if(j.checkins.some(c=>c.id===id&&c.id!==old?.id))throw new InputError('照片记录标识冲突，请刷新后重试');const next={...visit,id,photos:[id]},statuses=structuredClone(j.statuses);if(old)p.checkin=null;appendVisit(j,owner,next);j.statuses=statuses;
 }
 const saved=j.checkins.find(c=>c.id===p.checkin);if(saved){if(d.placeSource)saved.place_source=d.placeSource;else delete saved.place_source}
 p.details=d;return JSON.stringify(j)!==before;
}
