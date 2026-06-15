/* TERRA · buildings.js */
// ---- Gezeichnete Iso-Gebäude (Sonne oben-links) ----
function lerp(a,b,t){return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t};}
function isoCorners(gx,gy,baseLift,h){
  const bl=(baseLift||0)*cam.scale, hh=h*cam.scale;
  const N=project(gx,gy),E=project(gx+1,gy),S=project(gx+1,gy+1),W=project(gx,gy+1);
  [N,E,S,W].forEach(p=>p.y-=bl);
  const Nt={x:N.x,y:N.y-hh},Et={x:E.x,y:E.y-hh},St={x:S.x,y:S.y-hh},Wt={x:W.x,y:W.y-hh};
  return {N,E,S,W,Nt,Et,St,Wt,
    cx:(Nt.x+St.x)/2, cy:(Nt.y+St.y)/2,
    bx:(N.x+E.x+S.x+W.x)/4, by:(N.y+E.y+S.y+W.y)/4};
}
// Teilfläche auf einer Wand (Fenster/Tür/Säule), in u (entlang) / v (Höhe 0..1)
function wallPatch(Pb0,Pb1,Pt0,Pt1,u0,u1,v0,v1,col){
  const b0=lerp(Pb0,Pb1,u0),b1=lerp(Pb0,Pb1,u1),t0=lerp(Pt0,Pt1,u0),t1=lerp(Pt0,Pt1,u1);
  const A=lerp(b0,t0,v0),B=lerp(b1,t1,v0),C=lerp(b1,t1,v1),D=lerp(b0,t0,v1);
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.fill();
}
// gewellte Linie mit gleichmäßiger Wellenlänge (sanft, nicht zackig)
function wavyLine(a,b,amp,col){
  const len=Math.hypot(b.x-a.x,b.y-a.y); if(len<5)return;
  const cycles=Math.max(1,Math.round(len/(14*cam.scale)));
  const nx=-(b.y-a.y)/len, ny=(b.x-a.x)/len, seg=Math.max(10,cycles*6);
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(1,0.9*cam.scale);ctx.beginPath();
  for(let i=0;i<=seg;i++){const t=i/seg, w=Math.sin(t*Math.PI*2*cycles)*amp;
    const x=a.x+(b.x-a.x)*t+nx*w, y=a.y+(b.y-a.y)*t+ny*w;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.stroke();
}
// Dachziegel nur angedeutet: wenige sanfte Wellenlinien parallel zur Traufe
function tileFace(P0,P1,apex,color){
  const rows=5, col=shade(color,-0.16), amp=0.9*cam.scale;
  for(let i=1;i<rows;i++){const t=i/rows;
    wavyLine(lerp(P0,apex,t), lerp(P1,apex,t), amp, col);
  }
}
function hipRoof(c,color,roofH,tiled){
  const apex={x:(c.Nt.x+c.Et.x+c.St.x+c.Wt.x)/4, y:(c.Nt.y+c.Et.y+c.St.y+c.Wt.y)/4 - roofH*cam.scale};
  const cl=shade(color,0.10), cr=shade(color,-0.22), cb=shade(color,-0.36);
  ctx.fillStyle=cb; poly([c.Nt,c.Wt,apex]); poly([c.Nt,c.Et,apex]);   // hintere Flächen
  ctx.fillStyle=cl; poly([c.Wt,c.St,apex]);                           // SW (hell)
  ctx.fillStyle=cr; poly([c.St,c.Et,apex]);                           // SE (dunkel)
  if(tiled){ tileFace(c.Wt,c.St,apex,cl); tileFace(c.St,c.Et,apex,cr); }
  ctx.strokeStyle='rgba(30,20,12,.30)';ctx.lineWidth=Math.max(1,1.2*cam.scale); // First/Grat
  ctx.beginPath();ctx.moveTo(c.Wt.x,c.Wt.y);ctx.lineTo(apex.x,apex.y);ctx.lineTo(c.St.x,c.St.y);ctx.lineTo(c.Et.x,c.Et.y);ctx.stroke();
  return apex.y;
}
// Eine Tempelsäule (senkrechter Schaft mit Kapitell, Basis, Kanneluren)
function column(base,hpx){
  const s=cam.scale, w=4.6*s, ch=hpx*s, x=base.x, topY=base.y-ch;
  ctx.fillStyle='#efe7d2'; ctx.fillRect(x-w/2,topY,w,ch);                     // Schaft
  ctx.fillStyle='rgba(110,98,74,.40)'; ctx.fillRect(x+w/2-1.4*s,topY,1.4*s,ch); // Schattenkante
  ctx.strokeStyle='rgba(150,135,100,.45)';ctx.lineWidth=1;
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*1.4*s,topY+2*s);ctx.lineTo(x+i*1.4*s,base.y-2*s);ctx.stroke();}
  ctx.fillStyle='#f4eddb';
  ctx.fillRect(x-w/2-1.4*s,topY-2.6*s,w+2.8*s,2.6*s);                         // Kapitell
  ctx.fillRect(x-w/2-1.4*s,base.y-1.8*s,w+2.8*s,1.8*s);                       // Basis
}
function drawForum(gx,gy,baseLift){
  const s=cam.scale, stone='#e7ddc6', marble='#efe7d4';
  const hBase=6, colH=18, entH=4, roofH=12;
  const b0=isoCorners(gx,gy,baseLift,0), b1=isoCorners(gx,gy,baseLift,hBase);
  // Schatten
  ctx.save();ctx.translate(b0.bx+7*s,b0.by+3*s);ctx.scale(1,TH/TW);
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.arc(0,0,TW*0.44*s,0,7);ctx.fill();ctx.restore();
  // Stufenpodest
  ctx.fillStyle=shade(stone,-0.10); poly([b0.W,b0.S,b1.St,b1.Wt]);
  ctx.fillStyle=shade(stone,-0.26); poly([b0.S,b0.E,b1.Et,b1.St]);
  ctx.strokeStyle='rgba(60,46,26,.30)';ctx.lineWidth=1;                       // Stufenkante
  ctx.beginPath();ctx.moveTo(b0.W.x,(b0.W.y+b1.Wt.y)/2);ctx.lineTo(b0.S.x,(b0.S.y+b1.St.y)/2);ctx.lineTo(b0.E.x,(b0.E.y+b1.Et.y)/2);ctx.stroke();
  ctx.fillStyle=stone; poly([b1.Nt,b1.Et,b1.St,b1.Wt]);                       // Stylobat-Oberfläche
  // Säulen entlang der beiden vorderen Kanten (SW: Wt->St, SE: St->Et)
  const us=[0.16,0.5,0.84];
  for(const u of us) column(lerp(b1.Wt,b1.St,u),colH);                        // SW
  for(let i=us.length-1;i>=0;i--) column(lerp(b1.St,b1.Et,us[i]),colH);       // SE (hinten zuerst)
  column(b1.St,colH);                                                         // Ecksäule vorne
  // Gebälk auf den Säulen
  const e2=isoCorners(gx,gy,baseLift,hBase+colH), e3=isoCorners(gx,gy,baseLift,hBase+colH+entH);
  ctx.fillStyle=shade(stone,-0.04); poly([e2.Wt,e2.St,e3.St,e3.Wt]);
  ctx.fillStyle=shade(stone,-0.20); poly([e2.St,e2.Et,e3.Et,e3.St]);
  // Dach + Giebel (Tympanon)
  const apex={x:(e3.Nt.x+e3.Et.x+e3.St.x+e3.Wt.x)/4, y:(e3.Nt.y+e3.Et.y+e3.St.y+e3.Wt.y)/4 - roofH*s};
  ctx.fillStyle=shade(marble,-0.30); poly([e3.Nt,e3.Wt,apex]); poly([e3.Nt,e3.Et,apex]);
  ctx.fillStyle=shade(marble,0.06);  poly([e3.Wt,e3.St,apex]);                // SW Giebelfläche
  ctx.fillStyle=shade(marble,-0.10); poly([e3.St,e3.Et,apex]);               // SE Giebelfläche
  // Tympanon-Vertiefung vorne (SE) + Gesims
  const ctr={x:(e3.St.x+e3.Et.x+apex.x)/3,y:(e3.St.y+e3.Et.y+apex.y)/3};
  const I=p=>({x:ctr.x+(p.x-ctr.x)*0.62,y:ctr.y+(p.y-ctr.y)*0.62});
  ctx.fillStyle=shade(marble,-0.20); poly([I(e3.St),I(e3.Et),I(apex)]);
  ctx.strokeStyle='rgba(40,30,16,.35)';ctx.lineWidth=Math.max(1,1.2*s);
  ctx.beginPath();ctx.moveTo(e3.Wt.x,e3.Wt.y);ctx.lineTo(e3.St.x,e3.St.y);ctx.lineTo(e3.Et.x,e3.Et.y);ctx.stroke();
  return {cx:b0.cx, topY:apex.y};
}
function canopyRoof(c,color,roofH){            // flaches überstehendes Vordach (Markt)
  const k=roofH*cam.scale, f=1.28, cc={x:(c.Nt.x+c.Et.x+c.St.x+c.Wt.x)/4,y:(c.Nt.y+c.Et.y+c.St.y+c.Wt.y)/4};
  const R=p=>({x:cc.x+(p.x-cc.x)*f, y:cc.y+(p.y-cc.y)*f - k});
  const N=R(c.Nt),E=R(c.Et),S=R(c.St),W=R(c.Wt);
  ctx.strokeStyle='rgba(70,48,26,.85)';ctx.lineWidth=Math.max(1,1.6*cam.scale);
  for(const [a,b] of [[c.Wt,W],[c.St,S],[c.Et,E]]){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  ctx.fillStyle=color; poly([N,E,S,W]);
  ctx.strokeStyle='rgba(255,250,240,.45)';ctx.lineWidth=1;
  for(let t=0.25;t<1;t+=0.25){const a=lerp(W,N,t),b=lerp(S,E,t);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  return N.y;
}
function drawClaypit(gx,gy,baseLift){
  const s=cam.scale, rim='#9c7b4e';
  const g0=isoCorners(gx,gy,baseLift,0), gr=isoCorners(gx,gy,baseLift,3);
  ctx.fillStyle=shade(rim,-0.10); poly([g0.W,g0.S,gr.St,gr.Wt]);              // Randwall SW
  ctx.fillStyle=shade(rim,-0.26); poly([g0.S,g0.E,gr.Et,gr.St]);              // Randwall SE
  ctx.fillStyle=rim; poly([gr.Nt,gr.Et,gr.St,gr.Wt]);                          // Rand-Oberfläche
  const ctr={x:(gr.Nt.x+gr.St.x)/2, y:(gr.Nt.y+gr.St.y)/2+2*s};               // eingelassene Grube
  const I=p=>({x:ctr.x+(p.x-ctr.x)*0.62, y:ctr.y+(p.y-ctr.y)*0.62+2*s});
  ctx.fillStyle='#6f5433'; poly([I(gr.Nt),I(gr.Et),I(gr.St),I(gr.Wt)]);
  ctx.fillStyle='#a9713f';                                                     // Lehmhaufen
  for(const [dx,dy] of [[-4,1],[5,2],[1,-3]]){
    ctx.beginPath();ctx.ellipse(ctr.x+dx*s,ctr.y+dy*s,3.4*s,2*s,0,0,7);ctx.fill();}
  return {cx:gr.cx, topY:gr.Nt.y};
}
function drawPottery(gx,gy,baseLift){
  const s=cam.scale, wall='#caa46e', roof='#7a4a2c';
  const c=isoCorners(gx,gy,baseLift,13);
  ctx.save();ctx.translate(c.bx+7*s,c.by+3*s);ctx.scale(1,TH/TW);
  ctx.fillStyle='rgba(0,0,0,.16)';ctx.beginPath();ctx.arc(0,0,TW*0.4*s,0,7);ctx.fill();ctx.restore();
  ctx.fillStyle=shade(wall,-0.08); poly([c.W,c.S,c.St,c.Wt]);
  ctx.fillStyle=shade(wall,-0.28); poly([c.S,c.E,c.Et,c.St]);
  const kb=lerp(c.S,c.E,0.5), kt=lerp(c.St,c.Et,0.5);                          // Brennofen-Kuppel (SE)
  const kx=(kb.x+kt.x)/2, ky=(kb.y+kt.y)/2+1*s;
  ctx.fillStyle='#8a5230'; ctx.beginPath();ctx.arc(kx,ky,5.5*s,Math.PI,0);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e8923c'; ctx.beginPath();ctx.arc(kx,ky,2.3*s,Math.PI,0);ctx.closePath();ctx.fill();
  const topY=hipRoof(c,roof,10,false);
  ctx.fillStyle='rgba(205,205,205,.45)';                                       // Rauch
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(c.cx+(i-1)*2*s, topY-(5+i*5)*s, (2+i)*s,0,7);ctx.fill();}
  return {cx:c.cx, topY};
}
function drawBuilding(gx,gy,kind,lvl,baseLift){
  if(kind==='forum') return drawForum(gx,gy,baseLift);
  if(kind==='claypit') return drawClaypit(gx,gy,baseLift);
  if(kind==='pottery') return drawPottery(gx,gy,baseLift);
  let wall,roof,h,roofH,windows=false,door=false,awning=false,well=false;
  if(kind==='house'){
    if(lvl===0){wall='#b5915f';roof='#6f5535';h=10;roofH=7;}
    else if(lvl===1){wall='#d7c69b';roof='#b1542d';h=15;roofH=11;windows=true;door=true;}
    else{wall='#ece2cb';roof='#a8482a';h=22;roofH=15;windows=true;door=true;}
  } else if(kind==='well'){wall='#a7adae';roof='#5e6e76';h=8;roofH=5;well=true;}
  else{wall='#c9b48a';roof='#cf6a3c';h=9;roofH=7;awning=true;}             // market
  const c=isoCorners(gx,gy,baseLift,h);
  // weicher Schlagschatten (entgegen der Sonne, nach SO)
  ctx.save();ctx.translate(c.bx+7*cam.scale,c.by+3*cam.scale);ctx.scale(1,TH/TW);
  ctx.fillStyle='rgba(0,0,0,.16)';ctx.beginPath();ctx.arc(0,0,TW*0.4*cam.scale,0,7);ctx.fill();ctx.restore();
  // Wände: SW heller, SE dunkler
  ctx.fillStyle=shade(wall,-0.08); poly([c.W,c.S,c.St,c.Wt]);
  ctx.fillStyle=shade(wall,-0.28); poly([c.S,c.E,c.Et,c.St]);
  if(windows){wallPatch(c.W,c.S,c.Wt,c.St,0.22,0.4,0.42,0.74,'#46566b');
    wallPatch(c.S,c.E,c.St,c.Et,0.6,0.78,0.42,0.74,'#3a4757');
    if(lvl===2){wallPatch(c.W,c.S,c.Wt,c.St,0.55,0.73,0.42,0.74,'#46566b');}}
  if(door){wallPatch(c.S,c.E,c.St,c.Et,0.2,0.38,0.0,0.62,'#5a3d22');}
  // Dach
  let topY;
  if(awning){topY=canopyRoof(c,roof,roofH);}
  else if(well){ctx.fillStyle='#3f7d9c';poly([c.Nt,c.Et,c.St,c.Wt]);
    ctx.strokeStyle='rgba(230,240,245,.4)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(c.cx-6*cam.scale,c.cy);ctx.lineTo(c.cx+6*cam.scale,c.cy);ctx.stroke();
    ctx.strokeStyle='rgba(30,30,20,.35)';ctx.lineWidth=Math.max(1,1.4*cam.scale);
    ctx.beginPath();ctx.moveTo(c.Nt.x,c.Nt.y);ctx.lineTo(c.Et.x,c.Et.y);ctx.lineTo(c.St.x,c.St.y);ctx.lineTo(c.Wt.x,c.Wt.y);ctx.closePath();ctx.stroke();
    topY=c.cy;}
  else{topY=hipRoof(c,roof,roofH,kind==='house');}
  return {cx:c.cx, topY};
}

function onScreen(gx,gy){const p=project(gx,gy);const r=cv.parentElement.getBoundingClientRect();
  return p.x>-80&&p.x<r.width+80&&p.y>-120&&p.y<r.height+80;}
