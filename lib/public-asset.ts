export function publicAsset(path:string){
 const base=typeof document==='undefined'?'':document.querySelector<HTMLMetaElement>('meta[name="journal-base"]')?.content||'';
 return base&&path.startsWith('/')?base.replace(/\/$/,'')+path:path;
}
