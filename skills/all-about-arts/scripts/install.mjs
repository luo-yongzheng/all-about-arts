#!/usr/bin/env node
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {PACKAGE_ROOT} from '../lib/project.mjs';import {exists,run,canonicalDestination} from '../lib/util.mjs';
export async function install({host='both',scope='project',root=process.cwd(),copy=false,dependencies=false}={}){
 if(!['codex','claude','antigravity','both'].includes(host)||!['project','user'].includes(scope))throw Error('host: codex|claude|antigravity|both; scope: project|user');
 const installRoot=path.resolve(root),actualRoot=await canonicalDestination(installRoot),skill=await fs.realpath(PACKAGE_ROOT);if(actualRoot===skill||actualRoot.startsWith(skill+path.sep))throw Error('Install root must be outside the Skill package');
 const installations=[];for(const h of host==='both'?['codex','claude']:[host]){
  // Codex and current Antigravity App/IDE share workspace discovery. Keep one
  // canonical package so registering either host cannot create a diverging copy.
  const userParent=h==='codex'?path.join(process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),'skills'):path.join(os.homedir(),h==='antigravity'?'.gemini/config/skills':'.claude/skills');
  const requestedParent=scope==='user'?userParent:path.join(installRoot,h==='claude'?'.claude/skills':'.agents/skills');
  const parent=await canonicalDestination(requestedParent);if(parent===skill||parent.startsWith(skill+path.sep))throw Error('Install destination must be outside the Skill package');
  const dest=path.join(parent,'all-about-arts');await fs.mkdir(parent,{recursive:true});
  try{const stat=await fs.lstat(dest);if(stat.isSymbolicLink()&&await fs.realpath(dest)===await fs.realpath(PACKAGE_ROOT)){installations.push({host:h,path:dest,method:'existing-link'});continue;}throw Error(`Skill already exists: ${dest}. Preserve it and choose a different install root.`);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(copy){await fs.cp(PACKAGE_ROOT,dest,{recursive:true,filter:src=>!src.split(path.sep).includes('node_modules')});if(dependencies)await run('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:dest});}
  else await fs.symlink(path.relative(await fs.realpath(parent),await fs.realpath(PACKAGE_ROOT)),dest,'dir');
  installations.push({host:h,path:dest,method:copy?'copy':'link',dependencies:copy?dependencies:true});
 }
 return {status:'success',installations};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {parseArgs}=await import('./aaa.mjs');const {flags}=parseArgs(process.argv.slice(2));
 install({host:flags.host??'both',scope:flags.scope??'project',root:flags.root??process.cwd(),copy:!!flags.copy,dependencies:!!flags.dependencies}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'failure',error:{message:e.message}}));process.exitCode=1;});
}
