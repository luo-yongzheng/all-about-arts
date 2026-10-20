// Descriptive performance run, deliberately separate from pass/fail tests.
import fs from 'node:fs/promises';import path from 'node:path';
import {initProject,defaultConfig} from '../../skills/all-about-arts/lib/project.mjs';
import {renderProject} from '../../skills/all-about-arts/lib/render.mjs';
import {writeJSON} from '../../skills/all-about-arts/lib/util.mjs';
const root=path.resolve('artifacts/all-about-arts/performance'),project=path.join(root,`fullhd-${Date.now()}`);await fs.mkdir(root,{recursive:true});
const c=defaultConfig({style:'dataviz',duration:15,title:'The cost of a clear frame'});const start=performance.now();await initProject(project,{config:c});const result=await renderProject(project,{workers:2});
await writeJSON(path.join(root,'results.json'),{status:'success',project,render:result,wallSeconds:(performance.now()-start)/1000,nodePeakRssKiB:process.resourceUsage().maxRSS,memoryScope:'Node coordinator only; browser/encoder memory is not included',conditions:'1080p / 30 fps / 15 seconds / 2 workers; elapsed time depends on machine load; no performance pass threshold',environment:{node:process.version,platform:process.platform,arch:process.arch}});
console.log(JSON.stringify({status:'success',path:result.path,seconds:result.elapsedSeconds}));
