/** Presentation window only. Search, selection and stored data remain complete. */
export function revealWindow(total:number,step:number,previous:{key:string;limit:number},key:string){
 const size=Math.max(1,Math.floor(step));
 const limit=previous.key===key?Math.max(size,previous.limit):size;
 return {visible:Math.min(Math.max(0,total),limit),next:Math.min(total,limit+size),remaining:Math.max(0,total-limit)};
}
