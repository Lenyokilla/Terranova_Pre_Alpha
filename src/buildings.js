/* TERRA · buildings.js */

// ==========================================
// 1. GEBÄUDE LOGIK (Klassen & Datenmodell)
// ==========================================

class Building {
    constructor(id, x, y, type = 'residential') {
        this.id = id;
        this.x = x; // Gitter-Koordinate gx
        this.y = y; // Gitter-Koordinate gy
        this.type = type;
        
        // Die interne Logik-Stufe startet bei 1. 
        // Für die Zeichenfunktion (drawInsula) wird das später auf 0-3 gemappt.
        this.level = 1; 
        
        // Dynamische Status-Effekte für die grafischen Overlays
        this.statusEffects = {
            fireRisk: false,
            plagueRisk: false,
            waterShortage: false,
            unemployed: false
        };
        
        this.stats = this.initStats();
    }

    initStats() {
        const baseStats = {
            residential: {
                name: 'Insula',
                population: 10,
                maxPopulation: 10,
                taxRate: 5
            }
            // Weitere Gebäudetypen hier...
        };
        return baseStats[this.type] || baseStats['residential'];
    }

    // Erhöht das Level (maximal auf Stufe 4, was lvl 3 in drawInsula entspricht)
    upgrade() {
        if (this.level < 4) {
            this.level += 1;
            this.stats.maxPopulation = Math.floor(this.stats.maxPopulation * 1.5);
            this.stats.taxRate = Math.floor(this.stats.taxRate * 1.3);
            console.log(`${this.stats.name} auf Stufe ${this.level} verbessert.`);
        }
    }

    update(gameTime) {
        if (this.type === 'residential' && this.stats.population > 0) {
            return {
                goldGenerated: this.stats.taxRate * this.level
            };
        }
        return null;
    }

    // Schnittstelle zum Renderer
    draw(baseLift = 0) {
        if (this.type === 'residential') {
            const drawLevel = this.level - 1;
            return drawBuilding(this.x, this.y, 'house', drawLevel, baseLift, this.statusEffects);
        }
    }
}


// ==========================================
// 2. RENDERING HELFER & MATHE
// ==========================================

// ---- Gezeichnete Iso-Gebäude (Sonne oben-links) ----

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Wie isoCorners, aber für ein RECHTECKIGES Mehrfeld-Bauwerk (Footprint w×h ab Anker gx,gy).
// Liefert die vier äußeren Eckpunkte des Footprints (Boden N/E/S/W und um height angehobene *t-Punkte).
function footCorners(gx, gy, w, h, baseLift, height) {
  const bl = (baseLift || 0) * cam.scale, hh = height * cam.scale;
  const N = project(gx, gy), E = project(gx + w, gy), S = project(gx + w, gy + h), W = project(gx, gy + h);
  [N, E, S, W].forEach(p => p.y -= bl);
  const Nt = { x: N.x, y: N.y - hh }, Et = { x: E.x, y: E.y - hh }, St = { x: S.x, y: S.y - hh }, Wt = { x: W.x, y: W.y - hh };
  return { N, E, S, W, Nt, Et, St, Wt,
    cx: (Nt.x + St.x) / 2, cy: (Nt.y + St.y) / 2,
    bx: (N.x + E.x + S.x + W.x) / 4, by: (N.y + E.y + S.y + W.y) / 4 };
}

function isoCorners(gx, gy, baseLift, h) {
  const bl = (baseLift || 0) * cam.scale, hh = h * cam.scale;
  const N = project(gx, gy), E = project(gx + 1, gy), S = project(gx + 1, gy + 1), W = project(gx, gy + 1);
  [N, E, S, W].forEach(p => p.y -= bl);
  const Nt = { x: N.x, y: N.y - hh }, Et = { x: E.x, y: E.y - hh }, St = { x: S.x, y: S.y - hh }, Wt = { x: W.x, y: W.y - hh };
  return {
    N, E, S, W, Nt, Et, St, Wt,
    cx: (Nt.x + St.x) / 2, cy: (Nt.y + St.y) / 2,
    bx: (N.x + E.x + S.x + W.x) / 4, by: (N.y + E.y + S.y + W.y) / 4
  };
}

// Teilfläche auf einer Wand (Fenster/Tür/Säule), in u (entlang) / v (Höhe 0..1)
function wallPatch(Pb0, Pb1, Pt0, Pt1, u0, u1, v0, v1, col) {
  const b0 = lerp(Pb0, Pb1, u0), b1 = lerp(Pb0, Pb1, u1), t0 = lerp(Pt0, Pt1, u0), t1 = lerp(Pt0, Pt1, u1);
  const A = lerp(b0, t0, v0), B = lerp(b1, t1, v0), C = lerp(b1, t1, v1), D = lerp(b0, t0, v1);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.lineTo(D.x, D.y); ctx.closePath(); ctx.fill();
}

// gewellte Linie mit gleichmäßiger Wellenlänge (sanft, nicht zackig)
function wavyLine(a, b, amp, col) {
  const len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 5) return;
  const cycles = Math.max(1, Math.round(len / (14 * cam.scale)));
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, seg = Math.max(10, cycles * 6);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 0.9 * cam.scale); ctx.beginPath();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, w = Math.sin(t * Math.PI * 2 * cycles) * amp;
    const x = a.x + (b.x - a.x) * t + nx * w, y = a.y + (b.y - a.y) * t + ny * w;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

// Dachziegel nur angedeutet: wenige sanfte Wellenlinien parallel zur Traufe
function tileFace(P0, P1, apex, color) {
  const rows = 5, col = 'rgba(214,96,70,0.55)', amp = 0.9 * cam.scale;   // helles Ziegelrot statt fast schwarz
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    wavyLine(lerp(P0, apex, t), lerp(P1, apex, t), amp, col);
  }
}

function hipRoof(c, color, roofH, tiled) {
  const apex = { x: (c.Nt.x + c.Et.x + c.St.x + c.Wt.x) / 4, y: (c.Nt.y + c.Et.y + c.St.y + c.Wt.y) / 4 - roofH * cam.scale };
  const cl = shade(color, 0.10), cr = shade(color, -0.22), cb = shade(color, -0.36);
  ctx.fillStyle = cb; poly([c.Nt, c.Wt, apex]); poly([c.Nt, c.Et, apex]);   // hintere Flächen
  ctx.fillStyle = cl; poly([c.Wt, c.St, apex]);                           // SW (hell)
  ctx.fillStyle = cr; poly([c.St, c.Et, apex]);                           // SE (dunkel)
  if (tiled) { tileFace(c.Wt, c.St, apex, cl); tileFace(c.St, c.Et, apex, cr); }
  ctx.strokeStyle = 'rgba(30,20,12,.30)'; ctx.lineWidth = Math.max(1, 1.2 * cam.scale); // First/Grat
  ctx.beginPath(); ctx.moveTo(c.Wt.x, c.Wt.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(c.St.x, c.St.y); ctx.lineTo(c.Et.x, c.Et.y); ctx.stroke();
  return apex.y;
}

// Eine Tempelsäule (senkrechter Schaft mit Kapitell, Basis, Kanneluren)
function column(base, hpx) {
  const s = cam.scale, w = 4.6 * s, ch = hpx * s, x = base.x, topY = base.y - ch;
  ctx.fillStyle = '#efe7d2'; ctx.fillRect(x - w / 2, topY, w, ch);                     // Schaft
  ctx.fillStyle = 'rgba(110,98,74,.40)'; ctx.fillRect(x + w / 2 - 1.4 * s, topY, 1.4 * s, ch); // Schattenkante
  ctx.strokeStyle = 'rgba(150,135,100,.45)'; ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 1.4 * s, topY + 2 * s); ctx.lineTo(x + i * 1.4 * s, base.y - 2 * s); ctx.stroke(); }
  ctx.fillStyle = '#f4eddb';
  ctx.fillRect(x - w / 2 - 1.4 * s, topY - 2.6 * s, w + 2.8 * s, 2.6 * s);                         // Kapitell
  ctx.fillRect(x - w / 2 - 1.4 * s, base.y - 1.8 * s, w + 2.8 * s, 1.8 * s);                       // Basis
}

