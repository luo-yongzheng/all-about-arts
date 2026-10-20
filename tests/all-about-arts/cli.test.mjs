import test from 'node:test';import assert from 'node:assert/strict';
import {parseArgs} from '../../skills/all-about-arts/scripts/aaa.mjs';
test('explicit false never enables online generation or other boolean options',()=>{
 const {flags}=parseArgs(['voice','film','generate','--allow-online=false','--force=false','--json=true']);assert.equal(flags['allow-online'],false);assert.equal(flags.force,false);assert.equal(flags.json,true);assert.throws(()=>parseArgs(['--allow-online=maybe']),/boolean/i);
});
