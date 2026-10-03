import type {PhotoDetails,PhotoProposal} from './travel-data.ts';

// Saved information and map consent are separate: partial details still belong
// on the card even when no visit has been confirmed.
export function photoSummary(details:PhotoDetails,marked:boolean,proposal?:PhotoProposal){
 const country=({JP:'日本',CN:'中国'} as Record<string,string>)[details.country]||details.country;
 const parts=[country,details.prefecture,details.city,details.district||'',details.place].map(v=>v.trim()).filter(Boolean);
 const location=[...new Set(parts)].join(' · ');
 return {
  location:location||(proposal?.gps?'定位待确认':'地点待补充'),
  locationMissing:!location,
  date:details.date||proposal?.date||'时间待补充',
  dateProposal:!details.date&&!!proposal?.date,
  note:details.note.trim()||'笔记待补充',
  noteMissing:!details.note.trim(),
  marking:marked?'已标记地图':details.place.trim()?'尚未确认地图标记':location?'具体地点待补充 · 未标记地图':'未标记地图',
 };
}
