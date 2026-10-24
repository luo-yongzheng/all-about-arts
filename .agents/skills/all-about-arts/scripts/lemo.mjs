#!/usr/bin/env node
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {lemoMain} from '../lib/lemo.mjs';
export {lemoMain};

if(process.argv[1]&&await fs.realpath(process.argv[1]).catch(()=>null)===fileURLToPath(import.meta.url)){
 const abort=new AbortController();
 for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>{abort.abort();process.exitCode=s==='SIGINT'?130:143;});
 lemoMain(process.argv.slice(2),{signal:abort.signal}).catch(e=>{console.error(JSON.stringify({status:'failure',error:{message:e.message}}));if(!abort.signal.aborted)process.exitCode=1;});
}
