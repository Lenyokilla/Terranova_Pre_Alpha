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
// ---- Brücke: Steindeck über Wasser ---------------------------------------
// Eine Brücke ist eine Straße (type='road') auf einer Wasserkachel. Sie wird
// im Boden-Pass gezeichnet (Läufer kommen tiefensortiert im Objekt-Pass darüber).
// Das Deck füllt die ganze Raute -> benachbarte Brückenfelder schließen lückenlos
// an. Geländer kommen auf die Seitenkanten quer zur Reiserichtung (aus den
// Nachbar-Straßen abgeleitet), sonst auf die vorderen Kanten.
function bridgeNbr(x,y){ return inBounds(x,y) && (grid[y][x].type==='road'||grid[y][x].type==='roadblock'); }
function drawParapet(p1,p2,s){
  const ph=5*s;
  const a={x:p1.x,y:p1.y-ph}, b={x:p2.x,y:p2.y-ph};
  ctx.fillStyle='#b6a884'; poly([p1,p2,b,a]);                                   // Brüstungs-Wand
  ctx.fillStyle='#e6dcc1'; poly([a,b,{x:b.x,y:b.y-1.5*s},{x:a.x,y:a.y-1.5*s}]); // helle Oberkante
  ctx.fillStyle='#9c8d68';                                                       // Pfosten
  for(const t of [0,0.5,1]){const px=lerp(p1,p2,t).x, py=lerp(p1,p2,t).y;
    ctx.fillRect(px-1.1*s,py-ph-1*s,2.2*s,ph+2.2*s);}
}
function drawBridge(x,y,wg){
  const s=cam.scale, lift=6*s;
  const T={x:wg.tt.x,y:wg.tt.y-lift},R={x:wg.rt.x,y:wg.rt.y-lift},
        B={x:wg.bt.x,y:wg.bt.y-lift},L={x:wg.lt.x,y:wg.lt.y-lift};
  // weicher Schatten auf dem Wasser unter dem Deck
  ctx.fillStyle='rgba(10,28,42,.20)';
  ctx.beginPath();ctx.ellipse(wg.cx,wg.cy+3*s,TW*0.30*s,TH*0.30*s,0,0,7);ctx.fill();
  // Deck-Dicke (vordere Flanken)
  ctx.fillStyle='#6f5c3e'; poly([wg.lt,wg.bt,B,L]);   // SW-Flanke
  ctx.fillStyle='#5d4c32'; poly([wg.bt,wg.rt,R,B]);   // SE-Flanke
  // Deck-Oberfläche (Steinplatten)
  ctx.fillStyle='#c7bb9d'; poly([T,R,B,L]);
  ctx.strokeStyle='rgba(92,78,52,.45)';ctx.lineWidth=Math.max(1,0.9*s);         // Plattenfugen
  for(let k=1;k<3;k++){const u=k/3;
    ctx.beginPath();ctx.moveTo(lerp(T,R,u).x,lerp(T,R,u).y);ctx.lineTo(lerp(L,B,u).x,lerp(L,B,u).y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(lerp(T,L,u).x,lerp(T,L,u).y);ctx.lineTo(lerp(R,B,u).x,lerp(R,B,u).y);ctx.stroke();}
  // Geländer abhängig von der Reiserichtung
  const ax=bridgeNbr(x-1,y)||bridgeNbr(x+1,y), ay=bridgeNbr(x,y-1)||bridgeNbr(x,y+1);
  let rails;
  if(ax&&!ay) rails=[[T,R],[L,B]];        // Reise entlang x -> Geländer NE & SW
  else if(ay&&!ax) rails=[[L,T],[R,B]];   // Reise entlang y -> Geländer NW & SE
  else rails=[[L,B],[B,R]];               // mehrdeutig/Einzelfeld -> vordere Kanten
  for(const [p,q] of rails) drawParapet(p,q,s);
}
// Brücke (nur das Deck) auf bereits gezeichnetem Wasser — für den Objekt-Pass.
// Geometrie wie eine flache Raute (elev 0); drawBridge hebt das Deck darüber an.
function drawBridgeAt(gx,gy){
  const t=project(gx,gy),r=project(gx+1,gy),b=project(gx+1,gy+1),l=project(gx,gy+1);
  drawBridge(gx,gy,{tt:t,rt:r,bt:b,lt:l, cx:(t.x+b.x)/2, cy:(t.y+b.y)/2});
}
// Boden-Pass: Terrain, Straßen, flache Deko (keine Gebäude)
function drawGround(x,y){
  const c=grid[y][x], td=TERR[c.terr]||TERR.grass, e=td.elev;
  if(c.terr==='mountain'){ drawMountain(x,y); return; }   // echte Bergform statt Kasten
  const roadLike = c.type==='road'||c.type==='roadblock';  // Sperre liegt auf der Straße
  if(roadLike && c.terr==='water'){                        // BRÜCKE: Wasser + Brückendeck statt Pflaster
    const base=td.top[0];
    const g=terrainBlock(x,y,0,base,shade(base,-0.10),shade(base,-0.26),base);
    waterDeco(g);
    drawBridge(x,y,g);
    return;
  }
  const topCol = roadLike ? '#b9ad95' : td.top[0];
  const sL = td.side? td.side[1] : shade(topCol,-0.10);   // SW (links) heller
  const sR = td.side? td.side[0] : shade(topCol,-0.26);   // SE (rechts) dunkler
  const seam = roadLike ? null : topCol;                  // gleiche Farbe -> Kacheln verschmelzen zur Fläche
  const g=terrainBlock(x,y,e,topCol,sL,sR,seam);
  if(roadLike){ drawRoad(x,y,g); return; }                // Sperre bekommt das Sperr-Objekt im Pass 2
  if(c.type==='empty'){
    if(td.water) waterDeco(g);
    else if(td.furrow) furrowDeco(g);
    else if(td.trees){ /* Bäume kommen im tiefensortierten Objekt-Pass (drawTreesAt) */ }
    else if(td.rocks){ rockFloorDeco(x,y,g); /* Brocken kommen im Objekt-Pass (drawRocksAt) */ }
    else if(c.terr==='grass'||c.terr==='meadow'){           // lebendige Bodentextur
      const s=cam.scale;
      ctx.fillStyle='rgba(54,80,34,.15)';                   // dunkle Tupfer
      for(let i=0;i<3;i++){const rx=(rng2(x*5+i,y*3)-0.5)*TW*0.5*s, ry=(rng2(x*3,y*5+i)-0.5)*TH*0.5*s;
        ctx.beginPath();ctx.arc(g.cx+rx,g.cy+ry,1.2*s,0,7);ctx.fill();}
      ctx.fillStyle='rgba(156,186,102,.13)';                // helle Grasbüschel im Licht
      for(let i=0;i<2;i++){const rx=(rng2(x*11+i,y*7)-0.5)*TW*0.46*s, ry=(rng2(x*7,y*11+i)-0.5)*TH*0.46*s;
        ctx.beginPath();ctx.ellipse(g.cx+rx,g.cy+ry,2.3*s,1.2*s,0,0,7);ctx.fill();}
      scatterProp(x,y,g);                                   // Büsche / Steine / Blumen
    }
    if(td.peak) peakDeco(g);
  }
}
// Bäume einer Waldkachel — separat, damit sie tiefensortiert mit Gebäuden gezeichnet werden
function drawTreesAt(x,y){
  const t=project(x,y), b=project(x+1,y+1);
  treeDeco(x,y,{cx:(t.x+b.x)/2, cy:(t.y+b.y)/2});
}
// Felsbrocken einer Stein-/Marmorkachel — tiefensortiert mit Gebäuden gezeichnet
function drawRocksAt(x,y){
  const t=project(x,y), b=project(x+1,y+1);
  rockDeco(x,y,{cx:(t.x+b.x)/2, cy:(t.y+b.y)/2});
}
// Objekt-Pass: Gebäude + Status-Punkte (tiefen-sortiert über dem Boden)
function drawObjects(x,y){
 try{
  const c=grid[y][x], td=TERR[c.terr]||TERR.grass, e=td.elev;
  if(c.anchor && !c.master) return;        // Mehrfeld-Sklave: wird vom Master mitgezeichnet
  let m=null;
  if(typeof MIL_BUILDING!=='undefined' && MIL_BUILDING[c.type] && typeof drawMilitaryBuilding==='function'){
    m=drawMilitaryBuilding(x,y,e*STEP,c.type);     // Mauer/Turm/Tor/Kaserne (military.js)
  } else if(c.type==='house'){
    m=drawBuilding(x,y,'house',c.lvl,e*STEP,{fireRisk:c.fireRisk,plagueRisk:c.plagueRisk,waterShortage:c.water<=0,unemployed:false});
    const yy=m.topY-6*cam.scale, sp=6*cam.scale, off='#5b4a3288';
    dotAt(m.cx-sp*3,yy,c.water>0?'#3a7d9c':off);
    dotAt(m.cx-sp*2,yy,c.food >0?'#b1542d':off);
    dotAt(m.cx-sp*1,yy,c.taxed>0?'#c9a227':off);
    dotAt(m.cx,     yy,c.goods>0?'#9c5bd0':off);
    dotAt(m.cx+sp*1,yy,(c.bath>0&&c.doctor>0)?'#3fae9a':off);   // Gesundheit (Therme + Arzt)
    dotAt(m.cx+sp*2,yy,c.entertain>0?'#d6589e':off);            // Unterhaltung (Theater/Arena/Kolosseum)
    dotAt(m.cx+sp*3,yy,(c.schul>0&&c.biblio>0)?'#5566cc':off);  // Bildung (Schule + Bibliothek)
  } else if(BUILD[c.type]&&BUILD[c.type].foot){    // großes Mehrfeld-Bauwerk (Spielstätte): einmal über den ganzen Footprint
    m=drawVenue(x,y,e*STEP,c.type);
  } else if(c.type && c.type!=='road'){    // alle übrigen Gebäude (inkl. Tempel & künftige Typen)
    m=drawBuilding(x,y,c.type,0,e*STEP);
  }
  if(m){                                   // Gefahren + Arbeitskräfte
    let wy=m.topY-13*cam.scale;
    if(c.collapseRisk){ drawCollapseMark(m.cx,wy); wy-=12*cam.scale; }
    if(c.fireRisk){ drawFireMark(m.cx,wy); wy-=12*cam.scale; }
    if(c.plagueRisk){ drawPlagueMark(m.cx,wy); wy-=12*cam.scale; }
    if(BUILD[c.type]&&BUILD[c.type].jobs) drawWorkerBadge(m.cx-11*cam.scale, m.topY-9*cam.scale, c.staffed);
  }
 }catch(err){ /* ein fehlerhaftes Gebäude darf nie die ganze Karte ausblenden */ }
}
// Arbeitskräfte: grün = besetzt/arbeitet, grau mit rotem Strich = keine Arbeiter
function drawWorkerBadge(cx,cy,ok){const s=cam.scale, col=ok?'#4f9e43':'#9a9a93';
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(cx,cy-1*s,6*s,0,7);ctx.fill();   // heller Kreis als Hintergrund
  ctx.fillStyle=col;
  ctx.beginPath();ctx.arc(cx,cy-3*s,1.9*s,0,7);ctx.fill();                                        // Kopf
  ctx.beginPath();ctx.moveTo(cx-2.8*s,cy+3*s);ctx.quadraticCurveTo(cx,cy-1.2*s,cx+2.8*s,cy+3*s);ctx.closePath();ctx.fill(); // Körper
  if(!ok){ ctx.strokeStyle='#d23a2a';ctx.lineWidth=Math.max(1.4,1.6*s);
    ctx.beginPath();ctx.moveTo(cx-5*s,cy+4*s);ctx.lineTo(cx+5*s,cy-5*s);ctx.stroke(); }            // roter Schrägstrich
}
// Brand-Warnung: flackernde Flamme
function drawFireMark(cx,cy){const s=cam.scale, fl=Math.sin(animT*9)*1.2*s;
  for(const [dx,sc,col] of [[0,1,'#e8521f'],[0,0.6,'#f4b32e']]){
    ctx.fillStyle=col;ctx.beginPath();
    ctx.moveTo(cx+dx, cy-7*s*sc+fl);
    ctx.quadraticCurveTo(cx+dx+4*s*sc, cy-1*s, cx+dx, cy+3*s*sc);
    ctx.quadraticCurveTo(cx+dx-4*s*sc, cy-1*s, cx+dx, cy-7*s*sc+fl);
    ctx.fill();
  }
}
// Einsturz-Warnung: gelbes Warndreieck mit Ausrufezeichen
function drawCollapseMark(cx,cy){const s=cam.scale;
  ctx.fillStyle='#e7b53a';ctx.strokeStyle='#7a5512';ctx.lineWidth=Math.max(1,1*s);
  ctx.beginPath();ctx.moveTo(cx,cy-6*s);ctx.lineTo(cx+5.5*s,cy+3*s);ctx.lineTo(cx-5.5*s,cy+3*s);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#3a2a08';ctx.fillRect(cx-0.7*s,cy-3.5*s,1.4*s,4*s);ctx.fillRect(cx-0.7*s,cy+1.6*s,1.4*s,1.4*s);
}
// Seuchen-Warnung: kränklich-grüne Scheibe mit umschwirrenden Fliegen
function drawPlagueMark(cx,cy){const s=cam.scale, fl=Math.sin(animT*7)*1.4*s;
  ctx.fillStyle='rgba(108,138,68,0.92)';ctx.beginPath();ctx.arc(cx,cy-1*s,5.4*s,0,7);ctx.fill();
  ctx.strokeStyle='rgba(40,52,24,0.6)';ctx.lineWidth=Math.max(1,0.9*s);ctx.stroke();
  ctx.fillStyle='#26310f';
  for(const [ox,oy] of [[-2.4,-1.6],[2.0,-2.2],[0.6,1.8]]){
    ctx.beginPath();ctx.arc(cx+ox*s,cy+(oy-1)*s+fl*0.3,1.05*s,0,7);ctx.fill(); }
}
// Ein Objekt liegt vor, wenn der Zelltyp ein Gebäude aus BUILD ist (außer Straße,
// die als Boden gezeichnet wird). Registry-basiert -> Tempel & künftige Gebäude
// erscheinen automatisch, ohne diese Liste pflegen zu müssen.
function hasObject(x,y){const t=grid[y][x].type; return !!(t && t!=='road' && typeof BUILD!=='undefined' && BUILD[t]);}
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
  } else if(w.cargo==='grain'){                                            // Getreidegarbe
    ctx.fillStyle='#d9b44a';ctx.beginPath();ctx.ellipse(x,topY,3*s,2.1*s,0,0,7);ctx.fill();
    ctx.strokeStyle='#b9962f';ctx.lineWidth=Math.max(1,0.6*s);
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*1.2*s,topY-0.4*s);ctx.lineTo(x+i*1.6*s,topY-3*s);ctx.stroke();}
  } else if(w.cargo==='flour'){                                           // Mehlsack
    ctx.fillStyle='#ece0c8';ctx.beginPath();ctx.ellipse(x,topY+0.4*s,2.5*s,2.9*s,0,0,7);ctx.fill();
    ctx.strokeStyle='#b9a984';ctx.lineWidth=Math.max(1,0.6*s);ctx.stroke();
    ctx.fillStyle='#d6c6a4';ctx.beginPath();ctx.moveTo(x-1.1*s,topY-2.2*s);ctx.lineTo(x+1.1*s,topY-2.2*s);ctx.lineTo(x+0.6*s,topY-3.2*s);ctx.lineTo(x-0.6*s,topY-3.2*s);ctx.closePath();ctx.fill(); // zugebundener Hals
  } else if(w.cargo==='bread'){                                            // Brote
    ctx.fillStyle='#caa46e';ctx.beginPath();ctx.ellipse(x-1*s,topY,1.8*s,1.2*s,0,0,7);ctx.fill();
    ctx.fillStyle='#b88a52';ctx.beginPath();ctx.ellipse(x+1.2*s,topY+0.3*s,1.7*s,1.1*s,0,0,7);ctx.fill();
  } else if(w.cargo==='fish'){                                            // frischer Fang im Korb
    ctx.fillStyle='#7a5e3a';ctx.beginPath();ctx.ellipse(x,topY+0.6*s,3*s,1.9*s,0,0,7);ctx.fill();   // Korb
    ctx.fillStyle='#9ec6d8';ctx.beginPath();ctx.ellipse(x-0.8*s,topY-0.6*s,2.2*s,1*s,-0.3,0,7);ctx.fill();
    ctx.fillStyle='#b9d8e6';ctx.beginPath();ctx.ellipse(x+1*s,topY-0.3*s,1.8*s,0.85*s,0.4,0,7);ctx.fill();
  } else if(w.cargo==='wood'){                                           // Holzbündel
    ctx.fillStyle='#9c6b3a';ctx.beginPath();ctx.ellipse(x,topY,1.5*s,3*s,0.5,0,7);ctx.fill();
    ctx.fillStyle='#7a5230';ctx.beginPath();ctx.ellipse(x+1.4*s,topY+0.3*s,1.4*s,2.8*s,0.5,0,7);ctx.fill();
    ctx.strokeStyle='#4a321c';ctx.lineWidth=Math.max(1,0.6*s);ctx.beginPath();ctx.moveTo(x-1.6*s,topY);ctx.lineTo(x+2.6*s,topY+0.4*s);ctx.stroke();
  } else if(w.cargo==='stone'){                                          // Steinblock
    ctx.fillStyle='#9a948a';ctx.fillRect(x-2.2*s,topY-1.6*s,4.4*s,3.6*s);
    ctx.fillStyle='#b4aea4';ctx.fillRect(x-2.2*s,topY-1.6*s,4.4*s,1.1*s);
    ctx.strokeStyle='rgba(50,46,40,.5)';ctx.lineWidth=Math.max(1,0.6*s);ctx.strokeRect(x-2.2*s,topY-1.6*s,4.4*s,3.6*s);
  } else if(w.cargo==='marble'){                                         // Marmorblock (hell, glänzend)
    ctx.fillStyle='#e3ded3';ctx.fillRect(x-2.2*s,topY-1.6*s,4.4*s,3.6*s);
    ctx.fillStyle='#f4f0e8';ctx.fillRect(x-2.2*s,topY-1.6*s,4.4*s,1.1*s);
    ctx.strokeStyle='rgba(150,160,165,.6)';ctx.lineWidth=Math.max(1,0.6*s);ctx.strokeRect(x-2.2*s,topY-1.6*s,4.4*s,3.6*s);
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
// Fischschwarm: kreisende Ringe + glitzernde Fischrücken (endlose Fischgründe)
function drawFishSchool(cx,cy){const s=cam.scale;
  ctx.strokeStyle='rgba(220,235,235,0.30)';ctx.lineWidth=Math.max(1,0.8*s);
  for(let i=0;i<2;i++){ const ph=animT*0.9+i*2.1, r=(6+i*4+Math.sin(ph)*1.5)*s;
    ctx.beginPath();ctx.ellipse(cx,cy,r,r*0.55,0,0,7);ctx.stroke(); }
  for(let i=0;i<5;i++){ const a=animT*0.8+i*1.257, rr=(4.5+(i%2)*2.2)*s;
    const fx=cx+Math.cos(a)*rr, fy=cy+Math.sin(a)*rr*0.55;
    ctx.fillStyle='rgba(150,190,205,0.8)';ctx.beginPath();ctx.ellipse(fx,fy,1.7*s,0.8*s,a,0,7);ctx.fill();
    ctx.fillStyle='rgba(60,90,105,0.7)';ctx.beginPath();ctx.ellipse(fx-Math.cos(a)*1.4*s,fy-Math.sin(a)*0.8*s,0.7*s,0.5*s,a,0,7);ctx.fill(); }
}
function drawWalker(w,gx,gy){
  const s=cam.scale*1.2;
  if(w.kind==='boat'){ drawBoat(w,gx,gy,s); return; }
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
// Fischerboot: kleiner Kahn mit Angler, leichtes Schaukeln + Kielwasser
function drawBoat(w,gx,gy,s){
  const p=project(gx+0.5,gy+0.5);
  if(w.ph===undefined)w.ph=Math.random()*6.283;
  const bob=Math.sin(animT*2.4+w.ph)*1.1*s, tilt=Math.sin(animT*2.4+w.ph)*0.06;
  const moving=(w.dx||0)!==0||(w.dy||0)!==0;
  // Kielwasser / Reflex
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(p.x,p.y+5*s,9*s,3.4*s,0,0,7);ctx.fill();
  ctx.save();ctx.translate(p.x,p.y+bob);ctx.rotate(tilt);
  // Rumpf
  ctx.fillStyle='#5a3f26';ctx.beginPath();
  ctx.moveTo(-9*s,0);ctx.quadraticCurveTo(-10*s,3.4*s,0,4.2*s);
  ctx.quadraticCurveTo(10*s,3.4*s,9*s,0);
  ctx.quadraticCurveTo(0,2*s,-9*s,0);ctx.closePath();ctx.fill();
  ctx.fillStyle='#73502f';ctx.beginPath();
  ctx.moveTo(-9*s,0);ctx.quadraticCurveTo(0,-1.4*s,9*s,0);ctx.quadraticCurveTo(0,1.6*s,-9*s,0);ctx.closePath();ctx.fill();
  // Innenraum/Bank
  ctx.strokeStyle='#3c2917';ctx.lineWidth=Math.max(1,0.8*s);ctx.beginPath();ctx.moveTo(-3*s,-0.4*s);ctx.lineTo(3*s,-0.4*s);ctx.stroke();
  // Angler
  const ay=-7*s;
  ctx.fillStyle='#c9b591';ctx.beginPath();ctx.moveTo(-1.8*s,-0.6*s);ctx.lineTo(1.8*s,-0.6*s);ctx.lineTo(1.2*s,ay+2.4*s);ctx.lineTo(-1.2*s,ay+2.4*s);ctx.closePath();ctx.fill();
  ctx.fillStyle='#caa07a';ctx.beginPath();ctx.arc(0,ay,1.9*s,0,7);ctx.fill();                       // Kopf
  ctx.fillStyle='#6b5236';ctx.beginPath();ctx.arc(0,ay-0.8*s,1.9*s,Math.PI,0);ctx.closePath();ctx.fill(); // Hut/Haar
  // Angelrute + Schnur
  ctx.strokeStyle='#7a5a34';ctx.lineWidth=Math.max(1,0.9*s);ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(1.4*s,ay+1*s);ctx.lineTo(8*s,ay-3.5*s);ctx.stroke();
  ctx.strokeStyle='rgba(230,235,235,.55)';ctx.lineWidth=Math.max(1,0.5*s);
  ctx.beginPath();ctx.moveTo(8*s,ay-3.5*s);ctx.lineTo(8.4*s,3*s);ctx.stroke();
  ctx.restore();
  ctx.lineCap='butt';
  if(moving){ ctx.fillStyle='rgba(255,255,255,.18)';                                                  // Bugwelle
    ctx.beginPath();ctx.ellipse(p.x-7*s,p.y+bob+2*s,2.4*s,1.1*s,0,0,7);ctx.fill(); }
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
// globaler Licht-/Atmosphäre-Overlay: warmes Sonnenlicht oben-links, kühler unten-rechts + Vignette
function drawAtmosphere(w,h){
  let g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0.00,'rgba(255,243,210,0.20)');   // warmes Licht
  g.addColorStop(0.50,'rgba(255,255,255,0.00)');
  g.addColorStop(1.00,'rgba(40,62,96,0.14)');      // kühler Schatten
  ctx.save(); ctx.globalCompositeOperation='soft-light'; ctx.fillStyle=g; ctx.fillRect(0,0,w,h); ctx.restore();
  const v=ctx.createRadialGradient(w*0.5,h*0.46,Math.min(w,h)*0.32, w*0.5,h*0.52,Math.max(w,h)*0.74);
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(18,22,30,0.24)');
  ctx.save(); ctx.fillStyle=v; ctx.fillRect(0,0,w,h); ctx.restore();
}
function render(){
  const r=cv.parentElement.getBoundingClientRect();
  setViewRect(r);                         // ein Rect/Frame -> onScreen liest den Cache
  ctx.clearRect(0,0,r.width,r.height);
  // Pass 1 — nur FLACHES Terrain (Gras, Feld, Wald-Boden, Straße, Wasser) in einem tiefen-sortierten Durchgang.
  // Erhöhtes Terrain (Hügel, Berge) und Bäume kommen in den Objekt-Pass, damit sie korrekt
  // VOR bzw. HINTER Gebäuden liegen statt pauschal überzeichnet zu werden.
  const ground=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ if(onScreen(x,y)) ground.push({d:x+y,x,y}); }
  ground.sort((a,b)=>a.d-b.d);
  for(const g of ground){ const c=grid[g.y][g.x], td=TERR[c.terr]||TERR.grass;
    if(c.terr==='water'){
      waterDiamond(g.x,g.y,1.04,'#3f7d9c');   // verschmolzene Fläche
      waterBlob(g.x,g.y,1.14,'#3f7d9c');       // weiche, leicht überfließende Küste
      const t=project(g.x,g.y),b=project(g.x+1,g.y+1); waterDeco({cx:(t.x+b.x)/2,cy:(t.y+b.y)/2});
      if(c.school) drawFishSchool((t.x+b.x)/2,(t.y+b.y)/2);
    } else if(c.terr==='mountain' || td.elev>0){ /* erhöht -> Pass 2 (tiefensortiert) */ }
    else drawGround(g.x,g.y);
  }
  // Schilf an den Ufern (nur an flachem Boden gezeichnet -> an allen Ufern sichtbar)
  for(const g of ground){ const c=grid[g.y][g.x], td=TERR[c.terr]||TERR.grass;
    if(c.type==='empty'&&c.terr!=='water'&&c.terr!=='mountain'&&!(td.elev>0)) shoreReeds(g.x,g.y); }
  // Bau-Vorschau über dem Boden
  for(const c of previewCells){ if(!onScreen(c.x,c.y))continue;
    const tile=grid[c.y][c.x], e=(TERR[tile.terr]||TERR.grass).elev;
    const free=(typeof tool!=='undefined'&&tool==='bridge')
      ? (tile.type==='empty'&&tile.terr==='water')      // Brücke: nur freies Wasser ist gültig
      : (tile.type==='empty'&&buildableTerr(tile));
    terrainBlock(c.x,c.y,e,free?'rgba(201,162,39,.6)':'rgba(192,83,58,.55)',
      'rgba(150,110,20,.5)','rgba(150,110,20,.5)',null);
  }
  // Pass 2 — Erhöhtes Terrain, Bäume, Gebäude, Träger & Tiere in EINEM tiefen-sortierten Durchgang
  const items=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ if(!onScreen(x,y))continue;
    const c=grid[y][x], td=TERR[c.terr]||TERR.grass;
    if(c.terr==='mountain')      items.push({d:x+y,k:'mtn',x,y});      // Bergform
    else if(td.elev>0)           items.push({d:x+y,k:'hill',x,y});     // erhöhter Geländeblock (Hügel)
    else if(c.terr==='water'&&(c.type==='road'||c.type==='roadblock')) items.push({d:x+y,k:'bridge',x,y}); // Brücke auf Wasser
    else if(td.trees&&c.type==='empty') items.push({d:x+y,k:'tree',x,y}); // Bäume auf flachem Waldboden
    else if(td.rocks&&c.type==='empty') items.push({d:x+y,k:'rock',x,y}); // Fels-/Marmorbrocken
    if(hasObject(x,y)){                                               // Gebäude (auch auf Hügeln: nach dem Hügel)
      if(c.anchor && !c.master){ /* Mehrfeld-Sklave: der Master zeichnet das ganze Bauwerk */ }
      else if(BUILD[c.type]&&BUILD[c.type].foot){ const f=BUILD[c.type].foot;
        items.push({d:(x+f[0]-1)+(y+f[1]-1)+0.02,k:'bld',x,y}); }     // große Spielstätte: Tiefe = vordere Ecke des Footprints
      else items.push({d:x+y,k:'bld',x,y});
    }
  }
  for(const w of walkers){const gx=w.x+(w.dx||0)*w.prog, gy=w.y+(w.dy||0)*w.prog;
    items.push({d:gx+gy+0.05,k:'walk',gx,gy,w});}
  if(typeof getUnits==='function'){                   // Militär-Kohorten tiefensortiert einreihen
    for(const u of getUnits()){ const ugx=u.x+(u.dx||0)*(u.prog||0), ugy=u.y+(u.dy||0)*(u.prog||0);
      items.push({d:ugx+ugy+0.06,k:'unit',u}); }
  }
  if(typeof getCritters==='function'){                 // Schafe tiefensortiert -> werden von Gebäuden verdeckt
    for(const s of getCritters()) items.push({d:s.gx+s.gy+0.04,k:'sheep',s});
  }
  items.sort((a,b)=>a.d-b.d);
  for(const o of items){
    if(o.k==='mtn')       drawMountain(o.x,o.y);
    else if(o.k==='hill') drawGround(o.x,o.y);
    else if(o.k==='bridge')drawBridgeAt(o.x,o.y);
    else if(o.k==='tree') drawTreesAt(o.x,o.y);
    else if(o.k==='rock') drawRocksAt(o.x,o.y);
    else if(o.k==='bld')  drawObjects(o.x,o.y);
    else if(o.k==='sheep')drawSheepOne(o.s);
    else if(o.k==='unit') drawUnit(o.u);
    else                  drawWalker(o.w,o.gx,o.gy);
  }
  if(typeof selectedTile!=='undefined'&&selectedTile&&onScreen(selectedTile.x,selectedTile.y))
    drawSelectionRing(selectedTile.x,selectedTile.y);
  if(typeof selectedUnit!=='undefined'&&selectedUnit&&typeof drawUnitRing==='function') drawUnitRing(selectedUnit);
  drawAllWildlife();
  drawWeather();
  drawAtmosphere(r.width,r.height);
  try{ drawFloaters(); }catch(e){}
  /* Ziele werden jetzt im Stadtbericht-Menü (📊) gezeigt, nicht mehr dauerhaft auf der Karte. */
}
// ---- Schwebende Feedback-Texte (+Denar) ----
function floatText(gx,gy,text,color){ floaters.push({gx,gy,text,color:color||'#ffd24a',age:0,ttl:1.3}); if(floaters.length>40)floaters.shift(); }
function updateFloaters(dt){ for(let i=floaters.length-1;i>=0;i--){ floaters[i].age+=dt; if(floaters[i].age>=floaters[i].ttl)floaters.splice(i,1); } }
function drawFloaters(){ if(!floaters.length)return; const s=cam.scale;
  ctx.save(); ctx.textAlign='center'; ctx.font='700 13px system-ui,-apple-system,sans-serif'; ctx.lineJoin='round';
  for(const f of floaters){ const p=project(f.gx+0.5,f.gy+0.5); const k=f.age/f.ttl;
    const y=p.y-16*s-k*30, a=k<0.65?1:1-(k-0.65)/0.35;
    ctx.globalAlpha=Math.max(0,a); ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.55)';
    ctx.strokeText(f.text,p.x,y); ctx.fillStyle=f.color; ctx.fillText(f.text,p.x,y); }
  ctx.restore();
}
// ---- Zieleübersicht (erreichte Ziele werden abgehakt und verschwinden) ----
const GOALS=[
  {id:'g1', t:'Erste Siedler: 8 Einwohner', f:()=>pop>=8,         p:()=>pop/8},
  {id:'g2', t:'Einen Markt errichten',       f:()=>anyType('market')},
  {id:'g3', t:'Nahrung: eine Bäckerei bauen', f:()=>anyType('bakery')},
  {id:'g4', t:'Wachsende Stadt: 30 Einwohner',f:()=>pop>=30,       p:()=>pop/30},
  {id:'g5', t:GOAL_POP+' Einwohner — Sieg!',  f:()=>pop>=GOAL_POP,  p:()=>pop/GOAL_POP},
];
const _goalAt={};
function anyType(tp){ for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)if(grid[y][x].type===tp)return true; return false; }
function _rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function drawGoals(){
  const now=animT, rows=[];
  for(const g of GOALS){ const done=g.f();
    if(done && _goalAt[g.id]===undefined){ _goalAt[g.id]=now; if(typeof flash==='function')flash('✓ Ziel erreicht: '+g.t); }
    if(!done) rows.push({g,done:false});
    else if(now-_goalAt[g.id]<2.6) rows.push({g,done:true});
  }
  const show=[]; for(const r of rows){ if(r.done||show.filter(s=>!s.done).length<3) show.push(r); }
  if(!show.length) return;
  const x=10, y0=52, w=206, rh=21, pad=9, h=pad+18+show.length*rh+2;
  ctx.save();
  ctx.fillStyle='rgba(18,22,18,.55)'; _rr(x,y0,w,h,9); ctx.fill();
  ctx.textAlign='left'; ctx.fillStyle='#d9d3c4'; ctx.font='700 11px system-ui,sans-serif';
  ctx.fillText('ZIELE', x+pad, y0+pad+8);
  let yy=y0+pad+26;
  for(const r of show){ const g=r.g;
    ctx.font='600 12px system-ui,sans-serif'; ctx.fillStyle=r.done?'#82d27c':'#ece8dc';
    ctx.fillText((r.done?'✓ ':'• ')+g.t, x+pad, yy);
    if(!r.done && g.p){ const pr=Math.max(0,Math.min(1,g.p()));
      ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fillRect(x+pad,yy+4,w-pad*2,3);
      ctx.fillStyle='#ffd24a'; ctx.fillRect(x+pad,yy+4,(w-pad*2)*pr,3); }
    yy+=rh;
  }
  ctx.restore();
}
// goldener, leicht pulsierender Ring um das ausgewählte Gebäude (Info-Panel)
function drawSelectionRing(x,y){
  const td=TERR[grid[y][x].terr]||TERR.grass, off=td.elev*STEP*cam.scale;
  const t=project(x,y),r=project(x+1,y),b=project(x+1,y+1),l=project(x,y+1);
  const pulse=0.6+0.4*Math.abs(Math.sin(animT*2.2));
  ctx.save(); ctx.translate(0,-off);
  ctx.strokeStyle='rgba(201,162,39,'+pulse.toFixed(3)+')';
  ctx.lineWidth=Math.max(2,2.6*cam.scale);
  ctx.shadowColor='rgba(201,162,39,.55)'; ctx.shadowBlur=9;
  ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(r.x,r.y);ctx.lineTo(b.x,b.y);ctx.lineTo(l.x,l.y);ctx.closePath();ctx.stroke();
  ctx.restore();
}
