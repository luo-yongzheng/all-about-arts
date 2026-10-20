import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
export const exists = async file => {try {await fs.access(file);return true;} catch{return false;}};
export const readJSON = async file => JSON.parse(await fs.readFile(file,'utf8'));
export async function atomicWrite(file, data) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  const tmp=`${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {await fs.writeFile(tmp,data);await fs.rename(tmp,file);} finally {await fs.rm(tmp,{force:true});}
}
export const writeJSON = (file,value) => atomicWrite(file,JSON.stringify(value,null,2)+'\n');
// Resolve existing links before appending any not-yet-created path components.
// A dangling link is an existing entry, so realpath must fail instead of treating
// its name as a new ordinary directory.
export async function canonicalDestination(target) {
  let parent=path.resolve(target);const tail=[];
  while(true){
    try{await fs.lstat(parent);}catch(e){if(e.code!=='ENOENT')throw e;const next=path.dirname(parent);if(next===parent)throw e;tail.unshift(path.basename(parent));parent=next;continue;}
    return path.join(await fs.realpath(parent),...tail);
  }
}
export function relativePath(value) {
  if(typeof value!=='string'||!value||value.includes('\0')||value.includes('\\')||path.isAbsolute(value)||value.split('/').includes('..')||/^[a-z]+:/i.test(value)) throw Error(`Expected a project-relative path: ${value}`);
  return value;
}
export async function safePath(root,rel) {
  relativePath(rel); root=await fs.realpath(root);const candidate=path.resolve(root,rel);
  let parent=candidate;
  while(!await exists(parent)){const next=path.dirname(parent);if(next===parent)break;parent=next;}
  const real=await fs.realpath(parent);
  if(real!==root&&!real.startsWith(root+path.sep)) throw Error(`Path escapes project: ${rel}`);
  return candidate;
}
export async function walk(root,{ignore=()=>false}={}) {
  const files=[];
  async function visit(dir,base='') {for(const e of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const rel=base?`${base}/${e.name}`:e.name;if(ignore(rel,e))continue;
    if(e.isSymbolicLink())throw Error(`Symbolic link is not portable: ${rel}`);
    if(e.isDirectory())await visit(path.join(dir,e.name),rel);else if(e.isFile())files.push(rel);
  }}
  await visit(root);return files;
}
export async function withLock(file,fn) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  // Never steal by age: a slow live render must retain its lock. Crashed locks are
  // removed explicitly after inspecting their owner rather than racing a takeover.
  let handle;try {handle=await fs.open(file,'wx');} catch(e){if(e.code==='EEXIST')throw Error(`Operation locked: ${file}. Inspect the recorded PID before removing a stale lock.`);throw e;}
  await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  try{return await fn();} finally {await handle.close();await fs.rm(file,{force:true});}
}
export function run(command,args,{cwd,input,env,signal,maxBytes=8*1024*1024}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,env:env??process.env,signal,stdio:['pipe','pipe','pipe']});let stdout=[],stderr=[],size=0;
    child.stdout.on('data',b=>{size+=b.length;if(size>maxBytes)child.kill();else stdout.push(b);});
    child.stderr.on('data',b=>{stderr.push(b);if(stderr.length>300)stderr.shift();});
    child.on('error',reject);child.stdin.on('error',()=>{});
    child.on('close',(code,sig)=>{const out=Buffer.concat(stdout),err=Buffer.concat(stderr).toString();if(code===0&&size<=maxBytes)resolve({stdout:out,stderr:err});else reject(Error(`${command} failed (${sig??code}): ${err.slice(-5000)}`));});
    child.stdin.end(input);
  });
}
