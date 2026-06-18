/* TERRA · sim.js */
// ---- Simulation ----
function neighbors(x,y){return [[x,y-1],[x+1,y],[x,y+1],[x-1,y]];}
function riskable(tp){return tp==='house'||tp==='market'||tp==='forum'||tp==='pottery'||tp==='claypit'||tp==='mill';}
function adjRoad(x,y){return neighbors(x,y).find(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].type==='road');}
// kürzester Straßenweg vom Quellgebäude zum nächsten Zielgebäude (BFS)
function findPath(sx,sy,destType){
  const starts=neighbors(sx,sy).filter(([x,y])=>inBounds(x,y)&&grid[y][x].type==='road');
  if(!starts.length)return null;
  const q=[],prev={},seen=new Set();
  for(const [x,y] of starts){const k=x+','+y;seen.add(k);prev[k]=null;q.push([x,y]);}
  let road=null,dest=null;
  while(q.length){const [x,y]=q.shift();
    const d=neighbors(x,y).find(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].type===destType);
    if(d){road=[x,y];dest=d;break;}
    for(const [nx,ny] of neighbors(x,y)){if(inBounds(nx,ny)&&grid[ny][nx].type==='road'){const k=nx+','+ny;
      if(!seen.has(k)){seen.add(k);prev[k]=[x,y];q.push([nx,ny]);}}}
  }
  if(!road)return null;
  const path=[];let cur=road;while(cur){path.unshift(cur);cur=prev[cur[0]+','+cur[1]];}
  return {path,dest};
}
function spawnCarrier(fp,cargo,color){const [sx,sy]=fp.path[0];
  walkers.push({x:sx,y:sy,path:fp.path,pi:0,dest:fp.dest,cargo,color,prog:0,dx:0,dy:0,from:null});}
function deliverCargo(w){const [dx,dy]=w.dest;if(!inBounds(dx,dy))return;const t=grid[dy][dx];
  if(w.cargo==='clay'&&t.type==='pottery')t.clay=Math.min(8,(t.clay||0)+1);
  else if(w.cargo==='cer'&&t.type==='market')t.cer=Math.min(8,(t.cer||0)+1);
  else if(w.cargo==='grain'&&t.type==='mill')t.grain=Math.min(8,(t.grain||0)+1);
  else if(w.cargo==='bread'&&t.type==='market')t.bread=Math.min(8,(t.bread||0)+1);}

// ---- Einwanderung vom Kartenrand ----
function landWalk(x,y){ if(!inBounds(x,y))return false; const t=grid[y][x];
  if((TERR[t.terr]||TERR.grass).build===false) return false;             // Wasser/Berg blockieren
  const b=t.type; if(b==='house'||b==='well'||b==='market'||b==='forum'||b==='claypit'||b==='pottery'||b==='grainfield'||b==='mill') return false;
  return true; }
function houseCap(h){return HOUSE[h.lvl].pop;}
function needsResident(t){return t.type==='house'&&t.lvl>=1&&t.res<houseCap(t);}
// BFS von begehbaren Randfeldern zum nächsten Haus mit freiem Platz
function findImmigrantPath(){
  const q=[],prev={},seen=new Set();
  const seed=(x,y)=>{ if(landWalk(x,y)){const k=x+','+y; if(!seen.has(k)){seen.add(k);prev[k]=null;q.push([x,y]);}} };
  for(let x=0;x<GRID;x++){ seed(x,0); seed(x,GRID-1); }
  for(let y=0;y<GRID;y++){ seed(0,y); seed(GRID-1,y); }
  while(q.length){const [x,y]=q.shift();
    const h=neighbors(x,y).find(([nx,ny])=>inBounds(nx,ny)&&needsResident(grid[ny][nx]));
    if(h){ const path=[]; let cur=[x,y]; while(cur){path.unshift(cur); cur=prev[cur[0]+','+cur[1]];} return {path,dest:h}; }
    for(const [nx,ny] of neighbors(x,y)) if(landWalk(nx,ny)){const k=nx+','+ny;
      if(!seen.has(k)){seen.add(k);prev[k]=[x,y];q.push([nx,ny]);}}
  }
  return null;
}
function spawnSettler(){ const fp=findImmigrantPath(); if(!fp)return false;
  const [sx,sy]=fp.path[0];
  walkers.push({x:sx,y:sy,path:fp.path,pi:0,dest:fp.dest,kind:'settler',color:'#caa15a',prog:0,dx:0,dy:0,from:null});
  return true; }
function settlerArrive(w){ const [hx,hy]=w.dest; if(!inBounds(hx,hy))return; const h=grid[hy][hx];
  if(h.type==='house'&&h.res<houseCap(h)) h.res++; }

