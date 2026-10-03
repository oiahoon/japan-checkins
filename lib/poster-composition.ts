export type MapOffset={x:number;y:number};
export function boundMapOffset(value:MapOffset):MapOffset{
 const bound=(n:number)=>Number.isFinite(n)?Math.max(-.5,Math.min(.5,n)):0;
 return {x:bound(value.x),y:bound(value.y)};
}
// Offset is a fraction of the fixed map frame, independent of format or preview size.
export function dragMapOffset(start:MapOffset,dx:number,dy:number,width:number,height:number):MapOffset{
 if(!(width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height)))return boundMapOffset(start);
 return boundMapOffset({x:start.x+dx/width,y:start.y+dy/height});
}
export function posterMapFrame(width:number,height:number,scope:string,style:string){
 const landscape=width>height;
 return {x:width*(landscape?.39:.065),y:height*(landscape?.07:style==='memories'?.055:.245),width:width*(landscape?.57:.87),height:height*(landscape?.80:style==='memories'?.73:scope==='sichuan'?.59:.65)};
}
