import {Stroke,ribbon,INK} from '../upstream/marker.mjs';
import {clamp,itemsOf,copyPanel,TAU} from '../common.mjs';

const font='"Comic Sans MS", "Chalkboard SE", sans-serif';
const circle=(x,y,r)=>Array.from({length:41},(_,i)=>[x+Math.cos(i/40*TAU)*r,y+Math.sin(i/40*TAU)*r]);
const along=(points,p)=>{const lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));let distance=lengths.reduce((a,b)=>a+b,0)*clamp(p);for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const q=distance/lengths[i];return [points[i][0]+(points[i+1][0]-points[i][0])*q,points[i][1]+(points[i+1][1]-points[i][1])*q];}distance-=lengths[i];}return points[0];};

export function create(f,{image}={}){return {renderer:'canvas-marker-ribbon',draw(f){
 const {g,local}=f;f.clear('#f7f8f5');const r=copyPanel(f,{color:INK.black,font,kicker:'LET’S WORK IT OUT'}),items=itemsOf(f),act=Math.min(2,f.index),p=clamp(local/(f.scene.end-f.scene.start));let tip=null;
 const path=(id,points,progress=1,color=INK.blue,width=6)=>{const s=new Stroke(points.flat(),{seed:f.config.seed+id,w:width,jitter:1.1});g.save();g.fillStyle=color;g.beginPath();ribbon(g,s,s.len*clamp(progress),1);g.fill();g.restore();if(progress>0&&progress<1)tip=along(points,progress);};
 const text=(id,value,x,y,w,h,size=30,color=INK.black)=>f.text(id,value,x,y,w,h,{size,color,font,align:'center',centerY:true});
 const arrow=(id,a,b,progress=1,color=INK.blue)=>{path(id,[a,b],progress,color);if(progress>.95){const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);path(id+1,[[b[0]-22*Math.cos(angle-.5),b[1]-22*Math.sin(angle-.5)],b,[b[0]-22*Math.cos(angle+.5),b[1]-22*Math.sin(angle+.5)]],1,color);}};
 const subject=f.config.content.subject||f.config.content.motif;
 // Imported art belongs with the copy, leaving the diagram and its actions unobstructed.
 if(image)f.image(image,f.portrait?{x:80,y:715,width:920,height:62}:{x:110,y:890,width:640,height:110});
 if(subject==='travel'){
  const x=r.x+25,y=r.y+30,w=r.width-50,h=r.height*.56;
  // A street grid, river and three landmarks make this a route map, rather than a list.
  g.save();g.strokeStyle='#dce2dc';g.lineWidth=2;for(let i=1;i<5;i++){g.beginPath();g.moveTo(x+w*i/5,y);g.lineTo(x+w*i/5,y+h);g.stroke();}for(let i=1;i<4;i++){g.beginPath();g.moveTo(x,y+h*i/4);g.lineTo(x+w,y+h*i/4);g.stroke();}g.restore();
  const river=Array.from({length:25},(_,i)=>[x+w*i/24,y+h*(.46+Math.sin(i/24*5)*.14)]);path(2,river,1,'#c2dce5',20);
  const stations=[[x+w*.12,y+h*.73],[x+w*.5,y+h*.29],[x+w*.88,y+h*.58]],route=[stations[0],[x+w*.3,y+h*.73],[x+w*.3,y+h*.29],stations[1],[x+w*.72,y+h*.29],[x+w*.72,y+h*.58],stations[2]];
  path(10,route,act===0?clamp(p*1.4):1,INK.blue,9);f.region('travel-map',x,y,w,h,{critical:true});
  const labels=f.config.content.stations||['Home','Park','Library'];stations.forEach(([sx,sy],i)=>{g.fillStyle='#f7f8f5';g.beginPath();g.arc(sx,sy,16,0,TAU);g.fill();path(20+i,circle(sx,sy,16),1,INK.blue,5);const ly=sy-65;
   if(i===0){path(30,[[sx-23,ly+15],[sx-23,ly-15],[sx,ly-35],[sx+23,ly-15],[sx+23,ly+15],[sx-23,ly+15]],1,INK.black,4);path(31,[[sx-29,ly-12],[sx,ly-40],[sx+29,ly-12]],1,INK.black,4);}
   else if(i===1){path(32,[[sx,ly+18],[sx,ly-20]],1,INK.green,5);path(33,circle(sx,ly-26,25),1,INK.green,5);}
   else{path(34,[[sx-30,ly-20],[sx,ly-38],[sx+30,ly-20],[sx-30,ly-20],[sx-30,ly+18],[sx+30,ly+18],[sx+30,ly-20]],1,INK.black,4);for(let k=-1;k<=1;k++)path(35+k,[[sx+k*18,ly-13],[sx+k*18,ly+12]],1,INK.black,4);}
   text(`station-label-${i}`,labels[i]||`Stop ${i+1}`,sx-85,sy+25,170,45,27);f.region(`route-station-${i}`,sx-35,ly-40,70,sy-ly+58,{critical:true});
  });
  const journey=act===2?clamp(p*1.15):0,[bx,by]=along(route,journey);g.save();g.fillStyle='#f7f8f5';g.fillRect(bx-42,by-30,84,65);g.restore();path(50,circle(bx-26,by+13,17),1,INK.orange,5);path(51,circle(bx+26,by+13,17),1,INK.orange,5);path(52,[[bx-26,by+13],[bx-8,by-14],[bx+10,by+13],[bx-26,by+13],[bx+8,by-14],[bx+26,by+13],[bx+14,by-25],[bx+27,by-25]],1,INK.orange,5);path(53,[[bx-16,by-18],[bx-1,by-18]],1,INK.black,4);f.region('route-traveller',bx-46,by-32,92,68,{critical:true});
  const essentials=f.config.content.essentials||['Helmet','Lights','Water'];const listY=y+h+50;for(let i=0;i<3;i++){const ey=listY+i*69,checked=act===2?1:act===1?clamp((p-i*.22)*3):0;path(60+i,[[x+12,ey],[x+46,ey],[x+46,ey+34],[x+12,ey+34],[x+12,ey]],1,INK.black,4);if(checked>0){path(70+i,[[x+18,ey+17],[x+28,ey+27],[x+48,ey-2]],checked,INK.green,6);if(checked===1)f.region(`essential-checked-${i}`,x+12,ey-2,38,38,{critical:true});}f.text(`essential-${i}`,essentials[i],x+70,ey-6,w-80,50,{font,size:32,color:INK.black,centerY:true});}
  if(act===2)tip=[bx+45,by-20];
 }else if(subject==='learning'){
  const x=r.x+30,y=r.y+30,w=r.width-60,h=r.height-70;const qx=x+w*.22,qy=y+h*.18,ex=x+w*.72,ey=y+h*.46,cx=x+w*.28,cy=y+h*.75;
  path(100,[[qx-95,qy-58],[qx+95,qy-58],[qx+95,qy+44],[qx+20,qy+44],[qx-5,qy+72],[qx-5,qy+44],[qx-95,qy+44],[qx-95,qy-58]],act===0?clamp(p*2):1,INK.blue,6);text('question-mark','?',qx-45,qy-60,90,100,76,INK.blue);text('question-label',items[0]?.label||'Ask',qx-120,qy+78,240,48,30);f.region('learning-question',qx-100,qy-65,200,142,{critical:true});
  arrow(110,[qx+100,qy+10],[ex-55,ey-100],act===0?clamp((p-.55)*3):1,INK.orange);
  // Liquid levels and bubbles show an experiment being performed.
  const experiment=act===0?0:act===1?clamp(p*1.4):1;const beakerW=130,beakerH=160;
  if(act>0){g.save();g.fillStyle='rgba(42,92,179,.16)';g.fillRect(ex-beakerW/2+8,ey+beakerH/2-115*experiment,beakerW-16,115*experiment);g.restore();path(120,[[ex-75,ey-90],[ex-65,ey-90],[ex-65,ey+80],[ex+65,ey+80],[ex+65,ey-90],[ex+75,ey-90]],1,INK.blue,6);for(let i=0;i<3;i++){const yy=ey+45-((p*110+i*37)%110);path(125+i,circle(ex-30+i*29,yy,5+i*2),1,INK.blue,3);}for(let i=0;i<4;i++)path(130+i,[[ex+40,ey+45-i*30],[ex+61,ey+45-i*30]],1,INK.black,3);f.region('experiment-beaker',ex-78,ey-95,156,180,{critical:true});text('experiment-label',items[1]?.label||'Try',ex-130,ey+100,260,48,30);}
  else{path(138,[[ex-65,ey+80],[ex+65,ey+80],[ex+65,ey-90],[ex-65,ey-90],[ex-65,ey+80]],1,'#c9ceca',4);text('experiment-pending','Try',ex-65,ey-15,130,45,30,'#8a928b');}
  arrow(140,[ex-80,ey+80],[cx+105,cy-55],act>1?1:act===1?clamp((p-.55)*3):0,INK.orange);
  if(act===2){const growth=clamp(p*1.5),bars=[.38,.64,.9];path(150,[[cx-100,cy-100],[cx-100,cy+70],[cx+130,cy+70]],1,INK.black,5);bars.forEach((value,i)=>{const bx=cx-70+i*65,bh=145*value*growth;g.fillStyle=i===2?'#d6e6d7':'#d7e2ed';g.fillRect(bx,cy+68-bh,38,bh);path(151+i,[[bx,cy+68],[bx,cy+68-bh],[bx+38,cy+68-bh],[bx+38,cy+68]],1,i===2?INK.green:INK.blue,5);});text('evidence-label',items[2]?.label||'Learn',cx-120,cy+87,280,48,30);f.region('evidence-chart',cx-105,cy-105,245,180,{critical:true});const loop=[[cx-120,cy+10],[x+5,cy+10],[x+5,qy+10],[qx-110,qy+10]];const feedback=clamp((p-.3)*2);path(160,loop,feedback,INK.green,6);if(feedback>.95)arrow(162,loop[2],loop[3],1,INK.green);if(feedback>0)f.region('learning-return-arrow',x,qy,Math.max(30,cx-120-x),cy-qy+20,{critical:true});}
 }else{
  // Unspecified subjects retain the editable general-purpose diagram.
  const x=r.x+20,y=r.y+55,w=r.width-40,h=r.height-100;items.slice(0,4).forEach((it,i)=>{const ny=y+i*h/Math.min(4,items.length),nh=Math.min(110,h/Math.min(4,items.length)-25);path(i,[[x+18,ny],[x+w,ny+2],[x+w-2,ny+nh],[x,ny+nh-2],[x,ny],[x+18,ny]],clamp((local-i*.22)/.65),i%2?INK.orange:INK.blue);if(i>0)arrow(30+i,[x+w/2,ny-22],[x+w/2,ny-3]);text(`node-${i}`,it.label,x+25,ny+22,w-50,nh-28,f.portrait?40:34);f.region(`idea-${i}`,x,ny,w,nh,{critical:true});});
 }
 if(tip){const [mx,my]=tip;g.save();g.translate(mx,my);g.rotate(-.55);g.fillStyle='#d7dce0';g.fillRect(-12,-95,24,78);g.fillStyle=INK.blue;g.fillRect(-12,-38,24,21);g.fillStyle='#20252b';g.beginPath();g.moveTo(-8,-17);g.lineTo(8,-17);g.lineTo(0,2);g.fill();g.restore();}
 },dispose(){}};}
