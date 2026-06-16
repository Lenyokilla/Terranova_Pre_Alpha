/* TERRA · system.js — Speichern/Laden · Pause/Zeitraffer · Gebäude-Info-Panel */

/* ============================================================
   1) SPEICHERN & LADEN  (localStorage)
   ============================================================ */
const SAVE_KEY='terra_save_v1';

function hasSave(){ try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;} }

function saveGame(silent){
  try{
    const data={ v:1, grid:GRID, money, pop, tickCount, won, lost,
      cam:{x:cam.x,y:cam.y,scale:cam.scale}, tiles:grid };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if(!silent)flash('Spiel gespeichert ✓');
    return true;
  }catch(e){ if(!silent)flash('Speichern fehlgeschlagen'); return false; }
}

function loadGame(silent){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw){ if(!silent)flash('Kein Spielstand vorhanden'); return false; }
    const d=JSON.parse(raw);
    if(!d.tiles||d.grid!==GRID||d.tiles.length!==GRID){
      if(!silent)flash('Spielstand passt nicht zur Kartengröße'); return false; }
    grid=d.tiles;
    money=d.money|0; pop=d.pop|0; tickCount=d.tickCount|0;
    won=!!d.won; lost=!!d.lost;
    walkers=[];                                   // Läufer entstehen neu
    if(d.cam){ cam.x=d.cam.x; cam.y=d.cam.y; cam.scale=d.cam.scale; }
    closePanel();
    updateHUD();
    if(!silent)flash('Spiel geladen ✓');
    return true;
  }catch(e){ if(!silent)flash('Laden fehlgeschlagen'); return false; }
}

function newGame(){
  if(!confirm('Neue Karte starten? Der aktuelle Aufbau geht verloren.'))return;
  money=300; pop=0; won=false; lost=false; tickCount=0; walkers=[]; tool='hand';
  closePanel();
  generateTerrain(); centerCam(); initClouds(); initAllWildlife();
  document.querySelectorAll('.tool').forEach(t=>t.classList.toggle('active',t.dataset.key==='hand'));
  setSpeed(1);
  updateHUD(); saveGame(true);
  flash('Neue Karte ✦');
}

/* ============================================================
   2) PAUSE & ZEITRAFFER
   ============================================================ */
function setSpeed(n){
  speed=n;
  if(speed>0)lastTick=performance.now();   // sauberer Neustart des Tick-Zyklus
  scheduleTick();
  updateSpeedUI();
  flash(n===0?'Pause ⏸':'Tempo '+n+'×');
}
function updateSpeedUI(){
  document.querySelectorAll('#speed button').forEach(b=>
    b.classList.toggle('on', +b.dataset.sp===speed));
}

/* ============================================================
   3) GEBÄUDE-INFO-PANEL
   ============================================================ */
const _info     = ()=>document.getElementById('info');
const _infoHead = ()=>document.getElementById('infoTitle');
const _infoGlyph= ()=>document.getElementById('infoGlyph');
const _infoBody = ()=>document.getElementById('infoBody');
const _infoWarn = ()=>document.getElementById('infoWarn');

function openPanel(x,y){ selectedTile={x,y}; renderPanel();
  _info().classList.remove('hide');
  document.getElementById('stage').classList.add('info-open'); }
function closePanel(){ selectedTile=null; const p=_info(); if(p)p.classList.add('hide');
  const st=document.getElementById('stage'); if(st)st.classList.remove('info-open'); }

// Live-Refresh aus updateHUD (jeden Tick): Werte aktualisieren oder schließen, wenn abgerissen
function refreshPanel(){
  if(!selectedTile)return;
  const {x,y}=selectedTile;
  if(!inBounds(x,y)||!hasObject(x,y)){ closePanel(); return; }
  renderPanel();
}

