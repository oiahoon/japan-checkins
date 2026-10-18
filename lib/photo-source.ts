export type PhotoVariant='original'|'thumbnail';
export type PhotoPriority='foreground'|'visible'|'background';
export type PhotoReadOptions={priority?:PhotoPriority;signal?:AbortSignal};
export function isPhotoSource(src:string){return /^\/api\/(?:shared\/)?photos\/[\w-]+(?:\?.*)?$/.test(src)}
export function photoVariantURL(src:string,variant:PhotoVariant){if(!isPhotoSource(src))return src;const u=new URL(src,'https://journal.invalid');if(variant==='thumbnail')u.searchParams.set('variant','thumbnail');else u.searchParams.delete('variant');return u.pathname+u.search}
export function readPhotoVariant(src:string):PhotoVariant{const v=new URL(src,'https://journal.invalid').searchParams.get('variant');if(v&&v!=='thumbnail')throw Error('Invalid photo variant');return v==='thumbnail'?'thumbnail':'original'}
