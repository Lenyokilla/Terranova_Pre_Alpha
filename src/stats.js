/* TERRA · stats.js — Stadtbericht: Ziele + Statistiken (Zeitreihen)
   Eigenständiges Modul, als IIFE gekapselt (nur window.statSample/statInc/statExp
   nach außen sichtbar) — verhindert Scope-Kollisionen im gemeinsamen Skript-Scope. */
(function(){
  'use strict';

  // ---------- Zeitreihen-Puffer ----------
  const CAP=120;                                  // gespeicherte Stützstellen
  const H={ pop:[], money:[], inc:[], exp:[], unempl:[], satis:[] };
  let _incAcc=0, _expAcc=0;                        // Sammler bis zur nächsten Stützstelle
  const _goalDone={};                             // bereits gemeldete Ziele
  function push(arr,v){ arr.push(v); if(arr.length>CAP)arr.shift(); }

  // ---------- Persistenz (überlebt das Schließen des Spiels) ----------
  const STATS_KEY='terra_stats_v1';
  let _persistAcc=0;
  function saveHist(){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(H)); }catch(e){} }
  function loadHist(){
    try{
      if(H.pop.length) return;                       // bereits Daten im Speicher -> nicht überschreiben
      const raw=localStorage.getItem(STATS_KEY); if(!raw)return;
      const d=JSON.parse(raw); if(!d||typeof d!=='object')return;
      for(const k in H) if(Array.isArray(d[k])) H[k]=d[k].slice(-CAP).map(v=>+v||0);
    }catch(e){}
  }
  function statReset(){                               // bei "Neue Karte": Historie leeren
    for(const k in H) H[k].length=0;
    _incAcc=0; _expAcc=0;
    for(const id in _goalDone) delete _goalDone[id];
    try{ localStorage.removeItem(STATS_KEY); }catch(e){}
    if(_open) scheduleRender();
  }
  window.statReset=statReset;

  // von input.js / sim.js aufgerufen
  function statInc(n){ _incAcc+=(+n||0); }
  function statExp(n){ _expAcc+=(+n||0); }

  // einmal pro Tick aus sim.js aufgerufen
  function statSample(){
    // Zufriedenheit aus bewohnten Häusern ableiten (Wasser/Nahrung/Waren)
    let occ=0, sat=0;
    try{
      for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){ const t=grid[y][x];
        if(t.type==='house'&&t.res>0){ occ++;
          let s=0; if(t.water>0)s+=0.30; if(t.food>0)s+=0.20; if(t.goods>0)s+=0.15; if(t.bath>0&&t.doctor>0)s+=0.13; if(t.entertain>0)s+=0.12; if(t.schul>0&&t.biblio>0)s+=0.10; sat+=s; } }
    }catch(e){}
    const satis = occ? (sat/occ*100) : 0;
    const wt = (typeof workersTotal==='number')?workersTotal:pop;
    const wf = (typeof workersFree==='number')?workersFree:0;
    const unempl = wt>0 ? (wf/wt*100) : 0;

    push(H.pop, pop|0);
    push(H.money, money|0);
    push(H.inc, _incAcc); push(H.exp, _expAcc); _incAcc=0; _expAcc=0;
    push(H.unempl, Math.round(unempl));
    push(H.satis, Math.round(satis));
    if((++_persistAcc % 5)===0) saveHist();           // regelmäßig sichern (gedrosselt)

    // einmalige Ziel-Meldung (statt Dauer-Banner)
    try{
      if(typeof GOALS!=='undefined'){
        for(const g of GOALS){ if(!_goalDone[g.id] && g.f && g.f()){ _goalDone[g.id]=true;
          if(typeof flash==='function') flash('✓ Ziel erreicht: '+g.t); } }
      }
    }catch(e){}

    if(_open) scheduleRender();
  }
  window.statSample=statSample; window.statInc=statInc; window.statExp=statExp;

  // ---------- SVG-Diagramme ----------
  function chart(series, o){
    o=o||{}; const w=o.w||300, h=o.h||60, pad=6;
    const all=[]; for(const s of series) for(const v of s.vals) all.push(v);
    if(!all.length) return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'"></svg>';
    let min=(o.min!=null)?o.min:Math.min(...all);
    let max=(o.max!=null)?o.max:Math.max(...all);
    if(min>0&&o.min==null)min=0;                  // bei positiven Werten an 0 verankern
    if(max<=min)max=min+1;
    const n=Math.max(...series.map(s=>s.vals.length));
    const X=i=>pad+(n<=1?0:(w-2*pad)*i/(n-1));
    const Y=v=>h-pad-(h-2*pad)*(v-min)/(max-min);
    let svg='<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" preserveAspectRatio="none">';
    // Nulllinie / Basis
    if(min<0&&max>0){ const y0=Y(0).toFixed(1);
      svg+='<line x1="'+pad+'" y1="'+y0+'" x2="'+(w-pad)+'" y2="'+y0+'" stroke="rgba(255,255,255,.18)" stroke-width="1"/>'; }
    for(const s of series){ const v=s.vals; if(!v.length)continue;
      let d=''; for(let i=0;i<v.length;i++){ d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(v[i]).toFixed(1); }
      if(s.fill){ const area=d+'L'+X(v.length-1).toFixed(1)+' '+(h-pad)+'L'+X(0).toFixed(1)+' '+(h-pad)+'Z';
        svg+='<path d="'+area+'" fill="'+s.fill+'"/>'; }
      svg+='<path d="'+d+'" fill="none" stroke="'+(s.color||'#c9a227')+'" stroke-width="'+(s.sw||2)+'" stroke-linejoin="round" stroke-linecap="round"/>';
      // letzter Punkt
      const lx=X(v.length-1).toFixed(1), ly=Y(v[v.length-1]).toFixed(1);
      svg+='<circle cx="'+lx+'" cy="'+ly+'" r="2.6" fill="'+(s.color||'#c9a227')+'"/>';
    }
    svg+='</svg>'; return svg;
  }
  function last(a){ return a.length?a[a.length-1]:0; }
  function fmt(n){ return (n|0).toLocaleString('de-DE'); }

  function block(title, valueHtml, svg, foot){
    return '<div class="rCard"><div class="rCardTop"><span class="rCardT">'+title+'</span>'
      +'<span class="rCardV">'+valueHtml+'</span></div>'+svg
      +(foot?'<div class="rCardF">'+foot+'</div>':'')+'</div>';
  }

  // ---------- Ziele ----------
  function goalsHTML(){
    if(typeof GOALS==='undefined') return '';
    let rows='';
    for(const g of GOALS){ let done=false, pr=null;
      try{ done=!!(g.f&&g.f()); }catch(e){}
      if(!done&&g.p){ try{ pr=Math.max(0,Math.min(1,g.p())); }catch(e){} }
      rows+='<div class="gRow '+(done?'gDone':'')+'"><div class="gT">'+(done?'✓ ':'• ')+g.t+'</div>';
      if(pr!=null){ rows+='<div class="gBar"><i style="width:'+(pr*100).toFixed(0)+'%"></i></div>'; }
      rows+='</div>';
    }
    return '<div class="rSec">ZIELE</div>'+rows;
  }

  function renderBody(){
    const popNow=last(H.pop), moNow=last(H.money);
    let statsHTML='<div class="rSec">STATISTIK</div>';
    statsHTML+=block('Einwohner', fmt(popNow),
      chart([{vals:H.pop,color:'#9ec6e8',fill:'rgba(158,198,232,.16)'}],{min:0}));
    statsHTML+=block('Kontostand', fmt(moNow)+' D',
      chart([{vals:H.money,color:'#c9a227',fill:'rgba(201,162,39,.15)'}],{}));
    statsHTML+=block('Einnahmen &amp; Ausgaben',
      '<span style="color:#86c98b">+'+fmt(last(H.inc))+'</span> / <span style="color:#e0876f">−'+fmt(last(H.exp))+'</span>',
      chart([{vals:H.inc,color:'#86c98b',sw:2},{vals:H.exp,color:'#e0876f',sw:2}],{min:0}),
      '<span style="color:#86c98b">▬ Einnahmen</span> &nbsp; <span style="color:#e0876f">▬ Ausgaben</span> · pro Runde');
    statsHTML+=block('Arbeitslosigkeit', last(H.unempl)+'%',
      chart([{vals:H.unempl,color:'#d8a24a',fill:'rgba(216,162,74,.14)'}],{min:0,max:100}),
      'freie Arbeitskräfte ohne Job');
    statsHTML+=block('Zufriedenheit', last(H.satis)+'%',
      chart([{vals:H.satis,color:'#86c98b',fill:'rgba(134,201,139,.14)'}],{min:0,max:100}),
      'Wasser · Nahrung · Waren · Gesundheit · Unterhaltung in bewohnten Häusern');
    return goalsHTML()+statsHTML;
  }

  // ---------- UI ----------
  let _open=false, _sheet=null, _overlay=null, _rafQ=false, _liveTimer=null;

  function injectCSS(){
    if(document.getElementById('reportCSS'))return;
    const st=document.createElement('style'); st.id='reportCSS';
    st.textContent=`
    #report{position:absolute;inset:0;z-index:9;display:flex;align-items:flex-end;justify-content:center;
      background:rgba(8,6,3,.55);backdrop-filter:blur(2px);}
    #report.hide{display:none;}
    #reportSheet{width:100%;max-width:520px;max-height:88%;overflow-y:auto;-webkit-overflow-scrolling:touch;
      background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--panel-line);
      border-top:2px solid var(--gold);border-radius:18px 18px 0 0;
      padding:14px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -14px 40px rgba(0,0,0,.55);position:relative;}
    #reportClose{position:absolute;top:10px;right:12px;width:32px;height:32px;border-radius:9px;
      border:1px solid var(--panel-line);background:#1c150d;color:var(--paper);font-size:15px;font-weight:700;}
    #reportClose:active{background:#b1542d;}
    .rHead{font-family:'Cinzel',serif;font-weight:700;font-size:17px;letter-spacing:1.5px;color:var(--gold);margin:2px 0 12px;}
    .rSec{font-size:11px;font-weight:700;letter-spacing:1.5px;color:#cdbfa3;opacity:.8;margin:14px 0 7px;}
    .gRow{padding:6px 0;border-bottom:1px dashed rgba(74,58,36,.5);}
    .gRow:last-child{border-bottom:0;}
    .gT{font-size:13px;font-weight:600;color:#ece8dc;} .gDone .gT{color:#86c98b;}
    .gBar{height:4px;border-radius:3px;background:rgba(255,255,255,.14);margin-top:5px;overflow:hidden;}
    .gBar i{display:block;height:100%;background:var(--gold);}
    .rCard{background:#1c150d;border:1px solid var(--panel-line);border-radius:12px;padding:9px 11px 7px;margin-bottom:9px;}
    .rCardTop{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;}
    .rCardT{font-size:12px;font-weight:600;color:#cdbfa3;}
    .rCardV{font-size:16px;font-weight:700;color:var(--paper);}
    .rCardF{font-size:10.5px;color:#a99;opacity:.85;margin-top:4px;}
    #btnReport,#btnSound{width:40px;height:40px;border-radius:11px;border:1px solid var(--panel-line);
      background:rgba(28,21,13,.85);color:var(--paper);font-size:18px;backdrop-filter:blur(4px);}
    #btnReport:active,#btnSound:active{background:var(--gold);}
    #btnSound.off{opacity:.5;}
    `;
    document.head.appendChild(st);
  }

  function buildPanel(){
    _overlay=document.createElement('div'); _overlay.id='report'; _overlay.className='hide';
    _sheet=document.createElement('div'); _sheet.id='reportSheet';
    _sheet.innerHTML='<button id="reportClose" title="Schließen">✕</button><div class="rHead">STADTBERICHT</div><div id="reportBody"></div>';
    _overlay.appendChild(_sheet);
    (document.getElementById('stage')||document.body).appendChild(_overlay);
    _overlay.addEventListener('click',e=>{ if(e.target===_overlay) closeReport(); });
    _sheet.querySelector('#reportClose').onclick=closeReport;
  }

  function scheduleRender(){ if(_rafQ)return; _rafQ=true;
    requestAnimationFrame(()=>{ _rafQ=false; const b=document.getElementById('reportBody'); if(b&&_open)b.innerHTML=renderBody(); }); }

  function openReport(){
    if(typeof audioInit==='function')audioInit(); if(typeof sfxClick==='function')sfxClick();
    if(!_sheet)buildPanel();
    _open=true; _overlay.classList.remove('hide');
    document.getElementById('reportBody').innerHTML=renderBody();
    clearInterval(_liveTimer); _liveTimer=setInterval(()=>{ if(_open)scheduleRender(); },1200);
  }
  function closeReport(){ _open=false; if(_overlay)_overlay.classList.add('hide'); clearInterval(_liveTimer); }

  function buildButtons(){
    const sys=document.getElementById('sys'); if(!sys)return;
    if(!document.getElementById('btnReport')){
      const b=document.createElement('button'); b.id='btnReport'; b.title='Stadtbericht & Ziele'; b.textContent='📊';
      b.onclick=openReport; sys.appendChild(b);
    }
    if(!document.getElementById('btnSound') && typeof toggleSound==='function'){
      const b=document.createElement('button'); b.id='btnSound'; b.title='Ton an/aus';
      const sync=()=>{ const on=(typeof soundIsOn==='function')?soundIsOn():true;
        b.textContent=on?'🔊':'🔇'; b.classList.toggle('off',!on); };
      b.onclick=()=>{ const on=toggleSound(); b.textContent=on?'🔊':'🔇'; b.classList.toggle('off',!on);
        if(typeof flash==='function')flash(on?'Ton an 🔊':'Ton aus 🔇'); };
      sync(); sys.appendChild(b);
    }
  }

  function init(){
    loadHist();                                       // gespeicherte Historie zurückholen
    injectCSS(); buildButtons();
    // garantierter Schreibvorgang, wenn man die App verlässt oder in den Hintergrund schickt
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') saveHist(); });
    window.addEventListener('pagehide', saveHist);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
