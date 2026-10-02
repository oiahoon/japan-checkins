import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {authConfig, authProvider} from '../../../../lib/self-host-config';
import {verifySession, signSession, oauthCookie, sessionCookie} from '../../../../lib/session';
export async function GET(request: Request) {
  if (authProvider()!=='github') return new Response(null,{status:404});
  let c;
  try { c = authConfig(); } catch { return new Response('登录配置未完成',{status:503}); }
  const url = new URL(request.url);
  const pending = verifySession((await cookies()).get(oauthCookie(c.secure))?.value,c.secret,'oauth',c.ownerId);
  const fail = () => NextResponse.redirect(`${c.origin}/login?error=auth`);
  let response = fail();
  try {
    const code = url.searchParams.get('code');
    if (!pending?.state || !pending.verifier || pending.state !== url.searchParams.get('state') || !code || code.length>512) throw new Error('Invalid callback');
    const exchange = await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:c.clientId,client_secret:c.clientSecret,code,redirect_uri:`${c.origin}/api/auth/callback`,code_verifier:pending.verifier}),signal:AbortSignal.timeout(10000),cache:'no-store'});
    const token = await exchange.json() as {access_token?:string};
    if (!exchange.ok || typeof token.access_token !== 'string') throw new Error('Exchange failed');
    const identity = await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token.access_token}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(10000),cache:'no-store'});
    const user = await identity.json() as {id?:number};
    if (!identity.ok || String(user.id) !== c.ownerId) throw new Error('Owner denied');
    response = NextResponse.redirect(c.origin);
    response.cookies.set(sessionCookie(c.secure),signSession({purpose:'session',provider:'github',sub:c.ownerId,exp:Date.now()+86400000},c.secret),{httpOnly:true,secure:c.secure,sameSite:'lax',path:'/',maxAge:86400});
  } catch { /* Do not log codes or tokens. */ }
  response.cookies.set(oauthCookie(c.secure),'',{httpOnly:true,secure:c.secure,sameSite:'lax',path:'/',maxAge:0});
  response.headers.set('Cache-Control','no-store');
  return response;
}