function tick(){
  tickCount++;
  // ---- Globale Arbeitskräfte (Einwohner = Arbeiter), ohne Straßenbindung ----
  let labor=pop;
  const RANK={well:0,firehouse:1,engineer:2,market:3,forum:4,grainfield:5,claypit:6,pottery:7,mill:8};
  const jobsT=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const c=grid[y][x]; if(BUILD[c.type]&&BUILD[c.type].jobs)jobsT.push(c);}
  jobsT.sort((a,b)=>(RANK[a.type]??9)-(RANK[b.type]??9));   // Überlebenswichtiges zuerst besetzen
  for(const c of jobsT){ const need=BUILD[c.type].jobs; if(labor>=need){c.staffed=true;labor-=need;} else c.staffed=false; }
  workersFree=labor; workersTotal=pop;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const c=grid[y][x];
    // Versorger (wandernde Dienst-Läufer: Brunnen=Wasser, Forum=Steuer, Markt=Verkauf)
    if(c.service&&c.staffed){ c.spawn=(c.spawn||0)+1; const adj=adjRoad(x,y);
      if(adj&&c.spawn>=BUILD[c.type].every){ c.spawn=0;
        const w={x:adj[0],y:adj[1],from:null,service:c.service,color:B3D[c.type].wcol,life:34,prog:0,dx:0,dy:0};
        if(c.service==='market'){ w.goods=(c.cer||0)>0; if(w.goods)c.cer--;       // Markt verkauft Keramik aus Lager
                                  w.food=(c.bread||0)>0; if(w.food)c.bread--; }   // Nahrung nur mit Brot aus der Mühle
        walkers.push(w);
      }
    }
    if(c.type==='claypit'&&c.staffed){ c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.claypit.every){ const fp=findPath(x,y,'pottery');
        if(fp){c.spawn=0;spawnCarrier(fp,'clay','#a9713f');} else {c.spawn=BUILD.claypit.every;} } }
    if(c.type==='pottery'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=8&&(c.clay||0)>0&&(c.cer||0)<8){c.conv=0;c.clay--;c.cer=(c.cer||0)+1;}
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.pottery.every&&(c.cer||0)>0){ const fp=findPath(x,y,'market');
        if(fp){c.spawn=0;c.cer--;spawnCarrier(fp,'cer','#3f9c8a');} else {c.spawn=BUILD.pottery.every;} } }
    if(c.type==='grainfield'&&c.staffed){
      if((tickCount%SEASON_LEN)===HARVEST_TICK) c.grain=8;          // Ernte: Speicher voll (auch ohne Straße)
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.grainfield.every&&(c.grain||0)>0){ const fp=findPath(x,y,'mill');
        if(fp){c.spawn=0;c.grain--;spawnCarrier(fp,'grain','#d9b44a');} else {c.spawn=BUILD.grainfield.every;} } }
    if(c.type==='mill'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=8&&(c.grain||0)>0&&(c.bread||0)<8){c.conv=0;c.grain--;c.bread=(c.bread||0)+1;}
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.mill.every&&(c.bread||0)>0){ const fp=findPath(x,y,'market');
        if(fp){c.spawn=0;c.bread--;spawnCarrier(fp,'bread','#caa46e');} else {c.spawn=BUILD.mill.every;} } }
  }
  // Zuwanderung vom Rand
  if(!lost && tickCount%IMMIG_EVERY===0 && money>LOSE_MONEY) spawnSettler();
  const next=[];
  for(const w of walkers){
    if(w.path){                                              // gezielt dem Weg folgen (Waren + Siedler)
      if(w.pi>=w.path.length-1){ if(w.kind==='settler')settlerArrive(w); else deliverCargo(w); continue; }
      const [nx,ny]=w.path[w.pi+1];
      w.dx=nx-w.x;w.dy=ny-w.y;w.from=[w.x,w.y];w.prog=0;w.tx=nx;w.ty=ny;w.pi++; next.push(w);
    } else {                                                 // Dienst-Läufer: Umgebung versorgen + wandern
      for(const [nx,ny] of neighbors(w.x,w.y)){
        if(!inBounds(nx,ny))continue; const t=grid[ny][nx];
        if(w.service==='fire'){ if(riskable(t.type))t.fireSafe=SERVICE_LIFE; continue; }   // Brandschutz
        if(w.service==='eng'){ if(riskable(t.type))t.engSafe=SERVICE_LIFE; continue; }      // Statik
        if(t.type==='house'){
          if(w.service==='water')t.water=SERVICE_LIFE;
          else if(w.service==='market'){ if(w.food)t.food=SERVICE_LIFE; if(w.goods)t.goods=SERVICE_LIFE; }
          else if(w.service==='tax'){ if(t.res>0&&t.taxed<=0){ const amt=t.res+(t.goods>0?GOODS_BONUS:0); money+=amt; t.taxed=SERVICE_LIFE; if(typeof floatText==='function')floatText(nx,ny,'+'+amt+' D','#ffd24a'); } }
        }
      }
      w.life--; if(w.life<=0)continue;
      let opts=neighbors(w.x,w.y).filter(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].type==='road');
      let fwd=opts.filter(([nx,ny])=>!(w.from&&nx===w.from[0]&&ny===w.from[1]));
      let pool=fwd.length?fwd:opts;
      if(pool.length){const [nx,ny]=pool[(Math.random()*pool.length)|0];
        w.dx=nx-w.x;w.dy=ny-w.y;w.from=[w.x,w.y];w.prog=0;w.tx=nx;w.ty=ny;next.push(w);}
    }
  }
  walkers=next;
  // Gefahren: Brand & Einsturz (Abdeckung durch Feuerwache / Bauingenieur)
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ const t=grid[y][x]; if(!riskable(t.type))continue;
    if(t.fireSafe>0)t.fireSafe--; if(t.engSafe>0)t.engSafe--;
    if(t.fireSafe>0){ t.rF=0; t.fireRisk=false; }
    else { t.rF=(t.rF||0)+1; if(t.rF>=RISK_GRACE){ t.fireRisk=true;
      if(Math.random()<FIRE_CHANCE){ razeTile(t); if(typeof flash==='function')flash('🔥 Brand: ein Gebäude ist abgebrannt!'); continue; } } }
    if(t.engSafe>0){ t.rC=0; t.collapseRisk=false; }
    else { t.rC=(t.rC||0)+1; if(t.rC>=RISK_GRACE){ t.collapseRisk=true;
      if(Math.random()<COLLAPSE_CHANCE){ razeTile(t); if(typeof flash==='function')flash('🏚 Einsturz: ein Gebäude ist eingestürzt!'); continue; } } }
  }
  // Bewohner-Dynamik
  pop=0;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const h=grid[y][x]; if(h.type!=='house')continue;
    if(h.water>0)h.water--; if(h.food>0)h.food--; if(h.taxed>0)h.taxed--; if(h.goods>0)h.goods--;
    h.lvl = (h.water>0&&h.food>0)?2 : (h.water>0?1:0);
    const cap=houseCap(h);
    if(h.res>cap) h.res=cap;                                  // Rückstufung -> Abwanderung
    if(h.water>0){ h.decay=0; }
    else { h.decay=(h.decay||0)+1; if(h.decay>=6){h.decay=0; if(h.res>0)h.res--;} }  // ohne Wasser ziehen Leute weg
    pop+=h.res;
  }
  // Wirtschaft: monatlicher Unterhalt
  if(tickCount%MONTH===0){ let up=0;
    for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const d=BUILD[grid[y][x].type]; if(d&&d.up)up+=d.up;}
    if(up)money-=up;
  }
  // Sieg / Niederlage
  if(pop>=GOAL_POP) won=true;
  lost = money<=LOSE_MONEY;
  updateHUD();
}
// nach Bewegung Position übernehmen
function commitMoves(){for(const w of walkers){if(w.tx!=null){w.x=w.tx;w.y=w.ty;w.tx=w.ty=null;w.dx=0;w.dy=0;}}}

