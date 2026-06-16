/* TERRA · main.js */
// ---- Start ----
window.addEventListener('resize',resize);
let _loaded=false;
if(hasSave()) _loaded=loadGame(true);
if(!_loaded) generateTerrain();
resize();
if(!_loaded) centerCam();
updateHUD(); initClouds(); initAllWildlife();
initSystemUI(); startTicks(); requestAnimationFrame(loop);
setTimeout(()=>flash(_loaded
  ? 'Willkommen zurück — Spielstand geladen ✦'
  : 'Baue Häuser an einen Brunnen — dann wandern Siedler vom Rand ein ✦'),900);

// ---- PWA: Service Worker registrieren (relativer Pfad für GitHub Pages) ----
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});
}
