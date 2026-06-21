/* TERRA · wildlife.js  — gekapselt, kollisionssicher */
(function () {
  'use strict';

  // Alle Tierwelt-Daten sind jetzt PRIVAT -> keine globale Kollision mehr moeglich
  let sheep = [], birds = [], herdAnchor = null;
  let ducks = [], duckAnchor = null;
  let fish = [];
  let butterflies = [];

  function isPassableForSheep(gx, gy) {
    const x = Math.floor(gx), y = Math.floor(gy);
    if (!inBounds(x, y)) return false;
    const t = grid[y][x];
    return (t.terr === 'grass' || t.terr === 'meadow') && t.type === 'empty';
  }
  function elevAt(gx, gy) {
    const x = Math.floor(gx), y = Math.floor(gy);
    const t = inBounds(x, y) ? grid[y][x] : null;
    return t ? (TERR[t.terr] || TERR.grass).elev : 0;
  }
  function randGrass() {
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() * GRID) | 0, y = (Math.random() * GRID) | 0;
      const t = grid[y][x];
      if ((t.terr === 'grass' || t.terr === 'meadow') && t.type === 'empty') return { x, y };
    }
    return { x: GRID >> 1, y: GRID >> 1 };
  }
  function randWater() {
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() * GRID) | 0, y = (Math.random() * GRID) | 0;
      if (grid[y][x] && grid[y][x].terr === 'water') return { x, y };
    }
    return null;
  }
  function randMeadow() {
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() * GRID) | 0, y = (Math.random() * GRID) | 0;
      if (grid[y][x] && grid[y][x].terr === 'meadow' && grid[y][x].type === 'empty') return { x, y };
    }
    return null;
  }

  function initSheep() {
    sheep.length = 0;
    const c = randGrass();
    herdAnchor = { x: c.x, y: c.y, tx: c.x, ty: c.y };
    const n = 5 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      sheep.push({ gx: c.x, gy: c.y, offx: (Math.random()-0.5)*1.6, offy: (Math.random()-0.5)*1.6,
        sp: 0.30 + Math.random()*0.18, bob: Math.random()*6, moving: false });
    }
  }
  // Ein Feld gilt als "besiedelt", wenn es kein leeres Naturfeld ist (Gebäude ODER Straße).
  function settledNear(gx, gy, r) {
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = x0+dx, y = y0+dy;
      if (!inBounds(x, y)) continue;
      const tp = grid[y][x].type;
      if (tp && tp !== 'empty') return true;
    }
    return false;
  }
  // Entfernte, unbesiedelte Weide suchen -> Herde wandert sichtbar & meidet bewohnte Gegenden.
  function farPasture() {
    for (let r = 4; r >= 2; r--) {
      for (let i = 0; i < 24; i++) {
        const x = (Math.random()*GRID)|0, y = (Math.random()*GRID)|0, t = grid[y][x];
        if ((t.terr === 'grass' || t.terr === 'meadow') && t.type === 'empty' && !settledNear(x, y, r))
          return { x, y };
      }
    }
    return randGrass();
  }
  // Abstoßungsvektor von besiedelten Feldern in der Nähe (1/r²-Gewichtung).
  function repel(gx, gy, r) {
    let rx = 0, ry = 0;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!dx && !dy) continue;
      const x = x0+dx, y = y0+dy;
      if (!inBounds(x, y)) continue;
      const tp = grid[y][x].type;
      if (tp && tp !== 'empty') { const dd = dx*dx + dy*dy; rx -= dx/dd; ry -= dy/dd; }
    }
    return { rx, ry };
  }
  function updateHerds(dt) {
    if (!herdAnchor) return;
    const a = herdAnchor;
    const rep = repel(a.x, a.y, 3);                       // von Bebauung wegdrücken
    const reached = Math.hypot(a.tx - a.x, a.ty - a.y) < 0.5;
    if (reached && !(rep.rx || rep.ry)) { const g = farPasture(); a.tx = g.x; a.ty = g.y; }
    let dx = (a.tx - a.x) + rep.rx*2.4, dy = (a.ty - a.y) + rep.ry*2.4;
    const d = Math.hypot(dx, dy) || 1;
    const stepX = (dx/d)*0.30*dt, stepY = (dy/d)*0.30*dt; // steter Grundlauf -> Zeitraffer klar sichtbar
    if (isPassableForSheep(a.x+stepX, a.y+stepY)) { a.x += stepX; a.y += stepY; }
    else { const g = farPasture(); a.tx = g.x; a.ty = g.y; }
    for (const s of sheep) {
      const px = a.x + s.offx, py = a.y + s.offy;
      const sdx = px - s.gx, sdy = py - s.gy, sd = Math.hypot(sdx, sdy);
      s.moving = sd > 0.10;
      if (s.moving) {
        const nextX = s.gx + (sdx/sd)*s.sp*dt, nextY = s.gy + (sdy/sd)*s.sp*dt;
        if (isPassableForSheep(nextX, nextY)) { s.gx = nextX; s.gy = nextY; }
        else { s.moving = false; }
      }
    }
  }
  function drawSheep(s) {
    const sc = cam.scale, e = elevAt(s.gx, s.gy);
    const p = project(s.gx+0.5, s.gy+0.5), lift = e*STEP*sc;
    let bob = s.moving ? (1-Math.cos(animT*2.2+s.bob))*0.8*sc : Math.sin(animT*0.8+s.bob)*0.15*sc;
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x,p.y-lift,5*sc,2.4*sc,0,0,7); ctx.fill();
    ctx.fillStyle='#ece6da'; ctx.beginPath(); ctx.ellipse(p.x,p.y-lift-3.2*sc+bob,4.6*sc,3.1*sc,0,0,7); ctx.fill();
    ctx.fillStyle='#3c3228'; ctx.beginPath(); ctx.arc(p.x+3.4*sc,p.y-lift-4.2*sc+bob,1.7*sc,0,7); ctx.fill();
  }

  function initBirds() {
    birds.length = 0;
    const n = 3 + (Math.random()*3|0);
    const bx = -3 - Math.random()*3, by = Math.random()*GRID;
    for (let i = 0; i < n; i++)
      birds.push({ gx: bx-i*0.5, gy: by+(Math.random()-0.5)*1.5, sp: 0.7+Math.random()*0.4,
        drift: (Math.random()-0.5)*0.1, h: 90+Math.random()*40, ph: Math.random()*6 });
  }
  function updateBirds(dt) {
    for (const b of birds) {
      b.gx += b.sp*dt; b.gy += b.drift*dt;
      if (b.gx > GRID+5) { b.gx = -4-Math.random()*3; b.gy = Math.random()*GRID; }
    }
  }
  function drawBirds() {
    const sc = cam.scale;
    ctx.strokeStyle='rgba(35,30,26,.7)'; ctx.lineWidth=Math.max(1,1.4*sc);
    for (const b of birds) {
      const p = project(b.gx+0.5, b.gy+0.5); const y = p.y-(b.h)*sc;
      const flap = Math.sin(animT*9+b.ph)*3.2*sc, wing = 6*sc;
      ctx.beginPath(); ctx.moveTo(p.x-wing,y+flap); ctx.lineTo(p.x,y); ctx.lineTo(p.x+wing,y+flap); ctx.stroke();
    }
  }

  function initDucks() {
    ducks.length = 0;
    const c = randWater(); if (!c) return;
    duckAnchor = { x: c.x, y: c.y, tx: c.x, ty: c.y };
    const n = 3 + (Math.random()*3|0);
    for (let i = 0; i < n; i++)
      ducks.push({ gx: c.x, gy: c.y, offx: -i*0.4-(Math.random()*0.2), offy: (Math.random()-0.5)*0.3,
        sp: 0.10+Math.random()*0.05, isMother: i === 0 });
  }
  function updateDucks(dt) {
    if (!duckAnchor) return;
    const a = duckAnchor; const dx = a.tx-a.x, dy = a.ty-a.y, d = Math.hypot(dx, dy);
    if (d < 0.4) { const w = randWater(); if (w) { a.tx = w.x; a.ty = w.y; } }
    else {
      const nX = a.x+(dx/d)*0.1*dt, nY = a.y+(dy/d)*0.1*dt;
      if (inBounds(Math.floor(nX),Math.floor(nY)) && grid[Math.floor(nY)][Math.floor(nX)].terr==='water') { a.x=nX; a.y=nY; }
      else { const w = randWater(); if (w) { a.tx = w.x; a.ty = w.y; } }
    }
    for (const dck of ducks) {
      const px = a.x+dck.offx, py = a.y+dck.offy;
      const sdx = px-dck.gx, sdy = py-dck.gy, sd = Math.hypot(sdx, sdy);
      if (sd > 0.08) { dck.gx += (sdx/sd)*dck.sp*dt; dck.gy += (sdy/sd)*dck.sp*dt; }
    }
  }
  function drawDucks() {
    if (!ducks.length) return;
    const sc = cam.scale;
    for (const dck of ducks) {
      const e = elevAt(dck.gx, dck.gy), p = project(dck.gx+0.5, dck.gy+0.5), lift = e*STEP*sc;
      const bob = Math.sin(animT*2+dck.gx)*0.6*sc;
      ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=Math.max(0.8,1*sc); ctx.beginPath();
      ctx.moveTo(p.x-4*sc,p.y-lift+bob+2*sc); ctx.lineTo(p.x-8*sc,p.y-lift+bob);
      ctx.moveTo(p.x-4*sc,p.y-lift+bob-2*sc); ctx.lineTo(p.x-8*sc,p.y-lift+bob); ctx.stroke();
      ctx.fillStyle = dck.isMother ? '#ffffff' : '#ccaa77'; ctx.beginPath();
      ctx.ellipse(p.x,p.y-lift-1*sc+bob, dck.isMother?3.2*sc:1.8*sc, dck.isMother?2.2*sc:1.3*sc,0,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x+(dck.isMother?2.5:1.5)*sc, p.y-lift-(dck.isMother?2.8:1.8)*sc+bob, dck.isMother?1.2*sc:0.8*sc,0,7); ctx.fill();
    }
  }

  function initFish() {
    fish.length = 0;
    for (let s = 0; s < 3; s++) {
      const c = randWater(); if (!c) continue;
      const numInSwarm = 4 + (Math.random()*4|0), swarmId = Math.random()*10;
      for (let i = 0; i < numInSwarm; i++)
        fish.push({ gx: c.x+(Math.random()-0.5)*0.8, gy: c.y+(Math.random()-0.5)*0.8,
          cx: c.x, cy: c.y, angle: Math.random()*Math.PI*2, sp: 0.3+Math.random()*0.2, swarmId });
    }
  }
  function updateFish(dt) {
    for (const f of fish) {
      f.angle += f.sp*0.5*dt;
      const radius = 0.4 + Math.sin(animT+f.swarmId)*0.15;
      f.gx = f.cx + Math.cos(f.angle)*radius; f.gy = f.cy + Math.sin(f.angle)*radius;
    }
  }
  function drawFish() {
    if (!fish.length) return;
    const sc = cam.scale;
    for (const f of fish) {
      const p = project(f.gx+0.5, f.gy+0.5);
      const flash = Math.sin(animT*4+f.angle) > 0.4 ? 0.7 : 0.2;
      ctx.fillStyle = `rgba(140, 210, 230, ${flash})`; ctx.beginPath();
      ctx.ellipse(p.x,p.y,2*sc,0.8*sc,f.angle+Math.PI/2,0,7); ctx.fill();
    }
  }

  function initButterflies() {
    butterflies.length = 0;
    for (let i = 0; i < 12; i++) {
      const m = randMeadow(); if (!m) continue;
      butterflies.push({ gx: m.x+0.5, gy: m.y+0.5, sx: m.x+0.5, sy: m.y+0.5,
        color: ['#ff66cc','#ffcc00','#33ccff'][Math.random()*3|0], seed: Math.random()*100 });
    }
  }
  function updateButterflies(dt) {
    for (const b of butterflies) {
      const t = animT*2 + b.seed;
      b.gx = b.sx + Math.sin(t*1.7)*0.4 + Math.cos(t*0.7)*0.2;
      b.gy = b.sy + Math.cos(t*1.3)*0.4 + Math.sin(t*2.1)*0.2;
    }
  }
  function drawButterflies() {
    if (!butterflies.length) return;
    const sc = cam.scale;
    for (const b of butterflies) {
      const e = elevAt(b.gx, b.gy), p = project(b.gx, b.gy), lift = (e*STEP+6)*sc;
      const flap = Math.abs(Math.sin(animT*18+b.seed))*1.5*sc;
      ctx.fillStyle = b.color;
      ctx.fillRect(p.x-flap, p.y-lift, flap, 1.5*sc);
      ctx.fillRect(p.x, p.y-lift, flap, 1.5*sc);
    }
  }

  function initAllWildlife() { initSheep(); initBirds(); initDucks(); initFish(); initButterflies(); }
  function updateAllWildlife(dt) { updateHerds(dt); updateBirds(dt); updateDucks(dt); updateFish(dt); updateButterflies(dt); }
  function drawAllWildlife() { drawFish(); drawDucks(); drawButterflies(); drawBirds(); }
  // Schafe NICHT hier zeichnen -> sie werden im tiefensortierten Objekt-Pass (render.js)
  // zusammen mit Gebäuden gezeichnet, damit sie korrekt verdeckt werden.

  // Nur diese Funktionen nach aussen geben:
  window.initAllWildlife   = initAllWildlife;
  window.updateAllWildlife = updateAllWildlife;
  window.drawAllWildlife   = drawAllWildlife;
  window.getCritters       = () => sheep;   // Live-Liste für die Tiefensortierung
  window.drawSheepOne      = drawSheep;     // ein Schaf zeichnen (von render.js aufgerufen)
})();
