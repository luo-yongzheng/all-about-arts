// Playwright + absolute-time capture pipeline adapted from Lemo's core/render.
// Unlike the upstream command scripts, this library throws and always closes owned resources.
import fs from 'node:fs/promises';import {chromium} from 'playwright-core';
import {exists} from './util.mjs';import {startServer} from './server.mjs';
export async function browserExecutable() {
  const requested=process.env.AAA_CHROME??process.env.PLAYWRIGHT_CHROME;
  if(requested){await fs.access(requested);return requested;}
  for(const f of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome',chromium.executablePath()])if(await exists(f))return f;
  throw Error('Chrome/Chromium not found. Set AAA_CHROME to an existing browser, or explicitly install the pinned Playwright browser.');
}
export async function openFilm(project,config,{timeout=30000,signal}={}) {
  if(signal?.aborted)throw Error('Render cancelled');
  const server=await startServer({project,configOverride:config});let browser;
  const onAbort=()=>browser?.close().catch(()=>{});signal?.addEventListener('abort',onAbort,{once:true});
  const close=async()=>{signal?.removeEventListener('abort',onAbort);try{await browser?.close();}finally{await server.close();}};
  try {
    browser=await chromium.launch({executablePath:await browserExecutable(),headless:true,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false,args:['--force-color-profile=srgb','--font-render-hinting=none',...(process.platform==='darwin'?['--use-angle=metal']:[])]});
    if(signal?.aborted)throw Error('Render cancelled');
    const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});page.setDefaultTimeout(timeout);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`HTTP ${r.status()} ${r.url()}`);});
    page.on('requestfailed',r=>{if(!r.url().includes('favicon'))errors.push(`${r.url()}: ${r.failure()?.errorText}`);});
    await page.route('**/*',route=>{const url=route.request().url();return url.startsWith(server.url+'/')||url.startsWith('data:')||url.startsWith('blob:')?route.continue():route.abort('blockedbyclient');});
    await page.addInitScript(c=>{window.__AAA_CONFIG=c;},config);
    await page.goto(server.url+'/film/',{waitUntil:'load'});await page.waitForFunction(()=>!!window.AAA,{timeout});
    await boundedEvaluate(page,async()=>{await window.AAA.ready;await document.fonts.ready;},undefined,timeout,'ready');
    const description=await boundedEvaluate(page,()=>window.AAA.describe(),undefined,timeout,'describe');
    for(const k of ['width','height','fps','duration'])if(description[k]!==config[k])throw Error(`Runtime ${k}=${description[k]} disagrees with config ${config[k]}`);
    const assertHealthy=()=>{if(errors.length)throw Error(`Film page failed: ${errors.join('; ')}`);if(signal?.aborted)throw Error('Render cancelled');};assertHealthy();
    const render=async t=>{assertHealthy();await boundedEvaluate(page,async time=>{await window.AAA.render(time);},t,timeout,'render');assertHealthy();};
    return {page,browser,description,errors,render,assertHealthy,close};
  }catch(e){await close();throw e;}
}
// evaluate() has no Playwright timeout. A broken custom engine must release the
// browser and let callers remove their render locks instead of waiting forever.
async function boundedEvaluate(page,fn,arg,timeout=30000,label='texts') {
  let timer;try{return await Promise.race([page.evaluate(fn,arg),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error(`Film ${label} timed out after ${timeout} ms`));page.context().browser()?.close().catch(()=>{});},timeout);})]);}finally{clearTimeout(timer);}
}
export async function visibleTexts(page,t) {
  return boundedEvaluate(page,async time=>{
    const description=await window.AAA.describe();
    const canRead=typeof window.AAA.texts==='function'&&description.registration?.texts!==false;
    const registered=canRead?await window.AAA.texts(time):null;
    if(canRead&&!Array.isArray(registered))throw Error('texts(t) must return an array');
    const texts=[...(registered??[])];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(let n=walker.nextNode();n;n=walker.nextNode()){const text=n.textContent.trim(),p=n.parentElement;if(!text||!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))continue;const style=getComputedStyle(p);if(style.display==='none'||style.visibility==='hidden'||+style.opacity===0)continue;const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();if(r.width&&r.height)texts.push({id:'dom',text,x:r.x,y:r.y,width:r.width,height:r.height,critical:true});}
    return {registered:registered!==null||!document.querySelector('canvas'),texts};
  },t);
}
