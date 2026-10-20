import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {browserExecutable} from '../../skills/all-about-arts/lib/browser.mjs';
import {chromium} from '../../skills/all-about-arts/node_modules/playwright-core/index.mjs';
const root=fileURLToPath(new URL('../../skills/all-about-arts/',import.meta.url));
const output=fileURLToPath(new URL('./artifacts/subject-actions/',import.meta.url));
const recipes=[['pixel-rpg','library','garden'],['ink-wash','mountains','river'],['paper-lantern','festival','home']];
test('explicit subjects change the drawing and perform their three story actions in both layouts',{timeout:120000},async()=>{
 const server=createServer((req,res)=>{const target=resolve(root,'.'+req.url.split('?')[0]);if(target===resolve(root)){res.end('<style>body{margin:0;background:#ddd}canvas{display:block}</style><main></main>');return;}try{res.setHeader('Content-Type',['.js','.mjs'].includes(extname(target))?'text/javascript':'application/json');res.end(readFileSync(target));}catch{res.statusCode=404;res.end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({executablePath:await browserExecutable(),headless:true});
 try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);await fs.mkdir(output,{recursive:true});
 for(const [style,...subjects]of recipes)for(const portrait of [false,true]){
  const result=await page.evaluate(async({style,subjects,portrait})=>{
   const {createFilm}=await import('/runtime/film.mjs');const result={};document.querySelector('main').innerHTML='';
   for(const subject of subjects){const row=document.createElement('div');row.style.display='flex';document.querySelector('main').append(row);const canvas=document.createElement('canvas');const cfg={style,width:portrait?360:640,height:portrait?640:360,duration:18,seed:42,content:{subject,title:'A shared story',subtitle:'The same words',items:[{label:'One',value:20},{label:'Two',value:60},{label:'Three',value:90}]},scenes:[0,1,2].map(i=>({id:`act-${i}`,start:i*6,end:(i+1)*6,title:'A shared story',body:'The same words'}))};const film=await createFilm(canvas,cfg);const frames=[];
    for(const time of [4.8,10.8,16.8]){await film.render(time);const still=document.createElement('canvas');still.width=canvas.width;still.height=canvas.height;still.getContext('2d').drawImage(canvas,0,0);row.append(still);frames.push({pixels:canvas.toDataURL(),regions:film.regions(time),texts:film.texts(time)});}
    await film.render(4.8);const reverse=canvas.toDataURL()===frames[0].pixels;await film.render(0);await film.render(2);await film.render(4.8);const sequential=canvas.toDataURL()===frames[0].pixels;film.dispose();const transparent=document.createElement('canvas'),alphaFilm=await createFilm(transparent,{...cfg,transparent:true});await alphaFilm.render(10.8);const alpha=transparent.getContext('2d').getImageData(0,0,1,1).data[3];alphaFilm.dispose();result[subject]={frames,reverse,sequential,alpha};
   }return result;
  },{style,subjects,portrait});
  await page.setViewportSize({width:portrait?1080:1920,height:portrait?1280:720});await page.locator('main').screenshot({path:resolve(output,`${style}-${portrait?'portrait':'landscape'}.png`)});
  assert.ok(result[subjects[0]].frames[0].pixels!==result[subjects[1]].frames[0].pixels,`${style}: subject must affect the drawing with identical copy`);
  for(const subject of subjects){const item=result[subject];assert.ok(item.reverse&&item.sequential,`${style}/${subject}: deterministic seek`);assert.equal(item.alpha,0,`${subject}: transparent background`);for(const frame of item.frames)for(const r of frame.regions)assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=(portrait?360:640)+.1&&r.y+r.height<=(portrait?640:360)+.1,`${subject} registered in-bounds: ${JSON.stringify(r)}`);}
  const region=(subject,act,id)=>result[subject].frames[act].regions.find(r=>r.id===id);
  if(style==='pixel-rpg'){
   assert.ok(region('library',0,'library-shelves'),'library has visible shelves');assert.ok(region('library',1,'reading-book'),'second act opens the selected book');assert.ok(region('library',2,'book-handoff'),'third act hands the book to another reader');
   assert.ok(region('garden',0,'planted-seeds'),'garden begins with seeds');assert.ok(region('garden',1,'watering-can'),'care visibly waters the bed');assert.ok(region('garden',2,'grown-sprouts'),'garden resolves in actual grown plants');
  }else if(style==='ink-wash'){
   assert.ok(region('river',0,'tributary-left'),'river begins with a tributary');assert.ok(region('river',1,'river-confluence'),'streams visibly meet');assert.ok(region('river',2,'downstream-current'),'water travels downstream');
   assert.ok(region('mountains',0,'breathing-mist'),'mountains have breath/mist');assert.ok(region('mountains',1,'mountain-brush-path'),'second act follows a brush path');assert.ok(region('mountains',2,'quiet-water'),'last act settles at quiet water');
  }else{
   const early=region('home',0,'paper-envelope'),middle=region('home',1,'paper-envelope'),late=region('home',2,'paper-envelope');assert.ok(early&&middle&&late,'home has a physical letter');assert.ok(late.x>middle.x&&middle.x>early.x,'envelope travels toward the home');assert.ok(region('home',2,'lit-home-window'),'delivery lights the window');
   const earlyLantern=region('festival',0,'festival-lantern-0'),lateLantern=region('festival',2,'festival-lantern-0');assert.ok(earlyLantern&&lateLantern&&lateLantern.y<earlyLantern.y,'lantern rises after release');assert.ok(result.festival.frames[2].regions.filter(r=>r.id.startsWith('festival-lantern-')).length>result.festival.frames[0].regions.filter(r=>r.id.startsWith('festival-lantern-')).length,'festival grows from first flame to shared sky');
  }
  const exampleBounds=await page.evaluate(async({style,subjects,portrait})=>{const {createFilm}=await import('/runtime/film.mjs');document.querySelector('main').innerHTML='';const boxes=[];for(const [i,subject]of subjects.entries()){const config=await (await fetch(`/styles/${style}/examples/${i+1}-${subject}.json`)).json();config.width=portrait?360:640;config.height=portrait?640:360;const canvas=document.createElement('canvas'),film=await createFilm(canvas,config),row=document.createElement('div');row.style.display='flex';document.querySelector('main').append(row);for(const t of [4.8,10.8,16.8]){await film.render(t);boxes.push(...film.texts(t));const still=document.createElement('canvas');still.width=canvas.width;still.height=canvas.height;still.getContext('2d').drawImage(canvas,0,0);row.append(still);}film.dispose();}return boxes;},{style,subjects,portrait});
  for(const box of exampleBounds)assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=(portrait?360:640)+.1&&box.y+box.height<=(portrait?640:360)+.1,`${style} example text fits`);
  await page.locator('main').screenshot({path:resolve(output,`${style}-examples-${portrait?'portrait':'landscape'}.png`)});
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
});
