/* TERRA · sim.js */
// ---- Simulation ----
function neighbors(x,y){return [[x,y-1],[x+1,y],[x,y+1],[x-1,y]];}
function riskable(tp){return tp==='house'||tp==='market'||tp==='forum'||tp==='pottery'||tp==='claypit'||tp==='mill'||tp==='farm'||tp==='bakery';}
function adjRoad(x,y){return neighbors(x,y).find(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].type==='road');}
// Mehrfeld-Gebäude: eine Footprint-Kachel ist "Sklave", wenn sie zu einem Anker
// gehört, aber selbst nicht der Master ist (keine eigene Logik/Job/Unterhalt).
function isSlave(c){ return !!(c.anchor && !c.master); }
// angrenzende Straße für ein Mehrfeld-Gebäude: irgendeine Straße neben IRGENDEINER
// Footprint-Kachel (außerhalb des Footprints selbst).
function footAdjRoad(ax,ay,foot){ const [w,h]=foot;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){ const cx=ax+i, cy=ay+j;
    const r=neighbors(cx,cy).find(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].type==='road'&&!(nx>=ax&&nx<ax+w&&ny>=ay&&ny<ay+h));
    if(r)return r; }
  return null; }
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

// ---- Rohstoff-Abbau & Lagerhaus ----
function adjTerr(x,y,terr){ return neighbors(x,y).some(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr===terr); }
// angrenzendes Waldfeld mit Holzvorrat (zum Abholzen); null wenn alle erschöpft
function adjWood(x,y){ for(const [nx,ny] of neighbors(x,y)){ if(!inBounds(nx,ny))continue;
  const t=grid[ny][nx]; if(t.terr==='forest'&&(t.wood||0)>0) return t; } return null; }
// Master-Kachel (Bucht 0) eines Lagerhauses, egal welche der 4 Kacheln getroffen wurde
function whMaster(x,y){ const t=grid[y][x]; const a=t.wh; return (a&&inBounds(a[0],a[1]))?grid[a[1]][a[0]]:t; }
function whTiles(ax,ay){ return [[ax,ay],[ax+1,ay],[ax,ay+1],[ax+1,ay+1]]; }

// ---- Fischerei: Boot fährt über Wasser zum Schwarm und zurück ----
function adjWater(x,y){return neighbors(x,y).filter(([nx,ny])=>inBounds(nx,ny)&&grid[ny][nx].terr==='water');}
// BFS über Wasserkacheln vom Ufer der Hütte zum nächsten Fischschwarm.
// Liefert eine Rundreise (Hin- + Rückweg) inkl. kurzem Verweilen am Schwarm.
function findWaterPath(hx,hy){
  const starts=adjWater(hx,hy); if(!starts.length)return null;
  const q=[],prev={},seen=new Set();
  for(const [x,y] of starts){const k=x+','+y;seen.add(k);prev[k]=null;q.push([x,y]);}
  let goal=null;
  while(q.length){const [x,y]=q.shift();
    if(grid[y][x].school){goal=[x,y];break;}
    for(const [nx,ny] of neighbors(x,y)) if(inBounds(nx,ny)&&grid[ny][nx].terr==='water'){const k=nx+','+ny;
      if(!seen.has(k)){seen.add(k);prev[k]=[x,y];q.push([nx,ny]);}}
  }
  if(!goal)return null;
  const out=[];let cur=goal;while(cur){out.unshift(cur);cur=prev[cur[0]+','+cur[1]];}
  const back=out.slice(0,-1).reverse();
  return {path: out.concat([goal,goal], back)};   // am Schwarm kurz verweilen (fischen)
}
function boatArrive(w){ const [hx,hy]=w.home||[]; if(!inBounds(hx,hy))return; const t=grid[hy][hx];
  if(t.type==='fisher') t.fish=Math.min(8,(t.fish||0)+1); }      // Fang im Lager der Hütte
function deliverCargo(w){const [dx,dy]=w.dest;if(!inBounds(dx,dy))return;const t=grid[dy][dx];
  if(w.cargo==='clay'&&t.type==='pottery')t.clay=Math.min(8,(t.clay||0)+1);
  else if(w.cargo==='cer'&&t.type==='market')t.cer=Math.min(8,(t.cer||0)+1);
  else if(w.cargo==='grain'&&t.type==='mill')t.grain=Math.min(8,(t.grain||0)+1);
  else if(w.cargo==='flour'&&t.type==='bakery')t.flour=Math.min(8,(t.flour||0)+1);
  else if(w.cargo==='bread'&&t.type==='market')t.bread=Math.min(8,(t.bread||0)+1);
  else if(w.cargo==='fish'&&t.type==='market')t.bread=Math.min(8,(t.bread||0)+1);
  else if((w.cargo==='wood'||w.cargo==='stone'||w.cargo==='marble')&&t.type==='warehouse'){
    const m=whMaster(dx,dy); m[w.cargo]=Math.min(WH_CAP,(m[w.cargo]||0)+1); }}

