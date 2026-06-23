/* TERRA · military.js
   ============================================================
   MILITÄR & BEFESTIGUNG
   ------------------------------------------------------------
   In sich geschlossenes Modul (lädt VOR input.js, damit das Baumenü
   die neuen Gebäude sieht). Es ergänzt:

   • Stadtmauer (wall)  — wird wie eine Straße per Ziehen gebaut, blockiert
     Wanderer & Einheiten. Benachbarte Mauern/Tore/Türme verschmelzen optisch.
   • Wachturm (tower)   — hoher, gezinnter Eckturm (1 Wache), blockiert ebenfalls.
   • Stadttor (gate)    — gezinntes Torhaus mit Durchlass; bleibt begehbar
     (Siedler & Einheiten dürfen hindurch).
   • Kaserne (barracks) — großes 3×3-Kastell. Sobald besetzt, stellt es EINE
     Kohorte (MIL_UNIT_N Legionäre) auf, die im Hof paradiert. Der Spieler
     wählt die Kohorte mit Antippen aus und schickt sie per Antippen eines
     Ziels quer über Land (eigene Landpfad-Suche, keine Straßenbindung).

   Einheiten leben in der globalen Liste `units` (parallel zu `walkers`),
   bewegen sich feldweise mit derselben Interpolation wie die Träger
   (from/dx/dy/prog, Übernahme in commitMoves) und werden tiefensortiert
   im Objekt-Pass gezeichnet. Sie werden — wie Läufer — beim Laden neu
   aufgestellt (keine Save-Änderung nötig).

   Hooks in bestehenden Dateien (additiv, minimal):
     sim.js     → tick(): tickUnits() · commitMoves(): commitUnitMoves() · loop(): Einheiten-prog
     render.js  → drawObjects(): militärische Bauten · Pass 2: Einheiten · Auswahlring
     input.js   → CATS: Kategorie „Militär" · Mauer-Ziehen · Einheiten-Auswahl/Befehl
     system.js  → describeTile(): describeMilitary()
   ============================================================ */

// ---- Kennzahlen ----
const MIL_UNIT_N      = 8;    // Legionäre je Kohorte (Sichtbarkeit im Feld)
const MIL_TRAIN_TICKS = 28;   // Ticks, bis eine besetzte Kaserne ihre Kohorte aufgestellt hat
const MIL_WALL_H      = 17;   // Bauhöhe der Stadtmauer (Welt-px)
const MIL_TOWER_H     = 32;   // Bauhöhe des Wachturms
const MIL_GATE_H      = 22;   // Bauhöhe des Torhauses
const MIL_MARS        = '#9c3424';  // Mars-Rot (Banner / Tünche / Kohorten-Akzent)

// ---- Registrierung in den zentralen Tabellen (wie config.js es tut) ----
BUILD.wall     = { label:'Stadtmauer', glyph:'🧱',  cost:8,   up:0, military:true, fort:true };
BUILD.tower    = { label:'Wachturm',   glyph:'🗼',  cost:45,  up:1, military:true, fort:true, jobs:1 };
BUILD.gate     = { label:'Stadttor',   glyph:'🚪',  cost:60,  up:1, military:true, fort:true };
BUILD.barracks = { label:'Kaserne',    glyph:'🛡️', cost:220, up:5, military:true, jobs:6, foot:[3,3] };
LABOR.tower    = [1,2];        // 1 Wache, Priorität wie Forum/Tempel
LABOR.barracks = [6,2];        // 6 Mann Stammbesatzung
B3D.barracks   = { wcol:MIL_MARS };
B3D.tower      = { wcol:MIL_MARS };
// Befestigung & Militär im Baumenü vor 'Abriss' einsortieren
if (typeof ORDER !== 'undefined') ORDER.splice(ORDER.indexOf('raze'), 0, 'wall','tower','gate','barracks');

// Welche Zelltypen sind militärische Bauten (für Render-/Beschreibungs-Weichen)?
const MIL_BUILDING = { wall:true, tower:true, gate:true, barracks:true };

// ============================================================
//  EINHEITEN-ZUSTAND
// ============================================================
let units = [];          // aktive Kohorten (parallel zu walkers)
let selectedUnit = null; // aktuell ausgewählte Kohorte (Befehlsmodus)

