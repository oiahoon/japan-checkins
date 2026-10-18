import {currentAccess} from '../../../../lib/github-auth';
import {siteConfig} from '../../../../lib/self-host-config';
import {deploymentChecks} from '../../../../lib/deployment-check';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
 const access=await currentAccess();if(!access)return Response.json({error:'请先登录'},{status:401,headers});
 if(access.role!=='admin')return Response.json({error:'仅主人可以检查部署'},{status:403,headers});
 if(request.headers.get('origin')!==siteConfig().origin)return Response.json({error:'无效请求来源'},{status:403,headers});
 return Response.json({checks:await deploymentChecks(true)},{headers});
}
