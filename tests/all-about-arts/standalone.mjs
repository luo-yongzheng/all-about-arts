// Offline production from a physical package copy outside this repository.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execute=promisify(execFile);
const repository=fileURLToPath(new URL('../../',import.meta.url));
const output=path.join(repository,'artifacts/all-about-arts/standalone',`independent-${Date.now()}`);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'aaa independent 独立 '));
const independent=await fs.realpath(temp);
const skill=path.join(independent,'skills/all-about-arts');
const report={status:'failure',startedAt:new Date().toISOString(),scope:'Physical package copy outside the repository; three host entry paths, eight short silent renders, revision and evidence reuse. Not host-model or creative certification.',independentRoot:independent,output,results:[]};
const env={...process.env,NODE_PATH:'',NODE_OPTIONS:''};
const json=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2)+'\n');};
const invoke=async(script,args)=>{
 const {stdout}=await execute(process.execPath,[script,...args],{cwd:independent,env,maxBuffer:16*1024*1024,timeout:180000});
 const result=JSON.parse(stdout);assert.equal(result.status,'success',JSON.stringify(result));return result;
};
const call=(cli,args)=>invoke(cli,[...args,'--json']);
async function countFiles(directory){
 let count=0;for(const entry of await fs.readdir(directory,{withFileTypes:true})){
  assert.equal(entry.isSymbolicLink(),false,`Package copy must not link back to another directory: ${entry.name}`);
  count+=entry.isDirectory()?await countFiles(path.join(directory,entry.name)):1;
 }return count;
}

try{
 assert.ok(!independent.startsWith(await fs.realpath(repository)+path.sep));
 await fs.cp(path.join(repository,'skills/all-about-arts'),skill,{recursive:true,dereference:true});
 report.copiedFiles=await countFiles(skill);
 const installer=path.join(skill,'scripts/install.mjs');
 report.installation=await invoke(installer,['--host','both','--root',independent]);
 report.antigravity=await invoke(installer,['--host','antigravity','--root',independent]);
 const hosts=[...report.installation.installations,...report.antigravity.installations];
 report.hosts=[];
 for(const host of hosts){
  assert.equal(await fs.realpath(host.path),skill);
  const cli=path.join(host.path,'scripts/aaa.mjs');
  const doctor=await call(cli,['doctor']);
  const styles=(await call(cli,['styles'])).styles;
  assert.equal(styles.length,51);assert.equal(styles.filter(s=>s.status==='integrated').length,8);
  report.hosts.push({host:host.host,entry:host.path,doctor,styles:styles.length});
 }
 const cli=path.join(skill,'scripts/aaa.mjs');
 const styles=(await call(cli,['styles'])).styles.filter(s=>s.status==='integrated');
 for(const [index,style] of styles.entries()){
  const host=hosts[index%hosts.length],hostCli=path.join(host.path,'scripts/aaa.mjs');
  const project=path.join(independent,`${style.id} 独立作品`),portrait=index%2===1;
  await call(hostCli,['init',project,'--style',style.id,'--title','A new idea','--duration','2','--size',portrait?'360x640':'640x360','--fps','12']);
  const still=await call(hostCli,['still',project,'--time','1']);
  const render=await call(hostCli,['render',project,'--workers','2']);
  assert.equal(render.frames,24);assert.equal(render.duration,2);
  const check=await call(hostCli,['check',project,'--video',render.path]);
  const evidence=path.join(output,style.id);await fs.mkdir(evidence,{recursive:true});
  await fs.copyFile(still.path,path.join(evidence,'still.png'));
  await fs.copyFile(render.path,path.join(evidence,'film.mp4'));
  await fs.copyFile(path.join(project,'aaa.json'),path.join(evidence,'aaa.json'));
  await json(path.join(evidence,'check.json'),check);
  report.results.push({style:style.id,host:host.host,status:'success',project,render,evidence});
  console.log(`${style.id}: independent render and check passed`);
 }
 // An actual content/duration change must invalidate the previous build.
 const target=report.results.at(-1).project;
 const configPath=path.join(target,'aaa.json'),config=JSON.parse(await fs.readFile(configPath,'utf8'));
 config.duration=3;config.scenes.at(-1).end=3;config.scenes.at(-1).body='Hold this idea a little longer.';
 await json(configPath,config);
 const revised=await call(cli,['render',target,'--workers','2']);
 assert.equal(revised.frames,36);assert.notEqual(revised.sourceHash,report.results.at(-1).render.sourceHash);
 const revisionCheck=await call(cli,['check',target,'--video',revised.path]);
 const revisionEvidence=path.join(output,'revision');await fs.mkdir(revisionEvidence,{recursive:true});
 await fs.copyFile(revised.path,path.join(revisionEvidence,'film.mp4'));await fs.copyFile(configPath,path.join(revisionEvidence,'aaa.json'));await json(path.join(revisionEvidence,'check.json'),revisionCheck);
 report.revision={status:'success',render:revised,evidence:revisionEvidence};

 // Two independent technical cases support this deliberately narrow lesson.
 const source=report.results[0].project;
 await fs.mkdir(path.join(source,'evidence'));
 for(const [index,result] of report.results.slice(0,2).entries())await json(path.join(source,'evidence',`case-${index}.json`),{case:result.style,claim:'Independent copy rendered 24 frames and passed video checks in this environment',render:result.render,check:JSON.parse(await fs.readFile(path.join(result.evidence,'check.json'),'utf8'))});
 const lesson=await call(cli,['learn',source,'add','--kind','verified','--text','These two 2-second silent cases rendered successfully from this independent copy on this machine; other formats and creative quality were not evaluated here.','--evidence','evidence/case-0.json,evidence/case-1.json']);
 const reused=await call(cli,['learn',target,'reuse','--from',source,'--id',lesson.result.id]);
 await fs.rm(source,{recursive:true});
 const listed=await call(cli,['learn',target,'list']);
 assert.equal(listed.entries.find(e=>e.id===reused.result.id).reusable,true);
 report.learning={status:'success',sourceProjectDeleted:true,entries:listed.entries};
 await fs.cp(path.join(target,'.aaa/state/learning-evidence'),path.join(output,'learning-evidence'),{recursive:true});
 report.status='success';
}catch(error){report.error=error.stack;process.exitCode=1;}
finally{
 report.completedAt=new Date().toISOString();await json(path.join(output,'results.json'),report);
 await fs.rm(temp,{recursive:true,force:true});
 console.log(JSON.stringify({status:report.status,path:path.join(output,'results.json'),error:report.error}));
}
