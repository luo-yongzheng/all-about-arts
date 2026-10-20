import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {browserExecutable} from '../../skills/all-about-arts/lib/browser.mjs';
import {chromium} from '../../skills/all-about-arts/node_modules/playwright-core/index.mjs';

const root=fileURLToPath(new URL('../../skills/all-about-arts/',import.meta.url));
const output=fileURLToPath(new URL('../../artifacts/all-about-arts/subject-transfer/whiteboard-glass/',import.meta.url));
const cases=[['whiteboard','1-learning','learning'],['whiteboard','2-travel','travel'],['glass-product','1-bottle','bottle'],['glass-product','2-orb','orb']];
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

test('whiteboard and glass starters show subject actions, safe imported art, and deterministic seeks',{timeout:180000},async()=>{
 const configs=await Promise.all(cases.map(async([style,name,subject])=>{const config=JSON.parse(await fs.readFile(resolve(root,`styles/${style}/examples/${name}.json`),'utf8'));assert.equal(config.content.subject,subject,'subject is explicit in the starter');assert.equal(typeof config.content.variation,'string');return config;}));
 const sources=cases.map(([style])=>resolve(root,`runtime/styles/${style}.mjs`));const before=sources.map(hash);
 const server=createServer((req,res)=>{const url=req.url.split('?')[0];if(url==='/'){res.end('<style>body{margin:0;background:#ddd}canvas{display:block}</style><main></main>');return;}if(url==='/emblem.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="20" fill="#213c34"/><path d="M40 120V40h30c60 0 60 80 0 80z" fill="#d9efad"/></svg>');return;}const file=resolve(root,'.'+url);if(!file.startsWith(root)){res.statusCode=403;res.end();return;}try{res.setHeader('Content-Type',['.js','.mjs'].includes(extname(file))?'text/javascript':'application/json');res.end(readFileSync(file));}catch{res.statusCode=404;res.end();}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({executablePath:await browserExecutable(),headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);await fs.mkdir(output,{recursive:true});const evidence=[],sameCopy=new Map();
  for(const portrait of [false,true])for(let ci=0;ci<cases.length;ci++){
   const [style,,subject]=cases[ci];const result=await page.evaluate(async({config,portrait})=>{
    const {createFilm}=await import('/runtime/film.mjs');document.querySelector('main').innerHTML='';const row=document.createElement('div');row.style.display='flex';document.querySelector('main').append(row);const canvas=document.createElement('canvas');config.width=portrait?360:640;config.height=portrait?640:360;config.content.image='/emblem.svg';const film=await createFilm(canvas,config),frames=[];
    for(const time of [4.8,10.8,16.8]){await film.render(time);const still=document.createElement('canvas');still.width=canvas.width;still.height=canvas.height;still.getContext('2d').drawImage(canvas,0,0);row.append(still);const pixels=still.getContext('2d').getImageData(0,0,still.width,still.height).data;let warm=0,cyan=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>70&&pixels[i]>pixels[i+1]*1.1&&pixels[i]>pixels[i+2]*1.35)warm++;if(pixels[i+1]>90&&pixels[i+1]>pixels[i]*1.05&&pixels[i+2]>pixels[i]*1.1)cyan++;}frames.push({pixels:canvas.toDataURL(),regions:film.regions(time),texts:film.texts(time),warm,cyan});}
    await film.render(4.8);const reverse=canvas.toDataURL()===frames[0].pixels;await film.render(0);await film.render(2);await film.render(4.8);const sequential=canvas.toDataURL()===frames[0].pixels;
    await film.render(6.6);const startAction={pixels:canvas.toDataURL(),regions:film.regions(6.6)};await film.render(10.8);const endAction={pixels:canvas.toDataURL(),regions:film.regions(10.8)};
    film.dispose();const identicalCopy=structuredClone(config);identicalCopy.content.title='The same story';identicalCopy.content.items=[{label:'One',value:20},{label:'Two',value:60},{label:'Three',value:90}];identicalCopy.scenes=identicalCopy.scenes.map(s=>({...s,title:'The same story',body:'The same words'}));const probe=await createFilm(canvas,identicalCopy);await probe.render(10.8);const sameCopyPixels=canvas.toDataURL();probe.dispose();return {frames,reverse,sequential,startAction,endAction,sameCopyPixels};
   },{config:configs[ci],portrait});
   await page.setViewportSize({width:portrait?1080:1920,height:portrait?640:360});await page.evaluate(()=>window.scrollTo(0,0));const screenshot=resolve(output,`${subject}-${portrait?'portrait':'landscape'}.png`);await page.locator('main').screenshot({path:screenshot});
   const copyKey=`${style}-${portrait}`;if(sameCopy.has(copyKey))assert.notEqual(result.sameCopyPixels,sameCopy.get(copyKey),'subject changes the drawing with identical titles, body and item labels');else sameCopy.set(copyKey,result.sameCopyPixels);
   assert.ok(result.reverse&&result.sequential,`${subject}: direct and sequential seek agree`);assert.notEqual(result.startAction.pixels,result.endAction.pixels,`${subject}: action changes visible pixels within the scene`);
   const region=(act,id)=>result.frames[act].regions.find(r=>r.id===id);const action=(which,id)=>result[which].regions.find(r=>r.id===id);
   for(const frame of result.frames)for(const box of [...frame.regions,...frame.texts])assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=(portrait?360:640)+.1&&box.y+box.height<=(portrait?640:360)+.1,`${subject}: in bounds ${JSON.stringify(box)}`);
   if(subject==='travel'){
    assert.ok(region(0,'travel-map')&&region(0,'route-station-2'),'route connects real map stations');assert.ok(region(1,'essential-checked-2'),'preparation completes the checklist');assert.ok(region(2,'route-traveller').x>region(0,'route-traveller').x,'bike moves along the route');
   }else if(subject==='learning'){
    assert.ok(region(0,'learning-question'),'question is drawn');assert.ok(region(1,'experiment-beaker'),'experiment changes the illustration');assert.ok(region(2,'evidence-chart')&&region(2,'learning-return-arrow'),'evidence feeds back into a new question');
   }else if(subject==='bottle'){
    assert.ok(region(1,'bottle-cap').y<region(0,'bottle-cap').y,'cap visibly opens for refill');assert.ok(region(2,'bottle-liquid').height>region(0,'bottle-liquid').height*1.5,'liquid visibly fills');assert.ok(action('endAction','bottle-liquid').height>action('startAction','bottle-liquid').height,'refill animates inside the second scene');assert.ok(result.frames[2].warm>result.frames[0].warm*1.5,'amber liquid occupies visibly more pixels after refill');
   }else{
    assert.ok(region(1,'sensor-pulse'),'sensor sends a visible pulse');assert.ok(region(2,'sensor-response'),'response is visible');assert.ok(action('endAction','sensor-pulse').width!==action('startAction','sensor-pulse').width,'pulse expands over time');assert.ok(result.frames[1].cyan>result.frames[0].cyan*1.15,`sensing draws additional visible cyan pulse pixels: ${result.frames.map(f=>f.cyan).join(', ')}`);
   }
   if(style==='glass-product')for(const frame of result.frames){const image=frame.regions.find(r=>r.id==='user-image'),object=frame.regions.find(r=>r.id==='glass-object');assert.ok(image&&object&&!overlaps(image,object),'imported emblem stays clear of the object');}
   evidence.push({style,subject,portrait,screenshot,timepoints:[4.8,10.8,16.8],regions:result.frames.map(f=>f.regions),pixelCounts:result.frames.map(({warm,cyan})=>({warm,cyan})),deterministic:result.reverse&&result.sequential});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(sources.map(hash),before,'preview never modifies renderer source');await fs.writeFile(resolve(output,'evidence.json'),JSON.stringify({createdAt:new Date().toISOString(),scope:'Four explicit starter subjects; action and layout verification, not certification.',sourceHashes:Object.fromEntries(sources.map((s,i)=>[s,before[i]])),evidence},null,2));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
});
