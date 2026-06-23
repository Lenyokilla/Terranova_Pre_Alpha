/* TERRA · input.js */
// ---- Aktionen ----
function place(gx,gy){
  if(!inBounds(gx,gy))return; const c=grid[gy][gx];
  if(tool==='raze'){
    if(c.type!=='empty'){
      if(c.type==='roadblock'){ c.type='road'; }                    // Sperre entfernen — Straße bleibt
      else if(c.type==='warehouse'){ const a=c.wh||[gx,gy];          // Lagerhaus: alle 4 Felder abreißen
        for(const [tx,ty] of [[a[0],a[1]],[a[0]+1,a[1]],[a[0],a[1]+1],[a[0]+1,a[1]+1]])
          if(inBounds(tx,ty)&&grid[ty][tx].type==='warehouse') razeTile(grid[ty][tx]);
      } else if(c.anchor){ const [ax,ay]=c.anchor, f=(BUILD[c.type]&&BUILD[c.type].foot)||[1,1];   // Mehrfeld-Bauwerk: ganzen Footprint abreißen
        for(let j=0;j<f[1];j++)for(let i=0;i<f[0];i++){ const tx=ax+i,ty=ay+j;
          if(inBounds(tx,ty)&&grid[ty][tx].anchor&&grid[ty][tx].anchor[0]===ax&&grid[ty][tx].anchor[1]===ay) razeTile(grid[ty][tx]); }
      } else razeTile(c);
      updateHUD();
    } return;
  }
  if(tool==='roadblock'){                                            // Straßensperre auf einer Straße toggeln
    if(c.type==='road'){ c.type='roadblock'; if(typeof sfxBuild==='function')sfxBuild(); updateHUD(); }
    else if(c.type==='roadblock'){ c.type='road'; updateHUD(); }     // erneut tippen entfernt sie
    else flash('Sperre nur auf einer Straße setzen');
    return;
  }
  const def=BUILD[tool]; if(!def||def.util)return;
  if(tool==='warehouse'){ placeWarehouse(gx,gy); return; }              // 2×2-Sonderfall (Buchten-Lager)
  if(def.foot){ placeMulti(gx,gy,tool); return; }                      // mehrfeldrige Spielstätte (ein Bauwerk)
  if(!buildableTerr(c)){flash(c.terr==='water'?'Auf Wasser kann nicht gebaut werden':'Auf Bergen/Fels kann nicht gebaut werden');return;}
  if(c.type!=='empty'){flash('Feld belegt');return;}
  if(tool==='fisher' && !neighbors(gx,gy).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='water')){
    flash('Fischer muss ans Wasser grenzen');return;}
  if(tool==='woodcutter' && !neighbors(gx,gy).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='forest')){
    flash('Holzfäller muss an einen Wald grenzen');return;}
  if(tool==='quarry' && !neighbors(gx,gy).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='rock')){
    flash('Steinbruch muss an ein Steinvorkommen grenzen');return;}
  if(tool==='marblequarry' && !neighbors(gx,gy).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='marble')){
    flash('Marmorbruch muss an ein Marmorvorkommen grenzen');return;}
  if(money<def.cost){flash('Zu wenig Denar — nutze +100');return;}
  money-=def.cost; buildOn(c,tool,def.service); updateHUD();
  if(typeof statExp==='function')statExp(def.cost);
  if(typeof floatText==='function')floatText(gx,gy,'-'+def.cost+' D','#e8916a');
  if(typeof sfxBuild==='function')sfxBuild();
}
// Lagerhaus belegt 2×2 Felder (Anker = obere/N-Kachel); Bucht 0 ist Master (Logik + Lagerbestand)
function placeWarehouse(gx,gy){
  const def=BUILD.warehouse;
  const cells=[[gx,gy],[gx+1,gy],[gx,gy+1],[gx+1,gy+1]];
  for(const [tx,ty] of cells){
    if(!inBounds(tx,ty)){ flash('Lagerhaus braucht 2×2 freie Felder');return; }
    const t=grid[ty][tx];
    if(!buildableTerr(t)){ flash('Untergrund ungeeignet (Wasser/Berg/Fels)');return; }
    if(t.type!=='empty'){ flash('2×2-Fläche nicht frei');return; }
  }
  if(money<def.cost){ flash('Zu wenig Denar — nutze +100');return; }
  money-=def.cost;
  cells.forEach(([tx,ty],i)=>{ const t=grid[ty][tx]; buildOn(t,'warehouse'); t.wh=[gx,gy]; t.bay=i; t.whMaster=(i===0); });
  updateHUD();
  if(typeof statExp==='function')statExp(def.cost);
  if(typeof floatText==='function')floatText(gx,gy,'-'+def.cost+' D','#e8916a');
  if(typeof sfxBuild==='function')sfxBuild();
}
// Mehrfeldrige Spielstätte: belegt foot=[w,h] Felder (Anker = N-Kachel = gx,gy).
// Nur die Anker-Kachel ist Master (Logik/Jobs/Unterhalt); die übrigen sind Platzhalter.
// Verlangt flachen, freien Untergrund (kein Hügel/Berg/Wasser/Fels) für die ganze Fläche.
function placeMulti(gx,gy,type){
  const def=BUILD[type], [w,h]=def.foot, cells=[];
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){ const tx=gx+i, ty=gy+j;
    if(!inBounds(tx,ty)){ flash(def.label+' braucht '+w+'×'+h+' freie, flache Felder'); return; }
    const t=grid[ty][tx];
    if(!buildableTerr(t) || (TERR[t.terr]&&TERR[t.terr].elev>0)){ flash('Untergrund ungeeignet — '+w+'×'+h+' flache Felder nötig'); return; }
    if(t.type!=='empty'){ flash(w+'×'+h+'-Fläche nicht frei'); return; }
    cells.push([tx,ty]);
  }
  if(money<def.cost){ flash('Zu wenig Denar — nutze +100'); return; }
  money-=def.cost;
  cells.forEach(([tx,ty])=>{ const t=grid[ty][tx]; buildOn(t,type,def.service); t.anchor=[gx,gy]; t.master=(tx===gx&&ty===gy); });
  updateHUD();
  if(typeof statExp==='function')statExp(def.cost);
  if(typeof floatText==='function')floatText(gx,gy,'-'+def.cost+' D','#e8916a');
  if(typeof sfxBuild==='function')sfxBuild();
}
function flash(msg){hint.textContent=msg;hint.classList.remove('hide');
  clearTimeout(flash._t);flash._t=setTimeout(()=>hint.classList.add('hide'),1500);}

