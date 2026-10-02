import {NextResponse} from 'next/server';
import {authProvider,passwordConfig} from '../../../../lib/self-host-config';
import {signSession,sessionCookie} from '../../../../lib/session';
import {verifyPassword} from '../../../../lib/password';
import {boundedBytes} from '../../../../lib/github-service';
import {admitPasswordAttempt,productionRateLimitReady} from '../../../../lib/password-rate-limit';
export const runtime='nodejs';
export async function POST(request:Request){
  const headers={'Cache-Control':'private, no-store'};
  if(authProvider()!=='password')return new Response(null,{status:404,headers});
  try{
    const c=passwordConfig();
    if(request.headers.get('origin')!==c.origin)return new Response(null,{status:403,headers});
    if(!productionRateLimitReady())return new Response('请先配置服务端登录限流',{status:503,headers});
    // Trust the IP only on Vercel; generic local use has one global bucket.
    const key=process.env.VERCEL==='1'?(request.headers.get('x-vercel-forwarded-for')||'global'):'local';
    if(!admitPasswordAttempt(key))return new Response('尝试次数过多，请稍后再试',{status:429,headers:{...headers,'Retry-After':'60'}});
    const body=new URLSearchParams((await boundedBytes(request,4096)).toString('utf8'));
    const password=body.get('password')||'';
    const admin=await verifyPassword(password,c.adminHash);
    const viewer=!admin&&c.viewerHash?await verifyPassword(password,c.viewerHash):false;
    const response=NextResponse.redirect(`${c.origin}${admin||viewer?'/':'/login?error=password'}`,303);
    if(admin||viewer)response.cookies.set(sessionCookie(c.secure),signSession({purpose:'session',provider:'password',sub:c.ownerId,role:admin?'admin':'viewer',version:c.version,exp:Date.now()+86400000},c.secret),{httpOnly:true,secure:c.secure,sameSite:'lax',path:'/',maxAge:86400});
    response.headers.set('Cache-Control','private, no-store');return response;
  }catch{return new Response('登录配置未完成或请求内容无效，请检查部署配置',{status:503,headers});}
}
