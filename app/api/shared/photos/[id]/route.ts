import {sharedAPI} from '../../../../../lib/github-api';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return sharedAPI(request,'photo',(await params).id);}
