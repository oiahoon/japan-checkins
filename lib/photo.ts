// Browser uploads are flattened to JPEG. Remove metadata again at the server boundary.
export function sanitizeJPEG(bytes:Uint8Array):Uint8Array {
  if(bytes.length<12||bytes[0]!==255||bytes[1]!==216)throw new Error('只接受经过处理的 JPEG 照片');
  const parts:Uint8Array[]=[bytes.slice(0,2)];let i=2,hasFrame=false,hasScan=false;
  while(i<bytes.length){
    if(bytes[i]!==255||i+1>=bytes.length)throw new Error('JPEG 文件损坏');
    const marker=bytes[i+1];
    if(marker===217){if(!hasFrame||!hasScan)throw new Error('JPEG 缺少图像数据');parts.push(bytes.slice(i,i+2));return join(parts);}
    if(i+4>bytes.length)throw new Error('JPEG 文件损坏');
    const n=(bytes[i+2]<<8)|bytes[i+3];if(n<2||i+2+n>bytes.length)throw new Error('JPEG 文件损坏');
    if([192,193,194].includes(marker)){
      if(n<8)throw new Error('JPEG 文件损坏');const h=(bytes[i+5]<<8)|bytes[i+6],w=(bytes[i+7]<<8)|bytes[i+8];
      if(!w||!h||w>2560||h>2560)throw new Error('照片尺寸过大');hasFrame=true;
    }
    if(marker===218){
      if(!hasFrame||n<6)throw new Error('JPEG 文件损坏');hasScan=true;let end=i+2+n;
      while(end<bytes.length){if(bytes[end]===255){const next=bytes[end+1];if(next===0||(next>=208&&next<=215)){end+=2;continue;}if(next===255){end++;continue;}break;}end++;}
      if(end>=bytes.length)throw new Error('JPEG 文件不完整');parts.push(bytes.slice(i,end));i=end;continue;
    }
    if(!(marker>=224&&marker<=239)&&marker!==254)parts.push(bytes.slice(i,i+2+n));i+=2+n;
  }
  throw new Error('JPEG 文件不完整');
}
function join(a:Uint8Array[]){const out=new Uint8Array(a.reduce((n,b)=>n+b.length,0));let i=0;for(const b of a){out.set(b,i);i+=b.length;}return out;}
