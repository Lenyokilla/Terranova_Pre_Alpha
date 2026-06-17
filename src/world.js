/* TERRA · world.js */
// ---- Zustand ----
let money=3000, pop=0, tool='hand';
let won=false, lost=false;
let grid=[], walkers=[], tickCount=0;
let speed=1;                 // 0=Pause · 1× · 2× · 3× (Zeitraffer)
let workersFree=0, workersTotal=0;   // globale Arbeitskräfte
let selectedTile=null;       // {x,y} des im Info-Panel angezeigten Gebäudes
let animT=0; const clouds=[];   // Wetter-Animation
const sheep=[]; const birds=[]; let herdAnchor=null;   // Tierwelt
function blankTile(){return {type:'empty',terr:'grass',lvl:0,water:0,food:0,taxed:0,goods:0,res:0,decay:0,spawn:0};}
function buildOn(t,type,service){t.type=type;t.lvl=0;t.water=0;t.food=0;t.taxed=0;t.goods=0;t.res=0;t.decay=0;t.spawn=0;t.clay=0;t.cer=0;t.grain=0;t.bread=0;t.conv=0;t.fireSafe=0;t.engSafe=0;t.rF=0;t.rC=0;t.fireRisk=false;t.collapseRisk=false;t.staffed=false;t.service=service||undefined;}
function razeTile(t){t.type='empty';t.service=undefined;t.lvl=0;t.water=0;t.food=0;t.taxed=0;t.goods=0;t.res=0;t.decay=0;t.spawn=0;t.clay=0;t.cer=0;t.grain=0;t.bread=0;t.fireSafe=0;t.engSafe=0;t.rF=0;t.rC=0;t.fireRisk=false;t.collapseRisk=false;t.staffed=false;}

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
  // Bergmassiv in einer Ecke
  growBlob(Math.random()<.5?0:GRID-1, Math.random()<.5?0:GRID-1, Math.round((10+(Math.random()*8|0))*A),
    isGrass, t=>{t.terr='mountain';});
  // Hügelketten
  for(let i=0;i<Math.round(2*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    7+(Math.random()*8|0), isGrass, t=>t.terr='hill');
  // Wälder verschiedener Art – je Hain ein einheitlicher Typ
  const FT=['fir','leaf','pine'];
  for(let i=0;i<Math.round(3*A);i++){ const ft=FT[(Math.random()*3)|0];
    growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
      8+(Math.random()*10|0), isGrass, t=>{t.terr='forest'; t.forest=ft;}); }
  // Felder (Kulturland)
  for(let i=0;i<Math.round(2*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    6+(Math.random()*6|0), isGrass, t=>t.terr='field');
}
