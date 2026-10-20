import fs from 'node:fs/promises';import path from 'node:path';import {PACKAGE_ROOT,readConfig,fingerprint,ignoreProjectFile} from './project.mjs';import {readJSON,writeJSON,exists,sha256,walk,withLock} from './util.mjs';import {renderProject} from './render.mjs';import {checkProject,aggregateCheckStatus} from './check.mjs';
async function canonicalDestination(target){let parent=path.resolve(target),tail=[];while(true){try{return path.join(await fs.realpath(parent),...tail);}catch(e){if(e.code!=='ENOENT')throw e;const next=path.dirname(parent);if(next===parent)throw e;tail.unshift(path.basename(parent));parent=next;}}}
const within=(target,root)=>target===root||target.startsWith(root+path.sep);
async function validateDestination(project,target){const actual=await canonicalDestination(target),toolkit=await fs.realpath(PACKAGE_ROOT),source=await fs.realpath(project);if(within(actual,toolkit))throw Error('Delivery destination must be outside the toolkit to prevent recursive copying');if(within(actual,source)&&!within(actual,path.join(source,'out')))throw Error('Delivery must be outside the project or inside its out directory');}
const completeReport=report=>report&&report.status==='success'&&Array.isArray(report.checks)&&aggregateCheckStatus(report.checks)==='success'&&['assets','page','text-bounds','seek-determinism','encoded-video'].every(id=>report.checks.some(c=>c.id===id&&c.status==='success'));
export async function exportProject(project,{out,rebuild=true,signal}={}) {
  project=path.resolve(project);await readConfig(project);if(out)await validateDestination(project,path.resolve(out));const recordFile=path.join(project,'out/render.json');
  let record=await exists(recordFile)?await readJSON(recordFile):null;const fresh=record?.sourceHash===await fingerprint(project);
  if(!fresh){if(!rebuild)throw Error('Render is absent or stale; render before delivery');record=await renderProject(project,{format:(await readConfig(project)).transparent?'mov':'mp4',signal});}
  return withLock(path.join(project,'.aaa/state/build.lock'),async()=>{
    if(signal?.aborted)throw Error('Export cancelled');
    const hash=await fingerprint(project);record=await readJSON(recordFile);if(record.status!=='success'||record.sourceHash!==hash)throw Error('A current successful render is required; source or toolchain changed');
    if(sha256(await fs.readFile(record.path))!==record.outputHash)throw Error('Rendered video changed after validation');
    const reportFile=path.join(project,'out/check.json');let report=await exists(reportFile)?await readJSON(reportFile):null;
    // A standalone source check may have replaced the earlier full report. Recheck
    // the current video without rerendering it; never adopt a stale render record.
    if(!completeReport(report)||report.sourceHash!==hash||report.output?.sha256!==record.outputHash||report.output?.path!==record.path)report=await checkProject(project,{video:record.path,signal});
    if(!completeReport(report)||report.sourceHash!==hash)throw Error('Technical delivery checks did not pass; incomplete checks remain not-checked');
    const target=path.resolve(out??path.join(project,'out',`delivery-${hash.slice(0,12)}`));if(await exists(target))throw Error(`Delivery exists: ${target}. Use another --out to preserve that version.`);
    // A delivery inside source would recursively copy itself. Only out/ is excluded.
    await validateDestination(project,target);
    await fs.mkdir(path.dirname(target),{recursive:true});const tmp=await fs.mkdtemp(path.join(path.dirname(target),'.aaa-delivery-'));
    try{
      for(const f of await walk(project,{ignore:ignoreProjectFile})){const dst=path.join(tmp,'source',f);await fs.mkdir(path.dirname(dst),{recursive:true});await fs.copyFile(path.join(project,f),dst);}
      // The JS dependencies are portable; browser and FFmpeg remain host capabilities.
      await fs.cp(PACKAGE_ROOT,path.join(tmp,'toolkit'),{recursive:true,dereference:true,filter:src=>!src.includes(`${path.sep}.git${path.sep}`)&&!src.endsWith(`${path.sep}.git`)});
      await fs.copyFile(record.path,path.join(tmp,`film.${record.format}`));for(const f of ['cover.png','subtitles.srt','words.json','check.json','render.json'])if(await exists(path.join(project,'out',f)))await fs.copyFile(path.join(project,'out',f),path.join(tmp,f));
      await fs.writeFile(path.join(tmp,'REPRODUCE.md'),'# Editable film\n\nRun `node toolkit/scripts/aaa.mjs doctor`, then `node toolkit/scripts/aaa.mjs studio source` or `node toolkit/scripts/aaa.mjs render source`. The toolkit and project runtime are included; use an existing Chrome/Chromium and FFmpeg. No upstream checkout is needed. See check.json for checks and unreviewed creative criteria.\n');
      const files=await walk(tmp);const manifest=[];for(const f of files)manifest.push({path:f,sha256:sha256(await fs.readFile(path.join(tmp,f)))});
      await writeJSON(path.join(tmp,'manifest.json'),{schemaVersion:1,sourceHash:hash,createdAt:new Date().toISOString(),files:manifest});
      if(signal?.aborted)throw Error('Export cancelled');if(await fingerprint(project)!==hash)throw Error('Source changed while exporting');if(sha256(await fs.readFile(record.path))!==record.outputHash)throw Error('Rendered video changed while exporting');await fs.rename(tmp,target);return {status:'success',path:target,sourceHash:hash,files:manifest.length};
    }finally{await fs.rm(tmp,{recursive:true,force:true});}
  });
}