// ---- Einwanderung vom Kartenrand ----
function landWalk(x,y){ if(!inBounds(x,y))return false; const t=grid[y][x];
  if((TERR[t.terr]||TERR.grass).build===false) return false;             // Wasser/Berg blockieren
  const b=t.type; if(b==='house'||b==='well'||b==='market'||b==='forum'||b==='claypit'||b==='pottery'||b==='grainfield'||b==='farm'||b==='mill'||b==='bakery'||b==='wall'||b==='tower'||b==='barracks') return false;
  return true; }
function houseCap(h){return HOUSE[h.lvl].pop;}
function needsResident(t){return t.type==='house'&&t.res<houseCap(t);}  // auch Stufe 0 (Hütte) -> Anschub für Arbeitskräfte
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

// ---- ATTRAKTIVITÄT (Desirability) ----
// Schmuckbauten (Gärten/Skulpturen) verteilen Schönheit radial auf die
// umliegenden Felder; Industrie & Lager ziehen sie ab. Das Feld wird einmal
// pro Tick komplett neu aufgebaut (Schmuck ist statisch -> kein Cache nötig)
// und liegt danach als t.desire auf jeder Kachel bereit (Steuer + Aufstieg).
function stampDesire(cx,cy,base,range){
  for(let dy=-range;dy<=range;dy++)for(let dx=-range;dx<=range;dx++){
    const dist=Math.max(Math.abs(dx),Math.abs(dy)); if(dist>range)continue;
    const x=cx+dx, y=cy+dy; if(!inBounds(x,y))continue;
    grid[y][x].desire += Math.round(base*(range+1-dist)/(range+1));   // 1.0 im Zentrum, fällt linear nach außen ab
  }
}
function computeDesire(){
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++) grid[y][x].desire=0;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ const t=grid[y][x]; if(isSlave(t))continue;
    const d=BUILD[t.type];
    if(d&&d.deco) stampDesire(x,y,d.desire,d.range);                                   // Garten/Skulptur: +Schönheit
    else if(typeof DECO_UGLY!=='undefined' && DECO_UGLY[t.type]!=null) stampDesire(x,y,DECO_UGLY[t.type],UGLY_RANGE);  // Industrie/Lager: -Schönheit
  }
}

