/* TERRA · buildings.js */

// ---- Gezeichnete Iso-Gebäude (Sonne oben-links) ----

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
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
  const rows = 5, col = shade(color, -0.16), amp = 0.9 * cam.scale;
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

function drawForum(gx, gy, baseLift) {
  const s = cam.scale, stone = '#e7ddc6', marble = '#efe7d4';
  const hBase = 6, colH = 18, entH = 4, roofH = 12;
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hBase);
  // Schatten
  ctx.save(); ctx.translate(b0.bx + 7 * s, b0.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.44 * s, 0, 7); ctx.fill(); ctx.restore();
  // Stufenpodest
  ctx.fillStyle = shade(stone, -0.10); poly([b0.W, b0.S, b1.St, b1.Wt]);
  ctx.fillStyle = shade(stone, -0.26); poly([b0.S, b0.E, b1.Et, b1.St]);
  ctx.strokeStyle = 'rgba(60,46,26,.30)'; ctx.lineWidth = 1;                       // Stufenkante
  ctx.beginPath(); ctx.moveTo(b0.W.x, (b0.W.y + b1.Wt.y) / 2); ctx.lineTo(b0.S.x, (b0.S.y + b1.St.y) / 2); ctx.lineTo(b0.E.x, (b0.E.y + b1.Et.y) / 2); ctx.stroke();
  ctx.fillStyle = stone; poly([b1.Nt, b1.Et, b1.St, b1.Wt]);                       // Stylobat-Oberfläche
  // Säulen entlang der beiden vorderen Kanten (SW: Wt->St, SE: St->Et)
  const us = [0.16, 0.5, 0.84];
  for (const u of us) column(lerp(b1.Wt, b1.St, u), colH);                        // SW
  for (let i = us.length - 1; i >= 0; i--) column(lerp(b1.St, b1.Et, us[i]), colH);       // SE (hinten zuerst)
  column(b1.St, colH);                                                         // Ecksäule vorne
  // Gebälk auf den Säulen
  const e2 = isoCorners(gx, gy, baseLift, hBase + colH), e3 = isoCorners(gx, gy, baseLift, hBase + colH + entH);
  ctx.fillStyle = shade(stone, -0.04); poly([e2.Wt, e2.St, e3.St, e3.Wt]);
  ctx.fillStyle = shade(stone, -0.20); poly([e2.St, e2.Et, e3.Et, e3.St]);
  // Dach + Giebel (Tympanon)
  const apex = { x: (e3.Nt.x + e3.Et.x + e3.St.x + e3.Wt.x) / 4, y: (e3.Nt.y + e3.Et.y + e3.St.y + e3.Wt.y) / 4 - roofH * s };
  ctx.fillStyle = shade(marble, -0.30); poly([e3.Nt, e3.Wt, apex]); poly([e3.Nt, e3.Et, apex]);
  ctx.fillStyle = shade(marble, 0.06); poly([e3.Wt, e3.St, apex]);                // SW Giebelfläche
  ctx.fillStyle = shade(marble, -0.10); poly([e3.St, e3.Et, apex]);               // SE Giebelfläche
  // Tympanon-Vertiefung vorne (SE) + Gesims
  const ctr = { x: (e3.St.x + e3.Et.x + apex.x) / 3, y: (e3.St.y + e3.Et.y + apex.y) / 3 };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.62, y: ctr.y + (p.y - ctr.y) * 0.62 });
  ctx.fillStyle = shade(marble, -0.20); poly([I(e3.St), I(e3.Et), I(apex)]);
  ctx.strokeStyle = 'rgba(40,30,16,.35)'; ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath(); ctx.moveTo(e3.Wt.x, e3.Wt.y); ctx.lineTo(e3.St.x, e3.St.y); ctx.lineTo(e3.Et.x, e3.Et.y); ctx.stroke();
  return { cx: b0.cx, topY: apex.y };
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

