import path from 'node:path';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {safePath,sha256} from './util.mjs';
import {readJSON,atomicJSON,stateDirectory,withStateLock,checkedPath} from './studio-state.mjs';

const kinds=['preference','observation','verified'];
async function entriesAt(state){
 const entries=await readJSON(path.join(state,'learning.json'),[],'learning');
 if(!Array.isArray(entries)||entries.some(e=>!e||typeof e.id!=='string'||!kinds.includes(e.kind)||typeof e.text!=='string'||!Array.isArray(e.evidence)))throw Error('Invalid learning store');
 return entries;
}
function distinctEvidence(records){return records.length>=2&&new Set(records.map(e=>e.path)).size>=2&&new Set(records.map(e=>e.sha256)).size>=2;}
async function append(state,entry){const entries=await entriesAt(state);entries.push(entry);await atomicJSON(path.join(state,'learning.json'),entries);return entry;}
function entryFor(kind,text,evidence){return {id:randomUUID(),kind,text:text.trim(),evidence,scope:'project',createdAt:new Date().toISOString(),public:false};}

export async function recordLearning(project,{kind='observation',text,evidence=[]}={}){
 if(!kinds.includes(kind)||typeof text!=='string'||!text.trim())throw Error('kind must be preference, observation or verified, with nonempty text');
 if(!Array.isArray(evidence))throw Error('Evidence must be project-relative file paths');
 const records=[];for(const rel of evidence){const file=await safePath(project,rel);records.push({path:rel,sha256:sha256(await fs.readFile(file))});}
 if(kind==='verified'&&!distinctEvidence(records))throw Error('A verified experience needs distinct evidence from at least two cases');
 return withStateLock(project,'learning',state=>append(state,entryFor(kind,text,records)));
}

export async function listLearning(project,{kind}={}){
 if(kind!==undefined&&!kinds.includes(kind))throw Error('Unknown learning kind');
 const entries=[];
 for(const entry of await entriesAt(await stateDirectory(project))){
  if(kind&&entry.kind!==kind)continue;
  const evidenceChecks=[];
  for(const evidence of entry.evidence){
   try{const actual=sha256(await fs.readFile(await safePath(project,evidence.path)));evidenceChecks.push({path:evidence.path,status:actual===evidence.sha256?'success':'failure',reason:actual===evidence.sha256?null:'Evidence changed'});}
   catch(error){evidenceChecks.push({path:evidence.path,status:'failure',reason:error.message});}
  }
  const evidenceStatus=evidenceChecks.some(e=>e.status==='failure')?'failure':evidenceChecks.length?'success':'not-checked';
  entries.push({...entry,evidenceStatus,evidenceChecks,reusable:entry.kind==='verified'&&evidenceStatus==='success'&&distinctEvidence(entry.evidence)});
 }
 return {status:'success',entries};
}

export async function reuseLearning(project,{from,id}={}){
 if(typeof from!=='string'||typeof id!=='string')throw Error('Reuse needs a source project and entry id');
 const source=(await listLearning(from)).entries.find(e=>e.id===id);
 if(!source||source.kind!=='verified')throw Error('Only a selected verified lesson can be reused');
 if(!source.reusable)throw Error('Evidence is missing, changed or not distinct; verify the lesson again');
 // Copy and recheck bytes so future work does not depend on the source project.
 const contents=[];for(const evidence of source.evidence){const bytes=await fs.readFile(await safePath(from,evidence.path));if(sha256(bytes)!==evidence.sha256)throw Error('Evidence changed while reusing the lesson');contents.push(bytes);}
 return withStateLock(project,'learning',async state=>{
  const parent=path.join(state,'learning-evidence');if(!await checkedPath(parent,{directory:true,optional:true}))await fs.mkdir(parent);
  const entry=entryFor('verified',source.text,[]),directory=path.join(parent,entry.id);await fs.mkdir(directory);
  try{
   for(let i=0;i<contents.length;i++){const name=`${i}${path.extname(source.evidence[i].path)||'.bin'}`;await fs.writeFile(path.join(directory,name),contents[i],{flag:'wx',mode:0o600});entry.evidence.push({path:`.aaa/state/learning-evidence/${entry.id}/${name}`,sha256:sha256(contents[i])});}
   entry.origin={entryId:source.id,importedAt:new Date().toISOString()};return await append(state,entry);
  }catch(error){await fs.rm(directory,{recursive:true,force:true});throw error;}
 });
}
