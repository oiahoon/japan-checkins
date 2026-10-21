import {configuredImageKit,imageKitConfig} from './imagekit.ts';
export async function checkImageKit(){
 try{if(!imageKitConfig())return {ok:true,message:'未启用图片加速，继续使用 Git。'};
 const ok=await configuredImageKit()!.verify();return {ok,message:ok?'合成图验证通过：无签名及变换请求被拒绝，签名图片与上传字节一致。':'加速未启用：检查密钥、额度和 Restrict all requests；照片继续从 Git 读取。'};
 }catch{return {ok:false,message:'ImageKit 配置不完整或尚未确认访问限制；继续使用 Git。'}}
}
