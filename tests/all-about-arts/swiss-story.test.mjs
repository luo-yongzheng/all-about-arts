import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {initProject,PACKAGE_ROOT,readConfig} from '../../skills/all-about-arts/lib/project.mjs';import {openFilm} from '../../skills/all-about-arts/lib/browser.mjs';import {readJSON,sha256} from '../../skills/all-about-arts/lib/util.mjs';
test('Swiss urban and reading briefs have distinct subjects and time-driven actions',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-swiss-story-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));let hashes=[];
 for(const [file,expected] of [['1-urban.json','urban-connection'],['2-reading.json','reading-day-3']]){
  const c=await readJSON(path.join(PACKAGE_ROOT,'styles/swiss-motion/examples',file));c.width=640;c.height=360;const p=path.join(root,file);await initProject(p,{config:c});const film=await openFilm(p,await readConfig(p));t.after(()=>film.close());await film.render(8);
  const regions=await film.page.evaluate(()=>window.AAA.regions(8));assert.ok(regions.some(r=>r.id===expected),expected);hashes.push(sha256(await film.page.screenshot()));
  await film.render(6.1);const before=sha256(await film.page.screenshot());await film.render(7.5);assert.notEqual(sha256(await film.page.screenshot()),before,'subject action changes within the same scene');
 }
 assert.notEqual(hashes[0],hashes[1]);
});
