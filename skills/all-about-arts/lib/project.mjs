import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {readJSON,writeJSON,sha256,walk,relativePath,exists} from './util.mjs';
export const PACKAGE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const INTEGRATED=['pixel-rpg','impasto','ink-wash','dataviz','glass-product','whiteboard','swiss-motion','paper-lantern'];
export function defaultConfig(options={}) {
  const duration=Number(options.duration??18),portrait=options.portrait===true;
  const title=options.title??'A new possibility';
  return {schemaVersion:1,title,style:options.style??'pixel-rpg',width:portrait?1080:1920,height:portrait?1920:1080,fps:30,duration,seed:42,genre:'art',content:{title,subtitle:'',items:[{label:'Explore',value:32},{label:'Understand',value:58},{label:'Create',value:86}]},scenes:[{id:'opening',start:0,end:duration/3,title,body:'A question begins a journey.',kind:'establish'},{id:'development',start:duration/3,end:duration*2/3,title:'Follow the change',body:'Small actions reveal a larger pattern.',kind:'develop'},{id:'ending',start:duration*2/3,end:duration,title:'A new possibility',body:'What will you do next?',kind:'resolve'}],audio:{music:{enabled:false},sfx:[],voice:null},assets:[]};
}
const finite=(n,label,min,max)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`${label} must be between ${min} and ${max}`);};
export function validateConfig(c) {
  if(!c||c.schemaVersion!==1)throw Error('Unsupported aaa.json schemaVersion (expected 1)');
  if(!INTEGRATED.includes(c.style))throw Error(`Style ${c.style} is reference-only or unknown. Use styles to inspect availability.`);
  for(const key of ['width','height']){finite(c[key],key,16,8192);if(c[key]%2)throw Error(`${key} must be an even integer`);}
  finite(c.fps,'fps',1,120);finite(c.duration,'duration',1/c.fps,3600);finite(c.seed,'seed',0,2147483647);
  if(Math.abs(Math.round(c.duration*c.fps)-c.duration*c.fps)>1e-6)throw Error('duration × fps must be an integer frame count');
  if(!Array.isArray(c.scenes)||!c.scenes.length)throw Error('At least one scene is required');
  const ids=new Set();let last=0;
  for(const s of c.scenes){if(!s.id||ids.has(s.id))throw Error('Scene IDs must be unique');ids.add(s.id);
    for(const k of ['start','end']){if(typeof s[k]==='number')finite(s[k],`scene ${s.id}.${k}`,0,c.duration);else if(!s[k]||!('word' in s[k]))throw Error(`Invalid scene ${s.id}.${k}`);}
    if(typeof s.start==='number'&&typeof s.end==='number'){if(s.end<=s.start||s.start<last-1e-6)throw Error(`Overlapping or empty scene: ${s.id}`);last=s.end;}
  }
  for(const a of c.assets??[]){if(!a.id)throw Error('Asset id required');relativePath(a.path);}
  if(c.audio?.voice?.file)relativePath(c.audio.voice.file);
  if(c.content?.image&&!c.assets?.some(a=>a.id===c.content.image))relativePath(c.content.image);
  return c;
}
export async function readConfig(project){return validateConfig(await readJSON(path.join(project,'aaa.json')));}
export const ignoreProjectFile=(rel)=>rel==='out'||rel.startsWith('out/')||rel==='.aaa/state'||rel.startsWith('.aaa/state/')||rel==='.aaa/timeline.json'||rel==='.git'||rel.startsWith('.git/')||rel==='node_modules'||rel.startsWith('node_modules/')||rel==='.DS_Store'||rel.endsWith('.lock')||rel.endsWith('.tmp');
export async function fingerprint(project) {
  const files=await walk(project,{ignore:ignoreProjectFile});const h=[];
  for(const f of files)h.push([f,sha256(await fs.readFile(path.join(project,f)))]);
  // Code changes invalidate old reports even when the user project is untouched.
  const toolFiles=await walk(PACKAGE_ROOT,{ignore:r=>r==='node_modules'||r==='runtime'||r==='references'||r==='styles'||r==='studio'||r==='licenses'||r.startsWith('.')});
  for(const f of toolFiles)h.push([`@tool/${f}`,sha256(await fs.readFile(path.join(PACKAGE_ROOT,f)))]);
  return sha256(JSON.stringify(h));
}
export async function initProject(directory,options={}) {
  const target=path.resolve(directory);if(target===PACKAGE_ROOT||target.startsWith(PACKAGE_ROOT+path.sep))throw Error('Create user films outside the skill package');
  if(await exists(target)&&(await fs.readdir(target)).length)throw Error(`Project directory is not empty: ${target}`);
  let c=options.config?structuredClone(options.config):defaultConfig(options);if(options.size){const m=/^(\d+)x(\d+)$/.exec(options.size);if(!m)throw Error('size must be WIDTHxHEIGHT');c.width=+m[1];c.height=+m[2];}if(options.fps)c.fps=+options.fps;validateConfig(c);
  await fs.mkdir(target,{recursive:true});await fs.mkdir(path.join(target,'assets'),{recursive:true});
  await fs.cp(path.join(PACKAGE_ROOT,'runtime'),path.join(target,'.aaa/runtime'),{recursive:true});
  await writeJSON(path.join(target,'aaa.json'),c);
  await fs.writeFile(path.join(target,'index.html'),'<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>all-about-arts film</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><canvas id="film"></canvas><script type="module" src="./film.mjs"></script></body></html>\n');
  await fs.writeFile(path.join(target,'film.mjs'),"import {createFilm} from './.aaa/runtime/film.mjs';\nconst config = window.__AAA_CONFIG ?? await (await fetch('./aaa.json')).json();\nwindow.AAA = await createFilm(document.querySelector('#film'), config);\nawait window.AAA.ready;\nawait window.AAA.render(0);\n");
  await fs.cp(path.join(PACKAGE_ROOT,'licenses'),path.join(target,'.aaa/licenses'),{recursive:true});
  await writeJSON(path.join(target,'.aaa/toolchain.json'),{name:'all-about-arts',version:(await readJSON(path.join(PACKAGE_ROOT,'package.json'))).version,dependencies:(await readJSON(path.join(PACKAGE_ROOT,'package.json'))).dependencies});
  return {status:'success',project:target,config:c};
}
