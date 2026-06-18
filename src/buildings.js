// =========================================================================
// ---- INTERNE HILFSFUNKTIONEN FÜR RÖMISCHE GRAFIKEN ----
// =========================================================================

function isoCorners(gx, gy, baseLift, height) {
    const s = cam.scale;
    const cx = (gx - gy) * (TW / 2) * s;
    const cy = (gx + gy) * (TH / 2) * s - (baseLift * s);
    const h = height * s;

    return {
        cx: cx, cy: cy - h, bx: cx, by: cy,
        N:  { x: cx, y: cy - (TH / 2) * s },
        E:  { x: cx + (TW / 2) * s, y: cy },
        S:  { x: cx, y: cy + (TH / 2) * s },
        W:  { x: cx - (TW / 2) * s, y: cy },
        Nt: { x: cx, y: cy - (TH / 2) * s - h },
        Et: { x: cx + (TW / 2) * s, y: cy - h },
        St: { x: cx, y: cy + (TH / 2) * s - h },
        Wt: { x: cx - (TW / 2) * s, y: cy - h }
    };
}

function poly(points) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
}

function lerp(p1, p2, t) {
    return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
}

function shade(color, percent) {
    const f = parseInt(color.slice(1), 16),
          t = percent < 0 ? 0 : 255,
          p = percent < 0 ? percent * -1 : percent,
          R = f >> 16, G = (f >> 8) & 0x00FF, B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

function wallBrickLines(pBotL, pBotR, pTopL, pTopR, count, strokeCol, scale) {
    ctx.save();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = Math.max(0.5, 0.8 * scale);
    for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);
        ctx.beginPath(); ctx.moveTo(lerp(pBotL, pTopL, t).x, lerp(pBotL, pTopL, t).y);
        ctx.lineTo(lerp(pBotR, pTopR, t).x, lerp(pBotR, pTopR, t).y); ctx.stroke();
    }
    ctx.restore();
}

function wallPatch(pBotL, pBotR, pTopL, pTopR, tL, tR, hBot, hTop, fillCol) {
    const bl = lerp(pBotL, pBotR, tL), br = lerp(pBotL, pBotR, tR);
    const tl = lerp(pTopL, pTopR, tL), tr = lerp(pTopL, pTopR, tR);
    ctx.fillStyle = fillCol;
    poly([lerp(bl, tl, hBot), lerp(br, tr, hBot), lerp(br, tr, hTop), lerp(bl, tl, hTop)]);
}

function wallArch(pBotL, pBotR, pTopL, pTopR, tL, tR, hBot, hTop, innerCol, archCol, scale) {
    const bl = lerp(pBotL, pBotR, tL), br = lerp(pBotL, pBotR, tR);
    const tl = lerp(pTopL, pTopR, tL), tr = lerp(pTopL, pTopR, tR);
    const p0 = lerp(bl, tl, hBot), p1 = lerp(br, tr, hBot), p2 = lerp(br, tr, hTop * 0.7), p3 = lerp(bl, tl, hTop * 0.7);
    const topM = lerp(lerp(bl, tl, hTop), lerp(br, tr, hTop), 0.5);
    ctx.fillStyle = innerCol; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.quadraticCurveTo(topM.x, topM.y, p3.x, p3.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = archCol; ctx.lineWidth = Math.max(1.5, 2 * scale); ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.quadraticCurveTo(topM.x, topM.y, p2.x, p2.y); ctx.stroke();
}

function column(baseCenter, height) {
    const s = cam.scale, w = 2.2 * s, h = height * s;
    ctx.fillStyle = '#efe7d4'; ctx.fillRect(baseCenter.x - w/2, baseCenter.y - h, w, h);
    ctx.fillStyle = 'rgba(40,30,20,0.15)'; ctx.fillRect(baseCenter.x + w/6, baseCenter.y - h, w/3, h);
}

function hipRoof(c, color, roofH, drawFacies) {
    const s = cam.scale, apex = { x: c.cx, y: c.cy - roofH * s };
    ctx.fillStyle = shade(color, 0.05); poly([c.Wt, c.St, apex]);
    ctx.fillStyle = shade(color, -0.18); poly([c.St, c.Et, apex]);
    ctx.fillStyle = shade(color, -0.35); poly([c.Et, c.Nt, apex]); poly([c.Nt, c.Wt, apex]);
    if (drawFacies) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c.Wt.x, c.Wt.y); ctx.lineTo(c.St.x, c.St.y); ctx.lineTo(c.Et.x, c.Et.y); ctx.stroke();
    }
    return apex.y;
}

