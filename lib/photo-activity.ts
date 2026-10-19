// Browser-page coordination only; never contains an owner, URL, token, or photo data.
const owners=new Set<object>(),listeners=new Set<(busy:boolean)=>void>();
export function photoReadsBusy(){return owners.size>0}
export function setPhotoReadsBusy(owner:object,busy:boolean){const before=photoReadsBusy();if(busy)owners.add(owner);else owners.delete(owner);if(before!==photoReadsBusy())for(const fn of listeners)fn(photoReadsBusy())}
export function onPhotoActivity(fn:(busy:boolean)=>void){listeners.add(fn);fn(photoReadsBusy());return()=>{listeners.delete(fn)}}