// Begehbares Marschland: flaches/erhöhtes Bauland (kein Wasser/Berg/Fels/Marmor)
// und entweder frei, Straße oder ein Tor. Mauern, Türme & Gebäude blockieren.
function milWalkable(x, y) {
  if (!inBounds(x, y)) return false;
  const t = grid[y][x], td = TERR[t.terr] || TERR.grass;
  if (td.build === false) return false;                 // Wasser/Berg/Fels/Marmor
  const b = t.type;
  return b === 'empty' || b === 'road' || b === 'gate';  // frei · Straße · Tor (Mauer/Turm/Gebäude blocken)
}

// nächstgelegenes begehbares Ziel finden (falls auf ein Gebäude/Mauer getippt wird)
function milSnapTarget(x, y) {
  if (milWalkable(x, y)) return [x, y];
  let best = null, bd = 1e9;
  for (let r = 1; r <= 3 && !best; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (!milWalkable(nx, ny)) continue;
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < bd) { bd = d; best = [nx, ny]; }
    }
  }
  return best;
}

// BFS über begehbares Land vom Start- zum Zielfeld (keine Straßenbindung)
function findLandPath(sx, sy, tx, ty) {
  if (!milWalkable(tx, ty)) return null;
  if (sx === tx && sy === ty) return [[sx, sy]];
  const q = [[sx, sy]], prev = {}, seen = new Set([sx + ',' + sy]);
  prev[sx + ',' + sy] = null;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) {
      const path = []; let cur = [x, y];
      while (cur) { path.unshift(cur); cur = prev[cur[0] + ',' + cur[1]]; }
      return path;
    }
    for (const [nx, ny] of neighbors(x, y)) {
      if (!milWalkable(nx, ny)) continue;
      const k = nx + ',' + ny;
      if (seen.has(k)) continue;
      seen.add(k); prev[k] = [x, y]; q.push([nx, ny]);
    }
  }
  return null;   // Ziel nicht erreichbar (z.B. von Mauern eingeschlossen)
}

// Kohorte auf ein Feld befehligen (Spieler-Antippen)
function commandUnit(u, gx, gy) {
  const snap = milSnapTarget(gx, gy);
  if (!snap) { if (typeof flash === 'function') flash('Dorthin führt kein Weg'); return false; }
  const path = findLandPath(Math.round(u.x), Math.round(u.y), snap[0], snap[1]);
  if (!path || path.length < 2) {
    if (typeof flash === 'function') flash(path ? 'Die Kohorte steht bereits dort' : 'Kein Landweg zum Ziel');
    return false;
  }
  u.path = path; u.pi = 0; u.target = [snap[0], snap[1]];
  if (typeof flash === 'function') flash('Kohorte marschiert ⚔');
  if (typeof sfxClick === 'function') sfxClick();
  return true;
}

// Einheit unter einem (Gitter-)Feld finden — für die Auswahl per Antippen
function unitAt(gx, gy) {
  for (const u of units) if (Math.round(u.x) === gx && Math.round(u.y) === gy) return u;
  // etwas Toleranz: auch direkte Nachbarfelder akzeptieren (Finger-Treffer)
  for (const u of units) if (Math.abs(Math.round(u.x) - gx) + Math.abs(Math.round(u.y) - gy) <= 1) return u;
  return null;
}

// stabile Formations-Versätze (kleine Gitterabstände um den Truppenmittelpunkt)
function milFormation(n) {
  const out = [], cols = Math.min(4, n), rows = Math.ceil(n / cols);
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols && i < n; c++, i++) {
    const ox = (c - (cols - 1) / 2) * 0.20;
    const oy = (r - (rows - 1) / 2) * 0.20;
    out.push({ ox, oy });
  }
  return out;
}

// freies begehbares Feld neben dem Kaserne-Footprint (Aufstellungsplatz)
function barracksMuster(ax, ay, foot) {
  const [w, h] = foot;
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
    const inside = (i >= 0 && i < w && j >= 0 && j < h);
    if (inside) continue;
    const x = ax + i, y = ay + j;
    if (milWalkable(x, y)) return [x, y];
  }
  return null;
}

