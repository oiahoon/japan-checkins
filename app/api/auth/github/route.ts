import {NextResponse} from 'next/server';
import {authConfig, authProvider} from '../../../../lib/self-host-config';
import {nonce, challenge, signSession, oauthCookie} from '../../../../lib/session';
export async function GET() {
  if (authProvider()!=='github') return new Response(null, {status:404});
  try {
    const c = authConfig(), state = nonce(), verifier = nonce();
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({client_id:c.clientId, redirect_uri:`${c.origin}/api/auth/callback`, state, code_challenge:challenge(verifier), code_challenge_method:'S256', allow_signup:'false'}).toString();
    const response = NextResponse.redirect(url);
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(oauthCookie(c.secure), signSession({purpose:'oauth',sub:c.ownerId,exp:Date.now()+600000,state,verifier},c.secret), {httpOnly:true,secure:c.secure,sameSite:'lax',path:'/',maxAge:600});
    return response;
  } catch { return Response.json({error:'请先配置登录环境变量，参阅自部署说明'}, {status:503,headers:{'Cache-Control':'no-store'}}); }
}