function canopyRoof(c, color, roofH) {            // flaches überstehendes Vordach (Markt)
  const k = roofH * cam.scale, f = 1.28, cc = { x: (c.Nt.x + c.Et.x + c.St.x + c.Wt.x) / 4, y: (c.Nt.y + c.Et.y + c.St.y + c.Wt.y) / 4 };
  const R = p => ({ x: cc.x + (p.x - cc.x) * f, y: cc.y + (p.y - cc.y) * f - k });
  const N = R(c.Nt), E = R(c.Et), S = R(c.St), W = R(c.Wt);
  ctx.strokeStyle = 'rgba(70,48,26,.85)'; ctx.lineWidth = Math.max(1, 1.6 * cam.scale);
  for (const [a, b] of [[c.Wt, W], [c.St, S], [c.Et, E]]) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.fillStyle = color; poly([N, E, S, W]);
  ctx.strokeStyle = 'rgba(255,250,240,.45)'; ctx.lineWidth = 1;
  for (let t = 0.25; t < 1; t += 0.25) { const a = lerp(W, N, t), b = lerp(S, E, t); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  return N.y;
}

// Farbmischung zweier Hex-Farben
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16 & 255) + ((pb >> 16 & 255) - (pa >> 16 & 255)) * t);
  const g = Math.round((pa >> 8 & 255) + ((pb >> 8 & 255) - (pa >> 8 & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

function wallBrickLines(bl, br, tl, tr, count, color, s) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, 0.9 * s);
  for (let i = 1; i <= count; i++) { const v = i / (count + 1);
    const a = lerp(bl, tl, v), b = lerp(br, tr, v);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
}

function wallArch(bl, br, tl, tr, u0, u1, v0, v1, darkCol, archCol, s) {
  const P = (u, v) => { const b = lerp(bl, br, u), t = lerp(tl, tr, u); return lerp(b, t, v); };
  const vs = v0 + (v1 - v0) * 0.55;   // Kämpferlinie: bis hier senkrechte Laibung, darüber Rundbogen
  const N = 18;
  // Punkt auf der Bogenkurve (Rundung zwischen vs und v1)
  const arcPt = tt => { const u = u0 + (u1 - u0) * tt, v = vs + (v1 - vs) * Math.sin(tt * Math.PI); return P(u, v); };

  // 1) Dunkle Öffnung: senkrechte Laibung (v0..vs) + Rundbogen (vs..v1), KEINE Ziegel an den Seiten
  ctx.fillStyle = darkCol;
  ctx.beginPath();
  let p = P(u0, v0); ctx.moveTo(p.x, p.y);
  p = P(u1, v0); ctx.lineTo(p.x, p.y);
  p = P(u1, vs); ctx.lineTo(p.x, p.y);
  for (let i = 1; i <= N; i++) { p = arcPt(1 - i / N); ctx.lineTo(p.x, p.y); }   // Bogen von rechts nach links
  p = P(u0, vs); ctx.lineTo(p.x, p.y);
  ctx.closePath(); ctx.fill();

  // 2) Gleichmäßig breites Ziegelband (Archivolte) NUR über dem Rundbogen
  const bw = Math.max(2.4, 3 * s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  ctx.strokeStyle = archCol; ctx.lineWidth = bw;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { p = arcPt(i / N); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  ctx.stroke();
  // dünne dunkle Fuge an der Bogenunterkante
  ctx.strokeStyle = shade(archCol, -0.40); ctx.lineWidth = Math.max(1, 0.8 * s);
  ctx.stroke();
  // 3) radiale Ziegelfugen (Keilsteine) quer durch das Band
  ctx.strokeStyle = shade(archCol, -0.30); ctx.lineWidth = Math.max(1, 0.7 * s);
  for (let i = 1; i < N; i += 2) {
    const a = arcPt((i - 0.6) / N), b = arcPt((i + 0.6) / N);
    let nx = -(b.y - a.y), ny = (b.x - a.x); const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
    const c = arcPt(i / N);
    ctx.beginPath(); ctx.moveTo(c.x - nx * bw * 0.5, c.y - ny * bw * 0.5); ctx.lineTo(c.x + nx * bw * 0.5, c.y + ny * bw * 0.5); ctx.stroke();
  }
}


// ==========================================
// 3. GEBÄUDE RENDERING (Die eigentlichen Modelle)
// ==========================================

// kleiner Erntehelfer mit schwingender Sichel
function drawHarvester(x, y, s, seed) {
  ctx.fillStyle = 'rgba(28,38,18,.18)'; ctx.beginPath(); ctx.ellipse(x + 1.5 * s, y + 1 * s, 4 * s, 1.8 * s, 0, 0, 7); ctx.fill();
  const swing = Math.sin(animT * 3 + seed) * 0.9;
  ctx.fillStyle = '#9c8048'; ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 2.4 * s, 4 * s, 0, 0, 7); ctx.fill();  // Tunika
  ctx.fillStyle = '#caa06a'; ctx.beginPath(); ctx.arc(x, y - 9 * s, 1.9 * s, 0, 7); ctx.fill();                 // Kopf
  ctx.strokeStyle = '#6e4a2a'; ctx.lineWidth = Math.max(1, 1.1 * s); ctx.lineCap = 'round';                     // Sichelstiel
  const hx = x + Math.cos(swing) * 6 * s, hy = y - 5 * s + Math.sin(swing) * 4 * s;
  ctx.beginPath(); ctx.moveTo(x, y - 5 * s); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = '#c9c4ba'; ctx.beginPath(); ctx.arc(hx, hy, 3 * s, swing - 0.4, swing + 1.4); ctx.stroke();  // Klinge
  ctx.lineCap = 'butt';
}

function drawGrainfield(gx, gy, baseLift) {
  const s = cam.scale;
  const c = isoCorners(gx, gy, baseLift, 0);
  const I = p => ({ x: c.bx + (p.x - c.bx) * 0.94, y: c.by + (p.y - c.by) * 0.94 });
  // Saison-Phase 0..1 (synchron über tickCount)
  const SL = (typeof SEASON_LEN !== 'undefined') ? SEASON_LEN : 80;
  const tc = (typeof tickCount !== 'undefined') ? tickCount : 64;
  const ph = ((tc % SL) + SL) % SL / SL;
  let stage, g = 1, hp = 0;                                  // stage, Wachstum 0..1, Erntefortschritt
  if (ph < 0.10) stage = 'sow';
  else if (ph < 0.82) { stage = 'grow'; g = (ph - 0.10) / 0.72; }
  else if (ph < 0.88) stage = 'ripe';
  else { stage = 'harvest'; hp = (ph - 0.88) / 0.12; }

  // Ackererde + Furchen
  ctx.fillStyle = '#7c5a32'; poly([I(c.N), I(c.E), I(c.S), I(c.W)]);
  ctx.strokeStyle = 'rgba(60,42,20,.5)'; ctx.lineWidth = 1;
  for (let t = 0.2; t < 1; t += 0.2) { const a = lerp(I(c.W), I(c.N), t), b = lerp(I(c.S), I(c.E), t); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

  const N = 20;
  for (let i = 0; i < N; i++) {
    const u = rng2(gx * 7 + i, gy * 3), v = rng2(gx * 3, gy * 7 + i);
    const p = lerp(lerp(I(c.W), I(c.N), u), lerp(I(c.S), I(c.E), u), v);
    const sway = Math.sin(animT * 1.6 + i) * 1.4 * s;
    if (stage === 'sow') {                                  // frisch gesät: Saatkörner
      ctx.fillStyle = '#caa06a'; ctx.beginPath(); ctx.arc(p.x, p.y - 0.5 * s, 0.9 * s, 0, 7); ctx.fill();
      continue;
    }
    const cut = stage === 'harvest' && (i / N) < hp;        // bereits abgeerntet?
    if (cut) {                                              // Stoppeln
      ctx.strokeStyle = '#b9962f'; ctx.lineWidth = Math.max(1, 1 * s);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 2 * s); ctx.stroke();
      continue;
    }
    const ripe = (stage === 'ripe' || stage === 'harvest');
    const gg = ripe ? 1 : g;
    const hgt = (2 + gg * 9) * s;
    const cf = ripe ? 1 : Math.max(0, (gg - 0.5) / 0.5);    // erst ab halber Reife vergolden
    const col = mixHex('#5aa83f', '#caa53e', cf);           // kräftiges Grün -> Gold
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 1.1 * s);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sway, p.y - hgt); ctx.stroke();
    if (gg > 0.72) {                                        // Ähre erst spät
      ctx.fillStyle = '#e6c75a';
      ctx.beginPath(); ctx.ellipse(p.x + sway, p.y - hgt, 1.5 * s, 2.6 * s, 0, 0, 7); ctx.fill();
    }
  }
  if (stage === 'harvest') {                                // Arbeiter auf dem Feld
    const a = lerp(lerp(I(c.W), I(c.N), 0.35), lerp(I(c.S), I(c.E), 0.35), 0.5);
    const b = lerp(lerp(I(c.W), I(c.N), 0.7), lerp(I(c.S), I(c.E), 0.7), 0.6);
    drawHarvester(a.x, a.y, s, gx + gy);
    drawHarvester(b.x, b.y, s, gx * 2 + gy + 3);
  }
  return { cx: c.cx, topY: c.N.y - 8 * s };
}

// Römisches Mietshaus (Insula): hoher Putzbau, Fensterreihen je Stockwerk, flaches Terrakottadach
function drawInsula(gx, gy, lvl, baseLift) {
  const s = cam.scale;
  const L = Math.max(0, Math.min(3, lvl | 0));
  const floors  = [1, 2, 3, 4][L];
  const h       = [15, 26, 37, 46][L];
  const wallCol = ['#b58a5c', '#cbae84', '#dccaa6', '#e6d8b8'][L];
  const roofCol = '#b15f3a';
  const c = isoCorners(gx, gy, baseLift, h);

  // weicher Schlagschatten
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();

  // Putzwände mit Verlauf (Licht oben-links)
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wallCol, 0.06)); gSW.addColorStop(1, shade(wallCol, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wallCol, -0.20)); gSE.addColorStop(1, shade(wallCol, -0.36));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);

  // Putzstruktur (dezentes Noise)
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 12; i++) ctx.fillRect(c.bx + (Math.random() - 0.5) * 30 * s, c.by - Math.random() * h * s, 1.1 * s, 1.1 * s);
  ctx.restore();

  // Römische Ziegel-Ausgleichsschichten (Bänder) quer über den Putz
  wallBrickLines(c.W, c.S, c.Wt, c.St, floors * 2, 'rgba(132, 66, 44, 0.32)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, floors * 2, 'rgba(96, 46, 30, 0.40)', s);

  // Roter Sockelanstrich auf Straßenniveau (nur größere Häuser) — bis ~Hälfte des Erdgeschosses
  if (floors >= 2) {
    const dadoTop = 0.5 / floors;                                   // halbe Höhe des Erdgeschosses
    const dadoSW = shade('#a23a2c', 0.04), dadoSE = shade('#a23a2c', -0.18);
    wallPatch(c.W, c.S, c.Wt, c.St, 0, 1, 0, dadoTop, dadoSW);      // SW-Wand (beschienen)
    wallPatch(c.S, c.E, c.St, c.Et, 0, 1, 0, dadoTop, dadoSE);      // SE-Wand (im Schatten)
    // Abschlusskante des Anstrichs (Trennfuge zum Putz darüber)
    const eW = lerp(c.W, c.Wt, dadoTop), eS = lerp(c.S, c.St, dadoTop), eE = lerp(c.E, c.Et, dadoTop);
    ctx.strokeStyle = 'rgba(60,20,12,.45)'; ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath(); ctx.moveTo(eW.x, eW.y); ctx.lineTo(eS.x, eS.y); ctx.lineTo(eE.x, eE.y); ctx.stroke();
  }

  // Fensterreihen je Stockwerk (+ Torbögen im Erdgeschoss)
  const winSW = '#2c2620', winSE = '#221d18';
  const archDarkSW = '#241a12', archBrickSW = '#9a4e35';   // Bogen SW (hell beschienen)
  const archDarkSE = '#1c140d', archBrickSE = '#763a25';   // Bogen SE (im Schatten)
  for (let f = 0; f < floors; f++) {
    const b0 = f / floors, bh = 1 / floors, v0 = b0 + 0.20 * bh, v1 = b0 + 0.70 * bh;
    if (f === 0) {                                    // Erdgeschoss: römische Laden-Torbögen (Fornices)
      const av0 = b0 + 0.02 * bh, av1 = b0 + 0.82 * bh;
      if (floors === 1) {                             // kleines Haus: ein zentraler Torbogen pro Wand
        wallArch(c.W, c.S, c.Wt, c.St, 0.34, 0.66, av0, av1, archDarkSW, archBrickSW, s);
        wallArch(c.S, c.E, c.St, c.Et, 0.34, 0.66, av0, av1, archDarkSE, archBrickSE, s);
      } else {                                        // Mietshaus: zwei Ladenbögen pro Sichtwand
        wallArch(c.W, c.S, c.Wt, c.St, 0.18, 0.44, av0, av1, archDarkSW, archBrickSW, s);
        wallArch(c.W, c.S, c.Wt, c.St, 0.56, 0.82, av0, av1, archDarkSW, archBrickSW, s);
        wallArch(c.S, c.E, c.St, c.Et, 0.18, 0.44, av0, av1, archDarkSE, archBrickSE, s);
        wallArch(c.S, c.E, c.St, c.Et, 0.56, 0.82, av0, av1, archDarkSE, archBrickSE, s);
      }
    } else {                                          // Obergeschosse: rechteckige Fensterreihen
      wallPatch(c.W, c.S, c.Wt, c.St, 0.16, 0.34, v0, v1, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.46, 0.64, v0, v1, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.74, 0.90, v0, v1, winSW);
      wallPatch(c.S, c.E, c.St, c.Et, 0.18, 0.36, v0, v1, winSE);
      wallPatch(c.S, c.E, c.St, c.Et, 0.50, 0.68, v0, v1, winSE);
      wallPatch(c.S, c.E, c.St, c.Et, 0.78, 0.92, v0, v1, winSE);
      const swA = lerp(c.W, c.Wt, b0), swB = lerp(c.S, c.St, b0), seB = lerp(c.E, c.Et, b0);
      ctx.strokeStyle = 'rgba(40,28,14,.16)'; ctx.lineWidth = Math.max(1, 1 * s);   // Geschoss-Gesims
      ctx.beginPath(); ctx.moveTo(swA.x, swA.y); ctx.lineTo(swB.x, swB.y); ctx.lineTo(seB.x, seB.y); ctx.stroke();
    }
  }
  // senkrechte Eckkante (Tiefe)
  ctx.strokeStyle = 'rgba(40,25,10,.22)'; ctx.lineWidth = 1.4 * s;
  ctx.beginPath(); ctx.moveTo(c.S.x, c.S.y); ctx.lineTo(c.St.x, c.St.y); ctx.stroke();
  // Kranzgesims oben
  ctx.strokeStyle = 'rgba(30,20,12,.30)'; ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.beginPath(); ctx.moveTo(c.Wt.x, c.Wt.y); ctx.lineTo(c.St.x, c.St.y); ctx.lineTo(c.Et.x, c.Et.y); ctx.stroke();

  // FLACHES Terrakottadach (geringe Aufkantung) — kein Spitzdach, keine Wellenlinien
  const r = isoCorners(gx, gy, baseLift, h + 4);
  ctx.fillStyle = shade(roofCol, -0.18); poly([c.Wt, c.St, r.St, r.Wt]);   // Aufkantung SW
  ctx.fillStyle = shade(roofCol, -0.32); poly([c.St, c.Et, r.Et, r.St]);   // Aufkantung SE

  if (floors >= 2) {
    // Dach als Rahmen mit offenem Atrium (Innenhof) in der Mitte
    const k = 0.42, ctr = { x: r.cx, y: r.cy };
    const ins = p => ({ x: p.x + (ctr.x - p.x) * k, y: p.y + (ctr.y - p.y) * k });
    const iN = ins(r.Nt), iE = ins(r.Et), iS = ins(r.St), iW = ins(r.Wt);

    // 1) Schacht NUR innerhalb der Öffnung zeichnen (Clip) -> kann nie aus der Wand ragen
    ctx.save();
    ctx.beginPath(); ctx.moveTo(iN.x, iN.y); ctx.lineTo(iE.x, iE.y); ctx.lineTo(iS.x, iS.y); ctx.lineTo(iW.x, iW.y); ctx.closePath();
    ctx.clip();
    const drop = 11 * s;
    const fN = { x: iN.x, y: iN.y + drop }, fE = { x: iE.x, y: iE.y + drop };
    const fS = { x: iS.x, y: iS.y + drop }, fW = { x: iW.x, y: iW.y + drop };
    // dunkler Grund-Schatten des Schachts (füllt die ganze Öffnung)
    ctx.fillStyle = shade(wallCol, -0.58); poly([iN, iE, iS, iW]);
    // sichtbare hintere Innenwände (in den Schacht hinein, beschattet)
    ctx.fillStyle = shade(wallCol, -0.34); poly([iN, iE, fE, fN]);   // NE-Innenwand
    ctx.fillStyle = shade(wallCol, -0.48); poly([iN, iW, fW, fN]);   // NW-Innenwand
    // Hofboden (Stein) am Grund des Schachts
    ctx.fillStyle = shade('#cabfa4', -0.06); poly([fN, fE, fS, fW]);
    // Impluvium (Wasserbecken) mittig auf dem Hofboden
    const c2 = { x: (fN.x + fS.x) / 2, y: (fN.y + fS.y) / 2 }, bs = 0.5;
    const bi = p => ({ x: c2.x + (p.x - c2.x) * bs, y: c2.y + (p.y - c2.y) * bs });
    ctx.fillStyle = '#8f9d86'; poly([bi(fN), bi(fE), bi(fS), bi(fW)]);           // Beckenrand
    const bs2 = 0.32, bi2 = p => ({ x: c2.x + (p.x - c2.x) * bs2, y: c2.y + (p.y - c2.y) * bs2 });
    ctx.fillStyle = '#3a708c'; poly([bi2(fN), bi2(fE), bi2(fS), bi2(fW)]);       // Wasser
    ctx.fillStyle = 'rgba(255,255,255,.16)';                                    // Lichtreflex
    ctx.beginPath(); ctx.ellipse(c2.x, c2.y - 1 * s, 2.4 * s, 1.1 * s, 0, 0, 7); ctx.fill();
    ctx.restore();

    // 2) DANN den Dachrahmen darüber (4 Trapeze) -> verdeckt die vordere Schachtkante
    ctx.fillStyle = roofCol;
    poly([r.Nt, r.Et, iE, iN]); poly([r.Et, r.St, iS, iE]); poly([r.St, r.Wt, iW, iS]); poly([r.Wt, r.Nt, iN, iW]);
    ctx.strokeStyle = shade(roofCol, -0.18); ctx.lineWidth = Math.max(1, 0.8 * s);   // dezente Ziegelreihe
    for (const [A, B] of [[r.Nt, r.Et], [r.Et, r.St], [r.St, r.Wt], [r.Wt, r.Nt]]) {
      const a = lerp(A, ins(A), 0.5), b = lerp(B, ins(B), 0.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // Schattenfuge an der Atrium-Oberkante (innere Dachkante)
    ctx.strokeStyle = 'rgba(15,10,6,.45)'; ctx.lineWidth = Math.max(1, 1.1 * s);
    ctx.beginPath(); ctx.moveTo(iW.x, iW.y); ctx.lineTo(iN.x, iN.y); ctx.lineTo(iE.x, iE.y); ctx.stroke();
  } else {
    ctx.fillStyle = roofCol; poly([r.Nt, r.Et, r.St, r.Wt]);                 // kleines Haus: volle Dachfläche
    ctx.strokeStyle = shade(roofCol, -0.18); ctx.lineWidth = Math.max(1, 0.8 * s);
    for (let t = 0.25; t < 1; t += 0.25) { const a = lerp(r.Wt, r.Nt, t), b = lerp(r.St, r.Et, t); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
  ctx.strokeStyle = 'rgba(30,20,12,.25)'; ctx.lineWidth = 1;                  // Dach-Außenkante
  ctx.beginPath(); ctx.moveTo(r.Nt.x, r.Nt.y); ctx.lineTo(r.Et.x, r.Et.y); ctx.lineTo(r.St.x, r.St.y); ctx.lineTo(r.Wt.x, r.Wt.y); ctx.closePath(); ctx.stroke();

  return { cx: c.cx, topY: r.Nt.y };
}

// ==== HAUPT-RENDERING FUNKTION (mit Status-Effekten für Häuser) ====
function drawBuilding(gx, gy, kind, lvl, baseLift, statusEffects) {
  if (kind === 'house') return drawInsula(gx, gy, lvl, baseLift);
  if (kind === 'forum') return drawForum(gx, gy, baseLift);
  if (kind === 'claypit') return drawClaypit(gx, gy, baseLift);
  if (kind === 'pottery') return drawPottery(gx, gy, baseLift);
  if (kind === 'well') return drawWell(gx, gy, baseLift);
  if (kind === 'market') return drawMarket(gx, gy, baseLift);
  if (kind === 'firehouse') return drawFirehouse(gx, gy, baseLift);
  if (kind === 'engineer') return drawEngineer(gx, gy, baseLift);
  if (kind === 'grainfield') return drawGrainfield(gx, gy, baseLift);
  if (kind === 'farm') return drawFarm(gx, gy, baseLift);
  if (kind === 'mill') return drawMill(gx, gy, baseLift);
  if (kind === 'bakery') return drawBakery(gx, gy, baseLift);
  if (kind === 'fisher') return drawFisher(gx, gy, baseLift);
  if (kind === 'woodcutter') return drawWoodcutter(gx, gy, baseLift);
  if (kind === 'quarry') return drawQuarry(gx, gy, baseLift, false);
  if (kind === 'marblequarry') return drawQuarry(gx, gy, baseLift, true);
  if (kind === 'warehouse') return drawWarehouse(gx, gy, baseLift);
  if (kind === 'roadblock') return drawRoadblock(gx, gy, baseLift);
  if (kind && kind.indexOf('temple_') === 0) return drawTemple(gx, gy, baseLift, kind);
  if (kind && typeof HEALTH !== 'undefined' && HEALTH[kind]) return drawHealth(gx, gy, baseLift, kind);
  if (kind && typeof EDUCATION !== 'undefined' && EDUCATION[kind]) return drawEducation(gx, gy, baseLift, kind);
  
  statusEffects = statusEffects || { fireRisk: false, plagueRisk: false, waterShortage: false, unemployed: false };
  const s = cam.scale;
  let wallColor, roofColor, h, roofH, tiled = true, windows = false;

  // Farbpaletten & Dimensionen für die Evolution
  if (kind === 'house') {
    if (lvl === 0) { wallColor = '#b5915f'; roofColor = '#6f5535'; h = 10; roofH = 7; tiled = false; }
    else if (lvl === 1) { wallColor = '#d7c69b'; roofColor = '#b1542d'; h = 16; roofH = 11; windows = true; }
    else if (lvl === 2) { wallColor = '#c9a380'; roofColor = '#a8482a'; h = 26; roofH = 14; windows = true; }
    else { wallColor = '#b54134'; roofColor = '#bd4022'; h = 34; roofH = 16; windows = true; }
  } else {
    wallColor = '#c9b48a'; roofColor = '#cf6a3c'; h = 10; roofH = 7; // Markt-Fallback
  }

  if (statusEffects.plagueRisk) wallColor = shade(wallColor, -0.18);
  const c = isoCorners(gx, gy, baseLift, h);

  // --- TRICK 1: ATMOSPHÄRISCHER SOFT-SCHATTEN (Canvas Filter) ---
  ctx.save();
  ctx.shadowColor = 'rgba(25, 15, 5, 0.25)';
  ctx.shadowBlur = 8 * s;
  ctx.shadowOffsetX = 12 * s;
  ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; // Unsichtbarer Körper wirft echten Weichzeichner-Schatten
  poly([c.W, c.S, c.E, c.N]);
  ctx.restore();

  // --- TRICK 2: GRADIENTEN STATT FLAT COLORS (Licht von oben-links) ---
  const gradSW = ctx.createLinearGradient(c.W.x, c.Wt.y, c.S.x, c.S.y);
  gradSW.addColorStop(0, shade(wallColor, 0.05));
  gradSW.addColorStop(1, shade(wallColor, -0.12));
  ctx.fillStyle = gradSW; poly([c.W, c.S, c.St, c.Wt]);

  const gradSE = ctx.createLinearGradient(c.S.x, c.St.y, c.E.x, c.E.y);
  gradSE.addColorStop(0, shade(wallColor, -0.22));
  gradSE.addColorStop(1, shade(wallColor, -0.38));
  ctx.fillStyle = gradSE; poly([c.S, c.E, c.Et, c.St]);

  // --- TRICK 3: PROZEDURALE TEXTUR (Noise Overlay) ---
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 15; i++) {
    ctx.fillRect(c.bx + (Math.random()-0.5)*30*s, c.by - (Math.random())*h*s, 1.2*s, 1.2*s);
  }
  ctx.restore();

  // --- TRICK 4: TIEFE DURCH AMBIENT OCCLUSION (Eckenschattierung) ---
  ctx.strokeStyle = 'rgba(40, 25, 10, 0.25)';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath(); ctx.moveTo(c.S.x, c.S.y); ctx.lineTo(c.St.x, c.St.y); ctx.stroke(); // Vertikale Mittelkante

  // Fenster mit leuchtenden Fensterbänken (3D-Effekt)
  if (windows) {
    const drawTier = (vBot, vTop) => {
      wallPatch(c.W, c.S, c.Wt, c.St, 0.22, 0.42, vBot, vTop, '#1e2530');
      wallPatch(c.W, c.S, c.Wt, c.St, 0.58, 0.78, vBot, vTop, '#1e2530');
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lerp(c.W,c.S,0.22).x, lerp(c.W,c.St,vBot).y); ctx.lineTo(lerp(c.W,c.S,0.42).x, lerp(c.W,c.St,vBot).y); ctx.stroke();

      wallPatch(c.S, c.E, c.St, c.Et, 0.22, 0.42, vBot, vTop, '#141a21');
      wallPatch(c.S, c.E, c.St, c.Et, 0.58, 0.78, vBot, vTop, '#141a21');
    };

    drawTier(0.15, 0.42); // Erdgeschoss
    if (lvl >= 2) drawTier(0.55, 0.78); // 1. Stock
    if (lvl === 3) drawTier(0.84, 0.96); // 2. Stock
  }

  // Dach mit dimensionalen Kanten
  let topY = hipRoof(c, roofColor, roofH, tiled);

  // --- STATUS OVERLAYS ---
  if (statusEffects.fireRisk) {
    ctx.fillStyle = 'rgba(240, 100, 30, 0.35)';
    for(let i=0; i<4; i++) { ctx.beginPath(); ctx.arc(c.cx + (Math.sin(i)*4)*s, topY - (i*4)*s, (2+i)*s, 0, 7); ctx.fill(); }
  }

  // ---- DYNAMISCHE STATUS-INDIKATOREN (VISUELLES FEEDBACK OVERLAYS) ----
  
  // A. Funken/Rauch bei akuter Brandgefahr
  if (statusEffects.fireRisk && kind === 'house') {
    ctx.fillStyle = 'rgba(230, 90, 40, 0.4)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(c.cx + (i - 1) * 4 * s, topY + (i * 2) * s, (1.5 + i) * s, 0, 7); ctx.fill();
    }
  }

  // B. Fliegen/Dunstwolke bei Seuchengefahr
  if (statusEffects.plagueRisk && kind === 'house') {
    ctx.fillStyle = 'rgba(80, 110, 60, 0.25)'; // Grünlich-brauner Dunst über dem Dach
    ctx.beginPath(); ctx.arc(c.cx, topY - 5 * s, 12 * s, 0, 7); ctx.fill();
  }

  // C. Durstige Bürger-Icons / Partikel bei Wassermangel
  if (statusEffects.waterShortage && kind === 'house') {
    ctx.fillStyle = '#4fa3e3'; // Blaue "Wassertropfen"-Partikel
    ctx.beginPath(); ctx.arc(c.cx - 8 * s, topY - 12 * s, 1.5 * s, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(c.cx - 6 * s, topY - 15 * s, 1.2 * s, 0, 7); ctx.fill();
  }

  // D. Herumsitzende Figuren bei Arbeitslosigkeit
  if (statusEffects.unemployed && kind === 'house') {
    ctx.fillStyle = '#8a7663'; // Kleine "Toga"-Punkte am Boden (Stufen/Eingang)
    ctx.beginPath(); ctx.arc(c.S.x - 3 * s, c.S.y - 1 * s, 2 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#b0a090';
    ctx.fillRect(c.S.x - 4.5 * s, c.S.y, 3 * s, 4 * s); // Körper der sitzenden Person
  }

  return { cx: c.cx, topY };
}

// Viewport-Rect wird einmal pro Frame in render() gesetzt (setViewRect), statt
// für jede einzelne Zelle ein layout-auslösendes getBoundingClientRect() zu zahlen.
let _viewRect = null;
function setViewRect(r){ _viewRect = r; }
function onScreen(gx, gy) {
  const r = _viewRect || (_viewRect = cv.parentElement.getBoundingClientRect());
  const p = project(gx, gy);
  return p.x > -80 && p.x < r.width + 80 && p.y > -120 && p.y < r.height + 80;
}


// ===== Römische Gebäude im antiken Stil =====

function drawForum(gx, gy, baseLift) {
  const s = cam.scale, marbleLight = '#efe7d4', stone = '#e7ddc6';
  const hBase = 6, colH = 20, entH = 5, roofH = 14;
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hBase);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.20)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetX = 14 * s; ctx.shadowOffsetY = 7 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();
  const gBaseSW = ctx.createLinearGradient(b0.W.x, b1.Wt.y, b0.S.x, b0.S.y);
  gBaseSW.addColorStop(0, shade(stone, 0.02)); gBaseSW.addColorStop(1, shade(stone, -0.12));
  ctx.fillStyle = gBaseSW; poly([b0.W, b0.S, b1.St, b1.Wt]);
  const gBaseSE = ctx.createLinearGradient(b0.S.x, b1.St.y, b0.E.x, b0.E.y);
  gBaseSE.addColorStop(0, shade(stone, -0.22)); gBaseSE.addColorStop(1, shade(stone, -0.38));
  ctx.fillStyle = gBaseSE; poly([b0.S, b0.E, b1.Et, b1.St]);
  wallBrickLines(b0.W, b0.S, b1.Wt, b1.St, 2, 'rgba(80,60,40,0.25)', s);
  wallBrickLines(b0.S, b0.E, b1.St, b1.Et, 2, 'rgba(60,40,30,0.30)', s);
  ctx.fillStyle = shade(marbleLight, -0.05); poly([b1.Nt, b1.Et, b1.St, b1.Wt]);
  const us = [0.15, 0.50, 0.85];
  for (const u of us) column(lerp(b1.Wt, b1.St, u), colH);
  for (let i = us.length - 1; i >= 0; i--) column(lerp(b1.St, b1.Et, us[i]), colH);
  column(b1.St, colH);
  const e2 = isoCorners(gx, gy, baseLift, hBase + colH), e3 = isoCorners(gx, gy, baseLift, hBase + colH + entH);
  const gEntSW = ctx.createLinearGradient(e2.Wt.x, e3.Wt.y, e2.St.x, e2.St.y);
  gEntSW.addColorStop(0, marbleLight); gEntSW.addColorStop(1, shade(marbleLight, -0.10));
  ctx.fillStyle = gEntSW; poly([e2.Wt, e2.St, e3.St, e3.Wt]);
  const gEntSE = ctx.createLinearGradient(e2.St.x, e3.St.y, e2.E.x, e2.E.y);
  gEntSE.addColorStop(0, shade(marbleLight, -0.24)); gEntSE.addColorStop(1, shade(marbleLight, -0.38));
  ctx.fillStyle = gEntSE; poly([e2.St, e2.Et, e3.Et, e3.St]);
  wallBrickLines(e2.Wt, e2.St, e3.Wt, e3.St, 1, 'rgba(140,70,50,0.4)', s);
  wallBrickLines(e2.St, e2.Et, e3.St, e3.Et, 1, 'rgba(100,50,35,0.4)', s);
  const apex = { x: (e3.Nt.x + e3.Et.x + e3.St.x + e3.Wt.x) / 4, y: (e3.Nt.y + e3.Et.y + e3.St.y + e3.Wt.y) / 4 - roofH * s };
  const roofCol = '#b15f3a';
  ctx.fillStyle = shade(roofCol, -0.35); poly([e3.Nt, e3.Wt, apex]); poly([e3.Nt, e3.Et, apex]);
  ctx.fillStyle = shade(roofCol, 0.05); poly([e3.Wt, e3.St, apex]);
  ctx.fillStyle = shade(roofCol, -0.18); poly([e3.St, e3.Et, apex]);
  tileFace(e3.Wt, e3.St, apex, shade(roofCol, 0.05));
  tileFace(e3.St, e3.Et, apex, shade(roofCol, -0.18));
  const ctr = { x: (e3.St.x + e3.Et.x + apex.x) / 3, y: (e3.St.y + e3.Et.y + apex.y) / 3 };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.68, y: ctr.y + (p.y - ctr.y) * 0.68 });
  ctx.fillStyle = 'rgba(40, 28, 15, 0.45)'; poly([I(e3.St), I(e3.Et), I(apex)]);
  ctx.strokeStyle = 'rgba(40,30,16,.35)'; ctx.lineWidth = Math.max(1.5, 1.8 * s);
  ctx.beginPath(); ctx.moveTo(e3.Wt.x, e3.Wt.y); ctx.lineTo(e3.St.x, e3.St.y); ctx.lineTo(e3.Et.x, e3.Et.y); ctx.stroke();
  return { cx: b0.cx, topY: apex.y };
}

