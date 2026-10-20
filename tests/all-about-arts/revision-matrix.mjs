// Run after the final acceptance matrix and other browser jobs have finished:
//   node tests/all-about-arts/revision-matrix.mjs
// Optional: AAA_ACCEPTANCE_OUT, AAA_REVISION_OUT, AAA_REVISION_WORKERS (default 2).
// Every invocation makes a fresh run directory. Cases run sequentially; no paid
// services, narration generation, upstream edits, or acceptance writes occur.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fingerprint,readConfig,validateConfig,INTEGRATED} from '../../skills/all-about-arts/lib/project.mjs';
import {snapshot,undo} from '../../skills/all-about-arts/lib/history.mjs';
import {buildAudio} from '../../skills/all-about-arts/lib/audio.mjs';
import {renderProject,still} from '../../skills/all-about-arts/lib/render.mjs';
import {currentReport,inspectVideo} from '../../skills/all-about-arts/lib/check.mjs';
import {readJSON,writeJSON,sha256,walk,withLock} from '../../skills/all-about-arts/lib/util.mjs';

const repository=fileURLToPath(new URL('../../',import.meta.url));
const revisionCopy={
 'pixel-rpg-1-library':'Pass the book on and start another reader’s journey.',
 'pixel-rpg-2-garden':'Give the new shoots time, water and room to grow.',
 'impasto-1-garden':'Keep the marks of the hands that tended each patch.',
 'impasto-2-city':'Hold the last light as the city settles into evening.',
 'ink-wash-1-mountains':'Pause with the water before beginning another line.',
 'ink-wash-2-river':'Carry this care from the meeting streams to the sea.',
 'dataviz-1-energy':'Compare the counts, then inspect the files behind them.',
 'dataviz-2-museum':'Look beyond the totals to who still feels welcome.',
 'glass-product-1-bottle':'Refill the same bottle and keep it in use.',
 'glass-product-2-orb':'Let the signal settle before the next reading.',
 'whiteboard-1-learning':'Use this result to shape the next small experiment.',
 'whiteboard-2-travel':'Stop at the library, then choose a calm route home.',
 'swiss-motion-1-urban':'Leave a little more space for the next person.',
 'swiss-motion-2-reading':'Carry one useful idea into tomorrow’s reading.',
 'paper-lantern-1-festival':'Let the shared lights drift beyond this final moment.',
 'paper-lantern-2-home':'Keep the letter close and make room for the next reply.'
};
const excluded=relative=>['out','.git','node_modules','.aaa/state','.aaa/cache'].some(p=>relative===p||relative.startsWith(`${p}/`));
const seconds=start=>Number(((performance.now()-start)/1000).toFixed(3));
const orientation=c=>c.height>c.width?'portrait':'landscape';
const digestFile=async file=>sha256(await fs.readFile(file));

