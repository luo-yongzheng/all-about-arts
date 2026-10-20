// Bind the retained matrix evidence to current source and actual output bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fingerprint,readConfig} from '../../skills/all-about-arts/lib/project.mjs';
import {readJSON,writeJSON,sha256} from '../../skills/all-about-arts/lib/util.mjs';
const root=path.resolve('artifacts/all-about-arts');
const matrix=await readJSON(path.join(root,'acceptance/results.json'));
const records=[];
for(const entry of matrix.results){
 try{
  if(entry.status!=='success')throw Error('Matrix case did not succeed');
  const config=await readConfig(entry.project),render=await readJSON(path.join(entry.project,'out/render.json')),report=await readJSON(path.join(entry.project,'out/check.json'));
  const sourceHash=await fingerprint(entry.project),outputHash=sha256(await fs.readFile(render.path));
  if(sourceHash!==render.sourceHash||sourceHash!==report.sourceHash)throw Error('Stale source or tool fingerprint');
  if(outputHash!==render.outputHash||outputHash!==report.output?.sha256)throw Error('Changed video bytes');
  if(report.status!=='success'||report.checks.some(c=>c.status!=='success'))throw Error('Incomplete or failed technical checks');
  if(render.frames!==Math.round(config.fps*config.duration)||render.width!==config.width||render.height!==config.height)throw Error('Render metadata does not match configuration');
  records.push({id:entry.id,status:'success',sourceHash,outputHash});
 }catch(error){records.push({id:entry.id,status:'failure',error:error.message});}
}
const result={checkedAt:new Date().toISOString(),status:records.length===16&&records.every(r=>r.status==='success')?'success':'failure',scope:'Current source/tool fingerprint, retained check status, configured format and actual video hash for all 16 cases',records};
await writeJSON(path.join(root,'verification/matrix-integrity.json'),result);
console.log(JSON.stringify({status:result.status,cases:records.length,failures:records.filter(r=>r.status!=='success')}));
if(result.status!=='success')process.exitCode=1;
