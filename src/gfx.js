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
  const s=cam.scale, type=(grid[gy][gx]&&grid[gy][gx].forest)||'fir';
  const n=1+((gx*7+gy*3)%2);                                   // 1-2 Bäume pro Feld
  for(let i=0;i<n;i++){
    const x=g.cx+(rng2(gx*9+i,gy)-0.5)*TW*0.42*s;
    const y=g.cy+(rng2(gx,gy*9+i)-0.5)*TH*0.42*s;
    const sc=(0.85+rng2(gx+i,gy+i)*0.4)*s;                      // Größenvariation
    drawTree(type,x,y,sc,gx+gy+i*2);
  }
}
function drawTree(type,x,y,s,seed){
  ctx.fillStyle='rgba(28,38,18,.20)';                          // Bodenschatten
  ctx.beginPath();ctx.ellipse(x+3*s,y+1*s,7*s,3*s,0,0,7);ctx.fill();
  const sway=Math.sin(animT*1.6+seed*0.7)*2.2*s;
  if(type==='leaf'){                                           // Laubbaum: runde Krone
    ctx.fillStyle='#6e4a2a';ctx.fillRect(x-1.7*s,y-12*s,3.4*s,13*s);
    const cy=y-18*s; ctx.fillStyle='#3f7a30';
    for(const [dx,dy,r] of [[-5,2,7],[5,2,6.5],[0,-3,8],[-3,-6,5.5],[4,-5,5.5]])
      ctx.beginPath(),ctx.arc(x+dx*s+sway*0.3,cy+dy*s,r*s,0,7),ctx.fill();
    ctx.fillStyle='#4f9639';
    for(const [dx,dy,r] of [[-2,-6,4.5],[3,-7,4]]) ctx.beginPath(),ctx.arc(x+dx*s+sway*0.3,cy+dy*s,r*s,0,7),ctx.fill();
  } else if(type==='pine'){                                    // Pinie: hoher Stamm + breite Schirmkrone
    ctx.strokeStyle='#8a5a32';ctx.lineWidth=Math.max(2,2.6*s);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+sway*0.4,y-14*s,x+sway,y-22*s);ctx.stroke();ctx.lineCap='butt';
    const cx=x+sway, cy=y-24*s;
    ctx.fillStyle='#43743a';ctx.beginPath();ctx.ellipse(cx,cy,12*s,5.2*s,0,0,7);ctx.fill();
    ctx.fillStyle='#54914a';ctx.beginPath();ctx.ellipse(cx,cy-2.2*s,8.5*s,3.4*s,0,0,7);ctx.fill();
  } else {                                                     // Tanne: hohe, geschichtete Spitzkrone
    ctx.fillStyle='#5a3d22';ctx.fillRect(x-1.5*s,y-5*s,3*s,6*s);
    ctx.fillStyle='#2f5a28';
    const layers=[[y-3*s,9*s,y-16*s],[y-10*s,7*s,y-22*s],[y-16*s,5*s,y-28*s]];  // [baseY,half,apexY]
    for(let k=0;k<layers.length;k++){const [by,half,ay]=layers[k], ax=x+sway*(k+1)/3;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(x-half,by);ctx.lineTo(x+half,by);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#3a6e31';                                   // Lichtkante
    const ax=x+sway;ctx.beginPath();ctx.moveTo(ax,y-28*s);ctx.lineTo(x-2.5*s,y-19*s);ctx.lineTo(x+1*s,y-19*s);ctx.closePath();ctx.fill();
  }
}
function drawShrub(x,y,s,seed){                                        // niedriger Bergstrauch
  ctx.fillStyle='rgba(28,38,18,.18)'; ctx.beginPath();ctx.ellipse(x+1.4*s,y+0.8*s,3.4*s,1.5*s,0,0,7);ctx.fill();
  const sway=Math.sin(animT*1.7+seed)*0.8*s;
  ctx.fillStyle='#4a6b32';
  for(const [dx,dy,r] of [[-1.6,0,2.4],[1.6,0,2.1],[0,-1.2,2.6]]){ctx.beginPath();ctx.arc(x+dx*s+sway*0.3,y+dy*s,r*s,0,7);ctx.fill();}
  ctx.fillStyle='#5d8240'; ctx.beginPath();ctx.arc(x-0.4*s+sway*0.3,y-1.7*s,1.5*s,0,7);ctx.fill();
}
function peakDeco(g){const s=cam.scale;                                   // Schneegipfel
  ctx.fillStyle='#e9e6df';
  ctx.beginPath();ctx.moveTo(g.cx,g.cy-18*s);ctx.lineTo(g.cx-10*s,g.cy-2*s);ctx.lineTo(g.cx+10*s,g.cy-2*s);ctx.closePath();ctx.fill();
}
// Höhe an einem Gitter-Eckpunkt = Mittel der angrenzenden Bergkacheln (sonst 0).
// Geteilte Ecken -> benachbarte Bergkacheln sind an der Kante koplanar (nahtlos, keine Pyramiden);
// am Massiv-Rand laufen die Ecken gegen 0 -> die Flanken gleiten sanft ins Flachland.
function cornerH(vx,vy){
  let s=0,c=0;
  for(const [dx,dy] of [[-1,-1],[0,-1],[-1,0],[0,0]]){
    const x=vx+dx, y=vy+dy;
    if(x>=0&&y>=0&&x<GRID&&y<GRID){ const t=grid[y][x]; s+=(t.terr==='mountain'?(t.mh||0):0); }
    c++;
  }
  return s/c;
}
// Teil-Polygon eines Vierecks oberhalb einer Höhenlinie (Marching-Squares auf einem Quad).
function clipAbove(v,lvl){
  const out=[], n=v.length;
  for(let i=0;i<n;i++){ const a=v[i], b=v[(i+1)%n], ain=a.h>=lvl, bin=b.h>=lvl;
    if(ain) out.push(a);
    if(ain!==bin){ const t=(lvl-a.h)/(b.h-a.h); out.push({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t}); }
  }
  return out;
}
// Gebirge als zusammenhängende Geländefläche: Eckpunkthöhen heben die Kachel,
// Felsflanken nur an Außenkanten, glatte Schneegrenze als Höhenlinie übers ganze Massiv.
function drawMountain(gx,gy){
  if(grid[gy][gx].mh===undefined) computeMountainHeights();          // alte Spielstände nachrüsten
  const s=cam.scale, k=STEP*s;
  const T=project(gx,gy), R=project(gx+1,gy), B=project(gx+1,gy+1), L=project(gx,gy+1);
  const hT=cornerH(gx,gy), hR=cornerH(gx+1,gy), hB=cornerH(gx+1,gy+1), hL=cornerH(gx,gy+1);
  const tT={x:T.x,y:T.y-hT*k,h:hT}, tR={x:R.x,y:R.y-hR*k,h:hR},
        tB={x:B.x,y:B.y-hB*k,h:hB}, tL={x:L.x,y:L.y-hL*k,h:hL};
  const isM=(x,y)=> inBounds(x,y)&&grid[y][x].terr==='mountain';
  ctx.fillStyle='rgba(24,20,12,.16)'; poly([T,R,B,L]);              // Bodenschatten (Fußabdruck)
  // Felsflanken nur an Kanten zum Flachland (innere Kanten sind koplanar -> nahtlos)
  if(!isM(gx-1,gy)){ ctx.fillStyle='#675f4e'; poly([L,T,tT,tL]); }   // NW (hinten)
  if(!isM(gx,gy-1)){ ctx.fillStyle='#6f6756'; poly([T,R,tR,tT]); }   // NE (hinten)
  if(!isM(gx,gy+1)){ ctx.fillStyle='#8a8073'; poly([L,B,tB,tL]); }   // SW (vorn, hell)
  if(!isM(gx+1,gy)){ ctx.fillStyle='#5e564b'; poly([B,R,tR,tB]); }   // SE (vorn, dunkel)
  // Deckfläche: zwei Facetten (SW hell / SE dunkel), Felston steigt mit der Höhe
  const u=Math.min(1,((hT+hR+hB+hL)/4)/Math.max(1,mountainMaxH));    // 0 Fuß .. 1 Gipfel
  const bR=124+(168-124)*u, bG=120+(160-120)*u, bB=96+(146-96)*u;
  const fac=f=>{const m=v=>Math.max(0,Math.min(255,v*(1+f)))|0; return 'rgb('+m(bR)+','+m(bG)+','+m(bB)+')';};
  ctx.fillStyle=fac(0.07);  poly([tT,tL,tB]);                        // SW-Hälfte
  ctx.fillStyle=fac(-0.10); poly([tT,tB,tR]);                        // SE-Hälfte
  const mx=(tT.x+tR.x+tB.x+tL.x)/4, my=(tT.y+tR.y+tB.y+tL.y)/4;      // gehobene Deckmitte
  // Grasüberwuchs: am Fuß dicht, nach oben ausdünnend (bis ~u=0.45 verschwunden)
  const grass=Math.max(0, 1-u/0.45);
  if(grass>0.02){
    ctx.fillStyle='rgba(104,140,60,'+(0.5*grass).toFixed(3)+')'; poly([tT,tR,tB,tL]);
    if(grass>0.45) for(let i=0;i<3;i++){                            // ein paar dunklere Grasbüschel
      const px=mx+(rng2(gx*5+i,gy*3)-0.5)*TW*0.34*s, py=my+(rng2(gx*3,gy*5+i)-0.5)*TH*0.34*s;
      ctx.fillStyle='rgba(70,104,40,'+(0.32*grass).toFixed(3)+')';
      ctx.beginPath();ctx.ellipse(px,py,2.4*s,1.2*s,0,0,7);ctx.fill();
    }
  }
  ctx.strokeStyle='rgba(40,34,24,.18)'; ctx.lineWidth=Math.max(1,1*s);  // Grat
  ctx.beginPath(); ctx.moveTo(tT.x,tT.y); ctx.lineTo(tB.x,tB.y); ctx.stroke();
  // Schneedecke: glatte Höhenlinie quer übers Massiv (nur die hohen Gipfel)
  const SL=mountainMaxH*0.6, snow=clipAbove([tT,tR,tB,tL],SL);
  if(snow.length>=3){
    ctx.fillStyle='#eef1ef'; poly(snow);
    ctx.strokeStyle='rgba(206,219,228,.55)'; ctx.lineWidth=Math.max(1,1*s); ctx.stroke();
  }
  // Bewuchs nach Höhe: unten Bäume -> Mitte nur Sträucher -> Vegetationsgrenze (u>=0.55: nackter Fels)
  if(u<0.55){
    const pick=rng2(gx*7+1,gy*5+3);
    if(u<0.30){                                                      // Baumzone, nach oben ausdünnend
      const d=1-u/0.30;                                              // 1 Fuß .. 0 Baumgrenze
      if(pick<0.30+0.55*d){ const n=1+(rng2(gx*3,gy*9)<d*0.7?1:0);
        for(let i=0;i<n;i++){ const px=mx+(rng2(gx*9+i,gy*4)-0.5)*TW*0.32*s, py=my+(rng2(gx*4,gy*9+i)-0.5)*TH*0.32*s;
          drawTree(rng2(gx+i,gy)<0.5?'fir':'pine', px,py,(0.55+0.35*d)*s, gx*2+gy+i); } }
    } else {                                                         // Strauchzone (mittlere Höhe)
      const d=1-(u-0.30)/0.25;                                       // 1 Baumgrenze .. 0 Vegetationsgrenze
      if(pick<0.22+0.5*d){ const n=1+(rng2(gx*5,gy*7)<d*0.6?1:0);
        for(let i=0;i<n;i++){ const px=mx+(rng2(gx*11+i,gy*6)-0.5)*TW*0.28*s, py=my+(rng2(gx*6,gy*11+i)-0.5)*TH*0.28*s;
          drawShrub(px,py,(0.7+0.4*d)*s, gx+gy*3+i); } }
    }
  }
  return {cx:(tT.x+tB.x)/2, cy:(T.y+B.y)/2, topY:Math.min(tT.y,tR.y,tB.y,tL.y)};
}
function waterDeco(g){const s=cam.scale;                                  // fließende Wellen
  const d=Math.sin(animT*1.3 + (g.cx+g.cy)*0.018)*3.2*s;
  ctx.strokeStyle='rgba(230,240,245,.30)';ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(g.cx-8*s+d,g.cy);ctx.lineTo(g.cx+8*s+d,g.cy);
  ctx.moveTo(g.cx-5*s-d,g.cy+5*s);ctx.lineTo(g.cx+7*s-d,g.cy+5*s);
  ctx.stroke();
}
function furrowDeco(g){const s=cam.scale;                                 // Ackerfurchen + Pflänzchen
  ctx.strokeStyle='rgba(120,95,40,.4)';ctx.lineWidth=1;
  for(let k=-1;k<=1;k++){ctx.beginPath();
    ctx.moveTo(g.cx+k*8*s,g.cy-k*4*s-6*s);ctx.lineTo(g.cx+k*8*s+12*s,g.cy-k*4*s);ctx.stroke();}
  ctx.fillStyle='#6f9a3e';                                                // junge Saat
  for(let k=-1;k<=1;k++)for(let j=0;j<3;j++){const t=j/3+0.15;
    const px=g.cx+k*8*s + t*12*s, py=g.cy-k*4*s-6*s + t*6*s;
    ctx.beginPath();ctx.ellipse(px,py,1.1*s,0.7*s,0,0,7);ctx.fill();}
}
function scatterProp(gx,gy,g){                                            // Findlinge / Büsche / Steine / Blumen (fest pro Feld)
  const s=cam.scale;
  let nearRock=false;                                                     // Findling häufiger am Berg-/Hügelfuß
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const row=grid[gy+dy]; const t=row&&row[gx+dx];
    if(t&&(t.terr==='mountain'||t.terr==='hill')){nearRock=true;break;}}
  if(rng2(gx*17+3,gy*11+9) > (nearRock?0.80:0.93)){ drawBoulder(gx,gy,g); return; }   // einzelner großer Stein
  const h=rng2(gx*13+1,gy*7+5);
  if(h<0.72) return;                                                      // nur ~28% der restlichen Felder
  const x=g.cx+(rng2(gx*3,gy*9)-0.5)*TW*0.4*s, y=g.cy+(rng2(gx*9,gy*3)-0.5)*TH*0.4*s;
  ctx.fillStyle='rgba(28,38,18,.14)';                                     // Schatten
  ctx.beginPath();ctx.ellipse(x+1.6*s,y+1*s,4*s,1.8*s,0,0,7);ctx.fill();
  if(h<0.85){                                                            // Busch
    const sway=Math.sin(animT*1.6+(gx+gy))*1.1*s;
    ctx.fillStyle='#3f6b2f';
    for(const [dx,dy,r] of [[-2,0,3],[2,0,2.6],[0,-1.4,3.2]]){ctx.beginPath();ctx.arc(x+dx*s+sway*0.3,y+dy*s,r*s,0,7);ctx.fill();}
    ctx.fillStyle='#4d7d37';ctx.beginPath();ctx.arc(x-0.5*s+sway*0.3,y-2*s,2*s,0,7);ctx.fill();
  } else if(h<0.94){                                                     // Stein
    ctx.fillStyle='#8d8b86';ctx.beginPath();ctx.ellipse(x,y-1*s,3.3*s,2.3*s,0,0,7);ctx.fill();
    ctx.fillStyle='#a6a49e';ctx.beginPath();ctx.ellipse(x-0.6*s,y-1.8*s,1.7*s,1.1*s,0,0,7);ctx.fill();
  } else {                                                               // Blumen
    const cols=['#ecd84f','#ec7f9a','#f4f0e6','#b98ce0'];
    for(let i=0;i<4;i++){const fx=x+(rng2(gx*5+i,gy)-0.5)*9*s, fy=y+(rng2(gx,gy*5+i)-0.5)*5*s;
      ctx.fillStyle=cols[(rng2(gx+i,gy+i)*4)|0]; ctx.beginPath();ctx.arc(fx,fy,1*s,0,7);ctx.fill();}
  }
}
function drawBoulder(gx,gy,g){                                            // einzelner Findling (Felsbrocken)
  const s=cam.scale, x=g.cx+(rng2(gx*3,gy*9)-0.5)*TW*0.3*s, y=g.cy+(rng2(gx*9,gy*3)-0.5)*TH*0.3*s;
  ctx.fillStyle='rgba(28,38,18,.16)'; ctx.beginPath();ctx.ellipse(x+2*s,y+1.6*s,7*s,3*s,0,0,7);ctx.fill();
  ctx.fillStyle='#83817c'; ctx.beginPath();ctx.ellipse(x,y-1*s,5.2*s,3.4*s,0,0,7);ctx.fill();
  ctx.fillStyle='#9d9b95'; ctx.beginPath();ctx.ellipse(x-1*s,y-2.6*s,3*s,2*s,0,0,7);ctx.fill();
  ctx.fillStyle='#6f6d68'; ctx.beginPath();ctx.ellipse(x+3*s,y-0.4*s,2.4*s,1.7*s,0,0,7);ctx.fill();
}
// --- Rohstoff-Aufschlüsse: Stein (grau) & Marmor (hell, mit Ader) -----------
function oneRock(x,y,r,base,lite,dark){
  ctx.fillStyle='rgba(28,38,18,.16)'; ctx.beginPath();ctx.ellipse(x+r*0.4,y+r*0.35,r*1.4,r*0.62,0,0,7);ctx.fill();  // Schatten
  ctx.fillStyle=base; ctx.beginPath();ctx.ellipse(x,y-r*0.2,r,r*0.7,0,0,7);ctx.fill();
  ctx.fillStyle=lite; ctx.beginPath();ctx.ellipse(x-r*0.22,y-r*0.5,r*0.55,r*0.4,0,0,7);ctx.fill();              // Lichtkante
  ctx.fillStyle=dark; ctx.beginPath();ctx.ellipse(x+r*0.55,y-r*0.02,r*0.46,r*0.34,0,0,7);ctx.fill();           // Schattenfacette
}
function rockDeco(gx,gy,g){                                              // Brocken-Cluster (tiefensortiert wie Bäume)
  const s=cam.scale, marble=grid[gy][gx].terr==='marble';
  const base=marble?'#dcd8cf':'#83817c', lite=marble?'#f1eee7':'#9d9b95', dark=marble?'#bcc4c6':'#6f6d68';
  const n=3+((gx*5+gy*3)%3);                                             // 3-5 Brocken pro Feld
  const pts=[];
  for(let i=0;i<n;i++){
    const x=g.cx+(rng2(gx*9+i,gy*4+1)-0.5)*TW*0.5*s, y=g.cy+(rng2(gx*4+1,gy*9+i)-0.5)*TH*0.5*s;
    pts.push({x,y,r:(3+rng2(gx+i,gy+i*3)*4)*s});
  }
  pts.sort((a,b)=>a.y-b.y);                                              // hinten zuerst -> sauberes Überlappen
  for(const p of pts){
    oneRock(p.x,p.y,p.r,base,lite,dark);
    if(marble){ ctx.strokeStyle='rgba(150,164,170,.55)'; ctx.lineWidth=Math.max(1,0.7*s);   // Marmor-Ader
      ctx.beginPath();ctx.moveTo(p.x-p.r*0.5,p.y-p.r*0.45);ctx.quadraticCurveTo(p.x,p.y-p.r*0.62,p.x+p.r*0.5,p.y-p.r*0.1);ctx.stroke(); }
  }
}
function rockFloorDeco(gx,gy,g){                                         // dezente Risse auf dem Felsboden (Pass 1)
  const s=cam.scale, marble=grid[gy][gx].terr==='marble';
  ctx.strokeStyle=marble?'rgba(150,160,165,.30)':'rgba(60,56,48,.28)'; ctx.lineWidth=Math.max(1,0.8*s);
  for(let i=0;i<2;i++){ const x=g.cx+(rng2(gx*7+i,gy*3)-0.5)*TW*0.42*s, y=g.cy+(rng2(gx*3,gy*7+i)-0.5)*TH*0.42*s;
    ctx.beginPath();ctx.moveTo(x-3*s,y);ctx.lineTo(x+2*s,y+1.5*s);ctx.lineTo(x+4*s,y-1*s);ctx.stroke(); }
}
// Schilf an Land-Feldern, die an Wasser grenzen (zum jeweiligen Ufer hin)
function shoreReeds(gx,gy){
  const C={tt:project(gx,gy),rt:project(gx+1,gy),bt:project(gx+1,gy+1),lt:project(gx,gy+1)};
  const cx=(C.tt.x+C.bt.x)/2, cy=(C.tt.y+C.bt.y)/2;
  const edges=[[0,-1,C.tt,C.rt],[1,0,C.rt,C.bt],[0,1,C.bt,C.lt],[-1,0,C.lt,C.tt]];
  for(const [dx,dy,a,b] of edges){ const nx=gx+dx,ny=gy+dy;
    if(!(inBounds(nx,ny)&&grid[ny][nx].terr==='water')) continue;
    if(rng2(gx*7+dx*3+11, gy*5+dy*3+4) < 0.35) continue;   // nicht an jeder Uferkante
    const ex=(a.x+b.x)/2, ey=(a.y+b.y)/2;
    drawReedClump(ex+(cx-ex)*0.16, ey+(cy-ey)*0.16, gx*5+gy*3+dx-dy);
  }
}
function drawReedClump(px,py,seed){
  const s=cam.scale, n=3+(((seed%3)+3)%3);
  for(let i=0;i<n;i++){
    const bx=px+(rng2(seed+i,seed*2+3)-0.5)*8*s, by=py+(rng2(seed*3+1,seed+i)-0.5)*3*s;
    const hgt=(7+rng2(seed+i,seed+2)*4)*s, sway=Math.sin(animT*1.7+seed+i*0.9)*2*s;
    ctx.strokeStyle='#6f8f3a'; ctx.lineWidth=Math.max(1,1.1*s); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+sway*0.5,by-hgt*0.6, bx+sway,by-hgt); ctx.stroke();
    if(i%2===0){ ctx.strokeStyle='#7a5230'; ctx.lineWidth=Math.max(1.4,1.9*s);   // Rohrkolben
      ctx.beginPath(); ctx.moveTo(bx+sway,by-hgt); ctx.lineTo(bx+sway,by-hgt+2.6*s); ctx.stroke(); }
  }
  ctx.lineCap='butt';
}
function dotAt(x,y,col){ctx.beginPath();ctx.arc(x,y,3*cam.scale+1,0,7);ctx.fillStyle=col;ctx.fill();}
