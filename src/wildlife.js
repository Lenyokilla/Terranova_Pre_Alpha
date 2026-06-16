/* TERRA · wildlife.js (Erweitert um Enten, Fische & Schmetterlinge) */

// ---- Bestehende Arrays erweitern ----
// (Ergänze diese in deiner globalen Variablendeklaration, falls noch nicht geschehen)
// const ducks = [], fish = [], butterflies = [];
// let duckAnchor = null;

// ---- 1. ENTEN & SCHWÄNE (Wasserbewohner) ----

function randWater() {
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() * GRID) | 0, y = (Math.random() * GRID) | 0;
    if (grid[y][x].terr === 'water') return { x, y };
  }
  return null; // Kein Wasser auf der Map
}

function initDucks() {
  ducks.length = 0;
  const c = randWater();
  if (!c) return;

  duckAnchor = { x: c.x, y: c.y, tx: c.x, ty: c.y };
  const n = 3 + (Math.random() * 3 | 0); // Entenmutter + Küken
  
  for (let i = 0; i < n; i++) {
    ducks.push({
      gx: c.x, gy: c.y,
      // Enten schwimmen gerne hintereinander (Entenmarsch)
      offx: -i * 0.4 - (Math.random() * 0.2), 
      offy: (Math.random() - 0.5) * 0.3,
      sp: 0.10 + Math.random() * 0.05, // Etwas langsamer als Schafe
      isMother: i === 0
    });
  }
}

function updateDucks(dt) {
  if (!duckAnchor) return;
  const a = duckAnchor;
  const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);

  if (d < 0.4) {
    const w = randWater();
    if (w) { a.tx = w.x; a.ty = w.y; }
  } else {
    // Bewege Anker nur auf Wasser
    const nX = a.x + (dx / d) * 0.1 * dt;
    const nY = a.y + (dy / d) * 0.1 * dt;
    if (inBounds(Math.floor(nX), Math.floor(nY)) && grid[Math.floor(nY)][Math.floor(nX)].terr === 'water') {
      a.x = nX; a.y = nY;
    } else {
      const w = randWater(); if (w) { a.tx = w.x; a.ty = w.y; }
    }
  }

  for (const dck of ducks) {
    const px = a.x + dck.offx, py = a.y + dck.offy;
    const sdx = px - dck.gx, sdy = py - dck.gy, sd = Math.hypot(sdx, sdy);
    if (sd > 0.08) {
      dck.gx += (sdx / sd) * dck.sp * dt;
      dck.gy += (sdy / sd) * dck.sp * dt;
    }
  }
}

function drawDucks() {
  const sc = cam.scale;
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; // Heckwelle

  for (const dck of ducks) {
    const e = elevAt(dck.gx, dck.gy);
    const p = project(dck.gx + 0.5, dck.gy + 0.5);
    const lift = e * STEP * sc;
    const bob = Math.sin(animT * 2 + dck.gx) * 0.6 * sc; // Sanftes Schaukeln auf dem Wasser

    // Zeichne kleine V-Förmige Bugwelle dahinter
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(0.8, 1 * sc);
    ctx.beginPath();
    ctx.moveTo(p.x - 4 * sc, p.y - lift + bob + 2 * sc);
    ctx.lineTo(p.x - 8 * sc, p.y - lift + bob);
    ctx.moveTo(p.x - 4 * sc, p.y - lift + bob - 2 * sc);
    ctx.lineTo(p.x - 8 * sc, p.y - lift + bob);
    ctx.stroke();

    // Entenkörper (Weiß für Schwäne / Enten)
    ctx.fillStyle = dck.isMother ? '#ffffff' : '#ccaa77'; // Mutter weiß, Küken braun
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - lift - 1 * sc + bob, dck.isMother ? 3.2 * sc : 1.8 * sc, dck.isMother ? 2.2 * sc : 1.3 * sc, 0, 0, 7);
    ctx.fill();

    // Kopf
    ctx.beginPath();
    ctx.arc(p.x + (dck.isMother ? 2.5 : 1.5) * sc, p.y - lift - (dck.isMother ? 2.8 : 1.8) * sc + bob, dck.isMother ? 1.2 * sc : 0.8 * sc, 0, 7);
    ctx.fill();
  }
}


// ---- 2. FISCHSCHWÄRME (Wasser-Details) ----

