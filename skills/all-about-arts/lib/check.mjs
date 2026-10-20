import fs from 'node:fs/promises';import path from 'node:path';import {run,sha256,readJSON,writeJSON,exists} from './util.mjs';
import {readConfig,fingerprint} from './project.mjs';import {checkAssets} from './assets.mjs';import {openFilm,visibleTexts} from './browser.mjs';import {resolveTimeline} from './timeline.mjs';
export const aggregateCheckStatus=checks=>checks.some(c=>c.status==='failure')?'failure':checks.some(c=>c.status!=='success')||!checks.length?'not-checked':'success';
export async function inspectVideo(file,config,{audio=false,alpha=false}={}) {
  try {const {stdout}=await run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]);const info=JSON.parse(stdout),v=info.streams.find(x=>x.codec_type==='video'),a=info.streams.find(x=>x.codec_type==='audio');const errors=[];
    if(!v)errors.push('No video stream');else {if(v.width!==config.width||v.height!==config.height)errors.push('Wrong frame size');if(+v.nb_read_frames!==Math.round(config.duration*config.fps))errors.push(`Wrong frame count: ${v.nb_read_frames}`);const [n,d]=v.avg_frame_rate.split('/').map(Number);if(Math.abs(n/d-config.fps)>1e-6)errors.push('Wrong frame rate');}
    if(Math.abs(+info.format.duration-config.duration)>1/config.fps+0.05)errors.push('Wrong output duration');if(audio&&!a)errors.push('Expected audio track missing');
    // Matroska stream-copy can uppercase this tag; alpha data remains present.
    if(alpha&&!(v?.pix_fmt?.includes('a')||Object.entries(v?.tags??{}).some(([k,value])=>k.toLowerCase()==='alpha_mode'&&value==='1')))errors.push('Alpha channel not signaled');
    await run('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-']);
    return {status:errors.length?'failure':'success',errors,video:v,audio:a??null,duration:+info.format.duration};
  }catch(e){return {status:'failure',errors:[e.message]};}
}
export async function analyzeMotion(file,{genre='art'}={}) {
  try {const {stdout}=await run('ffmpeg',['-v','error','-i',file,'-vf','fps=2,scale=96:54','-f','rawvideo','-pix_fmt','rgb24','-'],{maxBytes:128*1024*1024});const stride=96*54*3,n=Math.floor(stdout.length/stride),differences=[];
    for(let f=1;f<n;f++){let d=0;for(let i=0;i<stride;i++)d+=Math.abs(stdout[f*stride+i]-stdout[(f-1)*stride+i]);differences.push({time:f/2,difference:d/stride/255});}
    const mean=differences.reduce((a,b)=>a+b.difference,0)/Math.max(1,differences.length),advisories=[];
    if(mean<0.008)advisories.push({kind:'slow-motion',time:0,message:genre==='art'?'A sustained composition can suit this film; review whether the hold is intentional.':'Little visual change detected; check that each hold gives useful reading time.'});
    for(const d of differences.filter(x=>x.difference>.4).slice(0,12))advisories.push({kind:'large-change',time:d.time,message:'Strong visual change: inspect whether this is an intentional cut.'});
    return {status:'success',metrics:{sampleFps:2,averageDifference:mean,samples:n},advisories};
  }catch(e){return {status:'not-checked',reason:e.message};}
}
export async function checkProject(project,{config,video,determinism=true,write=true,signal}={}) {
  if(!config){const raw=await readConfig(project),timeline=resolveTimeline(raw);config={...raw,scenes:timeline.scenes,audio:{...raw.audio,sfx:timeline.sfx}};}
  const sourceHash=await fingerprint(project),checks=[],advisories=[];const assets=await checkAssets(project,config);checks.push({id:'assets',...assets});
  // Undefined uses an output tied to this source. Null deliberately skips output
  // inspection, for example while rendering the next encoded version.
  let record,outputIssue,output;
  if(video===undefined&&await exists(path.join(project,'out/render.json'))){try{const candidate=await readJSON(path.join(project,'out/render.json'));if(candidate.status==='success'&&candidate.sourceHash===sourceHash){record=candidate;video=record.path;if(typeof video!=='string'||!video)throw Error('Current render record has no output path');}}catch(e){outputIssue=e.message;}}
  let film;
  try{film=await openFilm(project,config,{signal});const times=[...new Set([0,...config.scenes.flatMap(s=>[s.start,Math.min(s.end-1/config.fps,(s.start+s.end)/2)]),config.duration-1/config.fps])].sort((a,b)=>a-b);
    const hashes=new Map();let registered=true;const textIssues=[];
    for(const time of times){await film.render(time);const result=await visibleTexts(film.page,time);registered&&=result.registered;
      for(const text of result.texts){if(![text.x,text.y,text.width,text.height].every(Number.isFinite)){textIssues.push({time,id:text.id,message:'Invalid text bounds'});continue;}if(text.x<-.5||text.y<-.5||text.x+text.width>config.width+.5||text.y+text.height>config.height+.5)textIssues.push({time,id:text.id,text:text.text,message:'Text extends outside the frame',critical:text.critical!==false});}
      if(determinism)hashes.set(time,sha256(await film.page.screenshot({type:'png',omitBackground:true})));
    }
    checks.push({id:'page',status:'success',samples:times});checks.push({id:'text-bounds',status:textIssues.some(x=>x.critical!==false)?'failure':registered?'success':'not-checked',issues:textIssues,scope:'DOM plus registered Canvas/WebGL text; sampled times'});
    if(determinism){const changes=[];for(const time of [...times].reverse()){await film.render(time);if(sha256(await film.page.screenshot({type:'png',omitBackground:true}))!==hashes.get(time))changes.push(time);}checks.push({id:'seek-determinism',status:changes.length?'failure':'success',times:changes,scope:'Sequential versus reverse seek in this browser/environment'});}
    else checks.push({id:'seek-determinism',status:'not-checked'});
    for(const s of config.scenes){const count=[...`${s.title??''}${s.body??''}`].length,hold=s.end-s.start;if(count>0&&count/hold>16)advisories.push({kind:'reading-time',scene:s.id,time:s.start,message:`${count} characters in ${hold.toFixed(1)} seconds; review reading time for the intended audience.`});}
  }catch(e){checks.push({id:'page',status:'failure',message:e.message});}finally{await film?.close();}
  if(outputIssue)checks.push({id:'encoded-video',status:'failure',errors:[outputIssue]});
  else if(video){try{
    const outputHash=sha256(await fs.readFile(video));if(record&&record.outputHash!==outputHash)throw Error('Rendered video changed after validation');
    const encoded=await inspectVideo(video,config,{audio:!!config.audio?.voice||!!config.audio?.music?.enabled||!!config.audio?.sfx?.length,alpha:!!config.transparent});
    if(sha256(await fs.readFile(video))!==outputHash){encoded.status='failure';encoded.errors.push('Encoded output changed during check');}
    checks.push({id:'encoded-video',...encoded});output={path:path.resolve(video),sha256:outputHash};
    if(encoded.status==='success'){const motion=await analyzeMotion(video,config);checks.push({id:'motion-analysis',status:motion.status,metrics:motion.metrics,reason:motion.reason});advisories.push(...(motion.advisories??[]));}
  }catch(e){checks.push({id:'encoded-video',status:'failure',errors:[e.message]});}}
  else checks.push({id:'encoded-video',status:'not-checked',reason:'No encoded output supplied'});
  const report={schemaVersion:1,status:aggregateCheckStatus(checks),sourceHash,createdAt:new Date().toISOString(),checks,advisories,...(output?{output}:{}),creativeReview:{status:'not-checked',reason:'Automated measurements do not certify storytelling, factual correctness or aesthetic quality.'}};
  if(await fingerprint(project)!==sourceHash){report.status='failure';report.checks.push({id:'source-stability',status:'failure',message:'Source changed during check'});}
  if(write)await writeJSON(path.join(project,'out','check.json'),report);return report;
}
export async function currentReport(project) {const f=path.join(project,'out/check.json');if(!await exists(f))return {status:'not-checked',reason:'No report'};const r=await readJSON(f);return r.sourceHash===await fingerprint(project)?r:{...r,status:'not-checked',reason:'Source or toolchain changed; rebuild required'};}
