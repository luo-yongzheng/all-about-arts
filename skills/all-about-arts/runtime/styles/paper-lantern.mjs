import {finish} from '../upstream/paper.mjs';
import {fbm} from '../upstream/procedural.mjs';
import {offscreen,copyPanel,itemsOf,mulberry,clamp,TAU} from '../common.mjs';

export function create(f){
 const layers=new Map(),pieces=new Map(),subject=f.config.content.subject||f.config.content.motif||'festival';
 const actions=subject==='home'?['write','send','welcome']:['light','gather','release'];
 function paper(key,w,h,draw){if(pieces.has(key))return pieces.get(key);const c=offscreen(w,h);draw(c.getContext('2d'));finish(c,{grainA:.85,rim:.55,under:.45,rimPx:3,underPx:4});pieces.set(key,c);return c;}
 function layersFor(f,r){const key=`${r.width}:${r.height}`;if(layers.has(key))return layers.get(key);const colors=['#dab78b','#ca9270','#a86154','#713e43','#3d303f'],result=[];for(let k=0;k<5;k++){const c=offscreen(r.width+100,r.height+100),g=c.getContext('2d');g.fillStyle=colors[k];g.beginPath();g.moveTo(0,c.height);for(let x=0;x<=c.width;x+=8){const u=x/c.width,yy=c.height*(.31+k*.11)+fbm(u*3+f.config.seed*.1,k,3)*c.height*.13;g.lineTo(x,yy);}g.lineTo(c.width,c.height);g.closePath();g.fill();finish(c,{grainA:.85,rim:.5,under:.45,rimPx:3,underPx:4});result.push(c);}layers.set(key,result);return result;}
 function glow(g,x,y,r,strength){const light=g.createRadialGradient(x,y,1,x,y,r);light.addColorStop(0,`rgba(255,226,162,${strength})`);light.addColorStop(1,'rgba(255,210,130,0)');g.fillStyle=light;g.fillRect(x-r,y-r,r*2,r*2);}
 function house(f,r,light){const {g}=f,w=r.width*.25,h=r.height*.28,x=r.x+r.width*.68,y=r.y+r.height*.57;
  const c=paper('house',260,280,g=>{g.fillStyle='#ead2a6';g.fillRect(35,90,190,184);g.fillStyle='#693d45';g.beginPath();g.moveTo(8,102);g.lineTo(130,10);g.lineTo(252,102);g.closePath();g.fill();g.fillStyle='#b57a66';g.fillRect(185,19,25,59);g.fillStyle='#784b4d';g.fillRect(110,181,45,93);g.fillStyle='#3c3545';g.fillRect(60,132,50,53);g.fillRect(157,132,42,53);});
  g.save();g.shadowColor='#241d2a';g.shadowBlur=12;g.shadowOffsetY=12;g.drawImage(c,x,y,w,h);g.restore();
  const wx=x+w*60/260,wy=y+h*132/280,ww=w*50/260,wh=h*53/280;
  if(light>0){glow(g,wx+ww/2,wy+wh/2,w*.65,.7*light);g.fillStyle=`rgba(255,226,152,${light})`;g.fillRect(wx,wy,ww,wh);g.fillRect(x+w*157/260,wy,w*42/260,wh);g.strokeStyle='#986248';g.lineWidth=3;g.beginPath();g.moveTo(wx+ww/2,wy);g.lineTo(wx+ww/2,wy+wh);g.moveTo(wx,wy+wh/2);g.lineTo(wx+ww,wy+wh/2);g.stroke();f.region('lit-home-window',wx,wy,ww,wh,{critical:true});}
  f.region('paper-home',x,y,w,h,{critical:true});return {x,y,width:w,height:h};
 }
 function home(f,r,act,p){const {g}=f,light=act===2?clamp(p*1.6):0;const home=house(f,r,light);
  const travel=act===0?.08*p:act===1?.08+.65*p:.73+.27*p,x=r.x+r.width*(.15+.6*travel),y=r.y+r.height*(.67-.26*Math.sin(travel*Math.PI));
  // A physical folded letter follows the route; its final position meets the door.
  g.save();g.strokeStyle='rgba(250,218,169,.56)';g.lineWidth=3;g.setLineDash([6,10]);g.beginPath();g.moveTo(r.x+r.width*.15,r.y+r.height*.67);g.bezierCurveTo(r.x+r.width*.35,r.y+r.height*.22,r.x+r.width*.64,r.y+r.height*.36,home.x+home.width*.45,home.y+home.height*.75);g.stroke();g.restore();
  if(act===0){const letter=paper('letter',130,160,g=>{g.fillStyle='#f8eacb';g.fillRect(7,6,116,148);g.strokeStyle='#9d7771';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(24,35+i*16);g.lineTo(i===4?71:106,35+i*16);g.stroke();}});g.save();g.translate(r.x+r.width*.12,r.y+r.height*.34);g.rotate(-.12);g.drawImage(letter,0,0,100,122);g.restore();f.region('written-letter',r.x+r.width*.09,r.y+r.height*.32,125,145);}
  const envelope=paper('envelope',142,100,g=>{g.fillStyle='#f6dfb8';g.fillRect(7,9,128,81);g.strokeStyle='#bd8b74';g.lineWidth=3;g.beginPath();g.moveTo(8,10);g.lineTo(71,57);g.lineTo(135,10);g.moveTo(8,89);g.lineTo(54,49);g.moveTo(135,89);g.lineTo(88,49);g.stroke();g.fillStyle='#9e4d4a';g.beginPath();g.arc(71,58,10,0,TAU);g.fill();});
  const ew=r.width*.15,eh=ew*100/142;g.save();g.shadowColor='rgba(38,22,31,.45)';g.shadowBlur=14;g.shadowOffsetY=9;g.drawImage(envelope,x-ew/2,y-eh/2,ew,eh);g.restore();f.region('paper-envelope',x-ew/2,y-eh/2,ew,eh,{critical:true});
 }
 function lantern(f,x,y,r,lit,id){const {g}=f;if(lit)glow(g,x,y,r*2.3,.5*lit);
  const c=paper(lit>.1?'lantern-lit':'lantern-unlit',110,150,g=>{g.fillStyle=lit>.1?'#f5d69c':'#b78574';g.beginPath();g.ellipse(55,68,42,55,0,0,TAU);g.fill();g.strokeStyle='#aa674f';g.lineWidth=2;for(const ww of [12,29]){g.beginPath();g.ellipse(55,68,ww,55,0,0,TAU);g.stroke();}g.fillStyle='#75454d';g.fillRect(20,9,70,8);g.fillRect(20,119,70,8);g.fillStyle='#e8b578';g.fillRect(52,127,6,17);});
  g.save();g.shadowColor='rgba(34,18,27,.3)';g.shadowBlur=12;g.shadowOffsetY=7;g.drawImage(c,x-r*1.3,y-r*1.6,r*2.6,r*3.55);g.restore();if(lit){g.fillStyle=`rgba(255,241,188,${lit})`;g.beginPath();g.ellipse(x,y+r*.65,r*.15,r*.28,0,0,TAU);g.fill();}f.region(id,x-r*1.3,y-r*1.6,r*2.6,r*3.55,{critical:true});
 }
 function festival(f,r,act,p){const {g}=f,count=act===0?1:act===1?3:7,base=r.y+r.height*.72;const rng=mulberry(f.config.seed);
  // The first flame is held low. Gathering lights remains tethered; release sends them aloft.
  for(let i=0;i<count;i++){const spread=i===0?0:(i%2?1:-1)*(Math.floor((i+1)/2))*.105;const release=act===2?clamp(p*1.2-i*.06):0;const rr=(i<3?36:25)*(f.portrait?1.08:1),x=r.x+r.width*(.5+spread)+Math.sin(p*2+i)*release*12,y=base-r.height*(.53*release)+Math.abs(spread)*r.height*.35;const lit=act===0?clamp(p*2):act===1?clamp(p*2-i*.2):1;
   const jitter=rng();
    if(act<2){g.strokeStyle='rgba(242,209,160,.72)';g.lineWidth=2;g.beginPath();g.moveTo(x,y+rr*1.7);g.lineTo(x+12,base+r.height*.2);g.stroke();}else if(release<.4){g.strokeStyle='#e6b880';g.lineWidth=2;g.beginPath();g.moveTo(x,y+rr*1.7);g.lineTo(x+Math.sin(p*5+jitter)*10,y+rr*2.3);g.stroke();}
    lantern(f,x,y,rr,lit,`festival-lantern-${i}`);
  }
  // Cut-paper people make the shared release a visible human action.
  const people=act===0?1:act===1?3:5;g.fillStyle='#262536';for(let i=0;i<people;i++){const x=r.x+r.width*(.5+(i-(people-1)/2)*.105),y=r.y+r.height*.91;g.beginPath();g.arc(x,y-29,11,0,TAU);g.fill();g.beginPath();g.moveTo(x-15,y+16);g.lineTo(x-10,y-17);g.lineTo(x+10,y-17);g.lineTo(x+15,y+16);g.fill();g.strokeStyle='#262536';g.lineWidth=7;g.beginPath();g.moveTo(x-7,y-10);g.lineTo(x-27,y-(act===2?44:23));g.moveTo(x+7,y-10);g.lineTo(x+27,y-(act===2?44:23));g.stroke();}
 }
 return {renderer:'canvas-layered-paper-lightbox',draw(f){const {g}=f;f.clear('#222638');const r=copyPanel(f,{color:'#f6e2be',font:'Georgia, serif',weight:400,kicker:subject==='home'?'PAPER POST / A LIGHT AT HOME':'PAPER FESTIVAL / A SHARED SKY'});if(f.portrait)r.height-=110;
  const selected=actions.indexOf(f.scene.action),act=selected<0?Math.min(2,f.index):selected,p=clamp(f.local/(f.scene.end-f.scene.start));const sky=g.createRadialGradient(r.x+r.width*.55,r.y+r.height*.35,10,r.x+r.width*.5,r.y+r.height*.4,r.height*.8);sky.addColorStop(0,subject==='home'?'#caa188':'#efc486');sky.addColorStop(.48,'#b58676');sky.addColorStop(1,'#4e4459');g.fillStyle=sky;g.beginPath();g.roundRect(r.x,r.y,r.width,r.height,40);g.fill();g.save();g.beginPath();g.roundRect(r.x,r.y,r.width,r.height,40);g.clip();
  const random=mulberry(f.config.seed);g.fillStyle='#ffefc5';for(let i=0;i<40;i++){const x=r.x+random()*r.width,y=r.y+random()*r.height*.55;g.globalAlpha=.3+random()*.6;g.beginPath();g.arc(x,y,1+random()*2,0,TAU);g.fill();}g.globalAlpha=1;
  layersFor(f,r).forEach((c,i)=>{g.save();g.shadowColor='rgba(34,18,27,.42)';g.shadowBlur=18;g.shadowOffsetY=-12;g.drawImage(c,r.x-50+Math.sin(f.time*.15)*(i+1)*3,r.y-40);g.restore();});
  if(subject==='home')home(f,r,act,p);else festival(f,r,act,p);g.restore();
  itemsOf(f).slice(0,3).forEach((it,i)=>f.text(`paper-label-${i}`,it.label,r.x+20,r.y+r.height+22+i*42,r.width-40,40,{size:29,color:i===act?'#fff4c8':'#cfb39e',font:'Georgia, serif',align:'center'}));f.region('paper-stage',r.x,r.y,r.width,r.height);
 },dispose(){layers.clear();pieces.clear();}};
}