// Tempel eines Hauptgottes — Dachfarbe & Akzent kommen aus GODS[kind]
function drawTemple(gx, gy, baseLift, kind) {
  const g = (typeof GODS !== 'undefined' && GODS[kind]) ? GODS[kind] : { roof: '#b15f3a', accent: '#efe7d4', god: '?' };
  const s = cam.scale, marble = '#efe7d4', stone = '#e3d8bf', roof = g.roof, accent = g.accent;
  const hPod = 7, colH = 22, entH = 5, roofH = 15;

  // ---- Sockel-Schatten ----
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hPod);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 11 * s; ctx.shadowOffsetX = 15 * s; ctx.shadowOffsetY = 8 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();

  // ---- Podium (zwei Frontflächen) ----
  const gSW = ctx.createLinearGradient(b0.W.x, b1.Wt.y, b0.S.x, b0.S.y);
  gSW.addColorStop(0, shade(stone, 0.04)); gSW.addColorStop(1, shade(stone, -0.14));
  ctx.fillStyle = gSW; poly([b0.W, b0.S, b1.St, b1.Wt]);
  const gSE = ctx.createLinearGradient(b0.S.x, b1.St.y, b0.E.x, b0.E.y);
  gSE.addColorStop(0, shade(stone, -0.22)); gSE.addColorStop(1, shade(stone, -0.40));
  ctx.fillStyle = gSE; poly([b0.S, b0.E, b1.Et, b1.St]);
  wallBrickLines(b0.W, b0.S, b1.Wt, b1.St, 2, 'rgba(80,60,40,0.22)', s);
  wallBrickLines(b0.S, b0.E, b1.St, b1.Et, 2, 'rgba(60,40,30,0.28)', s);

  // ---- angedeutete Freitreppe an der vorderen (S-)Ecke ----
  ctx.strokeStyle = 'rgba(255,250,238,0.5)'; ctx.lineWidth = Math.max(1, 1 * s);
  for (let i = 1; i <= 3; i++) {
    const v = i / 4, a = lerp(b0.S, b1.St, v);
    const wl = lerp(a, lerp(b0.W, b1.Wt, v), 0.16), el = lerp(a, lerp(b0.E, b1.Et, v), 0.16);
    ctx.beginPath(); ctx.moveTo(wl.x, wl.y); ctx.lineTo(a.x, a.y); ctx.lineTo(el.x, el.y); ctx.stroke();
  }

  // ---- Plattform-Oberseite + Kolonnade ringsum (sichtbare Front) ----
  ctx.fillStyle = shade(marble, -0.04); poly([b1.Nt, b1.Et, b1.St, b1.Wt]);
  const us = [0.14, 0.38, 0.62, 0.86];
  for (const u of us) column(lerp(b1.Wt, b1.St, u), colH);
  for (let i = us.length - 1; i >= 0; i--) column(lerp(b1.St, b1.Et, us[i]), colH);
  column(b1.St, colH);

  // ---- Gebälk / Architrav ----
  const e2 = isoCorners(gx, gy, baseLift, hPod + colH), e3 = isoCorners(gx, gy, baseLift, hPod + colH + entH);
  const eSW = ctx.createLinearGradient(e2.Wt.x, e3.Wt.y, e2.St.x, e2.St.y);
  eSW.addColorStop(0, marble); eSW.addColorStop(1, shade(marble, -0.10));
  ctx.fillStyle = eSW; poly([e2.Wt, e2.St, e3.St, e3.Wt]);
  const eSE = ctx.createLinearGradient(e2.St.x, e3.St.y, e2.Et.x, e2.Et.y);
  eSE.addColorStop(0, shade(marble, -0.22)); eSE.addColorStop(1, shade(marble, -0.36));
  ctx.fillStyle = eSE; poly([e2.St, e2.Et, e3.Et, e3.St]);
  wallBrickLines(e2.Wt, e2.St, e3.Wt, e3.St, 1, 'rgba(120,100,70,0.35)', s);   // Triglyphen-Andeutung
  wallBrickLines(e2.St, e2.Et, e3.St, e3.Et, 1, 'rgba(90,72,50,0.40)', s);

  // ---- Satteldach mit First: echtes dreieckiges Pediment an der Front ----
  const rH = roofH * s;
  const stroke2 = (a,b,col,w)=>{ ctx.strokeStyle=col; ctx.lineWidth=Math.max(1,(w||1)*s);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); };
  // First über der Mitte der Front- (St–Et) und Rückkante (Nt–Wt)
  const ridgeF = { x:(e3.St.x+e3.Et.x)/2, y:(e3.St.y+e3.Et.y)/2 - rH };   // vorne = Giebelspitze
  const ridgeB = { x:(e3.Nt.x+e3.Wt.x)/2, y:(e3.Nt.y+e3.Wt.y)/2 - rH };   // hinten

  // hinteres Giebeldreieck (meist verdeckt)
  ctx.fillStyle = shade(roof, -0.42); poly([e3.Nt, e3.Wt, ridgeB]);

  // rechte Dachfläche (NE, abgewandt -> dunkler)
  const gR = ctx.createLinearGradient(ridgeF.x, ridgeF.y, e3.Et.x, e3.Et.y);
  gR.addColorStop(0, shade(roof, -0.10)); gR.addColorStop(1, shade(roof, -0.30));
  ctx.fillStyle = gR; poly([ridgeF, e3.Et, e3.Nt, ridgeB]);
  for (let i=1;i<5;i++){ const t=i/5; stroke2(lerp(e3.Et,ridgeF,t), lerp(e3.Nt,ridgeB,t), 'rgba(224,108,82,0.42)'); }   // helles Ziegelrot statt Schwarz

  // linke Dachfläche (SW, zugewandt -> heller) = sichtbare Längsseite
  const gL = ctx.createLinearGradient(ridgeF.x, ridgeF.y, e3.St.x, e3.St.y);
  gL.addColorStop(0, shade(roof, 0.12)); gL.addColorStop(1, shade(roof, -0.04));
  ctx.fillStyle = gL; poly([ridgeF, e3.St, e3.Wt, ridgeB]);
  for (let i=1;i<5;i++){ const t=i/5; stroke2(lerp(e3.St,ridgeF,t), lerp(e3.Wt,ridgeB,t), 'rgba(224,108,82,0.30)'); }   // helle Ziegelrillen (terrakotta)

  stroke2(ridgeF, ridgeB, 'rgba(30,20,10,0.38)', 2);   // First betonen

  // ---- vorderes Pediment (Giebelfeld) in der GÖTTERFARBE ----
  const gP = ctx.createLinearGradient(ridgeF.x, ridgeF.y, (e3.St.x+e3.Et.x)/2, (e3.St.y+e3.Et.y)/2);
  gP.addColorStop(0, shade(roof, 0.08)); gP.addColorStop(1, shade(roof, -0.14));
  ctx.fillStyle = gP; poly([e3.St, e3.Et, ridgeF]);
  // Tympanon (vertieftes Giebelfeld als Schatten)
  const pcen = { x:(e3.St.x+e3.Et.x+ridgeF.x)/3, y:(e3.St.y+e3.Et.y+ridgeF.y)/3 };
  const inset = p => ({ x: pcen.x + (p.x-pcen.x)*0.62, y: pcen.y + (p.y-pcen.y)*0.62 });
  ctx.fillStyle = 'rgba(35,25,14,0.42)'; poly([inset(e3.St), inset(e3.Et), inset(ridgeF)]);
  // Schräggesims (Geison) entlang der Giebelschenkel
  stroke2(e3.St, ridgeF, shade(roof, 0.20), 1.2); stroke2(e3.Et, ridgeF, shade(roof, 0.20), 1.2);
  stroke2(e3.St, e3.Et, shade(roof, -0.26), 1.2);   // Horizontalgesims (Traufe)

  // ---- Akrotere (Firstspitze + Traufenecken) in Akzentfarbe ----
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(ridgeF.x, ridgeF.y - 2 * s, 2.6 * s, 0, 7); ctx.fill();
  for (const p of [e3.St, e3.Et]) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * s, 0, 7); ctx.fill(); }

  // ---- Götter-Medaillon mittig auf dem Gebälk ----
  const mb = lerp(e2.St, e2.Et, 0.5), mt = lerp(e3.St, e3.Et, 0.5);
  const mx = (mb.x + mt.x) / 2, my = (mb.y + mt.y) / 2;
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(mx, my, 2.7 * s, 0, 7); ctx.fill();
  ctx.strokeStyle = shade(roof, -0.20); ctx.lineWidth = Math.max(1, 1 * s); ctx.stroke();

  return { cx: b0.cx, topY: ridgeF.y };
}