// ---- Tick: Kasernen stellen Kohorten auf, Einheiten marschieren ----
function tickUnits() {
  if (typeof units === 'undefined') return;

  // 1) Kasernen aufstellen / pflegen
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const c = grid[y][x];
    if (c.type !== 'barracks' || !c.master) continue;        // nur Anker-Kachel
    const has = units.some(u => u.home && u.home[0] === x && u.home[1] === y);
    if (has) { c.milTrain = 0; continue; }
    if (!c.staffed) { c.milTrain = 0; continue; }            // unbesetzt -> keine Aufstellung
    c.milTrain = (c.milTrain || 0) + 1;
    if (c.milTrain >= MIL_TRAIN_TICKS) {
      c.milTrain = 0;
      const def = BUILD.barracks, foot = def.foot;
      const m = barracksMuster(x, y, foot);
      if (m) {
        units.push({
          x: m[0], y: m[1], home: [x, y], n: MIL_UNIT_N,
          path: null, pi: 0, target: null,
          from: null, dx: 0, dy: 0, tx: null, ty: null, prog: 0,
          form: milFormation(MIL_UNIT_N), ph: Math.random() * 6.283
        });
        if (typeof flash === 'function') flash('🛡️ Eine neue Kohorte ist aufgestellt');
      }
    }
  }

  // 2) verwaiste Einheiten (Kaserne abgerissen) auflösen
  for (let i = units.length - 1; i >= 0; i--) {
    const h = units[i].home;
    if (!h || !inBounds(h[0], h[1]) || grid[h[1]][h[0]].type !== 'barracks') {
      if (selectedUnit === units[i]) selectedUnit = null;
      units.splice(i, 1);
    }
  }

  // 3) Marsch: ein Feld je Tick entlang des Landpfads (Interpolation via prog)
  for (const u of units) {
    if (!u.path) { u.dx = 0; u.dy = 0; u.from = null; continue; }
    if (u.pi >= u.path.length - 1) { u.path = null; u.target = null; u.dx = 0; u.dy = 0; u.from = null; continue; }
    const [nx, ny] = u.path[u.pi + 1];
    u.dx = nx - u.x; u.dy = ny - u.y; u.from = [u.x, u.y];
    u.prog = 0; u.tx = nx; u.ty = ny; u.pi++;
  }
}

// Positionen nach der Bewegung übernehmen (von commitMoves aufgerufen)
function commitUnitMoves() {
  if (typeof units === 'undefined') return;
  for (const u of units) {
    if (u.tx != null) { u.x = u.tx; u.y = u.ty; u.tx = u.ty = null; u.dx = 0; u.dy = 0; }
  }
}

// Render/Loop dürfen die Liste lesen
function getUnits() { return (typeof units !== 'undefined') ? units : []; }

// ============================================================
//  ZEICHNEN — Befestigung
// ============================================================
// Hilfsfunktion: gezinnte Krone (Merlons) entlang einer oberen Kante P0->P1
function merlons(P0, P1, count, col, hcol, depth) {
  const s = cam.scale, mh = (depth || 3.2) * s;
  for (let i = 0; i < count; i++) {
    if (i % 2 === 1) continue;                       // jede zweite Lücke = Schießscharte
    const a = lerp(P0, P1, i / count), b = lerp(P0, P1, (i + 0.9) / count);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x, b.y - mh); ctx.lineTo(a.x, a.y - mh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hcol;                            // helle Oberkante
    ctx.fillRect(a.x, a.y - mh, b.x - a.x, Math.max(1, 0.8 * s));
  }
}

// gemeinsame Quaderzeichnung (zwei Frontflächen + Deckfläche), liefert Eckhilfen
function milBox(gx, gy, baseLift, height, wall) {
  const s = cam.scale;
  const b0 = isoCorners(gx, gy, baseLift, 0), bt = isoCorners(gx, gy, baseLift, height);
  // Bodenschatten
  ctx.save();
  ctx.shadowColor = 'rgba(20,12,5,0.28)'; ctx.shadowBlur = 9 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();
  // SW-Wand (hell)
  const gSW = ctx.createLinearGradient(b0.W.x, bt.Wt.y, b0.S.x, b0.S.y);
  gSW.addColorStop(0, shade(wall, 0.05)); gSW.addColorStop(1, shade(wall, -0.14));
  ctx.fillStyle = gSW; poly([b0.W, b0.S, bt.St, bt.Wt]);
  // SE-Wand (dunkel)
  const gSE = ctx.createLinearGradient(b0.S.x, bt.St.y, b0.E.x, b0.E.y);
  gSE.addColorStop(0, shade(wall, -0.24)); gSE.addColorStop(1, shade(wall, -0.40));
  ctx.fillStyle = gSE; poly([b0.S, b0.E, bt.Et, bt.St]);
  if (typeof wallBrickLines === 'function') {
    wallBrickLines(b0.W, b0.S, bt.Wt, bt.St, 3, 'rgba(60,46,30,0.30)', s);
    wallBrickLines(b0.S, b0.E, bt.St, bt.Et, 3, 'rgba(45,34,22,0.34)', s);
  }
  // vordere Vertikalkante betonen
  ctx.strokeStyle = 'rgba(30,20,10,0.30)'; ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath(); ctx.moveTo(b0.S.x, b0.S.y); ctx.lineTo(bt.St.x, bt.St.y); ctx.stroke();
  // Deckfläche
  ctx.fillStyle = shade(wall, 0.10); poly([bt.Nt, bt.Et, bt.St, bt.Wt]);
  return { b0, bt };
}

