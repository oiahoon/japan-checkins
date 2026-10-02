import {cookies} from 'next/headers';
import {siteConfig,authProvider,passwordConfig} from './self-host-config';
import {sessionCookie,verifySession} from './session';
export type Access = {userId:string;role:'admin'|'viewer'};
export async function currentAccess():Promise<Access|null>{
  try {
    const c=siteConfig();
    const session=verifySession((await cookies()).get(sessionCookie(c.secure))?.value,c.secret,'session',c.ownerId);
    if(!session||session.provider!==authProvider())return null;
    if(authProvider()==='github')return {userId:session.sub,role:'admin'};
    if(authProvider()!=='password'||session.version!==passwordConfig().version||!['admin','viewer'].includes(session.role||''))return null;
    return {userId:session.sub,role:session.role!};
  }catch{return null;}
}
export async function githubUser(){const access=await currentAccess();return access?.role==='admin'?{userId:access.userId,displayName:'我的旅行日志',email:'',fullName:null}:null;}
