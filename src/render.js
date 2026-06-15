/* TERRA · render.js */
// ---- Rendering ----
// antike Pflasterstraße: unregelmäßige Steinplatten mit Fugen + helle Bordsteine
function drawRoad(x,y,g){
  const A=g.tt,B=g.rt,C=g.bt,D=g.lt, n=3, s=cam.scale;
  const P=(u,v)=>{const t=lerp(A,B,u),b=lerp(D,C,u);return lerp(t,b,v);};
  const node=(i,j)=>{let p=P(i/n,j/n);
    if(i>0&&i<n&&j>0&&j<n){p={x:p.x+(rng2(x*9+i,y*9+j)-0.5)*5*s, y:p.y+(rng2(x*9+i+50,y*9+j)-0.5)*2.5*s};}
    return p;};
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const a=node(i,j),b=node(i+1,j),c=node(i+1,j+1),d=node(i,j+1);
    const t=0.72+rng2(x*7+i,y*7+j)*0.45;
    ctx.fillStyle='rgb('+((150*t)|0)+','+((142*t)|0)+','+((122*t)|0)+')';
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(70,60,44,.5)';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.strokeStyle='rgba(228,219,193,.55)';ctx.lineWidth=Math.max(1,1.2*s);     // Bordsteine
  ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.lineTo(D.x,D.y);ctx.closePath();ctx.stroke();
}
// Boden-Pass: Terrain, Straßen, flache Deko (keine Gebäude)
function drawGround(x,y){
  const c=grid[y][x], td=TERR[c.terr]||TERR.grass, e=td.elev;
  const topCol = c.type==='road' ? '#b9ad95' : td.top[0];
  const sL = td.side? td.side[1] : shade(topCol,-0.10);   // SW (links) heller
  const sR = td.side? td.side[0] : shade(topCol,-0.26);   // SE (rechts) dunkler
  const seam = c.type==='road' ? null : topCol;           // gleiche Farbe -> Kacheln verschmelzen zur Fläche
  const g=terrainBlock(x,y,e,topCol,sL,sR,seam);
  if(c.type==='road'){ drawRoad(x,y,g); return; }
  if(c.type==='empty'){
    if(td.water) waterDeco(g);
    else if(td.furrow) furrowDeco(g);
    else if(td.trees) treeDeco(x,y,g);
    else if(c.terr==='grass'||c.terr==='meadow'){           // dezente Bodentextur
      ctx.fillStyle='rgba(58,86,38,.16)';
      for(let i=0;i<3;i++){const rx=(rng2(x*5+i,y*3)-0.5)*TW*0.5*cam.scale, ry=(rng2(x*3,y*5+i)-0.5)*TH*0.5*cam.scale;
        ctx.beginPath();ctx.arc(g.cx+rx,g.cy+ry,1.1*cam.scale,0,7);ctx.fill();}
    }
    if(td.peak) peakDeco(g);
  }
}
// Objekt-Pass: Gebäude + Status-Punkte (tiefen-sortiert über dem Boden)
function drawObjects(x,y){
  const c=grid[y][x], td=TERR[c.terr]||TERR.grass, e=td.elev;
  if(c.type==='house'){
    const m=drawBuilding(x,y,'house',c.lvl,e*STEP);
    const yy=m.topY-6*cam.scale, sp=7*cam.scale, off='#5b4a3288';
    dotAt(m.cx-sp*1.5,yy,c.water>0?'#3a7d9c':off);
    dotAt(m.cx-sp*0.5,yy,c.food >0?'#b1542d':off);
    dotAt(m.cx+sp*0.5,yy,c.taxed>0?'#c9a227':off);
    dotAt(m.cx+sp*1.5,yy,c.goods>0?'#9c5bd0':off);
  } else if(c.type==='well'||c.type==='market'||c.type==='forum'||c.type==='claypit'||c.type==='pottery'){
    drawBuilding(x,y,c.type,0,e*STEP);
  }
}
function hasObject(x,y){const t=grid[y][x].type; return t==='house'||t==='well'||t==='market'||t==='forum'||t==='claypit'||t==='pottery';}
// ---- Träger-Figuren (Wuselfaktor) ----
function amphora(x,y,s,col){
  ctx.fillStyle=col; ctx.beginPath();ctx.ellipse(x,y,2.1*s,2.9*s,0,0,7);ctx.fill();   // Bauch
  ctx.fillStyle=shade(col,0.12); ctx.fillRect(x-0.6*s,y-4.2*s,1.2*s,2.2*s);            // Hals
  ctx.fillStyle=shade(col,-0.28); ctx.beginPath();ctx.ellipse(x,y-4.3*s,1.4*s,0.6*s,0,0,7);ctx.fill(); // Mündung
}
function drawLoad(w,x,topY,s){
  if(w.kind==='settler'){                                   // Reisebündel
    ctx.fillStyle='#b5905a';ctx.beginPath();ctx.ellipse(x,topY+0.6*s,2.7*s,2.2*s,0,0,7);ctx.fill();
    ctx.strokeStyle='rgba(60,40,20,.45)';ctx.lineWidth=Math.max(1,0.6*s);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-2.4*s,topY+0.6*s);ctx.lineTo(x+2.4*s,topY+0.6*s);ctx.stroke();
    return;
  }
  if(w.cargo==='clay'){
    ctx.fillStyle='#9c6a3a';ctx.beginPath();ctx.ellipse(x,topY,3.2*s,2.1*s,0,0,7);ctx.fill();
    ctx.fillStyle='#b78049';ctx.beginPath();ctx.ellipse(x-0.9*s,topY-0.7*s,1.1*s,0.8*s,0,0,7);ctx.fill();
  } else if(w.cargo==='cer'){ amphora(x,topY+0.5*s,s,'#3f9c8a');
  } else if(w.service==='water'){ amphora(x,topY+0.5*s,s,'#4f93b0');
  } else if(w.service==='market'){
    ctx.fillStyle='#b07a3c';ctx.beginPath();
    ctx.moveTo(x-3*s,topY-0.5*s);ctx.lineTo(x+3*s,topY-0.5*s);ctx.lineTo(x+2.2*s,topY+3*s);ctx.lineTo(x-2.2*s,topY+3*s);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#7c531f';ctx.lineWidth=Math.max(1,0.6*s);ctx.beginPath();ctx.arc(x,topY-0.5*s,3*s,Math.PI,0);ctx.stroke();
    if(w.goods) amphora(x+0.4*s,topY,s*0.78,'#3f9c8a');
  } else if(w.service==='tax'){
    ctx.fillStyle='#ece3c8';ctx.fillRect(x-2.4*s,topY-0.8*s,4.8*s,2.4*s);
    ctx.strokeStyle='#bcb083';ctx.lineWidth=Math.max(1,0.6*s);ctx.strokeRect(x-2.4*s,topY-0.8*s,4.8*s,2.4*s);
    ctx.fillStyle='#c9a227';ctx.beginPath();ctx.arc(x+2.6*s,topY+0.4*s,0.95*s,0,7);ctx.fill();
  }
}
function drawWalker(w,gx,gy){
  const s=cam.scale*1.2;
  const td=TERR[grid[Math.floor(gy)]?.[Math.floor(gx)]?.terr]||TERR.grass, e=td.elev;
  const p=project(gx+0.5,gy+0.5), g0=p.y-e*STEP*s;
  if(w.ph===undefined){w.ph=Math.random()*6.283; w.sk=['#caa07a','#b98a63','#d8b48c'][(Math.random()*3)|0]; w.tu=Math.random()<0.5;}
  const sw=Math.sin(animT*9+w.ph), bob=Math.abs(Math.cos(animT*9+w.ph))*0.8*s;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(p.x,g0,4.6*s,2.2*s,0,0,7);ctx.fill();   // Schatten
  const hipY=g0-6.5*s+bob, headY=g0-11.5*s+bob;
  ctx.lineCap='round';
  ctx.strokeStyle='#5b4636';ctx.lineWidth=Math.max(1.2,1.5*s);                                        // Beine
  ctx.beginPath();ctx.moveTo(p.x,hipY);ctx.lineTo(p.x+sw*2.3*s,g0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.x,hipY);ctx.lineTo(p.x-sw*2.3*s,g0);ctx.stroke();
  const tunic=w.tu?'#daccb0':'#c9b591';                                                               // Tunika
  ctx.fillStyle=tunic;ctx.beginPath();
  ctx.moveTo(p.x-2.4*s,hipY+0.5*s);ctx.lineTo(p.x+2.4*s,hipY+0.5*s);ctx.lineTo(p.x+1.6*s,headY+2.4*s);ctx.lineTo(p.x-1.6*s,headY+2.4*s);ctx.closePath();ctx.fill();
  ctx.strokeStyle=shade(tunic,-0.3);ctx.lineWidth=Math.max(1,0.8*s);                                  // Gürtel
  ctx.beginPath();ctx.moveTo(p.x-2*s,hipY-0.8*s);ctx.lineTo(p.x+2*s,hipY-0.8*s);ctx.stroke();
  ctx.strokeStyle=shade(tunic,-0.12);ctx.lineWidth=Math.max(1.1,1.3*s);                               // Arme (gegengleich)
  ctx.beginPath();ctx.moveTo(p.x,headY+3.2*s);ctx.lineTo(p.x-sw*1.7*s,hipY+1*s);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.x,headY+3.2*s);ctx.lineTo(p.x+sw*1.7*s,hipY+1*s);ctx.stroke();
  ctx.fillStyle=w.sk;ctx.beginPath();ctx.arc(p.x,headY,2*s,0,7);ctx.fill();                            // Kopf
  ctx.fillStyle='#3b2a1c';ctx.beginPath();ctx.arc(p.x,headY-0.7*s,2*s,Math.PI,0);ctx.closePath();ctx.fill(); // Haar
  drawLoad(w,p.x,headY-3.2*s,s);                                                                       // Last auf dem Kopf
  ctx.lineCap='butt';
}
// ---- Weiches Wasser: abgerundete, leicht überlappende Flächen (Küste fließt über) ----
function _ex(p,cx,cy,k){return {x:cx+(p.x-cx)*k, y:cy+(p.y-cy)*k};}
function waterDiamond(x,y,k,col){       // exakte (gerade) Raute -> Nachbarn verschmelzen zu EINER Fläche
  const t=project(x,y),r=project(x+1,y),b=project(x+1,y+1),l=project(x,y+1);
  const cx=(t.x+b.x)/2, cy=(t.y+b.y)/2;
  const T=_ex(t,cx,cy,k),R=_ex(r,cx,cy,k),B=_ex(b,cx,cy,k),L=_ex(l,cx,cy,k);
  ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(T.x,T.y);ctx.lineTo(R.x,R.y);ctx.lineTo(B.x,B.y);ctx.lineTo(L.x,L.y);ctx.closePath();ctx.fill();
}
function waterBlob(x,y,k,col){
  const t=project(x,y),r=project(x+1,y),b=project(x+1,y+1),l=project(x,y+1);
  const cx=(t.x+b.x)/2, cy=(t.y+b.y)/2;
  const T=_ex(t,cx,cy,k),R=_ex(r,cx,cy,k),B=_ex(b,cx,cy,k),L=_ex(l,cx,cy,k);
  const m=(a,c)=>({x:(a.x+c.x)/2,y:(a.y+c.y)/2});
  const m1=m(T,R),m2=m(R,B),m3=m(B,L),m4=m(L,T);
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(m1.x,m1.y);
  ctx.quadraticCurveTo(R.x,R.y,m2.x,m2.y);
  ctx.quadraticCurveTo(B.x,B.y,m3.x,m3.y);
  ctx.quadraticCurveTo(L.x,L.y,m4.x,m4.y);
  ctx.quadraticCurveTo(T.x,T.y,m1.x,m1.y);
  ctx.closePath();ctx.fill();
}
function render(){
  const r=cv.parentElement.getBoundingClientRect();
  ctx.clearRect(0,0,r.width,r.height);
  // Pass 1 — Boden & Wasser in EINEM tiefen-sortierten Durchgang.
  // So verdecken weiter vorne liegende Hügel/Berge/Wälder das dahinterliegende Wasser korrekt.
  const ground=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ if(onScreen(x,y)) ground.push({d:x+y,x,y}); }
  ground.sort((a,b)=>a.d-b.d);
  for(const g of ground){ const c=grid[g.y][g.x];
    if(c.terr==='water'){
      waterDiamond(g.x,g.y,1.04,'#3f7d9c');   // verschmolzene Fläche
      waterBlob(g.x,g.y,1.14,'#3f7d9c');       // weiche, leicht überfließende Küste
      const t=project(g.x,g.y),b=project(g.x+1,g.y+1); waterDeco({cx:(t.x+b.x)/2,cy:(t.y+b.y)/2});
    } else drawGround(g.x,g.y);
  }
  // Bau-Vorschau über dem Boden
  for(const c of previewCells){ if(!onScreen(c.x,c.y))continue;
    const tile=grid[c.y][c.x], e=(TERR[tile.terr]||TERR.grass).elev;
    const free=tile.type==='empty'&&buildableTerr(tile);
    terrainBlock(c.x,c.y,e,free?'rgba(201,162,39,.6)':'rgba(192,83,58,.55)',
      'rgba(150,110,20,.5)','rgba(150,110,20,.5)',null);
  }
  // Pass 2 — Objekte (Gebäude, Träger, Schafe) tiefen-sortiert über dem Boden
  const items=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ if(onScreen(x,y)&&hasObject(x,y)) items.push({d:x+y,t:1,x,y}); }
  for(const w of walkers){const gx=w.x+(w.dx||0)*w.prog, gy=w.y+(w.dy||0)*w.prog;
    items.push({d:gx+gy+0.05,t:0,gx,gy,w});}
  for(const s of sheep){ items.push({d:s.gx+s.gy+0.04,t:2,s}); }
  items.sort((a,b)=>a.d-b.d);
  for(const o of items){
    if(o.t===1) drawObjects(o.x,o.y);
    else if(o.t===2) drawSheep(o.s);
    else drawWalker(o.w,o.gx,o.gy);
  }
  drawBirds();
  drawWeather();
}