function initFish() {
  fish.length = 0;
  // Wir erstellen 3 eigenständige kleine Schwärme auf der Karte
  for (let s = 0; s < 3; s++) {
    const c = randWater();
    if (!c) continue;
    const numInSwarm = 4 + (Math.random() * 4 | 0);
    const swarmId = Math.random() * 10;
    
    for (let i = 0; i < numInSwarm; i++) {
      fish.push({
        gx: c.x + (Math.random() - 0.5) * 0.8,
        gy: c.y + (Math.random() - 0.5) * 0.8,
        cx: c.x, cy: c.y, // Zentrum des Schwarms
        angle: Math.random() * Math.PI * 2,
        sp: 0.3 + Math.random() * 0.2,
        swarmId: swarmId
      });
    }
  }
}

function updateFish(dt) {
  for (const f of fish) {
    // Fische schwimmen im Kreis um ihr Zentrum (Schwarmverhalten simuliert)
    f.angle += f.sp * 0.5 * dt;
    const radius = 0.4 + Math.sin(animT + f.swarmId) * 0.15;
    
    f.gx = f.cx + Math.cos(f.angle) * radius;
    f.gy = f.cy + Math.sin(f.angle) * radius;
  }
}

function drawFish() {
  const sc = cam.scale;
  for (const f of fish) {
    const p = project(f.gx + 0.5, f.gy + 0.5);
    // Da sie unter Wasser sind, zeichnen wir sie leicht transparent und bläulich/silbern
    // Das Glitzern wird durch ein schnelles Sinus-Blinken erzeugt
    const flash = Math.sin(animT * 4 + f.angle) > 0.4 ? 0.7 : 0.2;
    
    ctx.fillStyle = `rgba(140, 210, 230, ${flash})`;
    ctx.beginPath();
    // Ein Fisch ist hier nur ein winziges, längliches Oval
    ctx.ellipse(p.x, p.y, 2 * sc, 0.8 * sc, f.angle + Math.PI/2, 0, 7);
    ctx.fill();
  }
}


// ---- 3. SCHMETTERLINGE (Boden-Gewusel) ----

function randMeadow() {
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() * GRID) | 0, y = (Math.random() * GRID) | 0;
    if (grid[y][x].terr === 'meadow' && grid[y][x].type === 'empty') return { x, y };
  }
  return null;
}

function initButterflies() {
  butterflies.length = 0;
  for (let i = 0; i < 12; i++) { // 12 Schmetterlinge auf der Map verteilen
    const m = randMeadow();
    if (!m) continue;
    butterflies.push({
      gx: m.x + 0.5, gy: m.y + 0.5,
      sx: m.x + 0.5, sy: m.y + 0.5, // Startpunkt zum Herumflattern
      color: ['#ff66cc', '#ffcc00', '#33ccff'][Math.random() * 3 | 0], // Pink, Gelb oder Blau
      seed: Math.random() * 100
    });
  }
}

function updateButterflies(dt) {
  for (const b of butterflies) {
    // Extrem chaotische Zick-Zack-Bewegung um ihren Ursprungspunkt herum
    const t = animT * 2 + b.seed;
    b.gx = b.sx + Math.sin(t * 1.7) * 0.4 + Math.cos(t * 0.7) * 0.2;
    b.gy = b.sy + Math.cos(t * 1.3) * 0.4 + Math.sin(t * 2.1) * 0.2;
  }
}

function drawButterflies() {
  const sc = cam.scale;
  for (const b of butterflies) {
    const e = elevAt(b.gx, b.gy);
    const p = project(b.gx, b.gy);
    // Sie fliegen ein kleines Stück über dem Boden (Bodenhöhe + konstanter Luft-Lift)
    const lift = (e * STEP + 6) * sc; 
    
    // Schnelles Flattern der Flügel simuliert über Breitenänderung
    const flap = Math.abs(Math.sin(animT * 18 + b.seed)) * 1.5 * sc;
    
    ctx.fillStyle = b.color;
    // Linker Flügel
    ctx.fillRect(p.x - flap, p.y - lift, flap, 1.5 * sc);
    // Rechter Flügel
    ctx.fillRect(p.x, p.y - lift, flap, 1.5 * sc);
  }
}

// ---- Globale Steuerungs-Schnittstellen (Ergänzung für dein Hauptskript) ----

function initAllWildlife() {
  initSheep();
  initBirds();
  initDucks();
  initFish();
  initButterflies();
}

function updateAllWildlife(dt) {
  updateHerds(dt);
  updateBirds(dt);
  updateDucks(dt);
  updateFish(dt);
  updateButterflies(dt);
}

function drawAllWildlife() {
  // 1. Fische (tiefste Ebene, da im Wasser)
  drawFish();
  
  // 2. Enten (auf dem Wasser)
  drawDucks();
  
  // 3. Schafe (am Boden)
  for(const s of sheep) drawSheep(s);
  
  // 4. Schmetterlinge (knapp über dem Boden)
  drawButterflies();
  
  // 5. Vögel (hoch am Himmel)
  drawBirds();
}
