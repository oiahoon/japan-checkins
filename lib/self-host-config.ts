import {createHash} from 'node:crypto';
import {validPasswordHash} from './password.ts';
export function githubMode() { return process.env.AUTH_PROVIDER !== 'sites'; }
export function authProvider(){const value=process.env.AUTH_PROVIDER||'password';if(!['password','github','sites'].includes(value))throw new Error('Invalid AUTH_PROVIDER');return value;}
export function siteConfig() {
  const origin = new URL(required('APP_URL'));
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('APP_URL must be an origin');
  const local = ['localhost', '127.0.0.1'].includes(origin.hostname);
  if (origin.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local && origin.protocol === 'http:')) throw new Error('APP_URL requires HTTPS');
  const secret = required('SESSION_SECRET');
  if (secret.length < 32) throw new Error('SESSION_SECRET needs at least 32 characters');
  const ownerId=process.env.JOURNAL_OWNER_ID||process.env.GITHUB_ALLOWED_USER_ID||'journal-owner';
  const visibility=process.env.JOURNAL_VISIBILITY||'private';
  if(!['private','public'].includes(visibility))throw new Error('Invalid visibility');
  return {origin:origin.origin,secure:origin.protocol==='https:',secret,ownerId,visibility};
}
export function authConfig() {
  const base=siteConfig();
  const ownerId=required('GITHUB_ALLOWED_USER_ID');if(!/^\d+$/.test(ownerId)||base.ownerId!==ownerId)throw new Error('Invalid GitHub owner ID');
  return {...base,clientId:required('GITHUB_CLIENT_ID'),clientSecret:required('GITHUB_CLIENT_SECRET')};
}
export function passwordConfig(){
  const base=siteConfig(),adminHash=required('ADMIN_PASSWORD_HASH'),viewerHash=process.env.VIEWER_PASSWORD_HASH||'';
  if(!validPasswordHash(adminHash)||(viewerHash&&!validPasswordHash(viewerHash)))throw new Error('Use npm run password:hash');
  if(adminHash===viewerHash)throw new Error('Use distinct management and visitor passwords');
  const version=createHash('sha256').update(base.secret+'|'+adminHash+'|'+viewerHash).digest('hex').slice(0,24);
  return {...base,adminHash,viewerHash,version};
}
export function repoConfig() {
  const repository = required('GITHUB_DATA_REPOSITORY');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Use owner/repository');
  const branch = process.env.GITHUB_DATA_BRANCH || 'main';
  if (!/^[A-Za-z0-9_-]+$/.test(branch)) throw new Error('Use a simple data branch name');
  return { repository, branch, token: required('GITHUB_DATA_TOKEN'), ownerId: siteConfig().ownerId };
}
function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; }