function drawClaypit(gx, gy, baseLift) {
  const s = cam.scale, rim = '#9c7b4e';
  const g0 = isoCorners(gx, gy, baseLift, 0), gr = isoCorners(gx, gy, baseLift, 3);
  ctx.fillStyle = shade(rim, -0.10); poly([g0.W, g0.S, gr.St, gr.Wt]);              // Randwall SW
  ctx.fillStyle = shade(rim, -0.26); poly([g0.S, g0.E, gr.Et, gr.St]);              // Randwall SE
  ctx.fillStyle = rim; poly([gr.Nt, gr.Et, gr.St, gr.Wt]);                          // Rand-Oberfläche
  const ctr = { x: (gr.Nt.x + gr.St.x) / 2, y: (gr.Nt.y + gr.St.y) / 2 + 2 * s };               // eingelassene Grube
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.62, y: ctr.y + (p.y - ctr.y) * 0.62 + 2 * s });
  ctx.fillStyle = '#6f5433'; poly([I(gr.Nt), I(gr.Et), I(gr.St), I(gr.Wt)]);
  ctx.fillStyle = '#a9713f';                                                     // Lehmhaufen
  for (const [dx, dy] of [[-4, 1], [5, 2], [1, -3]]) {
    ctx.beginPath(); ctx.ellipse(ctr.x + dx * s, ctr.y + dy * s, 3.4 * s, 2 * s, 0, 0, 7); ctx.fill();
  }
  return { cx: gr.cx, topY: gr.Nt.y };
}

function drawPottery(gx, gy, baseLift) {
  const s = cam.scale, wall = '#caa46e', roof = '#7a4a2c';
  const c = isoCorners(gx, gy, baseLift, 13);
  ctx.save(); ctx.translate(c.bx + 7 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.4 * s, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = shade(wall, -0.08); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.28); poly([c.S, c.E, c.Et, c.St]);
  const kb = lerp(c.S, c.E, 0.5), kt = lerp(c.St, c.Et, 0.5);                          // Brennofen-Kuppel (SE)
  const kx = (kb.x + kt.x) / 2, ky = (kb.y + kt.y) / 2 + 1 * s;
  ctx.fillStyle = '#8a5230'; ctx.beginPath(); ctx.arc(kx, ky, 5.5 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8923c'; ctx.beginPath(); ctx.arc(kx, ky, 2.3 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
  const topY = hipRoof(c, roof, 10, false);
  ctx.fillStyle = 'rgba(205,205,205,.45)';                                       // Rauch
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(c.cx + (i - 1) * 2 * s, topY - (5 + i * 5) * s, (2 + i) * s, 0, 7); ctx.fill(); }
  return { cx: c.cx, topY };
}

function drawWell(gx, gy, baseLift) {
  const s = cam.scale, stone = '#b9b3a6';
  const c = isoCorners(gx, gy, baseLift, 0);
  const ctr = { x: c.bx, y: c.by };
  const I  = p => ({ x: ctr.x + (p.x - ctr.x) * 0.52, y: ctr.y + (p.y - ctr.y) * 0.52 });   // kleiner als die Kachel
  const Ih = p => ({ x: I(p).x, y: I(p).y - 7 * s });                                        // Oberkante der Brunnenmauer
  // Schatten
  ctx.save(); ctx.translate(c.bx + 6 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.3 * s, 0, 7); ctx.fill(); ctx.restore();
  // Brunnenmauer (zwei sichtbare Seiten)
  ctx.fillStyle = shade(stone, -0.08); poly([I(c.W), I(c.S), Ih(c.S), Ih(c.W)]);
  ctx.fillStyle = shade(stone, -0.26); poly([I(c.S), I(c.E), Ih(c.E), Ih(c.S)]);
  // Wasseroberfläche
  ctx.fillStyle = '#3f7d9c'; poly([Ih(c.N), Ih(c.E), Ih(c.S), Ih(c.W)]);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.ellipse((Ih(c.N).x + Ih(c.S).x) / 2, (Ih(c.N).y + Ih(c.S).y) / 2, 4 * s, 1.6 * s, 0, 0, 7); ctx.fill();
  // Steinkante oben
  ctx.strokeStyle = 'rgba(40,30,16,.35)'; ctx.lineWidth = Math.max(1, 1.1 * s);
  ctx.beginPath(); ctx.moveTo(Ih(c.W).x, Ih(c.W).y); ctx.lineTo(Ih(c.S).x, Ih(c.S).y); ctx.lineTo(Ih(c.E).x, Ih(c.E).y); ctx.stroke();
  // zwei Pfosten + Querbalken + Giebeldach + Eimer
  const pL = Ih(c.W), pR = Ih(c.E), postH = 17 * s;
  ctx.strokeStyle = '#6e4a2a'; ctx.lineWidth = Math.max(2, 2.4 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pL.x, pL.y - postH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pR.x, pR.y); ctx.lineTo(pR.x, pR.y - postH); ctx.stroke();
  const mx = (pL.x + pR.x) / 2, my = (pL.y + pR.y) / 2 - postH;
  ctx.beginPath(); ctx.moveTo(pL.x, pL.y - postH); ctx.lineTo(pR.x, pR.y - postH); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#8a4a2c';                                                                 // kleines Satteldach
  ctx.beginPath(); ctx.moveTo(pL.x - 3 * s, my); ctx.lineTo(mx, my - 9 * s); ctx.lineTo(pR.x + 3 * s, my); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,50,40,.7)'; ctx.lineWidth = 1;                                   // Seil + Eimer
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my + 7 * s); ctx.stroke();
  ctx.fillStyle = '#7a5230'; ctx.fillRect(mx - 2.4 * s, my + 7 * s, 4.8 * s, 4 * s);
  return { cx: c.cx, topY: my - 9 * s };
}

