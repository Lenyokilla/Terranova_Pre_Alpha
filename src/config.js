/* TERRA · config.js */

/* ============================================================
   TERRA — Mobiler City-Builder · isometrisches Grundgerüst
   ============================================================ */
const GRID=30;
const TW=64, TH=32;       // isometrische Diamant-Maße (Welt-px)
const TICK=420;

const BUILD={
  hand:    {label:'Hand',     glyph:'✥',  cost:0,  util:true},
  road:    {label:'Straße',   glyph:'⌗',  cost:4,  up:0},
  house:   {label:'Haus',     glyph:'🛖', cost:12, up:0},
  well:    {label:'Brunnen',  glyph:'💧', cost:30, service:'water', every:13, up:1, jobs:1},
  market:  {label:'Markt',    glyph:'🧺', cost:55, service:'market', every:15, up:2, jobs:2},
  forum:   {label:'Forum',    glyph:'🏛️', cost:80, service:'tax',   every:18, up:3, jobs:2},
  firehouse:{label:'Feuerwache',glyph:'🧯', cost:45, service:'fire', every:16, up:2, jobs:2},
  engineer: {label:'Bauingenieur',glyph:'🛠', cost:50, service:'eng', every:18, up:2, jobs:2},
  claypit: {label:'Lehmgrube',glyph:'🕳️', cost:35, every:14, up:2, jobs:2},
  pottery: {label:'Töpferei', glyph:'🏺', cost:60, every:11, up:2, jobs:2},
  grainfield:{label:'Getreidefeld',glyph:'🌾', cost:30, every:14, up:1, jobs:1},
  farm:    {label:'Bauernhof', glyph:'🐂', cost:45, every:12, up:1, jobs:2},
  mill:    {label:'Mühle',    glyph:'⚙',  cost:55, every:11, up:2, jobs:2},
  bakery:  {label:'Bäckerei', glyph:'🍞', cost:60, every:11, up:2, jobs:2},
  fisher:  {label:'Fischer',  glyph:'🎣', cost:50, every:12, up:2, jobs:2},
  raze:    {label:'Abriss',   glyph:'⛏', cost:0,  util:true},
};
const ORDER=['road','house','well','market','forum','firehouse','engineer','claypit','pottery','grainfield','farm','mill','bakery','fisher','raze'];

const HOUSE=[{pop:1,tax:0},{pop:4,tax:2},{pop:9,tax:5}];
const SERVICE_LIFE=55;
const GOODS_BONUS=4;        // Extra-Steuer für mit Keramik versorgte Häuser
// ---- Spiel-Regeln ----
const GOAL_POP=60;          // Ziel: so viele Einwohner
const LOSE_MONEY=-60;       // darunter = Bankrott
const MONTH=24;             // Ticks pro Unterhalts-Abrechnung
const IMMIG_EVERY=8;        // Tick-Intervall für Zuwanderer-Versuch
const SEASON_LEN=80;        // Ticks pro Wachstums-Saison (synchron für ALLE Felder)
const HARVEST_TICK=70;      // Zeitpunkt im Zyklus, an dem geerntet wird (Speicher füllt sich)
// ---- Gefahren (Brand / Einsturz) ----
const RISK_GRACE=80;        // Ticks ohne Abdeckung, bis die Warnung erscheint
const RISK_FUSE=120;        // weitere Ticks Schonfrist, bevor wirklich etwas passiert (Zeit für Feuerwache)
const FIRE_CHANCE=0.0018;   // Wahrscheinlichkeit/Tick für Brand (nach Warnung + Schonfrist)
const COLLAPSE_CHANCE=0.0012;// Wahrscheinlichkeit/Tick für Einsturz (nach Warnung + Schonfrist)
// ---- Arbeitskräfte (global, ohne Straße): Gebäude -> [benötigte Arbeiter, Priorität (klein=zuerst)] ----
const LABOR={ well:[1,0], market:[2,1], grainfield:[1,1], farm:[2,1], mill:[2,1], bakery:[2,1], fisher:[2,1], forum:[2,2], firehouse:[1,2], engineer:[1,2], pottery:[2,3], claypit:[1,3] };

