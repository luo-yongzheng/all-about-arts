import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {initProject,defaultConfig} from '../../skills/all-about-arts/lib/project.mjs';import {checkProject} from '../../skills/all-about-arts/lib/check.mjs';
test('an adapter cannot certify unregistered canvas text by returning an empty array',async t=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-adapter-check-'));t.after(()=>fs.rm(p,{recursive:true,force:true}));const c=defaultConfig({duration:1});c.width=320;c.height=180;c.fps=4;await initProject(p,{config:c});
 const source="import {adaptLemo} from './.aaa/runtime/adapters/index.mjs';window.READY=true;window.DUR=1;window.render=()=>{};window.AAA=adaptLemo(window,window.__AAA_CONFIG);";await fs.writeFile(path.join(p,'film.mjs'),source);
 const before=await checkProject(p,{write:false});assert.equal(before.checks.find(x=>x.id==='text-bounds').status,'not-checked');
 await fs.writeFile(path.join(p,'film.mjs'),"window.TEXTS=()=>[];"+source);const after=await checkProject(p,{write:false});assert.equal(after.checks.find(x=>x.id==='text-bounds').status,'success');
});
test('standalone checks resolve word-anchored scenes using the same timeline',async t=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-check-anchor-'));t.after(()=>fs.rm(p,{recursive:true,force:true}));const c=defaultConfig({duration:1,style:'swiss-motion',title:'Grow'});c.width=320;c.height=180;c.fps=10;c.audio.voice={script:'Grow',duration:1,words:[{text:'Grow',start:.4,end:.8}],precision:'recognized'};c.scenes=[{id:'first',start:0,end:{word:'Grow',edge:'start'},title:'Seed'},{id:'second',start:{word:'Grow',edge:'start'},end:1,title:'Grow'}];await initProject(p,{config:c});const report=await checkProject(p,{write:false});assert.equal(report.checks.find(x=>x.id==='page').status,'success',JSON.stringify(report));assert.equal(report.checks.find(x=>x.id==='seek-determinism').status,'success');
});