function canopyRoof(c, color, roofH) {
    const s = cam.scale, apex = { x: c.cx, y: c.cy - roofH * s };
    ctx.fillStyle = color; poly([c.Wt, c.St, apex]);
    ctx.fillStyle = shade(color, -0.2); poly([c.St, c.Et, apex]);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let t = 0.15; t < 1; t += 0.3) {
        poly([lerp(c.Wt, c.St, t), lerp(c.Wt, c.St, t + 0.1), apex]);
        poly([lerp(c.St, c.Et, t), lerp(c.St, c.Et, t + 0.1), apex]);
    }
    return apex.y;
}

function tileFace(p1, p2, pApex, strokeCol) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
    for (let t = 0.2; t < 1; t += 0.2) {
        const b = lerp(p1, p2, t);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(pApex.x, pApex.y); ctx.stroke();
    }
}

// =========================================================================
// ---- NEU: BASICS (STRASSE & HAUS) DAMIT DIE ENGINE NICHT ABSTÜRZT ----
// =========================================================================

function drawRoad(gx, gy, baseLift) {
    const c = isoCorners(gx, gy, baseLift, 0);
    ctx.fillStyle = '#6e655f'; poly([c.N, c.E, c.S, c.W]);
    ctx.strokeStyle = '#544c47'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c.N.x, c.N.y); ctx.lineTo(c.S.x, c.S.y); ctx.moveTo(c.W.x, c.W.y); ctx.lineTo(c.E.x, c.E.y); ctx.stroke();
    return { cx: c.cx, topY: c.N.y };
}

function drawHouse(gx, gy, baseLift, level = 0) {
    // Greift auf deine H3D-Konfiguration aus der config.js zu!
    const config = H3D[level] || H3D[0];
    const s = cam.scale;
    const c = isoCorners(gx, gy, baseLift, config.h);
    
    ctx.fillStyle = config.left; poly([c.W, c.S, c.St, c.Wt]);
    ctx.fillStyle = config.right; poly([c.S, c.E, c.Et, c.St]);
    
    wallBrickLines(c.W, c.S, c.Wt, c.St, 2, 'rgba(0,0,0,0.15)', s);
    wallPatch(c.W, c.S, c.Wt, c.St, 0.4, 0.6, 0.2, 0.6, '#261a11'); // Tür
    
    const topY = hipRoof(c, config.top, 8, true);
    return { cx: c.cx, topY };
}

function drawGrainfield(gx, gy, baseLift) {
    const c = isoCorners(gx, gy, baseLift, 0);
    ctx.fillStyle = '#cdb85c'; poly([c.N, c.E, c.S, c.W]);
    ctx.strokeStyle = '#bfa743'; ctx.lineWidth = 1;
    for(let t=0.2; t<1; t+=0.2) {
        ctx.beginPath(); ctx.moveTo(lerp(c.W, c.N, t).x, lerp(c.W, c.N, t).y); ctx.lineTo(lerp(c.S, c.E, t).x, lerp(c.S, c.E, t).y); ctx.stroke();
    }
    return { cx: c.cx, topY: c.N.y };
}


// =========================================================================
// ---- REPARIERTE RÖMISCHE GEBÄUDE ----
// =========================================================================