// Gesundheits-/Hygiene-Einrichtung — Dachfarbe & Akzent kommen aus HEALTH[kind].
// Gemauerter Sockel, offene Säulenfront und farbiges Walmdach mit Emblem-Scheibe
// (Therme = türkis, Arzt = rot, Barbier = violett).
function drawHealth(gx, gy, baseLift, kind) {
  const g = (typeof HEALTH !== 'undefined' && HEALTH[kind]) ? HEALTH[kind] : { roof: '#7a8aa0', accent: '#e6ecf2' };
  const s = cam.scale, marble = '#efe7d4', stone = '#e3d8bf', roof = g.roof, accent = g.accent;
  const hBase = 6, colH = 16, entH = 4, roofH = 11;

  // ---- Sockel-Schatten ----
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hBase);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.20)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetX = 13 * s; ctx.shadowOffsetY = 7 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();

  // ---- gemauerter Sockel (zwei Frontflächen) ----
  const gSW = ctx.createLinearGradient(b0.W.x, b1.Wt.y, b0.S.x, b0.S.y);
  gSW.addColorStop(0, shade(stone, 0.03)); gSW.addColorStop(1, shade(stone, -0.13));
  ctx.fillStyle = gSW; poly([b0.W, b0.S, b1.St, b1.Wt]);
  const gSE = ctx.createLinearGradient(b0.S.x, b1.St.y, b0.E.x, b0.E.y);
  gSE.addColorStop(0, shade(stone, -0.22)); gSE.addColorStop(1, shade(stone, -0.39));
  ctx.fillStyle = gSE; poly([b0.S, b0.E, b1.Et, b1.St]);
  wallBrickLines(b0.W, b0.S, b1.Wt, b1.St, 2, 'rgba(80,60,40,0.22)', s);
  wallBrickLines(b0.S, b0.E, b1.St, b1.Et, 2, 'rgba(60,40,30,0.28)', s);

  // ---- Plattform-Oberseite + kleine Kolonnade an der Front ----
  ctx.fillStyle = shade(marble, -0.04); poly([b1.Nt, b1.Et, b1.St, b1.Wt]);
  const us = [0.18, 0.5, 0.82];
  for (const u of us) column(lerp(b1.Wt, b1.St, u), colH);
  for (let i = us.length - 1; i >= 0; i--) column(lerp(b1.St, b1.Et, us[i]), colH);
  column(b1.St, colH);

  // ---- Gebälk ----
  const e2 = isoCorners(gx, gy, baseLift, hBase + colH), e3 = isoCorners(gx, gy, baseLift, hBase + colH + entH);
  const eSW = ctx.createLinearGradient(e2.Wt.x, e3.Wt.y, e2.St.x, e2.St.y);
  eSW.addColorStop(0, marble); eSW.addColorStop(1, shade(marble, -0.10));
  ctx.fillStyle = eSW; poly([e2.Wt, e2.St, e3.St, e3.Wt]);
  const eSE = ctx.createLinearGradient(e2.St.x, e3.St.y, e2.Et.x, e2.Et.y);
  eSE.addColorStop(0, shade(marble, -0.22)); eSE.addColorStop(1, shade(marble, -0.36));
  ctx.fillStyle = eSE; poly([e2.St, e2.Et, e3.Et, e3.St]);

  // ---- farbiges Walmdach (Dachfarbe der Einrichtung) ----
  const apex = { x: (e3.Nt.x + e3.Et.x + e3.St.x + e3.Wt.x) / 4, y: (e3.Nt.y + e3.Et.y + e3.St.y + e3.Wt.y) / 4 - roofH * s };
  ctx.fillStyle = shade(roof, -0.34); poly([e3.Nt, e3.Wt, apex]); poly([e3.Nt, e3.Et, apex]);
  ctx.fillStyle = shade(roof, 0.08);  poly([e3.Wt, e3.St, apex]);
  ctx.fillStyle = shade(roof, -0.16); poly([e3.St, e3.Et, apex]);
  tileFace(e3.Wt, e3.St, apex, shade(roof, 0.08));
  tileFace(e3.St, e3.Et, apex, shade(roof, -0.16));
  ctx.strokeStyle = 'rgba(30,20,10,0.32)'; ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath(); ctx.moveTo(e3.Wt.x, e3.Wt.y); ctx.lineTo(e3.St.x, e3.St.y); ctx.lineTo(e3.Et.x, e3.Et.y); ctx.stroke();

  // ---- Emblem-Scheibe in Akzentfarbe (mittig auf dem Gebälk) ----
  const mb = lerp(e2.St, e2.Et, 0.5), mt = lerp(e3.St, e3.Et, 0.5);
  const mx = (mb.x + mt.x) / 2, my = (mb.y + mt.y) / 2;
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(mx, my, 2.6 * s, 0, 7); ctx.fill();
  ctx.strokeStyle = shade(roof, -0.20); ctx.lineWidth = Math.max(1, 1 * s); ctx.stroke();

  return { cx: b0.cx, topY: apex.y };
}

// Bildungs-Einrichtung — Dachfarbe & Akzent kommen aus EDUCATION[kind].
// Gleiche zivile Bauform wie die Gesundheitsbauten (Marmorsockel, Säulenfront,
// farbiges Walmdach), aber statt der runden Emblem-Scheibe trägt das Gebälk ein
// aufrechtes BUCH-Emblem in Akzentfarbe — so liest es sich als Ort des Wissens.
function drawEducation(gx, gy, baseLift, kind) {
  const g = (typeof EDUCATION !== 'undefined' && EDUCATION[kind]) ? EDUCATION[kind] : { roof: '#4a78b0', accent: '#cfe0f4' };
  const s = cam.scale, marble = '#efe7d4', stone = '#e3d8bf', roof = g.roof, accent = g.accent;
  const hBase = 6, colH = 16, entH = 4, roofH = 11;

  // ---- Sockel-Schatten ----
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hBase);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.20)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetX = 13 * s; ctx.shadowOffsetY = 7 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();

  // ---- gemauerter Sockel (zwei Frontflächen) ----
  const gSW = ctx.createLinearGradient(b0.W.x, b1.Wt.y, b0.S.x, b0.S.y);
  gSW.addColorStop(0, shade(stone, 0.03)); gSW.addColorStop(1, shade(stone, -0.13));
  ctx.fillStyle = gSW; poly([b0.W, b0.S, b1.St, b1.Wt]);
  const gSE = ctx.createLinearGradient(b0.S.x, b1.St.y, b0.E.x, b0.E.y);
  gSE.addColorStop(0, shade(stone, -0.22)); gSE.addColorStop(1, shade(stone, -0.39));
  ctx.fillStyle = gSE; poly([b0.S, b0.E, b1.Et, b1.St]);
  wallBrickLines(b0.W, b0.S, b1.Wt, b1.St, 2, 'rgba(80,60,40,0.22)', s);
  wallBrickLines(b0.S, b0.E, b1.St, b1.Et, 2, 'rgba(60,40,30,0.28)', s);

  // ---- Plattform-Oberseite + kleine Kolonnade an der Front ----
  ctx.fillStyle = shade(marble, -0.04); poly([b1.Nt, b1.Et, b1.St, b1.Wt]);
  const us = [0.18, 0.5, 0.82];
  for (const u of us) column(lerp(b1.Wt, b1.St, u), colH);
  for (let i = us.length - 1; i >= 0; i--) column(lerp(b1.St, b1.Et, us[i]), colH);
  column(b1.St, colH);

  // ---- Gebälk ----
  const e2 = isoCorners(gx, gy, baseLift, hBase + colH), e3 = isoCorners(gx, gy, baseLift, hBase + colH + entH);
  const eSW = ctx.createLinearGradient(e2.Wt.x, e3.Wt.y, e2.St.x, e2.St.y);
  eSW.addColorStop(0, marble); eSW.addColorStop(1, shade(marble, -0.10));
  ctx.fillStyle = eSW; poly([e2.Wt, e2.St, e3.St, e3.Wt]);
  const eSE = ctx.createLinearGradient(e2.St.x, e3.St.y, e2.Et.x, e2.Et.y);
  eSE.addColorStop(0, shade(marble, -0.22)); eSE.addColorStop(1, shade(marble, -0.36));
  ctx.fillStyle = eSE; poly([e2.St, e2.Et, e3.Et, e3.St]);

  // ---- farbiges Walmdach (Dachfarbe der Einrichtung) ----
  const apex = { x: (e3.Nt.x + e3.Et.x + e3.St.x + e3.Wt.x) / 4, y: (e3.Nt.y + e3.Et.y + e3.St.y + e3.Wt.y) / 4 - roofH * s };
  ctx.fillStyle = shade(roof, -0.34); poly([e3.Nt, e3.Wt, apex]); poly([e3.Nt, e3.Et, apex]);
  ctx.fillStyle = shade(roof, 0.08);  poly([e3.Wt, e3.St, apex]);
  ctx.fillStyle = shade(roof, -0.16); poly([e3.St, e3.Et, apex]);
  tileFace(e3.Wt, e3.St, apex, shade(roof, 0.08));
  tileFace(e3.St, e3.Et, apex, shade(roof, -0.16));
  ctx.strokeStyle = 'rgba(30,20,10,0.32)'; ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath(); ctx.moveTo(e3.Wt.x, e3.Wt.y); ctx.lineTo(e3.St.x, e3.St.y); ctx.lineTo(e3.Et.x, e3.Et.y); ctx.stroke();

  // ---- Buch-Emblem in Akzentfarbe (mittig auf dem Gebälk) ----
  const mb = lerp(e2.St, e2.Et, 0.5), mt = lerp(e3.St, e3.Et, 0.5);
  const mx = (mb.x + mt.x) / 2, my = (mb.y + mt.y) / 2;
  const bw = 4.0 * s, bh = 3.0 * s;
  ctx.fillStyle = accent; ctx.fillRect(mx - bw, my - bh, bw * 2, bh * 2);
  ctx.strokeStyle = shade(roof, -0.20); ctx.lineWidth = Math.max(1, 1 * s);
  ctx.strokeRect(mx - bw, my - bh, bw * 2, bh * 2);
  ctx.beginPath(); ctx.moveTo(mx, my - bh); ctx.lineTo(mx, my + bh); ctx.stroke();   // Buchrücken

  return { cx: b0.cx, topY: apex.y };
}

