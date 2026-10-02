import {sharedAPI} from '../../../../lib/github-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return sharedAPI(request,'list');}
