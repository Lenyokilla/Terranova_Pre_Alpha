/* TERRA · world.js */
// ---- Zustand ----
let money=300, pop=0, tool='hand';
let won=false, lost=false;
let grid=[], walkers=[], tickCount=0;
let animT=0; const clouds=[];   // Wetter-Animation
const sheep=[]; const birds=[]; let herdAnchor=null;   // Tierwelt
function blankTile(){return {type:'empty',terr:'grass',lvl:0,water:0,food:0,taxed:0,goods:0,res:0,decay:0,spawn:0};}
function buildOn(t,type,service){t.type=type;t.lvl=0;t.water=0;t.food=0;t.taxed=0;t.goods=0;t.res=0;t.decay=0;t.spawn=0;t.clay=0;t.cer=0;t.conv=0;t.service=service||undefined;}
function razeTile(t){t.type='empty';t.service=undefined;t.lvl=0;t.water=0;t.food=0;t.taxed=0;t.goods=0;t.res=0;t.decay=0;t.spawn=0;t.clay=0;t.cer=0;}

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
  // Fluss: mäandernder Lauf von oben nach unten
  let rx=2+(Math.random()*(GRID-4)|0);
  for(let ry=0;ry<GRID;ry++){
    grid[ry][clampg(rx)].terr='water';
    if(Math.random()<0.4) grid[ry][clampg(rx+(Math.random()<.5?1:-1))].terr='water';
    rx+= (Math.random()<.5?-1:1)*(Math.random()<.6?1:0); rx=clampg(rx);
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
  // Wälder
  for(let i=0;i<Math.round(3*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    8+(Math.random()*10|0), isGrass, t=>t.terr='forest');
  // Felder (Kulturland)
  for(let i=0;i<Math.round(2*A);i++) growBlob((Math.random()*GRID)|0,(Math.random()*GRID)|0,
    6+(Math.random()*6|0), isGrass, t=>t.terr='field');
}
