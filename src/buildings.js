function drawBuilding(gx, gy, kind, lvl, baseLift, statusEffects) {
  // Spezialisierte Funktions-Router für Nicht-Wohnhäuser beibehalten
  if (kind === 'forum') return drawForum(gx, gy, baseLift);
  if (kind === 'claypit') return drawClaypit(gx, gy, baseLift);
  if (kind === 'pottery') return drawPottery(gx, gy, baseLift);
  if (kind === 'well') return drawWell(gx, gy, baseLift);
  if (kind === 'market') return drawMarket(gx, gy, baseLift);
  if (kind === 'firehouse') return drawFirehouse(gx, gy, baseLift);
  if (kind === 'engineer') return drawEngineer(gx, gy, baseLift);
  if (kind === 'grainfield') return drawGrainfield(gx, gy, baseLift);
  if (kind === 'mill') return drawMill(gx, gy, baseLift);
  
  // Standard-Initialisierung für Wohngebäude (Insula)
  statusEffects = statusEffects || { fireRisk: false, plagueRisk: false, waterShortage: false, unemployed: false };
  const s = cam.scale;
  const L = Math.max(0, Math.min(3, lvl | 0));
  
  // Dimensionen und Farbpaletten je nach Entwicklungsstufe
  const floors  = [1, 2, 3, 4][L];
  const h       = [15, 26, 37, 46][L];
  let wallColor = ['#b58a5c', '#cbae84', '#dccaa6', '#e6d8b8'][L];
  const roofColor = '#b15f3a';

  // Seuchen-Modifikator für die Wandfarbe
  if (statusEffects.plagueRisk) wallColor = shade(wallColor, -0.15);

  const c = isoCorners(gx, gy, baseLift, h);

  // --- 1. ATMOSPHÄRISCHER SOFT-SCHATTEN ---
  ctx.save();
  ctx.shadowColor = 'rgba(25, 15, 5, 0.22)';
  ctx.shadowBlur = 8 * s;
  ctx.shadowOffsetX = 11 * s;
  ctx.shadowOffsetY = 6 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.01)'; // Unsichtbarer Hilfskörper für echten Weichzeichner-Schatten
  poly([c.W, c.S, c.E, c.N]);
  ctx.restore();

  // --- 2. GRADIENTEN FÜR DIE WÄNDE (Licht oben-links) ---
  const gSW = ctx.createLinearGradient(c.Wt.x, c.Wt.y, c.S.x, c.S.y);
  gSW.addColorStop(0, shade(wallColor, 0.06));
  gSW.addColorStop(1, shade(wallColor, -0.12));
  ctx.fillStyle = gSW; poly([c.W, c.S, c.St, c.Wt]);

  const gSE = ctx.createLinearGradient(c.St.x, c.St.y, c.E.x, c.E.y);
  gSE.addColorStop(0, shade(wallColor, -0.20));
  gSE.addColorStop(1, shade(wallColor, -0.36));
  ctx.fillStyle = gSE; poly([c.S, c.E, c.Et, c.St]);

  // --- 3. PROZEDURALE TEXTUR (Putz-Noise) ---
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(c.bx + (Math.random() - 0.5) * 30 * s, c.by - Math.random() * h * s, 1.1 * s, 1.1 * s);
  }
  ctx.restore();

  // --- 4. FENSTERREIHEN & STOCKWERK-GESIMSE ---
  const winSW = '#2c2620', winSE = '#221d18';
  for (let f = 0; f < floors; f++) {
    const b0 = f / floors, bh = 1 / floors;
    const v0 = b0 + 0.20 * bh, v1 = b0 + 0.70 * bh;
    
    if (f === 0) { // Erdgeschoss: Tür + Fenster auf SW
      wallPatch(c.W, c.S, c.Wt, c.St, 0.40, 0.60, b0 + 0.04 * bh, b0 + 0.82 * bh, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.70, 0.86, v0, v1, winSW);
    } else { // Höhere Stockwerke: Reguläre Fensterreihen SW
      wallPatch(c.W, c.S, c.Wt, c.St, 0.16, 0.34, v0, v1, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.46, 0.64, v0, v1, winSW);
      wallPatch(c.W, c.S, c.Wt, c.St, 0.74, 0.90, v0, v1, winSW);
    }
    // Fenster auf der SE-Schattenseite
    wallPatch(c.S, c.E, c.St, c.Et, 0.18, 0.36, v0, v1, winSE);
    wallPatch(c.S, c.E, c.St, c.Et, 0.50, 0.68, v0, v1, winSE);
    wallPatch(c.S, c.E, c.St, c.Et, 0.78, 0.92, v0, v1, winSE);

    // Horizontale Geschoss-Gesimse zur optischen Trennung
    if (f > 0) {
      const swA = lerp(c.W, c.Wt, b0), swB = lerp(c.S, c.St, b0), seB = lerp(c.E, c.Et, b0);
      ctx.strokeStyle = 'rgba(40,28,14,.16)'; ctx.lineWidth = Math.max(1, 1 * s);
      ctx.beginPath(); ctx.moveTo(swA.x, swA.y); ctx.lineTo(swB.x, swB.y); ctx.lineTo(seB.x, seB.y); ctx.stroke();
    }
  }

  // --- 5. AMBIENT OCCLUSION & KANTENBETONUNG ---
  ctx.strokeStyle = 'rgba(40,25,10,.22)'; ctx.lineWidth = 1.4 * s;
  ctx.beginPath(); ctx.moveTo(c.S.x, c.S.y); ctx.lineTo(c.St.x, c.St.y); ctx.stroke(); // Vertikale Hauptkante

  ctx.strokeStyle = 'rgba(30,20,12,.30)'; ctx.lineWidth = Math.max(1.5, 2 * s);
  ctx.beginPath(); ctx.moveTo(c.Wt.x, c.Wt.y); ctx.lineTo(c.St.x, c.St.y); ctx.lineTo(c.Et.x, c.Et.y); ctx.stroke(); // Kranzgesims oben

  // --- 6. DACH-RENDERING (Flaches Terrakottadach mit Aufkantung) ---
  const r = isoCorners(gx, gy, baseLift, h + 4);
  ctx.fillStyle = shade(roofColor, -0.18); poly([c.Wt, c.St, r.St, r.Wt]); // Aufkantung SW
  ctx.fillStyle = shade(roofColor, -0.32); poly([c.St, c.Et, r.Et, r.St]); // Aufkantung SE

  if (floors >= 2) {
    // AB STUFE 2: Offenes Atrium (Innenhof) in der Dachmitte rendern
    const k = 0.42, ctr = { x: r.cx, y: r.cy };
    const ins = p => ({ x: p.x + (ctr.x - p.x) * k, y: p.y + (ctr.y - p.y) * k });
    const iN = ins(r.Nt), iE = ins(r.Et), iS = ins(r.St), iW = ins(r.Wt);
    
    // Dachrahmen (4 geneigte Trapeze)
    ctx.fillStyle = roofColor;
    poly([r.Nt, r.Et, iE, iN]); poly([r.Et, r.St, iS, iE]); poly([r.St, r.Wt, iW, iS]); poly([r.Wt, r.Nt, iN, iW]);
    
    // Dezente Andeutung von Ziegelreihen auf dem Rahmen
    ctx.strokeStyle = shade(roofColor, -0.18); ctx.lineWidth = Math.max(1, 0.8 * s);
    for (const [A, B] of [[r.Nt, r.Et], [r.Et, r.St], [r.St, r.Wt], [r.Wt, r.Nt]]) {
      const a = lerp(A, ins(A), 0.5), b = lerp(B, ins(B), 0.5);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    
    // Vertiefter Innenhofschacht
    const drop = 9 * s;
    const fN = { x: iN.x, y: iN.y + drop }, fE = { x: iE.x, y: iE.y + drop }, fS = { x: iS.x, y: iS.y + drop }, fW = { x: iW.x, y: iW.y + drop };
    ctx.fillStyle = shade(wallColor, -0.30); poly([iN, iE, fE, fN]); // Sichtbare NE-Innenwand
    ctx.fillStyle = shade(wallColor, -0.44); poly([iN, iW, fW, fN]); // Sichtbare NW-Innenwand
    ctx.fillStyle = '#cabfa4'; poly([fN, fE, fS, fW]);                // Hofboden (Steinplatten)
    
    // Impluvium (Zentrales Wasserbecken im Hof)
    const c2 = { x: (fN.x + fS.x) / 2, y: (fN.y + fS.y) / 2 };
    const bi = p => ({ x: c2.x + (p.x - c2.x) * 0.5, y: c2.y + (p.y - c2.y) * 0.5 });
    ctx.fillStyle = '#9aa890'; poly([bi(fN), bi(fE), bi(fS), bi(fW)]); // Beckenrand
    
    const bi2 = p => ({ x: c2.x + (p.x - c2.x) * 0.32, y: c2.y + (p.y - c2.y) * 0.32 });
    ctx.fillStyle = '#3f7d9c'; poly([bi2(fN), bi2(fE), bi2(fS), bi2(fW)]); // Wasserfläche
    
    // Schattenfuge an der Atriumkante oben
    ctx.strokeStyle = 'rgba(20,14,8,.35)'; ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath(); ctx.moveTo(iN.x, iN.y); ctx.lineTo(iE.x, iE.y); ctx.lineTo(iS.x, iS.y); ctx.lineTo(iW.x, iW.y); ctx.closePath(); ctx.stroke();
  } else {
    // STUFE 1: Volle, geschlossene Dachfläche ohne Innenhof
    ctx.fillStyle = roofColor; poly([r.Nt, r.Et, r.St, r.Wt]);
    ctx.strokeStyle = shade(roofColor, -0.18); ctx.lineWidth = Math.max(1, 0.8 * s);
    for (let t = 0; t < 1; t += 0.25) {
      const a = lerp(r.Wt, r.Nt, t), b = lerp(r.St, r.Et, t);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  // Äußere Dach-Vorderkante nachziehen
  ctx.strokeStyle = 'rgba(30,20,12,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(r.Nt.x, r.Nt.y); ctx.lineTo(r.Et.x, r.Et.y); ctx.lineTo(r.St.x, r.St.y); ctx.lineTo(r.Wt.x, r.Wt.y); ctx.closePath(); ctx.stroke();

  // --- 7. DYNAMISCHE STATUS-OVERLAYS (Atmosphärisches Feedback) ---
  const topY = r.Nt.y;

  // A. Funken & Rauch bei akuter Brandgefahr
  if (statusEffects.fireRisk) {
    ctx.fillStyle = 'rgba(235, 95, 35, 0.4)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); 
      ctx.arc(c.cx + (Math.sin(animT * 2 + i) * 5) * s, topY - (i * 5) * s, (2 + i) * s, 0, 7); 
      ctx.fill();
    }
  }

  // B. Grünliche Dunstwolke bei Seuchengefahr
  if (statusEffects.plagueRisk) {
    ctx.fillStyle = 'rgba(84, 115, 62, 0.22)';
    ctx.beginPath(); 
    ctx.arc(c.cx, topY - 4 * s, 13 * s, 0, 7); 
    ctx.fill();
  }

  // C. Schwebende Wassertropfen-Partikel bei Wassermangel
  if (statusEffects.waterShortage) {
    ctx.fillStyle = '#4fa3e3';
    const bob = Math.sin(animT * 2.5) * 2 * s;
    ctx.beginPath(); ctx.arc(c.cx - 8 * s, topY - 12 * s + bob, 1.4 * s, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(c.cx - 5 * s, topY - 16 * s + bob, 1.0 * s, 0, 7); ctx.fill();
  }

  // D. Herumsitzende Bürger (Toga-Punkte) bei Arbeitslosigkeit im Erdgeschoss
  if (statusEffects.unemployed) {
    ctx.fillStyle = '#8a7663'; // Kopf / Toga-Schatten
    ctx.beginPath(); ctx.arc(c.S.x - 3 * s, c.S.y - 1 * s, 1.8 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#b0a090'; // Körper
    ctx.fillRect(c.S.x - 4.5 * s, c.S.y, 3 * s, 3.5 * s);
  }

  return { cx: c.cx, topY };
}
