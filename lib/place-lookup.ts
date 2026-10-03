import type {PhotoDetails} from './travel-data.ts';
export type PlaceMatch={country:string;prefecture:string;city:string;district?:string;code?:string;name:string;level:'country'|'region'|'city'|'district';aliases:string[]};
const key=(s:string)=>s.normalize('NFKC').replace(/臺/g,'台').toLocaleLowerCase().replace(/[\s·・]/g,'');
// Never turn a partial match or a homonymous place into a definitive location.
export function lookupPlace(input:string,entries:PlaceMatch[]){
 const q=key(input);if(q.length<2)return {automatic:undefined,candidates:[] as PlaceMatch[]};
 const scored=entries.map(e=>({e,score:Math.max(0,...e.aliases.map(a=>{const k=key(a);return q===k?1000+k.length:q.includes(k)&&k.length>=2?100+k.length:k.startsWith(q)?1:0}))})).filter(v=>v.score);
 const strongest=Math.max(0,...scored.map(v=>v.score));
 const matched=scored.filter(v=>strongest>=1000?v.score===strongest:v.score>=100).map(v=>v.e);
 const specific=matched.filter(e=>e.level!=='country');
 let top=strongest===1?scored.map(v=>v.e):specific.length?specific:matched;
 // Parent names are context, never a default preference. Keep homonymous siblings
 // separate by their complete path, even when they belong to the same province.
 const context=(e:PlaceMatch)=>entries.filter(p=>p.country===e.country&&p.prefecture===e.prefecture&&((p.level==='region'&&e.level!=='region')||(p.level==='city'&&e.level==='district'&&p.city===e.city))).reduce((score,p)=>score+(p.aliases.some(a=>key(a).length>=2&&q.includes(key(a)))?p.level==='city'?2:1:0),0);
 // A city short name embedded in a longer district name is not an extra destination.
 top=top.filter(e=>e.level!=='city'||!e.aliases.some(a=>q.includes(key(a))&&top.some(d=>d.level==='district'&&d.aliases.some(b=>key(b).length>key(a).length&&key(b).includes(key(a))&&q.includes(key(b))))));
 const contexts=top.map(e=>({e,score:context(e)})),most=Math.max(0,...contexts.map(v=>v.score));
 const conflictingCities=new Set(top.filter(e=>e.level==='city').map(e=>[e.country,e.prefecture,e.city].join('/'))).size>1;
 if(most&&!conflictingCities)top=contexts.filter(v=>v.score===most).map(v=>v.e);
 const groups=new Map<string,PlaceMatch>();for(const e of top){const k=[e.country,e.prefecture,e.city,e.district||'',e.level==='district'?e.code||e.name:''].join('/');groups.set(k,e);}
 // Japan city/prefecture and Chinese municipalities may share one short alias.
 for(const [k,e] of groups)if(e.level==='region'&&[...groups.values()].some(c=>c.level==='city'&&c.country===e.country&&c.prefecture===e.prefecture&&c.aliases.some(a=>e.aliases.some(b=>key(a)===key(b)))))groups.delete(k);
 const candidates=[...groups.values()].slice(0,8);
 const common=new Set(['中央区','中央','北区','南区','西区','東区']);
 const sole=candidates[0];
 const needsContext=sole&&common.has(sole.name)&&!entries.some(e=>e.level==='region'&&e.country===sole.country&&e.prefecture===sole.prefecture&&e.aliases.some(a=>q.includes(key(a))));
 return {automatic:strongest>1&&groups.size===1&&!needsContext?sole:undefined,candidates};
}
export function applyPlaceMatch(details:PhotoDetails,match:PlaceMatch):PhotoDetails{
 const changed=details.country!==match.country||details.prefecture!==match.prefecture||details.city!==match.city||(details.district||'')!==(match.district||'');
 return {...details,country:match.country,prefecture:match.prefecture,city:match.city,district:match.district||'',...(changed?{latitude:null,longitude:null}:{})};
}
export function editPlaceQuery(details:PhotoDetails,place:string,entries:PlaceMatch[]):PhotoDetails{
 const candidates=lookupPlace(place,entries).candidates;
 const conflict=candidates.some(m=>m.country!==details.country||m.prefecture!==details.prefecture||m.city!==details.city||(m.district||'')!==(details.district||''));
 return {...details,place,latitude:null,longitude:null,placeSource:undefined,...(conflict?{country:'',prefecture:'',city:'',district:''}:{})};
}
