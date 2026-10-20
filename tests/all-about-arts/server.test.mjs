import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {startServer} from '../../skills/all-about-arts/lib/server.mjs';
import {defaultConfig} from '../../skills/all-about-arts/lib/project.mjs';import {writeJSON} from '../../skills/all-about-arts/lib/util.mjs';
test('project server isolates roots, refuses traversal and cross-origin mutation',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-server-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'index.html'),'<h1>film</h1>');await fs.writeFile(path.join(root,'.env'),'secret');
 const s=await startServer({project:root});t.after(()=>s.close());assert.match(await (await fetch(s.url+'/film/')).text(),/film/);
 assert.equal((await fetch(s.url+'/film/.env')).status,403);assert.equal((await fetch(s.url+'/film/%2e%2e%2f.env')).status,403);
 assert.equal((await fetch(s.url+'/api/save',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(s.url+'/film/no-file')).status,404);
});
test('Studio prepare refreshes preview sound and clearing music removes the old audio URL',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa-preview-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const c=defaultConfig({duration:1});c.audio.music.enabled=true;await writeJSON(path.join(root,'aaa.json'),c);const s=await startServer({project:root,studio:true});t.after(()=>s.close());
 const prepare=()=>fetch(s.url+'/api/prepare',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.json());let result=await prepare();assert.equal(result.status,'success');assert.equal(result.audio.url,'/media/audio.wav');const b=await (await fetch(s.url+result.audio.url)).arrayBuffer();assert.equal(Buffer.from(b).toString('ascii',0,4),'RIFF');
 c.audio.music.enabled=false;await writeJSON(path.join(root,'aaa.json'),c);result=await prepare();assert.equal(result.audio.url,null);assert.equal((await fetch(s.url+'/media/audio.wav')).status,404);
});
