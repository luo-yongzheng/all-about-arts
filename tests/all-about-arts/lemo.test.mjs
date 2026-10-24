import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const workspace=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const skill=path.join(workspace,'.agents/skills/all-about-arts');
const script=path.join(skill,'scripts/lemo.mjs');
const nativeRoot=path.join(skill,'vendor/lemo-opuscar');
function cli(args,cwd,env={}) {return spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,...env},encoding:'utf8',timeout:60000});}
function success(result){assert.equal(result.status,0,result.stderr||result.stdout);return JSON.parse(result.stdout);}
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aaa native 中文 '));t.after(()=>fs.rm(dir,{force:true,recursive:true}));return dir;}

test('native root is the bundled snapshot from any caller working directory',async t=>{
 const cwd=await fixture(t),result=success(cli(['root','--json'],cwd));
 assert.equal(result.root,nativeRoot);await fs.access(path.join(result.root,'core/render/still.mjs'));
});
test('native init creates an editable unfinished project outside the package',async t=>{
 const cwd=await fixture(t),result=success(cli(['init','my film','--style','impasto','--title','Rain & 光','--duration','3','--size','640x360','--fps','24','--json'],cwd));
 assert.equal(result.project,path.join(await fs.realpath(cwd),'my film'));assert.equal(result.status,'success');
 const config=JSON.parse(await fs.readFile(path.join(result.project,'lemo-project.json'),'utf8'));
 assert.equal(config.style,'impasto');assert.equal(config.title,'Rain & 光');assert.equal(config.duration,3);assert.equal(config.width,640);assert.equal(config.height,360);assert.equal(config.fps,24);assert.equal(config.stage,'scaffold');
 for(const name of ['index.html','film.mjs','TREATMENT.md','STORYBOARD.md','build.sh'])assert.ok((await fs.stat(path.join(result.project,name))).size>0);
 assert.equal((await fs.stat(path.join(result.project,'build.sh'))).mode&0o111,0o111);
});
test('native init refuses unknown styles, invalid frame settings, and existing content without writes',async t=>{
 const cwd=await fixture(t);
 for(const flags of [['--style','../impasto'],['--style','missing-style'],['--style','impasto','--duration','0'],['--style','impasto','--size','641x360'],['--style','impasto','--fps','Infinity'],['--style','impasto','--size','640x360','--duration','0.001']]){
  const result=cli(['init','untouched',...flags,'--json'],cwd);assert.notEqual(result.status,0);await assert.rejects(fs.stat(path.join(cwd,'untouched')),{code:'ENOENT'});
 }
 const occupied=path.join(cwd,'occupied');await fs.mkdir(occupied);await fs.writeFile(path.join(occupied,'keep.txt'),'unchanged');
 const result=cli(['init','occupied','--style','impasto','--json'],cwd);assert.notEqual(result.status,0);assert.equal(await fs.readFile(path.join(occupied,'keep.txt'),'utf8'),'unchanged');assert.deepEqual(await fs.readdir(occupied),['keep.txt']);
});
test('native command validates project, options, and image output prefix before launching',async t=>{
 const cwd=await fixture(t);success(cli(['init','film','--style','impasto','--json'],cwd));
 for(const args of [['still','missing','0'],['still','film','abc'],['still','film','0','--prefix','../escape'],['still','film','0','--out'],['events','film','--nonsense'],['setup'],['video','film','--workers','0']]){
  const r=cli([...args,'--json'],cwd);assert.notEqual(r.status,0,JSON.stringify(args));const error=JSON.parse(r.stderr);assert.equal(error.status,'failure');assert.ok(error.error.message);
 }
 assert.deepEqual((await fs.readdir(path.join(cwd,'film'))).sort(),['STORYBOARD.md','TREATMENT.md','build.sh','film.mjs','index.html','lemo-project.json'].sort());
});
test('native doctor reports core and optional tiers without installing',async t=>{
 const cwd=await fixture(t),result=cli(['doctor','--json'],cwd);assert.ok([0,1].includes(result.status));const report=JSON.parse(result.stdout);
 assert.ok(report.checks.some(x=>x.id==='browser'&&x.required));assert.ok(report.checks.some(x=>x.id==='vendor'&&x.required));assert.ok(report.tiers.voice);assert.ok(report.tiers.music);assert.equal(report.installed,false);assert.deepEqual(await fs.readdir(cwd),[]);
});

