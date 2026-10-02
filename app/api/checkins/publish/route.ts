import {githubAPI} from '../../../../lib/github-api';
import {githubMode} from '../../../../lib/self-host-config';
export async function POST(request:Request){if(!githubMode())return new Response(null,{status:404});return githubAPI(request,'publish');}
