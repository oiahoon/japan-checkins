import {githubMode} from '../../../lib/self-host-config';
import {githubAPI} from '../../../lib/github-api';
import {getChatGPTUser} from '../../chatgpt-auth';
import {privateHeaders} from '../../../lib/storage';
export async function POST(req:Request){if(githubMode())return githubAPI(req,'entry');const user=await getChatGPTUser();return Response.json({error:user?'旧 Sites 适配器暂不支持旅行相册':'请先登录'},{status:user?405:401,headers:privateHeaders});}