// ===== Mehrfeldrige Spielstätte (Theater / Amphitheater / Kolosseum) =====
// Wird EINMAL auf der Anker-Kachel gezeichnet und überspannt den ganzen Footprint.
// Aufbau: elliptischer Steinwall mit Arkadenbögen, abgestufte Sitzränge (cavea),
// Sandarena in der Mitte. def aus CULTURE[kind] steuert Größe/Höhe/Ränge/Farben.
function drawVenue(gx, gy, baseLift, kind) {
  const def = (typeof CULTURE !== 'undefined' && CULTURE[kind]) ? CULTURE[kind]
            : { foot:[2,2], h:30, tiers:2, roof:'#c8b48a', accent:'#efe2c4' };
  const s = cam.scale, [w, h] = def.foot, stone = def.roof, accent = def.accent;
  const trim = def.trim || shade(stone, -0.45);            // Farbe für rote Zierlinien / Sonnensegel
  const wallH = def.h, rimDrop = def.h * 0.26;          // Sitzränge liegen etwas tiefer als die Mauerkrone
  const g = footCorners(gx, gy, w, h, baseLift, 0);     // Boden-Eckpunkte des Footprints

  // (u,v) in [0,1]² auf die Boden-Raute abbilden (N=oben, E=rechts, S=unten, W=links)
  const P = (u, v) => { const a = lerp(g.N, g.E, u), b = lerp(g.W, g.S, u); return lerp(a, b, v); };
  const raise = (p, dh) => ({ x: p.x, y: p.y - dh * s });
  // Ellipse als Punktliste (Winkel 0 = rechts); ringförmig auf die Boden-Raute projiziert
  const ellipse = (ru, rv, np) => { const pts = [];
    for (let i = 0; i < np; i++) { const a = (i / np) * Math.PI * 2; pts.push(P(0.5 + ru * Math.cos(a), 0.5 + rv * Math.sin(a))); }
    return pts; };
  const NP = 40;

  // ===== Gemeinsame Cavea-Darstellung (Theater / Amphitheater / Kolosseum) =====
  // Feine Sitzränge: jede Reihe = flache, helle Sitzfläche + dunklere Stufe (Riser).
  // Dazu schmale radiale Treppengänge (scalaria) und gelegentliche Ausgänge (vomitoria).
  // pt(r,t,dh): Punkt auf Ring r bei Parameter t∈[0,1], um dh (Welt-px) angehoben.
  // closed=true → voller Ring (Arena), false → offener Bogen (Theater).
  function paintCavea(pt, NPt, rO0, rI0, seatTop, rows, nStair, exits, closed) {
    const treadHi = shade(stone, 0.17), treadLo = shade(stone, 0.10);
    const riserCol = shade(stone, -0.32), edgeCol = 'rgba(36,26,12,0.58)';
    const fillBand = (rO, rI, hO, hI, fill, t0, t1) => {
      t0 = (t0 == null ? 0 : t0); t1 = (t1 == null ? 1 : t1);
      ctx.beginPath();
      for (let i = 0; i <= NPt; i++) { const t = t0 + (t1 - t0) * i / NPt; const p = pt(rO, t, hO); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      for (let i = NPt; i >= 0; i--) { const t = t0 + (t1 - t0) * i / NPt; const p = pt(rI, t, hI); ctx.lineTo(p.x, p.y); }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    };
    const strokeRing = (r, dh, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); for (let i = 0; i <= NPt; i++) { const p = pt(r, i / NPt, dh); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); };

    // 1) feine Sitzränge: außen/hoch → innen/tief. Breite, helle Sitzfläche + schmale, dunkle Stufe.
    for (let r = 0; r < rows; r++) {
      const f0 = r / rows, f1 = (r + 1) / rows;
      const rO = rO0 - (rO0 - rI0) * f0, rI = rO0 - (rO0 - rI0) * f1;
      const hO = seatTop * (1 - f0), hI = seatTop * (1 - f1);
      const rMid = rO - (rO - rI) * 0.62;
      fillBand(rO, rMid, hO, hO, r % 2 ? treadHi : treadLo);   // Sitzfläche (flach, hell)
      fillBand(rMid, rI, hO, hI, riserCol);                    // Stufe (Abfall, dunkel)
      strokeRing(rMid, hO, edgeCol, Math.max(1, 0.6 * s));     // Vorderkante der Reihe
    }

    // 2) Ausgänge (vomitoria): dunkle, gewölbte Tunnelmündungen über die unteren Ränge
    if (exits) for (const ex of exits) {
      const tc = ex.t, wt = ex.w, topF = ex.top != null ? ex.top : 0.48;
      const rTop = rO0 - (rO0 - rI0) * topF, hTop = seatTop * (1 - topF);
      fillBand(rTop, rI0, hTop, 3, 'rgba(20,14,6,0.70)', tc - wt, tc + wt);    // dunkler Schacht
      ctx.strokeStyle = shade(stone, 0.14); ctx.lineWidth = Math.max(1, 1.0 * s);  // helle Wangen
      for (const sgn of [-1, 1]) { const a = pt(rTop, tc + sgn * wt, hTop), b = pt(rI0, tc + sgn * wt, 3);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.strokeStyle = shade(stone, 0.10); ctx.lineWidth = Math.max(1.4, 1.6 * s);   // Rundbogensturz
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const t = tc - wt + 2 * wt * i / 10;
        const p = pt(rTop, t, hTop + Math.sin(Math.PI * i / 10) * seatTop * 0.07); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }

    // 3) scalaria: schmale radiale Treppengänge
    ctx.strokeStyle = 'rgba(54,40,22,0.34)'; ctx.lineWidth = Math.max(1, 0.7 * s);
    for (let k = 0; k <= nStair; k++) { if (closed && k === nStair) break;
      const t = k / nStair, o = pt(rO0, t, seatTop), ii = pt(rI0, t, 2);
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ii.x, ii.y); ctx.stroke();
    }
  }

  // --- Bodenschatten über den ganzen Footprint ---
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 12 * s; ctx.shadowOffsetX = 14 * s; ctx.shadowOffsetY = 8 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([g.N, g.E, g.S, g.W]); ctx.restore();

  // --- helle Steinplattform als Sockel ---
  ctx.fillStyle = shade(stone, -0.04); poly([g.N, g.E, g.S, g.W]);

  // ===== Theater: halbkreisförmige Sitztribüne (cavea) blickt auf eine vordere Bühne =====
  // Eigenständige Variante: hinten (N) ein Sitzhalbrund, das nach innen/unten abfällt,
  // davor (S, zum Betrachter) Orchestra + erhöhte Bühne mit niedriger scaenae frons.
  if (def.stage) {
    const tiers   = def.tiers;
    const seatTop = wallH;                  // Höhe der äußersten (hintersten) Sitzreihe
    const rOut = 0.46, rIn = 0.19;          // Außenrand der Ränge → Innenrand (Orchestra)
    const aMidB = Math.PI * 1.5;            // Blickrichtung "hinten" (N) = offene Seite zum Spieler
    const halfA = Math.PI * 0.60;           // Halbspanne → ~216° Gesamtbogen, wickelt seitlich um
    const aSc = aMidB - halfA, aEc = aMidB + halfA;
    const NPa = 56;

    // Punkt auf Ring r bei Bogenparameter t∈[0,1], um dh (Welt-px) angehoben
    const arc = (r, t, dh) => { const a = aSc + (aEc - aSc) * t;
      return raise(P(0.5 + r * Math.cos(a), 0.5 + (r * 0.96) * Math.sin(a)), dh); };
    const arcStroke = (r, dh, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); for (let k = 0; k <= NPa; k++) { const p = arc(r, k / NPa, dh); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); };
    // gefülltes Band zwischen Außenbogen (rO,dhO) und Innenbogen (rI,dhI)
    const band = (rO, rI, dhO, dhI, fill) => {
      ctx.beginPath();
      for (let i = 0; i <= NPa; i++) { const p = arc(rO, i / NPa, dhO); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      for (let i = NPa; i >= 0; i--) { const p = arc(rI, i / NPa, dhI); ctx.lineTo(p.x, p.y); }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    };

    // 1) gekrümmte Stütz-/Außenmauer der cavea (hoher Rücken): Vorderkante Boden → Krone zurück
    const wpt = (a, dh) => raise(P(0.5 + rOut * Math.cos(a), 0.5 + (rOut * 0.96) * Math.sin(a)), dh);
    {
      const ysB = arc(rOut, 0.5, 0).y, ysT = arc(rOut, 0.5, seatTop).y;
      const wg0 = ctx.createLinearGradient(0, ysT, 0, ysB);
      wg0.addColorStop(0, shade(stone, -0.12)); wg0.addColorStop(1, shade(stone, -0.34));
      ctx.fillStyle = wg0;
    }
    ctx.beginPath();
    for (let i = 0; i <= NPa; i++) { const p = arc(rOut, i / NPa, 0);       i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    for (let i = NPa; i >= 0; i--) { const p = arc(rOut, i / NPa, seatTop); ctx.lineTo(p.x, p.y); }
    ctx.closePath(); ctx.fill();

    // --- Arkaden-Außenfassade NUR auf den zum Betrachter zeigenden Segmenten (rechts/vorn) ---
    // front-zugewandt: beim Schritt radial nach außen wandert der Bildpunkt nach unten
    const facing = (a) => { const e = 0.012;
      const p0 = P(0.5 + rOut * Math.cos(a),       0.5 + (rOut * 0.96) * Math.sin(a));
      const p1 = P(0.5 + (rOut + e) * Math.cos(a), 0.5 + (rOut * 0.96 + e) * Math.sin(a));
      return (p1.y - p0.y) > 0; };
    {
      const levels = 2, atticH = seatTop * 0.14, arcZone = seatTop - atticH, bandH = arcZone / levels;
      const nArch = Math.max(7, Math.round((w + h) * 2));
      const da = (aEc - aSc) / nArch, aHalf = da * 0.42;
      for (let L = 0; L < levels; L++) {
        const hBot = L * bandH, hTop = (L + 1) * bandH, spring = hBot + bandH * 0.50;
        for (let k = 0; k < nArch; k++) {
          const ac = aSc + da * (k + 0.5);
          if (!facing(ac)) continue;                       // hintere/abgewandte Bögen überspringen
          const op = [];                                    // dunkle Bogenöffnung: Fuß→Kämpfer→Halbkreis→Kämpfer→Fuß
          op.push(wpt(ac - aHalf, hBot + bandH * 0.06));
          op.push(wpt(ac - aHalf, spring));
          const arcN = 6;
          for (let j = 0; j <= arcN; j++) { const tt = -1 + 2 * j / arcN;
            const hh = spring + (hTop - bandH * 0.12 - spring) * Math.sqrt(Math.max(0, 1 - tt * tt));
            op.push(wpt(ac + tt * aHalf, hh)); }
          op.push(wpt(ac + aHalf, spring));
          op.push(wpt(ac + aHalf, hBot + bandH * 0.06));
          ctx.fillStyle = `rgba(40,28,16,${(0.46 - L * 0.08).toFixed(3)})`;
          poly(op);
          const ks = wpt(ac, hTop - bandH * 0.10);          // Schlussstein
          ctx.fillStyle = shade(stone, 0.12);
          ctx.beginPath(); ctx.moveTo(ks.x - 1.8 * s, ks.y); ctx.lineTo(ks.x + 1.8 * s, ks.y);
          ctx.lineTo(ks.x + 1.1 * s, ks.y + 3 * s); ctx.lineTo(ks.x - 1.1 * s, ks.y + 3 * s); ctx.closePath(); ctx.fill();
        }
        // helle Pfeiler/Pilaster zwischen den Bögen (nur sichtbare)
        ctx.strokeStyle = shade(stone, 0.12); ctx.lineWidth = Math.max(1, 0.8 * s);
        for (let k = 0; k <= nArch; k++) { const a = aSc + da * k; if (!facing(a)) continue;
          const p0 = wpt(a, hBot + bandH * 0.04), p1 = wpt(a, hTop - bandH * 0.04);
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
        // Zwischengesims als Segmentstücke über sichtbaren Bögen
        ctx.strokeStyle = shade(stone, 0.18); ctx.lineWidth = Math.max(1.1, 1.3 * s);
        for (let k = 0; k < nArch; k++) { const a0 = aSc + da * k, a1 = aSc + da * (k + 1);
          if (!facing((a0 + a1) / 2)) continue;
          const p0 = wpt(a0, hTop - bandH * 0.03), p1 = wpt(a1, hTop - bandH * 0.03);
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
      }
      // rotes Zierband im Attikabereich, nur über sichtbaren Segmenten
      if (def.trim) { ctx.strokeStyle = def.trim; ctx.lineWidth = Math.max(1, 1.0 * s);
        for (let k = 0; k < nArch; k++) { const a0 = aSc + da * k, a1 = aSc + da * (k + 1);
          if (!facing((a0 + a1) / 2)) continue;
          const p0 = wpt(a0, arcZone + atticH * 0.5), p1 = wpt(a1, arcZone + atticH * 0.5);
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); } }
    }
    arcStroke(rOut, seatTop, shade(stone, 0.16), Math.max(1.4, 1.7 * s));  // Gesims auf der Krone

    // 2+3) feine Sitzränge, Treppengänge und seitliche Ausgänge über die gemeinsame Routine
    paintCavea(arc, NPa, rOut, rIn, seatTop, Math.max(7, tiers * 4), 7,
               [{ t: 0.15, w: 0.05, top: 0.40 }, { t: 0.85, w: 0.05, top: 0.40 }], false);
    if (def.trim) arcStroke(rOut, seatTop, def.trim, Math.max(1.2, 1.3 * s)); // rote Brüstungszier

    // 4) Orchestra: halbrunde Bodenfläche (Innenbogen, geschlossen über die Sehne)
    band(rIn, 0, 1.5, 1.5, shade(accent, -0.10));   // rI=0 → Sehne durch die Mitte
    arcStroke(rIn, 1.5, 'rgba(88,68,38,0.5)', Math.max(1, 0.9 * s));

    // 5) Bühne (pulpitum) + niedrige scaenae frons, vorne (S) mittig vor der Orchestra
    const stageH = 4, scH = wallH * 0.52;            // Podesthöhe / Höhe der Bühnenwand
    const gpt = (r, t) => { const a = aSc + (aEc - aSc) * t;
      return P(0.5 + r * Math.cos(a), 0.5 + (r * 0.96) * Math.sin(a)); };
    const eLg = gpt(rIn, 0), eRg = gpt(rIn, 1);      // Sehnen-Endpunkte der Orchestra (Boden)
    const fLg = lerp(eLg, g.S, 0.34), fRg = lerp(eRg, g.S, 0.34); // vordere Kante Richtung S-Ecke
    const bLt = raise(eLg, stageH), bRt = raise(eRg, stageH), fLt = raise(fLg, stageH), fRt = raise(fRg, stageH);
    ctx.fillStyle = shade(stone, -0.20); poly([fLg, fRg, fRt, fLt]);        // Sockel vorne
    ctx.fillStyle = shade(stone, -0.12); poly([eRg, fRg, fRt, bRt]);        // Sockel rechts
    ctx.fillStyle = shade(stone, -0.28); poly([eLg, fLg, fLt, bLt]);        // Sockel links
    ctx.fillStyle = shade(stone,  0.05); poly([bLt, bRt, fRt, fLt]);        // Bühnenboden
    // scaenae frons: Wand auf der Vorderkante, Schauseite (S) zum Betrachter
    const wL = raise(fLt, scH), wR = raise(fRt, scH);
    const wg = ctx.createLinearGradient(0, wL.y, 0, fLt.y);
    wg.addColorStop(0, shade(stone, 0.06)); wg.addColorStop(1, shade(stone, -0.18));
    ctx.fillStyle = wg; poly([fLt, fRt, wR, wL]);
    ctx.strokeStyle = shade(stone, 0.18); ctx.lineWidth = Math.max(1.2, 1.5 * s);  // Kranzgesims
    ctx.beginPath(); ctx.moveTo(wL.x, wL.y); ctx.lineTo(wR.x, wR.y); ctx.stroke();
    if (def.trim) { ctx.strokeStyle = def.trim; ctx.lineWidth = Math.max(1, 1.0 * s);
      const tL = lerp(wL, fLt, 0.18), tR = lerp(wR, fRt, 0.18);
      ctx.beginPath(); ctx.moveTo(tL.x, tL.y); ctx.lineTo(tR.x, tR.y); ctx.stroke(); }
    ctx.strokeStyle = shade(stone, -0.30); ctx.lineWidth = Math.max(1, 1.1 * s);   // Pilaster/Säulen
    for (let k = 1; k <= 4; k++) { const u = k / 5;
      const a0 = lerp(fLt, fRt, u), a1 = lerp(wL, wR, u);
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke(); }

    let topYt = Math.min(arc(rOut, 0.5, seatTop).y, wL.y, wR.y);
    return { cx: g.bx, topY: topYt };
  }

  const isStage = !!def.stage;
  const aFront = 0.05, aBack = 0.95;   // bei Theatern nur die vordere Hälfte als Sitzhalbrund

  // Hilfsfunktion: gefülltes Band zwischen zwei Ellipsenringen (außen→innen)
  function ring(rOut, rIn, dhOut, dhIn, fill, line) {
    const o = ellipse(rOut, rOut * 0.96, NP).map(p => raise(p, dhOut));
    const ii = ellipse(rIn, rIn * 0.96, NP).map(p => raise(p, dhIn));
    ctx.fillStyle = fill; ctx.beginPath();
    o.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    for (let i = ii.length - 1; i >= 0; i--) ctx.lineTo(ii[i].x, ii[i].y);
    ctx.closePath(); ctx.fill();
    if (line) { ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, 0.7 * s); ctx.stroke(); }
    return { o, ii };
  }

  // --- 1) Außenmauer ---
  const rOuter = 0.47;
  const rim = (a) => P(0.5 + rOuter * Math.cos(a), 0.5 + (rOuter * 0.96) * Math.sin(a));
  const gRing = ellipse(rOuter, rOuter * 0.96, NP);
  const tRing = gRing.map(p => raise(p, wallH));
  // Front-zugewandte Silhouette: dort zeigt die Außennormale zum Betrachter
  // (Radius minimal vergrößern → Bildpunkt wandert nach unten)
  const facing = (a) => { const e = 0.012;
    const p0 = rim(a);
    const p1 = P(0.5 + (rOuter + e) * Math.cos(a), 0.5 + (rOuter * 0.96 + e) * Math.sin(a));
    return (p1.y - p0.y) > 0; };
  let aMid = 0, yMax = -Infinity;                        // vorderster (tiefster) Randpunkt
  for (let i = 0; i < 720; i++) { const a = i / 720 * Math.PI * 2; const yy = rim(a).y; if (yy > yMax) { yMax = yy; aMid = a; } }
  let aS = aMid, aE = aMid;                              // beidseitig erweitern, solange front-zugewandt
  for (let i = 1; i <= 360; i++) { const a = aMid - i / 360 * Math.PI; if (!facing(a)) break; aS = a; }
  for (let i = 1; i <= 360; i++) { const a = aMid + i / 360 * Math.PI; if (!facing(a)) break; aE = a; }

  // Wandfläche als gefüllter Zylinder-Umriss: Vorderkante am Boden (aS→aE) + Rückkante an der
  // Krone (über die Hinterseite zurück). Robust gegen Überlappung von Boden- und Kronen-Ellipse.
  const cup = [], SN = 56;
  for (let i = 0; i <= SN; i++) cup.push(rim(aS + (aE - aS) * i / SN));
  for (let i = 0; i <= SN; i++) cup.push(raise(rim(aE + (2 * Math.PI - (aE - aS)) * i / SN), wallH));
  if (def.arches) {                                      // Wahrzeichen: heller Steinverlauf (oben hell → unten dunkel)
    const ysB = Math.max(...gRing.map(p => p.y)), ysT = Math.min(...tRing.map(p => p.y));
    const wg = ctx.createLinearGradient(0, ysT, 0, ysB);
    wg.addColorStop(0, shade(stone, -0.10)); wg.addColorStop(1, shade(stone, -0.34));
    ctx.fillStyle = wg;
  } else {
    ctx.fillStyle = shade(stone, -0.26);
  }
  ctx.beginPath(); cup.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();

  // --- 2) Fassade ---
  if (def.arches) {
    // Echte Wahrzeichen-Fassade: mehrere Ebenen mit rundbogigen Arkaden, Pfeilern,
    // Schlusssteinen und Zwischengesimsen — darüber ein geschlossenes Attika-Geschoss.
    aS += Math.PI * 0.012; aE -= Math.PI * 0.012;          // Bögen leicht von der Silhouettenkante einrücken
    const atticH = wallH * 0.20, arcZone = wallH - atticH; // oberstes Geschoss bleibt Vollwand
    const levels = def.arcLevels || 3, bandH = arcZone / levels;
    const nArch = Math.max(10, Math.round((w + h) * 2.0));  // Bögen je Ebene, skaliert mit Größe
    const da = (aE - aS) / nArch, aHalf = da * 0.40;       // Rest zwischen den Bögen = Pfeiler

    for (let L = 0; L < levels; L++) {
      const hBot = L * bandH, hTop = (L + 1) * bandH, spring = hBot + bandH * 0.52;
      for (let k = 0; k < nArch; k++) {
        const ac = aS + da * (k + 0.5);
        // dunkle Bogenöffnung: Fuß → Kämpfer → Halbkreis → Kämpfer → Fuß
        const op = [];
        op.push(raise(rim(ac - aHalf), hBot + bandH * 0.06));
        op.push(raise(rim(ac - aHalf), spring));
        const arcN = 7;
        for (let j = 0; j <= arcN; j++) {
          const t = -1 + 2 * j / arcN;                     // -1..1 über die Bogenbreite
          const hh = spring + (hTop - bandH * 0.10 - spring) * Math.sqrt(Math.max(0, 1 - t * t));
          op.push(raise(rim(ac + t * aHalf), hh));
        }
        op.push(raise(rim(ac + aHalf), spring));
        op.push(raise(rim(ac + aHalf), hBot + bandH * 0.06));
        ctx.fillStyle = `rgba(34,24,14,${(0.55 - L * 0.07).toFixed(3)})`; // höhere Ebenen heller → Tiefe
        poly(op);
        // Schlussstein über dem Bogenscheitel
        const ks = raise(rim(ac), hTop - bandH * 0.07);
        ctx.fillStyle = shade(stone, 0.14);
        ctx.beginPath();
        ctx.moveTo(ks.x - 2.2 * s, ks.y); ctx.lineTo(ks.x + 2.2 * s, ks.y);
        ctx.lineTo(ks.x + 1.4 * s, ks.y + 4 * s); ctx.lineTo(ks.x - 1.4 * s, ks.y + 4 * s);
        ctx.closePath(); ctx.fill();
      }
      // helle Pfeilerkanten zwischen den Bögen
      ctx.strokeStyle = shade(stone, 0.10); ctx.lineWidth = Math.max(1, 0.7 * s);
      for (let k = 0; k <= nArch; k++) {
        const a0 = raise(rim(aS + da * k), hBot + bandH * 0.04), a1 = raise(rim(aS + da * k), hTop - bandH * 0.04);
        ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
      }
      // Zwischengesims (helle Kante + dünner Schatten darunter)
      const cornice = (dh, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        for (let k = 0; k <= nArch; k++) { const p = raise(rim(aS + da * k), hTop - dh); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); };
      cornice(0, shade(stone, 0.20), Math.max(1.2, 1.4 * s));
      cornice(0.7, trim, Math.max(1, 1.0 * s));            // rote Zierlinie
      cornice(1.8, 'rgba(40,28,16,0.32)', Math.max(1, 0.7 * s));
    }

    // --- Attika: geschlossenes Obergeschoss mit Pilastern und schmalen Fenstern ---
    if (def.attic) {
      const aB = arcZone, aT = wallH;
      ctx.strokeStyle = 'rgba(40,28,16,0.42)'; ctx.lineWidth = Math.max(2, 2.4 * s);
      for (let k = 0; k < nArch; k++) {                    // Fensterschlitze
        const c = rim(aS + da * (k + 0.5));
        const lo = raise(c, aB + (aT - aB) * 0.22), hi = raise(c, aB + (aT - aB) * 0.80);
        ctx.beginPath(); ctx.moveTo(lo.x, lo.y); ctx.lineTo(hi.x, hi.y); ctx.stroke();
      }
      ctx.strokeStyle = shade(stone, 0.12); ctx.lineWidth = Math.max(1, 0.7 * s);
      for (let k = 0; k <= nArch; k++) {                   // Pilaster-Andeutung
        const p0 = raise(rim(aS + da * k), aB), p1 = raise(rim(aS + da * k), aT);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
      // rote Zierbänder oben und unten an der Attika
      for (const hb of [aB + (aT - aB) * 0.10, aT - (aT - aB) * 0.10]) {
        ctx.strokeStyle = trim; ctx.lineWidth = Math.max(1, 1.0 * s); ctx.beginPath();
        for (let k = 0; k <= nArch; k++) { const p = raise(rim(aS + da * k), hb); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
      }
    }
  } else {
    // einfache Variante (Theater/Amphitheater): angedeutete Bogenöffnungen als Linien
    const archRows = def.arcade2 ? 2 : 1;
    const nArch = (w + h) * 3;
    for (let r = 0; r < archRows; r++) {
      const v0 = r / archRows, v1 = (r + 0.72) / archRows;
      for (let k = 0; k < nArch; k++) {
        const a = Math.PI * (0.08 + 0.84 * (k + 0.5) / nArch);
        const cu = 0.5 + rOuter * Math.cos(a), cv = 0.5 + (rOuter * 0.96) * Math.sin(a);
        if (cv < 0.5) continue;
        const base = P(cu, cv);
        const top = raise(base, wallH * (1 - v0)), bot = raise(base, wallH * (1 - v1));
        ctx.strokeStyle = 'rgba(40,28,16,0.5)'; ctx.lineWidth = Math.max(1.2, 1.6 * s);
        ctx.beginPath(); ctx.moveTo(bot.x, bot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      }
    }
  }
  // Gesims auf der Mauerkrone
  ctx.strokeStyle = shade(stone, 0.18); ctx.lineWidth = Math.max(1.4, 1.8 * s);
  ctx.beginPath(); tRing.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();

  // --- 3) Sitzränge (cavea): konzentrische Ellipsen, von außen/hoch nach innen/tief ---
  // Innenraum auf die Mauerkrone (tRing) clippen: so erscheint die cavea NUR durch die
  // Öffnung — vordere/seitliche Ränge, die projektiv unter die Krone fallen, verdeckt die Wand.
  ctx.save();
  ctx.beginPath(); tRing.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.clip();
  // innere Mauerfläche (Brüstung) liefert jetzt der Wand-Vollkörper; hier nur das Zierband am Fuß.
  const tiers = def.tiers, rInner = 0.20, seatTop = wallH - rimDrop;
  // feine Sitzränge + Treppengänge + Ausgänge über die gemeinsame Routine (voller Ring)
  const ringPt = (r, t, dh) => { const a = t * Math.PI * 2;
    return raise(P(0.5 + r * Math.cos(a), 0.5 + (r * 0.96) * Math.sin(a)), dh); };
  paintCavea(ringPt, NP, rOuter, rInner, seatTop, Math.max(8, tiers * 3),
             Math.max(8, Math.round((w + h) * 2)),
             [{ t: 0.19, w: 0.032, top: 0.50 }, { t: 0.31, w: 0.032, top: 0.50 }], true);
  if (def.trim) {                                          // rotes Zierband am Brüstungsfuß (oberste Stufenkante)
    const lip = ellipse(rOuter, rOuter * 0.96, NP).map(p => raise(p, seatTop));
    ctx.strokeStyle = def.trim; ctx.lineWidth = Math.max(1.2, 1.3 * s);
    ctx.beginPath(); lip.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  }

  // --- 4) Sandarena in der Mitte (innerste, tiefste Fläche → zuletzt) ---
  const arena = ellipse(rInner, rInner * 0.96, NP).map(p => raise(p, 2));
  ctx.fillStyle = '#cdb784'; ctx.beginPath();
  arena.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(88,68,38,0.55)'; ctx.lineWidth = Math.max(1, 1.0 * s); ctx.stroke();
  ctx.restore();   // Innenraum-Clip aufheben (Bühne/Banner/Masten danach unbeschnitten)

  // --- 5) Theater-Variante: hohe Bühnenwand (scaenae frons) an der hinteren (N-)Kante ---
  if (isStage) {
    const bl = lerp(g.W, g.N, 0.5), br = lerp(g.N, g.E, 0.5);   // hintere Dachfirst-Linie grob
    const wallTop = def.h * 1.05;
    const A = raise(P(0.30, 0.16), 0), B = raise(P(0.70, 0.16), 0);
    const At = raise(A, wallTop), Bt = raise(B, wallTop);
    ctx.fillStyle = shade(stone, 0.04); poly([A, B, Bt, At]);
    ctx.strokeStyle = shade(stone, -0.22); ctx.lineWidth = Math.max(1, 1 * s);
    for (let k = 1; k <= 3; k++) { const u = k / 4; const c0 = raise(lerp(A, B, u), 4), c1 = raise(lerp(A, B, u), wallTop - 3);
      ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke(); }
  }

  // --- 6) Velarium: animiertes rotes Sonnensegel + Masten rund um den oberen Rand ---
  let topY = Math.min(...tRing.map(p => p.y));
  if (def.velarium) {
    const nM = Math.max(14, Math.round((w + h) * 2));
    const mast = (a) => raise(P(0.5 + rOuter * Math.cos(a), 0.5 + (rOuter * 0.96) * Math.sin(a)), wallH);

    // Öffnungsgrad 0..1 — meist geschlossen, spannt sich "ab und zu" auf und wieder zu.
    const clock = (typeof animT !== 'undefined') ? animT : 0;
    const off = ((gx * 7 + gy * 13) % 19);                 // Versatz: mehrere Kolosseen laufen nicht synchron
    const T = 24;                                          // Periode in animT-Einheiten (~Sekunden)
    const ph = ((((clock + off) % T) + T) % T) / T;
    const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    let vel = 0;
    if (ph < 0.40) vel = 0;
    else if (ph < 0.50) vel = sm((ph - 0.40) / 0.10);
    else if (ph < 0.80) vel = 1;
    else if (ph < 0.90) vel = 1 - sm((ph - 0.80) / 0.10);
    else vel = 0;

    if (vel > 0.001) {                                     // Segeltuch ringförmig nach innen aufspannen (Mitte offen)
      ctx.save();
      ctx.beginPath(); tRing.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.clip();
      const rIn = rOuter - (rOuter - 0.30) * vel;
      const inner = (a) => raise(P(0.5 + rIn * Math.cos(a), 0.5 + (rIn * 0.96) * Math.sin(a)), wallH - 3 * vel);
      for (let k = 0; k < nM; k++) {
        const a0 = (k / nM) * Math.PI * 2, a1 = ((k + 1) / nM) * Math.PI * 2;
        ctx.fillStyle = (k % 2) ? 'rgba(178,58,44,0.62)' : 'rgba(150,42,34,0.62)';  // rote Bahnen, leicht alternierend
        poly([mast(a0), mast(a1), inner(a1), inner(a0)]);
      }
      ctx.strokeStyle = 'rgba(110,26,20,0.5)'; ctx.lineWidth = Math.max(1, 0.8 * s);  // innerer Saum
      ctx.beginPath();
      for (let k = 0; k <= nM; k++) { const p = inner((k / nM) * Math.PI * 2); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    }

    // Masten rund um den ganzen Rand (die Tragmasten des Segels)
    ctx.lineWidth = Math.max(1.2, 1.3 * s);
    for (let k = 0; k < nM; k++) {
      const base = mast((k / nM) * Math.PI * 2), tip = { x: base.x, y: base.y - 6 * s };
      ctx.strokeStyle = shade(stone, -0.34);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(tip.x, tip.y, 1.1 * s, 0, Math.PI * 2); ctx.fill();
      topY = Math.min(topY, tip.y);
    }
  }

  return { cx: g.bx, topY };
}

function drawClaypit(gx, gy, baseLift) {
  const s = cam.scale, rim = '#9c7b4e', brickCol = '#a4593d';
  const g0 = isoCorners(gx, gy, baseLift, 0), gr = isoCorners(gx, gy, baseLift, 4);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.18)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetX = 8 * s; ctx.shadowOffsetY = 4 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([g0.W, g0.S, g0.E, g0.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(g0.W.x, gr.Wt.y, g0.S.x, g0.S.y);
  gSW.addColorStop(0, shade(brickCol, -0.05)); gSW.addColorStop(1, shade(brickCol, -0.18));
  ctx.fillStyle = gSW; poly([g0.W, g0.S, gr.St, gr.Wt]);
  const gSE = ctx.createLinearGradient(g0.S.x, gr.St.y, g0.E.x, g0.E.y);
  gSE.addColorStop(0, shade(brickCol, -0.28)); gSE.addColorStop(1, shade(brickCol, -0.42));
  ctx.fillStyle = gSE; poly([g0.S, g0.E, gr.Et, gr.St]);
  wallBrickLines(g0.W, g0.S, gr.Wt, gr.St, 2, 'rgba(60,20,10,0.25)', s);
  wallBrickLines(g0.S, g0.E, gr.St, gr.Et, 2, 'rgba(40,10,5,0.30)', s);
  ctx.fillStyle = shade(rim, -0.05); poly([gr.Nt, gr.Et, gr.St, gr.Wt]);
  const ctr = { x: gr.cx, y: gr.cy + 1 * s };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.70, y: ctr.y + (p.y - ctr.y) * 0.70 + 1 * s });
  ctx.fillStyle = '#5c4328'; poly([I(gr.Nt), I(gr.Et), I(gr.St), I(gr.Wt)]);
  ctx.fillStyle = '#b67f4c';
  for (const [dx, dy] of [[-5, 1], [4, 3], [1, -2]]) { ctx.beginPath(); ctx.ellipse(ctr.x + dx * s, ctr.y + dy * s, 4 * s, 2.2 * s, 0, 0, 7); ctx.fill(); }
  return { cx: gr.cx, topY: gr.Nt.y };
}

function drawPottery(gx, gy, baseLift) {
  const s = cam.scale, wall = '#caa46e', roof = '#b15f3a';
  const h = 14;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.05)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.22)); gSE.addColorStop(1, shade(wall, -0.38));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 2, 'rgba(130, 65, 45, 0.38)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 2, 'rgba(95, 45, 30, 0.44)', s);
  wallArch(c.W, c.S, c.Wt, c.St, 0.30, 0.70, 0.0, 0.65, '#231a12', '#9a4e35', s);
  const kb = lerp(c.S, c.E, 0.6), kt = lerp(c.St, c.Et, 0.6);
  const kx = (kb.x + kt.x) / 2, ky = (kb.y + kt.y) / 2 + 1 * s;
  ctx.fillStyle = '#a85834'; ctx.beginPath(); ctx.arc(kx, ky, 3 * s, 0, 7); ctx.fill();
  const topY = hipRoof(c, roof, 9, true);
  ctx.fillStyle = 'rgba(100,95,90,0.35)';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(c.cx + (i - 1) * 3 * s, topY - (4 + i * 4) * s, (2 + i * 1.2) * s, 0, 7); ctx.fill(); }
  return { cx: c.cx, topY };
}

