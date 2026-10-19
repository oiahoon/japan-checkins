import catalog from './japan-city-catalog.json' with {type:'json'};
import type {GeographicVisit} from './geography.ts';
import type {PuzzlePhoto} from './photo-puzzle.ts';
export const japanPrefectures=catalog.prefectures;
export const japanMunicipalities=catalog.cities.map(([id,name,prefectureId,code])=>({id:Number(id),name:String(name),prefectureId:Number(prefectureId),municipalityCode:String(code)}));
export function japanShard(prefecture:string){const row=japanPrefectures.find(p=>p.name===prefecture);return row?'/japan-cities/'+row.code+'.json':undefined}
export function japanPrefectureForNode(id?:string){const m=/^jp-(pref|city):(\d+)$/.exec(id||'');if(!m)return;const n=Number(m[2]),prefId=m[1]==='pref'?n:japanMunicipalities.find(c=>c.id===n)?.prefectureId;return japanPrefectures.find(p=>p.id===prefId)?.name}
export function puzzlePrefectures(visits:GeographicVisit[],photos:Pick<PuzzlePhoto,'checkin'>[],area=''){
 const ids=new Set(photos.map(p=>p.checkin));return [...new Set(visits.filter(v=>(v.country||'JP')==='JP'&&ids.has(v.id)&&(!area||v.prefecture===area)&&(!!v.city||v.latitude!=null&&v.longitude!=null)&&!!japanShard(v.prefecture)).map(v=>v.prefecture))].sort();
}
