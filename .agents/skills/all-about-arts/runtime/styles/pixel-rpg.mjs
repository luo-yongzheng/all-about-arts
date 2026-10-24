import {FB,LUT,C,T,sprFromRows,hash} from '../upstream/pixel.mjs';
import {text,hasGlyph,glyphW} from '../upstream/pixel-font.mjs';
import {offscreen,clamp,itemsOf} from '../common.mjs';
const hero=sprFromRows(['....HHHH....','...HHHHHH...','...HSSSS....','...HSSIS....','....SSSS....','....RRR.....','...BBRBB....','...SBRBS....','....BBB.....','....B.B.....','....K.K.....'],{H:C.umber,S:C.skin,I:C.ink,R:C.scarf,B:C.blue,K:C.ink});
export function create(f){const w=f.portrait?180:320,h=f.portrait?320:180,fb=new FB(w,h),c=offscreen(w,h),g=c.getContext('2d'),im=g.createImageData(w,h),u32=new Uint32Array(im.data.buffer);const sx=f.config.width/w,sy=f.config.height/h;
 const glyphCache=new Map(),glyphCanvas=offscreen(20,18),gg=glyphCanvas.getContext('2d',{willReadFrequently:true});
 function glyph(ch){if(glyphCache.has(ch))return glyphCache.get(ch);gg.clearRect(0,0,20,18);gg.font='10px "PingFang SC", "Noto Sans CJK SC", sans-serif';gg.textBaseline='top';gg.fillStyle='#fff';const width=Math.max(3,Math.ceil(gg.measureText(ch).width));gg.fillText(ch,0,0);const data=gg.getImageData(0,0,20,18).data,points=[];for(let y=0;y<14;y++)for(let x=0;x<Math.min(20,width+1);x++)if(data[(y*20+x)*4+3]>96)points.push([x,y]);const v={width,points};glyphCache.set(ch,v);return v;}
 const charWidth=(ch,scale)=>hasGlyph(ch)?(glyphW(ch)+1)*scale:(glyph(ch).width+1)*scale;
 const measure=(text,scale)=>Math.max(0,[...text].reduce((v,ch)=>v+charWidth(ch,scale),0)-scale);
 function label(id,s,x,y,mw,mh,{scale=1,color=C.white}={}){s=String(s??'');const lineHeight=[...s].some(ch=>!hasGlyph(ch))?14:10;const lines=[];let line='';for(const ch of [...s]){if(ch==='\n'||measure(line+ch,scale)>mw){lines.push(line);line=ch==='\n'?'':ch;}else line+=ch;}if(line)lines.push(line);if(lines.length*lineHeight*scale>mh)throw Error(`Pixel text ${id} does not fit; shorten the text`);lines.forEach((l,i)=>{let cx=x;for(const ch of [...l]){if(hasGlyph(ch))text(fb,ch,cx,y+i*lineHeight*scale,color,C.ink,scale);else{const bitmap=glyph(ch);for(const [px,py] of bitmap.points)fb.rect(cx+px*scale+1,y+i*lineHeight*scale+py*scale+1,scale,scale,C.ink);for(const [px,py] of bitmap.points)fb.rect(cx+px*scale,y+i*lineHeight*scale+py*scale,scale,scale,color);}cx+=charWidth(ch,scale);}f.textEntries.push({id:`${id}-${i}`,scene:f.scene.id,text:l,x:x*sx,y:(y+i*lineHeight*scale)*sy,width:measure(l,scale)*sx,height:lineHeight*scale*sy,fontSize:(lineHeight===10?7:10)*scale*sy,critical:true});});}
 const box=(x,y,w,h)=>{fb.rect(x,y,w,h,C.ink);fb.rect(x+1,y+1,w-2,h-2,C.silver);fb.rect(x+2,y+2,w-4,h-4,C.dslate);fb.rect(x+3,y+3,w-6,h-6,C.night);};
 // Subject is explicit; scene.action can override the default three-act recipe.
 const subject=f.config.content.subject||f.config.content.motif||'library';
 const actions=subject==='garden'?['plant','water','grow']:['search','read','share'];
 const region=(f,id,x,y,width,height,extra={})=>f.region(id,x*f.W/w,y*f.H/h,width*f.W/w,height*f.H/h,extra);
 const book=(x,y,open=false)=>{fb.rect(x-1,y-1,open?19:10,12,C.umber);fb.rect(x,y,open?17:8,10,open?C.sand:C.red);if(open){fb.vline(x+8,y,y+9,C.brown);for(let k=0;k<3;k++){fb.hline(x+2,x+6,y+2+k*2,C.tan);fb.hline(x+10,x+14,y+2+k*2,C.tan);}}else{fb.rect(x+2,y+1,5,1,C.yellow);fb.vline(x+1,y,y+9,C.scarfD);}};
 function person(x,y,other=false){for(let yy=0;yy<hero.h;yy++)for(let xx=0;xx<hero.w;xx++){let color=hero.d[yy*hero.w+xx];if(color===T)continue;if(other){if(color===C.blue)color=C.rose;if(color===C.umber)color=C.slate;if(color===C.scarf)color=C.lime;}fb.rect(x+xx*2,y+yy*2,2,2,color);}}
 function library(f,r,act,p){const floor=r.y+r.h-5,shelfW=Math.floor((r.w-20)/3),shelfH=f.portrait?55:40;
  fb.rect(r.x,r.y,r.w,r.h,C.umber);fb.dither(r.x,r.y,r.w,r.h,()=>.18,C.umber,C.dbrown);fb.rect(r.x,floor-2,r.w,7,C.brown);for(let x=r.x;x<r.x+r.w;x+=15)fb.line(x,floor-1,x+8,floor+4,C.dbrown);
  for(let i=0;i<3;i++){const x=r.x+6+i*(shelfW+3),y=r.y+4;fb.rect(x,y,shelfW,shelfH,C.tan);fb.rect(x+2,y+2,shelfW-4,shelfH-4,C.ink);for(let row=0;row<2;row++){const yy=y+Math.floor(shelfH*(row+1)/2)-3;for(let j=0;j<Math.floor((shelfW-6)/5);j++){const hh=9+Math.floor(hash(j+row*29,i+f.config.seed)*5);const cc=[C.rust,C.teal,C.blue,C.plum,C.green][(j+row+i)%5];fb.rect(x+4+j*5,yy-hh,4,hh,cc);fb.px(x+5+j*5,yy-hh+2,C.sand);}fb.rect(x+1,yy,shelfW-2,2,C.tan);}}
  region(f,'library-shelves',r.x+6,r.y+4,r.w-12,shelfH,{critical:true});
  const hx=Math.round(r.x+r.w*(act===0?.12+.18*p:.24)),hy=floor-22;person(hx,hy);region(f,'library-reader',hx,hy,24,22);
  if(act===0){const bx=r.x+r.w*.5,by=r.y+11+p*8;fb.rect(bx-3,by-3,14,16,C.yellow);book(bx,by);region(f,'selected-book',bx-1,by-1,10,12,{critical:true});}
  if(act===1){const bx=hx+18,by=hy+10;fb.rect(hx+9,hy+20,41,3,C.tan);fb.rect(hx+13,hy+23,3,5,C.brown);fb.rect(hx+43,hy+23,3,5,C.brown);book(bx,by,true);fb.line(bx+8,by+1,bx+8+Math.round(Math.sin(p*Math.PI)*5),by-4,C.white);region(f,'reading-book',bx-1,by-4,20,16,{critical:true});}
  if(act===2){const rx=Math.round(r.x+r.w*.72);person(rx,hy,true);fb.rect(hx+20,hy+12,9,3,C.skin);fb.rect(rx-6,hy+12,9,3,C.skin);const bx=hx+24+(rx-hx-30)*p;book(bx,hy+8);region(f,'book-handoff',bx-1,hy+7,10,12,{critical:true});region(f,'second-reader',rx,hy,24,22);if(p>.7){fb.rect(rx+9,hy-7,3,3,C.red);fb.rect(rx+12,hy-7,3,3,C.red);fb.rect(rx+10,hy-4,4,2,C.red);}}
 }
 function garden(f,r,act,p,time){const floor=r.y+r.h-12,bedX=r.x+r.w*.27,bedW=r.w*.65;
  if(!f.config.transparent)fb.gradV(r.x,r.y,r.w,r.h,[C.dslate,C.navy,C.teal]);
  fb.disc(r.x+r.w*.82,r.y+13,7,C.yellow);for(let j=0;j<4;j++){const xx=r.x+7+j*(r.w-14)/3;fb.rect(xx,r.y+r.h*.47,3,r.h*.4,C.sand);}fb.rect(r.x+5,r.y+r.h*.58,r.w-10,3,C.tan);fb.rect(r.x+5,r.y+r.h*.72,r.w-10,3,C.tan);
  fb.rect(r.x,floor,r.w,12,C.green);fb.rect(bedX,floor-2,bedW,9,C.dbrown);fb.dither(bedX+2,floor,bedW-4,6,()=>.35,C.brown,C.umber);region(f,'garden-bed',bedX,floor-2,bedW,9);
  const hx=r.x+5,hy=floor-22;person(hx,hy);const count=4,spacing=(bedW-15)/(count-1);
  for(let i=0;i<count;i++){const x=bedX+7+i*spacing;const growth=act===2?clamp(p*1.4-i*.08):act===1?.08:0;const height=Math.floor((20+i%2*7)*growth);if(act===0){const fall=clamp(p*2-i*.22),yy=floor-16+fall*17;fb.disc(x,yy,1,C.amber);}else{fb.px(x,floor+1,C.amber);if(height){fb.rect(x,floor-height,2,height,C.lime);fb.line(x,floor-height*.55,x-5,floor-height*.75,C.green);fb.line(x+1,floor-height*.7,x+6,floor-height*.9,C.lime);if(growth>.75){fb.disc(x+1,floor-height,4,i%2?C.pink:C.yellow);fb.px(x+1,floor-height,C.amber);}}}}
  if(act===0){fb.rect(hx+19,hy+12,7,3,C.skin);fb.rect(hx+22,hy+8,7,8,C.sand);fb.px(hx+25,hy+11,C.brown);region(f,'planted-seeds',bedX+4,floor-17,bedW-6,20,{critical:true});}
  if(act===1){const x=bedX-15+p*bedW*.65,y=floor-28;fb.rect(x,y,12,10,C.blue);fb.rect(x+3,y-3,6,3,C.cyan);fb.line(x+12,y+3,x+20,y+1,C.cyan);fb.line(x-1,y+1,x-4,y+1,C.silver);fb.line(x-4,y+1,x-4,y+8,C.silver);fb.line(x-4,y+8,x-1,y+8,C.silver);for(let i=0;i<9;i++){const q=(time*.8+i/9)%1;fb.rect(x+20+q*9,y+3+q*24,1,2,C.cyan);}region(f,'watering-can',x-4,y-3,26,14,{critical:true});region(f,'water-drops',x+20,y+3,12,26);}
  if(act===2)region(f,'grown-sprouts',bedX+2,floor-32,bedW-3,34,{critical:true});
 }
 return {renderer:'indexed-framebuffer',draw(f,t){f.clear();fb.clear(f.config.transparent?T:C.night);const requested=actions.indexOf(f.scene.action),act=requested<0?Math.min(2,f.index):requested,p=clamp(f.local/Math.max(.1,f.scene.end-f.scene.start));const r=f.portrait?{x:12,y:77,w:156,h:108}:{x:12,y:51,w:188,h:73};
  if(subject==='garden')garden(f,r,act,p,t);else library(f,r,act,p);
  const items=itemsOf(f),menu=f.portrait?{x:12,y:195,w:w-24,h:63}:{x:210,y:55,w:98,h:69};box(menu.x,menu.y,menu.w,menu.h);items.slice(0,3).forEach((it,i)=>{label(`item-${i}`,`${it.label} ${it.value}`,menu.x+7,menu.y+8+i*18,menu.w-14,16,{color:i===act?C.yellow:C.white});const len=Math.min(menu.w-16,Math.abs(it.value)/Math.max(1,...items.map(j=>Math.abs(j.value)))*(menu.w-16));fb.rect(menu.x+7,menu.y+22+i*18,len,2,i===act?C.lime:C.cyan);});
  box(8,8,w-16,f.portrait?55:38);label('title',f.scene.title,15,15,w-30,f.portrait?45:30,{color:C.yellow});
  const dy=f.portrait?266:130;box(8,dy,w-16,h-dy-8);label('body',f.scene.body||f.config.content.subtitle,15,dy+8,w-30,h-dy-16);if(Math.floor(f.local*2)%2)fb.rect(w-19,h-17,3,2,C.white);
  for(let i=0;i<fb.d.length;i++)u32[i]=LUT.full[fb.d[i]];g.putImageData(im,0,0);f.g.save();f.g.setTransform(1,0,0,1,0,0);f.g.imageSmoothingEnabled=false;f.g.drawImage(c,0,0,f.canvas.width,f.canvas.height);f.g.restore();region(f,`pixel-${subject}`,r.x,r.y,r.w,r.h);},dispose(){}};
}
