import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {openFilm} from '../../skills/all-about-arts/lib/browser.mjs';
import {defaultConfig,PACKAGE_ROOT} from '../../skills/all-about-arts/lib/project.mjs';
import {writeJSON,exists} from '../../skills/all-about-arts/lib/util.mjs';
async function fixture(t,hang){
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-cancel-'));t.after(()=>fs.rm(p,{recursive:true,force:true}));
 const c=defaultConfig({duration:1});c.width=160;c.height=90;c.fps=10;await writeJSON(path.join(p,'aaa.json'),c);
 await fs.writeFile(path.join(p,'index.html'),`<script>window.AAA={ready:${hang==='ready'?'new Promise(()=>{})':'Promise.resolve()'},describe:()=>window.__AAA_CONFIG,render:()=>${hang==='render'?'new Promise(()=>{})':'null'},texts:()=>[]};</script>`);return {p,c};
}
for(const phase of ['ready','render'])test(`unresolved ${phase} is bounded and closes owned browser`,{timeout:12000},async t=>{
 const {p,c}=await fixture(t,phase),controller=new AbortController();let film;t.after(()=>film?.close());
 // A safety abort ensures a regression fails rather than hanging the test runner.
 const guard=setTimeout(()=>controller.abort(),7000);t.after(()=>clearTimeout(guard));
 await assert.rejects(async()=>{film=await openFilm(p,c,{timeout:1200,signal:controller.signal});await film.render(0);},/timed out|timeout/i);
 await film?.close();
});
test('interrupting a real CLI render removes both locks and temporary output',{timeout:15000},async t=>{
 const {p}=await fixture(t,'ready');const child=spawn(process.execPath,[path.join(PACKAGE_ROOT,'scripts/aaa.mjs'),'render',p,'--json'],{stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
 const done=new Promise(resolve=>child.on('close',(code,signal)=>resolve({code,signal})));const guard=setTimeout(()=>child.kill('SIGKILL'),11000);t.after(()=>{clearTimeout(guard);child.kill();});
 for(let i=0;i<60&&!await exists(path.join(p,'out/film.mp4.lock'));i++)await new Promise(r=>setTimeout(r,50));
 await new Promise(r=>setTimeout(r,1000));child.kill('SIGINT');const result=await done;
 assert.equal(result.code,130,output);assert.equal(await exists(path.join(p,'.aaa/state/build.lock')),false);assert.equal(await exists(path.join(p,'out/film.mp4.lock')),false);
 assert.ok(!(await fs.readdir(path.join(p,'out'))).some(x=>x.startsWith('.aaa-render-')));
});