function drawWall(gx, gy, baseLift) {
  const stone = '#b9b1a1';
  const { bt } = milBox(gx, gy, baseLift, MIL_WALL_H, stone);
  // Wehrgang andeuten + Zinnen auf den beiden Frontkanten
  ctx.fillStyle = shade(stone, -0.06); poly([bt.Nt, bt.Et, bt.St, bt.Wt]);
  merlons(bt.Wt, bt.St, 4, shade(stone, 0.04), shade(stone, 0.18), 3.0);
  merlons(bt.St, bt.Et, 4, shade(stone, -0.10), shade(stone, 0.10), 3.0);
  return { cx: bt.cx, topY: bt.Nt.y - 3 * cam.scale };
}

function drawTower(gx, gy, baseLift) {
  const stone = '#aaa294';
  const { bt } = milBox(gx, gy, baseLift, MIL_TOWER_H, stone);
  // ringsum gezinnte Krone (vier Kanten, sichtbar v.a. die Frontseiten)
  merlons(bt.Wt, bt.St, 4, shade(stone, 0.04), shade(stone, 0.20), 3.6);
  merlons(bt.St, bt.Et, 4, shade(stone, -0.10), shade(stone, 0.10), 3.6);
  merlons(bt.Nt, bt.Wt, 4, shade(stone, -0.04), shade(stone, 0.12), 3.6);
  merlons(bt.Et, bt.Nt, 4, shade(stone, -0.16), shade(stone, 0.06), 3.6);
  // Fahnenmast mit Mars-Wimpel auf der Turmmitte
  const s = cam.scale, top = { x: bt.cx, y: (bt.Nt.y + bt.St.y) / 2 };
  ctx.strokeStyle = '#5a4630'; ctx.lineWidth = Math.max(1, 1.1 * s);
  ctx.beginPath(); ctx.moveTo(top.x, top.y - 1 * s); ctx.lineTo(top.x, top.y - 11 * s); ctx.stroke();
  const fl = Math.sin(animT * 4) * 1.4 * s;
  ctx.fillStyle = MIL_MARS; ctx.beginPath();
  ctx.moveTo(top.x, top.y - 11 * s); ctx.lineTo(top.x + 7 * s, top.y - 9 * s + fl);
  ctx.lineTo(top.x, top.y - 7 * s); ctx.closePath(); ctx.fill();
  // schmale Schießscharte vorn
  ctx.fillStyle = 'rgba(25,18,10,0.6)';
  const sl = lerp(bt.St, { x: (bt.St.x + bt.Et.x) / 2, y: (bt.St.y + bt.Et.y) / 2 }, 0.2);
  ctx.fillRect(sl.x - 0.8 * s, sl.y - MIL_TOWER_H * 0.5 * s, 1.6 * s, MIL_TOWER_H * 0.28 * s);
  return { cx: bt.cx, topY: top.y - 11 * s };
}