function drawForum(gx, gy, baseLift) {
  const s = cam.scale, marbleLight = '#efe7d4', stone = '#e7ddc6';
  const hBase = 6, colH = 20, entH = 5, roofH = 14;
  const b0 = isoCorners(gx, gy, baseLift, 0), b1 = isoCorners(gx, gy, baseLift, hBase);
  
  ctx.save(); ctx.shadowColor = 'rgba(25,15,5,0.20)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetX = 14 * s; ctx.shadowOffsetY = 7 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; poly([b0.W, b0.S, b0.E, b0.N]); ctx.restore();

  ctx.fillStyle = shade(stone, 0.02); poly([b0.W, b0.S, b1.St, b1.Wt]);
  ctx.fillStyle = shade(stone, -0.22); poly([b0.S, b0.E, b1.Et, b1.St]);
  wallBrickLines(b0.W, b0.S, b1.Wt, b1.St, 2, 'rgba(80,60,40,0.25)', s);
  wallBrickLines(b0.S, b0.E, b1.St, b1.Et, 2, 'rgba(60,40,30,0.30)', s);
  ctx.fillStyle = shade(marbleLight, -0.05); poly([b1.Nt, b1.Et, b1.St, b1.Wt]);

  const us = [0.15, 0.50, 0.85];
  for (const u of us) column(lerp(b1.Wt, b1.St, u), colH);
  for (let i = us.length - 1; i >= 0; i--) column(lerp(b1.St, b1.Et, us[i]), colH);
  column(b1.St, colH); 

  const e2 = isoCorners(gx, gy, baseLift, hBase + colH), e3 = isoCorners(gx, gy, baseLift, hBase + colH + entH);
  ctx.fillStyle = marbleLight; poly([e2.Wt, e2.St, e3.St, e3.Wt]);
  ctx.fillStyle = shade(marbleLight, -0.24); poly([e2.St, e2.Et, e3.Et, e2.St]);

  const apex = { x: (e3.Nt.x + e3.Et.x + e3.St.x + e3.Wt.x) / 4, y: (e3.Nt.y + e3.Et.y + e3.St.y + e3.Wt.y) / 4 - roofH * s };
  const roofCol = '#b15f3a';
  ctx.fillStyle = shade(roofCol, -0.35); poly([e3.Nt, e3.Wt, apex]); poly([e3.Nt, e3.Et, apex]); 
  ctx.fillStyle = shade(roofCol, 0.05); poly([e3.Wt, e3.St, apex]); 
  ctx.fillStyle = shade(roofCol, -0.18); poly([e3.St, e3.Et, apex]); 
  
  return { cx: b0.cx, topY: apex.y };
}

function drawClaypit(gx, gy, baseLift) {
  const s = cam.scale, rim = '#9c7b4e', brickCol = '#a4593d';
  const g0 = isoCorners(gx, gy, baseLift, 0), gr = isoCorners(gx, gy, baseLift, 4);
  
  ctx.fillStyle = shade(brickCol, -0.05); poly([g0.W, g0.S, gr.St, gr.Wt]);
  ctx.fillStyle = shade(brickCol, -0.28); poly([g0.S, g0.E, gr.Et, gr.St]);
  ctx.fillStyle = shade(rim, -0.05); poly([gr.Nt, gr.Et, gr.St, gr.Wt]);

  const ctr = { x: gr.cx, y: gr.cy + 1 * s };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.70, y: ctr.y + (p.y - ctr.y) * 0.70 + 1 * s });
  ctx.fillStyle = '#5c4328'; poly([I(gr.Nt), I(gr.Et), I(gr.St), I(gr.Wt)]);

  ctx.fillStyle = '#b67f4c';
  for (const [dx, dy] of [[-5, 1], [4, 3], [1, -2]]) {
    ctx.beginPath(); ctx.ellipse(ctr.x + dx * s, ctr.y + dy * s, 4 * s, 2.2 * s, 0, 0, 2 * Math.PI); ctx.fill();
  }
  return { cx: gr.cx, topY: gr.Nt.y };
}

function drawPottery(gx, gy, baseLift) {
  const s = cam.scale, wall = '#caa46e', roof = '#b15f3a';
  const c = isoCorners(gx, gy, baseLift, 14);

  ctx.fillStyle = shade(wall, 0.05); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.22); poly([c.S, c.E, c.Et, c.St]);
  wallArch(c.W, c.S, c.Wt, c.St, 0.30, 0.70, 0.0, 0.65, '#231a12', '#9a4e35', s);

  const topY = hipRoof(c, roof, 9, true);
  return { cx: c.cx, topY };
}

function drawWell(gx, gy, baseLift) {
  const s = cam.scale, marble = '#efe7d4', brick = '#b15f3a';
  const c = isoCorners(gx, gy, baseLift, 0);
  const ctr = { x: c.bx, y: c.by };
  const I = p => ({ x: ctr.x + (p.x - ctr.x) * 0.58, y: ctr.y + (p.y - ctr.y) * 0.58 });
  const Ih = p => ({ x: I(p).x, y: I(p).y - 8 * s });
  
  ctx.fillStyle = shade(marble, -0.05); poly([I(c.W), I(c.S), Ih(c.S), Ih(c.W)]);
  ctx.fillStyle = shade(marble, -0.22); poly([I(c.S), I(c.E), Ih(c.E), Ih(c.S)]);
  ctx.fillStyle = '#3a82a6'; poly([Ih(c.N), Ih(c.E), Ih(c.S), Ih(c.W)]);

  const pL = Ih(c.W), pR = Ih(c.E), postH = 19 * s;
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = Math.max(2, 2.5 * s);
  ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pL.x, pL.y - postH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pR.x, pR.y); ctx.lineTo(pR.x, pR.y - postH); ctx.stroke();
  
  const mx = (pL.x + pR.x) / 2, my = (pL.y + pR.y) / 2 - postH;
  ctx.fillStyle = brick; ctx.beginPath(); ctx.moveTo(pL.x - 3 * s, my); ctx.lineTo(mx, my - 10 * s); ctx.lineTo(pR.x + 3 * s, my); ctx.closePath(); ctx.fill();

  return { cx: c.cx, topY: my - 10 * s };
}

