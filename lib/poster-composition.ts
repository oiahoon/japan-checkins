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
 const landscape=width>height,phone=height/width>1.65,memory=style==='memories';
 if(landscape)return {x:width*.365,y:height*.065,width:width*.595,height:height*.84};
 if(phone)return {x:width*.06,y:height*(memory?.19:.28),width:width*.88,height:height*(memory?.58:.55)};
 if(memory)return {x:width*.045,y:height*.065,width:width*.91,height:height*.70};
 if(scope==='japan')return {x:width*.055,y:height*.08,width:width*.89,height:height*.82};
 return {x:width*.24,y:height*.155,width:width*.70,height:height*.65};
}