function tick(){
  tickCount++;
  computeDesire();                          // Attraktivitätsfeld für diesen Tick aufbauen (vor Steuer & Aufstieg)
  // ---- Globale Arbeitskräfte (Einwohner = Arbeiter), ohne Straßenbindung ----
  let labor=pop;
  const RANK={well:0,firehouse:1,engineer:2,market:3,forum:4,grainfield:5,farm:5,fisher:5,claypit:6,pottery:7,mill:8,bakery:9};
  const jobsT=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const c=grid[y][x]; if(BUILD[c.type]&&BUILD[c.type].jobs&&!isSlave(c))jobsT.push(c);}
  jobsT.sort((a,b)=>(RANK[a.type]??9)-(RANK[b.type]??9));   // Überlebenswichtiges zuerst besetzen
  for(const c of jobsT){ const need=BUILD[c.type].jobs; if(labor>=need){c.staffed=true;labor-=need;} else c.staffed=false; }
  workersFree=labor; workersTotal=pop;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const c=grid[y][x];
    // Versorger (wandernde Dienst-Läufer: Brunnen=Wasser, Forum=Steuer, Markt=Verkauf, Spielstätte=Unterhaltung)
    if(c.service&&c.staffed&&!isSlave(c)){ c.spawn=(c.spawn||0)+1;
      const bdef=BUILD[c.type];
      const adj=bdef.foot?footAdjRoad(x,y,bdef.foot):adjRoad(x,y);   // Mehrfeld-Bau: Straße neben irgendeiner Footprint-Kachel
      if(adj&&c.spawn>=bdef.every){ c.spawn=0;
        const w={x:adj[0],y:adj[1],from:null,service:c.service,color:B3D[c.type].wcol,life:bdef.life||34,prog:0,dx:0,dy:0};
        if(c.service==='market'){ w.goods=(c.cer||0)>0; if(w.goods)c.cer--;       // Markt verkauft Keramik aus Lager
                                  w.food=(c.bread||0)>0; if(w.food)c.bread--; }   // Nahrung nur mit Brot aus der Mühle
        if(c.service==='health'){ w.need=(typeof HEALTH!=='undefined'&&HEALTH[c.type])?HEALTH[c.type].need:null; }   // Therme/Arzt/Barbier versorgen ihren Bedarf
        if(c.service==='education'){ w.need=(typeof EDUCATION!=='undefined'&&EDUCATION[c.type])?EDUCATION[c.type].need:null; }   // Schule/Bibliothek/Akademie versorgen ihren Bedarf
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
    if(c.type==='farm'&&c.staffed){
      c.conv=(c.conv||0)+1;                                          // Hof erntet kontinuierlich (ganzjährig, nicht saisonal)
      if(c.conv>=10&&(c.grain||0)<8){c.conv=0;c.grain=(c.grain||0)+1;}
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.farm.every&&(c.grain||0)>0){ const fp=findPath(x,y,'mill');
        if(fp){c.spawn=0;c.grain--;spawnCarrier(fp,'grain','#d9b44a');} else {c.spawn=BUILD.farm.every;} } }
    if(c.type==='mill'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=8&&(c.grain||0)>0&&(c.flour||0)<8){c.conv=0;c.grain--;c.flour=(c.flour||0)+1;}   // Korn -> Mehl
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.mill.every&&(c.flour||0)>0){ const fp=findPath(x,y,'bakery');
        if(fp){c.spawn=0;c.flour--;spawnCarrier(fp,'flour','#e8dcc0');} else {c.spawn=BUILD.mill.every;} } }
    if(c.type==='bakery'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=8&&(c.flour||0)>0&&(c.bread||0)<8){c.conv=0;c.flour--;c.bread=(c.bread||0)+1;}   // Mehl -> Nahrung
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.bakery.every&&(c.bread||0)>0){ const fp=findPath(x,y,'market');
        if(fp){c.spawn=0;c.bread--;spawnCarrier(fp,'bread','#caa46e');} else {c.spawn=BUILD.bakery.every;} } }
    if(c.type==='fisher'&&c.staffed){
      // 1) Boot zum Fischschwarm schicken (max. ein Boot pro Hütte unterwegs)
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.fisher.every){
        const busy=walkers.some(w=>w.kind==='boat'&&w.home&&w.home[0]===x&&w.home[1]===y);
        if(busy){ c.spawn=BUILD.fisher.every; }
        else { const bp=findWaterPath(x,y);
          if(bp){ c.spawn=0; const [sx,sy]=bp.path[0];
            walkers.push({x:sx,y:sy,path:bp.path,pi:0,kind:'boat',home:[x,y],color:'#6b4b2f',prog:0,dx:0,dy:0,from:null}); }
          else { c.spawn=BUILD.fisher.every; }   // kein erreichbarer Schwarm -> bereit halten
        }
      }
      // 2) Fang über die Straße zum Markt tragen
      c.dspawn=(c.dspawn||0)+1;
      if(c.dspawn>=BUILD.fisher.every&&(c.fish||0)>0){ const fp=findPath(x,y,'market');
        if(fp){c.dspawn=0;c.fish--;spawnCarrier(fp,'fish','#9ec6d8');} else {c.dspawn=BUILD.fisher.every;} } }
    // Holzfäller: schlägt Holz am angrenzenden Wald (Vorrat sinkt, wächst andernorts nach) -> Lagerhaus
    if(c.type==='woodcutter'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=HARVEST_EVERY&&(c.wood||0)<8){ const f=adjWood(x,y);
        if(f){ c.conv=0; f.wood--; c.wood=(c.wood||0)+1; } }
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.woodcutter.every&&(c.wood||0)>0){ const fp=findPath(x,y,'warehouse');
        if(fp){c.spawn=0;c.wood--;spawnCarrier(fp,'wood','#9c6b3a');} else {c.spawn=BUILD.woodcutter.every;} } }
    // Steinbruch: bricht Stein am angrenzenden Fels (unerschöpflich) -> Lagerhaus
    if(c.type==='quarry'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=HARVEST_EVERY&&(c.stone||0)<8&&adjTerr(x,y,'rock')){ c.conv=0; c.stone=(c.stone||0)+1; }
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.quarry.every&&(c.stone||0)>0){ const fp=findPath(x,y,'warehouse');
        if(fp){c.spawn=0;c.stone--;spawnCarrier(fp,'stone','#8d8b86');} else {c.spawn=BUILD.quarry.every;} } }
    // Marmorbruch: bricht Marmor am angrenzenden Marmorfels -> Lagerhaus
    if(c.type==='marblequarry'&&c.staffed){
      c.conv=(c.conv||0)+1;
      if(c.conv>=HARVEST_EVERY&&(c.marble||0)<8&&adjTerr(x,y,'marble')){ c.conv=0; c.marble=(c.marble||0)+1; }
      c.spawn=(c.spawn||0)+1;
      if(c.spawn>=BUILD.marblequarry.every&&(c.marble||0)>0){ const fp=findPath(x,y,'warehouse');
        if(fp){c.spawn=0;c.marble--;spawnCarrier(fp,'marble','#dcd8cf');} else {c.spawn=BUILD.marblequarry.every;} } }
  }
  // Wald wächst nach: jedes Waldfeld erholt sich langsam bis WOOD_MAX
  if(tickCount%WOOD_REGROW===0){ for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const t=grid[y][x]; if(t.terr==='forest'&&(t.wood||0)<WOOD_MAX) t.wood=(t.wood||0)+1; } }
  // Zuwanderung vom Rand
  if(!lost && tickCount%IMMIG_EVERY===0 && money>LOSE_MONEY) spawnSettler();
  const next=[];
  for(const w of walkers){
    if(w.path){                                              // gezielt dem Weg folgen (Waren + Siedler)
      if(w.pi>=w.path.length-1){ if(w.kind==='settler')settlerArrive(w); else if(w.kind==='boat')boatArrive(w); else deliverCargo(w); continue; }
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
          else if(w.service==='tax'){ if(t.res>0&&t.taxed<=0){ const amt=t.res+(t.goods>0?GOODS_BONUS:0)+((t.bath>0&&t.doctor>0)?HEALTH_BONUS:0)+((t.entertain>0)?ENTERTAIN_BONUS:0)+((t.schul>0&&t.biblio>0)?(EDU_BONUS+(t.akad>0?EDU_BONUS:0)):0)+(((t.desire||0)>=ATTRACT_MIN)?ATTRACT_BONUS:0); money+=amt; t.taxed=SERVICE_LIFE; if(typeof statInc==='function')statInc(amt); if(typeof floatText==='function')floatText(nx,ny,'+'+amt+' D','#ffd24a'); } }
          else if(w.service==='religion')t.faith=SERVICE_LIFE;   // Priester segnet Haus (Haken für spätere Götter-Gunst)
          else if(w.service==='health'){ if(w.need)t[w.need]=SERVICE_LIFE; }   // Therme→bath, Arzt→doctor, Barbier→barber
          else if(w.service==='entertain')t.entertain=SERVICE_LIFE;   // Theater/Arena/Kolosseum unterhalten das Haus
          else if(w.service==='education'){ if(w.need)t[w.need]=SERVICE_LIFE; }   // Schule→schul, Bibliothek→biblio, Akademie→akad
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
  if(typeof tickUnits==='function') tickUnits();   // Militär: Kasernen stellen auf, Kohorten marschieren
  // Gefahren: Brand & Einsturz (Abdeckung durch Feuerwache / Bauingenieur)
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ const t=grid[y][x]; if(!riskable(t.type))continue;
    if(t.fireSafe>0)t.fireSafe--; if(t.engSafe>0)t.engSafe--;
    if(t.fireSafe>0){ t.rF=0; t.fireRisk=false; }
    else { t.rF=(t.rF||0)+1; if(t.rF>=RISK_GRACE){ t.fireRisk=true;
      if(t.rF>=RISK_GRACE+RISK_FUSE && Math.random()<FIRE_CHANCE){ razeTile(t); if(typeof flash==='function')flash('🔥 Brand: ein Gebäude ist abgebrannt!'); continue; } } }
    if(t.engSafe>0){ t.rC=0; t.collapseRisk=false; }
    else { t.rC=(t.rC||0)+1; if(t.rC>=RISK_GRACE){ t.collapseRisk=true;
      if(t.rC>=RISK_GRACE+RISK_FUSE && Math.random()<COLLAPSE_CHANCE){ razeTile(t); if(typeof flash==='function')flash('🏚 Einsturz: ein Gebäude ist eingestürzt!'); continue; } } }
  }
  // Bewohner-Dynamik
  pop=0;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const h=grid[y][x]; if(h.type!=='house')continue;
    if(h.water>0)h.water--; if(h.food>0)h.food--; if(h.taxed>0)h.taxed--; if(h.goods>0)h.goods--;
    if(h.bath>0)h.bath--; if(h.doctor>0)h.doctor--; if(h.barber>0)h.barber--;   // Hygiene-Abdeckung klingt ab (wie Wasser/Nahrung)
    if(h.entertain>0)h.entertain--;                                              // Unterhaltung klingt ab
    if(h.schul>0)h.schul--; if(h.biblio>0)h.biblio--; if(h.akad>0)h.akad--;       // Bildungs-Abdeckung klingt ab
    const baseLvl = (h.water>0&&h.food>0&&h.goods>0)?3 : (h.water>0&&h.food>0)?2 : (h.water>0?1:0);
    h.lvl = (baseLvl===3 && (h.desire||0)>=DESIRE_LVL4) ? 4 : baseLvl;   // Prestige: voll versorgte Villa auf attraktivem Grund -> Palast
    const cap=houseCap(h);
    if(h.res>cap) h.res=cap;                                  // Rückstufung -> Abwanderung
    if(h.water>0){ h.decay=0; }
    else { h.decay=(h.decay||0)+1; if(h.decay>=6){h.decay=0; if(h.res>0)h.res--;} }  // ohne Wasser ziehen Leute weg
    // Gesundheit/Hygiene: Therme + Arzt = gesund. Sonst droht eine Seuche — Schonfrist wie bei Brand/Einsturz.
    const healthy = h.bath>0 && h.doctor>0;
    if(healthy || h.res<=0){ h.rP=0; h.plagueRisk=false; }
    else { h.rP=(h.rP||0)+1;
      if(h.rP>=RISK_GRACE){ h.plagueRisk=true;
        const ch = PLAGUE_CHANCE*(h.barber>0?0.5:1);          // Barbier halbiert die Seuchengefahr
        if(h.rP>=RISK_GRACE+RISK_FUSE && Math.random()<ch){
          h.res--; h.rP=RISK_GRACE;                           // ein Bewohner erliegt der Seuche; der Druck bleibt bestehen
          if(typeof flash==='function')flash('🤒 Seuche: ein Bewohner ist erkrankt und gestorben!');
        }
      }
    }
    pop+=h.res;
  }
  // Wirtschaft: monatlicher Unterhalt + Löhne
  if(tickCount%MONTH===0){ let up=0;
    for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){const tt=grid[y][x], d=BUILD[tt.type];
      if(d&&d.up){ if(tt.type==='warehouse'&&!tt.whMaster) continue;   // Lagerhaus: Unterhalt nur einmal (4 Felder)
        if(isSlave(tt)) continue;                                      // Mehrfeld-Bau: Unterhalt nur auf der Master-Kachel
        up+=d.up; } }
    const employed=Math.max(0,(typeof workersTotal==='number'?workersTotal:pop)-(typeof workersFree==='number'?workersFree:0));
    const wages=employed*WAGE;                                          // Löhne für tatsächlich beschäftigte Arbeiter
    const out=up+wages;
    if(out){ money-=out; if(typeof statExp==='function')statExp(out); }
  }
  // Sieg / Niederlage
  if(pop>=GOAL_POP) won=true;
  lost = money<=LOSE_MONEY;
  if(typeof statSample==='function') statSample();   // Statistik-Stützstelle
  updateHUD();
}
// nach Bewegung Position übernehmen
function commitMoves(){for(const w of walkers){if(w.tx!=null){w.x=w.tx;w.y=w.ty;w.tx=w.ty=null;w.dx=0;w.dy=0;}}
  if(typeof commitUnitMoves==='function') commitUnitMoves();}

