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
  // ---- Rohstoff-Abbau & Lager ----
  woodcutter:  {label:'Holzfäller',  glyph:'🪓', cost:35, every:12, up:1, jobs:1},   // schlägt Holz am Wald
  quarry:      {label:'Steinbruch',  glyph:'⛏️', cost:50, every:13, up:2, jobs:2},   // bricht Stein am Fels
  marblequarry:{label:'Marmorbruch', glyph:'🪨', cost:70, every:14, up:2, jobs:2},   // bricht Marmor
  warehouse:   {label:'Lagerhaus',   glyph:'📦', cost:90, up:2, size:2},             // 2×2 Lager (Holz/Stein/Marmor)
  roadblock:{label:'Sperre',  glyph:'🚧', cost:0,  util:true},   // Straßensperre: Läufer meiden diese Kachel (Steuerung)
  raze:    {label:'Abriss',   glyph:'⛏', cost:0,  util:true},
};
const ORDER=['road','roadblock','house','well','market','forum','firehouse','engineer','claypit','pottery','grainfield','farm','mill','bakery','fisher','woodcutter','quarry','marblequarry','warehouse','raze'];

const HOUSE=[{pop:1,tax:0},{pop:4,tax:2},{pop:9,tax:5},{pop:16,tax:9}];  // lvl3 = Villa (verlangt zusätzlich Keramik)
const SERVICE_LIFE=55;
const GOODS_BONUS=4;        // Extra-Steuer für mit Keramik versorgte Häuser
const HEALTH_BONUS=3;       // Extra-Steuer für gesund versorgte Häuser (Therme + Arzt) — verknüpft Gesundheit mit dem Geldkreislauf
const ENTERTAIN_BONUS=4;    // Extra-Steuer für unterhaltene Häuser (Theater/Arena/Kolosseum) — Kultur zahlt sich aus
const EDU_BONUS=4;          // Extra-Steuer für gebildete Häuser (Schule + Bibliothek); Akademie verdoppelt diesen Bonus
const WAGE=1;               // Lohn je beschäftigtem Arbeiter und Monat (laufender Abfluss neben dem Gebäude-Unterhalt)
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
const PLAGUE_CHANCE=0.0014; // Wahrscheinlichkeit/Tick für einen Seuchen-Toten in einem ungesunden Haus (nach Warnung + Schonfrist)
// ---- Arbeitskräfte (global, ohne Straße): Gebäude -> [benötigte Arbeiter, Priorität (klein=zuerst)] ----
const LABOR={ well:[1,0], market:[2,1], grainfield:[1,1], farm:[2,1], mill:[2,1], bakery:[2,1], fisher:[2,1], forum:[2,2], firehouse:[1,2], engineer:[1,2], pottery:[2,3], claypit:[1,3], woodcutter:[1,3], quarry:[2,3], marblequarry:[2,3] };

