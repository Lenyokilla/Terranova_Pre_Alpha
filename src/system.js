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
    if(typeof units!=='undefined')units=[]; if(typeof selectedUnit!=='undefined')selectedUnit=null;   // Kohorten neu aufstellen
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
  if(typeof units!=='undefined')units=[]; if(typeof selectedUnit!=='undefined')selectedUnit=null;
  if(typeof statReset==='function') statReset();   // Statistik-Historie für neue Karte leeren
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
    const cap=houseCap(t), names=['Hütte','Wohnhaus','Anwesen','Villa','Palast'];
    const att=t.desire||0;
    const rows=[
      {k:'Ausbaustufe', v:names[t.lvl]+' ('+(t.lvl+1)+'/5)'},
      {k:'Einwohner',   v:t.res+' / '+cap},
      {k:'Wasser',      v:t.water>0?'versorgt':'fehlt', cls:t.water>0?'ok':'bad'},
      {k:'Nahrung',     v:t.food >0?'versorgt':'fehlt', cls:t.food >0?'ok':'bad'},
      {k:'Luxus',       v:t.goods>0?('Keramik (+'+GOODS_BONUS+' Steuer)'):'keine'},
      {k:'Möbel',       v:t.furn>0?('Möbel (+'+FURN_BONUS+' Steuer)'):'keine'},
      {k:'Gesundheit',  v:(t.bath>0&&t.doctor>0)?('versorgt (+'+HEALTH_BONUS+' Steuer)'):'unzureichend', cls:(t.bath>0&&t.doctor>0)?'ok':'bad'},
      {k:'Unterhaltung',v:t.entertain>0?('versorgt (+'+ENTERTAIN_BONUS+' Steuer)'):'keine', cls:t.entertain>0?'ok':'bad'},
      {k:'Bildung',     v:(t.schul>0&&t.biblio>0)?('versorgt (+'+(EDU_BONUS+(t.akad>0?EDU_BONUS:0))+' Steuer'+(t.akad>0?', Akademie':'')+')'):'unzureichend', cls:(t.schul>0&&t.biblio>0)?'ok':'bad'},
      {k:'Attraktivität',v:att+(att>=ATTRACT_MIN?(' (+'+ATTRACT_BONUS+' Steuer)'):''), cls:att>=ATTRACT_MIN?'ok':'bad'},
      {k:'Brandschutz', v:t.fireSafe>0?'gesichert':'ungeschützt', cls:t.fireSafe>0?'ok':'bad'},
      {k:'Statik',      v:t.engSafe>0?'geprüft':'ungeprüft', cls:t.engSafe>0?'ok':'bad'},
    ];
    const warns=[];
    if(t.water<=0) warns.push('Kein Wasser — Bewohner ziehen nach und nach weg.');
    else if(t.food<=0) warns.push('Ohne Nahrung bleibt das Haus unter dem Anwesen.');
    else if(t.goods<=0) warns.push('Keramik vom Markt hebt das Haus zur Villa (Stufe 4).');
    else if(t.lvl===3 && att<DESIRE_LVL4) warns.push('🌳 Gärten & Skulpturen in der Nähe (Attraktivität ≥ '+DESIRE_LVL4+') heben die Villa zum Palast (Stufe 5).');
    if(t.plagueRisk) warns.push('🤒 Seuchengefahr — ohne Therme und Arzt erkranken Bewohner. Ein Barbier mindert das Risiko.');
    else if(!(t.bath>0&&t.doctor>0)&&t.res>0){ const miss=[]; if(t.bath<=0)miss.push('Therme'); if(t.doctor<=0)miss.push('Arzt');
      warns.push('Gesundheit unzureichend — es fehlt: '+miss.join(' & ')+'. Eine Einrichtung an einer Straße in der Nähe schützt vor Seuchen.'); }
    if(!(t.schul>0&&t.biblio>0)&&t.res>0){ const miss=[]; if(t.schul<=0)miss.push('Schule'); if(t.biblio<=0)miss.push('Bibliothek');
      warns.push('Bildung unzureichend — es fehlt: '+miss.join(' & ')+'. Eine Akademie verdoppelt zusätzlich den Steuerbonus.'); }
    if(t.fireRisk) warns.push('🔥 Brandgefahr — eine Feuerwache in der Nähe (an einer Straße) schützt.');
    if(t.collapseRisk) warns.push('🏚 Einsturzgefahr — ein Bauingenieur in der Nähe sichert die Statik.');
    if(cap>0&&t.res>=cap) warns.push('Voll belegt — neue Häuser schaffen mehr Platz.');
    return {glyph:(H3D[t.lvl]||H3D[0]).glyph, title:'Haus', rows, warns};
  }
  if(t.type==='statue'){
    const g=DECO.statue, nm=(typeof statueVariantName==='function')?statueVariantName(x,y):g.label;
    return {glyph:g.glyph, title:nm, rows:[
      {k:'Art', v:nm},
      {k:'Funktion', v:'Hebt die Attraktivität der Wohngegend'},
      {k:'Schönheit', v:'+'+g.desire+' im Zentrum'},
      {k:'Reichweite', v:g.range+' Felder (nach außen abnehmend)'},
      {k:'Personal', v:'keines — wirkt sofort, auch ohne Straße'},
    ], warns:['Industrie & Lager in der Nähe mindern die Wirkung — Wohngegend und Produktion trennen.']};
  }
  if(typeof DECO!=='undefined' && DECO[t.type]){
    const g=DECO[t.type];
    return {glyph:g.glyph, title:g.label, rows:[
      {k:'Funktion', v:'Hebt die Attraktivität der Wohngegend'},
      {k:'Schönheit', v:'+'+g.desire+' im Zentrum'},
      {k:'Reichweite', v:g.range+' Felder (nach außen abnehmend)'},
      {k:'Personal', v:'keines — wirkt sofort, auch ohne Straße'},
    ], warns:['Industrie & Lager in der Nähe mindern die Wirkung — Wohngegend und Produktion trennen.']};
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
    if((t.bread||0)<=0) w.push('Keine Nahrung — eine Bäckerei oder ein Fischer liefert Nachschub.');
    return {glyph:'🧺', title:'Markt', rows:[
      {k:'Funktion', v:'Verteilt Nahrung (Brot/Fisch), Keramik & Möbel'},
      {k:'Nahrungs-Lager', v:(t.bread||0)+' / 8'},
      {k:'Keramik-Lager', v:(t.cer||0)+' / 8'},
      {k:'Möbel-Lager', v:(t.furn||0)+' / 8'},
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
  if(t.type==='workshop'){
    const link=!!findPath(x,y,'market'); const w=[];
    if((t.wood||0)<=0) w.push('Kein Holz — ein angeschlossener Holzfäller liefert Nachschub (er beliefert die Schreinerei bevorzugt vor dem Lager).');
    if(!link) w.push('Keine Straßenverbindung zum Markt — die Möbel bleiben im Lager.');
    return {glyph:'🪑', title:'Schreinerei', rows:[
      {k:'Holz-Lager',  v:(t.wood||0)+' / 8'},
      {k:'Möbel-Lager', v:(t.furn||0)+' / 8'},
      {k:'Wandelt', v:'Holz → Möbel'},
      {k:'Liefert an', v:'Markt (über Straße)'},
    ], warns:w};
  }
  if(t.type==='grainfield'){
    const link=!!findPath(x,y,'mill');
    return {glyph:'🌾', title:'Getreidefeld', rows:[
      {k:'Funktion', v:'Baut Getreide an (auch ohne Straße)'},
      {k:'Getreide-Lager', v:(t.grain||0)+' / 8'},
      {k:'Liefert an', v:'Mühle (über Straße)'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns: link?[]:['Ohne Straße zur Mühle füllt sich nur das Lager — angebaut wird trotzdem.']};
  }
  if(t.type==='farm'){
    const link=!!findPath(x,y,'mill');
    return {glyph:'🐂', title:'Bauernhof', rows:[
      {k:'Funktion', v:'Erntet Getreide das ganze Jahr (kontinuierlich)'},
      {k:'Getreide-Lager', v:(t.grain||0)+' / 8'},
      {k:'Liefert an', v:'Mühle (über Straße)'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns: link?[]:['Keine Straße zur Mühle — das Getreide bleibt im Lager.']};
  }
  if(t.type==='mill'){
    const link=!!findPath(x,y,'bakery'); const w=[];
    if((t.grain||0)<=0) w.push('Kein Getreide — ein angeschlossenes Feld oder ein Bauernhof liefert Nachschub.');
    if(!link) w.push('Keine Straßenverbindung zur Bäckerei — das Mehl bleibt im Lager.');
    return {glyph:'⚙', title:'Mühle', rows:[
      {k:'Getreide-Lager', v:(t.grain||0)+' / 8'},
      {k:'Mehl-Lager',     v:(t.flour||0)+' / 8'},
      {k:'Wandelt', v:'Getreide → Mehl'},
      {k:'Liefert an', v:'Bäckerei (über Straße)'},
    ], warns:w};
  }
  if(t.type==='bakery'){
    const link=!!findPath(x,y,'market'); const w=[];
    if((t.flour||0)<=0) w.push('Kein Mehl — eine angeschlossene Mühle liefert Nachschub.');
    if(!link) w.push('Keine Straßenverbindung zum Markt — die Nahrung bleibt im Lager.');
    return {glyph:'🍞', title:'Bäckerei', rows:[
      {k:'Mehl-Lager',    v:(t.flour||0)+' / 8'},
      {k:'Nahrung-Lager', v:(t.bread||0)+' / 8'},
      {k:'Wandelt', v:'Mehl → Nahrung'},
      {k:'Liefert an', v:'Markt (über Straße)'},
    ], warns:w};
  }
  if(t.type==='fisher'){
    const link=!!findPath(x,y,'market');
    const school=!!findWaterPath(x,y);
    const w=[];
    if(!school) w.push('Kein Fischschwarm über Wasser erreichbar — die Hütte muss an einem See/Fluss mit Schwarm liegen.');
    if(!link) w.push('Keine Straßenverbindung zum Markt — der Fang bleibt im Lager.');
    return {glyph:'🎣', title:'Fischer', rows:[
      {k:'Funktion', v:'Boot fängt Fisch am Schwarm (endlos)'},
      {k:'Fisch-Lager', v:(t.fish||0)+' / 8'},
      {k:'Fischschwarm', v:school?'erreichbar':'keiner', cls:school?'ok':'bad'},
      {k:'Liefert an', v:'Markt (über Straße)'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns:w};
  }
  if(t.type==='firehouse'){
    return {glyph:'🧯', title:'Feuerwache', rows:[
      {k:'Funktion', v:'Schützt nahe Gebäude vor Brand'},
      {k:'Reichweite', v:'entlang der Straße (Läufer)'},
      {k:'Trägerintervall', v:'alle '+BUILD.firehouse.every+' Ticks'},
    ], warns: adjRoad(x,y)?[]:['Keine angrenzende Straße — der Brandschutz-Läufer kann nicht losziehen.']};
  }
  if(t.type==='engineer'){
    return {glyph:'🛠', title:'Bauingenieur', rows:[
      {k:'Funktion', v:'Sichert nahe Gebäude gegen Einsturz'},
      {k:'Reichweite', v:'entlang der Straße (Läufer)'},
      {k:'Trägerintervall', v:'alle '+BUILD.engineer.every+' Ticks'},
    ], warns: adjRoad(x,y)?[]:['Keine angrenzende Straße — der Ingenieur kann nicht losziehen.']};
  }
  if(t.type==='woodcutter'){
    const link=!!findPath(x,y,'warehouse');
    const near=neighbors(x,y).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='forest');
    const w=[];
    if(!near) w.push('Kein angrenzender Wald — der Holzfäller braucht Wald nebenan.');
    if(!link) w.push('Keine Straßenverbindung zum Lagerhaus — das Holz bleibt liegen.');
    return {glyph:'🪓', title:'Holzfäller', rows:[
      {k:'Funktion', v:'Schlägt Holz (Wald wächst nach)'},
      {k:'Holz-Lager', v:(t.wood||0)+' / 8'},
      {k:'Liefert an', v:'Lagerhaus (über Straße)'},
      {k:'Wald', v:near?'angrenzend':'fehlt', cls:near?'ok':'bad'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns:w};
  }
  if(t.type==='quarry'){
    const link=!!findPath(x,y,'warehouse');
    const near=neighbors(x,y).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='rock');
    const w=[];
    if(!near) w.push('Kein angrenzendes Steinvorkommen — der Steinbruch braucht Fels nebenan.');
    if(!link) w.push('Keine Straßenverbindung zum Lagerhaus — der Stein bleibt liegen.');
    return {glyph:'⛏️', title:'Steinbruch', rows:[
      {k:'Funktion', v:'Bricht Stein (unerschöpflich)'},
      {k:'Stein-Lager', v:(t.stone||0)+' / 8'},
      {k:'Liefert an', v:'Lagerhaus (über Straße)'},
      {k:'Fels', v:near?'angrenzend':'fehlt', cls:near?'ok':'bad'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns:w};
  }
  if(t.type==='marblequarry'){
    const link=!!findPath(x,y,'warehouse');
    const near=neighbors(x,y).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='marble');
    const w=[];
    if(!near) w.push('Kein angrenzendes Marmorvorkommen — der Marmorbruch braucht Marmorfels nebenan.');
    if(!link) w.push('Keine Straßenverbindung zum Lagerhaus — der Marmor bleibt liegen.');
    return {glyph:'🪨', title:'Marmorbruch', rows:[
      {k:'Funktion', v:'Bricht Marmor'},
      {k:'Marmor-Lager', v:(t.marble||0)+' / 8'},
      {k:'Liefert an', v:'Lagerhaus (über Straße)'},
      {k:'Marmorfels', v:near?'angrenzend':'fehlt', cls:near?'ok':'bad'},
      {k:'Verbindung', v:link?'ja':'keine', cls:link?'ok':'bad'},
    ], warns:w};
  }
  if(t.type==='warehouse'){
    const m=whMaster(x,y), a=(m.wh||[x,y]);
    const tiles=[[a[0],a[1]],[a[0]+1,a[1]],[a[0],a[1]+1],[a[0]+1,a[1]+1]];
    const road=tiles.some(([tx,ty])=>inBounds(tx,ty)&&!!adjRoad(tx,ty));
    return {glyph:'📦', title:'Lagerhaus', rows:[
      {k:'Funktion', v:'Lagert Rohstoffe (2×2 Felder)'},
      {k:'🪵 Holz',   v:(m.wood||0)+' / '+WH_CAP},
      {k:'🪨 Stein',  v:(m.stone||0)+' / '+WH_CAP},
      {k:'🤍 Marmor', v:(m.marble||0)+' / '+WH_CAP},
      {k:'Straßenanschluss', v:road?'ja':'nein', cls:road?'ok':'bad'},
    ], warns: road?[]:['Keine angrenzende Straße — es kann nichts angeliefert werden.']};
  }
  if(t.type==='roadblock'){
    return {glyph:'🚧', title:'Straßensperre', rows:[
      {k:'Funktion', v:'Läufer meiden diese Kachel'},
      {k:'Zweck', v:'Lenkt Träger & Versorger auf andere Wege'},
      {k:'Entfernen', v:'mit Abriss (Straße bleibt)'},
    ], warns:[]};
  }
  if(typeof HEALTH!=='undefined' && HEALTH[t.type]){
    const g=HEALTH[t.type];
    const need={bath:'Bad & Hygiene',doctor:'medizinische Versorgung',barber:'Zusatz-Hygiene'}[g.need]||'Gesundheit';
    return {glyph:g.glyph, title:g.label, rows:[
      {k:'Funktion', v:'Versorgt nahe Häuser: '+need},
      {k:'Reichweite', v:'entlang der Straße (Läufer)'},
      {k:'Gesund =', v:'Therme + Arzt (+'+HEALTH_BONUS+' Steuer, schützt vor Seuchen)'},
      roadRow,
      {k:'Trägerintervall', v:'alle '+BUILD[t.type].every+' Ticks'},
    ], warns: hasRoad?[]:['Keine angrenzende Straße — der Bedienstete kann nicht losziehen.']};
  }
  if(typeof EDUCATION!=='undefined' && EDUCATION[t.type]){
    const g=EDUCATION[t.type];
    const need={schul:'Grundbildung',biblio:'Wissen & Lektüre',akad:'Gelehrsamkeit (Prestige)'}[g.need]||'Bildung';
    return {glyph:g.glyph, title:g.label, rows:[
      {k:'Funktion', v:'Versorgt nahe Häuser: '+need},
      {k:'Reichweite', v:'entlang der Straße (Läufer)'},
      {k:'Gebildet =', v:'Schule + Bibliothek (+'+EDU_BONUS+' Steuer); Akademie verdoppelt'},
      roadRow,
      {k:'Trägerintervall', v:'alle '+BUILD[t.type].every+' Ticks'},
    ], warns: hasRoad?[]:['Keine angrenzende Straße — der Bedienstete kann nicht losziehen.']};
  }
  if(typeof CULTURE!=='undefined' && CULTURE[t.type]){
    const g=CULTURE[t.type], a=t.anchor||[x,y];
    const mst=(inBounds(a[0],a[1])?grid[a[1]][a[0]]:t), f=g.foot;
    const road=(typeof footAdjRoad==='function')?!!footAdjRoad(a[0],a[1],f):hasRoad;
    return {glyph:g.glyph, title:g.label, rows:[
      {k:'Funktion', v:'Unterhält nahe Häuser (Spektakel)'},
      {k:'Grundfläche', v:f[0]+'×'+f[1]+' Felder'},
      {k:'Reichweite', v:'entlang der Straße (Läufer)'},
      {k:'Wirkung', v:'+'+ENTERTAIN_BONUS+' Steuer & mehr Zufriedenheit'},
      {k:'Betrieb', v:mst.staffed?'in Betrieb':'unbesetzt', cls:mst.staffed?'ok':'bad'},
      {k:'Straßenanschluss', v:road?'ja':'nein', cls:road?'ok':'bad'},
      {k:'Trägerintervall', v:'alle '+g.every+' Ticks'},
    ], warns: road?[]:['Keine Straße am Footprint — die Besucher-Läufer können nicht losziehen.']};
  }
  if(typeof describeMilitary==='function'){ const md=describeMilitary(x,y); if(md) return md; }
  return {glyph:'❔', title:'Gebäude', rows:[], warns:[]};
}

function renderPanel(){
  if(!selectedTile)return;
  const {x,y}=selectedTile;
  const d=describeTile(x,y);
  const tt=grid[y][x];
  if(BUILD[tt.type]&&BUILD[tt.type].jobs){                       // globale Arbeitskräfte
    d.rows.push({k:'Arbeitskräfte', v: tt.staffed?('besetzt ('+BUILD[tt.type].jobs+')'):'keine', cls: tt.staffed?'ok':'bad'});
    d.rows.push({k:'Arbeiter (Stadt)', v: workersFree+' frei / '+workersTotal+' gesamt'});
    if(!tt.staffed) d.warns.push('Keine freien Arbeitskräfte — mehr Einwohner/Häuser bringen Arbeiter.');
  }
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