// ---- HUD & Dock ----
const elMoney=document.getElementById('money'),elPop=document.getElementById('pop'),hint=document.getElementById('hint');
const elGoal=document.getElementById('goal'),banner=document.getElementById('banner');
function updateHUD(){elMoney.textContent=money;elPop.textContent=pop;elGoal.textContent='/'+GOAL_POP;
  if(lost){banner.textContent='💸 Bankrott! Tippe +100 zum Weiterspielen';banner.className='lose';}
  else banner.className='hide';
  if(typeof refreshPanel==='function')refreshPanel();
}
document.getElementById('cheat').onclick=()=>{money+=100;updateHUD();flash('+100 Denar (Testmodus)');};

// ---- Baumenü: Kategorien + Direktzugriff ----
// Kategorien gruppieren die Baugebäude. Die Tempel werden automatisch aus BUILD
// gezogen (service==='religion'), damit neue Götter aus config.js ohne Menü-
// Änderung im Religions-Flyout erscheinen.
const CATS=[
  {key:'prod',  label:'Produktion', glyph:'🏺',  items:['claypit','pottery']},
  {key:'mat',   label:'Baustoffe',  glyph:'🪵',  items:['woodcutter','quarry','marblequarry','warehouse']},
  {key:'food',  label:'Nahrung',    glyph:'🌾',  items:['grainfield','farm','mill','bakery','fisher','market']},
  {key:'faith', label:'Religion',   glyph:'🏛️', items:Object.keys(BUILD).filter(k=>BUILD[k].service==='religion')},
  {key:'health',label:'Gesundheit', glyph:'⚕️', items:Object.keys(BUILD).filter(k=>BUILD[k].service==='health')},
  {key:'edu',   label:'Bildung',    glyph:'🎓', items:Object.keys(BUILD).filter(k=>BUILD[k].service==='education')},
  {key:'fun',   label:'Kultur',     glyph:'🎭', items:Object.keys(BUILD).filter(k=>BUILD[k].service==='entertain')},
  {key:'civic', label:'Sicherheit', glyph:'🛡',  items:['well','forum','firehouse','engineer']},
];
const DIRECT=['road','roadblock','house','raze'];     // immer direkt erreichbar (kein Untermenü)

const dockEl=document.getElementById('dock'); dockEl.style.position='relative';
const toolsEl=document.getElementById('tools');           // untere Leiste: Kategorien + Direktzugriff
// Flyout = obere Reihe mit den Gebäuden der offenen Kategorie.
// Es liegt ABSOLUT über dem Dock (bottom:100%), also AUSSERHALB des Layout-Flusses
// -> die Stage wird nicht mehr gestaucht. Alle nötigen Styles sind inline gesetzt,
//    damit keine styles.css-Änderung erforderlich ist.
const flyout=document.createElement('div'); flyout.id='flyout';
Object.assign(flyout.style,{
  position:'absolute', left:'0', right:'0', bottom:'100%', zIndex:'4',
  display:'none', gap:'7px', overflowX:'auto', padding:'9px 8px',
  background:'linear-gradient(0deg,var(--panel),var(--panel-2))',
  borderTop:'1px solid var(--panel-line)',
  boxShadow:'0 -7px 16px rgba(0,0,0,.4)'
});
dockEl.appendChild(flyout);
let openCat=null;

