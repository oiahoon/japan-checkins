export function segmentTarget(key:string,index:number,total:number):number|null {
 if(total<1)return null;
 if(key==='Home')return 0;
 if(key==='End')return total-1;
 if(key==='ArrowRight'||key==='ArrowDown')return (index+1)%total;
 if(key==='ArrowLeft'||key==='ArrowUp')return (index-1+total)%total;
 return null;
}