let lastTick=performance.now(); let lastFrame=performance.now();
let _lastSig=null;                         // Signatur des zuletzt gezeichneten Bildzustands
// Billige Signatur aller Dinge, die das Standbild bei Pause verändern können.
function _viewSig(){
  let s=cam.x+'|'+cam.y+'|'+cam.scale;
  s+='|'+(typeof selectedTile!=='undefined'&&selectedTile?selectedTile.x+','+selectedTile.y:'-');
  s+='|'+(typeof selectedUnit!=='undefined'&&selectedUnit?'u':'-');
  s+='|'+(typeof previewCells!=='undefined'?previewCells.length:0);
  s+='|'+floaters.length;                 // 1->0 muss ein letztes Clear-Rendering auslösen
  return s;
}
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
    if(typeof units!=='undefined') for(const u of units) u.prog=frac;   // Kohorten gleiten feldweise
  }
  // Bei laufender Zeit immer zeichnen. Bei Pause nur, wenn sich das Bild ändert
  // (Kamera/Auswahl/Vorschau) oder noch Floater animieren. Spart Akku im Leerlauf.
  const sig=_viewSig();
  const dirty = speed>0 || floaters.length>0 || sig!==_lastSig;
  _lastSig=sig;
  if(dirty) render();
  requestAnimationFrame(loop);
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
