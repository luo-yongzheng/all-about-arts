// Maintainer visual inspection: renders the actual example configs, writes an ignored contact sheet.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../skills/all-about-arts/node_modules/playwright-core/index.mjs';
import {browserExecutable} from '../../skills/all-about-arts/lib/browser.mjs';
const root=resolve(fileURLToPath(new URL('../../skills/all-about-arts/',import.meta.url)));
const portrait=process.argv[2]==='portrait';
const out=resolve(fileURLToPath(new URL('./artifacts/styles/',import.meta.url)));mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const p=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+'/')){res.end('<style>body{margin:0;padding:20px;background:#222;color:#fff;font:18px Arial;display:grid;grid-template-columns:'+(portrait?'360px 360px 360px 360px':'640px 640px')+';gap:22px}canvas{display:block;width:'+(portrait?'360':'640')+'px;height:'+(portrait?'640':'360')+'px}h2{font-size:18px}</style>');return;}try{res.setHeader('Content-Type',/\.m?js$/.test(p)?'text/javascript':extname(p)==='.json'?'application/json':'text/html');res.end(readFileSync(p));}catch{res.statusCode=404;res.end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({executablePath:await browserExecutable(),headless:true,args:process.platform==='darwin'?['--use-angle=metal']:[]});
try{const page=await browser.newPage({viewport:{width:portrait?1528:1342,height:900},deviceScaleFactor:1});page.on('pageerror',e=>{throw e;});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(async(portrait)=>{const {createFilm}=await import('/runtime/film.mjs');const catalog=await(await fetch('/styles/catalog.json')).json();for(const s of catalog.styles.filter(s=>s.status==='integrated')){const config=await(await fetch('/'+s.examples[portrait?1:0])).json();config.width=portrait?360:640;config.height=portrait?640:360;const div=document.createElement('section');div.innerHTML=`<h2>${s.name}</h2>`;const c=document.createElement('canvas');div.append(c);document.body.append(div);const film=await createFilm(c,config);await film.render(3);film.dispose?.();}},portrait);await page.screenshot({path:resolve(out,portrait?'portrait.png':'landscape.png'),fullPage:true});console.log(resolve(out,portrait?'portrait.png':'landscape.png'));}finally{await browser.close();await new Promise(ok=>server.close(ok));}
