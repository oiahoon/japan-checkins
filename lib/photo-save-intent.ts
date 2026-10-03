import type {PhotoDetails} from './travel-data.ts';
import {validCoordinate,validDate} from './photo-metadata.ts';
// Saving complete, visible location/date fields is the explicit confirmation action.
// No selection, EXIF load or autocomplete result calls the persistence layer.
export function photoSaveIntent(details:PhotoDetails,marked=false){
 const complete=Boolean(details.country&&details.prefecture.trim()&&details.place.trim()&&details.date);
 const hasCoordinate=details.latitude!==null||details.longitude!==null;
 const error=details.date&&!validDate(details.date)?'请填写有效日期':hasCoordinate&&!validCoordinate(details.latitude,details.longitude)?'请同时填写有效的经纬度，或清除坐标':marked&&!complete?'已标记的记录需要保留地点和日期':'';
 return {confirmed:complete&&!error,label:complete?'保存并标记地图':'保存照片信息',error};
}
