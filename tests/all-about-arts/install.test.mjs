import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {install} from '../../.agents/skills/all-about-arts/scripts/install.mjs';
import {run} from '../../.agents/skills/all-about-arts/lib/util.mjs';
import {PACKAGE_ROOT} from '../../.agents/skills/all-about-arts/lib/project.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
test('both hosts discover the same package and repeated installation is non-destructive',async t=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa 安装 '));t.after(()=>fs.rm(d,{recursive:true,force:true}));const r=await install({host:'both',root:d});assert.equal(r.installations.length,2);for(const x of r.installations)assert.ok((await fs.readFile(path.join(x.path,'SKILL.md'),'utf8')).includes('all-about-arts'));const again=await install({host:'both',root:d});assert.equal(again.status,'success');});
test('installer refuses an unrelated existing skill',async t=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-install-'));t.after(()=>fs.rm(d,{recursive:true,force:true}));const dest=path.join(d,'.claude/skills/all-about-arts');await fs.mkdir(dest,{recursive:true});await fs.writeFile(path.join(dest,'user.txt'),'keep');await assert.rejects(install({host:'claude',root:d}));assert.equal(await fs.readFile(path.join(dest,'user.txt'),'utf8'),'keep');});
for(const independent of [false,true])test(`installer reuses the physical .agents package in ${independent?'an independent copy':'this repository'} without replacing it`,async t=>{
 let root=fileURLToPath(new URL('../../',import.meta.url)),skill=PACKAGE_ROOT,installHere=install;
 if(independent){
  root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa canonical 独立 '));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  root=await fs.realpath(root);skill=path.join(root,'.agents/skills/all-about-arts');
  // Exercise the independently relocated installer and its real package-root
  // calculation without copying the media library for an installation check.
  for(const relative of ['scripts/install.mjs','lib/project.mjs','lib/util.mjs','SKILL.md']){
   await fs.mkdir(path.dirname(path.join(skill,relative)),{recursive:true});
   await fs.copyFile(path.join(PACKAGE_ROOT,relative),path.join(skill,relative));
  }
  installHere=(await import(pathToFileURL(path.join(skill,'scripts/install.mjs')).href)).install;
 }
 const before=await fs.lstat(skill),source=await fs.readFile(path.join(skill,'SKILL.md'),'utf8');
 assert.equal(before.isSymbolicLink(),false);
 for(const host of ['codex','antigravity']){
  const result=await installHere({host,root,copy:true});
  assert.equal(result.status,'success');assert.equal(result.installations.length,1);
  assert.equal(result.installations[0].host,host);assert.equal(result.installations[0].path,skill);
  assert.equal(result.installations[0].method,'existing-package');
 }
 const after=await fs.lstat(skill);
 assert.equal(after.isSymbolicLink(),false);assert.equal(after.ino,before.ino);
 assert.equal(await fs.readFile(path.join(skill,'SKILL.md'),'utf8'),source);
 await assert.rejects(fs.lstat(path.join(root,'skills/all-about-arts')),{code:'ENOENT'});
});
test('Antigravity reuses the workspace skill shared with Codex and can execute its CLI',async t=>{
 const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa Antigravity 项目 '));t.after(()=>fs.rm(d,{recursive:true,force:true}));
 const codex=await install({host:'codex',root:d}),before=await fs.readlink(codex.installations[0].path);
 const result=await install({host:'antigravity',root:d});assert.equal(result.installations.length,1);assert.equal(result.installations[0].host,'antigravity');
 const skill=path.join(d,'.agents/skills/all-about-arts');assert.equal(result.installations[0].path,await fs.realpath(path.dirname(skill)).then(parent=>path.join(parent,'all-about-arts')));assert.equal(await fs.readlink(skill),before,'existing shared skill is preserved');
 const cli=path.join(skill,'scripts/aaa.mjs');const styles=JSON.parse((await run(process.execPath,[cli,'styles','--json'],{cwd:d})).stdout.toString());assert.equal(styles.status,'success');assert.equal(styles.styles.length,99);
});