test('native still resolves relative outputs from caller and serves Three.js to an external project',async t=>{
 const {browserExecutable}=await import('../../.agents/skills/all-about-arts/lib/browser.mjs');
 let executable;try{executable=await browserExecutable();}catch{return t.skip('Chrome/Chromium unavailable');}
 const cwd=await fixture(t);success(cli(['init','film','--style','glass-product','--duration','2','--size','320x180','--json'],cwd));
 await fs.symlink(executable,path.join(cwd,'local-chrome'));
 const project=path.join(cwd,'film');
 await fs.writeFile(path.join(project,'film.mjs'),`import {Color} from '/node_modules/three/build/three.module.js';\nconst canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');\ncanvas.width=320;canvas.height=180;window.DUR=2;window.EV=[{t:0,type:'test'}];window.TEXTS=()=>[{id:'label',text:'Native',x0:10,y0:10,x1:100,y1:40}];window.render=t=>{ctx.fillStyle=new Color(t?'red':'blue').getStyle();ctx.fillRect(0,0,320,180)};window.render(0);window.READY=true;\n`);
 const still=success(cli(['still','film','0','1','--out','review frames','--json'],cwd,{AAA_CHROME:'./local-chrome'}));
 assert.equal(still.command,'still');for(const name of ['t_0.jpg','t_1.jpg'])assert.ok((await fs.stat(path.join(cwd,'review frames',name))).size>0);
 const events=success(cli(['events','film','--out','review events.json','--json'],cwd,{AAA_CHROME:executable}));assert.equal(events.command,'events');assert.deepEqual(JSON.parse(await fs.readFile(path.join(cwd,'review events.json'),'utf8')),{dur:2,ev:[{t:0,type:'test'}]});
 const readcheck=success(cli(['readcheck','film','--json'],cwd,{AAA_CHROME:executable}));assert.equal(readcheck.command,'readcheck');
});

test('native paths cannot create projects or outputs in the installed skill',async t=>{
 const cwd=await fixture(t),blocked=path.join(skill,'native-project-must-not-exist');
 const result=cli(['init',blocked,'--style','impasto','--json'],cwd);assert.notEqual(result.status,0);await assert.rejects(fs.stat(blocked),{code:'ENOENT'});
 success(cli(['init','film','--style','impasto','--json'],cwd));
 await fs.symlink(skill,path.join(cwd,'installed'));
 const out=cli(['events','film','--out','installed/native-events-must-not-exist.json','--json'],cwd);assert.notEqual(out.status,0);assert.match(JSON.parse(out.stderr).error.message,/outside the installed skill/);
 await assert.rejects(fs.stat(path.join(skill,'native-events-must-not-exist.json')),{code:'ENOENT'});
});

test('native readcheck keeps the upstream failure report and generated build script works from any directory',async t=>{
 const {browserExecutable}=await import('../../.agents/skills/all-about-arts/lib/browser.mjs');
 let executable;try{executable=await browserExecutable();}catch{return t.skip('Chrome/Chromium unavailable');}
 const cwd=await fixture(t);success(cli(['init',"film with 'quote'",'--style','impasto','--duration','1','--size','320x180','--fps','2','--json'],cwd));
 const project=path.join(cwd,"film with 'quote'");
 const failed=cli(['readcheck',project,'--json'],cwd,{AAA_CHROME:executable});assert.notEqual(failed.status,0);assert.match(JSON.parse(failed.stderr).error.message,/BAD.*scaffold/);
 const build=spawnSync('sh',[path.join(project,'build.sh'),'--workers','1','--out','rendered movie.mp4','--json'],{cwd,env:{...process.env,AAA_CHROME:executable,AAA_SKILL_ROOT:skill},encoding:'utf8',timeout:60000});
 assert.equal(success(build).command,'video');assert.ok((await fs.stat(path.join(cwd,'rendered movie.mp4'))).size>0);
});

test('a copied installation renders an external native page using only its copied dependencies',async t=>{
 const {browserExecutable}=await import('../../.agents/skills/all-about-arts/lib/browser.mjs');
 let executable;try{executable=await browserExecutable();}catch{return t.skip('Chrome/Chromium unavailable');}
 const cwd=await fixture(t),{install}=await import('../../.agents/skills/all-about-arts/scripts/install.mjs');
 const installed=await install({host:'codex',root:path.join(cwd,'host'),copy:true,dependencies:false});const copied=installed.installations[0].path;
 await fs.cp(path.join(skill,'node_modules'),path.join(copied,'node_modules'),{recursive:true,dereference:true});
 const copiedCli=(args)=>spawnSync(process.execPath,[path.join(copied,'scripts/lemo.mjs'),...args],{cwd,env:{...process.env,AAA_CHROME:executable},encoding:'utf8',timeout:60000});
 const root=success(copiedCli(['root','--json'])).root;assert.equal(root,path.join(copied,'vendor/lemo-opuscar'));assert.notEqual(root,nativeRoot);
 success(copiedCli(['init','independent film','--style','brick-toy','--duration','1','--size','320x180','--json']));
 const project=path.join(cwd,'independent film');
 await fs.writeFile(path.join(project,'film.mjs'),`import {Color} from '/node_modules/three/build/three.module.js';\nimport {clamp} from '/core/lib.js';\nconst canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');canvas.width=320;canvas.height=180;window.DUR=1;window.EV=[];window.TEXTS=()=>[];window.render=t=>{ctx.fillStyle=new Color(clamp(t,0,1),.2,.3).getStyle();ctx.fillRect(0,0,320,180)};window.render(0);window.READY=true;\n`);
 const result=success(copiedCli(['still','independent film','0.5','--out','copied review','--json']));assert.equal(result.root,root);assert.ok((await fs.stat(path.join(cwd,'copied review/t_0.5.jpg'))).size>0);
 assert.equal(await fs.realpath(path.join(root,'node_modules')),await fs.realpath(path.join(copied,'node_modules')));
});
