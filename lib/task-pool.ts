/** Bound whole operations, not individual fetches, so slow photos cannot flood GitHub. */
export function taskPool(limit:number){
 if(!Number.isInteger(limit)||limit<1)throw new Error('Invalid concurrency');
 let active=0;
 const waiting:(()=>void)[]=[];
 return async function run<T>(work:()=>Promise<T>):Promise<T>{
  await new Promise<void>(resolve=>{const start=()=>{active++;resolve()};if(active<limit)start();else waiting.push(start)});
  try{return await work()}finally{active--;waiting.shift()?.()}
 };
}