function drawGate(gx, gy, baseLift) {
  const stone = '#c2b141';   // sandsteiniger Torbau, etwas wärmer
  const wall = '#bdb4a3';
  const s = cam.scale;
  const b0 = isoCorners(gx, gy, baseLift, 0), bt = isoCorners(gx, gy, baseLift, MIL_GATE_H);
  // Schatten
  ctx.save();
  ctx.shadowColor = 'rgba(20,12,5,0.28)'; ctx.shadowBlur = 9 * s; ctx.shadowOffsetX = 11 * s; ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();
  // zwei Pfeiler (links/rechts) statt geschlossener Front -> Durchlass
  const drawPier = (ub0, ub1, dark) => {
    const wcol = dark ? shade(wall, -0.30) : shade(wall, -0.06);
    const p0b = lerp(b0.W, b0.S, ub0), p1b = lerp(b0.W, b0.S, ub1);
    const p0t = lerp(bt.Wt, bt.St, ub0), p1t = lerp(bt.Wt, bt.St, ub1);
    ctx.fillStyle = wcol; ctx.beginPath();
    ctx.moveTo(p0b.x, p0b.y); ctx.lineTo(p1b.x, p1b.y); ctx.lineTo(p1t.x, p1t.y); ctx.lineTo(p0t.x, p0t.y);
    ctx.closePath(); ctx.fill();
  };
  // SW-Seite: zwei Pfeiler mit dunkler Durchfahrt dazwischen
  drawPier(0.00, 0.30, false);
  drawPier(0.70, 1.00, false);
  // dunkle Toröffnung (Durchfahrt) auf der SW-Front
  const oa = lerp(b0.W, b0.S, 0.34), ob = lerp(b0.W, b0.S, 0.66);
  const ot = lerp(bt.Wt, bt.St, 0.5);
  ctx.fillStyle = 'rgba(28,20,12,0.78)';
  ctx.beginPath();
  ctx.moveTo(oa.x, oa.y); ctx.lineTo(ob.x, ob.y);
  ctx.lineTo(ob.x, ob.y - MIL_GATE_H * 0.62 * s);
  ctx.quadraticCurveTo(ot.x, ot.y - MIL_GATE_H * 0.20 * s, oa.x, oa.y - MIL_GATE_H * 0.62 * s);
  ctx.closePath(); ctx.fill();
  // SE-Seite als geschlossene dunkle Wand (Tiefe)
  const gSE = ctx.createLinearGradient(b0.S.x, bt.St.y, b0.E.x, b0.E.y);
  gSE.addColorStop(0, shade(wall, -0.26)); gSE.addColorStop(1, shade(wall, -0.42));
  ctx.fillStyle = gSE; poly([b0.S, b0.E, bt.Et, bt.St]);
  // Querbalken (Torsturz) + gezinnte Krone über der Front
  const lintelB0 = lerp(bt.Wt, bt.St, 0.0), lintelB1 = lerp(bt.Wt, bt.St, 1.0);
  ctx.fillStyle = shade(stone, -0.05); poly([bt.Nt, bt.Et, bt.St, bt.Wt]);
  ctx.fillStyle = shade(stone, -0.10);
  ctx.fillRect(lintelB0.x, lintelB0.y - 1 * s, lintelB1.x - lintelB0.x, 2 * s);
  merlons(bt.Wt, bt.St, 4, shade(stone, 0.02), shade(stone, 0.18), 3.2);
  merlons(bt.St, bt.Et, 4, shade(stone, -0.12), shade(stone, 0.06), 3.2);
  return { cx: bt.cx, topY: bt.Nt.y - 3 * s };
}