// 3D-Farben (Dachfläche / linke / rechte Wand) + Höhe
const H3D=[
  {top:'#b58f5e',left:'#7e5f39',right:'#9a7548',h:13,glyph:'🛖'},
  {top:'#cda46c',left:'#9a7647',right:'#b58d57',h:19,glyph:'🏠'},
  {top:'#e7dcc2',left:'#b7a682',right:'#d3c3a0',h:27,glyph:'🏡'},
  {top:'#f0e8d2',left:'#cab593',right:'#e0d0ac',h:35,glyph:'🏛️'},
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

// ---- Natürliche Ressourcen-Vorkommen (Rohstoffe auf der Karte) ----
const WOOD_MAX    = 120;  // Holz je Waldfeld · NACHWACHSEND → Bauholz (Monumente/Mauern), Möbel, Schiffbau
const STONE_STOCK = 999;  // Stein je Felsfeld · quasi unerschöpflich → Monumente & Stadtmauern
const MARBLE_STOCK= 999;  // Marmor je Marmorfeld → Villen/Paläste-Verzierung, Skulpturen (Parks)
// ---- Abbau & Lager ----
const HARVEST_EVERY = 8;  // Ticks je geförderte Einheit (Holzfäller/Steinbruch/Marmorbruch)
const WOOD_REGROW   = 40; // alle N Ticks wächst in jedem Waldfeld 1 Holz nach
const WH_CAP        = 24; // Lagerhaus: Fassungsvermögen je Rohstoff-Bucht

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
  // Felsige Rohstoff-Aufschlüsse: flacher Boden, Brocken kommen tiefensortiert im Objekt-Pass (rocks-Flag)
  rock:    {top:['#9a948a','#918b81'], elev:0, build:false, rocks:'stone'},   // Stein
  marble:  {top:['#d8d3c8','#cfcabf'], elev:0, build:false, rocks:'marble'},  // Marmor
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

// ============================================================
//  GESUNDHEIT & HYGIENE
//  Wandernde Dienst-Läufer (wie Brunnen/Priester) versorgen Häuser
//  mit ihrem jeweiligen "need". Ein Haus gilt als gesund, sobald es
//  Therme (Bad) UND Arzt erreicht — das schützt vor Seuchen und gibt
//  einen Steuerbonus. Der Barbier ist ein Zusatz (mindert die Seuchen-
//  gefahr weiter). Neue Einrichtung: einfach eine Zeile ergänzen — Menü,
//  Arbeitskräfte, Läuferfarbe und Baureihenfolge ziehen sich automatisch.
//  roof = Dachfarbe (drawHealth), accent = Akzent-/Läuferfarbe (Pflicht).
// ============================================================
const HEALTH = {
  bathhouse: { label:'Therme',  glyph:'♨️', need:'bath',   roof:'#3f86a8', accent:'#bfe4ef', up:2, cost:65, every:15 }, // Bad/Hygiene
  doctor:    { label:'Arzt',    glyph:'⚕️', need:'doctor', roof:'#b94a4a', accent:'#f1c9c9', up:2, cost:55, every:16 }, // medizinische Versorgung
  barber:    { label:'Barbier', glyph:'💈', need:'barber', roof:'#7d5aa6', accent:'#e0cef0', up:1, cost:35, every:17 }, // Zusatz-Hygiene
};
Object.keys(HEALTH).forEach(k=>{
  const g=HEALTH[k];
  BUILD[k] = { label:g.label, glyph:g.glyph, cost:g.cost, service:'health', every:g.every, up:g.up, jobs:2 };
  LABOR[k] = [2,2];               // 2 Bedienstete, Priorität wie Forum/Tempel
  B3D[k]   = { wcol:g.accent };   // Läuferfarbe (Pflicht: sonst crasht der Spawner)
});
// Gesundheits-Einrichtungen im Baumenü vor 'Abriss' einsortieren
ORDER.splice(ORDER.indexOf('raze'), 0, ...Object.keys(HEALTH));

// ============================================================
//  UNTERHALTUNG & KULTUR  (MEHRFELDRIGE Wahrzeichen)
//  Spielstätten besetzen ein Rechteck aus Feldern (foot:[Breite,Höhe]).
//  Sie werden als EIN großes Bauwerk auf der Anker-Kachel gezeichnet
//  (master), die übrigen Footprint-Kacheln sind Platzhalter (anchor,
//  ohne eigene Logik). Ein besetztes & an eine Straße angeschlossenes
//  Haus erhält über wandernde Läufer Unterhaltung (t.entertain) — das
//  hebt die Zufriedenheit und bringt einen Steuerbonus.
//  foot = Grundfläche · h = Bauhöhe · tiers = Sitzränge · life = Läufer-
//  Reichweite · roof/accent = Stein-/Akzentfarbe. Neue Spielstätte:
//  eine Zeile ergänzen — Menü, Arbeitskräfte, Reihenfolge folgen automatisch.
// ============================================================
const CULTURE = {
  theater:      { label:'Theater',      glyph:'🎭', foot:[2,2], h:30, tiers:2, stage:true,  roof:'#caa24a', accent:'#f0dca0', cost:90,  up:3, every:14, jobs:3, life:30 },
  amphitheater: { label:'Amphitheater', glyph:'🏟️', foot:[3,2], h:34, tiers:3, stage:false, roof:'#c98a4a', accent:'#efc99a', cost:170, up:4, every:13, jobs:4, life:42 },
  colosseum:    { label:'Kolosseum',    glyph:'🎪', foot:[4,4], h:52, tiers:5, stage:false, arcade2:true, arches:true, arcLevels:3, attic:true, velarium:true, roof:'#cbb48a', accent:'#efe2c4', cost:300, up:6, every:12, jobs:6, life:58 },
};
Object.keys(CULTURE).forEach(k=>{
  const g=CULTURE[k];
  BUILD[k] = { label:g.label, glyph:g.glyph, cost:g.cost, service:'entertain', every:g.every, up:g.up, jobs:g.jobs, foot:g.foot, life:g.life };
  LABOR[k] = [g.jobs,2];          // Bedienstete (Schauspieler/Gladiatoren etc.), Priorität wie Forum/Tempel
  B3D[k]   = { wcol:g.accent };   // Läuferfarbe (Pflicht: sonst crasht der Spawner)
});
// Spielstätten im Baumenü vor 'Abriss' einsortieren
ORDER.splice(ORDER.indexOf('raze'), 0, ...Object.keys(CULTURE));

// ============================================================
//  BILDUNG
//  Wandernde Dienst-Läufer (wie Therme/Arzt) versorgen Häuser mit
//  ihrem jeweiligen "need". Ein Haus gilt als gebildet, sobald es
//  Schule UND Bibliothek erreicht — das hebt die Zufriedenheit und
//  bringt einen Steuerbonus. Die Akademie ist die Prestige-Stufe:
//  ist sie zusätzlich angeschlossen, VERDOPPELT sich der Bildungs-
//  Steuerbonus (analog zum Barbier bei der Gesundheit). Neue
//  Einrichtung: einfach eine Zeile ergänzen — Menü, Arbeitskräfte,
//  Läuferfarbe und Baureihenfolge ziehen sich automatisch.
//  Hinweis: die Bedarf-Flags heißen schul/biblio/akad (NICHT 'school',
//  das markiert in findWaterPath einen Fischschwarm).
//  roof = Dachfarbe (drawEducation), accent = Akzent-/Läuferfarbe (Pflicht).
// ============================================================
const EDUCATION = {
  school:  { label:'Schule',     glyph:'📖', need:'schul',  roof:'#4a78b0', accent:'#cfe0f4', up:2, cost:55,  every:15 }, // Grundbildung
  library: { label:'Bibliothek', glyph:'📚', need:'biblio', roof:'#6f9c45', accent:'#dcecbf', up:2, cost:70,  every:16 }, // zweite Stufe
  academy: { label:'Akademie',   glyph:'🎓', need:'akad',   roof:'#9c6f3f', accent:'#efd8b8', up:3, cost:120, every:17 }, // Prestige (verdoppelt Bonus)
};
Object.keys(EDUCATION).forEach(k=>{
  const g=EDUCATION[k];
  BUILD[k] = { label:g.label, glyph:g.glyph, cost:g.cost, service:'education', every:g.every, up:g.up, jobs:2 };
  LABOR[k] = [2,2];               // 2 Bedienstete (Lehrer/Gelehrte), Priorität wie Forum/Tempel
  B3D[k]   = { wcol:g.accent };   // Läuferfarbe (Pflicht: sonst crasht der Spawner)
});
// Bildungs-Einrichtungen im Baumenü vor 'Abriss' einsortieren
ORDER.splice(ORDER.indexOf('raze'), 0, ...Object.keys(EDUCATION));