// This independent manifest includes editable runtime code, assets, narration
// sources and file modes. It complements the production/toolchain fingerprint.
async function sourceState(project){
 const files=[];
 for(const relative of await walk(project,{ignore:excluded})){
  const file=path.join(project,relative),stat=await fs.lstat(file);
  files.push({path:relative,sha256:await digestFile(file),bytes:stat.size,mode:stat.mode&0o777});
 }
 return {fingerprint:sha256(JSON.stringify(files)),fileCount:files.length,files};
}
async function copySource(source,target,state){
 await fs.mkdir(target,{recursive:true});
 for(const file of state.files){const destination=path.join(target,file.path);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(source,file.path),destination,fs.constants.COPYFILE_EXCL);await fs.chmod(destination,file.mode);}
}
async function audioState(result){return {status:result.status,active:!!result.path,mode:result.mode,fingerprint:result.fingerprint,duration:result.duration,path:result.path,sha256:result.path?await digestFile(result.path):null,precision:result.precision??null};}
async function acceptanceOutputs(entry){
 const files=[entry.render.path,entry.preview,entry.designFrame,path.join(entry.project,'out/check.json'),path.join(entry.project,'out/render.json')].filter(Boolean);
 const result={};for(const file of new Set(files))result[path.resolve(file)]=await digestFile(file);return result;
}
export function revisedConfig(original,id){
 assert.ok(revisionCopy[id],`No reviewed revision copy for ${id}`);
 assert.equal(original.duration,15,'Acceptance input must be the final 15-second film');assert.equal(original.fps,12);
 assert.ok((original.width===640&&original.height===360)||(original.width===360&&original.height===640),'Acceptance dimensions must be 640×360 or 360×640');
 const revised=structuredClone(original),last=revised.scenes.at(-1);
 assert.equal(last.end,original.duration,'The final scene must end at film duration');assert.notEqual(last.body,revisionCopy[id]);
 revised.duration=original.duration+1;last.end+=1;last.body=revisionCopy[id];
 [revised.width,revised.height]=[original.height,original.width];
 return validateConfig(revised);
}
function markdown(report){
 const rows=report.results.map(r=>`| ${r.id} | ${r.status} | ${r.revision?.fromOrientation??'—'} → ${r.revision?.toOrientation??'—'} | ${r.beforeUndo?.video?.frames??'—'} | ${r.restored?.exactInitialSource?'yes':'not verified'} | ${r.elapsedSeconds??'—'} |`).join('\n');
 return `# Revision and undo matrix\n\nStatus: **${report.status}**. ${report.results.filter(r=>r.status==='success').length}/16 cases passed.\n\nEach case copies a successful acceptance project, snapshots all source files, changes the final scene copy, extends its ending from 15 to 16 seconds, flips orientation, renders at 12 fps, captures the added hold at 15.5 seconds, then restores the source snapshot. The retained 192-frame videos belong to the revised sources recorded in each case’s evidence directory. After undo they are deliberately stale against the restored 15-second projects; they are historical evidence, not current deliverables.\n\n| Case | Status | Orientation | Revised frames | Exact source restored | Seconds |\n|---|---|---|---:|---|---:|\n${rows}\n\nMachine-readable details, measured step timings, source manifests, audio fingerprints, validated reports and evidence paths are in [results.json](./results.json). Each fresh run is preserved at \`${report.runDirectory}\`. Acceptance report: \`${report.acceptanceReport}\`.\n\nThis exercises the local content, duration, orientation, audio invalidation, rendering and source-undo paths for sixteen starting films. It does not certify host-agent behavior, arbitrary topic transfer, narrative quality, aesthetic quality or production readiness. Existing narration is reused; no speech is generated for the revised body copy.\n`;
}

