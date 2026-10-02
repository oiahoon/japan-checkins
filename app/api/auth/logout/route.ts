import {NextResponse} from 'next/server';
import {siteConfig, githubMode} from '../../../../lib/self-host-config';
import {sessionCookie} from '../../../../lib/session';
export async function POST(request: Request) {
  if (!githubMode()) return new Response(null,{status:404});
  let c;try{c=siteConfig();}catch{return new Response('登录配置未完成',{status:503,headers:{'Cache-Control':'no-store'}});}
  if (request.headers.get('origin') !== c.origin) return new Response(null,{status:403});
  const response = NextResponse.redirect(`${c.origin}/login`,303);
  response.cookies.set(sessionCookie(c.secure),'',{httpOnly:true,secure:c.secure,sameSite:'lax',path:'/',maxAge:0});
  response.headers.set('Cache-Control','no-store');
  return response;
}
