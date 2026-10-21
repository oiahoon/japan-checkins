import {imageKitConfig} from './imagekit.ts';
import {authProvider,siteConfig,passwordConfig,authConfig,repoConfig} from './self-host-config.ts';
import {productionRateLimitReady} from './password-rate-limit.ts';
import {GitHubStore,GitHubError} from './github-store.ts';
import {redisConfig,JournalRedis} from './journal-kv.ts';
export type DeploymentCheck={id:string;label:string;ok:boolean;message:string;optional?:boolean};
export async function deploymentChecks(remote=false){
 const checks:DeploymentCheck[]=[];
 let provider='invalid';try{provider=authProvider()}catch{}
 const check=(id:string,label:string,run:()=>unknown,message:string)=>{try{run();checks.push({id,label,ok:true,message:'已就绪'});return true}catch{checks.push({id,label,ok:false,message});return false}};
 check('origin','站点地址',()=>siteConfig(),'配置 APP_URL 为正式 HTTPS 地址；Vercel 可使用自动生产域名。');
 check('auth','登录认证',()=>{if(provider==='invalid')throw Error('Invalid auth provider');return provider==='github'?authConfig():passwordConfig()},'运行 npm run setup 生成 SESSION_SECRET 和 ADMIN_PASSWORD_HASH；不要直接填写明文密码。');
 const limitReady=productionRateLimitReady();
 checks.push({id:'limit',label:'登录限流',ok:provider==='github'||limitReady,message:provider==='github'?'GitHub 验证':limitReady?(process.env.PASSWORD_RATE_LIMIT==='redis'?'Redis 全站共享窗口最多 5 次 / 60 秒；连接故障时拒绝登录。':process.env.NODE_ENV==='production'?(process.env.VERCEL==='1'?'平台限流声明已配置；请在 Vercel 确认 WAF 规则。':'单机持久文件限流；同一分钟全站最多 5 次尝试。'):'本机开发模式；正式部署需启用登录限流'):'配置 Redis 登录限流，或 Vercel WAF 声明 / 单机 file。'});
 try{
  const config=redisConfig();
  if(process.env.PASSWORD_RATE_LIMIT==='redis'&&!config)throw Error();
  if(config&&remote){await new JournalRedis(config).ping();checks.push({id:'kv',label:'可选 Redis 协调',ok:true,message:'Redis 只读 PING 成功；写入权限及真实并发尚需独立验证。'});}
  else checks.push({id:'kv',label:'可选 Redis 协调',ok:true,message:config?'配置格式有效；尚未连接验证。':'未启用；继续使用 GitHub 原子提交，不提供后台队列。'});
 }catch{checks.push({id:'kv',label:'可选 Redis 协调',ok:false,message:'检查 JOURNAL_KV、独立命名空间、完整 REST 凭据或服务额度；不会回退到实例内存。'});}
 try{const c=imageKitConfig();checks.push({id:'images',label:'可选 ImageKit 图片加速',ok:true,optional:true,message:c?'配置格式有效；请在下方用合成图验证私有访问。验证通过前继续走 Git。':'未启用；照片从 Git 读取。'});}catch{checks.push({id:'images',label:'可选 ImageKit 图片加速',ok:false,optional:true,message:'配置不完整或未确认访问限制，已回退 Git；不影响上传和查看。'});}
 const storage=check('storage','数据仓库配置',()=>repoConfig(),'填写自己的 GITHUB_DATA_REPOSITORY、GITHUB_DATA_TOKEN 和已存在的数据分支。');
 if(remote&&storage){
  try{const c=repoConfig();await new GitHubStore(c).read(c.ownerId);checks.push({id:'github',label:'私有仓库连接',ok:true,message:'仓库私有、分支可读，日志所有权匹配。尚未执行写入。'});}
  catch(e){checks.push({id:'github',label:'私有仓库连接',ok:false,message:e instanceof GitHubError?(e.status===401?'令牌无效或已过期。':e.status===403?'检查令牌权限、组织批准或 GitHub 请求额度。':e.status===404?'仓库或分支不可访问；空仓库请先创建 README，令牌需选中该仓库。':'GitHub 暂时不可用，请重试。'):e instanceof Error&&e.message==='Data repository must be private'?'数据仓库必须保持 private。':e instanceof Error&&e.message==='Journal owner mismatch'?'日志所有权不匹配；不要修改已有 owner，核对仓库配置。':e instanceof TypeError||e instanceof Error&&/fetch|timeout|abort/i.test(e.message)?'暂时无法连接 GitHub，请检查网络后重试。':'日志索引格式无效或读取失败，请保留数据并重试。'});}
 }
 return checks;
}
