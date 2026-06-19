/* TERRA · input.js */
// ---- Aktionen ----
function place(gx,gy){
  if(!inBounds(gx,gy))return; const c=grid[gy][gx];
  if(tool==='raze'){if(c.type!=='empty'){razeTile(c);updateHUD();}return;}
  const def=BUILD[tool]; if(!def||def.util)return;
  if(!buildableTerr(c)){flash(c.terr==='water'?'Auf Wasser kann nicht gebaut werden':'Auf Bergen kann nicht gebaut werden');return;}
  if(c.type!=='empty'){flash('Feld belegt');return;}
  if(money<def.cost){flash('Zu wenig Denar — nutze +100');return;}
  money-=def.cost; buildOn(c,tool,def.service); updateHUD();
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

const toolsEl=document.getElementById('tools');
ORDER.forEach(key=>{const d=BUILD[key];const b=document.createElement('button');
  b.className='tool'+(d.util?' util':'')+(key==='hand'?' active':'');b.dataset.key=key;
  b.innerHTML='<span class="glyph">'+d.glyph+'</span><span class="nm">'+d.label+'</span>'+
    (d.util?'<span class="cost">'+(key==='hand'?'∞':'—')+'</span>':'<span class="cost">'+d.cost+'</span>');
  b.onclick=()=>{
    if(typeof audioInit==='function')audioInit(); if(typeof sfxClick==='function')sfxClick();
    tool = (tool===key && key!=='hand') ? 'hand' : key;   // erneutes Tippen -> zurück zur Navigation
    if(tool!=='hand'&&typeof closePanel==='function')closePanel();
    document.querySelectorAll('.tool').forEach(t=>t.classList.toggle('active',t.dataset.key===tool));
    const d2=BUILD[tool];
    flash(d2.util?(tool==='hand'?'Karte schieben & zoomen':'Tippe ein Gebäude zum Abreißen'):d2.label+' — tippe auf die Karte ('+d2.cost+' Denar)');};
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
