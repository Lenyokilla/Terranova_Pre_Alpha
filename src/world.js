/* TERRA · world.js */
// ---- Zustand ----
let money=3000, pop=0, tool='hand';
let won=false, lost=false;
let grid=[], walkers=[], tickCount=0;
let speed=1;                 // 0=Pause · 1× · 2× · 3× (Zeitraffer)
let workersFree=0, workersTotal=0;   // globale Arbeitskräfte
let selectedTile=null;       // {x,y} des im Info-Panel angezeigten Gebäudes
let animT=0; const clouds=[];   // Wetter-Animation
const floaters=[];              // schwebende Feedback-Texte (+Denar)
const sheep=[]; const birds=[]; let herdAnchor=null;   // Tierwelt
function blankTile(){return {type:'empty',terr:'grass',lvl:0,water:0,food:0,taxed:0,goods:0,res:0,decay:0,spawn:0,wood:0,stone:0,marble:0};}
function buildOn(t,type,service){t.type=type;t.lvl=0;t.water=0;t.food=0;t.taxed=0;t.goods=0;t.res=0;t.decay=0;t.spawn=0;t.dspawn=0;t.clay=0;t.cer=0;t.grain=0;t.bread=0;t.fish=0;t.conv=0;t.fireSafe=0;t.engSafe=0;t.rF=0;t.rC=0;t.fireRisk=false;t.collapseRisk=false;t.staffed=false;t.service=service||undefined;}
function razeTile(t){t.type='empty';t.service=undefined;t.lvl=0;t.water=0;t.food=0;t.taxed=0;t.goods=0;t.res=0;t.decay=0;t.spawn=0;t.dspawn=0;t.clay=0;t.cer=0;t.grain=0;t.bread=0;t.fish=0;t.fireSafe=0;t.engSafe=0;t.rF=0;t.rC=0;t.fireRisk=false;t.collapseRisk=false;t.staffed=false;}