// 3D-Farben (Dachfläche / linke / rechte Wand) + Höhe
const H3D=[
  {top:'#b58f5e',left:'#7e5f39',right:'#9a7548',h:13,glyph:'🛖'},
  {top:'#cda46c',left:'#9a7647',right:'#b58d57',h:19,glyph:'🏠'},
  {top:'#e7dcc2',left:'#b7a682',right:'#d3c3a0',h:27,glyph:'🏡'},
];
const B3D={
  well:  {top:'#4f93b0',left:'#2f6580',right:'#3f7c98',h:18,glyph:'💧', wcol:'#3a7d9c'},
  market:{top:'#c46a40',left:'#8f4526',right:'#ad5733',h:20,glyph:'🧺', wcol:'#b1542d'},
  forum: {top:'#d8b84a',left:'#a98a2c',right:'#c2a23b',h:30,glyph:'🏛️', wcol:'#c9a227'},
  firehouse:{wcol:'#c0533a'},   // Feuerwehr-Läufer (rot)
  engineer:{wcol:'#5b7da8'},    // Bauingenieur-Läufer (blau)
  claypit:{wcol:'#a9713f'},   // Lehm-Träger
  pottery:{wcol:'#3f9c8a'},   // Keramik-Träger
  grainfield:{wcol:'#d9b44a'},// Getreide-Träger
  farm:{wcol:'#d9b44a'},      // Hof: Getreide-Träger
  mill:{wcol:'#e8dcc0'},      // Mehl-Träger
  bakery:{wcol:'#caa46e'},    // Brot-Träger
  fisher:{wcol:'#9ec6d8'},    // Fisch-Träger (zum Markt)
};

// ---- Terrain ----
const STEP=13;   // Welt-px Höhe pro Geländestufe
// top: zwei Farbtöne (Schachbrett) · side: Felskanten bei Erhebung · elev: Höhenstufe
const TERR={
  grass:   {top:['#8aa653','#82a04a'], elev:0, build:true},
  meadow:  {top:['#a6bf66','#9cb85c'], elev:0, build:true},
  field:   {top:['#cdb85c','#c5b052'], elev:0, build:true, furrow:true},
  forest:  {top:['#6f9047','#688843'], elev:0, build:true, trees:true},
  water:   {top:['#3f7d9c','#3b7796'], elev:0, build:false, water:true},
  hill:    {top:['#94ad58','#8ba751'], side:['#7c5d38','#8c6c43'], elev:1, build:true},
  mountain:{top:['#9b9387','#928a7e'], side:['#5f594f','#6f685c'], elev:2, build:false, peak:true},
};
function buildableTerr(t){const d=TERR[t.terr]; return d?d.build:true;}

// ============================================================
//  TEMPEL der römischen Hauptgötter
//  Unterscheiden sich v.a. durch die DACHFARBE (roof) je Gott.
//  accent = Akzent-/Läuferfarbe (Akrotere, Medaillon, Priester).
//  Neue Götter: einfach hier eine Zeile ergänzen — Menü/Sim ziehen
//  sich alles automatisch aus dieser Tabelle.
// ============================================================
const GODS = {
  temple_jupiter: { god:'Jupiter', roof:'#d2a32f', accent:'#f4e6b0', glyph:'⚡'  }, // Gold (König der Götter)
  temple_juno:    { god:'Juno',    roof:'#2f8f86', accent:'#bfe9e0', glyph:'🦚' }, // Pfauen-Türkis
  temple_minerva: { god:'Minerva', roof:'#6f7a43', accent:'#dde0b4', glyph:'🦉' }, // Oliv (Weisheit)
  temple_mars:    { god:'Mars',    roof:'#9c3424', accent:'#e7b3a0', glyph:'⚔️'  }, // Blutrot (Krieg)
  temple_venus:   { god:'Venus',   roof:'#c25f87', accent:'#f4cfdd', glyph:'🌹' }, // Rosé (Liebe)
  temple_neptune: { god:'Neptune', roof:'#2c6b9c', accent:'#bcdcef', glyph:'🔱' }, // Meerblau
};
Object.keys(GODS).forEach(k=>{
  const g=GODS[k];
  BUILD[k] = { label:'Tempel · '+g.god, glyph:g.glyph, cost:120, service:'religion', every:17, up:4, jobs:2 };
  LABOR[k] = [2,2];               // 2 Priester, Priorität wie Forum
  B3D[k]   = { wcol:g.accent };   // Priester-Läuferfarbe (Pflicht: sonst crasht der Spawner)
});
// Tempel im Baumenü vor 'Abriss' einsortieren
ORDER.splice(ORDER.indexOf('raze'), 0, ...Object.keys(GODS));
