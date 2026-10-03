import {featurePath,visitArea,type Scope,type MapFeature,type GeographicVisit} from './geography.ts';
import {prefectureAt} from './photo-metadata.ts';
export type PuzzlePhoto={id:string;checkin:string|null;url:string;details?:{note:string}};
export type PuzzleVisit=GeographicVisit&{note?:string};
export type PuzzleRegion=MapFeature&{properties:MapFeature['properties']&{prefecture?:string}};
export function photoAreas(scope:Scope,features:PuzzleRegion[],visits:PuzzleVisit[],photos:PuzzlePhoto[]){
 const grouped=new Map<string,{feature:PuzzleRegion;photos:(PuzzlePhoto&{note:string})[]}>();
 for(const visit of visits){let feature:PuzzleRegion|undefined;
 if(scope==='japan'){feature=features.find(f=>f.properties.prefecture===visit.prefecture&&f.properties.name===visit.city);if(!feature&&visit.latitude!=null&&visit.longitude!=null){const candidates=features.filter(f=>f.properties.prefecture===visit.prefecture),name=prefectureAt(visit.latitude,visit.longitude,candidates);feature=candidates.find(f=>f.properties.name===name);}}
 else feature=features.find(f=>f.properties.name===visitArea(visit,scope,features));
 if(!feature)continue;const matching=photos.filter(p=>p.checkin===visit.id);if(!matching.length)continue;const key=String(feature.properties.id),group=grouped.get(key)||{feature,photos:[]};for(const p of matching)if(!group.photos.some(old=>old.id===p.id))group.photos.push({...p,note:(p.details?.note??visit.note)?.trim()||''});grouped.set(key,group);
 }return [...grouped.values()];
}
const xml=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function puzzleSVG({scope,features,visits,photos,project,prefix,notes=false}:{scope:Scope;features:PuzzleRegion[];visits:PuzzleVisit[];photos:PuzzlePhoto[];project:(p:number[])=>number[];prefix:string;notes?:boolean}){
 return photoAreas(scope,features,visits,photos).map(({feature,photos:images},index)=>{
 const pts=feature.geometry.coordinates.flatMap(p=>p.flat()).map(project),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,id=prefix+'-'+index,outline=featurePath(feature,project);
 // Alternating shared cubic tabs; each edge is used in reverse by its neighbor.
 let seed=images.reduce((a,p)=>[...p.id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,a),17);const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const count=images.length,rows=Math.max(1,Math.round(Math.sqrt(count*h/Math.max(w,.001)))),rowCount=Math.min(count,rows),horizontal=Array.from({length:rowCount+1},(_,i)=>({x:x,y:y+h*i/rowCount,amp:i&&i<rowCount?(random()>.5?1:-1)*h/rowCount*.14:0}));
 const hdown=(e:{y:number;amp:number})=>`L${x+w*.3},${e.y} C${x+w*.42},${e.y} ${x+w*.36},${e.y+e.amp} ${x+w*.5},${e.y+e.amp} C${x+w*.64},${e.y+e.amp} ${x+w*.58},${e.y} ${x+w*.7},${e.y} L${x+w},${e.y}`;
 const hup=(e:{y:number;amp:number})=>`L${x+w*.7},${e.y} C${x+w*.58},${e.y} ${x+w*.64},${e.y+e.amp} ${x+w*.5},${e.y+e.amp} C${x+w*.36},${e.y+e.amp} ${x+w*.42},${e.y} ${x+w*.3},${e.y} L${x},${e.y}`;
 let used=0;const pieces:string[]=[];
 for(let row=0;row<rowCount;row++){const cols=Math.floor(count/rowCount)+(row<count%rowCount?1:0),top=horizontal[row],bottom=horizontal[row+1],rh=bottom.y-top.y,pad=rh*.2,rid=id+'-row'+row;
 pieces.push(`<clipPath id="${rid}"><path d="M${x},${top.y}${hdown(top)}L${x+w},${bottom.y}${hup(bottom)}Z"/></clipPath><g clip-path="url(#${rid})">`);
 const edges=Array.from({length:cols+1},(_,i)=>({x:x+w*i/cols+(i&&i<cols?(random()-.5)*w/cols*.25:0),amp:i&&i<cols?(random()>.5?1:-1)*Math.min(w/cols*.2,rh*.2):0}));
 const down=(e:{x:number;amp:number})=>`L${e.x},${top.y+rh*.3} C${e.x},${top.y+rh*.42} ${e.x+e.amp},${top.y+rh*.36} ${e.x+e.amp},${top.y+rh*.5} C${e.x+e.amp},${top.y+rh*.64} ${e.x},${top.y+rh*.58} ${e.x},${top.y+rh*.7} L${e.x},${bottom.y+pad}`;
 const up=(e:{x:number;amp:number})=>`L${e.x},${top.y+rh*.7} C${e.x},${top.y+rh*.58} ${e.x+e.amp},${top.y+rh*.64} ${e.x+e.amp},${top.y+rh*.5} C${e.x+e.amp},${top.y+rh*.36} ${e.x},${top.y+rh*.42} ${e.x},${top.y+rh*.3} L${e.x},${top.y-pad}`;
 for(let col=0;col<cols;col++){const p=images[used++],left=edges[col],right=edges[col+1],d=`M${left.x},${top.y-pad}L${right.x},${top.y-pad}${down(right)}L${left.x},${bottom.y+pad}${up(left)}Z`,pid=id+'-p'+used,px=Math.min(w/cols*.3,rh*.2);
 pieces.push(`<clipPath id="${pid}"><path d="${d}"/></clipPath><g class="photo-puzzle-piece" ${notes&&p.note?'data-photo-note="'+xml(p.note)+'"':''} clip-path="url(#${pid})"><image href="${xml(p.url)}" x="${left.x-px}" y="${top.y-pad}" width="${right.x-left.x+px*2}" height="${rh+pad*2}" preserveAspectRatio="xMidYMid slice"/>${count>1?`<path d="${d}" fill="none" stroke="#f5f3ed" stroke-opacity=".65" stroke-width=".6"/>`:''}</g>`)}pieces.push('</g>');
 }

 return `<g data-area="${xml(feature.properties.prefecture||feature.properties.name)}" data-puzzle-region="${xml(feature.properties.name)}"><defs><clipPath id="${id}"><path d="${outline}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#${id})">${pieces.join('')}</g></g>`;
 }).join('');
}
