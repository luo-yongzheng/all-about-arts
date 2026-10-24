import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {canonicalDestination, exists, readJSON, run} from './util.mjs';

const PACKAGE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const LEMO_ROOT=path.join(PACKAGE_ROOT,'vendor/lemo-opuscar');
const require=createRequire(import.meta.url);
const help=`Native Lemo tools — the bundled original film engines and production tools

aaa lemo root [--json]
aaa lemo doctor [--json]
aaa lemo init <directory> --style <slug> [--title text --duration 45 --size 1920x1080 --fps 24]
aaa lemo still <project> <seconds...> [--range a:b:step --prefix t_ --out directory]
aaa lemo video <project> [--fps 24 --workers 3 --out video.mp4]
aaa lemo events <project> [--out events.json]
aaa lemo readcheck <project> [--step .04 --latin-cps 15 --cjk-cps 4.5 --pad 1.5 --min 1.5]

The four page tools accept --size WxH, --q query, and --json. Output paths are
relative to your current directory. Init creates an UNFINISHED editable scaffold;
author the film using its selected STYLE.md before delivery. Nothing is installed
or downloaded automatically. AAA_CHROME selects the native browser.
`;
const optionSets={root:[],doctor:[],init:['style','title','duration','size','fps'],still:['size','q','out','prefix','range'],video:['size','q','out','fps','workers'],events:['size','q','out'],readcheck:['size','q','step','latin-cps','cjk-cps','pad','min']};

