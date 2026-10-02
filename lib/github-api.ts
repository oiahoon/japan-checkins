import {currentAccess} from './github-auth';
import {siteConfig,repoConfig} from './self-host-config';
import {GitHubStore} from './github-store';
import {journalAPI,type Action} from './github-service';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function githubAPI(request:Request|undefined,action:Action,id?:string) {
 const access=await currentAccess();if(!access)return Response.json({error:'请先登录'},{status:401,headers});
 if(access.role!=='admin'&&!['list','photo'].includes(action))return Response.json({error:'只读访问不能修改记录'},{status:403,headers});
 try{const origin=siteConfig().origin;if(request&&!['list','photo'].includes(action)&&request.headers.get('origin')!==origin)return Response.json({error:'无效请求来源'},{status:403,headers});return await journalAPI({userId:access.userId,origin,store:new GitHubStore(repoConfig()),readOnly:access.role!=='admin'},request,action,id);}
 catch{return Response.json({error:'私有仓库配置未完成或暂时不可用'},{status:503,headers});}
}
export async function sharedAPI(request:Request,action:'list'|'photo',id?:string){
 try{const c=siteConfig();if(c.visibility!=='public')return new Response(null,{status:404,headers});return await journalAPI({userId:c.ownerId,origin:c.origin,store:new GitHubStore(repoConfig()),readOnly:true,sharedOnly:true},request,action,id);}
 catch{return Response.json({error:'公开记录暂时无法读取'},{status:503,headers});}
}
