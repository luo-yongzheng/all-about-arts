import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {excludedSource} from '../../.agents/skills/all-about-arts/scripts/migrate-lemo.mjs';

const root=fileURLToPath(new URL('../../.agents/skills/all-about-arts/',import.meta.url));
const hash=data=>createHash('sha256').update(data).digest('hex');
test('pinned Lemo production source is portable and every retained byte matches its manifest',async()=>{
  const file=path.join(root,'provenance/lemo-snapshot.json');
  assert.ok(await fs.access(file).then(()=>true,()=>false),'upstream production source has not been migrated');
  const manifest=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(manifest.source.commit,'3961ddb3d24d8876e0e2754f7790d66908acee51');
  assert.equal(manifest.schemaVersion,2);
  assert.equal(manifest.files.length,2289);
  assert.equal(manifest.excluded.length,15);
  assert.equal(manifest.source.totalFiles,2304);
  assert.equal(manifest.source.totalBytes,105028600);
  for(const f of manifest.excluded){
    assert.ok(excludedSource(f.sourcePath));
    await assert.rejects(fs.access(path.join(root,'vendor/lemo-opuscar',f.path)));
  }
  let bytes=0;
  for(const f of manifest.files){
    assert.ok(!f.path.split('/').includes('..'));
    assert.ok(!excludedSource(f.sourcePath),f.sourcePath);
    assert.notEqual(path.basename(f.path),'SKILL.md','upstream packaging must not register extra skills');
    const data=await fs.readFile(path.join(root,'vendor/lemo-opuscar',f.path));
    assert.equal(hash(data),f.sha256,f.path);bytes+=data.length;
  }
  assert.equal(bytes,manifest.totalBytes);
  assert.equal(bytes+manifest.excluded.reduce((sum,f)=>sum+f.bytes,0),manifest.source.totalBytes);
  await assert.rejects(fs.access(path.join(root,'vendor/lemo-opuscar/.git')));
});
test('all styles expose their own native technique, demo, poster and credits without claiming certification',async()=>{
  const c=JSON.parse(await fs.readFile(path.join(root,'styles/catalog.json'),'utf8'));
  assert.equal(c.styles.length,59,'all 59 upstream styles must be discoverable');
  assert.equal(new Set(c.styles.map(s=>s.id)).size,59);
  assert.equal(c.styles.filter(s=>s.status==='integrated').length,8,'legacy presets retain their narrower meaning');
  for(const s of c.styles){
    assert.equal(s.certification,null);
    for(const key of ['style','demoGuide','entry','poster','credits'])await fs.access(path.join(root,s.native[key]));
    assert.equal(hash(await fs.readFile(path.join(root,s.reference))),hash(await fs.readFile(path.join(root,s.native.style))),`${s.id}: stale style grammar`);
  }
  assert.equal(c.styles.filter(s=>s.category==='Edit & Documentary').length,8);
});
