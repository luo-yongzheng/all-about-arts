import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {defaultConfig,PACKAGE_ROOT} from '../../skills/all-about-arts/lib/project.mjs';
import {writeJSON} from '../../skills/all-about-arts/lib/util.mjs';
import {still,renderProject} from '../../skills/all-about-arts/lib/render.mjs';
import {install} from '../../skills/all-about-arts/scripts/install.mjs';

async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa output aliases '));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const project=path.join(root,'project');await fs.mkdir(project);
  const config=defaultConfig({duration:1});Object.assign(config,{width:160,height:90,fps:2});
  await writeJSON(path.join(project,'aaa.json'),config);
  await fs.writeFile(path.join(project,'index.html'),`<style>body{margin:0}</style><canvas width="160" height="90"></canvas><script>const c=window.__AAA_CONFIG,ctx=document.querySelector('canvas').getContext('2d');window.AAA={ready:true,describe:()=>c,render:t=>{ctx.fillStyle='#102040';ctx.fillRect(0,0,160,90);ctx.fillStyle='#ff9050';ctx.fillRect(t*10,20,20,20)},texts:()=>[],regions:()=>[]};</script>`);
  return {root,project};
}

test('still refuses an out-directory alias back into project source without overwriting it',async t=>{
  const {project}=await fixture(t),source=path.join(project,'aaa.json'),before=await fs.readFile(source);
  await fs.symlink(project,path.join(project,'out'));
  await assert.rejects(still(project,{out:path.join(project,'out/aaa.json')}),/Output inside a project/);
  assert.deepEqual(await fs.readFile(source),before);
});

for(const [name,produce] of [['still',still],['render',renderProject]])test(`${name} refuses an existing output symlink to a source file`,async t=>{
  const {project}=await fixture(t),source=path.join(project,'aaa.json'),before=await fs.readFile(source);
  await fs.mkdir(path.join(project,'out'));
  const output=path.join(project,'out',name==='still'?'frame.png':'film.mp4');await fs.symlink(source,output);
  await assert.rejects(produce(project,{out:output}),/Output inside a project/);
  assert.deepEqual(await fs.readFile(source),before);
  assert.equal((await fs.lstat(output)).isSymbolicLink(),true);
});

test('still refuses a toolkit alias before trying to write inside the package',async t=>{
  const {root,project}=await fixture(t),alias=path.join(root,'toolkit-alias');await fs.symlink(PACKAGE_ROOT,alias);
  // An existing directory makes the pre-fix write harmless: it fails with EISDIR.
  await assert.rejects(still(project,{out:path.join(alias,'runtime')}),/Skill package/);
});

for(const nested of [false,true])test(`installer rejects ${nested?'a destination-parent':'an install-root'} alias into the toolkit before writing`,async t=>{
  const {root}=await fixture(t);let installRoot;
  if(nested){installRoot=path.join(root,'install');await fs.mkdir(path.join(installRoot,'.agents'),{recursive:true});await fs.symlink(PACKAGE_ROOT,path.join(installRoot,'.agents/skills'));}
  else{installRoot=path.join(root,'toolkit-alias');await fs.symlink(PACKAGE_ROOT,installRoot);}
  // A safety tripwire keeps the unfixed installer from ever mutating the real
  // package. Path resolution is real; only the first attempted write is blocked.
  t.mock.method(fs,'mkdir',async()=>{throw Error('Test blocked unexpected filesystem mutation');});
  await assert.rejects(install({host:'codex',root:installRoot,copy:true}),/outside the Skill package/);
});

test('an output alias to an external directory remains usable',async t=>{
  const {root,project}=await fixture(t),external=path.join(root,'external'),alias=path.join(root,'external-alias');
  await fs.mkdir(external);await fs.symlink(external,alias);
  const image=await still(project,{out:path.join(alias,'nested/frame.png')});
  assert.equal(image.status,'success');
  assert.ok((await fs.stat(path.join(external,'nested/frame.png'))).size>100);
});
