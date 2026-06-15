/* TERRA · gfx.js */
// ---- Canvas & isometrische Kamera ----
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
let cam={x:0,y:0,scale:0.42};
let DPR=Math.min(window.devicePixelRatio||1,2);

function resize(){const r=cv.parentElement.getBoundingClientRect();
  cv.width=r.width*DPR;cv.height=r.height*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);}

function worldOf(gx,gy){return {wx:(gx-gy)*TW/2, wy:(gx+gy)*TH/2};}
function project(gx,gy){const w=worldOf(gx,gy);return {x:cam.x+w.wx*cam.scale, y:cam.y+w.wy*cam.scale};}
function screenToGrid(sx,sy){
  const wx=(sx-cam.x)/cam.scale, wy=(sy-cam.y)/cam.scale;
  const gx=(wx/(TW/2)+wy/(TH/2))/2, gy=(wy/(TH/2)-wx/(TW/2))/2;
  return {gx:Math.floor(gx), gy:Math.floor(gy)};
}
function inBounds(x,y){return x>=0&&y>=0&&x<GRID&&y<GRID;}
function centerCam(){const r=cv.parentElement.getBoundingClientRect();
  const w=worldOf(GRID/2,GRID/2);
  cam.x=r.width/2 - w.wx*cam.scale; cam.y=r.height*0.42 - w.wy*cam.scale;}

// ---- Zeichenhelfer ----
function poly(pts){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fill();}
function diamond(gx,gy,fill,stroke){
  const t=project(gx,gy),r=project(gx+1,gy),b=project(gx+1,gy+1),l=project(gx,gy+1);
  ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(r.x,r.y);ctx.lineTo(b.x,b.y);ctx.lineTo(l.x,l.y);ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function block(gx,gy,def,baseLift){
  const bl=(baseLift||0)*cam.scale;
  const t=project(gx,gy),r=project(gx+1,gy),b=project(gx+1,gy+1),l=project(gx,gy+1);
  t.y-=bl;r.y-=bl;b.y-=bl;l.y-=bl;
  const hh=def.h*cam.scale;
  const tt={x:t.x,y:t.y-hh},rt={x:r.x,y:r.y-hh},bt={x:b.x,y:b.y-hh},lt={x:l.x,y:l.y-hh};
  ctx.fillStyle=def.left;  poly([l,b,bt,lt]);
  ctx.fillStyle=def.right; poly([b,r,rt,bt]);
  ctx.fillStyle=def.top;   poly([tt,rt,bt,lt]);
  const cx=(tt.x+bt.x)/2, cy=(tt.y+bt.y)/2;
  ctx.font=(22*cam.scale)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(def.glyph,cx,cy);
  return {cx,topY:Math.min(tt.y,rt.y,lt.y)};
}
function shade(hex,f){const n=parseInt(hex.slice(1),16);
  let R=(n>>16)&255,G=(n>>8)&255,B=n&255;
  R=Math.max(0,Math.min(255,R+R*f))|0;G=Math.max(0,Math.min(255,G+G*f))|0;B=Math.max(0,Math.min(255,B+B*f))|0;
  return 'rgb('+R+','+G+','+B+')';}
// Geländeblock: flache Raute (elev 0) oder erhöhter Block mit Felskanten
function terrainBlock(gx,gy,elev,top,sideL,sideR,outline){
  const lift=elev*STEP*cam.scale;
  const t=project(gx,gy),r=project(gx+1,gy),b=project(gx+1,gy+1),l=project(gx,gy+1);
  const tt={x:t.x,y:t.y-lift},rt={x:r.x,y:r.y-lift},bt={x:b.x,y:b.y-lift},lt={x:l.x,y:l.y-lift};
  if(elev>0){ ctx.fillStyle=sideL; poly([l,b,bt,lt]); ctx.fillStyle=sideR; poly([b,r,rt,bt]); }
  ctx.fillStyle=top; poly([tt,rt,bt,lt]);
  if(outline){ctx.strokeStyle=outline;ctx.lineWidth=1;ctx.stroke();}
  return {tt,rt,bt,lt, cx:(tt.x+bt.x)/2, cy:(tt.y+bt.y)/2, topY:tt.y, lift};
}
function rng2(x,y){let h=(x*73856093 ^ y*19349663)>>>0; return ((h%1000)/1000);}
function treeDeco(gx,gy,g){
  const s=cam.scale, n=1+((gx*7+gy*3)%3);
  for(let i=0;i<n;i++){
    const ox=(rng2(gx*9+i,gy)-0.5)*TW*0.45*s;
    const oy=(rng2(gx,gy*9+i)-0.5)*TH*0.35*s;
    const x=g.cx+ox, y=g.cy+oy;
    const sway=Math.sin(animT*1.8 + (gx+gy)*0.6 + i*1.3)*2.6*s;   // Wind
    ctx.fillStyle='#5a3d22'; ctx.fillRect(x-1*s,y-2*s,2*s,6*s);          // Stamm
    ctx.fillStyle=i%2?'#39632c':'#447334';                               // Krone (Spitze schwingt)
    ctx.beginPath();ctx.moveTo(x+sway,y-13*s);ctx.lineTo(x-6*s,y-1*s);ctx.lineTo(x+6*s,y-1*s);ctx.closePath();ctx.fill();
  }
}
function peakDeco(g){const s=cam.scale;                                   // Schneegipfel
  ctx.fillStyle='#e9e6df';
  ctx.beginPath();ctx.moveTo(g.cx,g.cy-18*s);ctx.lineTo(g.cx-10*s,g.cy-2*s);ctx.lineTo(g.cx+10*s,g.cy-2*s);ctx.closePath();ctx.fill();
}
function waterDeco(g){const s=cam.scale;                                  // fließende Wellen
  const d=Math.sin(animT*1.3 + (g.cx+g.cy)*0.018)*3.2*s;
  ctx.strokeStyle='rgba(230,240,245,.30)';ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(g.cx-8*s+d,g.cy);ctx.lineTo(g.cx+8*s+d,g.cy);
  ctx.moveTo(g.cx-5*s-d,g.cy+5*s);ctx.lineTo(g.cx+7*s-d,g.cy+5*s);
  ctx.stroke();
}
function furrowDeco(g){const s=cam.scale;                                 // Ackerfurchen
  ctx.strokeStyle='rgba(120,95,40,.4)';ctx.lineWidth=1;
  for(let k=-1;k<=1;k++){ctx.beginPath();
    ctx.moveTo(g.cx+k*8*s,g.cy-k*4*s-6*s);ctx.lineTo(g.cx+k*8*s+12*s,g.cy-k*4*s);ctx.stroke();}
}
function dotAt(x,y,col){ctx.beginPath();ctx.arc(x,y,3*cam.scale+1,0,7);ctx.fillStyle=col;ctx.fill();}