function describeTile(x,y){
  const t=grid[y][x];
  const hasRoad=!!adjRoad(x,y);
  const roadRow={k:'Straßenanschluss', v:hasRoad?'ja':'nein', cls:hasRoad?'ok':'bad'};
  if(t.type==='house'){
    const cap=houseCap(t), names=['Hütte','Wohnhaus','Anwesen'];
    const rows=[
      {k:'Ausbaustufe', v:names[t.lvl]+' ('+(t.lvl+1)+'/3)'},
      {k:'Einwohner',   v:t.res+' / '+cap},
      {k:'Wasser',      v:t.water>0?'versorgt':'fehlt', cls:t.water>0?'ok':'bad'},
      {k:'Nahrung',     v:t.food >0?'versorgt':'fehlt', cls:t.food >0?'ok':'bad'},
      {k:'Luxus',       v:t.goods>0?('Keramik (+'+GOODS_BONUS+' Steuer)'):'keine'},
    ];
    const warns=[];
    if(t.water<=0) warns.push('Kein Wasser — Bewohner ziehen nach und nach weg.');
    else if(t.food<=0) warns.push('Ohne Nahrung steigt das Haus nicht zur höchsten Stufe auf.');
    if(cap>0&&t.res>=cap) warns.push('Voll belegt — neue Häuser schaffen mehr Platz.');
    return {glyph:(H3D[t.lvl]||H3D[0]).glyph, title:'Haus', rows, warns};
  }
  if(t.type==='well'){
    return {glyph:'💧', title:'Brunnen', rows:[
      {k:'Funktion', v:'Versorgt Häuser mit Wasser'},
      roadRow,
      {k:'Trägerintervall', v:'alle '+BUILD.well.every+' Ticks'},
    ], warns: hasRoad?[]:['Keine angrenzende Straße — der Wasserträger kann nicht losziehen.']};
  }
  if(t.type==='market'){
    const w=hasRoad?[]:['Keine angrenzende Straße — der Markthändler kann nicht losziehen.'];
    if((t.bread||0)<=0) w.push('Kein Brot — eine angeschlossene Mühle liefert die Nahrung.');
    return {glyph:'🧺', title:'Markt', rows:[
      {k:'Funktion', v:'Verteilt Brot (Nahrung) & Keramik'},
      {k:'Brot-Lager',    v:(t.bread||0)+' / 8'},
      {k:'Keramik-Lager', v:(t.cer||0)+' / 8'},
      roadRow,
      {k:'Trägerintervall', v:'alle '+BUILD.market.every+' Ticks'},
    ], warns:w};
  }
  if(t.type==='forum'){
    return {glyph:'🏛️', title:'Forum', rows:[
      {k:'Funktion', v:'Treibt Steuern bei versorgten Häusern ein'},
      roadRow,
      {k:'Trägerintervall', v:'alle '+BUILD.forum.every+' Ticks'},
    ], warns: hasRoad?[]:['Keine angrenzende Straße — der Steuereintreiber kann nicht losziehen.']};
  }
  if(t.type==='claypit'){
    const link=!!findPath(x,y,'pottery');
    return {glyph:'🕳️', title:'Lehmgrube', rows:[
      {k:'Funktion', v:'Fördert Lehm'},
      {k:'Liefert an', v:'Töpferei (über Straße)'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns: link?[]:['Keine Straßenverbindung zu einer Töpferei — der Lehm bleibt liegen.']};
  }
  if(t.type==='pottery'){
    const link=!!findPath(x,y,'market'); const w=[];
    if((t.clay||0)<=0) w.push('Kein Lehm — eine angeschlossene Lehmgrube liefert Nachschub.');
    if(!link) w.push('Keine Straßenverbindung zum Markt — Keramik bleibt im Lager.');
    return {glyph:'🏺', title:'Töpferei', rows:[
      {k:'Lehm-Lager',   v:(t.clay||0)+' / 8'},
      {k:'Keramik-Lager',v:(t.cer ||0)+' / 8'},
      {k:'Wandelt', v:'Lehm → Keramik'},
      {k:'Liefert an', v:'Markt (über Straße)'},
    ], warns:w};
  }
  if(t.type==='grainfield'){
    const link=!!findPath(x,y,'mill');
    return {glyph:'🌾', title:'Getreidefeld', rows:[
      {k:'Funktion', v:'Baut Getreide an'},
      {k:'Liefert an', v:'Mühle (über Straße)'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns: link?[]:['Keine Straßenverbindung zu einer Mühle — das Getreide bleibt liegen.']};
  }
  if(t.type==='mill'){
    const link=!!findPath(x,y,'market'); const w=[];
    if((t.grain||0)<=0) w.push('Kein Getreide — ein angeschlossenes Getreidefeld liefert Nachschub.');
    if(!link) w.push('Keine Straßenverbindung zum Markt — das Brot bleibt im Lager.');
    return {glyph:'⚙', title:'Mühle', rows:[
      {k:'Getreide-Lager', v:(t.grain||0)+' / 8'},
      {k:'Brot-Lager',     v:(t.bread||0)+' / 8'},
      {k:'Wandelt', v:'Getreide → Brot'},
      {k:'Liefert an', v:'Markt (über Straße)'},
    ], warns:w};
  }
  return {glyph:'❔', title:'Gebäude', rows:[], warns:[]};
}

function renderPanel(){
  if(!selectedTile)return;
  const {x,y}=selectedTile;
  const d=describeTile(x,y);
  _infoGlyph().textContent=d.glyph;
  _infoHead().textContent=d.title;
  _infoBody().innerHTML=d.rows.map(r=>
    '<div class="irow"><span class="ik">'+r.k+'</span>'+
    '<span class="iv'+(r.cls?' '+r.cls:'')+'">'+r.v+'</span></div>').join('');
  _infoWarn().innerHTML=d.warns.length
    ? d.warns.map(w=>'<div class="iwarn">⚠ '+w+'</div>').join('') : '';
}

/* ============================================================
   4) VERKABELUNG  (von main.js nach dem DOM-Aufbau aufgerufen)
   ============================================================ */
function initSystemUI(){
  const sv=document.getElementById('bSave'), ld=document.getElementById('bLoad'), nw=document.getElementById('bNew');
  if(sv)sv.onclick=()=>saveGame(false);
  if(ld)ld.onclick=()=>loadGame(false);
  if(nw)nw.onclick=()=>newGame();

  document.querySelectorAll('#speed button').forEach(b=>{
    b.onclick=()=>setSpeed(+b.dataset.sp);
  });
  updateSpeedUI();

  const cl=document.getElementById('infoClose');
  if(cl)cl.onclick=()=>closePanel();

  // Auto-Speichern: regelmäßig + beim Verlassen/Schließen
  setInterval(()=>{ if(grid&&grid.length===GRID) saveGame(true); }, 20000);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) saveGame(true); });
  window.addEventListener('pagehide',()=>saveGame(true));
}