function syncTools(){document.querySelectorAll('.tool').forEach(t=>t.classList.toggle('active',t.dataset.key===tool));}
// Kategorie-Knopf optisch öffnen/schließen (inline, ohne CSS-Klasse)
function paintCat(btn,on){
  btn.style.borderColor = on?'var(--gold)':'var(--panel-line)';
  btn.style.background  = on?'#2c2012':'#22190e';
  btn.style.boxShadow   = on?'0 0 0 1px var(--gold) inset':'none';
  const c=btn.querySelector('.cat-c');
  if(c){c.textContent=on?'▴':'▾'; c.style.color=on?'var(--gold)':'#a98';}
}

// Einzelner Bau-/Werkzeug-Knopf (Verhalten exakt wie zuvor)
function makeTool(key){
  const d=BUILD[key]; const b=document.createElement('button');
  b.className='tool'+(d.util?' util':'')+(DIRECT.includes(key)?' direct':'');
  b.dataset.key=key;
  b.innerHTML='<span class="glyph">'+d.glyph+'</span><span class="nm">'+d.label+'</span>'+
    '<span class="cost">'+(d.util?'—':d.cost)+'</span>';
  b.onclick=()=>{
    if(typeof audioInit==='function')audioInit(); if(typeof sfxClick==='function')sfxClick();
    tool=(tool===key && key!=='hand')?'hand':key;          // erneutes Tippen -> zurück zur Navigation
    if(tool!=='hand'&&typeof closePanel==='function')closePanel();
    syncTools();
    const d2=BUILD[tool];
    let msg;
    if(tool==='roadblock') msg='Straßensperre — tippe auf eine Straße (Läufer kehren um)';
    else if(d2.util) msg=(tool==='hand'?'Karte schieben & zoomen':'Tippe ein Gebäude zum Abreißen');
    else msg=d2.label+' — tippe auf die Karte ('+d2.cost+' Denar)';
    flash(msg);};
  return b;
}

// Kategorie öffnen/schließen (Toggle): zweites Tippen blendet die Untergebäude aus
function openCategory(cat){
  if(openCat===cat.key){closeFlyout();return;}             // gleiche Kategorie erneut -> zuklappen
  openCat=cat.key; flyout.innerHTML='';
  cat.items.forEach(k=>flyout.appendChild(makeTool(k)));
  flyout.style.display='flex'; syncTools();
  document.querySelectorAll('.cat').forEach(c=>paintCat(c,c.dataset.cat===cat.key));
}
function closeFlyout(){openCat=null; flyout.style.display='none'; flyout.innerHTML='';
  document.querySelectorAll('.cat').forEach(c=>paintCat(c,false));}

// Untere Leiste: ZUERST die wichtigen Direkt-Werkzeuge (Straße/Sperre/Haus/Abriss),
// dann ein Trenner, danach die Kategorie-Übermenüs der übrigen Gebäude.
DIRECT.forEach(key=>{const b=makeTool(key);const sel=b.onclick;
  b.onclick=e=>{closeFlyout();sel(e);};                    // Direktzugriff schließt ein offenes Flyout
  toolsEl.appendChild(b);});
const divider=document.createElement('div');
Object.assign(divider.style,{flex:'0 0 auto',alignSelf:'stretch',width:'1px',margin:'3px 3px',background:'var(--panel-line)'});
toolsEl.appendChild(divider);
CATS.forEach(cat=>{const b=document.createElement('button');
  b.className='tool cat'; b.dataset.cat=cat.key; b.style.background='#22190e';
  b.innerHTML='<span class="glyph">'+cat.glyph+'</span><span class="nm">'+cat.label+'</span>'+
    '<span class="cost cat-c" style="color:#a98">▾</span>';
  b.onclick=()=>{if(typeof sfxClick==='function')sfxClick();openCategory(cat);};
  toolsEl.appendChild(b);});

// ---- Touch / Pointer ----
const pointers=new Map(); let panLast=null,pinchLast=null,paintSet=new Set();
let roadDrag=null;          // Startfeld beim Straßenziehen
let previewCells=[];        // Vorschau der geplanten Strecke
let tapInfo=null;           // Hand-Tipp (kein Schieben) -> Gebäude-Info

function cellAt(e){const r=cv.getBoundingClientRect();return screenToGrid(e.clientX-r.left,e.clientY-r.top);}
function setHint(msg){hint.textContent=msg;hint.classList.remove('hide');clearTimeout(flash._t);}

