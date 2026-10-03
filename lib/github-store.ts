import {journalSchema, emptyJournal, assertOwner, type Journal} from './travel-data.ts';
export class GitHubError extends Error {status:number;constructor(status:number){super('GitHub request failed');this.status=status;}}
type TreeEntry = {path:string;mode:'100644';type:'blob';sha:string|null};
type Config = {repository:string;branch:string;token:string;ownerId:string};
export class GitHubStore {
  private deadline=Date.now()+55000;
  private config:Config;
  private transport:typeof fetch;
  constructor(config:Config,transport:typeof fetch=fetch) {this.config=config;this.transport=transport;}
  private async api<T>(path:string,method='GET',body?:unknown) {
    const remaining=this.deadline-Date.now();if(remaining<=0)throw new Error('GitHub operation timed out');
    const r=await this.transport(`https://api.github.com/repos/${this.config.repository}${path}`,{method,headers:{Authorization:`Bearer ${this.config.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(Math.min(10000,remaining))});
    if(!r.ok)throw new GitHubError(r.status);
    return r.json() as Promise<T>;
  }
  private async snapshot() {
    // Check visibility each time; a repository made public must fail closed.
    const repo=await this.api<{private:boolean}>('');
    if(repo.private!==true)throw new Error('Data repository must be private');
    const ref=await this.api<{object:{sha:string}}>(`/git/ref/heads/${encodeURIComponent(this.config.branch)}`);
    const commit=await this.api<{tree:{sha:string}}>(`/git/commits/${ref.object.sha}`);
    let journal:Journal;
    try {
      const file=await this.api<{encoding:string;size:number;content:string}>(`/contents/travel/index.json?ref=${ref.object.sha}`);
      if(file.encoding!=='base64'||file.size>512*1024)throw new Error('Journal too large');
      journal=journalSchema.parse(JSON.parse(Buffer.from(file.content,'base64').toString('utf8')));
    } catch(e) {
      if(e instanceof GitHubError&&e.status===404)journal=emptyJournal(this.config.ownerId);else throw e;
    }
    assertOwner(journal,this.config.ownerId);
    return {head:ref.object.sha as string,tree:commit.tree.sha as string,journal};
  }
  async read(owner:string) {if(owner!==this.config.ownerId)throw new Error("Owner denied");return (await this.snapshot()).journal;}
  async blob(bytes:Uint8Array) {return (await this.api<{sha:string}>('/git/blobs','POST',{encoding:'base64',content:Buffer.from(bytes).toString('base64')})).sha as string;}
  async photo(id:string,owner:string,publishedOnly=false) {
    if(owner!==this.config.ownerId)throw new Error('Owner denied');
    const journal=await this.read(owner);
    const row=journal.photos.find(p=>p.id===id&&p.owner===owner);
    if(!row||row.removed||(publishedOnly&&!journal.checkins.some(v=>v.id===row.checkin&&v.published)))return null;
    const blob=await this.api<{encoding:string;size:number;content:string}>(`/git/blobs/${row.sha}`);
    if(blob.encoding!=='base64'||blob.size>3*1024*1024)throw new Error('Invalid photo blob');
    return Buffer.from(blob.content,'base64');
  }
  async mutate(owner:string,change:(journal:Journal)=>{changed:boolean;files?:TreeEntry[]}) {
    if(owner!==this.config.ownerId)throw new Error('Owner denied');
    for(let attempt=0;attempt<3;attempt++) {
      const state=await this.snapshot();
      const result=change(state.journal);
      if(!result.changed)return;
      assertOwner(state.journal,owner);
      const content=JSON.stringify(state.journal);
      if(Buffer.byteLength(content)>512*1024)throw new Error('Journal size limit reached');
      const tree=await this.api<{sha:string}>('/git/trees','POST',{base_tree:state.tree,tree:[{path:'travel/index.json',mode:'100644',type:'blob',content},...(result.files??[])]});
      const commit=await this.api<{sha:string}>('/git/commits','POST',{message:'Update private travel journal',tree:tree.sha,parents:[state.head]});
      try {await this.api(`/git/refs/heads/${encodeURIComponent(this.config.branch)}`,'PATCH',{sha:commit.sha,force:false});return;}
      catch(e) {if(!(e instanceof GitHubError)||![409,422].includes(e.status))throw e;}
    }
    throw new Error('Concurrent update; retry the same request');
  }
}
