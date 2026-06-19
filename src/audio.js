/* TERRA · audio.js — synthetischer Sound (Web Audio API, keine Asset-Dateien) */
let _ac=null, _master=null, _soundOn=true;
let _rainG=null, _waterG=null, _rainCur=0, _waterCur=0;
let _silent=null, _unlocked=false;
// --- Hintergrundmusik (synthetisch) ---
let _musGain=null, _musicOn=false, _musTimer=null, _musStep=0, _musNext=0;
const _BEAT=0.75;                                   // ~80 BPM
const _CHORDS=[                                     // ruhige a-moll-Folge: Am – F – C – G (Hz)
  [110.00,220.00,261.63,329.63],
  [ 87.31,174.61,220.00,261.63],
  [130.81,261.63,329.63,392.00],
  [ 98.00,196.00,246.94,293.66]
];

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
  _musGain=_ac.createGain(); _musGain.gain.value=0.55; _musGain.connect(_master);   // Musik-Submix
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
  startMusic();                                        // Hintergrundmusik bei der ersten Geste starten
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

// ---- Hintergrundmusik (synthetische Endlosschleife, keine Asset-Dateien) ----
function _pad(freq,when,dur){                         // weicher, langer Akkordklang
  if(!_ac||!_musGain)return; const o=_ac.createOscillator(), g=_ac.createGain();
  o.type='triangle'; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,when);
  g.gain.exponentialRampToValueAtTime(0.09,when+0.6);
  g.gain.setValueAtTime(0.09,Math.max(when+0.61,when+dur-0.8));
  g.gain.exponentialRampToValueAtTime(0.0001,when+dur);
  o.connect(g); g.connect(_musGain); o.start(when); o.stop(when+dur+0.05);
}
function _pluck(freq,when){                            // sanftes Arpeggio
  if(!_ac||!_musGain)return; const o=_ac.createOscillator(), g=_ac.createGain();
  o.type='sine'; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,when);
  g.gain.exponentialRampToValueAtTime(0.06,when+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,when+0.5);
  o.connect(g); g.connect(_musGain); o.start(when); o.stop(when+0.55);
}
function _musStepPlay(step,when){
  const ch=_CHORDS[Math.floor(step/4)%_CHORDS.length], beat=step%4;
  if(beat===0) for(const f of ch) _pad(f,when,_BEAT*4);          // Pad-Akkord über 4 Schläge
  _pluck(ch[(beat+1)%ch.length]*2, when);                        // Melodie eine Oktave höher
}
function _musSched(){                                  // Vorausplanung (Lookahead-Scheduler)
  if(!_ac||!_musicOn)return;
  if(_musNext<_ac.currentTime-1) _musNext=_ac.currentTime+0.08;  // nach Pause/Hintergrund neu ausrichten
  const ahead=_ac.currentTime+0.30;
  while(_musNext<ahead){ _musStepPlay(_musStep,_musNext); _musStep++; _musNext+=_BEAT; }
}
function startMusic(){
  if(!_ac||_musicOn)return;
  _musicOn=true; _musStep=0; _musNext=_ac.currentTime+0.08;
  _musSched(); _musTimer=setInterval(_musSched,120);
}
function stopMusic(){ _musicOn=false; if(_musTimer){clearInterval(_musTimer);_musTimer=null;} }
function musicIsOn(){ return _musicOn; }
function toggleMusic(){
  audioInit();                                         // entsperrt Audio (iOS) und legt den Kontext an
  if(_musicOn){ stopMusic(); return false; }
  _soundOn=true; if(_master)_master.gain.value=0.85;   // sicherstellen, dass nichts stummgeschaltet ist
  if(_silent){ try{_silent.play().catch(()=>{});}catch(e){} }
  startMusic(); return true;
}
// kleiner Musik-Knopf in der System-Leiste (#sys); kein index.html-Eingriff nötig
function _installMusicButton(){
  if(document.getElementById('bMusic'))return;
  const host=document.getElementById('sys')||document.body;
  const b=document.createElement('button');
  b.id='bMusic'; b.title='Musik an/aus'; b.textContent='🎵';
  b.addEventListener('click',function(){ const on=toggleMusic(); b.textContent=on?'🎵':'🔇'; });
  host.appendChild(b);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_installMusicButton);
else _installMusicButton();

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
