#!/usr/bin/env node
// Import a local, clean Git snapshot. Never fetch, clone, update or install anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PACKAGE_ROOT,INTEGRATED} from '../lib/project.mjs';
import {run,readJSON,writeJSON,sha256,exists} from '../lib/util.mjs';

const bundle=path.join(PACKAGE_ROOT,'vendor/lemo-opuscar');
const manifestFile=path.join(PACKAGE_ROOT,'provenance/lemo-snapshot.json');
// Keep production engines and references, not upstream installation/deployment.
// In particular, nested SKILL.md files would register unrelated skills here.
export function excludedSource(sourcePath){
  return ['.claude-plugin/','.github/','plugin/','tools/directory/'].some(prefix=>sourcePath.startsWith(prefix))||
    ['CLAUDE.md','tools/directory.py','tools/publish.sh','tools/web_cuts.sh','tools/films_repo.sh','tools/site_media.sh'].includes(sourcePath);
}
const exclusionReason='Unused upstream host packaging or publishing; all-about-arts has its own installation and entry point.';
function snapshotManifest(source,files,excluded){
  const renamed=files.filter(f=>f.path!==f.sourcePath).length;
  return {schemaVersion:2,source:{...source,totalFiles:files.length+excluded.length,totalBytes:[...files,...excluded].reduce((sum,f)=>sum+f.bytes,0)},
    scope:'Production source, guides, demos, visual references, assets and validation tools. Unused upstream host packaging and publishing are excluded.',
    pathChanges:`${renamed} .gitignore files are stored as .gitignore.upstream; retained file contents are byte-identical.`,
    totalBytes:files.reduce((sum,f)=>sum+f.bytes,0),files,excluded};
}
export async function verifySnapshot(){
  const manifest=await readJSON(manifestFile);let bytes=0;
  for(const f of manifest.files){
    const data=await fs.readFile(path.join(bundle,f.path));
    if(sha256(data)!==f.sha256)throw Error(`Snapshot hash mismatch: ${f.path}`);
    bytes+=data.length;
  }
  if(bytes!==manifest.totalBytes)throw Error('Snapshot size mismatch');
  return {status:'success',commit:manifest.source.commit,files:manifest.files.length,bytes,excluded:manifest.excluded?.length??0};
}
export async function pruneUnusedPackaging(){
  // Verify before deleting, so locally modified source files are never discarded.
  await verifySnapshot();
  const old=await readJSON(manifestFile),removed=old.files.filter(f=>excludedSource(f.sourcePath));
  const files=old.files.filter(f=>!excludedSource(f.sourcePath));
  const excluded=[...(old.excluded??[]),...removed.map(f=>({...f,reason:exclusionReason}))].sort((a,b)=>a.sourcePath.localeCompare(b.sourcePath));
  for(const f of removed){
    await fs.unlink(path.join(bundle,f.path));
    // Remove empty packaging directories only; preserve any local additions.
    let dir=path.dirname(path.join(bundle,f.path));
    while(dir!==bundle){
      try{await fs.rmdir(dir);}catch(e){if(e.code==='ENOTEMPTY'||e.code==='EEXIST')break;throw e;}
      dir=path.dirname(dir);
    }
  }
  await writeJSON(manifestFile,snapshotManifest(old.source,files,excluded));
  return {...await verifySnapshot(),removed:removed.length,removedBytes:removed.reduce((sum,f)=>sum+f.bytes,0)};
}
export async function migrateLemo(source){
  source=await fs.realpath(source);
  const git=async(...args)=>(await run('git',['-C',source,...args])).stdout.toString();
  if((await git('status','--porcelain','--untracked-files=no')).trim())throw Error('Source has tracked changes; use a clean local snapshot');
  const commit=(await git('rev-parse','HEAD')).trim();
  const paths=(await git('ls-files','-z')).split('\0').filter(Boolean).sort();
  for(const required of ['DIRECTOR.md','TECHNIQUE.md','MY-STYLES.md','core/render/video.mjs','styles/whiteboard/style.json'])if(!paths.includes(required))throw Error(`Not a complete Lemo checkout: missing ${required}`);
  if(await exists(bundle)){
    const old=await readJSON(manifestFile);
    if(old.source.commit!==commit)throw Error('A different snapshot is already installed; review it before replacing the bundle');
    await verifySnapshot();
  }
  else {
  const stage=path.join(PACKAGE_ROOT,'vendor',`.lemo-${process.pid}`);await fs.mkdir(stage,{recursive:true});
  const files=[],excluded=[];
  try{
    for(const sourcePath of paths){
      const stat=await fs.lstat(path.join(source,sourcePath));
      if(!stat.isFile())throw Error(`Unsupported tracked file: ${sourcePath}`);
      // Preserve ignore rules as source material without hiding imported tracked files.
      const destPath=path.basename(sourcePath)==='.gitignore'?`${sourcePath}.upstream`:sourcePath;
      const data=await fs.readFile(path.join(source,sourcePath)),dest=path.join(stage,destPath);
      const record={sourcePath,path:destPath,bytes:data.length,sha256:sha256(data)};
      if(excludedSource(sourcePath)){excluded.push({...record,reason:exclusionReason});continue;}
      await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data,{mode:stat.mode});
      files.push(record);
    }
    await fs.rename(stage,bundle);
  }catch(e){await fs.rm(stage,{recursive:true,force:true});throw e;}
  await writeJSON(manifestFile,snapshotManifest({repository:'https://github.com/lemomo-ai/lemo-opuscar',commit},files,excluded));
  }
  await pruneUnusedPackaging();
  const {files}=await readJSON(manifestFile);
  const previous=await readJSON(path.join(PACKAGE_ROOT,'styles/catalog.json'));
  const styles=[];
  for(const f of files.filter(f=>/^styles\/(?!_template\/)[^/]+\/style\.json$/.test(f.sourcePath))){
    const meta=await readJSON(path.join(bundle,f.path));
    if(meta.slug==='_template')continue;
    const slug=meta.slug,base=`vendor/lemo-opuscar/styles/${slug}`;
    const styleData=await fs.readFile(path.join(bundle,'styles',slug,'STYLE.md'));
    await fs.mkdir(path.join(PACKAGE_ROOT,'references/styles',slug),{recursive:true});
    await fs.writeFile(path.join(PACKAGE_ROOT,'references/styles',slug,'STYLE.md'),styleData);
    const old=previous.styles.find(s=>s.id===slug)??{};
    // Most demos are web pages; a few (e.g. firefly-pointillism) render from Python.
    const htmlEntry=await exists(path.join(bundle,'styles',slug,'demo/index.html'));
    const legacy=old.renderer?{legacyPresetScope:'renderer, orientations, examples, transparent, alpha and limitations describe only the legacy preset; native describes the complete source route.',limitations:(old.limitations??[]).map(text=>text.startsWith('Legacy preset only: ')?text:`Legacy preset only: ${text} Complete upstream engines are available through native production.`)}:{};
    styles.push({...old,...legacy,id:slug,slug,name:meta.en,en:meta.en,cn:meta.cn,category:meta.category_en,category_cn:meta.category_cn,uses:meta.uses,aka:meta.aka??[],...(meta.by?{contributedBy:meta.by}:{}),requires:meta.needs??[],
      status:INTEGRATED.includes(slug)?'integrated':'reference',reference:`references/styles/${slug}/STYLE.md`,sourceSha256:sha256(styleData),certification:null,
      native:{status:'source-available',engine:htmlEntry?'web':'python',style:`${base}/STYLE.md`,demoGuide:`${base}/DEMO.md`,entry:`${base}/demo/${htmlEntry?'index.html':'film.py'}`,poster:`${base}/poster.jpg`,credits:`${base}/demo/CREDITS`,
        projectCommand:`lemo init <project> --style ${slug}`,needs:'Author original scenes; check style-specific dependencies and external media before rendering.'}});
  }
  styles.sort((a,b)=>a.id.localeCompare(b.id));
  await writeJSON(path.join(PACKAGE_ROOT,'styles/catalog.json'),{...previous,sourceCommit:commit,
    statusDefinitions:{...previous.statusDefinitions,reference:'No legacy preset; complete native style source and tools are bundled.',integrated:'Legacy reusable preset available in addition to full native source; not an artistic quality certification.'},
    nativeStatusDefinitions:{'source-available':'Style grammar, demonstration source, poster and credits are bundled. Not a claim that every demo has its external assets or was rendered.'},styles});
  return {...await verifySnapshot(),styles:styles.length};
}
// Replace a reviewed, unmodified snapshot with another clean local checkout.
// The old bundle and generated files are restored if the new import fails.
export async function replaceLemo(source){
  const generated=[manifestFile,path.join(PACKAGE_ROOT,'styles/catalog.json')];
  const saved=await Promise.all(generated.map(f=>fs.readFile(f)));
  const previous=await verifySnapshot();
  const aside=path.join(PACKAGE_ROOT,'vendor',`.lemo-previous-${process.pid}`);
  await fs.rename(bundle,aside);
  try{
    const result=await migrateLemo(source);
    await fs.rm(aside,{recursive:true,force:true});
    return {...result,replaced:previous.commit};
  }catch(e){
    await fs.rm(bundle,{recursive:true,force:true});
    await fs.rename(aside,bundle);
    await Promise.all(generated.map((f,i)=>fs.writeFile(f,saved[i])));
    throw e;
  }
}
if(process.argv[1]&&await fs.realpath(process.argv[1]).catch(()=>null)===fileURLToPath(import.meta.url)){
  try{
    const [arg,next]=process.argv.slice(2);if(!arg||(arg==='--replace'&&!next))throw Error('Usage: node migrate-lemo.mjs <local-checkout> | --replace <local-checkout> | --verify | --prune-unused');
    console.log(JSON.stringify(arg==='--verify'?await verifySnapshot():arg==='--prune-unused'?await pruneUnusedPackaging():arg==='--replace'?await replaceLemo(path.resolve(next)):await migrateLemo(path.resolve(arg)),null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