// L-förmige Strecke vom Start- zum Zielfeld (entlang der dominanten Achse zuerst)
function linePath(a,b){
  const out=[]; const dx=b.gx-a.gx, dy=b.gy-a.gy, sx=dx>0?1:-1, sy=dy>0?1:-1;
  if(Math.abs(dx)>=Math.abs(dy)){
    for(let x=a.gx;;x+=sx){out.push({x,y:a.gy}); if(x===b.gx)break;}
    for(let y=a.gy;;y+=sy){if(y!==a.gy)out.push({x:b.gx,y}); if(y===b.gy)break;}
  }else{
    for(let y=a.gy;;y+=sy){out.push({x:a.gx,y}); if(y===b.gy)break;}
    for(let x=a.gx;;x+=sx){if(x!==a.gx)out.push({x,y:b.gy}); if(x===b.gx)break;}
  }
  return out.filter(c=>inBounds(c.x,c.y));
}
function commitRoad(cells){
  let built=0;
  for(const c of cells){const t=grid[c.y][c.x];
    if(t.type!=='empty'||!buildableTerr(t))continue;
    if(money<BUILD.road.cost){flash('Zu wenig Denar — nutze +100');break;}
    money-=BUILD.road.cost; t.type='road'; built++;}
  if(built&&typeof statExp==='function')statExp(built*BUILD.road.cost);
  if(built)updateHUD(); return built;
}

cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);
  if(typeof audioInit==='function')audioInit(); if(typeof sfxClick==='function')sfxClick();
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){panLast={x:e.clientX,y:e.clientY};
    if(tool==='road'){roadDrag=cellAt(e);previewCells=linePath(roadDrag,roadDrag);}
    else if(tool==='hand'){tapInfo={x:e.clientX,y:e.clientY,moved:false};}
    else {paintSet.clear();paintAt(e);}}
  else if(pointers.size===2){roadDrag=null;previewCells=[];tapInfo=null;const p=[...pointers.values()];
    pinchLast={d:dist(p[0],p[1]),mx:(p[0].x+p[1].x)/2,my:(p[0].y+p[1].y)/2};panLast=null;}});
cv.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2){const p=[...pointers.values()];
    const d=dist(p[0],p[1]),mx=(p[0].x+p[1].x)/2,my=(p[0].y+p[1].y)/2;
    if(pinchLast){zoomAt(mx,my,d/pinchLast.d);cam.x+=mx-pinchLast.mx;cam.y+=my-pinchLast.my;}
    pinchLast={d,mx,my};return;}
  if(tool==='hand'){if(panLast){cam.x+=e.clientX-panLast.x;cam.y+=e.clientY-panLast.y;}panLast={x:e.clientX,y:e.clientY};
    if(tapInfo&&Math.hypot(e.clientX-tapInfo.x,e.clientY-tapInfo.y)>8)tapInfo.moved=true;}
  else if(tool==='road'&&roadDrag){previewCells=linePath(roadDrag,cellAt(e));
    const n=previewCells.filter(c=>grid[c.y][c.x].type==='empty'&&buildableTerr(grid[c.y][c.x])).length;
    setHint('Straße: '+n+' Felder · '+(n*BUILD.road.cost)+' Denar');}
  else if(tool==='raze'){paintAt(e);}});
function endPtr(e){pointers.delete(e.pointerId);
  if(pointers.size<2)pinchLast=null; if(pointers.size===0)panLast=null;
  if(tool==='road'&&roadDrag&&pointers.size===0){
    const n=commitRoad(previewCells);
    flash(n?('Straße gebaut: '+n+' Felder'):'Keine freien Felder');
    if(n&&typeof sfxBuild==='function')sfxBuild();
    roadDrag=null;previewCells=[];}
  if(tool==='hand'&&pointers.size===0&&tapInfo){
    if(!tapInfo.moved){const {gx,gy}=cellAt(e);
      if(inBounds(gx,gy)&&hasObject(gx,gy)){ if(typeof openPanel==='function')openPanel(gx,gy); }
      else if(typeof closePanel==='function')closePanel();}
    tapInfo=null;}}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
function paintAt(e){const {gx,gy}=cellAt(e);const key=gx+','+gy;
  if(paintSet.has(key))return;paintSet.add(key);place(gx,gy);}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function zoomAt(cx,cy,f){const r=cv.getBoundingClientRect();const old=cam.scale;
  cam.scale=Math.max(0.22,Math.min(1.8,cam.scale*f));const k=cam.scale/old;
  const lx=cx-r.left,ly=cy-r.top;cam.x=lx-(lx-cam.x)*k;cam.y=ly-(ly-cam.y)*k;}
document.getElementById('zin').onclick=()=>{const r=cv.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1.2);};
document.getElementById('zout').onclick=()=>{const r=cv.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1/1.2);};