let lastTick=performance.now(); let lastFrame=performance.now();
function loop(now){
  const rawdt=Math.min((now-lastFrame)/1000,0.05); lastFrame=now;
  const k=speed>0?speed:0;                 // Pause friert ein, Zeitraffer beschleunigt
  const adt=rawdt*k;
  animT+=adt; updateClouds(adt); updateAllWildlife(adt);
  if(typeof updateFloaters==='function') updateFloaters(rawdt);   // UI-Feedback in Echtzeit
  if(typeof updateAmbient==='function') updateAmbient(rawdt);     // Ambient-Sound
  if(speed>0){                             // Läufer nur bei laufender Zeit interpolieren
    const curTick=TICK/speed, frac=Math.min((now-lastTick)/curTick,1);
    for(const w of walkers)w.prog=frac;
  }
  render(); requestAnimationFrame(loop);
}
// Tempo-gesteuerter Tick-Scheduler (statt festem Intervall) — respektiert Pause/Zeitraffer
let _tickTimer=null;
function scheduleTick(){
  clearTimeout(_tickTimer);
  if(speed<=0)return;                      // pausiert -> kein nächster Tick
  _tickTimer=setTimeout(()=>{
    commitMoves(); lastTick=performance.now(); tick(); scheduleTick();
  }, TICK/speed);
}
function startTicks(){ lastTick=performance.now(); scheduleTick(); }
