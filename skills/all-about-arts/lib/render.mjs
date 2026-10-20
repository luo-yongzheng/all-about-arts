// Frame workers/pipe backpressure follow Lemo's render architecture (MIT).
import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {readConfig,fingerprint,PACKAGE_ROOT} from './project.mjs';import {withLock,run,writeJSON,sha256,canonicalDestination} from './util.mjs';import {checkAssets} from './assets.mjs';import {openFilm} from './browser.mjs';import {checkProject,inspectVideo,analyzeMotion,aggregateCheckStatus} from './check.mjs';
async function outputPath(project,target){const [p,f,skill]=await Promise.all([fs.realpath(project),canonicalDestination(target),fs.realpath(PACKAGE_ROOT)]);if(f===skill||f.startsWith(skill+path.sep))throw Error('Output cannot be written into the Skill package');if(f===p||(f.startsWith(p+path.sep)&&!f.startsWith(path.join(p,'out')+path.sep)))throw Error('Output inside a project must be in its out directory');return f;}
async function prepare(project){const config=await readConfig(project);const assets=await checkAssets(project,config);if(assets.status==='failure')throw Error(`Assets failed: ${JSON.stringify(assets.checks)}`);const {buildAudio}=await import('./audio.mjs');const audio=await buildAudio(project,config);if(audio.status==='failure')throw Error(`Audio failed: ${JSON.stringify(audio)}`);const {resolveTimeline}=await import('./timeline.mjs');const timeline=resolveTimeline(config,audio.words??[]);return {config:{...config,scenes:timeline.scenes,audio:{...config.audio,sfx:timeline.sfx}},audio};}
export async function still(project,{time=0,out,signal}={}) {
  const {config}=await prepare(project);time=Number(time);if(!Number.isFinite(time)||time<0||time>=config.duration)throw Error('still time must be within film duration');
  const target=await outputPath(project,out??path.join(project,'out',`still-${time.toFixed(3)}.png`));await fs.mkdir(path.dirname(target),{recursive:true});const film=await openFilm(project,config,{signal});
  try{await film.render(time);const png=await film.page.screenshot({type:'png',omitBackground:!!config.transparent});await fs.writeFile(target,png);return {status:'success',path:target,time,width:config.width,height:config.height};}finally{await film.close();}
}
function codecArgs(format){if(format==='mp4')return ['-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p'];if(format==='mov')return ['-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le'];if(format==='webm')return ['-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-lossless','1'];throw Error('format must be mp4, mov or webm');}
export async function renderProject(project,{format='mp4',workers=1,out,signal,ffmpeg='ffmpeg'}={}) {
  project=path.resolve(project);workers=Number(workers);if(!Number.isInteger(workers)||workers<1||workers>8)throw Error('workers must be between 1 and 8');codecArgs(format);
  return withLock(path.join(project,'.aaa/state/build.lock'),async()=>{
    const {config,audio}=await prepare(project);if(config.transparent&&format==='mp4')throw Error('Transparent projects require --format mov or webm');
    const sourceHash=await fingerprint(project),frames=Math.round(config.duration*config.fps),target=await outputPath(project,out??path.join(project,'out',`film.${format}`));await fs.mkdir(path.dirname(target),{recursive:true});
    return withLock(target+'.lock',async()=>{
      const tmp=await fs.mkdtemp(path.join(path.dirname(target),'.aaa-render-'));const started=Date.now(),procs=new Set(),films=new Set();let failed=false;
      const cleanup=()=>{failed=true;for(const p of procs)p.kill('SIGKILL');for(const f of films)f.browser.close().catch(()=>{});};signal?.addEventListener('abort',cleanup,{once:true});
      try{
        const report=await checkProject(project,{config,video:null,write:false,signal});if(report.status==='failure'||report.checks.some(x=>x.id!=='encoded-video'&&x.status==='not-checked'))throw Error(`Pre-render check failed or incomplete: ${JSON.stringify(report.checks.filter(x=>x.id!=='encoded-video'&&x.status!=='success'))}`);
        const count=Math.min(workers,frames),chunk=Math.ceil(frames/count);
        const results=await Promise.allSettled(Array.from({length:count},async(_,w)=>{
          const start=w*chunk,end=Math.min(frames,start+chunk);if(start>=end)return null;const film=await openFilm(project,config,{signal});films.add(film);const name=`segment-${w}.${format}`;
          const ff=spawn(ffmpeg,['-v','error','-y','-f','image2pipe','-framerate',String(config.fps),'-c:v','png','-i','-',...codecArgs(format),name],{cwd:tmp,stdio:['pipe','ignore','pipe']});procs.add(ff);let stderr='',dead;
          const done=new Promise(resolve=>{ff.on('error',e=>{dead=e.message;resolve(-1);});ff.on('close',code=>resolve(code));});ff.stderr.on('data',b=>stderr=(stderr+b).slice(-5000));ff.stdin.on('error',e=>{dead=e.message;});
          try{for(let frame=start;frame<end;frame++){if(failed||signal?.aborted)throw Error('Render cancelled');if(dead)throw Error(`Encoder failed: ${dead}`);await film.render(frame/config.fps);const image=await film.page.screenshot({type:'png',omitBackground:!!config.transparent});if(!ff.stdin.write(image))await Promise.race([once(ff.stdin,'drain').catch(()=>{}),done]);}ff.stdin.end();const code=await done;if(code!==0||dead)throw Error(`Encoder failed (${code}): ${dead??''} ${stderr}`);return name;}
          catch(e){cleanup();throw e;}finally{if(ff.exitCode===null)ff.kill();procs.delete(ff);await film.close();films.delete(film);}
        }));
        const error=results.find(x=>x.status==='rejected');if(error)throw error.reason;const names=results.map(x=>x.value).filter(Boolean);
        await fs.writeFile(path.join(tmp,'segments.txt'),names.map(n=>`file '${n}'`).join('\n'));
        await run(ffmpeg,['-v','error','-y','-f','concat','-safe','0','-i','segments.txt','-c','copy',`silent.${format}`],{cwd:tmp,signal});
        const final=path.join(tmp,`final.${format}`);
        if(audio.path){await run(ffmpeg,['-v','error','-y','-i',`silent.${format}`,'-i',audio.path,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a',format==='webm'?'libopus':format==='mov'?'pcm_s16le':'aac','-t',String(config.duration),...(format==='mp4'?['-movflags','+faststart']:[]),`final.${format}`],{cwd:tmp,signal});}else await fs.rename(path.join(tmp,`silent.${format}`),final);
        const encoded=await inspectVideo(final,config,{audio:!!audio.path,alpha:!!config.transparent});if(encoded.status==='failure')throw Error(`Output validation failed: ${encoded.errors.join('; ')}`);
        if(await fingerprint(project)!==sourceHash)throw Error('Source or tools changed during rendering; output was not published');
        report.checks=report.checks.filter(x=>x.id!=='encoded-video');report.checks.push({id:'encoded-video',...encoded});const motion=await analyzeMotion(final,config);report.checks.push({id:'motion-analysis',status:motion.status,metrics:motion.metrics});report.advisories.push(...(motion.advisories??[]));report.audio={fingerprint:audio.fingerprint,precision:audio.precision??null};report.status=aggregateCheckStatus(report.checks);
        if(report.status!=='success')throw Error('Final checks did not complete successfully');
        const coverFilm=await openFilm(project,config,{signal});try{await coverFilm.render(config.duration/3);await coverFilm.page.screenshot({path:path.join(tmp,'cover.png'),type:'png',omitBackground:!!config.transparent});}finally{await coverFilm.close();}
        const outputHash=sha256(await fs.readFile(final)),outputDir=path.join(project,'out');await fs.mkdir(outputDir,{recursive:true});
        await fs.rename(final,target);await fs.rename(path.join(tmp,'cover.png'),path.join(outputDir,'cover.png'));if(audio.subtitles)await fs.copyFile(audio.subtitles,path.join(outputDir,'subtitles.srt'));else await fs.rm(path.join(outputDir,'subtitles.srt'),{force:true});if(audio.wordsPath)await fs.copyFile(audio.wordsPath,path.join(outputDir,'words.json'));else await fs.rm(path.join(outputDir,'words.json'),{force:true});
        report.output={path:target,sha256:outputHash};await writeJSON(path.join(outputDir,'check.json'),report);
        const result={status:'success',path:target,format,frames,width:config.width,height:config.height,duration:config.duration,sourceHash,outputHash,audio:!!audio.path,elapsedSeconds:(Date.now()-started)/1000,toolchain:{node:process.version,browser:await browserVersion(),platform:process.platform},checkedAt:new Date().toISOString()};await writeJSON(path.join(outputDir,'render.json'),result);return result;
      }finally{cleanup();signal?.removeEventListener('abort',cleanup);await Promise.allSettled([...films].map(f=>f.close()));await fs.rm(tmp,{recursive:true,force:true});}
    });
  });
}
async function browserVersion(){const {browserExecutable}=await import('./browser.mjs');try{return (await run(await browserExecutable(),['--version'])).stdout.toString().trim();}catch{return 'unavailable';}}