// --- Landschafts-Generierung ---
function clampg(v){return Math.max(0,Math.min(GRID-1,v));}
function growBlob(cx,cy,size,can,apply){
  let frontier=[[cx,cy]]; const seen=new Set(); let n=0;
  while(frontier.length&&n<size){
    const i=(Math.random()*frontier.length)|0; const [x,y]=frontier.splice(i,1)[0];
    const k=x+','+y; if(seen.has(k))continue; seen.add(k);
    if(!inBounds(x,y)||!can(grid[y][x]))continue;
    apply(grid[y][x]); n++;
    for(const [nx,ny] of neighbors(x,y)) if(!seen.has(nx+','+ny)) frontier.push([nx,ny]);
  }
}
function isGrass(t){return t.terr==='grass';}
// Grasfeld als Startpunkt für ein Vorkommen – bevorzugt am Berg-/Hügelfuß (wirkt natürlich)
function rockySeed(){
  const near=[], any=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ const t=grid[y][x]; if(t.terr!=='grass')continue;
    any.push([x,y]);
    for(const [nx,ny] of neighbors(x,y))
      if(inBounds(nx,ny)&&(grid[ny][nx].terr==='mountain'||grid[ny][nx].terr==='hill')){ near.push([x,y]); break; }
  }
  const pool = near.length ? near : any;
  return pool.length ? pool[(Math.random()*pool.length)|0] : [(Math.random()*GRID)|0,(Math.random()*GRID)|0];
}
function generateTerrain(){
  for(let y=0;y<GRID;y++){grid[y]=[];for(let x=0;x<GRID;x++){grid[y][x]=blankTile();}}
  const A=(GRID*GRID)/256;   // Flächen-Faktor relativ zur 16er-Karte
  // Wiesen als sanfte zusammenhängende Flecken (statt Pixel-Rauschen)
  for(let i=0;i<Math.round(4*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    12+(Math.random()*16|0), isGrass, t=>t.terr='meadow');
  // Geschwungener Fluss: glatter Sinus-Mäander von oben nach unten, lückenlos verbunden
  const amp   = GRID*0.14 + Math.random()*GRID*0.10;     // Mäander-Auslenkung
  const wlen  = GRID*(0.7+Math.random()*0.6);            // Wellenlänge
  const phase = Math.random()*Math.PI*2;
  const baseX = GRID*0.5 + (Math.random()-0.5)*GRID*0.18;
  let prevX=null;
  for(let ry=0; ry<GRID; ry++){
    let cx = baseX + Math.sin(ry/wlen*Math.PI*2 + phase)*amp
                   + Math.sin(ry*0.17 + phase*1.7)*amp*0.35;   // sanfte zweite Welle
    cx = Math.round(cx);
    const lo = Math.min(prevX==null?cx:prevX, cx), hi = Math.max(prevX==null?cx:prevX, cx);
    for(let x=lo; x<=hi; x++) grid[ry][clampg(x)].terr='water';   // Reihen lückenlos verbinden
    if(ry%3===0) grid[ry][clampg(cx+1)].terr='water';            // stellenweise etwas breiter
    prevX=cx;
  }
  // Seen
  for(let i=0;i<Math.round(1.5*A);i++) growBlob(2+(Math.random()*(GRID-4)|0),2+(Math.random()*(GRID-4)|0),
    10+(Math.random()*10|0), t=>t.terr!=='water', t=>t.terr='water');
  // Bergmassiv: Hauptkamm in einer Ecke + kleinerer Nebenkamm einwärts -> wirkt als Gebirgszug
  const mcx=Math.random()<.5?0:GRID-1, mcy=Math.random()<.5?0:GRID-1;
  growBlob(mcx, mcy, Math.round((14+(Math.random()*9|0))*A), isGrass, t=>{t.terr='mountain';});
  const din=v=> v===0?1:-1;                                   // Richtung zur Kartenmitte
  growBlob(clampg(mcx+din(mcx)*(3+(Math.random()*4|0))), clampg(mcy+din(mcy)*(2+(Math.random()*4|0))),
    Math.round((6+(Math.random()*5|0))*A), isGrass, t=>{t.terr='mountain';});
  // Hügelketten
  for(let i=0;i<Math.round(2*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    7+(Math.random()*8|0), isGrass, t=>t.terr='hill');
  // Wälder verschiedener Art – je Hain ein einheitlicher Typ · Holz nachwachsend (t.wood)
  const FT=['fir','leaf','pine'];
  for(let i=0;i<Math.round(3*A);i++){ const ft=FT[(Math.random()*3)|0];
    growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
      8+(Math.random()*10|0), isGrass, t=>{t.terr='forest'; t.forest=ft; t.wood=WOOD_MAX;}); }
  // Felder (Kulturland)
  for(let i=0;i<Math.round(2*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    6+(Math.random()*6|0), isGrass, t=>t.terr='field');
  // Steinvorkommen: kleine felsige Aufschlüsse (Steinbruch-Material) am Gebirgsfuß
  for(let i=0;i<Math.max(2,Math.round(2*A));i++){ const [sx,sy]=rockySeed();
    growBlob(sx,sy, 3+(Math.random()*3|0), isGrass, t=>{t.terr='rock'; t.stone=STONE_STOCK;}); }
  // Marmorvorkommen: seltener, kleinere und hellere Aufschlüsse
  for(let i=0;i<Math.max(1,Math.round(1*A));i++){ const [sx,sy]=rockySeed();
    growBlob(sx,sy, 2+(Math.random()*3|0), isGrass, t=>{t.terr='marble'; t.marble=MARBLE_STOCK;}); }
  computeMountainHeights();
  seedFishSchools();
}

// --- Fischschwärme: endlose Fischgründe auf offenem Wasser ---------------
// Markiert einige Wasserkacheln (mit genug Wasser-Nachbarn = "tiefes" Wasser)
// als t.school. Der Fischer schickt sein Boot per Wasser-BFS zum nächsten
// Schwarm. Anzahl skaliert mit der Kartengröße; Schwärme werden entzerrt.
function seedFishSchools(){
  const cand=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    if(grid[y][x].terr!=='water')continue;
    let w=0; for(const [nx,ny] of neighbors(x,y)) if(inBounds(nx,ny)&&grid[ny][nx].terr==='water')w++;
    if(w>=3) cand.push([x,y]);                       // nur offenes Wasser, keine 1-Kachel-Pfütze
  }
  for(let i=cand.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[cand[i],cand[j]]=[cand[j],cand[i]];}
  const target=Math.max(3, Math.round((GRID*GRID)/170)), MINSEP=4;
  const placed=[];
  for(const [x,y] of cand){
    if(placed.length>=target)break;
    if(placed.some(([px,py])=>Math.abs(px-x)+Math.abs(py-y)<MINSEP))continue;
    grid[y][x].school=true; placed.push([x,y]);
  }
}

// --- Höhenfeld des Gebirges -----------------------------------------------
// Glatte Kuppel (Rand niedrig, Mitte hoch) + sanftes Rauschen für mehrere Gipfel.
// Jede Bergkachel erhält t.mh (Höhe in Geländestufen); die Renderung verbindet
// benachbarte Kacheln über gemeinsame Eckpunkthöhen -> ein zusammenhängendes Massiv.
let mountainMaxH=1;
function computeMountainHeights(){
  const INF=1e9, dist=[];
  for(let y=0;y<GRID;y++){ dist[y]=[]; for(let x=0;x<GRID;x++) dist[y][x]=grid[y][x].terr==='mountain'?INF:0; }
  let q=[], cx=0, cy=0, cnt=0;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    if(grid[y][x].terr!=='mountain') continue;
    cx+=x; cy+=y; cnt++;
    let border=false;
    for(const [nx,ny] of neighbors(x,y)) if(!inBounds(nx,ny)||grid[ny][nx].terr!=='mountain'){border=true;break;}
    if(border){ dist[y][x]=1; q.push([x,y]); }
  }
  if(!cnt){ mountainMaxH=1; return; }
  for(let i=0;i<q.length;i++){ const [x,y]=q[i];
    for(const [nx,ny] of neighbors(x,y))
      if(inBounds(nx,ny)&&grid[ny][nx].terr==='mountain'&&dist[ny][nx]===INF){ dist[ny][nx]=dist[y][x]+1; q.push([nx,ny]); }
  }
  cx/=cnt; cy/=cnt;
  let maxR=1;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++) if(grid[y][x].terr==='mountain'){
    const r=Math.hypot(x-cx,y-cy); if(r>maxR) maxR=r; }
  const noise=(x,y)=> Math.sin(x*0.55+1.3)*0.55 + Math.sin(y*0.5-0.7)*0.55
                    + Math.sin((x+y)*0.31+2.1)*0.45 + Math.sin((x-y)*0.42-1.1)*0.35;
  const PEAK=10.0;                                   // maximale Gipfelhöhe in Stufen ("deutlich höher")
  const raw=[]; let mx=0.0001;
  for(let y=0;y<GRID;y++){ raw[y]=[]; for(let x=0;x<GRID;x++){
    if(grid[y][x].terr!=='mountain'){ raw[y][x]=0; continue; }
    const dome=Math.max(0, 1 - Math.hypot(x-cx,y-cy)/maxR);   // 0 Rand .. 1 Mitte
    const taper=Math.min(1, dist[y][x]/2);                    // äußere 1–2 Ringe flach -> kleine Vorberge
    let h=(0.6 + dome*dome*PEAK)*taper + noise(x,y)*0.7*dome;
    if(h<0.4) h=0.4;
    raw[y][x]=h; if(h>mx) mx=h;
  }}
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){          // sanfte Glättung -> harmonischer Verlauf
    const t=grid[y][x]; if(t.terr!=='mountain'){ t.mh=0; continue; }
    let s=raw[y][x]*2, c=2;
    for(const [nx,ny] of neighbors(x,y)) if(inBounds(nx,ny)&&grid[ny][nx].terr==='mountain'){ s+=raw[ny][nx]; c++; }
    t.mh=s/c;
  }
  mountainMaxH=mx;
}
