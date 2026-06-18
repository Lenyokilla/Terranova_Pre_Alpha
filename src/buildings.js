// ---- RÖMISCHE GEBÄUDE-ARIEN (iOS / PWA OPTIMIERT) ----

function drawForum(gx, gy, baseLift) {
  const s = cam.scale, marbleLight = '#efe7d4', stone = '#e7ddc6';
  const hBase = 6, colH = 20, entH = 5, roofH = 14;
  
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hBase);
  
  // iOS-sicherer, dezenter Schatten
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.15)'; ctx.shadowBlur = Math.min(4 * s, 8); ctx.shadowOffsetX = 6 * s; ctx.shadowOffsetY = 4 * s;
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
  ctx.fillStyle = gEntSE; poly([e2.St, e2.Et, e3.Et, e3.St]); // Fehler korrigiert: e3.St statt e2.St

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

function drawClaypit(gx, gy, baseLift) {
  const s = cam.scale, rim = '#9c7b4e', brickCol = '#a4593d';
  const g0 = isoCorners(gx, gy, baseLift, 0), gr = isoCorners(gx, gy, baseLift, 4);
  
  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.15)'; ctx.shadowBlur = Math.min(4 * s, 8); ctx.shadowOffsetX = 6 * s; ctx.shadowOffsetY = 4 * s;
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
  for (const [dx, dy] of [[-5, 1], [4, 3], [1, -2]]) {
    ctx.beginPath(); ctx.ellipse(ctr.x + dx * s, ctr.y + dy * s, 4 * s, 2.2 * s, 0, 0, 7); ctx.fill();
  }
  return { cx: gr.cx, topY: gr.Nt.y };
}

function drawPottery(gx, gy, baseLift) {
  const s = cam.scale, wall = '#caa46e', roof = '#b15f3a';
  const h = 14;
  const c = isoCorners(gx, gy, baseLift, h);

  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.15)'; ctx.shadowBlur = Math.min(4 * s, 8); ctx.shadowOffsetX = 6 * s; ctx.shadowOffsetY = 4 * s;
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
  ctx.shadowColor = 'rgba(25,15,5,0.15)'; ctx.shadowBlur = Math.min(4 * s, 8); ctx.shadowOffsetX = 6 * s; ctx.shadowOffsetY = 4 * s;
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

  const c2 = r;
  ctx.fillStyle = '#5a4530'; ctx.beginPath(); ctx.ellipse(c2.cx, c2.cy - 1 * s, 7 * s, 4 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a7da1'; ctx.beginPath(); ctx.ellipse(c2.cx, c2.cy - 2.2 * s, 5.5 * s, 3 * s, 0, 0, 7); ctx.fill();

  return { cx: c.cx, topY: r.Nt.y };
}

function drawEngineer(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cabd9b', roof = '#b15f3a';
  const h = 18;
  const c = isoCorners(gx, gy, baseLift, h);

  ctx.save();
  ctx.shadowColor = 'rgba(25,15,5,0.15)'; ctx.shadowBlur = Math.min(4 * s, 8); ctx.shadowOffsetX = 6 * s; ctx.shadowOffsetY = 4 * s;
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
  ctx.shadowColor = 'rgba(25,15,5,0.15)'; ctx.shadowBlur = Math.min(4 * s, 8); ctx.shadowOffsetX = 6 * s; ctx.shadowOffsetY = 4 * s;
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
    ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(1.5, 1.8 * s); ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(ex, ey); stroke();
  }
  ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.arc(hub.x, hub.y, 2.2 * s, 0, 7); ctx.fill();

  return { cx: c.cx, topY };
}
