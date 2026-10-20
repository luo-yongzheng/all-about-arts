import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {initProject,PACKAGE_ROOT,INTEGRATED} from '../../skills/all-about-arts/lib/project.mjs';
import {renderProject,still} from '../../skills/all-about-arts/lib/render.mjs';import {writeJSON,readJSON,exists,run} from '../../skills/all-about-arts/lib/util.mjs';
import {importVoice} from '../../skills/all-about-arts/lib/voice.mjs';
import {inspectAudio} from '../../skills/all-about-arts/lib/audio.mjs';
import {importAsset} from '../../skills/all-about-arts/lib/assets.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.env.AAA_ACCEPTANCE_OUT??path.join(root,'artifacts/all-about-arts/acceptance'));
const selected=process.env.AAA_ACCEPTANCE_CASE;const previous=selected&&await exists(path.join(output,'results.json'))?await readJSON(path.join(output,'results.json')):{results:[]};const results=previous.results.filter(r=>r.id!==selected);let executed=0;await fs.mkdir(output,{recursive:true});
const fixture=path.join(output,'fixture-emblem.svg');await fs.writeFile(fixture,'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="24" fill="#213c34"/><path d="M40 120V40h30c60 0 60 80 0 80z" fill="#d9efad"/></svg>');
async function sceneNarration(project,config){
 const directory=path.join(project,'.aaa','narration-fixture');await fs.mkdir(directory,{recursive:true});const segments=[],inputs=[],filters=[];
 for(const [i,scene] of config.scenes.entries()){
  const textFile=path.join(directory,`${i}.txt`),clip=path.join(directory,`${i}.aiff`);await fs.writeFile(textFile,scene.title);
  await run('python3',[path.join(PACKAGE_ROOT,'scripts/voice-local.py'),'--script-file',textFile,'--output',clip,'--rate','150']);
  const audio=await inspectAudio(clip),start=scene.start+.35,end=start+audio.duration;if(end>scene.end-.15)throw new Error(`Narration exceeds scene ${scene.id}`);
  segments.push({text:scene.title,start,end});inputs.push('-i',clip);filters.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(start*1000)}:all=1[v${i}]`);
 }
 const file=path.join(directory,'scene-narration.wav');filters.push(`${segments.map((_,i)=>`[v${i}]`).join('')}amix=inputs=${segments.length}:normalize=0,apad,atrim=duration=${config.duration}[voice]`);
 await run('ffmpeg',['-v','error','-y',...inputs,'-filter_complex',filters.join(';'),'-map','[voice]','-c:a','pcm_s16le',file]);
 await importVoice(project,{file,script:segments.map(s=>s.text).join('. '),segments,precision:'interpolated',generatedMetadata:{provider:'say',generated:true,network:false,license:'provider-terms-unverified'}});
}
for(const style of INTEGRATED){const examples=await fs.readdir(path.join(PACKAGE_ROOT,'styles',style,'examples'));
 for(const name of examples.filter(x=>x.endsWith('.json')).slice(0,2)){
  const original=await readJSON(path.join(PACKAGE_ROOT,'styles',style,'examples',name));const id=`${style}-${path.basename(name,'.json')}`,project=path.join(output,id);const started=Date.now();
  if(selected&&id!==selected)continue;executed++;
  try {
   if(await exists(project))await fs.rm(project,{recursive:true,force:true});
   const config=structuredClone(original);config.width=original.height>original.width?360:640;config.height=original.height>original.width?640:360;config.fps=12;
   // A full 15-second traversal at modest resolution; full-size design frames are captured separately.
   const scale=15/config.duration;config.duration=15;for(const s of config.scenes){s.start*=scale;s.end*=scale;}config.audio??={music:{enabled:false},sfx:[],voice:null};
   await initProject(project,{config});const coverage=[];
   if(['glass-product','whiteboard'].includes(style)&&original.height>original.width){const asset=await importAsset(project,{file:fixture,id:'test-emblem',source:'acceptance-fixture',license:'MIT',purpose:'image'});const updated=await readJSON(path.join(project,'aaa.json'));updated.content.image=asset.id;await writeJSON(path.join(project,'aaa.json'),updated);coverage.push('imported-svg-fixture');}
   if(['swiss-motion','whiteboard'].includes(style)&&original.width>original.height&&process.platform==='darwin'){await sceneNarration(project,config);coverage.push('local-narration','scene-aligned-speech','interpolated-word-times','subtitles');}
   const current=await readJSON(path.join(project,'aaa.json'));
   if(style==='dataviz'&&original.width>original.height){const {walk}=await import('../../skills/all-about-arts/lib/util.mjs');const files=await walk(PACKAGE_ROOT,{ignore:p=>p.startsWith('node_modules')});current.content.items=['.mjs','.js','.md'].map(ext=>({label:ext.slice(1).toUpperCase(),value:files.filter(f=>f.endsWith(ext)).length}));current.title='Inside this creative toolkit';current.content.title=current.title;current.content.subtitle='File counts; node_modules excluded.';current.scenes[1].title='Compare three file types';current.scenes[2].title='A toolkit you can inspect';for(const scene of current.scenes)scene.body='File counts; node_modules excluded.';current.scenes[0].title='Files that make a film';current.scenes[0].body='Measured file counts in this Skill package.';await writeJSON(path.join(project,'data/package-counts.json'),{measuredAt:new Date().toISOString(),excluded:'node_modules',items:current.content.items,files});coverage.push('measured-local-data');}
   if(['paper-lantern','pixel-rpg'].includes(style)&&original.height>original.width){current.audio.music={enabled:true,volume:.12};current.audio.sfx=[{id:'beat-one',type:'chime',time:5,volume:.1}];coverage.push('procedural-score','timed-sfx');}
   await writeJSON(path.join(project,'aaa.json'),current);const render=await renderProject(project,{workers:2});const small=await still(project,{time:7.5});
   const full=structuredClone(current);full.width=original.height>original.width?1080:1920;full.height=original.height>original.width?1920:1080;await writeJSON(path.join(project,'aaa.json'),full);const design=await still(project,{time:7.5,out:path.join(project,'out/design-1080.png')});await writeJSON(path.join(project,'aaa.json'),current);
   results.push({id,style,topic:current.title,status:'success',project,coverage,render,preview:small.path,designFrame:design.path,elapsedSeconds:(Date.now()-started)/1000,creativeReview:{status:'not-checked',reason:'Technical fixture run; visual medium review does not certify narrative transfer.'}});
  }catch(e){results.push({id,style,status:'failure',project,error:e.stack});}
  await writeJSON(path.join(output,'results.json'),{createdAt:new Date().toISOString(),status:results.some(r=>r.status==='failure')?'failure':'success',scope:'16 full-duration technical render tasks at 640×360/360×640, 12 fps; full-size design stills; creative and host-agent acceptance separate',results});
  console.log(`${id}: ${results.at(-1).status}`);
 }
}
if(!executed||results.length!==16||results.some(r=>r.status==='failure'))process.exitCode=1;
