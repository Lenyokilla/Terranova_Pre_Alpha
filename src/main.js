/* TERRA · main.js */
// ---- Start ----
window.addEventListener('resize',resize);
generateTerrain();resize();centerCam();updateHUD();initClouds();initSheep();initBirds();requestAnimationFrame(loop);
setTimeout(()=>flash('Baue Häuser an einen Brunnen — dann wandern Siedler vom Rand ein ✦'),900);

// ---- PWA: Service Worker registrieren (relativer Pfad für GitHub Pages) ----
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});
}
