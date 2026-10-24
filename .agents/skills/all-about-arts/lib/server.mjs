import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
import {PACKAGE_ROOT,readConfig,validateConfig,fingerprint} from './project.mjs';
import {safePath,writeJSON,withLock} from './util.mjs';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4','.wav':'audio/wav','.srt':'text/plain; charset=utf-8'};
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(Error('JSON body required'),{statusCode:415});let text='';for await(const b of req){text+=b;if(text.length>2*1024*1024)throw Object.assign(Error('Body too large'),{statusCode:413});}return JSON.parse(text||'{}');}
export async function resolvedConfig(project){const config=await readConfig(project);const {resolveTimeline}=await import('./timeline.mjs');const timeline=resolveTimeline(config);return {...config,scenes:timeline.scenes,audio:{...config.audio,sfx:timeline.sfx}};}
export async function startServer({project,studio=false,configOverride,port=0}={}) {
  project=path.resolve(project);let url,preparedAudio=null;
  const server=http.createServer(async(req,res)=>{try{
    if(req.headers.host!==new URL(url).host)return json(res,403,{status:'failure',error:{message:'Invalid Host'}});
    if(req.headers.origin&&req.headers.origin!==url)return json(res,403,{status:'failure',error:{message:'Cross-origin requests are forbidden'}});
    const u=new URL(req.url,url),p=decodeURIComponent(u.pathname);
    if(p.startsWith('/api/')) {
      if(!studio)return json(res,404,{status:'failure',error:{message:'Studio API disabled'}});
      const method=req.method;
      if(p==='/api/prepare'&&method==='POST'){await body(req);preparedAudio=null;return json(res,200,await withLock(path.join(project,'.aaa/state/build.lock'),async()=>{const before=await fingerprint(project),config=await readConfig(project);const {checkAssets}=await import('./assets.mjs');const assets=await checkAssets(project,config);if(assets.status==='failure')throw Error('Required preview assets are missing or changed');const {buildAudio}=await import('./audio.mjs');const audio=await buildAudio(project,config);const {resolveTimeline}=await import('./timeline.mjs');const timeline=resolveTimeline(config,audio.words);if(await fingerprint(project)!==before)throw Error('Source changed while preparing preview');preparedAudio=audio.path;return {status:'success',config:{...config,scenes:timeline.scenes},fingerprint:before,audio:{url:audio.path?'/media/audio.wav':null,precision:audio.precision,fingerprint:audio.fingerprint}};}));}
      if(p==='/api/project'&&method==='GET')return json(res,200,{config:await readConfig(project),fingerprint:await fingerprint(project)});
      if(p==='/api/notes'){const {listInbox,addNote}=await import('./inbox.mjs');if(method==='GET')return json(res,200,await listInbox(project));if(method==='POST')return json(res,200,await addNote(project,await body(req)));}
      if(p.startsWith('/api/notes/')&&method==='PATCH'){const {updateNote}=await import('./inbox.mjs');const b=await body(req);return json(res,200,await updateNote(project,p.slice(11),b.status));}
      if(p==='/api/history'&&method==='GET'){const {history}=await import('./history.mjs');return json(res,200,await history(project));}
      if(p==='/api/save'&&method==='POST'){const b=await body(req);return json(res,200,await withLock(path.join(project,'.aaa/state/build.lock'),async()=>{const old=await fingerprint(project);if(!b.expectedFingerprint||b.expectedFingerprint!==old)throw Object.assign(Error('Project changed. Reload before saving.'),{statusCode:409});validateConfig(b.config);const {snapshot}=await import('./history.mjs');await snapshot(project,{message:'Before Studio parameter edit'});await writeJSON(path.join(project,'aaa.json'),b.config);return {status:'success',config:b.config,fingerprint:await fingerprint(project)};}));}
      if(p==='/api/undo'&&method==='POST'){const b=await body(req);const {undo}=await import('./history.mjs');return json(res,200,await withLock(path.join(project,'.aaa/state/build.lock'),()=>undo(project,b)));}
      if(p==='/api/render'&&method==='POST'){const b=await body(req);const {renderProject}=await import('./render.mjs');return json(res,200,await renderProject(project,{format:b.format??'mp4'}));}
      if(p==='/api/export'&&method==='POST'){await body(req);const {exportProject}=await import('./export.mjs');return json(res,200,await exportProject(project));}
      return json(res,404,{status:'failure',error:{message:'Unknown API route'}});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{status:'failure',error:{message:'Method not allowed'}});
    let root,rel;
    if(p==='/media/audio.wav'&&studio&&preparedAudio){root=path.dirname(preparedAudio);rel=path.basename(preparedAudio);}
    else if(p.startsWith('/film/')){root=project;rel=p.slice(6)||'index.html';if(rel==='aaa.json'&&(configOverride||studio))return json(res,200,configOverride??await resolvedConfig(project));}
    else if(studio&&['/','/index.html','/studio.js','/studio.css'].includes(p)){root=path.join(PACKAGE_ROOT,'studio');rel=p==='/'?'index.html':p.slice(1);}
    else return json(res,404,{status:'failure',error:{message:'Not found'}});
    if(rel.split('/').some(x=>x==='..'||x==='.git'||x==='.env'||(x.startsWith('.')&&x!=='.aaa'))||rel.startsWith('.aaa/state/')||rel==='aaa.local.json')return json(res,403,{status:'failure',error:{message:'Private path'}});
    const file=await safePath(root,rel);const stat=await fs.stat(file);if(!stat.isFile())return json(res,404,{status:'failure',error:{message:'Not a file'}});
    let data=await fs.readFile(file);const headers={'content-type':MIME[path.extname(file)]??'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff','accept-ranges':'bytes'};
    if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m)return json(res,416,{status:'failure',error:{message:'Invalid range'}});const a=+m[1],b=m[2]?Math.min(+m[2],data.length-1):data.length-1;if(a>b)return json(res,416,{status:'failure',error:{message:'Range out of bounds'}});headers['content-range']=`bytes ${a}-${b}/${data.length}`;data=data.subarray(a,b+1);res.writeHead(206,{...headers,'content-length':data.length});}else res.writeHead(200,{...headers,'content-length':data.length});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){json(res,e.statusCode??(e.code==='ENOENT'?404:400),{status:'failure',error:{message:e.message}});}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});url=`http://127.0.0.1:${server.address().port}`;
  return {url,server,close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
