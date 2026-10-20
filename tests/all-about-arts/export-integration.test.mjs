import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {defaultConfig,initProject,PACKAGE_ROOT} from '../../skills/all-about-arts/lib/project.mjs';
import {checkProject} from '../../skills/all-about-arts/lib/check.mjs';
import {renderProject} from '../../skills/all-about-arts/lib/render.mjs';
import {exportProject} from '../../skills/all-about-arts/lib/export.mjs';
import {readJSON,writeJSON,run,sha256} from '../../skills/all-about-arts/lib/util.mjs';

async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa delivery 中文 '));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const project=path.join(root,'original');
  const config=defaultConfig({duration:1,style:'pixel-rpg',title:'A portable film'});
  Object.assign(config,{width:640,height:360,fps:4});
  await initProject(project,{config});
  return {root,project,config};
}

test('a source-only check remains not-checked and ignores stale rendered output',async t=>{
  const {project}=await fixture(t);
  await writeJSON(path.join(project,'out/render.json'),{status:'success',sourceHash:'stale',path:'/missing/old-film.mp4',outputHash:'old'});
  const report=await checkProject(project);
  assert.equal(report.status,'not-checked');
  assert.equal(report.checks.find(c=>c.id==='encoded-video').status,'not-checked');
  await assert.rejects(exportProject(project,{rebuild:false}),/stale/);
});

test('render then check exports a package that renders after relocation without the original project',async t=>{
  const {root,project}=await fixture(t);
  const rendered=await renderProject(project);
  const report=await checkProject(project);
  assert.equal(report.status,'success');
  assert.equal(report.checks.find(c=>c.id==='encoded-video').status,'success');
  assert.equal(report.output.sha256,rendered.outputHash);
  const delivery=await exportProject(project);
  assert.equal(delivery.status,'success');
  assert.equal((await fs.lstat(path.join(delivery.path,'toolkit/node_modules/.bin/playwright-core'))).isSymbolicLink(),false);
  const manifest=await readJSON(path.join(delivery.path,'manifest.json'));
  for(const entry of manifest.files)assert.equal(sha256(await fs.readFile(path.join(delivery.path,entry.path))),entry.sha256,entry.path);
  const relocated=path.join(root,'relocated delivery');
  await fs.rename(delivery.path,relocated);
  await fs.rm(project,{recursive:true});
  const result=await run(process.execPath,['toolkit/scripts/aaa.mjs','render','source','--json'],{cwd:relocated,env:{...process.env,NODE_PATH:''}});
  const rerendered=JSON.parse(result.stdout.toString());
  assert.equal(rerendered.status,'success');
  assert.equal(rerendered.frames,4);
  assert.equal(rerendered.width,640);
  assert.ok((await fs.stat(path.join(relocated,'source/out/film.mp4'))).size>100);
});

test('export refreshes incomplete evidence without rebuilding a current video and rejects later tampering',async t=>{
  const {project}=await fixture(t);
  const rendered=await renderProject(project);
  const original=await readJSON(path.join(project,'out/check.json'));
  await writeJSON(path.join(project,'out/check.json'),{...original,status:'not-checked',output:undefined,checks:original.checks.map(c=>c.id==='encoded-video'?{id:c.id,status:'not-checked'}:c)});
  const delivery=await exportProject(project,{rebuild:false});
  assert.equal(delivery.status,'success');
  assert.equal((await readJSON(path.join(project,'out/render.json'))).checkedAt,rendered.checkedAt);
  assert.equal((await readJSON(path.join(project,'out/check.json'))).status,'success');
  await fs.appendFile(rendered.path,'changed after render');
  const report=await checkProject(project);
  assert.equal(report.status,'failure');
  assert.equal(report.checks.find(c=>c.id==='encoded-video').status,'failure');
  await assert.rejects(exportProject(project,{rebuild:false}),/changed|validation/);
});

test('delivery rejects destinations within the toolkit including a symlinked parent before creating files',async t=>{
  const {root,project}=await fixture(t);
  const name=`review-delivery-${path.basename(root)}`;
  const direct=path.join(PACKAGE_ROOT,name);
  const alias=path.join(root,'toolkit-alias');
  await fs.symlink(PACKAGE_ROOT,alias);
  for(const out of [direct,path.join(alias,name)])await assert.rejects(exportProject(project,{out,rebuild:false}),/toolkit/i);
  await assert.rejects(fs.access(direct),{code:'ENOENT'});
});

test('an out symlink back into source cannot bypass recursive-copy protection',async t=>{
  const {project}=await fixture(t);
  await fs.symlink(project,path.join(project,'out'));
  await assert.rejects(exportProject(project,{out:path.join(project,'out/delivery'),rebuild:false}),/outside the project/);
  await assert.rejects(fs.access(path.join(project,'delivery')),{code:'ENOENT'});
});