// ---- Kaserne / Kastell (3×3) ----
function drawBarracks(gx, gy, baseLift) {
  const def = BUILD.barracks, [w, h] = def.foot;
  const s = cam.scale, stone = '#b7af9e', sand = '#cdb98a';
  const rampH = 14, hallH = 26, roofH = 13;
  const g = footCorners(gx, gy, w, h, baseLift, 0);

  // (u,v) in [0,1]² auf die Footprint-Raute
  const P = (u, v) => { const a = lerp(g.N, g.E, u), b = lerp(g.W, g.S, u); return lerp(a, b, v); };
  const raise = (p, dh) => ({ x: p.x, y: p.y - dh * s });

  // Bodenschatten
  ctx.save();
  ctx.shadowColor = 'rgba(20,12,5,0.26)'; ctx.shadowBlur = 12 * s; ctx.shadowOffsetX = 13 * s; ctx.shadowOffsetY = 8 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([g.N, g.E, g.S, g.W]); ctx.restore();

  // Exerzierplatz (Sandboden)
  ctx.fillStyle = sand; poly([g.N, g.E, g.S, g.W]);
  ctx.strokeStyle = 'rgba(120,96,56,0.25)'; ctx.lineWidth = Math.max(1, 0.7 * s);
  for (let k = 1; k < 4; k++) { const a = P(k / 4, 0), b = P(k / 4, 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

  // umlaufende Wallmauer (vier Seiten) als angehobenes Band
  const ring = [g.N, g.E, g.S, g.W];
  const rt = ring.map(p => raise(p, rampH));
  // SW-Außenwand (W->S) und SE-Außenwand (S->E) als Frontflächen
  const face = (A, B, At, Bt, col) => { ctx.fillStyle = col; poly([A, B, Bt, At]); };
  face(g.W, g.S, raise(g.W, rampH), raise(g.S, rampH), shade(stone, -0.06));
  face(g.S, g.E, raise(g.S, rampH), raise(g.E, rampH), shade(stone, -0.26));
  // Mauerkrone (Gesims) + Zinnen an den beiden Frontkanten
  ctx.strokeStyle = shade(stone, 0.16); ctx.lineWidth = Math.max(1.2, 1.6 * s);
  ctx.beginPath();
  rt.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  merlons(raise(g.W, rampH), raise(g.S, rampH), 6, shade(stone, 0.04), shade(stone, 0.18), 2.6);
  merlons(raise(g.S, rampH), raise(g.E, rampH), 6, shade(stone, -0.12), shade(stone, 0.06), 2.6);

  // Ecktürmchen an den vier Footprint-Ecken
  for (const corner of ring) {
    const tb = raise(corner, 0), tt = raise(corner, rampH + 7);
    ctx.fillStyle = shade(stone, -0.10);
    ctx.fillRect(tb.x - 2.4 * s, tt.y, 4.8 * s, (rampH + 7) * s);
    ctx.fillStyle = shade(stone, 0.10);
    ctx.fillRect(tb.x - 2.4 * s, tt.y, 4.8 * s, 1.6 * s);
  }

  // Haupthalle (Principia) in der Hofmitte — kleiner Kasten mit rotem Walmdach
  const cN = P(0.30, 0.30), cE = P(0.70, 0.30), cS = P(0.70, 0.70), cW = P(0.30, 0.70);
  const lift = h => [cN, cE, cS, cW].map(p => raise(p, h));
  const hb = [cN, cE, cS, cW], ht = lift(hallH);
  // Wände
  ctx.fillStyle = shade('#d8c39a', -0.02); poly([hb[3], hb[2], ht[2], ht[3]]);  // W->S
  ctx.fillStyle = shade('#d8c39a', -0.22); poly([hb[2], hb[1], ht[1], ht[2]]);  // S->E
  // rotes Walmdach
  const apex = { x: (ht[0].x + ht[1].x + ht[2].x + ht[3].x) / 4, y: (ht[0].y + ht[1].y + ht[2].y + ht[3].y) / 4 - roofH * s };
  ctx.fillStyle = shade(MIL_MARS, -0.30); poly([ht[0], ht[3], apex]); poly([ht[0], ht[1], apex]);
  ctx.fillStyle = shade(MIL_MARS, 0.08); poly([ht[3], ht[2], apex]);
  ctx.fillStyle = shade(MIL_MARS, -0.14); poly([ht[2], ht[1], apex]);
  if (typeof tileFace === 'function') { tileFace(ht[3], ht[2], apex, shade(MIL_MARS, 0.08)); tileFace(ht[2], ht[1], apex, shade(MIL_MARS, -0.14)); }

  // zwei stehende Wachen am Hoftor (immer sichtbar — „man sieht Soldaten")
  milSoldier(P(0.5, 0.92).x, P(0.5, 0.92).y - rampH * 0.0, s * 1.0, 1, gx * 3 + gy);
  milSoldier(P(0.32, 0.86).x, P(0.32, 0.86).y, s * 1.0, -1, gx * 7 + gy);

  // Banner (Vexillum) am First
  ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = Math.max(1, 1.1 * s);
  ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(apex.x, apex.y - 12 * s); ctx.stroke();
  ctx.fillStyle = MIL_MARS; ctx.fillRect(apex.x, apex.y - 12 * s, 7 * s, 5 * s);
  ctx.fillStyle = '#e7c54a'; ctx.beginPath(); ctx.arc(apex.x + 3.5 * s, apex.y - 9.5 * s, 1.2 * s, 0, 7); ctx.fill();

  return { cx: g.cx, topY: apex.y - 12 * s };
}

// Dispatch für den Render-Hook in render.js
function drawMilitaryBuilding(gx, gy, baseLift, kind) {
  if (kind === 'wall')     return drawWall(gx, gy, baseLift);
  if (kind === 'tower')    return drawTower(gx, gy, baseLift);
  if (kind === 'gate')     return drawGate(gx, gy, baseLift);
  if (kind === 'barracks') return drawBarracks(gx, gy, baseLift);
  return null;
}

// ============================================================
//  ZEICHNEN — Legionäre & Kohorten
// ============================================================
// Ein Legionär (rote Tunika, Lorica-Andeutung, Scutum-Schild, Helm mit Crista, Pilum)
function milSoldier(px, groundY, s, dir, seed) {
  const ph = (rng2((seed | 0) * 13 + 3, (seed | 0) * 7 + 9)) * 6.283;
  const sw = Math.sin(animT * 6 + ph), bob = Math.abs(Math.cos(animT * 6 + ph)) * 0.7 * s;
  const hipY = groundY - 6 * s + bob, headY = groundY - 11 * s + bob;
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(px, groundY, 4 * s, 1.9 * s, 0, 0, 7); ctx.fill();
  ctx.lineCap = 'round';
  // Beine
  ctx.strokeStyle = '#6a4a30'; ctx.lineWidth = Math.max(1.2, 1.5 * s);
  ctx.beginPath(); ctx.moveTo(px, hipY); ctx.lineTo(px + sw * 2 * s, groundY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, hipY); ctx.lineTo(px - sw * 2 * s, groundY); ctx.stroke();
  // rote Tunika / Körper
  ctx.fillStyle = MIL_MARS; ctx.beginPath();
  ctx.moveTo(px - 2.2 * s, hipY + 0.4 * s); ctx.lineTo(px + 2.2 * s, hipY + 0.4 * s);
  ctx.lineTo(px + 1.5 * s, headY + 2.2 * s); ctx.lineTo(px - 1.5 * s, headY + 2.2 * s); ctx.closePath(); ctx.fill();
  // Lorica-Andeutung (heller Brustpanzer)
  ctx.strokeStyle = 'rgba(220,210,190,0.55)'; ctx.lineWidth = Math.max(1, 0.7 * s);
  ctx.beginPath(); ctx.moveTo(px - 1.6 * s, hipY - 1.6 * s); ctx.lineTo(px + 1.6 * s, hipY - 1.6 * s); ctx.stroke();
  // Pilum (Speer) auf der einen Seite
  const spx = px + dir * 3 * s;
  ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = Math.max(1, 0.9 * s);
  ctx.beginPath(); ctx.moveTo(spx, groundY + 1 * s); ctx.lineTo(spx, headY - 5 * s); ctx.stroke();
  ctx.fillStyle = '#cdd2d8'; ctx.beginPath();
  ctx.moveTo(spx, headY - 5 * s); ctx.lineTo(spx - 1 * s, headY - 3 * s); ctx.lineTo(spx + 1 * s, headY - 3 * s); ctx.closePath(); ctx.fill();
  // Scutum-Schild auf der anderen Seite (rotes Oval mit Buckel)
  const shx = px - dir * 2.6 * s, shy = (hipY + headY) / 2 + 1 * s;
  ctx.fillStyle = shade(MIL_MARS, 0.06); ctx.beginPath(); ctx.ellipse(shx, shy, 1.9 * s, 3.2 * s, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#e7c54a'; ctx.lineWidth = Math.max(1, 0.7 * s); ctx.stroke();
  ctx.fillStyle = '#e7c54a'; ctx.beginPath(); ctx.arc(shx, shy, 0.8 * s, 0, 7); ctx.fill();
  // Kopf + Helm mit roter Crista
  ctx.fillStyle = '#caa07a'; ctx.beginPath(); ctx.arc(px, headY, 1.9 * s, 0, 7); ctx.fill();
  ctx.fillStyle = '#9a9488'; ctx.beginPath(); ctx.arc(px, headY - 0.4 * s, 2 * s, Math.PI, 0); ctx.closePath(); ctx.fill();  // Helm
  ctx.fillStyle = MIL_MARS; ctx.fillRect(px - 0.6 * s, headY - 3.4 * s, 1.2 * s, 2.2 * s);                                  // Crista
  ctx.lineCap = 'butt';
}

// Eine Kohorte: MIL_UNIT_N Legionäre in Formation, tiefensortiert, mit Standarte
function drawUnit(u) {
  const s = cam.scale * 1.15;
  const igx = u.x + (u.dx || 0) * (u.prog || 0);
  const igy = u.y + (u.dy || 0) * (u.prog || 0);
  const dir = (u.dx > 0 || u.dy < 0) ? 1 : -1;
  const form = u.form || milFormation(u.n || MIL_UNIT_N);
  // Soldaten innerhalb der Gruppe nach Bildtiefe sortieren (hinten zuerst)
  const order = form.map((f, i) => ({ f, i, d: f.ox + f.oy })).sort((a, b) => a.d - b.d);
  for (const o of order) {
    const td = TERR[grid[Math.floor(igy)]?.[Math.floor(igx)]?.terr] || TERR.grass;
    const p = project(igx + 0.5 + o.f.ox, igy + 0.5 + o.f.oy);
    const gy0 = p.y - (td.elev || 0) * STEP * s;
    milSoldier(p.x, gy0, s, dir, (o.i + 1) * 17 + Math.floor(igx) * 3 + Math.floor(igy) * 5);
  }
  // Standarte (Signum) in der Mitte hinten
  const c = project(igx + 0.5, igy + 0.5);
  const td = TERR[grid[Math.floor(igy)]?.[Math.floor(igx)]?.terr] || TERR.grass;
  const cy0 = c.y - (td.elev || 0) * STEP * s;
  ctx.strokeStyle = '#caa14a'; ctx.lineWidth = Math.max(1, 1.1 * s);
  ctx.beginPath(); ctx.moveTo(c.x, cy0 - 5 * s); ctx.lineTo(c.x, cy0 - 18 * s); ctx.stroke();
  ctx.fillStyle = '#e7c54a'; ctx.beginPath(); ctx.arc(c.x, cy0 - 18 * s, 1.7 * s, 0, 7); ctx.fill();   // Adler/Knauf
  ctx.fillStyle = MIL_MARS; ctx.fillRect(c.x - 2.6 * s, cy0 - 16 * s, 5.2 * s, 3.2 * s);                // Wimpel
}

// pulsierender Auswahlring unter der gewählten Kohorte
function drawUnitRing(u) {
  if (!u) return;
  const igx = u.x + (u.dx || 0) * (u.prog || 0);
  const igy = u.y + (u.dy || 0) * (u.prog || 0);
  const td = TERR[grid[Math.round(igy)]?.[Math.round(igx)]?.terr] || TERR.grass;
  const off = (td.elev || 0) * STEP * cam.scale;
  const t = project(igx, igy), r = project(igx + 1, igy), b = project(igx + 1, igy + 1), l = project(igx, igy + 1);
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(animT * 2.6));
  ctx.save(); ctx.translate(0, -off);
  ctx.strokeStyle = 'rgba(231,197,74,' + pulse.toFixed(3) + ')';
  ctx.lineWidth = Math.max(2, 2.4 * cam.scale);
  ctx.shadowColor = 'rgba(156,52,36,.55)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(r.x, r.y); ctx.lineTo(b.x, b.y); ctx.lineTo(l.x, l.y); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// ============================================================
//  INFO-PANEL (vom describeTile-Hook in system.js aufgerufen)
// ============================================================
function describeMilitary(x, y) {
  const t = grid[y][x];
  if (t.type === 'wall') {
    return { glyph:'🧱', title:'Stadtmauer', rows:[
      { k:'Funktion', v:'Befestigung — blockiert Wanderer & Feinde' },
      { k:'Bau', v:'wie eine Straße ziehen' },
      { k:'Durchlass', v:'nur über ein Stadttor' },
    ], warns:[] };
  }
  if (t.type === 'tower') {
    return { glyph:'🗼', title:'Wachturm', rows:[
      { k:'Funktion', v:'Hoher Eckturm der Befestigung' },
      { k:'Besatzung', v:'1 Wache' },
      { k:'Wirkung', v:'Sichtpunkt & Mauer-Verstärkung' },
    ], warns:[] };
  }
  if (t.type === 'gate') {
    return { glyph:'🚪', title:'Stadttor', rows:[
      { k:'Funktion', v:'Begehbarer Durchlass in der Mauer' },
      { k:'Verkehr', v:'Siedler, Träger & Kohorten passieren' },
      { k:'Tipp', v:'in eine Mauerlinie setzen' },
    ], warns:[] };
  }
  if (t.type === 'barracks') {
    const a = t.anchor || [x, y];
    const m = inBounds(a[0], a[1]) ? grid[a[1]][a[0]] : t;
    const hasUnit = (typeof units !== 'undefined') && units.some(u => u.home && u.home[0] === a[0] && u.home[1] === a[1]);
    return { glyph:'🛡️', title:'Kaserne', rows:[
      { k:'Funktion', v:'Stellt eine Kohorte ('+MIL_UNIT_N+' Legionäre) auf' },
      { k:'Grundfläche', v:'3×3 Felder' },
      { k:'Besatzung', v:m.staffed ? 'in Dienst' : 'unbesetzt', cls:m.staffed ? 'ok' : 'bad' },
      { k:'Kohorte', v:hasUnit ? 'aufgestellt' : (m.staffed ? 'wird ausgehoben…' : 'keine'), cls:hasUnit ? 'ok' : 'bad' },
      { k:'Befehl', v:'Kohorte antippen → Ziel antippen' },
    ], warns: m.staffed ? [] : ['Keine freien Arbeitskräfte — die Kaserne kann keine Soldaten ausheben.'] };
  }
  return null;
}
