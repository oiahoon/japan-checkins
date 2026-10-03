import type {PhotoDetails} from './travel-data.ts';
export type PlaceMatch={country:string;prefecture:string;city:string;name:string;level:'country'|'region'|'city'|'district';aliases:string[]};
const key=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[\s·・]/g,'');
// Never turn a partial match or a homonymous place into a definitive location.
export function lookupPlace(input:string,entries:PlaceMatch[]){
 const q=key(input);if(q.length<2)return {automatic:undefined,candidates:[] as PlaceMatch[]};
 const scored=entries.map(e=>({e,score:Math.max(0,...e.aliases.map(a=>{const k=key(a);return q===k?1000+k.length:q.includes(k)&&k.length>=2?100+k.length:k.startsWith(q)?1:0}))})).filter(v=>v.score);
 const strongest=Math.max(0,...scored.map(v=>v.score));
 const matched=scored.filter(v=>strongest>=1000?v.score===strongest:v.score>=100).map(v=>v.e);
 const specific=matched.filter(e=>e.level!=='country');
 const top=strongest===1?scored.map(v=>v.e):specific.length?specific:matched;
 // City/province with the same name and same parent denotes one suggestion.
 const groups=new Map<string,PlaceMatch>();for(const e of top){const k=e.country+'/'+e.prefecture;const previous=groups.get(k);if(!previous||(!previous.city&&e.city))groups.set(k,e);else if(previous.city&&e.city&&previous.city!==e.city)groups.set(k+'/'+e.city,e);}
 const candidates=[...groups.values()].slice(0,8);
 const common=new Set(['中央区','中央','北区','南区','西区','東区']);
 const sole=candidates[0];
 const needsContext=sole&&common.has(sole.name)&&!entries.some(e=>e.level==='region'&&e.country===sole.country&&e.prefecture===sole.prefecture&&e.aliases.some(a=>q.includes(key(a))));
 return {automatic:strongest>1&&groups.size===1&&!needsContext?sole:undefined,candidates};
}
export function applyPlaceMatch(details:PhotoDetails,match:PlaceMatch):PhotoDetails{
 const changed=details.country!==match.country||details.prefecture!==match.prefecture||details.city!==match.city;
 return {...details,country:match.country,prefecture:match.prefecture,city:match.city,...(changed?{latitude:null,longitude:null}:{})};
}
export function editPlaceQuery(details:PhotoDetails,place:string,entries:PlaceMatch[]):PhotoDetails{
 const candidates=lookupPlace(place,entries).candidates;
 const conflict=candidates.some(m=>m.country!==details.country||m.prefecture!==details.prefecture||m.city!==details.city);
 return {...details,place,latitude:null,longitude:null,placeSource:undefined,...(conflict?{country:'',prefecture:'',city:''}:{})};
}
