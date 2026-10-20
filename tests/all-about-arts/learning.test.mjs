import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as learning from '../../skills/all-about-arts/lib/learn.mjs';
import {PACKAGE_ROOT} from '../../skills/all-about-arts/lib/project.mjs';
import {run} from '../../skills/all-about-arts/lib/util.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'aaa learning '));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const name of ['one','two'])await fs.mkdir(path.join(root,name));
 const project=path.join(root,'one');await fs.writeFile(path.join(project,'first.json'),'first observed frame');await fs.writeFile(path.join(project,'second.json'),'second observed frame');return {root,project,target:path.join(root,'two')};
}
test('saved lessons can be listed by kind and evidence changes invalidate reuse',async t=>{
 const {project}=await fixture(t);
 await learning.recordLearning(project,{kind:'preference',text:'The user prefers quiet pacing'});
 const entry=await learning.recordLearning(project,{kind:'verified',text:'Hold this caption through the demonstrated reading interval',evidence:['first.json','second.json']});
 let result=await learning.listLearning(project,{kind:'verified'});assert.equal(result.entries.length,1);assert.equal(result.entries[0].id,entry.id);assert.equal(result.entries[0].reusable,true);
 await fs.writeFile(path.join(project,'first.json'),'changed evidence');result=await learning.listLearning(project);assert.equal(result.entries.find(e=>e.id===entry.id).evidenceStatus,'failure');assert.equal(result.entries.find(e=>e.id===entry.id).reusable,false);
});
test('reused verified lessons carry independent evidence and survive deletion of their source project',async t=>{
 const {project,target}=await fixture(t);
 const entry=await learning.recordLearning(project,{kind:'verified',text:'This narrow treatment worked in these two cases',evidence:['first.json','second.json']});
 const imported=await learning.reuseLearning(target,{from:project,id:entry.id});assert.equal(imported.kind,'verified');assert.equal(imported.public,false);assert.equal(imported.origin.entryId,entry.id);
 await fs.rm(project,{recursive:true});const result=await learning.listLearning(target);assert.equal(result.entries[0].reusable,true);assert.equal(result.entries[0].text,entry.text);for(const evidence of result.entries[0].evidence)assert.ok((await fs.stat(path.join(target,evidence.path))).isFile());
});
test('preferences, stale evidence and duplicate evidence cannot masquerade as reusable validation',async t=>{
 const {project,target}=await fixture(t);const p=await learning.recordLearning(project,{kind:'preference',text:'Private client choice'});
 await assert.rejects(learning.reuseLearning(target,{from:project,id:p.id}),/verified/i);
 const v=await learning.recordLearning(project,{kind:'verified',text:'A scoped observation',evidence:['first.json','second.json']});await fs.rm(path.join(project,'first.json'));
 await assert.rejects(learning.reuseLearning(target,{from:project,id:v.id}),/evidence/i);
 await fs.copyFile(path.join(project,'second.json'),path.join(project,'duplicate.json'));
 await assert.rejects(learning.recordLearning(project,{kind:'verified',text:'Not independent evidence',evidence:['second.json','duplicate.json']}),/distinct/i);
});
test('CLI can retrieve persisted lessons in a separate invocation',async t=>{
 const {project}=await fixture(t),cli=path.join(PACKAGE_ROOT,'scripts/aaa.mjs');
 await run(process.execPath,[cli,'learn',project,'--text','Use the verified framing for this project','--json']);
 const result=JSON.parse((await run(process.execPath,[cli,'learn',project,'list','--json'])).stdout.toString());assert.equal(result.status,'success');assert.equal(result.entries[0].text,'Use the verified framing for this project');assert.equal(result.entries[0].kind,'observation');assert.equal(result.entries[0].reusable,false);
});
