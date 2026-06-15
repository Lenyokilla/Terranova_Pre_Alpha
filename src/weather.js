/* TERRA · weather.js */
// ---- Wetter (Wolken, Schatten, Regen) ----
function makeCloud(spread){return {
  gx: spread ? Math.random()*(GRID+8)-4 : -5-Math.random()*4,
  gy: Math.random()*(GRID+4)-2,
  r: 2.0+Math.random()*1.8,            // Radius in Gitterfeldern
  speed: 0.22+Math.random()*0.30,      // Felder pro Sekunde (Wind)
  drift: 0.12+Math.random()*0.12,
  raining: Math.random()<0.30,
  seed: Math.random()*1000,
  toggle: 5+Math.random()*9
};}
function initClouds(){clouds.length=0; const n=3+(Math.random()*2|0);
  for(let i=0;i<n;i++) clouds.push(makeCloud(true));}
function updateClouds(dt){
  for(const c of clouds){
    c.gx+=c.speed*dt; c.gy+=c.drift*dt;
    c.toggle-=dt; if(c.toggle<=0){c.raining=Math.random()<0.4; c.toggle=5+Math.random()*9;}
    if(c.gx>GRID+6 || c.gy>GRID+6){const n=makeCloud(false); Object.assign(c,n);}  // recyceln
  }
}
function puff(x,y,R){const lobes=[[0,0,1],[-0.62,0.12,0.68],[0.62,0.14,0.70],[-0.28,-0.26,0.58],[0.32,-0.22,0.6]];
  ctx.beginPath();
  for(const [dx,dy,s] of lobes){const cx=x+dx*R,cy=y+dy*R,rr=R*s; ctx.moveTo(cx+rr,cy); ctx.arc(cx,cy,rr,0,7);}
  ctx.fill();}
// Sichtbarkeit der Wolken: voll beim Rauszoomen, transparent/weg beim Reinzoomen
function cloudFade(){return Math.max(0,Math.min(1,(0.86-cam.scale)/(0.86-0.45)));}
function drawWeather(){
  const fade=cloudFade();
  // 1) Wolkenschatten auf dem Boden (wolkenförmig, weich, in Sonnenrichtung versetzt)
  if(fade>0.02) for(const c of clouds){const p=project(c.gx,c.gy);
    const R=c.r*TW*0.5*cam.scale;
    ctx.save();
    ctx.translate(p.x+14*cam.scale, p.y+9*cam.scale);   // Sonne oben-links -> Schatten unten-rechts
    ctx.scale(1,TH/TW);                                  // auf den Boden plattdrücken (iso)
    ctx.fillStyle='rgba(34,40,52,'+(0.10*fade).toFixed(3)+')'; puff(0,0,R*1.16);  // weicher Hof
    ctx.fillStyle='rgba(30,36,48,'+(0.16*fade).toFixed(3)+')'; puff(0,0,R*0.92);  // Kern
    ctx.restore();
  }
  // 2) Regen unter regnenden Wolken (immer sichtbar, leicht stärker beim Reinzoomen)
  for(const c of clouds){ if(!c.raining)continue;
    const p=project(c.gx,c.gy); const w=c.r*TW*0.5*cam.scale;
    const top=p.y-72*cam.scale, span=72*cam.scale+20*cam.scale;
    ctx.strokeStyle='rgba(150,185,220,'+(0.35+0.25*(1-fade)).toFixed(3)+')';ctx.lineWidth=1;
    const count=Math.max(6,Math.round(w/5));
    for(let i=0;i<count;i++){
      const fx=p.x - w + (i+0.5)/count*2*w + Math.sin(c.seed+i)*3*cam.scale;
      const y0=top + ((animT*260 + i*53 + c.seed*60) % span);
      ctx.beginPath();ctx.moveTo(fx,y0);ctx.lineTo(fx-3*cam.scale,y0+9*cam.scale);ctx.stroke();
    }
  }
  // 3) Wolkenkörper (Deckkraft folgt dem Zoom)
  if(fade>0.02){ const a=(0.78*fade).toFixed(3);
    for(const c of clouds){const p=project(c.gx,c.gy); const cy=p.y-80*cam.scale;
      const R=c.r*TW*0.5*cam.scale;
      ctx.fillStyle=c.raining?'rgba(206,210,219,'+a+')':'rgba(247,249,252,'+a+')';
      puff(p.x,cy,R);
    }
  }
}
