import {E} from '../upstream/swiss-ease.mjs';
import {clamp} from '../common.mjs';

export function urban(f,x,y,w,h,color,ink) {
  const {g,index,local}=f,progress=E(clamp(local/1.8));
  const centers=[[.16,.18],[.82,.18],[.16,.82],[.82,.82]];
  g.fillStyle=color;
  // Opening: move built blocks outward to make an actual shared public space.
  const distance=index===0?.03+.1*progress:.13;
  for(const [cx,cy] of centers){const dx=cx<.5?-distance:distance,dy=cy<.5?-distance:distance;g.fillRect(x+(cx+dx)*w,y+(cy+dy)*h,w*.15,h*.14);}
  const plaza={x:x+w*(.36-.06*progress),y:y+h*.35,width:w*(.26+.12*progress),height:h*.31};
  if(index===0){g.lineWidth=3;g.strokeStyle=ink;g.strokeRect(plaza.x,plaza.y,plaza.width,plaza.height);f.region('urban-plaza',plaza.x,plaza.y,plaza.width,plaza.height);}
  else {
    g.lineWidth=w*.035;g.strokeStyle=ink;
    for(const [cx,cy] of centers){g.beginPath();g.moveTo(x+w*.5,y+h*.5);g.lineTo(x+w*(.5+(cx-.5)*progress),y+h*(.5+(cy-.5)*progress));g.stroke();}
    f.region('urban-connection',x+w*.16,y+h*.18,w*.66,h*.64,{progress});
    // Final scene: people arrive, keeping the connecting paths open.
    if(index>=2){for(let i=0;i<8;i++){const angle=i*Math.PI/4,arrival=E(clamp((local-i*.12)/1.7)),r=.36-.18*arrival;g.fillStyle=i%2?ink:color;g.beginPath();g.arc(x+w*(.5+Math.cos(angle)*r),y+h*(.5+Math.sin(angle)*r),w*.025,0,Math.PI*2);g.fill();}f.region('urban-gathering',x+w*.2,y+h*.2,w*.6,h*.6);}
  }
}

export function reading(f,x,y,w,h,color,ink) {
  const {g,index,local}=f,progress=E(clamp(local/2));g.strokeStyle=ink;g.fillStyle=color;g.lineWidth=5;
  if(index===1){
    // Seven days accumulate a reading habit. Empty days remain outlines.
    for(let i=0;i<7;i++){const xx=x+i*w/7,ww=w/7*.76,amount=clamp((local-i*.18)/1.2);g.strokeRect(xx,y+h*.1,ww,h*.76);g.fillRect(xx,y+h*(.86-.76*amount),ww,h*.76*amount);f.region(`reading-day-${i+1}`,xx,y+h*.1,ww,h*.76,{progress:amount});}
  } else {
    const xx=x+w*.04,yy=y+h*.12,bw=w*.92,bh=h*.72;g.strokeRect(xx,yy,bw,bh);g.beginPath();g.moveTo(xx+bw*.5,yy);g.lineTo(xx+bw*.5,yy+bh);g.stroke();
    if(index===0){g.globalAlpha=.9;g.fillRect(xx+bw*.5,yy,bw*.47*(1-progress),bh);g.globalAlpha=1;}
    for(let side=0;side<2;side++)for(let row=0;row<6;row++){const shown=clamp((local-row*.12-side*.3)/.7);g.fillRect(xx+bw*(.06+side*.5),yy+bh*(.15+row*.12),bw*.37*shown,bh*.025);}
    f.region('reading-book',xx,yy,bw,bh);
    if(index>=2){for(let i=0;i<3;i++){const u=E(clamp((local-i*.18)/1.4)),nx=x+w*(.16+i*.29),ny=y+h*(.93-.5*u);g.fillStyle=color;g.fillRect(nx,ny,w*.16,h*.09);}f.region('reading-collected-notes',x+w*.16,y+h*.43,w*.74,h*.5,{progress});}
  }
}
