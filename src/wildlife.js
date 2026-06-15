/* TERRA · wildlife.js */
// ---- Tierwelt (Schafe & Vögel) ----
function elevAt(gx,gy){const x=Math.floor(gx),y=Math.floor(gy);
  const t=inBounds(x,y)?grid[y][x]:null; return t?(TERR[t.terr]||TERR.grass).elev:0;}
function randGrass(){for(let i=0;i<30;i++){const x=(Math.random()*GRID)|0,y=(Math.random()*GRID)|0;
  const t=grid[y][x]; if((t.terr==='grass'||t.terr==='meadow')&&t.type==='empty')return {x,y};}
  return {x:GRID>>1,y:GRID>>1};}
function initSheep(){sheep.length=0; const c=randGrass();
  herdAnchor={x:c.x,y:c.y,tx:c.x,ty:c.y};
  const n=5+(Math.random()*3|0);
  for(let i=0;i<n;i++) sheep.push({gx:c.x,gy:c.y,
    offx:(Math.random()-0.5)*1.6, offy:(Math.random()-0.5)*1.6,
    sp:0.22+Math.random()*0.16, bob:Math.random()*6, moving:false});
}
function updateHerds(dt){ if(!herdAnchor)return; const a=herdAnchor;
  const dx=a.tx-a.x, dy=a.ty-a.y, d=Math.hypot(dx,dy);
  if(d<0.3){const g=randGrass(); a.tx=g.x; a.ty=g.y;}
  else {a.x+=dx/d*0.18*dt; a.y+=dy/d*0.18*dt;}
  for(const s of sheep){const px=a.x+s.offx, py=a.y+s.offy;
    const sdx=px-s.gx, sdy=py-s.gy, sd=Math.hypot(sdx,sdy);
    s.moving=sd>0.12;
    if(s.moving){s.gx+=sdx/sd*s.sp*dt; s.gy+=sdy/sd*s.sp*dt;}
  }
}
function initBirds(){birds.length=0; const n=3+(Math.random()*3|0);
  const bx=-3-Math.random()*3, by=Math.random()*GRID;
  for(let i=0;i<n;i++) birds.push({gx:bx-i*0.5, gy:by+(Math.random()-0.5)*1.5,
    sp:0.7+Math.random()*0.4, drift:(Math.random()-0.5)*0.1,
    h:90+Math.random()*40, ph:Math.random()*6});
}
function updateBirds(dt){ for(const b of birds){b.gx+=b.sp*dt; b.gy+=b.drift*dt;
  if(b.gx>GRID+5){b.gx=-4-Math.random()*3; b.gy=Math.random()*GRID;}}
}
function drawSheep(s){const sc=cam.scale, e=elevAt(s.gx,s.gy);
  const p=project(s.gx+0.5,s.gy+0.5), lift=e*STEP*sc;
  const bob=Math.sin(animT*3+s.bob)*(s.moving?1.3:0.4)*sc;
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath();
  ctx.ellipse(p.x,p.y-lift,5*sc,2.4*sc,0,0,7); ctx.fill();
  ctx.fillStyle='#ece6da'; ctx.beginPath();                     // Körper
  ctx.ellipse(p.x,p.y-lift-3.2*sc+bob,4.6*sc,3.1*sc,0,0,7); ctx.fill();
  ctx.fillStyle='#3c3228'; ctx.beginPath();                     // Kopf
  ctx.arc(p.x+3.4*sc,p.y-lift-4.2*sc+bob,1.7*sc,0,7); ctx.fill();
}
function drawBirds(){ const sc=cam.scale;
  ctx.strokeStyle='rgba(35,30,26,.7)'; ctx.lineWidth=Math.max(1,1.4*sc);
  for(const b of birds){ const p=project(b.gx+0.5,b.gy+0.5); const y=p.y-(b.h)*sc;
    const flap=Math.sin(animT*9+b.ph)*3.2*sc, wing=6*sc;
    ctx.beginPath();
    ctx.moveTo(p.x-wing,y+flap); ctx.lineTo(p.x,y); ctx.lineTo(p.x+wing,y+flap);
    ctx.stroke();
  }
}
