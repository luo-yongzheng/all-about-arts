import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const skill=fileURLToPath(new URL('../../.agents/skills/all-about-arts/',import.meta.url));
const catalog=JSON.parse(await fs.readFile(path.join(skill,'styles/catalog.json'),'utf8'));
function cli(args,cwd=os.tmpdir()){
  const result=spawnSync(process.execPath,[path.join(skill,'scripts/aaa.mjs'),...args,'--json'],{cwd,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});
  assert.equal(result.status,0,result.stderr||result.stdout);
  return JSON.parse(result.stdout);
}

test('agent style listing exposes every native route and explains legacy availability',()=>{
  const result=cli(['styles']);
  assert.equal(result.total,99);assert.equal(result.matched,99);
  assert.deepEqual(result.statusDefinitions,catalog.statusDefinitions);
  assert.deepEqual(result.nativeStatusDefinitions,catalog.nativeStatusDefinitions);
  assert.deepEqual(result.styles.map(s=>s.id),catalog.styles.map(s=>s.id));
  assert.equal(result.styles.filter(s=>s.status==='reference').length,91);
  for(const style of result.styles)assert.equal(style.native.status,'source-available');
});

test('every style is discoverable by slug, English name and Chinese name',()=>{
  for(const style of catalog.styles){
    for(const name of new Set([style.id,style.en,style.cn])){
      const result=cli(['styles',name]);
      assert.ok(result.styles.some(s=>s.id===style.id),`${name} must find ${style.id}`);
    }
  }
});

test('style searches use all query words and descriptive fields rather than implementation metadata',()=>{
  assert.equal(cli(['styles','whiteboard','Explainers']).matched,1);
  assert.equal(cli(['styles','whiteboard','does-not-exist']).matched,0);
  assert.equal(cli(['styles','source-available']).matched,0);
  assert.ok(cli(['styles','Game','Show','Flat']).styles.some(s=>s.id==='game-show'),'former names (aka) are searchable');
});

test('all 99 listed project commands create native authoring scaffolds without rendering',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aaa all styles '));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  for(const style of catalog.styles){
    const args=style.native.projectCommand.split(' ').map(arg=>arg==='<project>'?style.id:arg);
    const result=cli(args,dir);
    assert.equal(result.status,'success');assert.equal(result.style,style.id);assert.equal(result.stage,'scaffold');
    assert.equal(await fs.realpath(result.styleGuide),await fs.realpath(path.join(skill,style.native.style)));
    const config=JSON.parse(await fs.readFile(path.join(result.project,'lemo-project.json'),'utf8'));
    assert.equal(config.style,style.id);
    for(const file of ['index.html','film.mjs','TREATMENT.md','STORYBOARD.md','build.sh'])await fs.access(path.join(result.project,file));
  }
});
