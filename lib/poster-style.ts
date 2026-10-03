export type PosterColors={background?:string;land?:string;accent?:string};
export const posterColorPresets={default:'风格默认',sand:'暖砂',mist:'雾蓝',ink:'深墨'};
export type PosterColorPreset=keyof typeof posterColorPresets;
const schemes={sand:{background:'#f1e8d8',land:'#a49c87',accent:'#b46b46'},mist:{background:'#edf0ef',land:'#94a7aa',accent:'#487d89'},ink:{background:'#17242c',land:'#7a9299',accent:'#d3b584'}};
export function presetColors(preset:PosterColorPreset):PosterColors{return preset==='default'?{}:schemes[preset]||{}}
function validColor(value:unknown,fallback:string){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback}
function channels(hex:string){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function blend(a:string,b:string,amount:number){const c=channels(a),d=channels(b);return '#'+c.map((n,i)=>Math.round(n*(1-amount)+d[i]*amount).toString(16).padStart(2,'0')).join('')}
export function posterPalette(style:string,colors:PosterColors={}){
 const base=style==='night'?{paper:'#172822',ink:'#f1ead6',muted:'#b5bba9',accent:'#d0ae78',visited:'#c5b991',land:'#aaa994',line:'#adb09b'}:style==='memories'?{paper:'#f3f0e7',ink:'#292e29',muted:'#72776c',accent:'#ad5c43',visited:'#85927f',land:'#c2c7bc',line:'#f3f0e7'}:{paper:'#f5f2e9',ink:'#242923',muted:'#73756a',accent:'#b15b40',visited:'#b15b40',land:'#aeb0a2',line:'#f5f2e9'};
 const paper=validColor(colors.background,base.paper),land=validColor(colors.land,base.land),accent=validColor(colors.accent,base.accent);
 const luminance=channels(paper).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
 const ink=luminance>.179?'#242923':'#f1ead6';
 return {...base,paper,land,accent,visited:typeof colors.accent==='string'&&/^#[0-9a-f]{6}$/i.test(colors.accent)?accent:base.visited,ink,muted:blend(ink,paper,.42),line:style==='night'?blend(land,paper,.32):paper};
}