export async function runRevisionMatrix(){
 const acceptanceDirectory=path.resolve(process.env.AAA_ACCEPTANCE_OUT??path.join(repository,'artifacts/all-about-arts/acceptance'));
 const acceptanceReport=path.join(acceptanceDirectory,'results.json'),inputBytes=await fs.readFile(acceptanceReport),input=JSON.parse(inputBytes);
 assert.equal(input.status,'success','Wait for the final acceptance matrix to succeed');assert.equal(input.results?.length,16,'Expected sixteen completed acceptance projects');
 const ids=new Set();for(const entry of input.results){assert.equal(entry.status,'success',entry.id);assert.equal(entry.render?.status,'success',`${entry.id} render`);assert.match(entry.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(entry.id),'Duplicate case ID');ids.add(entry.id);assert.ok(revisionCopy[entry.id],`Unknown case ${entry.id}`);}
 for(const style of INTEGRATED)assert.equal(input.results.filter(r=>r.style===style).length,2,`Expected two ${style} cases`);
 const output=path.resolve(process.env.AAA_REVISION_OUT??path.join(repository,'artifacts/all-about-arts/revisions'));
 // Keep generated projects separate from the read-only acceptance tree.
 const acceptReal=await fs.realpath(acceptanceDirectory);await fs.mkdir(output,{recursive:true});const outputReal=await fs.realpath(output);
 assert.ok(outputReal!==acceptReal&&!outputReal.startsWith(acceptReal+path.sep),'Revision output must be outside acceptance');
 const workers=Number(process.env.AAA_REVISION_WORKERS??2);assert.ok(Number.isInteger(workers)&&workers>=1&&workers<=8,'AAA_REVISION_WORKERS must be 1–8');
 return withLock(path.join(output,'.revision-matrix.lock'),async()=>{
  const runDirectory=await fs.mkdtemp(path.join(output,`run-${new Date().toISOString().replaceAll(':','-')}-`));
  const started=performance.now(),report={schemaVersion:1,status:'not-checked',state:'running',startedAt:new Date().toISOString(),acceptanceReport,acceptanceReportHash:sha256(inputBytes),runDirectory,workers,scope:'Sixteen isolated source revisions and undo checks; historical revised outputs remain stale after restoration; no host or creative certification.',results:[],errors:[]};
  const persist=async()=>{report.updatedAt=new Date().toISOString();await writeJSON(path.join(runDirectory,'results.json'),report);await writeJSON(path.join(output,'results.json'),report);await fs.writeFile(path.join(runDirectory,'results.md'),markdown(report));await fs.writeFile(path.join(output,'results.md'),markdown(report));};
  await persist();
  for(const entry of input.results){
   const caseStarted=performance.now(),caseDirectory=path.join(runDirectory,entry.id),project=path.join(caseDirectory,'project'),evidence=path.join(caseDirectory,'evidence');await fs.mkdir(evidence,{recursive:true});
   const result={id:entry.id,style:entry.style,status:'not-checked',state:'running',acceptanceProject:path.resolve(entry.project),project,evidence,steps:[],errors:[]};report.results.push(result);
   const save=async()=>{await writeJSON(path.join(evidence,'result.json'),result);await persist();};
   const step=async(name,fn)=>{const start=performance.now(),item={name,status:'not-checked',startedAt:new Date().toISOString()};result.steps.push(item);await save();try{const value=await fn();item.status='success';return value;}catch(error){item.status='failure';item.error=error.message;throw error;}finally{item.elapsedSeconds=seconds(start);item.finishedAt=new Date().toISOString();await save();}};
   let original,initial,initialHash,initialAudio,checkpoint,acceptanceHash,acceptanceFiles,revisionHash,revised,revisionAudio,revisionValid=false;
   try{
    await step('copy-acceptance-source',async()=>{
     const source=await fs.realpath(entry.project);assert.ok(source.startsWith(acceptReal+path.sep),'Acceptance project must be inside its report directory');
     acceptanceHash=await fingerprint(source);assert.equal(acceptanceHash,entry.render.sourceHash,'Acceptance render must still match its source and tools');acceptanceFiles=await acceptanceOutputs(entry);
     const sourceManifest=await sourceState(source);await copySource(source,project,sourceManifest);initial=await sourceState(project);assert.deepEqual(initial,sourceManifest,'Copy must retain every source byte and file mode');
     original=await readConfig(project);assert.equal(original.style,entry.style);initialHash=await fingerprint(project);
     result.initial={sourceHash:initialHash,sourceManifestHash:initial.fingerprint,fileCount:initial.fileCount,config:{width:original.width,height:original.height,fps:original.fps,duration:original.duration},acceptanceSourceHash:acceptanceHash};
     await writeJSON(path.join(evidence,'initial-source.json'),initial);await writeJSON(path.join(evidence,'initial-aaa.json'),original);await writeJSON(path.join(evidence,'acceptance-output-hashes.json'),acceptanceFiles);
    });
    await step('build-initial-audio',async()=>{initialAudio=await audioState(await buildAudio(project,original));assert.equal(initialAudio.status,'success');assert.equal(await fingerprint(project),initialHash);result.initial.audio=initialAudio;});
    checkpoint=await step('snapshot-complete-source',()=>snapshot(project,{message:`Revision matrix baseline: ${entry.id}`}));result.snapshot=checkpoint;
    await step('revise-copy-duration-and-orientation',async()=>{
     revised=revisedConfig(original,entry.id);await writeJSON(path.join(project,'aaa.json'),revised);revisionHash=await fingerprint(project);assert.notEqual(revisionHash,initialHash);
     const revisedSource=await sourceState(project),before=new Map(initial.files.map(f=>[f.path,f.sha256])),changed=revisedSource.files.filter(f=>before.get(f.path)!==f.sha256).map(f=>f.path);assert.deepEqual(changed,['aaa.json'],'Only config source should change');assert.equal(revisedSource.fileCount,initial.fileCount);
     result.revision={sourceHash:revisionHash,sourceChanged:true,changedFiles:changed,fromOrientation:orientation(original),toOrientation:orientation(revised),width:revised.width,height:revised.height,fps:revised.fps,duration:revised.duration,finalScene:revised.scenes.at(-1),addedHoldSeconds:1};
     await writeJSON(path.join(evidence,'revised-aaa.json'),revised);await writeJSON(path.join(evidence,'revised-source.json'),revisedSource);
    });
    await step('rebuild-revised-audio',async()=>{
     revisionAudio=await audioState(await buildAudio(project,revised));assert.equal(revisionAudio.status,'success');assert.equal(revisionAudio.active,initialAudio.active,'Revision must preserve soundtrack presence');assert.equal(revisionAudio.duration,16);
     if(initialAudio.active){assert.notEqual(revisionAudio.fingerprint,initialAudio.fingerprint,'Soundtrack cache key must change');assert.notEqual(revisionAudio.sha256,initialAudio.sha256,'Extended soundtrack bytes must change');}
     result.revision.audio={...revisionAudio,fingerprintChanged:revisionAudio.fingerprint!==initialAudio.fingerprint,bytesChanged:revisionAudio.sha256!==initialAudio.sha256};
    });
    const render=await step('render-revision',()=>renderProject(project,{workers}));
    assert.equal(render.status,'success');assert.equal(render.frames,192);assert.equal(render.duration,16);assert.equal(render.width,revised.width);assert.equal(render.height,revised.height);assert.equal(render.sourceHash,revisionHash);assert.equal(render.audio,initialAudio.active);
    const video=await step('validate-revised-video',()=>inspectVideo(render.path,revised,{audio:revisionAudio.active,alpha:!!revised.transparent}));assert.equal(video.status,'success',JSON.stringify(video.errors));assert.equal(Number(video.video.nb_read_frames),192);assert.equal(video.duration,16);
    const lastFrame=await step('capture-added-final-hold',()=>still(project,{time:15.5,out:path.join(project,'out/revised-last-scene.png')}));assert.equal(lastFrame.status,'success');
    await step('record-evidence-before-undo',async()=>{
     const check=await currentReport(project);assert.equal(check.status,'success');assert.equal(check.sourceHash,revisionHash);assert.equal(check.audio.fingerprint,revisionAudio.fingerprint);assert.equal(await fingerprint(project),revisionHash,'Rendering must leave source stable');
     assert.equal(await digestFile(render.path),render.outputHash);result.beforeUndo={status:'success',sourceHash:revisionHash,checkStatus:check.status,video:{...render,frames:Number(video.video.nb_read_frames),probedDuration:video.duration},lastFrame:{...lastFrame,sha256:await digestFile(lastFrame.path)},audio:revisionAudio,validAt:new Date().toISOString()};
     await writeJSON(path.join(evidence,'check-before-undo.json'),check);await writeJSON(path.join(evidence,'render-before-undo.json'),render);await writeJSON(path.join(evidence,'video-inspection.json'),video);await writeJSON(path.join(evidence,'before-undo.json'),result.beforeUndo);revisionValid=true;
    });
   }catch(error){result.errors.push({phase:'revision',message:error.message,stack:error.stack});}
   finally{
    if(checkpoint){try{
     await step('undo-source-snapshot',()=>undo(project,{id:checkpoint.id}));
     await step('verify-exact-restoration-and-stale-output',async()=>{
      const restoredHash=await fingerprint(project),restoredSource=await sourceState(project);assert.equal(restoredHash,initialHash,'Production source fingerprint must restore exactly');assert.deepEqual(restoredSource,initial,'All source bytes, paths and modes must restore exactly');
      const audio=await audioState(await buildAudio(project,original));assert.equal(audio.fingerprint,initialAudio.fingerprint,'Original audio cache fingerprint must be restored');assert.equal(audio.sha256,initialAudio.sha256);assert.equal(await fingerprint(project),initialHash);
      const check=await currentReport(project);result.restored={status:'success',sourceHash:restoredHash,sourceManifestHash:restoredSource.fingerprint,exactInitialSource:true,audio,currentReportStatus:check.status,currentReportReason:check.reason??null,verifiedAt:new Date().toISOString()};
      if(result.beforeUndo){assert.equal(check.status,'not-checked','Retained revised output must be stale after undo');assert.equal(check.sourceHash,revisionHash);assert.match(check.reason,/changed|rebuild/i);assert.equal(await digestFile(result.beforeUndo.video.path),result.beforeUndo.video.outputHash,'Undo must preserve the revised video');assert.equal(await digestFile(result.beforeUndo.lastFrame.path),result.beforeUndo.lastFrame.sha256,'Undo must preserve the revised still');result.restored.retainedOutput={path:result.beforeUndo.video.path,current:false,status:'stale',matchesSourceHash:revisionHash,reason:'Historical revision evidence; project source has been restored to the original 15-second version.'};}
      await writeJSON(path.join(evidence,'restored-source.json'),restoredSource);await writeJSON(path.join(evidence,'current-report-after-undo.json'),check);await writeJSON(path.join(evidence,'restored-state.json'),result.restored);
     });
    }catch(error){result.errors.push({phase:'undo',message:error.message,stack:error.stack});}}
    if(acceptanceHash&&acceptanceFiles){try{await step('verify-acceptance-untouched',async()=>{assert.equal(await fingerprint(entry.project),acceptanceHash);assert.deepEqual(await acceptanceOutputs(entry),acceptanceFiles);result.acceptancePreserved=true;});}catch(error){result.errors.push({phase:'acceptance-preservation',message:error.message,stack:error.stack});}}
    result.status=revisionValid&&result.restored?.exactInitialSource&&result.acceptancePreserved&&!result.errors.length?'success':'failure';result.state='finished';result.elapsedSeconds=seconds(caseStarted);await save();console.log(`${entry.id}: ${result.status} (${result.elapsedSeconds}s; source ${result.restored?.exactInitialSource?'restored':'not verified'})`);
   }
  }
  try{assert.equal(await digestFile(acceptanceReport),report.acceptanceReportHash,'Acceptance results changed during the revision run');}catch(error){report.errors.push(error.message);}
  report.status=report.results.length===16&&report.results.every(r=>r.status==='success')&&!report.errors.length?'success':'failure';report.state='finished';report.finishedAt=new Date().toISOString();report.elapsedSeconds=seconds(started);await persist();
  console.log(JSON.stringify({status:report.status,results:path.join(output,'results.json'),runDirectory,elapsedSeconds:report.elapsedSeconds}));return report;
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--help'))console.log('Run: node tests/all-about-arts/revision-matrix.mjs\nRequires a completed 16-case acceptance/results.json. Optional AAA_ACCEPTANCE_OUT, AAA_REVISION_OUT, AAA_REVISION_WORKERS=2. Creates fresh runs; does not modify acceptance. Runs real browsers/encoders only when invoked without --help.');
 else runRevisionMatrix().then(report=>{if(report.status!=='success')process.exitCode=1;}).catch(error=>{console.error(error.stack);process.exitCode=1;});
}