function drawMarket(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cdb78c';
  const c = isoCorners(gx, gy, baseLift, 9);
  // Schatten
  ctx.save(); ctx.translate(c.bx + 7 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.4 * s, 0, 7); ctx.fill(); ctx.restore();
  // niedriger Verkaufsstand (zwei Wände + Theke)
  ctx.fillStyle = shade(wall, -0.08); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.28); poly([c.S, c.E, c.Et, c.St]);
  ctx.fillStyle = shade(wall, 0.05);  poly([c.Nt, c.Et, c.St, c.Wt]);     // Theke (Oberseite)
  ctx.strokeStyle = 'rgba(40,30,16,.30)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(c.S.x, c.S.y); ctx.lineTo(c.St.x, c.St.y); ctx.stroke();
  // Waren auf der Theke (Körbe / Amphoren)
  const goods = [['#b9742f', -5, 1], ['#9c5b2b', 4, 2], ['#d8a24a', 0, -2], ['#8a5230', -1, 4]];
  for (const [col, dx, dy] of goods) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(c.cx + dx * s, c.cy + dy * s, 3 * s, 2.2 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(c.cx + dx * s - 0.8 * s, c.cy + dy * s - 0.8 * s, 1.2 * s, 0.8 * s, 0, 0, 7); ctx.fill();
  }
  // gestreiftes, überstehendes Marktdach
  const topY = canopyRoof(c, '#c0533a', 9);
  return { cx: c.cx, topY };
}

