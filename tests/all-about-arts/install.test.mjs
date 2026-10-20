import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {install} from '../../skills/all-about-arts/scripts/install.mjs';
import {run} from '../../skills/all-about-arts/lib/util.mjs';
test('both hosts discover the same package and repeated installation is non-destructive',async t=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa 安装 '));t.after(()=>fs.rm(d,{recursive:true,force:true}));const r=await install({host:'both',root:d});assert.equal(r.installations.length,2);for(const x of r.installations)assert.ok((await fs.readFile(path.join(x.path,'SKILL.md'),'utf8')).includes('all-about-arts'));const again=await install({host:'both',root:d});assert.equal(again.status,'success');});
test('installer refuses an unrelated existing skill',async t=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-install-'));t.after(()=>fs.rm(d,{recursive:true,force:true}));const dest=path.join(d,'.claude/skills/all-about-arts');await fs.mkdir(dest,{recursive:true});await fs.writeFile(path.join(dest,'user.txt'),'keep');await assert.rejects(install({host:'claude',root:d}));assert.equal(await fs.readFile(path.join(dest,'user.txt'),'utf8'),'keep');});
test('Antigravity reuses the workspace skill shared with Codex and can execute its CLI',async t=>{
 const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa Antigravity 项目 '));t.after(()=>fs.rm(d,{recursive:true,force:true}));
 const codex=await install({host:'codex',root:d}),before=await fs.readlink(codex.installations[0].path);
 const result=await install({host:'antigravity',root:d});assert.equal(result.installations.length,1);assert.equal(result.installations[0].host,'antigravity');
 const skill=path.join(d,'.agents/skills/all-about-arts');assert.equal(result.installations[0].path,await fs.realpath(path.dirname(skill)).then(parent=>path.join(parent,'all-about-arts')));assert.equal(await fs.readlink(skill),before,'existing shared skill is preserved');
 const cli=path.join(skill,'scripts/aaa.mjs');const styles=JSON.parse((await run(process.execPath,[cli,'styles','--json'],{cwd:d})).stdout.toString());assert.equal(styles.status,'success');assert.equal(styles.styles.length,51);
});
