import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const base = new URL('../../.agents/skills/all-about-arts/', import.meta.url);
const fixture = {schemaVersion:1,title:'A field guide',style:'pixel-rpg',width:960,height:540,fps:30,duration:12,seed:42,content:{title:'A field guide',subtitle:'A practical story',items:[{label:'Observe',value:12},{label:'Compare',value:40},{label:'Learn',value:88}]},scenes:[{id:'a',start:0,end:4,title:'Observe closely',body:'Begin with what you can see.',kind:'establish'},{id:'b',start:4,end:8,title:'Compare the evidence',body:'Choose a useful next step.',kind:'develop'},{id:'c',start:8,end:12,title:'Share a new idea',body:'Make room for another view.',kind:'resolve'}]};
async function runtime() { assert.ok(existsSync(new URL('runtime/film.mjs',base)), 'portable film runtime must exist'); return import(new URL('runtime/film.mjs',base)); }
test('scene boundaries use the next scene and clamp reverse/outside seeks', async()=> { const {sceneAt,normalizeConfig}=await runtime(); const c=normalizeConfig(fixture); assert.equal(sceneAt(c,-5).scene.id,'a'); assert.equal(sceneAt(c,4).scene.id,'b'); assert.equal(sceneAt(c,12).scene.id,'c'); assert.equal(sceneAt(c,7).scene.id,'b'); assert.equal(sceneAt(c,0).scene.id,'a'); });
test('configuration rejects unsupported styles and impossible drawing dimensions',async()=> {const {normalizeConfig}=await runtime(); assert.throws(()=>normalizeConfig({...fixture,style:'missing'}),/style/i); assert.throws(()=>normalizeConfig({...fixture,width:0}),/width|dimension/i); assert.throws(()=>normalizeConfig({...fixture,scenes:[{id:'bad',start:7,end:3}]}),/scene/i); assert.equal(normalizeConfig({style:'ink-wash'}).content.title.length>0,true); });
test('reference catalog records 99 upstream styles without unearned certification',async()=> {assert.ok(existsSync(new URL('styles/catalog.json',base))); const cat=JSON.parse(readFileSync(new URL('styles/catalog.json',base))); assert.equal(cat.styles.length,99); assert.equal(cat.styles.filter(s=>s.status==='integrated').length,8); assert.equal(cat.styles.some(s=>s.status==='certified'),false); for(const s of cat.styles) assert.ok(existsSync(new URL(s.reference,base)),s.id);});
test('legacy adapters preserve absolute seeking and expose missing registration honestly',async()=> {assert.ok(existsSync(new URL('runtime/adapters/index.mjs',base))); const {adaptLemo,adaptMotion,adaptArt}=await import(new URL('runtime/adapters/index.mjs',base)); for(const [adapter,engine] of [[adaptLemo,{READY:Promise.resolve(),render(t){this.time=t;},DURATION:12}],[adaptMotion,{__omReady:true,__omEngine:{seek(t){this.time=t;},duration(){return 12;}}}],[adaptArt,{__ready:true,__total:12,renderFrame(t){this.time=t;}}]]) {const film=await adapter(engine,{width:960,height:540,fps:30});await film.ready;await film.render(9);await film.render(2);assert.equal(film.describe().duration,12);assert.deepEqual(film.texts(2),[]);assert.equal(film.describe().registration.texts,false);} });
export {fixture};
test('Lemo adapter reads the actual upstream DUR global',async()=>{const {adaptLemo}=await import(new URL('runtime/adapters/index.mjs',base));const host={DUR:7.5,READY:true,render(t){this.time=t;}};const f=adaptLemo(host,{});await f.render(4);assert.equal(host.time,4);assert.equal(f.describe().duration,7.5);});
test('numeric item strings are normalized before chart arithmetic',async()=>{const {normalizeConfig}=await runtime();const c=normalizeConfig({...fixture,content:{items:[{label:'Count',value:'12.5'}]}});assert.equal(c.content.items[0].value,12.5);});
test('declared text parameters address scene fields that change rendered titles',async()=>{const {parametersFor,normalizeConfig}=await runtime();assert.equal(typeof parametersFor,'function');const p=parametersFor(normalizeConfig(fixture));assert.ok(p.some(v=>v.key==='scenes.0.title'&&v.value==='Observe closely'));assert.ok(p.some(v=>v.key==='scenes.1.body'&&v.value==='Choose a useful next step.'));});
test('frameContext resets stroke state on clear and keeps CJK punctuation and numeric units intact when wrapping',async()=>{
  const {frameContext}=await import(new URL('runtime/common.mjs',base));
  const state={lineWidth:9,lineCap:'round',lineJoin:'round',miterLimit:3,dash:[4,2],font:''};
  const canvas={width:1080,height:1920,getContext(){return {
    set lineWidth(v){state.lineWidth=v;},get lineWidth(){return state.lineWidth;},
    set lineCap(v){state.lineCap=v;},get lineCap(){return state.lineCap;},
    set lineJoin(v){state.lineJoin=v;},get lineJoin(){return state.lineJoin;},
    set miterLimit(v){state.miterLimit=v;},get miterLimit(){return state.miterLimit;},
    set font(v){state.font=v;},get font(){return state.font;},
    setTransform(){},clearRect(){},fillRect(){},save(){},restore(){},fillText(){},
    setLineDash(d){state.dash=d;},
    measureText(s){const m=/(\d+)px/.exec(state.font);const px=m?+m[1]:24;return {width:[...s].reduce((w,ch)=>w+(ch.charCodeAt(0)>255?px:px*0.58),0)};}
  };}};
  const f=frameContext(canvas,{width:1080,height:1920,transparent:false});
  f.scene={id:'s1'};
  f.clear('#000');
  assert.equal(state.lineWidth,1);
  assert.equal(state.lineCap,'butt');
  assert.equal(state.lineJoin,'miter');
  assert.deepEqual(state.dash,[]);
  f.text('cjk','从1985年65平方公里到2018年331.22 km²，三十四道建筑年轮。',0,0,340,200,{size:28,min:18});
  for(const entry of f.textEntries){
    assert.equal(/^[，。、；：！？）》”】]/.test(entry.text),false,`orphaned leading punctuation in line: ${entry.text}`);
  }
  assert.ok(f.textEntries.some(e=>e.text.includes('331.22 km²')),'numeric value and unit should stay together');
});
