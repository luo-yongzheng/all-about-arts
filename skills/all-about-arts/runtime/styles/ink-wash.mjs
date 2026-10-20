import {mk,draw} from '../upstream/ink.mjs';
import {fbm,leaf} from '../upstream/procedural.mjs';
import {grain} from '../upstream/paper.mjs';
import {copyPanel,offscreen,clamp,itemsOf,TAU} from '../common.mjs';

// Explicit recipes share wet ink, dry bristles and paper, not subject geometry.
export function create(f){
 const wet=offscreen(f.W,f.H),dry=offscreen(f.W,f.H),wg=wet.getContext('2d'),dg=dry.getContext('2d');
 const subject=f.config.content.subject||f.config.content.motif||'mountains';
 const actions=subject==='river'?['sources','converge','downstream']:['breathe','trace','rest'];
 function stroke(points,width,seed,progress=1,opacity=1,options={}){const mark=mk(points,{w:width,dry:.52,wet:.48,seed,prof:'brush',...options});draw({wet:wg,dry:dg},mark,progress,opacity);return mark;}
 function ink(g){g.save();g.globalCompositeOperation='multiply';g.globalAlpha=.35;g.filter='blur(5px)';g.drawImage(wet,0,0);g.globalAlpha=1;g.filter='blur(1.2px)';g.drawImage(wet,0,0);g.filter='none';g.drawImage(dry,0,0);g.restore();}
 function mountains(f,r,act,p){const {g}=f,seed=f.config.seed,horizon=r.y+r.height*.74;
  g.save();g.beginPath();g.rect(r.x,r.y,r.width,r.height);g.clip();
  for(let k=0;k<4;k++){
   const base=horizon-k*r.height*.09,points=[];
   for(let i=0;i<=90;i++){const u=i/90;points.push([r.x+u*r.width,base-r.height*(.18+.055*k)*(.65+fbm(u*3+seed,k+seed*.03,4))]);}
   const gradient=g.createLinearGradient(0,base-r.height*.3,0,base+80);gradient.addColorStop(0,`rgba(32,54,57,${.18+k*.09})`);gradient.addColorStop(1,'rgba(32,54,57,0)');
   g.fillStyle=gradient;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.lineTo(r.x+r.width,base+80);g.lineTo(r.x,base+80);g.closePath();g.fill();
  }
  g.fillStyle='rgba(173,75,56,.78)';g.beginPath();g.arc(r.x+r.width*.74,r.y+r.height*.19,36,0,TAU);g.fill();
  const breath=act===0?Math.sin(p*Math.PI):act===1?.65*(1-p):.15;
  const mistY=r.y+r.height*(.45+.09*breath),mistWidth=r.width*(.65+.25*breath);
  for(let i=0;i<3;i++){const xx=r.x+r.width*.5+Math.sin(p*2+i)*r.width*.06,yy=mistY+i*r.height*.085;g.save();g.translate(xx,yy);g.scale(mistWidth/2,r.height*.055);const mist=g.createRadialGradient(0,0,0,0,0,1);mist.addColorStop(0,`rgba(238,231,213,${act===2?.36:.65+.2*breath})`);mist.addColorStop(1,'rgba(238,231,213,0)');g.fillStyle=mist;g.beginPath();g.arc(0,0,1,0,TAU);g.fill();g.restore();}
  g.restore();f.region('breathing-mist',r.x+(r.width-mistWidth)/2,mistY-r.height*.055,mistWidth,r.height*.28,{critical:true});
  const climb=[[r.x+r.width*.64,horizon+50],[r.x+r.width*.46,horizon-30],[r.x+r.width*.6,horizon-r.height*.14],[r.x+r.width*.4,r.y+r.height*.36]];
  if(act>=1){stroke(climb,7,seed+211,act===1?clamp(p*1.3):1,.72,{dry:.72,wet:.2});f.region('mountain-brush-path',r.x+r.width*.38,r.y+r.height*.34,r.width*.29,r.height*.48,{critical:true});}
  const base=[r.x+r.width*.12,r.y+r.height*.88],tip=[r.x+r.width*.26,r.y+r.height*.42];
  stroke([base,[base[0]-18,r.y+r.height*.7],[tip[0]-16,tip[1]+90],tip],10,seed+77,act===0?.45+.55*clamp(p*1.3):1);
  for(let i=0;i<8;i++){const u=(i+1)/9,x=base[0]+(tip[0]-base[0])*u,y=base[1]+(tip[1]-base[1])*u;leaf(dg,x,y,i%2?-.6:-2.6,(42+i%3*14)*(act===0?clamp(p*1.6-i*.035):1),8+i%3*2,.7);}
  if(act===2){const yy=r.y+r.height*.86;for(let i=0;i<6;i++){const spread=(.13+i*.045)*r.width*(.8+p*.2);stroke([[r.x+r.width*.62-spread/2,yy+i*13],[r.x+r.width*.62,yy+i*13+3],[r.x+r.width*.62+spread/2,yy+i*13]],2,seed+300+i,1,.32*(1-i*.1),{dry:.65,wet:.3});}f.region('quiet-water',r.x+r.width*.39,yy-5,r.width*.46,85,{critical:true});}
  ink(g);
 }
 function river(f,r,act,p){const {g}=f,seed=f.config.seed;
  for(let side=0;side<2;side++){
   const x0=r.x+r.width*(side?.59:.03),width=r.width*.35,y0=r.y+r.height*.09;
   g.fillStyle='rgba(48,62,59,.16)';g.beginPath();g.moveTo(x0,y0+r.height*.27);
   for(let i=0;i<=30;i++){const u=i/30;g.lineTo(x0+u*width,y0+r.height*(.12-.12*Math.sin(u*Math.PI))+(fbm(u*4+seed,side,3)-.5)*55);}
   g.lineTo(x0+width,y0+r.height*.27);g.closePath();g.fill();
  }
  const meet=[r.x+r.width*.5,r.y+r.height*.56];
  const paths=[
   [[r.x+r.width*.12,r.y+r.height*.16],[r.x+r.width*.18,r.y+r.height*.3],[r.x+r.width*.34,r.y+r.height*.43],meet],
   [[r.x+r.width*.87,r.y+r.height*.13],[r.x+r.width*.8,r.y+r.height*.3],[r.x+r.width*.64,r.y+r.height*.42],meet],
   [[r.x+r.width*.5,r.y+r.height*.06],[r.x+r.width*.44,r.y+r.height*.22],[r.x+r.width*.56,r.y+r.height*.39],meet]
  ];
  const reveal=act===0?.12+.52*p:act===1?.64+.36*clamp(p*1.5):1;
  const marks=paths.map((points,i)=>stroke(points,16+i*3,seed+i*67,reveal,.72,{prof:'even',wet:.64,dry:.35}));
  f.region('tributary-left',r.x+r.width*.09,r.y+r.height*.13,r.width*.44,r.height*.46,{critical:true});
  f.region('tributary-right',r.x+r.width*.47,r.y+r.height*.1,r.width*.43,r.height*.49);
  const downstream=[meet,[r.x+r.width*.45,r.y+r.height*.67],[r.x+r.width*.61,r.y+r.height*.79],[r.x+r.width*.54,r.y+r.height*.95]];
  let trunk;
  if(act>=1){const amount=act===1?clamp((p-.35)*.45):.3+.7*p;trunk=stroke(downstream,37,seed+301,amount,.78,{prof:'na',wet:.7,dry:.3});if(p>.55||act===2)f.region('river-confluence',meet[0]-32,meet[1]-32,64,64,{critical:true});}
  ink(g);
  // White glints follow the actual resampled channels into the shared junction.
  g.save();g.fillStyle='#eee7d5';
  for(let i=0;i<marks.length;i++){const mark=marks[i],u=act===0?reveal*.75:act===1?Math.min(reveal,.45+p*.55):.85;const q=mark.P[Math.floor((mark.n-1)*u)];g.beginPath();g.ellipse(q[0],q[1],3,7,-.35+i*.35,0,TAU);g.fill();}
  if(act===2&&trunk){const u=.15+.8*p,q=trunk.P[Math.floor((trunk.n-1)*u)];g.beginPath();g.ellipse(q[0],q[1],5,12,.15,0,TAU);g.fill();f.region('downstream-current',q[0]-12,q[1]-18,24,36,{critical:true});}
  g.restore();
 }
 return {renderer:'canvas-wet-dry-ink',draw(f){
  const {g,W,H}=f;f.clear('#eee7d5');if(!f.config.transparent){g.globalAlpha=.27;g.fillStyle=g.createPattern(grain(),'repeat');g.fillRect(0,0,W,H);g.globalAlpha=1;}
  const r=copyPanel(f,{color:'#222b2a',font:'Georgia, "Noto Serif", serif',weight:400,kicker:subject==='river'?'WATERSHED / JOINING WATERS':'LANDSCAPE / A BREATH OF INK'});r.height-=f.portrait?80:35;
  wg.clearRect(0,0,W,H);dg.clearRect(0,0,W,H);const selected=actions.indexOf(f.scene.action),act=selected<0?Math.min(2,f.index):selected,p=clamp(f.local/(f.scene.end-f.scene.start));
  if(subject==='river')river(f,r,act,p);else mountains(f,r,act,p);
  const items=itemsOf(f);items.slice(0,3).forEach((it,i)=>f.text(`annotation-${i}`,it.label,r.x+i*r.width/3,r.y+r.height+25,r.width/3-10,65,{size:30,font:'Georgia, serif',color:i===act?'#984839':'#59615b',align:'center'}));
  f.region(`ink-${subject}`,r.x,r.y,r.width,r.height);g.strokeStyle='#ac4435';g.lineWidth=5;g.strokeRect(f.portrait?W-160:750,f.portrait?620:890,58,58);
 },dispose(){}};
}
