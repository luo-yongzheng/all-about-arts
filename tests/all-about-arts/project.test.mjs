import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateConfig, defaultConfig, fingerprint, readConfig} from '../../skills/all-about-arts/lib/project.mjs';
import {safePath, withLock, writeJSON} from '../../skills/all-about-arts/lib/util.mjs';

async function fixture(t) { const d=await fs.mkdtemp(path.join(os.tmpdir(),'aaa 中文 ')); t.after(()=>fs.rm(d,{recursive:true,force:true})); await writeJSON(path.join(d,'aaa.json'),defaultConfig()); return d; }
test('rejects invalid times, nonintegral frame counts, duplicate scene IDs, unsafe assets',()=>{
  const c=defaultConfig(); assert.equal(validateConfig(c),c);
  for(const change of [{duration:0},{fps:0},{width:1079},{duration:0.001},{scenes:[{id:'same',start:0,end:10},{id:'same',start:10,end:18}]},{assets:[{id:'x',path:'../secret',required:true}]}]) assert.throws(()=>validateConfig({...c,...change}));
});
test('fingerprint changes with sources and assets but not output or history',async t=>{
  const d=await fixture(t); await fs.writeFile(path.join(d,'film.mjs'),'export const x=1;');
  const first=await fingerprint(d); await fs.mkdir(path.join(d,'out')); await fs.writeFile(path.join(d,'out','report.json'),'{}');
  assert.equal(await fingerprint(d),first); await fs.writeFile(path.join(d,'film.mjs'),'export const x=2;'); assert.notEqual(await fingerprint(d),first);
  const second=await fingerprint(d); await fs.mkdir(path.join(d,'assets')); await fs.writeFile(path.join(d,'assets','a.txt'),'asset'); assert.notEqual(await fingerprint(d),second);
});
test('safe paths reject traversal and symbolic links outside project',async t=>{const d=await fixture(t); await fs.symlink(os.tmpdir(),path.join(d,'escape')); await assert.rejects(safePath(d,'../x')); await assert.rejects(safePath(d,'escape/x')); assert.equal(await safePath(d,'assets/new.wav'),path.join(await fs.realpath(d),'assets','new.wav'));});
test('exclusive locks refuse a competing operation and release after failure',async t=>{const d=await fixture(t); const lock=path.join(d,'lock'); await assert.rejects(withLock(lock,async()=>{await assert.rejects(withLock(lock,async()=>{}),/locked/); throw Error('intentional');}),/intentional/); await withLock(lock,async()=>assert.ok(true));});
test('readConfig rejects invalid edited config',async t=>{const d=await fixture(t); await writeJSON(path.join(d,'aaa.json'),{...defaultConfig(),duration:-1}); await assert.rejects(readConfig(d));});
