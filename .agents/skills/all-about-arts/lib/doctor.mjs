import os from 'node:os';import path from 'node:path';import {run,exists} from './util.mjs';import {browserExecutable} from './browser.mjs';
export async function doctor(){const checks=[{id:'node',required:true,status:Number(process.versions.node.split('.')[0])>=22?'success':'failure',version:process.version}];
 for(const cmd of ['ffmpeg','ffprobe']){try{const r=await run(cmd,['-version']);checks.push({id:cmd,required:true,status:'success',version:r.stdout.toString().split('\n')[0]});}catch(e){checks.push({id:cmd,required:true,status:'failure',message:e.message});}}
 try{checks.push({id:'browser',required:true,status:'success',path:await browserExecutable()});}catch(e){checks.push({id:'browser',required:true,status:'failure',message:e.message});}
 try{const r=await run('python3',['--version']);checks.push({id:'python',required:false,status:'success',version:r.stdout.toString().trim(),note:'Python 3.12 is recommended for optional Lemo voice tools.'});}catch{checks.push({id:'python',required:false,status:'not-checked'});}
 const cache=process.env.AAA_CACHE??path.join(os.homedir(),'.cache/all-about-arts');checks.push({id:'optional-models',required:false,status:await exists(cache)?'success':'not-checked',path:cache,note:'No model is downloaded automatically.'});
 return {status:checks.some(x=>x.required&&x.status==='failure')?'failure':'success',platform:process.platform,support:process.platform==='darwin'?'macOS':process.platform==='linux'?'core-tools':'experimental',checks};
}