// Farbmischung zweier Hex-Farben
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16 & 255) + ((pb >> 16 & 255) - (pa >> 16 & 255)) * t);
  const g = Math.round((pa >> 8 & 255) + ((pb >> 8 & 255) - (pa >> 8 & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}
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

function drawMill(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cfc4ad', roof = '#7a4a2c';
  const c = isoCorners(gx, gy, baseLift, 18);
  ctx.save(); ctx.translate(c.bx + 7 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.4 * s, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = shade(wall, -0.08); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.28); poly([c.S, c.E, c.Et, c.St]);
  ctx.strokeStyle = 'rgba(40,30,16,.22)'; ctx.lineWidth = 1;                       // Steinbänder
  for (const v of [0.42, 0.7]) { const a = lerp(c.W, c.Wt, v), b = lerp(c.S, c.St, v), d = lerp(c.E, c.Et, v);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
  const topY = hipRoof(c, roof, 12, false);
  // Mühlenflügel (drehend) auf der SE-Wand
  const hub = lerp(lerp(c.S, c.E, 0.5), lerp(c.St, c.Et, 0.5), 0.52);
  const rot = animT * 0.6, R = 11 * s;
  for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2;
    const ex = hub.x + Math.cos(a) * R, ey = hub.y + Math.sin(a) * R * 0.7;
    const px = hub.x + Math.cos(a + 0.35) * R * 0.5, py = hub.y + Math.sin(a + 0.35) * R * 0.5 * 0.7;
    ctx.fillStyle = 'rgba(244,238,222,.9)'; ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(ex, ey); ctx.lineTo(px, py); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e4a2a'; ctx.lineWidth = Math.max(1.4, 1.8 * s); ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.fillStyle = '#5a3d22'; ctx.beginPath(); ctx.arc(hub.x, hub.y, 2 * s, 0, 7); ctx.fill();
  return { cx: c.cx, topY };
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

  // Fensterreihen je Stockwerk (+ Tür im Erdgeschoss)
  const winSW = '#2c2620', winSE = '#221d18', sill = 'rgba(255,255,255,.12)';
  for (let f = 0; f < floors; f++) {
    const b0 = f / floors, bh = 1 / floors, v0 = b0 + 0.20 * bh, v1 = b0 + 0.70 * bh;
    if (f === 0) {                                    // Erdgeschoss: Tür + Fenster (SW)
      wallPatch(c.W, c.S, c.Wt, c.St, 0.40, 0.60, b0 + 0.04 * bh, b0 + 0.82 * bh, winSW); // Tür
      wallPatch(c.W, c.S, c.Wt, c.St, 0.70, 0.86, v0, v1, winSW);
    } else {
      wallPatch(c.W, c.S, c.Wt, c.St, 0.16, 0.34, v0, v1, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.46, 0.64, v0, v1, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.74, 0.90, v0, v1, winSW);
    }
    wallPatch(c.S, c.E, c.St, c.Et, 0.18, 0.36, v0, v1, winSE);   // SE-Wand
    wallPatch(c.S, c.E, c.St, c.Et, 0.50, 0.68, v0, v1, winSE);
    wallPatch(c.S, c.E, c.St, c.Et, 0.78, 0.92, v0, v1, winSE);
    if (f > 0) {                                      // Geschoss-Gesims (gerade Linie)
      const swA = lerp(c.W, c.Wt, b0), swB = lerp(c.S, c.St, b0), seB = lerp(c.E, c.Et, b0);
      ctx.strokeStyle = 'rgba(40,28,14,.16)'; ctx.lineWidth = Math.max(1, 1 * s);
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
    ctx.fillStyle = roofCol;                                  // Dachrahmen (4 Trapeze)
    poly([r.Nt, r.Et, iE, iN]); poly([r.Et, r.St, iS, iE]); poly([r.St, r.Wt, iW, iS]); poly([r.Wt, r.Nt, iN, iW]);
    ctx.strokeStyle = shade(roofCol, -0.18); ctx.lineWidth = Math.max(1, 0.8 * s);   // dezente Ziegelreihe
    for (const [A, B] of [[r.Nt, r.Et], [r.Et, r.St], [r.St, r.Wt], [r.Wt, r.Nt]]) {
      const a = lerp(A, ins(A), 0.5), b = lerp(B, ins(B), 0.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // vertiefter Innenhof
    const drop = 9 * s;
    const fN = { x: iN.x, y: iN.y + drop }, fE = { x: iE.x, y: iE.y + drop }, fS = { x: iS.x, y: iS.y + drop }, fW = { x: iW.x, y: iW.y + drop };
    ctx.fillStyle = shade(wallCol, -0.30); poly([iN, iE, fE, fN]);   // NE-Innenwand (sichtbar)
    ctx.fillStyle = shade(wallCol, -0.44); poly([iN, iW, fW, fN]);   // NW-Innenwand (sichtbar)
    ctx.fillStyle = '#cabfa4'; poly([fN, fE, fS, fW]);              // Hofboden (Stein)
    // Impluvium (Wasserbecken) mittig
    const c2 = { x: (fN.x + fS.x) / 2, y: (fN.y + fS.y) / 2 }, bs = 0.5;
    const bi = p => ({ x: c2.x + (p.x - c2.x) * bs, y: c2.y + (p.y - c2.y) * bs });
    ctx.fillStyle = '#9aa890'; poly([bi(fN), bi(fE), bi(fS), bi(fW)]);           // Beckenrand
    const bs2 = 0.32, bi2 = p => ({ x: c2.x + (p.x - c2.x) * bs2, y: c2.y + (p.y - c2.y) * bs2 });
    ctx.fillStyle = '#3f7d9c'; poly([bi2(fN), bi2(fE), bi2(fS), bi2(fW)]);       // Wasser
    // Schattenfuge an der Atrium-Oberkante
    ctx.strokeStyle = 'rgba(20,14,8,.35)'; ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath(); ctx.moveTo(iN.x, iN.y); ctx.lineTo(iE.x, iE.y); ctx.lineTo(iS.x, iS.y); ctx.lineTo(iW.x, iW.y); ctx.closePath(); ctx.stroke();
  } else {
    ctx.fillStyle = roofCol; poly([r.Nt, r.Et, r.St, r.Wt]);                 // kleines Haus: volle Dachfläche
    ctx.strokeStyle = shade(roofCol, -0.18); ctx.lineWidth = Math.max(1, 0.8 * s);
    for (let t = 0.25; t < 1; t += 0.25) { const a = lerp(r.Wt, r.Nt, t), b = lerp(r.St, r.Et, t); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
  ctx.strokeStyle = 'rgba(30,20,12,.25)'; ctx.lineWidth = 1;                  // Dach-Außenkante
  ctx.beginPath(); ctx.moveTo(r.Nt.x, r.Nt.y); ctx.lineTo(r.Et.x, r.Et.y); ctx.lineTo(r.St.x, r.St.y); ctx.lineTo(r.Wt.x, r.Wt.y); ctx.closePath(); ctx.stroke();

  return { cx: c.cx, topY: r.Nt.y };
}

function drawFirehouse(gx, gy, baseLift) {
  const s = cam.scale, wall = '#c2bbab', roof = '#9c3f2c';
  const c = isoCorners(gx, gy, baseLift, 20);
  ctx.save(); ctx.translate(c.bx + 7 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.4 * s, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = shade(wall, -0.08); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.28); poly([c.S, c.E, c.Et, c.St]);
  wallPatch(c.W, c.S, c.Wt, c.St, 0.38, 0.62, 0.05, 0.62, '#7a2e1e');     // rotes Tor
  wallPatch(c.S, c.E, c.St, c.Et, 0.2, 0.4, 0.45, 0.7, '#2b231c');        // Fenster
  const r = isoCorners(gx, gy, baseLift, 24);
  ctx.fillStyle = shade(roof, -0.2); poly([c.Wt, c.St, r.St, r.Wt]);
  ctx.fillStyle = shade(roof, -0.34); poly([c.St, c.Et, r.Et, r.St]);
  ctx.fillStyle = roof; poly([r.Nt, r.Et, r.St, r.Wt]);
  const c2 = { x: r.cx, y: r.cy };                                        // Wasserbottich (Löschwasser)
  ctx.fillStyle = '#6f5535'; ctx.beginPath(); ctx.ellipse(c2.x, c2.y - 1 * s, 7 * s, 4 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3f7d9c'; ctx.beginPath(); ctx.ellipse(c2.x, c2.y - 2.4 * s, 5.4 * s, 3 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(c2.x - 1.5 * s, c2.y - 3 * s, 1.8 * s, 1 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a3d22'; ctx.fillRect(r.Et.x - 3 * s, r.Et.y - 2 * s, 3 * s, 3 * s);  // Eimer
  return { cx: c.cx, topY: r.Nt.y };
}
function drawEngineer(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cabd9b', roof = '#7a5a36';
  const c = isoCorners(gx, gy, baseLift, 18);
  ctx.save(); ctx.translate(c.bx + 7 * s, c.by + 3 * s); ctx.scale(1, TH / TW);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.arc(0, 0, TW * 0.4 * s, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = shade(wall, -0.08); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.28); poly([c.S, c.E, c.Et, c.St]);
  wallPatch(c.W, c.S, c.Wt, c.St, 0.4, 0.6, 0.05, 0.6, '#3a2f24');        // Tür
  const r = isoCorners(gx, gy, baseLift, 22);
  ctx.fillStyle = shade(roof, -0.2); poly([c.Wt, c.St, r.St, r.Wt]);
  ctx.fillStyle = shade(roof, -0.34); poly([c.St, c.Et, r.Et, r.St]);
  ctx.fillStyle = roof; poly([r.Nt, r.Et, r.St, r.Wt]);
  // Holzgerüst an der SE-Wand
  ctx.strokeStyle = '#9c7842'; ctx.lineWidth = Math.max(1.4, 1.8 * s); ctx.lineCap = 'round';
  const p0 = lerp(c.S, c.E, 0.25), p1 = lerp(c.S, c.E, 0.85);
  const u0 = lerp(c.St, c.Et, 0.25), u1 = lerp(c.St, c.Et, 0.85);
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(u0.x, u0.y - 4 * s); ctx.stroke();   // Pfosten
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(u1.x, u1.y - 4 * s); ctx.stroke();
  for (const v of [0.4, 0.75]) { const a = lerp(p0, u0, v), b = lerp(p1, u1, v); ctx.beginPath(); ctx.moveTo(a.x, a.y - 2 * s); ctx.lineTo(b.x, b.y - 2 * s); ctx.stroke(); }  // Querstreben
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(u1.x, u1.y - 6 * s); ctx.stroke();   // Diagonale
  ctx.lineCap = 'butt';
  // Winkel-Schild über der Tür
  ctx.strokeStyle = '#d8c9a0'; ctx.lineWidth = Math.max(1.4, 1.6 * s);
  const sg = lerp(r.Wt, r.St, 0.5);
  ctx.beginPath(); ctx.moveTo(sg.x - 3 * s, sg.y - 5 * s); ctx.lineTo(sg.x - 3 * s, sg.y - 10 * s); ctx.lineTo(sg.x + 3 * s, sg.y - 10 * s); ctx.stroke();
  return { cx: c.cx, topY: r.Nt.y };
}

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
  if (kind === 'mill') return drawMill(gx, gy, baseLift);
  
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
  // SW-Wand (Hellere Seite mit vertikalem Helligkeitsverlauf)
  const gradSW = ctx.createLinearGradient(c.W.x, c.Wt.y, c.S.x, c.S.y);
  gradSW.addColorStop(0, shade(wallColor, 0.05));
  gradSW.addColorStop(1, shade(wallColor, -0.12));
  ctx.fillStyle = gradSW; poly([c.W, c.S, c.St, c.Wt]);

  // SE-Wand (Schattenseite mit tieferem Verlauf)
  const gradSE = ctx.createLinearGradient(c.S.x, c.St.y, c.E.x, c.E.y);
  gradSE.addColorStop(0, shade(wallColor, -0.22));
  gradSE.addColorStop(1, shade(wallColor, -0.38));
  ctx.fillStyle = gradSE; poly([c.S, c.E, c.Et, c.St]);

  // --- TRICK 3: PROZEDURALE TEXTUR (Noise Overlay) ---
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  // Simuliere Putzstruktur durch winzige Punkte im Raster
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
      // SW Fenster
      wallPatch(c.W, c.S, c.Wt, c.St, 0.22, 0.42, vBot, vTop, '#1e2530');
      wallPatch(c.W, c.S, c.Wt, c.St, 0.58, 0.78, vBot, vTop, '#1e2530');
      // Fensterrahmen-Highlight unten
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lerp(c.W,c.S,0.22).x, lerp(c.W,c.St,vBot).y); ctx.lineTo(lerp(c.W,c.S,0.42).x, lerp(c.W,c.St,vBot).y); ctx.stroke();

      // SE Fenster
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

function onScreen(gx, gy) {
  const p = project(gx, gy); const r = cv.parentElement.getBoundingClientRect();
  return p.x > -80 && p.x < r.width + 80 && p.y > -120 && p.y < r.height + 80;
}