function drawMarket(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cdb78c', roofAwn = '#c0533a';
  const c = isoCorners(gx, gy, baseLift, 9);

  ctx.fillStyle = shade(wall, 0.05); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.22); poly([c.S, c.E, c.Et, c.St]);
  ctx.fillStyle = shade(wall, 0.08); poly([c.Nt, c.Et, c.St, c.Wt]);

  const topY = canopyRoof(c, roofAwn, 10);
  return { cx: c.cx, topY };
}

function drawFirehouse(gx, gy, baseLift) {
  const s = cam.scale, wall = '#c2bbab', roof = '#b15f3a';
  const h = 22;
  const c = isoCorners(gx, gy, baseLift, h);

  ctx.fillStyle = shade(wall, 0.05); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.22); poly([c.S, c.E, c.Et, c.St]);
  wallArch(c.W, c.S, c.Wt, c.St, 0.28, 0.72, 0.0, 0.65, '#2b2018', '#a44e32', s);

  const r = isoCorners(gx, gy, baseLift, h + 4);
  ctx.fillStyle = shade(roof, -0.18); poly([c.Wt, c.St, r.St, r.Wt]);
  ctx.fillStyle = shade(roof, -0.32); poly([c.St, r.Et, r.Et, r.St]); // Fix: c.Et -> r.Et
  ctx.fillStyle = roof; poly([r.Nt, r.Et, r.St, r.Wt]);

  return { cx: c.cx, topY: r.Nt.y };
}

function drawEngineer(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cabd9b', roof = '#b15f3a';
  const h = 18;
  const c = isoCorners(gx, gy, baseLift, h);

  ctx.fillStyle = shade(wall, 0.06); poly([c.W, c.S, c.St, c.Wt]); // FIX: Hier stand fälschlicherweise r.Wt vor der Definition!
  ctx.fillStyle = shade(wall, -0.20); poly([c.S, c.E, c.Et, c.St]);

  const r = isoCorners(gx, gy, baseLift, h + 4);
  ctx.fillStyle = shade(roof, -0.18); poly([c.Wt, c.St, r.St, r.Wt]);
  ctx.fillStyle = shade(roof, -0.32); poly([c.St, c.Et, r.Et, r.St]);
  
  const topY = hipRoof(r, roof, 6, true);
  return { cx: c.cx, topY };
}

function drawMill(gx, gy, baseLift) {
  const s = cam.scale, wall = '#cfc4ad', roof = '#b15f3a';
  const h = 18;
  const c = isoCorners(gx, gy, baseLift, h);

  ctx.fillStyle = shade(wall, 0.05); poly([c.W, c.S, c.St, c.Wt]);
  ctx.fillStyle = shade(wall, -0.24); poly([c.S, c.E, c.Et, c.St]);

  const topY = hipRoof(c, roof, 10, true);

  const currentAnim = typeof animT !== 'undefined' ? animT : 0;
  const hub = lerp(lerp(c.S, c.E, 0.5), lerp(c.St, c.Et, 0.5), 0.48);
  const rot = currentAnim * 0.5, R = 12 * s;
  for (let k = 0; k < 4; k++) {
    const a = rot + k * Math.PI / 2;
    const ex = hub.x + Math.cos(a) * R, ey = hub.y + Math.sin(a) * R * 0.7;
    const px = hub.x + Math.cos(a + 0.32) * R * 0.5, py = hub.y + Math.sin(a + 0.32) * R * 0.5 * 0.7;
    ctx.fillStyle = 'rgba(235,225,200,0.85)'; ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(ex, ey); ctx.lineTo(px, py); ctx.closePath(); ctx.fill();
  }
  return { cx: c.cx, topY };
}
