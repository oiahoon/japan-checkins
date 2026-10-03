import {currentAccess} from '../../../lib/github-auth';
import {siteConfig,githubMode} from '../../../lib/self-host-config';
import {searchPlaces} from '../../../lib/place-search-service';
export const dynamic='force-dynamic';
async function handle(request:Request){
 if(!githubMode())return Response.json({error:'此入口未启用'},{status:404,headers:{'Cache-Control':'private, no-store'}});
 const access=await currentAccess();
 let origin='';try{origin=siteConfig().origin}catch{}
 return searchPlaces(request,{access,origin,apiKey:process.env.GEOAPIFY_API_KEY});
}
export const GET=handle;
export const POST=handle;
