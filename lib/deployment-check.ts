import {authProvider,siteConfig,passwordConfig,authConfig,repoConfig} from './self-host-config.ts';
import {productionRateLimitReady} from './password-rate-limit.ts';
import {GitHubStore,GitHubError} from './github-store.ts';
export type DeploymentCheck={id:string;label:string;ok:boolean;message:string};
export async function deploymentChecks(remote=false){
 const checks:DeploymentCheck[]=[];
 let provider='invalid';try{provider=authProvider()}catch{}
 const check=(id:string,label:string,run:()=>unknown,message:string)=>{try{run();checks.push({id,label,ok:true,message:'已就绪'});return true}catch{checks.push({id,label,ok:false,message});return false}};
 check('origin','站点地址',()=>siteConfig(),'配置 APP_URL 为正式 HTTPS 地址；Vercel 可使用自动生产域名。');
 check('auth','登录认证',()=>{if(provider==='invalid')throw Error('Invalid auth provider');return provider==='github'?authConfig():passwordConfig()},'运行 npm run setup 生成 SESSION_SECRET 和 ADMIN_PASSWORD_HASH；不要直接填写明文密码。');
 checks.push({id:'limit',label:'登录限流',ok:provider==='github'||productionRateLimitReady(),message:provider==='github'?'GitHub 验证':productionRateLimitReady()?(process.env.NODE_ENV==='production'?(process.env.VERCEL==='1'?'平台限流声明已配置；请在 Vercel 确认 WAF 规则。':'单机持久文件限流；同一分钟全站最多 5 次尝试。'):'本机开发模式；正式部署需启用登录限流'):'Vercel 配置 WAF 后设置 PASSWORD_RATE_LIMIT=vercel-waf；单机服务器使用 file。'});
 const storage=check('storage','数据仓库配置',()=>repoConfig(),'填写自己的 GITHUB_DATA_REPOSITORY、GITHUB_DATA_TOKEN 和已存在的数据分支。');
 if(remote&&storage){
  try{const c=repoConfig();await new GitHubStore(c).read(c.ownerId);checks.push({id:'github',label:'私有仓库连接',ok:true,message:'仓库私有、分支可读，日志所有权匹配。尚未执行写入。'});}
  catch(e){checks.push({id:'github',label:'私有仓库连接',ok:false,message:e instanceof GitHubError?(e.status===401?'令牌无效或已过期。':e.status===403?'检查令牌权限、组织批准或 GitHub 请求额度。':e.status===404?'仓库或分支不可访问；空仓库请先创建 README，令牌需选中该仓库。':'GitHub 暂时不可用，请重试。'):e instanceof Error&&e.message==='Data repository must be private'?'数据仓库必须保持 private。':e instanceof Error&&e.message==='Journal owner mismatch'?'日志所有权不匹配；不要修改已有 owner，核对仓库配置。':e instanceof TypeError||e instanceof Error&&/fetch|timeout|abort/i.test(e.message)?'暂时无法连接 GitHub，请检查网络后重试。':'日志索引格式无效或读取失败，请保留数据并重试。'});}
 }
 return checks;
}