function drawWell(gx, gy, baseLift) {
  const s = cam.scale, marble = '#efe7d4', brick = '#b15f3a';
  const c = isoCorners(gx, gy, baseLift, 0);
  const ctr = { x: c.bx, y: c.by };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.58, y: ctr.y + (p.y - ctr.y) * 0.58 });
  const Ih = p => ({ x: I(p).x, y: I(p).y - 8 * s });
  ctx.save(); ctx.translate(c.bx + 6 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.34 * s, 0, 7); ctx.fill(); ctx.restore();
  const gSW = ctx.createLinearGradient(I(c.W).x, Ih(c.W).y, I(c.S).x, I(c.S).y);
  gSW.addColorStop(0, marble); gSW.addColorStop(1, shade(marble, -0.12));
  ctx.fillStyle = gSW; poly([I(c.W), I(c.S), Ih(c.S), Ih(c.W)]);
  const gSE = ctx.createLinearGradient(I(c.S).x, Ih(c.S).y, I(c.E).x, I(c.E).y);
  gSE.addColorStop(0, shade(marble, -0.22)); gSE.addColorStop(1, shade(marble, -0.35));
  ctx.fillStyle = gSE; poly([I(c.S), I(c.E), Ih(c.E), Ih(c.S)]);
  wallBrickLines(I(c.W), I(c.S), Ih(c.W), Ih(c.S), 1, 'rgba(100,90,80,0.3)', s);
  wallBrickLines(I(c.S), I(c.E), Ih(c.S), Ih(c.E), 1, 'rgba(80,70,60,0.35)', s);
  ctx.fillStyle = '#3a82a6'; poly([Ih(c.N), Ih(c.E), Ih(c.S), Ih(c.W)]);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse((Ih(c.N).x + Ih(c.S).x) / 2, (Ih(c.N).y + Ih(c.S).y) / 2, 4.5 * s, 1.8 * s, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,16,.30)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(Ih(c.W).x, Ih(c.W).y); ctx.lineTo(Ih(c.S).x, Ih(c.S).y); ctx.lineTo(Ih(c.E).x, Ih(c.E).y); ctx.stroke();
  const pL = Ih(c.W), pR = Ih(c.E), postH = 19 * s;
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(2, 2.5 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pL.x, pL.y - postH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pR.x, pR.y); ctx.lineTo(pR.x, pR.y - postH); ctx.stroke();
  const mx = (pL.x + pR.x) / 2, my = (pL.y + pR.y) / 2 - postH;
  ctx.beginPath(); ctx.moveTo(pL.x, pL.y - postH); ctx.lineTo(pR.x, pR.y - postH); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = brick;
  ctx.beginPath(); ctx.moveTo(pL.x - 3 * s, my); ctx.lineTo(mx, my - 10 * s); ctx.lineTo(pR.x + 3 * s, my); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(brick, -0.2); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mx, my - 10 * s); ctx.lineTo(mx, my); ctx.stroke();
  ctx.strokeStyle = 'rgba(50,40,30,0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my + 8 * s); ctx.stroke();
  ctx.fillStyle = '#6e4a2a'; ctx.fillRect(mx - 2 * s, my + 8 * s, 4 * s, 3.5 * s);
  return { cx: c.cx, topY: my - 10 * s };
}

