import fs from 'node:fs/promises';import path from 'node:path';
import {sha256,readJSON,writeJSON,safePath,exists,withLock} from './util.mjs';import {readConfig} from './project.mjs';
export async function importAsset(project,{file,id,source='user',license='user-provided',purpose='reference',required=true,requestId}={}) {
  if(!file)throw Error('Asset file required');const data=await fs.readFile(file),hash=sha256(data),ext=path.extname(file).toLowerCase();
  if(!/^[.a-z0-9_-]*$/.test(ext))throw Error('Unsupported asset extension');
  id??=`asset-${hash.slice(0,12)}`;if(!/^[\w-]+$/.test(id))throw Error('Asset id must contain letters, numbers, _ or -');
  return withLock(path.join(project,'.aaa/state/build.lock'),async()=>{
    const c=await readConfig(project),rel=`assets/${hash}${ext}`,dest=await safePath(project,rel);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data);
    const asset={id,path:rel,sha256:hash,bytes:data.length,source,license,purpose,required,requestId,restore:{method:source==='user'?'reimport-original':'host-receipt',source}};
    c.assets=[...(c.assets??[]).filter(x=>x.id!==id),asset];await writeJSON(path.join(project,'aaa.json'),c);return asset;
  });
}
export async function checkAssets(project,config) {
  const c=config??await readConfig(project),checks=[];
  for(const a of c.assets??[]){try {const f=await safePath(project,a.path);const b=await fs.readFile(f);if(a.sha256&&sha256(b)!==a.sha256)throw Error('checksum mismatch');checks.push({id:a.id,status:'success',path:a.path});}catch(e){checks.push({id:a.id,status:a.required===false?'not-checked':'failure',path:a.path,message:`${a.path}: ${e.code==='ENOENT'?'missing file':e.message}`,restore:a.restore??{method:'reimport-original'}});}}
  if(c.content?.image&&!c.assets?.some(a=>a.path===c.content.image||a.id===c.content.image)){try{await fs.access(await safePath(project,c.content.image));checks.push({id:'content.image',status:'success'});}catch{checks.push({id:'content.image',status:'failure',message:`Missing content.image: ${c.content.image}`});}}
  return {status:checks.some(x=>x.status==='failure')?'failure':checks.some(x=>x.status==='not-checked')?'not-checked':'success',checks};
}
export async function generationRequest(project,{prompt,kind='image',constraints={}}={}) {
  if(!prompt?.trim())throw Error('Generation prompt required');const id=sha256(JSON.stringify({prompt,kind,constraints})).slice(0,24),file=path.join(project,'.aaa/state/generation',`${id}.json`);
  if(await exists(file)){const r=await readJSON(file);if(r.asset){const assetPath=await safePath(project,r.asset.path);if(await exists(assetPath)&&sha256(await fs.readFile(assetPath))===r.asset.sha256)return {...r,status:'success',reused:true};}}
  const r={id,status:'not-checked',kind,prompt,constraints,requires:'Use an available host tool or an explicitly configured service within existing authorization and budget; then record the output receipt.'};await writeJSON(file,r);return r;
}
export async function recordGenerated(project,{requestId,file,provider,license,source}={}) {
  if(!/^[a-f0-9]{24}$/.test(requestId??''))throw Error('Invalid generation request id');if(!provider||!license)throw Error('Provider and license/source terms required');
  const receipt=path.join(project,'.aaa/state/generation',`${requestId}.json`),r=await readJSON(receipt);
  const asset=await importAsset(project,{file,id:`generated-${requestId}`,requestId,source:source??`generated:${provider}`,license,purpose:r.kind});
  const result={...r,status:'success',asset,provider,recordedAt:new Date().toISOString(),provenance:'agent-reported'};await writeJSON(receipt,result);return result;
}