function parse(args){
 const command=args[0]??'help',flags={},pos=[];
 if(command==='help'||command==='--help')return {command:'help',flags,pos};
 if(!Object.hasOwn(optionSets,command))throw Error(`Unknown native command: ${command}. Use aaa lemo help.`);
 for(let i=1;i<args.length;i++){
  const arg=args[i];if(!arg.startsWith('--')){pos.push(arg);continue;}
  const split=arg.indexOf('='),key=arg.slice(2,split<0?undefined:split);let value=split<0?undefined:arg.slice(split+1);
  if(key==='json'||key==='help'){if(value===undefined)value=true;else if(value==='true')value=true;else if(value==='false')value=false;else throw Error(`--${key} must be true or false`);}
  else {if(!optionSets[command].includes(key))throw Error(`Unknown ${command} option: --${key}`);if(value===undefined){value=args[++i];if(value===undefined||value.startsWith('--'))throw Error(`--${key} needs a value`);}if(value==='')throw Error(`--${key} needs a nonempty value`);}
  if(Object.hasOwn(flags,key))throw Error(`Duplicate option: --${key}`);flags[key]=value;
 }
 return {command,flags,pos};
}
function size(value='1920x1080'){
 const m=/^(\d+)x(\d+)$/.exec(String(value));const w=Number(m?.[1]),h=Number(m?.[2]);
 if(!m||[w,h].some(n=>n<16||n>8192||n%2))throw Error('size must be WxH with even dimensions from 16 to 8192');
 return {width:w,height:h};
}
function positive(value,name,{integer=false,max=Infinity,zero=false}={}){
 const n=Number(value);if(!Number.isFinite(n)||(zero?n<0:n<=0)||n>max||(integer&&!Number.isInteger(n)))throw Error(`${name} must be ${zero?'a nonnegative':'a positive'} ${integer?'integer':'number'}${max<Infinity?` at most ${max}`:''}`);return n;
}
const within=(root,target)=>target===root||target.startsWith(root+path.sep);
async function vendor(){if(!await exists(path.join(LEMO_ROOT,'core/render/page.mjs')))throw Error('Bundled Lemo snapshot is missing. Reinstall the complete all-about-arts skill.');return fs.realpath(LEMO_ROOT);}
async function externalPath(target,label){const real=await canonicalDestination(target),root=await fs.realpath(PACKAGE_ROOT);if(within(root,real))throw Error(`${label} must be outside the installed skill: ${real}`);return real;}
function html(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shell(value){return `'${String(value).replaceAll("'","'\\''")}'`;}

export async function initNativeProject(target,options={}){
 const root=await vendor(),slug=options.style;
 if(typeof slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!await exists(path.join(root,'styles',slug,'STYLE.md')))throw Error(`Unknown native style: ${slug??'(missing --style)'}. Use aaa styles.`);
 const project=await externalPath(target,'Project'),{width,height}=size(options.size),duration=positive(options.duration??45,'duration'),fps=positive(options.fps??24,'fps',{max:120});
 if(Math.abs(duration*fps-Math.round(duration*fps))>1e-6)throw Error('duration × fps must be a whole number of frames');
 const config={schemaVersion:1,kind:'lemo-native',stage:'scaffold',style:slug,title:options.title??'Untitled film',duration,width,height,fps,styleGuide:`styles/${slug}/STYLE.md`};
 if(typeof config.title!=='string'||!config.title.trim()||config.title.includes('\0'))throw Error('title must be nonempty text');
 let created=false;
 try{await fs.mkdir(project,{recursive:false});created=true;}catch(e){if(e.code==='ENOENT'){await fs.mkdir(path.dirname(project),{recursive:true});await fs.mkdir(project);created=true;}else if(e.code!=='EEXIST')throw e;}
 if(!created&&(!(await fs.stat(project)).isDirectory()||(await fs.readdir(project)).length))throw Error(`Refusing to overwrite a nonempty project: ${project}`);
 const files={
  'lemo-project.json':JSON.stringify(config,null,2)+'\n',
  'index.html':`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(config.title)} — unfinished scaffold</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#16191d}canvas{display:block;width:100%;height:100%}</style></head><body><canvas aria-label="Unfinished film scaffold"></canvas><script type="module" src="./film.mjs"></script></body></html>\n`,
  'film.mjs':`// UNFINISHED SCAFFOLD: this diagnostic canvas is not the selected style or a finished film.\n// Write TREATMENT.md first; read the selected STYLE.md, then study demo techniques.\n// Replace this module with original art, motion, story and sound for the user's topic.\nconst config=await fetch('./lemo-project.json').then(r=>r.json());\nconst canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');\nconst label='UNFINISHED SCAFFOLD';\nwindow.DUR=config.duration;\nwindow.EV=[];\nfunction bounds(){return {id:'scaffold',text:label,x0:innerWidth*.08,y0:innerHeight*.43,x1:innerWidth*.92,y1:innerHeight*.57};}\nwindow.TEXTS=()=>[bounds()];\nwindow.render=t=>{\n canvas.width=innerWidth;canvas.height=innerHeight;\n ctx.fillStyle='#16191d';ctx.fillRect(0,0,canvas.width,canvas.height);\n ctx.fillStyle='#e6e7e8';ctx.textAlign='center';ctx.textBaseline='middle';\n ctx.font=Math.min(innerWidth*.042,innerHeight*.08)+'px sans-serif';\n ctx.fillText(label,innerWidth/2,innerHeight/2,innerWidth*.84);\n};\nawait document.fonts.ready;\nwindow.render(0);\nwindow.READY=true;\n`,
  'TREATMENT.md':`# ${config.title}\n\nStatus: UNFINISHED — planning template, not a completed treatment or film.\n\nSelected style: ${slug}. Read \`${config.styleGuide}\` inside the root reported by \`aaa lemo root\`. Read DIRECTOR.md and TECHNIQUE.md there too.\n\nWrite this treatment before opening DEMO.md or demo code. Keep the style's invariants; invent the user's own story.\n\n## Brief and sources\nTODO: topic, audience, language, factual sources, supplied assets, intended feeling.\n\n## Three candidate structures\n1. TODO\n2. TODO\n3. TODO\n\n## Chosen structure and reason\nTODO\n\n## Style invariants and native techniques\nTODO: record the selected STYLE.md's visual, camera, motion and sound requirements.\n\n## Original scenes, sound and ending\nTODO\n\n## Delivery checks\nTODO: style frames, source accuracy, reading time, audio, render and manual review.\n`,
  'STORYBOARD.md':`# Unfinished storyboard — ${config.title}\n\nStatus: UNFINISHED. These are planning prompts, not authored scenes.\n\nComplete TREATMENT.md first. Then create the user's original shot sequence with time ranges, composition, actions, camera, transitions, dialogue, music, effects, and readable text holds.\n\n| Time | Purpose | Picture / action | Camera / motion | Sound / text |\n|---|---|---|---|---|\n| TODO | TODO | TODO | TODO | TODO |\n\nDo not reuse the reference demo's story, props, shots or timeline.\n`,
  'build.sh':`#!/bin/sh\nset -eu\nPROJECT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nif [ -n "\${AAA_SKILL_ROOT:-}" ]; then\n  exec node "$AAA_SKILL_ROOT/scripts/lemo.mjs" video "$PROJECT" "$@"\nelif command -v aaa >/dev/null 2>&1; then\n  exec aaa lemo video "$PROJECT" "$@"\nelse\n  exec node ${shell(path.join(PACKAGE_ROOT,'scripts/lemo.mjs'))} video "$PROJECT" "$@"\nfi\n`
 };
 // Exclusive writes also protect an empty target if another process starts using it.
 for(const [name,content] of Object.entries(files))await fs.writeFile(path.join(project,name),content,{flag:'wx',mode:name==='build.sh'?0o755:0o644});
 return {status:'success',project,style:slug,stage:'scaffold',root,styleGuide:path.join(root,config.styleGuide),message:'Created an unfinished native project. Author the treatment and film before delivery.'};
}

// Upstream serves /node_modules from its own root, while Node resolves imports
// through the parent package. This runtime-only link makes both views agree.
async function nativeDependencies(){
 const source=path.join(PACKAGE_ROOT,'node_modules');
 for(const module of ['playwright-core','three'])if(!await exists(path.join(source,module,'package.json')))throw Error(`Missing ${module}. Install the skill's pinned dependencies before native rendering.`);
 const target=path.join(await vendor(),'node_modules');
 try{await fs.symlink(path.relative(path.dirname(target),source),target,'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
 if(await fs.realpath(target)!==await fs.realpath(source))throw Error(`Native node_modules conflicts with the skill dependencies: ${target}. Resolve it explicitly before rendering.`);
}

export async function nativeDoctor(){
 const checks=[{id:'node',required:true,status:Number(process.versions.node.split('.')[0])>=22?'success':'failure',version:process.version}];
 try{checks.push({id:'vendor',required:true,status:'success',path:await vendor()});}catch(e){checks.push({id:'vendor',required:true,status:'failure',message:e.message});}
 for(const module of ['playwright-core','three']){try{checks.push({id:module,required:true,status:'success',path:require.resolve(module)});}catch{checks.push({id:module,required:true,status:'failure',message:'Install the skill package dependencies explicitly.'});}}
 for(const executable of ['ffmpeg','ffprobe']){try{const r=await run(executable,['-version']);checks.push({id:executable,required:true,status:'success',version:r.stdout.toString().split('\n')[0]});}catch(e){checks.push({id:executable,required:true,status:'failure',message:e.message});}}
 try{const {browserExecutable}=await import('./browser.mjs');checks.push({id:'browser',required:true,status:'success',path:await browserExecutable()});}catch(e){checks.push({id:'browser',required:true,status:'failure',message:e.message});}
 const python=process.env.AAA_LEMO_PYTHON??(await exists(path.join(LEMO_ROOT,'.venv/bin/python'))?path.join(LEMO_ROOT,'.venv/bin/python'):'python3');
 let modules={};try{const r=await run(python,['-c',`import importlib.util,json,sys\nnames=['numpy','scipy','soundfile','soxr','PIL','kokoro_onnx','edge_tts','faster_whisper','av','numba']\nprint(json.dumps({'version':sys.version.split()[0],'modules':{n:importlib.util.find_spec(n) is not None for n in names}}))`]);const data=JSON.parse(r.stdout.toString());modules=data.modules;checks.push({id:'python',required:false,status:'success',path:python,version:data.version});}catch(e){checks.push({id:'python',required:false,status:'not-installed',path:python,message:e.message});}
 const tier=names=>({status:names.every(n=>modules[n])?'available':'not-installed',missing:names.filter(n=>!modules[n])});
 const models=await Promise.all(['kokoro-v1.0.onnx','voices-v1.0.bin'].map(async name=>({name,present:await exists(path.join(LEMO_ROOT,'core/tts',name))})));
 const tiers={audio:tier(['numpy','scipy','soundfile','soxr','PIL']),voice:{...tier(['kokoro_onnx','edge_tts','faster_whisper','av']),models,note:'Offline Kokoro also needs both model files; ASR may need a cached model. No network or model download is performed.'},music:{...tier(['numba']),sampleLibraries:await exists(path.join(LEMO_ROOT,'core/audio/instruments')),note:'Sampled instruments require their separately acquired libraries.'}};
 if(models.some(m=>!m.present)&&tiers.voice.status==='available')tiers.voice.status='dependencies-only';
 return {status:checks.some(c=>c.required&&c.status==='failure')?'failure':'success',root:LEMO_ROOT,checks,tiers,installed:false};
}

function runNative(script,args,{cwd,env,signal}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[script,...args],{cwd,env,signal,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',data=>{stdout=(stdout+data).slice(-65536);});
  child.stderr.on('data',data=>{stderr=(stderr+data).slice(-65536);});
  child.on('error',reject);
  child.on('close',(code,termination)=>{
   if(code===0)resolve({stdout,stderr});
   else {const e=Error(`Native ${path.basename(script,'.mjs')} failed (${termination??code}):\n${[stdout.trim(),stderr.trim()].filter(Boolean).join('\n').slice(-16000)}`);e.exitCode=code??1;reject(e);}
  });
 });
}

async function renderNative(command,pos,flags,{signal}={}){
 if(!pos[0]||pos[0].startsWith('--'))throw Error(`${command} requires a project directory`);
 if(command!=='still'&&pos.length!==1)throw Error(`${command} accepts one project directory`);
 const project=await fs.realpath(path.resolve(pos[0])).catch(()=>{throw Error(`Project does not exist: ${pos[0]}`);});
 if(!await exists(path.join(project,'index.html')))throw Error(`No index.html in project: ${project}`);
 const config=await exists(path.join(project,'lemo-project.json'))?await readJSON(path.join(project,'lemo-project.json')):null;
 const dimensions=size(flags.size??(config?`${config.width}x${config.height}`:undefined));
 const args=[project,'--size',`${dimensions.width}x${dimensions.height}`];
 if(flags.q!==undefined)args.push('--q',flags.q);
 if(command==='still'){
  const times=pos.slice(1);for(const t of times)positive(t,'still time',{zero:true});
  if(!times.length&&!flags.range)throw Error('still needs at least one time or --range a:b:step');
  if(flags.range){const pieces=flags.range.split(':'),[a,b,step]=pieces.map(Number);if(pieces.length!==3||!pieces.every(p=>p.trim())||![a,b,step].every(Number.isFinite)||a<0||b<a||step<=0)throw Error('range must be a:b:step with 0 <= a <= b and step > 0');args.push('--range',flags.range);}
  if(flags.prefix!==undefined){if(/[\\/\0]/.test(flags.prefix)||flags.prefix==='.'||flags.prefix==='..')throw Error('prefix must be a filename prefix without path separators');args.push('--prefix',flags.prefix);}
  // Normalize spelling so a time such as 1/2 or a path cannot become a filename.
  args.push(...times.map(t=>String(Number(t))));
 }
 if(command==='video'){
  args.push('--fps',String(positive(flags.fps??config?.fps??24,'fps',{max:120})));if(flags.workers!==undefined)args.push('--workers',String(positive(flags.workers,'workers',{integer:true,max:6})));
 }
 if(command==='readcheck')for(const key of ['step','latin-cps','cjk-cps','pad','min'])if(flags[key]!==undefined)args.push(`--${key}`,String(positive(flags[key],key,{zero:key==='pad'||key==='min'})));
 if(flags.out!==undefined)args.push('--out',await externalPath(path.resolve(flags.out),'Output'));
 else if(command!=='readcheck'){
  const dest=command==='still'?path.join(project,'stills'):command==='video'?path.join(project,'out/video.mp4'):path.join(project,'events.json');
  args.push('--out',await externalPath(dest,'Output'));
 }
 await nativeDependencies();
 const {browserExecutable}=await import('./browser.mjs');
 const env={...process.env,PLAYWRIGHT_CHROME:await fs.realpath(await browserExecutable())};
 const root=await vendor(),result=await runNative(path.join(root,`core/render/${command}.mjs`),args,{cwd:root,env,signal});
 return {status:'success',command,project,root,stdout:result.stdout.trim(),stderr:result.stderr.trim()};
}

export async function lemoMain(args=process.argv.slice(2),options={}){
 const {command,flags,pos}=parse(args);if(command==='help'||flags.help){console.log(help);return;}
 let result;
 if(command==='root'||command==='doctor'){if(pos.length)throw Error(`${command} takes no project argument`);result=command==='root'?{status:'success',root:await vendor()}:await nativeDoctor();}
 else if(command==='init'){if(pos.length!==1)throw Error('init requires exactly one new project directory');result=await initNativeProject(path.resolve(pos[0]),flags);}
 else result=await renderNative(command,pos,flags,options);
 console.log(JSON.stringify(result,null,flags.json?0:2));if(result.status==='failure')process.exitCode=1;return result;
}