function drawMarket(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cdb78c', roofAwn = '#c0533a';
  const c = isoCorners(gx, gy, baseLift, 9);
  ctx.save(); ctx.translate(c.bx + 7 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.42 * s, 0, 7); ctx.fill(); ctx.restore();
  const gSW = ctx.createLinearGradient(c.W.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.05)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.S.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.22)); gSE.addColorStop(1, shade(wall, -0.38));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 1, 'rgba(120,60,40,0.3)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 1, 'rgba(90,45,30,0.35)', s);
  ctx.fillStyle = shade(wall, 0.08); poly([c.Nt, c.Et, c.St, c.Wt]);
  const goods = [['#b9742f', -5, 1], ['#4e6b36', 4, 2], ['#d8a24a', 0, -2], ['#8a5230', -1, 4]];
  for (const [col, dx, dy] of goods) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(c.cx + dx * s, c.cy + dy * s, 3.2 * s, 2.4 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.20)'; ctx.beginPath(); ctx.ellipse(c.cx + dx * s - 0.8 * s, c.cy + dy * s - 0.8 * s, 1.2 * s, 0.8 * s, 0, 0, 7); ctx.fill();
  }
  const topY = canopyRoof(c, roofAwn, 10);
  return { cx: c.cx, topY };
}

function drawFirehouse(gx, gy, baseLift) {
  const s = cam.scale, wall = '#c2bbab', roof = '#b15f3a';
  const h = 22;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.05)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.22)); gSE.addColorStop(1, shade(wall, -0.38));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 3, 'rgba(130, 65, 45, 0.4)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 3, 'rgba(95, 45, 30, 0.45)', s);
  wallArch(c.W, c.S, c.Wt, c.St, 0.28, 0.72, 0.0, 0.65, '#2b2018', '#a44e32', s);
  wallPatch(c.S, c.E, c.St, c.Et, 0.35, 0.65, 0.45, 0.75, '#18130f');
  const r = isoCorners(gx, gy, baseLift, h + 4);
  ctx.fillStyle = shade(roof, -0.18); poly([c.Wt, c.St, r.St, r.Wt]);
  ctx.fillStyle = shade(roof, -0.32); poly([c.St, c.Et, r.Et, r.St]);
  ctx.fillStyle = roof; poly([r.Nt, r.Et, r.St, r.Wt]);
  ctx.fillStyle = '#5a4530'; ctx.beginPath(); ctx.ellipse(r.cx, r.cy - 1 * s, 7 * s, 4 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a7da1'; ctx.beginPath(); ctx.ellipse(r.cx, r.cy - 2.2 * s, 5.5 * s, 3 * s, 0, 0, 7); ctx.fill();
  return { cx: c.cx, topY: r.Nt.y };
}

function drawEngineer(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cabd9b', roof = '#b15f3a';
  const h = 18;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.06)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.20)); gSE.addColorStop(1, shade(wall, -0.36));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 2, 'rgba(120,60,40,0.38)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 2, 'rgba(90,45,30,0.44)', s);
  wallArch(c.W, c.S, c.Wt, c.St, 0.35, 0.65, 0.0, 0.68, '#261e16', '#9c4e35', s);
  const r = isoCorners(gx, gy, baseLift, h + 4);
  ctx.fillStyle = shade(roof, -0.18); poly([c.Wt, c.St, r.St, r.Wt]);
  ctx.fillStyle = shade(roof, -0.32); poly([c.St, c.Et, r.Et, r.St]);
  const topY = hipRoof(r, roof, 6, true);
  ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = Math.max(1.5, 1.8 * s); ctx.lineCap = 'round';
  const p0 = lerp(c.S, c.E, 0.3), p1 = lerp(c.S, c.E, 0.8);
  const u0 = lerp(c.St, c.Et, 0.3), u1 = lerp(c.St, c.Et, 0.8);
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(u0.x, u0.y - 3 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(u1.x, u1.y - 3 * s); ctx.stroke();
  ctx.lineCap = 'butt';
  return { cx: c.cx, topY };
}

function drawMill(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cfc4ad', roof = '#b15f3a';
  const h = 18;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.05)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.24)); gSE.addColorStop(1, shade(wall, -0.38));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 3, 'rgba(110,60,40,0.35)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 3, 'rgba(85,45,30,0.40)', s);
  wallPatch(c.W, c.S, c.Wt, c.St, 0.4, 0.6, 0.45, 0.68, '#201610');
  const topY = hipRoof(c, roof, 10, true);
  const hub = lerp(lerp(c.S, c.E, 0.5), lerp(c.St, c.Et, 0.5), 0.48);
  const rot = animT * 0.5, R = 12 * s;
  for (let k = 0; k < 4; k++) {
    const a = rot + k * Math.PI / 2;
    const ex = hub.x + Math.cos(a) * R, ey = hub.y + Math.sin(a) * R * 0.7;
    const px = hub.x + Math.cos(a + 0.32) * R * 0.5, py = hub.y + Math.sin(a + 0.32) * R * 0.5 * 0.7;
    ctx.fillStyle = 'rgba(235,225,200,0.85)'; ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(ex, ey); ctx.lineTo(px, py); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(1.5, 1.8 * s); ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.arc(hub.x, hub.y, 2.2 * s, 0, 7); ctx.fill();
  return { cx: c.cx, topY };
}

// Bauernhof / Gehöft: gedrungene Scheune mit Strohdach + Heugarben im Hof
function drawBakery(gx, gy, baseLift) {
  const s = cam.scale, wall = '#d8c39a', roof = '#a85a36';
  const h = 16;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.05)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.22)); gSE.addColorStop(1, shade(wall, -0.38));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 2, 'rgba(130, 65, 45, 0.34)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 2, 'rgba(95, 45, 30, 0.42)', s);
  // glühender Backofen in der SE-Wand
  const ob = lerp(c.S, c.E, 0.62), ot = lerp(c.St, c.Et, 0.62);
  const ox = (ob.x + ot.x) / 2, oy = (ob.y + ot.y) / 2 + 1.5 * s;
  const glow = 0.55 + 0.25 * Math.abs(Math.sin(animT * 3));
  ctx.fillStyle = 'rgba(40,24,16,0.9)'; ctx.beginPath(); ctx.arc(ox, oy, 3.2 * s, Math.PI, 0); ctx.fill();
  ctx.fillStyle = 'rgba(240,140,50,' + glow.toFixed(2) + ')'; ctx.beginPath(); ctx.arc(ox, oy, 2.1 * s, Math.PI, 0); ctx.fill();
  const topY = hipRoof(c, roof, 9, true);
  // Schornstein mit aufsteigendem Rauch
  const ch = lerp(c.N, c.E, 0.42);
  ctx.fillStyle = shade(wall, -0.3); ctx.fillRect(ch.x - 1.6 * s, topY - 6 * s, 3.2 * s, 6 * s);
  ctx.fillStyle = 'rgba(120,112,104,0.3)';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(ch.x + Math.sin(animT * 1.4 + i) * 2 * s, topY - (7 + i * 4) * s, (1.6 + i * 1.1) * s, 0, 7); ctx.fill(); }
  // Brotlaib auf der Fensterbank
  ctx.fillStyle = '#caa46e'; ctx.beginPath(); ctx.ellipse(c.cx + 2 * s, topY + 6 * s, 2.2 * s, 1.3 * s, 0, 0, 7); ctx.fill();
  return { cx: c.cx, topY };
}

