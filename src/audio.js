/* TERRA · audio.js — synthetischer Sound (Web Audio API, keine Asset-Dateien) */
let _ac=null, _master=null, _soundOn=true;
let _rainG=null, _waterG=null, _rainCur=0, _waterCur=0;
let _silent=null, _unlocked=false;

/* iOS-Trick: WebAudio wird auf dem iPhone vom seitlichen Stumm-Schalter
   stummgeschaltet, solange keine HTML-Media-Wiedergabe lief. Ein kurz
   abgespieltes, lautloses <audio>-Element hebt die Audio-Session auf
   "playback" — danach klingt auch der synthetische Sound. */
function _unlockHTMLAudio(){
  if(_unlocked)return;
  try{
    if(!_silent){
      _silent=new Audio('data:audio/wav;base64,UklGRuQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA==');
      _silent.loop=true; _silent.volume=0; _silent.setAttribute('playsinline','');
    }
    const p=_silent.play(); if(p&&p.catch)p.catch(()=>{});
    _unlocked=true;
  }catch(e){}
}

// Lazy-Init bei der ersten Nutzergeste (Autoplay-Policy)
function audioInit(){
  _unlockHTMLAudio();                                  // iOS Stumm-Schalter umgehen
  if(_ac){ if(_ac.state!=='running'){ try{_ac.resume();}catch(e){} } return; }
  try{ _ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ _ac=null; return; }
  _master=_ac.createGain(); _master.gain.value=_soundOn?0.85:0; _master.connect(_ac.destination);
  // gemeinsames Rausch-Puffer (2 s)
  const sr=_ac.sampleRate, buf=_ac.createBuffer(1,sr*2,sr), d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  // Regen: Rauschen -> Hochpass (Zischen)
  _rainG=_ac.createGain(); _rainG.gain.value=0;
  const rn=_ac.createBufferSource(); rn.buffer=buf; rn.loop=true;
  const hp=_ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1300;
  rn.connect(hp); hp.connect(_rainG); _rainG.connect(_master); try{rn.start();}catch(e){}
  // Wasser: Rauschen -> Tiefpass (sanftes Plätschern)
  _waterG=_ac.createGain(); _waterG.gain.value=0;
  const wn=_ac.createBufferSource(); wn.buffer=buf; wn.loop=true;
  const lp=_ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=560; lp.Q.value=0.8;
  wn.connect(lp); lp.connect(_waterG); _waterG.connect(_master); try{wn.start();}catch(e){}
  // direkt aufwecken (iOS startet den Kontext oft "suspended", auch in einer Geste)
  if(_ac.state!=='running'){ try{_ac.resume();}catch(e){} }
}
function toggleSound(){
  _soundOn=!_soundOn;
  audioInit();                                         // sicherstellen, dass Audio entsperrt ist
  if(_master)_master.gain.value=_soundOn?0.85:0;
  if(_silent){ try{ if(_soundOn)_silent.play().catch(()=>{}); else _silent.pause(); }catch(e){} }
  if(_soundOn) _tone(660,0.09,'sine',0.18,560);        // kleines Feedback beim Einschalten
  return _soundOn;
}
function soundIsOn(){ return _soundOn; }

// kurzer Ton
function _tone(freq,dur,type,vol,slideTo){
  if(!_ac||!_soundOn)return; const t=_ac.currentTime;
  const o=_ac.createOscillator(), g=_ac.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(freq,t);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(Math.max(40,slideTo),t+dur);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol||0.2,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(_master); o.start(t); o.stop(t+dur+0.02);
}
function sfxClick(){ audioInit(); _tone(620,0.07,'sine',0.16,520); }
function sfxBuild(){ audioInit(); _tone(150,0.13,'square',0.16,90); _tone(440,0.10,'triangle',0.10,300); }

// Ambient an Zoom & Nähe koppeln (jede Frame aus loop aufgerufen)
function updateAmbient(){
  if(!_ac)return;
  const W=(cv&&cv.clientWidth)||800, Hh=(cv&&cv.clientHeight)||600, ccx=W/2, ccy=Hh/2;
  const zoom=Math.max(0,Math.min(1,(cam.scale-0.6)/0.9));   // 0 weit weg .. 1 nah dran
  // Regen: regnende Wolken nahe der Bildmitte?
  let rainScore=0;
  for(const c of clouds){ if(!c.raining)continue; const p=project(c.gx,c.gy);
    const dx=p.x-ccx, dy=p.y-ccy, dd=Math.hypot(dx,dy); if(dd<260) rainScore+=1-dd/260; }
  // Wasser: sichtbare Wasserfelder nahe der Bildmitte?
  let waterScore=0;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ if(grid[y][x].terr!=='water')continue;
    const p=project(x+0.5,y+0.5); if(p.x<-40||p.x>W+40||p.y<-40||p.y>Hh+40)continue;
    const dd=Math.hypot(p.x-ccx,p.y-ccy); if(dd<240) waterScore+=1-dd/240; }
  const rainTarget =Math.min(1,rainScore*0.6)*zoom*0.5;
  const waterTarget=Math.min(1,waterScore*0.25)*zoom*0.4;
  _rainCur +=(rainTarget -_rainCur )*0.05; _waterCur+=(waterTarget-_waterCur)*0.05;
  if(_rainG) _rainG.gain.value =_soundOn?_rainCur :0;
  if(_waterG)_waterG.gain.value=_soundOn?_waterCur:0;
}