// Fischerhütte: niedrige Holzhütte mit Reet-Pultdach, Steg und trocknendem Netz
function drawFisher(gx, gy, baseLift) {
  const s = cam.scale, wall = '#b89a6a', roof = '#7d6a44';   // verwittertes Holz + Reet
  const h = 12;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.06)); gSW.addColorStop(1, shade(wall, -0.14));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.22)); gSE.addColorStop(1, shade(wall, -0.40));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  // senkrechte Bohlen-Struktur
  wallBrickLines(c.W, c.S, c.Wt, c.St, 2, 'rgba(60,42,24,0.30)', s);
  wallBrickLines(c.S, c.E, c.St, c.Et, 2, 'rgba(45,30,18,0.36)', s);
  // dunkle Tür zur Wasserseite
  const db = lerp(c.W, c.S, 0.5), dt = lerp(c.Wt, c.St, 0.5);
  ctx.fillStyle = '#34281a';
  poly([lerp(db, c.W, 0.30), lerp(db, c.S, 0.30), lerp(dt, c.St, 0.30), lerp(dt, c.Wt, 0.30)]);
  // Reet-Pultdach (flach, warmes Grau-Braun)
  const topY = hipRoof(c, roof, 7, false);
  // trocknendes Fischernetz an einem Pfahl
  const px = c.cx + 11 * s, py = topY + 2 * s;
  ctx.strokeStyle = '#6a4f30'; ctx.lineWidth = Math.max(1.4, 1.7 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px, py + 10 * s); ctx.lineTo(px, py - 8 * s); ctx.stroke();
  ctx.strokeStyle = 'rgba(225,225,210,0.55)'; ctx.lineWidth = Math.max(1, 0.7 * s);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(px, py - 6 * s + i * 3 * s); ctx.quadraticCurveTo(px - 5 * s, py - 4 * s + i * 3 * s, px - 8 * s, py + 1 * s + i * 2.4 * s); ctx.stroke(); }
  for (let i = 0; i < 3; i++) { const lx = px - 2 * s - i * 2.4 * s; ctx.beginPath(); ctx.moveTo(lx, py - 5 * s + i * 1 * s); ctx.lineTo(lx, py + 7 * s); ctx.stroke(); }
  ctx.lineCap = 'butt';
  // kleine Fischtonne vor der Hütte
  ctx.fillStyle = '#5e7a86'; ctx.beginPath(); ctx.ellipse(c.cx - 7 * s, topY + 9 * s, 3 * s, 2 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#9ec6d8'; ctx.beginPath(); ctx.ellipse(c.cx - 7 * s, topY + 8.4 * s, 2 * s, 1.2 * s, 0, 0, 7); ctx.fill();
  return { cx: c.cx, topY };
}

function drawFarm(gx, gy, baseLift) {
  const s = cam.scale, wall = '#c9a96f', roof = '#c2a24a';   // Lehmwand + Strohdach
  const h = 13;
  const c = isoCorners(gx, gy, baseLift, h);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.06)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.22)); gSE.addColorStop(1, shade(wall, -0.38));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  // dunkles Scheunentor
  const db = lerp(c.S, c.E, 0.5), dt = lerp(c.St, c.Et, 0.5);
  ctx.fillStyle = '#3a2a18';
  poly([lerp(db, c.S, 0.32), lerp(db, c.E, 0.32), lerp(dt, c.Et, 0.32), lerp(dt, c.St, 0.32)]);
  // Strohdach (warmes Walmdach in Gelbtönen)
  const topY = hipRoof(c, roof, 8, false);
  // Strohstruktur: feine Halmlinien auf dem Dach
  ctx.strokeStyle = 'rgba(150,120,40,0.4)'; ctx.lineWidth = Math.max(1, 0.7 * s);
  for (let i = 0; i < 4; i++) { const yy = topY + (2 + i * 2.4) * s; ctx.beginPath(); ctx.moveTo(c.cx - (10 - i * 2) * s, yy); ctx.lineTo(c.cx + (10 - i * 2) * s, yy); ctx.stroke(); }
  // Heugarben im Hof davor
  for (const [hx, hy, r] of [[-7, 9, 2.6], [-2, 11, 2.2]]) {
    ctx.fillStyle = '#d9bc5e'; ctx.beginPath(); ctx.ellipse(c.cx + hx * s, topY + hy * s, r * s, r * 0.7 * s, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b3922f'; ctx.lineWidth = Math.max(1, 0.6 * s);
    ctx.beginPath(); ctx.moveTo(c.cx + (hx - r * 0.7) * s, topY + hy * s); ctx.lineTo(c.cx + (hx + r * 0.7) * s, topY + hy * s); ctx.stroke();
  }
  return { cx: c.cx, topY };
}

// ===== Rohstoff-Abbau & Lager =====

// kleiner isometrischer Würfel (Stein-/Marmorblock), Boden-Mitte bei (cx,by)
function miniCube(cx, by, w, hgt, top, left, right) {
  const hh = w * 0.5;
  const Bb = { x: cx, y: by + hh }, Rb = { x: cx + w, y: by }, Lb = { x: cx - w, y: by };
  const Bt = { x: cx, y: by + hh - hgt }, Rt = { x: cx + w, y: by - hgt }, Lt = { x: cx - w, y: by - hgt }, Tt = { x: cx, y: by - hh - hgt };
  ctx.fillStyle = left;  poly([Lb, Bb, Bt, Lt]);
  ctx.fillStyle = right; poly([Bb, Rb, Rt, Bt]);
  ctx.fillStyle = top;   poly([Tt, Rt, Bt, Lt]);
  ctx.strokeStyle = 'rgba(40,34,24,.25)'; ctx.lineWidth = Math.max(1, 0.6 * cam.scale);
  ctx.beginPath(); ctx.moveTo(Bb.x, Bb.y); ctx.lineTo(Bt.x, Bt.y); ctx.stroke();
}

// Holzfäller: niedrige Blockhütte mit Holzstapel & Hackklotz
function drawWoodcutter(gx, gy, baseLift) {
  const s = cam.scale, wall = '#7a5733', roof = '#5e7c3e';
  const c = isoCorners(gx, gy, baseLift, 12);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.22)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wall, 0.08)); gSW.addColorStop(1, shade(wall, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);
  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wall, -0.20)); gSE.addColorStop(1, shade(wall, -0.36));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);
  wallBrickLines(c.W, c.S, c.Wt, c.St, 3, 'rgba(40,26,12,0.5)', s);   // Blockbohlen
  wallBrickLines(c.S, c.E, c.St, c.Et, 3, 'rgba(30,18,8,0.55)', s);
  const topY = hipRoof(c, roof, 8, false);
  // Holzstapel im Hof (Stirnseiten der Scheite)
  const px = c.cx - 7 * s, py = topY + 10 * s;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
    const x = px + i * 3.0 * s + (r % 2) * 1.5 * s, y = py - r * 2.4 * s;
    ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.arc(x, y, 1.7 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#caa06a'; ctx.beginPath(); ctx.arc(x, y, 0.8 * s, 0, 7); ctx.fill();
  }
  // Hackklotz mit Axt
  const kx = c.cx + 7 * s, ky = topY + 10 * s;
  ctx.fillStyle = '#6e4a2a'; ctx.beginPath(); ctx.ellipse(kx, ky, 2.4 * s, 1.5 * s, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(1.4, 1.7 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(kx, ky - 1 * s); ctx.lineTo(kx + 3 * s, ky - 6 * s); ctx.stroke();
  ctx.fillStyle = '#c9c4ba'; ctx.beginPath(); ctx.moveTo(kx + 3 * s, ky - 6.5 * s); ctx.lineTo(kx + 5.5 * s, ky - 6 * s); ctx.lineTo(kx + 3.5 * s, ky - 4.2 * s); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'butt';
  return { cx: c.cx, topY };
}

// Steinbruch / Marmorbruch: ausgehobene Grube mit Abraumrand, zugeschnittenen Blöcken & Holzderrick
function drawQuarry(gx, gy, baseLift, marble) {
  const s = cam.scale;
  const rim = marble ? '#b9b09c' : '#8d8884';
  const bTop = marble ? '#e9e4d9' : '#9a948a', bLeft = marble ? '#cdc8bd' : '#6f6a62', bRight = marble ? '#bdb8ad' : '#5e5a52';
  const g0 = isoCorners(gx, gy, baseLift, 0), gr = isoCorners(gx, gy, baseLift, 4);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.18)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetX = 8 * s; ctx.shadowOffsetY = 4 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([g0.W, g0.S, g0.E, g0.N]); ctx.restore();
  const gSW = ctx.createLinearGradient(g0.W.x, gr.Wt.y, g0.S.x, g0.S.y);
  gSW.addColorStop(0, shade(rim, -0.04)); gSW.addColorStop(1, shade(rim, -0.18));
  ctx.fillStyle = gSW; poly([g0.W, g0.S, gr.St, gr.Wt]);
  const gSE = ctx.createLinearGradient(g0.S.x, gr.St.y, g0.E.x, g0.E.y);
  gSE.addColorStop(0, shade(rim, -0.24)); gSE.addColorStop(1, shade(rim, -0.40));
  ctx.fillStyle = gSE; poly([g0.S, g0.E, gr.Et, gr.St]);
  // Grubensohle (eingelassen)
  const ctr = { x: gr.cx, y: gr.cy + 1 * s };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.74, y: ctr.y + (p.y - ctr.y) * 0.74 + 1 * s });
  ctx.fillStyle = marble ? '#cfcabf' : '#5e5a52'; poly([I(gr.Nt), I(gr.Et), I(gr.St), I(gr.Wt)]);
  // zugeschnittene Blöcke
  miniCube(gr.cx - 3 * s, gr.cy + 3 * s, 3.0 * s, 3.0 * s, bTop, bLeft, bRight);
  miniCube(gr.cx + 3 * s, gr.cy + 3.6 * s, 3.0 * s, 3.0 * s, bTop, bLeft, bRight);
  miniCube(gr.cx, gr.cy + 1 * s, 3.0 * s, 3.6 * s, bTop, bLeft, bRight);
  // Holzderrick (Hebebock) über der Grube
  const ax = gr.cx + 5 * s, ay = gr.Nt.y + 2 * s;
  ctx.strokeStyle = '#6e4a2a'; ctx.lineWidth = Math.max(1.6, 2 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax - 4 * s, ay + 8 * s); ctx.lineTo(ax, ay - 6 * s); ctx.lineTo(ax + 4 * s, ay + 8 * s); ctx.stroke();
  ctx.lineWidth = Math.max(1, 1 * s); ctx.beginPath(); ctx.moveTo(ax, ay - 6 * s); ctx.lineTo(ax + 2 * s, ay - 1 * s); ctx.stroke();
  ctx.lineCap = 'butt';
  return { cx: gr.cx, topY: gr.Nt.y };
}

// Lagerhaus-Bucht (1 von 4 Feldern): Holzdielen-Plattform, Eckpfosten, Waren je Rohstoff
function drawWarehouse(gx, gy, baseLift) {
  const s = cam.scale;
  const tile = (grid[gy] && grid[gy][gx]) ? grid[gy][gx] : null;
  const bay = tile ? (tile.bay || 0) : 0;
  let mst = tile;
  if (tile && tile.wh) { const a = tile.wh; if (grid[a[1]] && grid[a[1]][a[0]]) mst = grid[a[1]][a[0]]; }
  const c = isoCorners(gx, gy, baseLift, 3);
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.16)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetX = 7 * s; ctx.shadowOffsetY = 4 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([c.W, c.S, c.E, c.N]); ctx.restore();
  // niedrige Sockelwände
  const wall = '#cdb78c';
  ctx.fillStyle = shade(wall, -0.12); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.30); poly([c.S, c.E, c.Et, c.St]);
  // Dielenboden der Bucht
  ctx.fillStyle = (bay === 3) ? '#b59b6b' : '#caa674'; poly([c.Nt, c.Et, c.St, c.Wt]);
  ctx.strokeStyle = 'rgba(80,55,25,.4)'; ctx.lineWidth = Math.max(1, 0.7 * s);
  for (let t = 0.25; t < 1; t += 0.25) { const a = lerp(c.Wt, c.Nt, t), b = lerp(c.St, c.Et, t); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  // Eckpfosten + Querbalken (verbinden die 4 Buchten optisch zu einem Hof)
  const postH = 13 * s;
  for (const p of [c.Nt, c.Et, c.St, c.Wt]) {
    ctx.strokeStyle = '#6e4a2a'; ctx.lineWidth = Math.max(2, 2.4 * s); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - postH); ctx.stroke(); ctx.lineCap = 'butt';
  }
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(1.4, 1.8 * s);
  for (const [a, b] of [[c.Nt, c.Et], [c.Nt, c.Wt]]) { ctx.beginPath(); ctx.moveTo(a.x, a.y - postH); ctx.lineTo(b.x, b.y - postH); ctx.stroke(); }
  // Waren je Bucht (Höhe des Stapels ~ Lagerbestand)
  const cap = (typeof WH_CAP !== 'undefined') ? WH_CAP : 24;
  const amt = bay === 0 ? ((mst && mst.wood) || 0) : bay === 1 ? ((mst && mst.stone) || 0) : bay === 2 ? ((mst && mst.marble) || 0) : 0;
  const n = Math.min(6, Math.ceil(amt / cap * 6));
  const bx = c.cx, by = c.cy + 2 * s;
  if (bay === 0) {                                   // Holz: gestapelte Scheite
    for (let k = 0; k < n; k++) { const row = k % 3, lv = (k / 3) | 0;
      const x = bx + (row - 1) * 3.0 * s, y = by - lv * 2.6 * s;
      ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.arc(x, y, 1.7 * s, 0, 7); ctx.fill();
      ctx.fillStyle = '#caa06a'; ctx.beginPath(); ctx.arc(x, y, 0.8 * s, 0, 7); ctx.fill(); }
  } else if (bay === 1 || bay === 2) {               // Stein / Marmor: Blöcke
    const top = bay === 2 ? '#e9e4d9' : '#9a948a', left = bay === 2 ? '#cdc8bd' : '#6f6a62', right = bay === 2 ? '#bdb8ad' : '#5e5a52';
    const pos = [[-2.4, 1.4], [2.4, 1.4], [0, 0.2], [-2.4, -1.2], [2.4, -1.2], [0, -2.4]];
    for (let k = 0; k < n; k++) { const [dx, dy] = pos[k]; miniCube(bx + dx * s, by + dy * s, 3.0 * s, 3.0 * s, top, left, right); }
  } else {                                           // Reserve-Bucht: leere Paletten
    ctx.fillStyle = '#7a5e3a'; ctx.fillRect(bx - 4 * s, by - 1 * s, 8 * s, 1.4 * s);
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(bx - 4 * s, by + 1.4 * s, 8 * s, 1.4 * s);
  }
  return { cx: c.cx, topY: c.Nt.y - postH };
}

// Straßensperre: rot-weißer Schlagbaum quer über die Straße (Läufer kehren um)
function drawRoadblock(gx, gy, baseLift) {
  const s = cam.scale;
  const c = isoCorners(gx, gy, baseLift, 0);
  const ctr = { x: c.bx, y: c.by };
  const L = lerp(c.W, ctr, 0.20), R = lerp(c.E, ctr, 0.20);
  const postH = 12 * s;
  const Lt = { x: L.x, y: L.y - postH }, Rt = { x: R.x, y: R.y - postH };
  // Schatten der Pfosten
  ctx.fillStyle = 'rgba(20,12,4,.18)';
  for (const p of [L, R]) { ctx.beginPath(); ctx.ellipse(p.x + 1.5 * s, p.y + 1 * s, 3 * s, 1.4 * s, 0, 0, 7); ctx.fill(); }
  // Pfosten
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(2, 2.6 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(Lt.x, Lt.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(Rt.x, Rt.y); ctx.stroke();
  ctx.lineCap = 'butt';
  // Querbalken (rot) + weiße Streifen
  ctx.strokeStyle = '#c5332a'; ctx.lineWidth = Math.max(3, 3.6 * s);
  ctx.beginPath(); ctx.moveTo(Lt.x, Lt.y); ctx.lineTo(Rt.x, Rt.y); ctx.stroke();
  ctx.strokeStyle = '#f4f0e8'; ctx.lineWidth = Math.max(3, 3.6 * s);
  const seg = 6;
  for (let i = 0; i < seg; i += 2) { const p0 = lerp(Lt, Rt, i / seg), p1 = lerp(Lt, Rt, (i + 1) / seg);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
  return { cx: c.cx, topY: Math.min(Lt.y, Rt.y) };
}
