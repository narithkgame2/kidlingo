/* ---------- storage ---------- */
const KEY = 'kidlingo.v1';
const DEF_SET = {kana:true, rate:0.85, sfx:true, speed:1};
const fresh = () => ({hana:0, days:[], words:{}, kana:{}, themes:{}, stickers:{}, stars:{}, settings:{...DEF_SET}});
function load(){ try{ const r = JSON.parse(localStorage.getItem(KEY)); if(r){ const st = Object.assign({...DEF_SET}, r.settings||{}); if(st.slow){ st.speed = 0; delete st.slow; } return Object.assign(fresh(), r, {settings:st}); } }catch(e){} return fresh(); }
let S = load();
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function markDay(){ const t = fmt(new Date()); if(!S.days.includes(t)){ S.days.push(t); save(); updateBar(); } }
function streak(){ const set = new Set(S.days); const d = new Date(); if(!set.has(fmt(d))){ d.setDate(d.getDate()-1); if(!set.has(fmt(d))) return 0; } let n=0; while(set.has(fmt(d))){ n++; d.setDate(d.getDate()-1); } return n; }
function rec(k, ok){ const w = S.words[k] || (S.words[k] = {ok:0, miss:0, streak:0}); if(ok){ w.ok++; w.streak++; } else { w.miss++; w.streak = 0; } save(); }
const mastered = k => { const w = S.words[k]; return !!w && w.ok >= 3 && w.streak >= 2; };
const doneIn = list => list.filter(k => S.kana[k]).length;
const kanaDone = () => doneIn(KANA);
const kataDone = () => doneIn(KATA);

/* ---------- speech + sound ---------- */
let jaVoice = null, voicesN = 0, lastErr = '', unlocked = false;
const keep = [];
function pickVoice(){
  try{
    const vs = speechSynthesis.getVoices(); voicesN = vs.length;
    const ja = vs.filter(v => /^ja/i.test(v.lang) || /japan/i.test(v.name));
    const pref = /Kyoko|O-ren|Otoya|Nanami|Haruka|Ayumi|Sayaka|Ichiro/i;
    jaVoice = ja.find(v => v.localService && pref.test(v.name)) || ja.find(v => v.localService && !/Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley/.test(v.name)) || ja.find(v => v.localService) || ja[0] || null;
    if(voicesN && !ja.length) soundIssue('no-japanese-voice');
  }catch(e){}
}
const hasTTS = 'speechSynthesis' in window;
if(hasTTS){ pickVoice(); try{ speechSynthesis.addEventListener('voiceschanged', pickVoice); }catch(e){ speechSynthesis.onvoiceschanged = pickVoice; } }
/* first touch anywhere unlocks speech + sound (needed on iPhone/iPad and some desktop apps) */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function unlock(){
  if(unlocked) return; unlocked = true;
  /* iPhone/iPad: the audio element may play by itself later only if it played once inside a tap */
  try{ if(player.paused){ player.src = SILENT; player.play().catch(() => {}); } }catch(e){}
  try{ ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume && ac.resume(); }catch(e){}
  if(hasTTS){ try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; keep.push(u); speechSynthesis.speak(u); }catch(e){} if(!jaVoice) pickVoice(); }
}
document.addEventListener('pointerdown', unlock, {capture:true});
document.addEventListener('keydown', unlock, {capture:true});

function makeUtt(t, rate, withVoice){
  const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP';
  if(withVoice && jaVoice) u.voice = jaVoice;
  u.rate = rate || S.settings.rate; u.pitch = 1.05; u.volume = 1;
  return u;
}
/* recorded clips (Open JTalk, Mei voice) are the main audio; device speech is only a fallback */
let CLIPS = {};
try{ CLIPS = JSON.parse(document.getElementById('kl-audio').textContent); }catch(e){}
const player = new Audio(); player.preload = 'auto';
let qTok = 0;
/* Speed bar 🐢 ━━●━━ 🐇 (S.settings.speed 0 / 1 / 2): slow plays the real slow take of each word and phrase ("slow:"
   clips, recorded slowly with longer pauses), normal the normal take, fast the normal take a little quicker.
   Never slow a clip down in the browser: stretching it sounds robotic (speeding up a little is clean). */
const rateFor = () => S.settings.speed === 2 ? 1.15 : 1;
const clipKey = t => S.settings.speed === 0 && CLIPS['slow:' + t] ? 'slow:' + t : t;
let lastSaid = null;
function say(text, rate){
  const parts = [].concat(text), r = rate || S.settings.rate;
  lastSaid = parts[parts.length - 1];
  if(parts.every(p => CLIPS[p])) return playClips(parts.map(clipKey), r);
  return ttsSay(parts, r);
}
/* Audio that starts by itself waits a moment after the screen appears (LEAD), and there is a short pause between
   parts (GAP), so a child hears "さわって きいてね" … "いぬ", not one run-on sound. A tap later plays at once. */
const LEAD = 450, GAP = 380; let shownAt = 0;
function playClips(parts, r){
  const tok = ++qTok; let i = 0;
  try{ player.pause(); }catch(e){}
  try{ if(hasTTS && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); }catch(e){}
  const step = () => {
    if(tok !== qTok || i >= parts.length) return;
    const t = parts[i++];
    player.src = CLIPS[t];        // a file URL (web app) or a data: URL (single-file copy)
    player.defaultPlaybackRate = player.playbackRate = rateFor(r);
    player.muted = false; player.volume = 1;
    player.onended = () => setTimeout(step, GAP);
    const p = player.play();
    if(p && p.then) p.then(clearSoundIssue).catch(err => { lastErr = 'audio-element: ' + (err && err.name || err); webAudioClips(parts.slice(i-1), r, tok); });
  };
  const wait = LEAD - (performance.now() - shownAt);
  if(wait > 0) setTimeout(step, wait); else step();
}
function webAudioClips(parts, r, tok){
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if(ac.state === 'suspended') ac.resume();
    let i = 0;
    const step = () => {
      if(tok !== qTok || i >= parts.length) return;
      fetch(CLIPS[parts[i++]]).then(r => r.arrayBuffer()).then(buf => ac.decodeAudioData(buf, ab => {
        const src = ac.createBufferSource(); src.buffer = ab; src.playbackRate.value = rateFor(r);
        src.connect(ac.destination); src.onended = () => setTimeout(step, GAP); src.start(); clearSoundIssue();
      }, e => soundIssue('decode: ' + (e && e.message || e)))).catch(e => soundIssue('fetch: ' + (e && e.message || e)));
    };
    step();
  }catch(e){ soundIssue('webaudio: ' + (e && e.message || e)); }
}
function ttsSay(parts, rate){
  if(!hasTTS){ soundIssue('no-speech-support'); return; }
  const ss = speechSynthesis;
  const run = () => {
    try{ ss.resume(); }catch(e){}
    parts.forEach((t, i) => {
      const u = makeUtt(t, rate, true); let started = false;
      u.onstart = () => { started = true; lastErr = ''; clearSoundIssue(); };
      u.onerror = e => {
        if(e.error === 'interrupted' || e.error === 'canceled') return;
        lastErr = e.error || 'unknown';
        if(u.voice){ const u2 = makeUtt(t, rate, false); u2.onerror = e2 => soundIssue(e2.error || 'unknown'); u2.onstart = () => clearSoundIssue(); keep.push(u2); ss.speak(u2); }
        else soundIssue(lastErr);
      };
      keep.push(u); if(keep.length > 30) keep.splice(0, keep.length - 30);
      ss.speak(u);
      if(i === 0) setTimeout(() => { if(!started && !ss.speaking) soundIssue(lastErr || 'did-not-start'); }, 2500);
    });
  };
  try{
    if(ss.speaking || ss.pending){ ss.cancel(); setTimeout(run, 70); } else run();
  }catch(e){ soundIssue(String(e && e.message || e)); }
}
function soundIssue(code){
  lastErr = code;
  const b = document.getElementById('soundWarn'); if(b) b.hidden = false;
}
function clearSoundIssue(){ const b = document.getElementById('soundWarn'); if(b) b.hidden = true; }
function soundHelp(){
  const o = modal(`<h2>Sound isn’t playing</h2>
    <p>Kidlingo plays recorded Japanese audio.</p>
    <ol class="help">
      <li>Check the device isn’t muted and the volume is up. On iPhone/iPad, also turn off the silent switch.</li>
      <li>Tap <b>Try again</b> below.</li>
      <li>If it still fails, open this page in Safari or Chrome instead of inside another app.</li>
      <li>No Japanese voice? Add one in the device’s text-to-speech or Spoken Content settings, then reload.</li>
    </ol>
    <p class="diag">Details for Claude: clips ${Object.keys(CLIPS).length} · ${hasTTS ? 'speech on' : 'no speech support'} · voices ${voicesN} · voice ${jaVoice ? jaVoice.name : 'none'} · last error ${lastErr || 'none'}</p>
    <div class="row"><button class="btn" id="shClose">Close</button><button class="btn primary" id="shTry">Try again</button></div>`);
  o.querySelector('#shClose').onclick = () => o.remove();
  o.querySelector('#shTry').onclick = () => { pickVoice(); say('こんにちは'); };
}
let ac;
function tone(freqs, type='sine', dur=.14, gap=.09, vol=.14){
  if(!S.settings.sfx) return;
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if(ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime;
    freqs.forEach((f,i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const s = t0 + i*gap;
      g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(vol, s+.01); g.gain.exponentialRampToValueAtTime(.0001, s+dur);
      o.connect(g).connect(ac.destination); o.start(s); o.stop(s+dur+.02); });
  }catch(e){}
}
const sfx = { ok:()=>tone([880,1318.5],'sine',.2,.09), no:()=>tone([240,190],'triangle',.18,.1,.12), win:()=>tone([659,784,988,1318.5],'sine',.26,.1), tap:()=>tone([700],'sine',.05,0,.05) };

/* ---------- graphics ---------- */
const HM = (() => { let d='', s=''; const R=44;
  for(let i=0;i<=200;i++){ const th=i/200*Math.PI*2; const r=R*(.8+.2*Math.abs(Math.sin(4*th))); d+=(i?'L':'M')+(50+r*Math.cos(th)).toFixed(1)+' '+(50+r*Math.sin(th)).toFixed(1); }
  for(let i=0;i<=120;i++){ const t=i/120; const th=-Math.PI/2+t*Math.PI*4.5; const r=3+26*t; s+=(i?'L':'M')+(50+r*Math.cos(th)).toFixed(1)+' '+(50+r*Math.sin(th)).toFixed(1); }
  return {d,s}; })();
const hanamaru = (px) => `<svg class="hm" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><path d="${HM.d}" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round"/><path d="${HM.s}" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/></svg>`;
const hanko = () => `<svg class="hanko" viewBox="0 0 140 140" role="img" aria-label="よく できました"><circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="70" cy="70" r="52" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="70" y="64" text-anchor="middle" font-size="31" font-weight="900" fill="currentColor">よく</text><text x="70" y="97" text-anchor="middle" font-size="21" font-weight="900" fill="currentColor">できました</text></svg>`;
const SPK = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="currentColor"/><path d="M15.5 8.5a4.5 4.5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const spk = (id, cls='') => `<button class="spk ${cls}" id="${id}" aria-label="きく">${SPK}</button>`;
/* A phrase scene: people and things left to right; the one who says the phrase has the speech bubble.
   sc = {s:[slots], sp:speaker index, t:time-of-day emoji, sub:{i, e} a small bubble for someone who already spoke}. */
function scene(sc, size){
  return `<span class="scn ${size}" aria-hidden="true">${sc.t ? `<span class="scn-t">${sc.t}</span>` : ''}${sc.s.map((e,i) =>
    `<span class="scn-s${/^(➡️|⬅️)$/.test(e) ? ' arr' : ''}${i === sc.sp ? ' sp' : ''}">${i === sc.sp ? '<span class="bub"><i></i><i></i><i></i></span>' : ''}${sc.sub && sc.sub.i === i ? `<span class="bub sub">${sc.sub.e}</span>` : ''}<span class="emo">${e}</span></span>`).join('')}</span>`; }
function pic(w, size){ const p = w.p;
  if(w.sc) return scene(w.sc, size);
  if(typeof p === 'string') return `<span class="emo ${size}" aria-hidden="true">${p}</span>`;
  if(p.c) return `<span class="swatch ${size}" style="--sw:${p.c}" aria-hidden="true"></span>`;
  return `<span class="dots ${size}" style="--cols:${Math.min(p.n,5)}" aria-hidden="true">${'<i></i>'.repeat(p.n)}</span>`; }

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const bump = el => !reduce && el.animate([{transform:'scale(1)'},{transform:'scale(1.05)'},{transform:'scale(1)'}],{duration:240});
const shake = el => !reduce && el.animate([{transform:'translateX(0)'},{transform:'translateX(-10px)'},{transform:'translateX(10px)'},{transform:'translateX(-6px)'},{transform:'translateX(0)'}],{duration:340});
function confetti(){
  if(reduce) return;
  const c = document.getElementById('fx'), x = c.getContext('2d'), dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  c.width = W*dpr; c.height = H*dpr; x.setTransform(dpr,0,0,dpr,0,0);
  const cols = ['#E0452B','#F2B233','#2E9E64','#3B82D6','#8A57C9','#F59AB5'];
  const P = Array.from({length:70}, () => ({x:W/2, y:H*.42, vx:(Math.random()-.5)*13, vy:-Math.random()*11-4, r:Math.random()*7+5, a:Math.random()*6, va:(Math.random()-.5)*.3, c:cols[Math.floor(Math.random()*cols.length)]}));
  let t = 0;
  (function f(){ t++; x.clearRect(0,0,W,H);
    P.forEach(p => { p.vy += .33; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); x.restore(); });
    if(t < 120) requestAnimationFrame(f); else x.clearRect(0,0,W,H); })();
}
function toast(html){ const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2400); setTimeout(() => t.remove(), 2900); }

/* ---------- rewards ---------- */
const STICKERS = [
  ...ALL.map(t => ({id:'t_'+t.id, e:t.icon, label:t.name, test:() => (S.themes[t.id]||0) > 0})),
  ...JOURNEY.map(g => ({id:'r_'+g.icon, e:g.icon, label:g.name, test:() => g.stops.every(stopDone)})),
  {id:'k5', e:'🌱', label:'ひらがな 5', test:() => kanaDone() >= 5},
  {id:'k20', e:'🌷', label:'ひらがな 20', test:() => kanaDone() >= 20},
  {id:'k46', e:'🌸', label:'ひらがな ぜんぶ', test:() => kanaDone() >= 46},
  {id:'kk10', e:'🍀', label:'カタカナ 10', test:() => kataDone() >= 10},
  {id:'kk46', e:'🌻', label:'カタカナ ぜんぶ', test:() => kataDone() >= 46},
  {id:'h30', e:'🎈', label:'はなまる 30', test:() => S.hana >= 30},
  {id:'h100', e:'🚀', label:'はなまる 100', test:() => S.hana >= 100},
  {id:'h250', e:'👑', label:'はなまる 250', test:() => S.hana >= 250},
  {id:'s3', e:'🍡', label:'3 にち つづけて', test:() => streak() >= 3},
  {id:'s7', e:'🎏', label:'7 にち つづけて', test:() => streak() >= 7}
];
function checkStickers(){
  const got = STICKERS.filter(s => !S.stickers[s.id] && s.test());
  if(!got.length) return;
  got.forEach(s => S.stickers[s.id] = fmt(new Date())); save();
  toast(`<span class="emo">${got[0].e}</span><span>シールを もらいました！</span>`); sfx.win();
}
let L = null;
function addHana(n){ S.hana += n; if(L) L.earned += n; markDay(); save(); updateBar(); checkStickers(); }
function updateBar(){ document.getElementById('hanaN').textContent = S.hana; document.getElementById('streakN').textContent = streak(); }

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const view = $('#view');
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
function h(html, cls=''){ view.innerHTML = `<div class="page ${cls}">${html}</div>`; view.scrollTop = 0; shownAt = performance.now(); }
function bindGo(){ view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx.tap(); go(b.dataset.go, b.dataset.arg); }); }
function pickTargets(words, n){
  const ranked = words.map(w => { const s = S.words[w.k]; const weight = s ? (s.streak >= 2 ? 1 : 3 + s.miss) : 2.5; return {w, key:Math.random()*weight}; })
    .sort((a,b) => b.key - a.key).map(x => x.w);
  const out = []; while(out.length < n) out.push(...ranked.slice(0, n - out.length)); return out;
}
function options(w){ return shuffle([w, ...shuffle(L.t.words.filter(x => x.k !== w.k)).slice(0,3)]); }

/* ---------- screens ---------- */
let current = 'home', prevScreen = 'home';
const listFor = t => t && t.kind === 'phrase' ? 'phrases' : 'themes';
const up = () => current === 'trace' ? (RS ? 'home' : 'kana') : current === 'lesson' ? (L && L.from === 'home' ? 'home' : listFor(L && L.t)) : 'home';
function go(name, arg){
  if(name !== 'trace') RS = null;
  stopRecorder();
  prevScreen = current; current = name;
  document.body.classList.toggle('wide', name === 'kana');
  $('#homeBtn').style.visibility = name === 'home' ? 'hidden' : 'visible';
  ({home, themes:() => themes('word'), phrases:() => themes('phrase'), lesson, kana:kanaGrid, trace, stickers, parent})[name](arg);
  updateBar();
}

/* ---------- the journey (home) ----------
   An e-sugoroku train ride across Japan. Stops run top to bottom in regions (JOURNEY in data.js); the train waits at
   the next stop, finished stops show 1-3 はなまる, later stops are locked. The big つぎ button always opens the next stop.
   After a stop is finished for the first time (ARRIVE), the train rides on, and a new region gets "…に ついた！". */
const STOPS = JOURNEY.flatMap((g, gi) => g.stops.map(id => ({id, gi})));
const isRow = id => /^[hk]\d$/.test(id);
const topicOf = id => ALL.find(t => t.id === id);
function stopDone(id){ return isRow(id) ? rowChars(id).every(c => S.kana[c]) : (S.themes[id]||0) > 0; }
const nextStop = () => STOPS.findIndex(x => !stopDone(x.id));
const stopName = id => isRow(id) ? rowChars(id).join('') : topicOf(id).name;
const stopIcon = id => isRow(id) ? `<span class="kana">${rowChars(id)[0]}</span>` : `<span class="emo">${topicOf(id).icon}</span>`;
const stopKind = id => isRow(id) ? 'write' : topicOf(id).kind === 'phrase' ? 'talk' : 'words';
function openStop(id){ sfx.tap(); if(isRow(id)) startRow(id); else go('lesson', id); }
let ARRIVE = null;
const XS = [50, 77, 50, 23];   // stops zig-zag across the board (percent of the width)

function home(){
  view.style.removeProperty('--tc');
  const nx = nextStop(), here = nx < 0 ? STOPS.length - 1 : nx;
  let y = 96, stops = '', bands = '', pts = [], pos = [];
  JOURNEY.forEach(g => {
    const top = y; y += 146;
    g.stops.forEach(id => {
      const i = STOPS.findIndex(x => x.id === id), x = XS[i % 4], done = stopDone(id), st = done ? 'done' : i === nx ? 'now' : 'lock';
      const n = done ? (S.stars[id] || 3) : 0;
      pts.push([x, y]); pos.push([x, y]);
      stops += `<button class="stop ${st} k-${stopKind(id)}" style="left:${x}%;top:${y}px" data-stop="${id}" aria-label="${i+1}. ${stopName(id)}">
        <span class="disc">${stopIcon(id)}</span><span class="snum">${i+1}</span>
        ${done ? `<span class="sstars">${[1,2,3].map(k => `<i class="${k <= n ? 'on' : ''}">${hanamaru(17)}</i>`).join('')}</span>` : `<span class="sname kana">${stopName(id)}</span>`}</button>`;
      y += 108;
    });
    const deco = (g.deco || []).map((e, k) => `<span class="jdeco" style="left:${k % 2 ? 91 : 9}%;top:${top + 70 + k * Math.max(60, (y - top - 140) / Math.max(1, g.deco.length - 1))}px">${e}</span>`).join('');
    bands += `<div class="jband" style="top:${top}px;height:${y - top - 30}px;--bg:${g.bg}"><span class="jregion"><span class="emo">${g.icon}</span><span>${g.name}</span>${g.stops.every(stopDone) ? hanamaru(22) : ''}</span></div>${deco}`;
    y += 10;
  });
  const H = y + 70, cut = nx < 0 ? pts.length : nx + 1;
  const curve = list => list.slice(1).map((p, i) => { const q = list[i], my = (q[1] + p[1]) / 2; return `C${q[0]} ${my} ${p[0]} ${my} ${p[0]} ${p[1]}`; }).join('');
  const line = list => `M50 40 L${pts[0][0]} ${pts[0][1]}` + curve(list);
  const [tx, ty] = pos[ARRIVE ? ARRIVE.from : here];
  const nxt = nx < 0 ? null : STOPS[nx].id;
  h(`<div class="free" role="navigation" aria-label="あそぶ">
      <button class="fp fp-words" data-go="themes"><span class="emo">🐶</span>ことば</button>
      <button class="fp fp-talk" data-go="phrases"><span class="emo">🙏</span>おはなし</button>
      <button class="fp fp-write" data-go="kana"><span class="kana">あ</span>かく</button>
      <button class="fp fp-stick" data-go="stickers"><span class="emo">🎁</span>シール</button></div>
    <div class="journey" id="journey" style="height:${H}px">
      ${bands}
      <svg class="jtrack" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">
        <path class="bed" d="${line(pts)}"/><path class="ties" d="${line(pts)}"/><path class="got" d="${line(pts.slice(0, cut))}"/></svg>
      <div class="jstart"><span class="emo">🚉</span><span>しゅっぱつ</span></div>
      ${stops}
      <div class="jgoal" style="top:${H - 64}px"><span class="emo">🎌</span><span>ゴール</span></div>
      <span class="train" id="train" style="left:${tx}%;top:${ty}px" aria-hidden="true">🚃</span>
    </div>
    <div class="gobar"><button class="btn primary go-next" id="goNext">${nxt ? `${stopIcon(nxt)}<span>つぎ</span>` : `<span class="emo">🎉</span><span>ゴール！</span>`}</button></div>`);
  bindGo();
  view.querySelectorAll('.stop').forEach(b => b.onclick = () => {
    if(b.classList.contains('lock')){ sfx.no(); shake(b); return; }
    openStop(b.dataset.stop); });
  $('#goNext').onclick = () => nxt ? openStop(nxt) : (sfx.tap(), go('stickers'));
  const centre = (i, smooth) => { const el = view.querySelector(`[data-stop="${STOPS[i].id}"]`); if(!el) return;
    const d = el.getBoundingClientRect().top - view.getBoundingClientRect().top - view.clientHeight * .42;
    view.scrollTo({top: view.scrollTop + d, behavior: smooth && !reduce ? 'smooth' : 'auto'}); };
  centre(ARRIVE ? ARRIVE.from : here);
  if(!ARRIVE) return;
  const from = ARRIVE.from; ARRIVE = null;
  const tr = $('#train'), now = view.querySelector('.stop.now');
  if(now) now.classList.add('waiting');
  setTimeout(() => {
    if(!tr.isConnected) return;
    const [x2, y2] = pos[here]; tr.style.left = x2 + '%'; tr.style.top = y2 + 'px'; tr.classList.add('ride'); centre(here, true);
    setTimeout(() => {
      if(!tr.isConnected) return; tr.classList.remove('ride');
      if(now){ now.classList.remove('waiting'); now.classList.add('arrive'); }
      if(nx < 0){ sfx.win(); say('ゴール！ おめでとう ございます！'); confetti(); return; }
      if(STOPS[nx].gi !== STOPS[from].gi){ const g = JOURNEY[STOPS[nx].gi];
        sfx.win(); toast(`<span class="emo">${g.icon}</span><span>${g.name}に つきました！</span>`); say(g.name + 'に つきました！'); confetti(); setTimeout(checkStickers, 3100); }
      else sfx.ok();
    }, reduce ? 0 : 1400);
  }, reduce ? 0 : 650);
}

function themes(kind){
  const list = kind === 'phrase' ? PHRASES : THEMES;
  h(`<h1 class="screen-title">${kind === 'phrase' ? 'おはなし' : 'ことば'}</h1><div class="theme-grid">${list.map(t => `
    <button class="theme-card" data-go="lesson" data-arg="${t.id}" aria-label="${t.name}" style="--tc:var(${t.hue})">
      <span class="emo m">${t.icon}</span><span class="theme-name">${t.name}</span>${t.kata ? '<span class="kata-badge kana">カタカナ</span>' : ''}
      <span class="meter" aria-hidden="true">${t.words.map(w => `<i class="${mastered(w.k)?'on':''}"></i>`).join('')}</span>
      ${(S.themes[t.id]||0) > 0 ? `<span class="done-mark">${hanamaru(34)}</span>` : ''}
    </button>`).join('')}</div>`);
  bindGo(); say('どれに しますか？');
}

function lesson(id){
  const t = ALL.find(x => x.id === id);
  const steps = [{type:'learn'}];
  if(t.kind === 'phrase'){
    pickTargets(t.words, 4).forEach(w => steps.push({type:'say', w}));
    pickTargets(t.words, 3).forEach(w => steps.push({type:'listen', w}));
    pickTargets(t.words, 2).forEach(w => steps.push({type:'read', w}));
    steps.push({type:'talk'});
  } else {
    pickTargets(t.words, 5).forEach(w => steps.push({type:'listen', w}));
    pickTargets(t.words, 4).forEach(w => steps.push({type:'read', w}));
    steps.push({type:'match'}, {type:'talk'});
  }
  view.style.setProperty('--tc', `var(${t.hue})`);
  L = {t, steps, i:0, earned:0, ok:0, n:0, from:prevScreen === 'lesson' && L ? L.from : prevScreen, was:stopDone(id)};
  markDay(); step();
}
const stepsBar = () => { const pct = Math.round(L.i / L.steps.length * 100);
  return speedBar() + `<div class="rail" role="progressbar" aria-valuemin="1" aria-valuemax="${L.steps.length}" aria-valuenow="${L.i+1}"><span class="rail-track"><i style="width:${pct}%"></i></span><span class="rail-train" style="left:${pct}%" aria-hidden="true">🚃</span><span class="rail-flag" aria-hidden="true">🏁</span></div>`; };
const speedBar = () => `<div class="speedbar"><span class="emo" aria-hidden="true">🐢</span><input type="range" class="spd" min="0" max="2" step="1" value="${S.settings.speed}" aria-label="こえの はやさ (ゆっくり … はやい)"><span class="emo" aria-hidden="true">🐇</span></div>`;
const tally = ok => { if(!L) return; L.n++; if(ok) L.ok++; };
const starsFor = (ok, n) => !n ? 3 : ok/n >= .85 ? 3 : ok/n >= .5 ? 2 : 1;
function next(){ if(current !== 'lesson') return; L.i++; if(L.i >= L.steps.length) finish(); else step(); }
function step(){ const s = L.steps[L.i]; ({learn:stLearn, listen:stListen, read:stRead, match:stMatch, talk:stTalk, say:stSay})[s.type](s); }
const isP = () => L.t.kind === 'phrase';

/* phrase game: see the scene, pick what you say */
function stSay(s){
  const w = s.w, opts = shuffle([w, ...shuffle(L.t.words.filter(x => x.k !== w.k)).slice(0,2)]); let first = true, locked = false;
  h(`${stepsBar()}<div class="prompt"><span class="prompt-text">なんと いいますか？</span></div>
    <div class="scene">${pic(w,'xl')}</div>
    <div class="say-opts">${opts.map((o,i) => `<div class="say-row"><button class="spk hint small" data-hear="${i}" aria-label="きく">${SPK}</button><button class="say-opt kana" data-i="${i}">${o.k}</button></div>`).join('')}</div>`);
  say('なんと いいますか？');
  view.querySelectorAll('[data-hear]').forEach(b => b.onclick = () => say(opts[+b.dataset.hear].k));
  view.querySelectorAll('.say-opt').forEach(b => b.onclick = () => {
    if(locked) return; const o = opts[+b.dataset.i];
    if(o.k === w.k){ locked = true; b.classList.add('right'); sfx.ok(); say(w.k); if(first){ rec(w.k, true); tally(true); addHana(1); } setTimeout(next, 1500); }
    else { b.classList.add('wrong'); b.disabled = true; sfx.no(); shake(b); if(first){ first = false; rec(w.k, false); tally(false); } }
  });
}

function stLearn(){
  const W = L.t.words; let j = 0;
  const draw = (intro) => { const w = W[j];
    h(`${stepsBar()}<div class="prompt">${spk('sp')}<span class="prompt-text">さわって きいて ください</span></div>
      <button class="learn-card" id="lc" aria-label="${w.k}">${pic(w,'xl')}${S.settings.kana || isP() ? `<span class="kana word${isP()?' ph':''}">${w.k}</span>` : ''}</button>
      <div class="mean-row"><button class="qbtn" id="qm" aria-label="Show meaning" aria-expanded="false">?</button><span class="meaning" id="mean" hidden>${w.en}</span></div>
      <div class="nav-row"><button class="btn" id="pv" aria-label="まえ" ${j===0?'disabled':''}>◀</button><span class="count">${j+1} / ${W.length}</span><button class="btn primary" id="nx" aria-label="つぎ">${j===W.length-1?'つぎへ ▶':'▶'}</button></div>`);
    say(intro ? ['さわって きいて ください', w.k] : w.k);
    $('#lc').onclick = () => { say(w.k); bump($('#lc')); };
    $('#sp').onclick = () => say(w.k);
    $('#qm').onclick = () => { const m = $('#mean'); m.hidden = !m.hidden; $('#qm').setAttribute('aria-expanded', String(!m.hidden)); sfx.tap(); };
    $('#pv').onclick = () => { if(j > 0){ j--; draw(); } };
    $('#nx').onclick = () => { if(j < W.length-1){ j++; draw(); } else next(); };
  };
  draw(true);
}

function stListen(s){
  const w = s.w, opts = options(w); let first = true, locked = false;
  h(`${stepsBar()}<div class="prompt">${spk('sp')}<span class="prompt-text">どれですか？</span></div>
    <div class="choices${isP() ? ' wide' : ''}">${opts.map((o,i) => `<button class="choice" data-i="${i}" aria-label="${o.k}">${pic(o,'l')}</button>`).join('')}</div>`);
  say(['どれですか？', w.k]);
  $('#sp').onclick = () => say(w.k);
  view.querySelectorAll('.choice').forEach(b => b.onclick = () => {
    if(locked) return; const o = opts[+b.dataset.i];
    if(o.k === w.k){ locked = true; b.classList.add('right'); sfx.ok(); say(w.k); if(first){ rec(w.k, true); tally(true); addHana(1); } setTimeout(next, 1100); }
    else { b.classList.add('wrong'); b.disabled = true; sfx.no(); shake(b); say(o.k); if(first){ first = false; rec(w.k, false); tally(false); } }
  });
}

function stRead(s){
  const w = s.w, opts = options(w); let first = true, hinted = false, locked = false;
  h(`${stepsBar()}<div class="prompt">${spk('sp','hint')}<span class="kana read-word${isP()?' ph':''}">${w.k}</span></div>
    <p class="sub">よんで えらんで ください</p>
    <div class="choices${isP() ? ' wide' : ''}">${opts.map((o,i) => `<button class="choice" data-i="${i}" aria-label="${o.k}">${pic(o,'l')}</button>`).join('')}</div>`);
  say('よんで えらんで ください');
  $('#sp').onclick = () => { hinted = true; say(w.k); };
  view.querySelectorAll('.choice').forEach(b => b.onclick = () => {
    if(locked) return; const o = opts[+b.dataset.i];
    if(o.k === w.k){ locked = true; b.classList.add('right'); sfx.ok(); say(w.k); if(first){ rec(w.k, !hinted); tally(!hinted); if(!hinted) addHana(1); } setTimeout(next, 1100); }
    else { b.classList.add('wrong'); b.disabled = true; sfx.no(); shake(b); say(o.k); if(first){ first = false; rec(w.k, false); tally(false); } }
  });
}

function stMatch(){
  const ws = shuffle(L.t.words).slice(0,6);
  const cards = shuffle([...ws.map(w => ({w, kind:'p'})), ...ws.map(w => ({w, kind:'k'}))]);
  let open = [], matched = 0, busy = false;
  h(`${stepsBar()}<div class="prompt"><span class="prompt-text">おなじ ものを みつけましょう</span></div>
    <div class="mgrid">${cards.map((c,i) => `<button class="mcard" data-i="${i}" aria-label="カード ${i+1}"><span class="back">${hanamaru(46)}</span><span class="face">${c.kind==='p' ? pic(c.w,'s') : `<span class="kana mword">${c.w.k}</span>`}</span></button>`).join('')}</div>`);
  say('おなじ ものを みつけましょう');
  const els = [...view.querySelectorAll('.mcard')];
  els.forEach((el,i) => el.onclick = () => {
    if(busy || el.classList.contains('up')) return;
    el.classList.add('up'); say(cards[i].w.k); open.push(i);
    if(open.length === 2){
      const [a,b] = open; open = [];
      if(cards[a].w.k === cards[b].w.k){ els[a].classList.add('got'); els[b].classList.add('got'); sfx.ok(); matched++;
        if(matched === ws.length){ addHana(2); setTimeout(next, 1200); } }
      else { busy = true; setTimeout(() => { els[a].classList.remove('up'); els[b].classList.remove('up'); busy = false; }, 1000); }
    }
  });
}

function stTalk(){
  const ws = shuffle(L.t.words).slice(0,3); let j = 0;
  if(isP()){
    const drawP = () => { if(j >= ws.length) return next(); const w = ws[j];
      h(`${stepsBar()}<div class="prompt"><span class="prompt-text">まねして いって みましょう！</span></div>
        <div class="talk-card">${pic(w,'xl')}<span class="kana word ph">${w.k}</span>
          <div class="rec-row"><button class="btn round" id="hear" aria-label="きく">${SPK}</button>${canRecord() ? `<button class="btn round mic" id="mic" aria-label="ろくおん">${MIC}</button><button class="btn round me" id="me" aria-label="じぶんの こえ" hidden>${EAR}</button>` : ''}</div>
          <p class="grown-up">Grown-up: let them listen, then say it back together.${canRecord() ? ' The microphone records them so they can hear themselves.' : ''} Tap <b>いえました！</b> when they say it. <br>Meaning: <b>${w.en}</b></p>
        </div>
        <div class="nav-row"><button class="btn" id="skip">つぎ ▶</button><button class="btn primary" id="said">いえました！</button></div>`);
      say(j === 0 ? ['まねして いって みましょう', w.k] : w.k);
      $('#hear').onclick = () => say(w.k);
      if(canRecord()) bindRecorder($('#mic'), $('#me'));
      $('#skip').onclick = () => { j++; drawP(); };
      $('#said').onclick = () => { stopRecorder(); sfx.ok(); rec(w.k, true); tally(true); addHana(1); j++; setTimeout(drawP, 450); };
      $('#skip').onclick = () => { stopRecorder(); j++; drawP(); };
    };
    return drawP();
  }
  const draw = () => { if(j >= ws.length) return next(); const w = ws[j];
    h(`${stepsBar()}<div class="prompt"><span class="prompt-text">ママや パパと いって みましょう！</span></div>
      <div class="talk-card">${pic(w,'xl')}
        <p class="grown-up">Grown-up: point and ask <b class="kana">これは なんですか？</b> Tap <b>いえました！</b> when they say it in Japanese.<br>Answer: <b class="kana">${w.k}</b> <button class="linkish" id="hear">hear it</button></p>
      </div>
      <div class="nav-row"><button class="btn" id="skip">つぎ ▶</button><button class="btn primary" id="said">いえました！</button></div>`);
    $('#hear').onclick = () => say(w.k);
    $('#skip').onclick = () => { j++; draw(); };
    $('#said').onclick = () => { sfx.ok(); rec(w.k, true); tally(true); addHana(1); j++; setTimeout(draw, 450); };
  };
  say('ママや パパと いって みましょう'); draw();
}

function finish(){
  const t = L.t; S.themes[t.id] = (S.themes[t.id]||0) + 1;
  finishScreen(t.id, starsFor(L.ok, L.n), L.earned, L.was, () => { prevScreen = 'lesson'; lesson(t.id); });
}
/* The end of any journey stop (a topic lesson or a kana row): hanko, 1-3 はなまる, then back to the map, where the
   train moves on if this stop was done for the first time. */
function finishScreen(id, stars, earned, was, again){
  S.stars[id] = Math.max(S.stars[id] || 0, stars); save();
  const i = STOPS.findIndex(x => x.id === id);
  if(!was && i >= 0 && STOPS.slice(0, i).every(x => stopDone(x.id))) ARRIVE = {from:i};
  h(`<div class="finish"><div class="stamp-wrap">${hanko()}</div>
    <div class="fstars">${[1,2,3].map(n => `<span class="${n <= stars ? 'on' : ''}" style="--d:${n*.18}s">${hanamaru(54)}</span>`).join('')}</div>
    <p class="earned">${hanamaru(30)}<span>+${earned}</span></p>
    <div class="nav-row center"><button class="btn" id="again">もういちど</button><button class="btn primary" id="onward">つぎ ▶</button></div></div>`);
  $('#again').onclick = again; $('#onward').onclick = () => { sfx.tap(); go('home'); };
  sfx.win(); say('よく できました！'); confetti(); setTimeout(checkStickers, 1500);
}

let script = 'hira';
function kanaGrid(arg){
  if(arg) script = arg;
  const kata = script === 'kata', rows = kata ? KATA_ROWS : KANA_ROWS, list = kata ? KATA : KANA;
  h(`<h1 class="screen-title">かく</h1>
    <div class="seg" role="tablist"><button role="tab" class="seg-btn ${kata?'':'on'}" data-s="hira" aria-selected="${!kata}">ひらがな</button><button role="tab" class="seg-btn ${kata?'on':''}" data-s="kata" aria-selected="${kata}">カタカナ</button></div>
    <p class="sub">${doneIn(list)} / 46</p>
    <div class="kgrid" aria-label="${kata ? 'カタカナ' : 'ひらがな'}">${rows.map(r => [...r].map(c => c === '・' ? '<span class="kcell blank"></span>' :
      `<button class="kcell ${S.kana[c]?'done':''}" data-k="${c}" aria-label="${c}"><span class="kana">${c}</span>${S.kana[c] ? `<span class="kmark">${hanamaru(20)}</span>` : ''}</button>`).join('')).join('')}</div>`, 'wide');
  view.querySelectorAll('.kcell[data-k]').forEach(b => b.onclick = () => { sfx.tap(); go('trace', b.dataset.k); });
  view.querySelectorAll('.seg-btn').forEach(b => b.onclick = () => { sfx.tap(); go('kana', b.dataset.s); });
  say([kata ? 'カタカナ' : 'ひらがな', 'どれを かきますか？']);
}

/* A kana row on the journey: trace each kana of the row in turn (RS = the row session). */
let RS = null;
function startRow(id){ RS = {id, chars:rowChars(id), j:0, fails:0, earned:0, was:stopDone(id)}; go('trace', RS.chars[0]); }
function finishRow(){ const r = RS; RS = null; current = 'done';
  finishScreen(r.id, r.fails === 0 ? 3 : r.fails <= 2 ? 2 : 1, r.earned, r.was, () => startRow(r.id)); }
/* ---------- writing a kana: watch, then write stroke by stroke ----------
   The correct strokes come from KanjiVG (STROKE_D, viewBox 0 0 109 109). First time: the strokes animate in order,
   numbered, while the coach says "かきじゅんを みましょう". Then the child writes one stroke at a time: a green start
   dot and arrow show the next stroke. Each stroke is compared with the expected one (shape, start, direction, order):
   right → it snaps into clean ink; drawn backwards → "むきが ちがいます"; a later stroke first → "じゅんばんが
   ちがいます"; otherwise "もう いちど かきましょう". After a mistake the correct stroke replays. Under the box:
   2-3 example words with the kana highlighted (tap to hear). */
const KV = 109, PAD = 4;                         // KanjiVG units; the masu box adds a margin so its border is never cut
const NPTS = 24, OK_DIST = .16;                  // points compared per stroke; accepted mean distance (share of the box)
function resample(pts, n = NPTS){
  if(pts.length < 2) return Array(n).fill(pts[0] || [0, 0]);
  const L = [0]; for(let i = 1; i < pts.length; i++) L.push(L[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
  const tot = L[L.length-1] || 1, out = []; let j = 0;
  for(let i = 0; i < n; i++){ const t = tot * i / (n-1); while(j < L.length-2 && L[j+1] < t) j++;
    const seg = (L[j+1] - L[j]) || 1, f = Math.min(1, Math.max(0, (t - L[j]) / seg));
    out.push([pts[j][0] + (pts[j+1][0]-pts[j][0])*f, pts[j][1] + (pts[j+1][1]-pts[j][1])*f]); }
  return out; }
const meanDist = (a, b) => a.reduce((s, p, i) => s + Math.hypot(p[0]-b[i][0], p[1]-b[i][1]), 0) / a.length;
const kwHTML = (w, k) => esc(w).split(k).join(`<b>${k}</b>`);
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function trace(k){
  markDay();
  if(RS && RS.chars[RS.j] !== k) RS = null;
  const LIST = KATA.includes(k) ? KATA : KANA; script = LIST === KATA ? 'kata' : 'hira';
  const idx = LIST.indexOf(k), D = STROKE_D[k] || [], n = D.length || STROKES[k] || 1, words = KANA_WORDS[k] || [];
  const firstTime = !S.kana[k];
  h(`${RS ? `<div class="row-dots" aria-label="${RS.j+1} / ${RS.chars.length}">${RS.chars.map((c,i) => `<span class="kana${i < RS.j ? ' done' : i === RS.j ? ' now' : ''}">${c}</span>`).join('')}</div>` : ''}
    <div class="trace-top"><button class="icon-btn" id="tp" aria-label="まえ" ${idx===0||RS?'disabled':''}>◀</button><span class="prompt-text">なぞって かきましょう</span><button class="icon-btn" id="tn" aria-label="つぎ" ${idx===LIST.length-1||RS?'disabled':''}>▶</button></div>
    <div class="masu-wrap" id="mw">
      <svg class="masu" id="msvg" viewBox="${-PAD} ${-PAD} ${KV+2*PAD} ${KV+2*PAD}" role="img" aria-label="${k}">
        <rect class="mbox" x="${-PAD/2}" y="${-PAD/2}" width="${KV+PAD}" height="${KV+PAD}" rx="7"/>
        <path class="mguide" d="M${KV/2} ${-PAD/2}V${KV+PAD/2}M${-PAD/2} ${KV/2}H${KV+PAD/2}"/>
        <g id="gfaint">${D.map(d => `<path class="sg" d="${d}"/>`).join('')}</g>
        <g id="gink"></g><g id="gflash"></g><g id="ghint"></g></svg>
      <canvas id="masu" aria-hidden="true"></canvas>
      <div class="tstamp" id="tstamp" hidden>${hanko()}</div></div>
    <div class="stroke-row" id="srow"><span class="kana">${n}</span><span>かいで かきましょう</span><span class="sdots" id="sdots">${'<i></i>'.repeat(n)}</span></div>
    ${words.length ? `<div class="kwords">${words.map(([w,e]) => `<button class="kw" data-w="${esc(w)}"><span class="emo">${e}</span><span class="kana">${kwHTML(w, k)}</span></button>`).join('')}</div>` : ''}
    ${PAIR[k] ? `<p class="pair">ひらがな <button class="pair-chip kana" id="pairBtn">${PAIR[k]}</button> と おなじ おとです</p>` : ''}
    <div class="nav-row tnav"><button class="btn round" id="tsay" aria-label="きく">${SPK}</button><button class="btn" id="twatch" aria-label="かきじゅんを みる">▶ かきじゅん</button><button class="btn" id="tclear">けします</button><button class="btn primary" id="tnext" hidden>つぎ ▶</button></div>`);
  $('#tp').onclick = () => go('trace', LIST[idx-1]);
  $('#tn').onclick = () => go('trace', LIST[idx+1]);
  if(PAIR[k]) $('#pairBtn').onclick = () => say(PAIR[k]);
  view.querySelectorAll('.kw').forEach(b => b.onclick = () => { say(b.dataset.w); bump(b); });
  $('#tsay').onclick = () => say(k);

  const svg = $('#msvg'), faint = [...svg.querySelectorAll('#gfaint path')], ink = $('#gink'), flash = $('#gflash'), hint = $('#ghint');
  // the expected strokes as point lists (0..1 of the KanjiVG box)
  const EXP = faint.map(p => { const L = p.getTotalLength(), pts = [];
    for(let i = 0; i < NPTS; i++){ const q = p.getPointAtLength(L * i / (NPTS-1)); pts.push([q.x / KV, q.y / KV]); } return pts; });
  let cur = 0, fails = 0, failsHere = 0, busy = false, done = false;

  const showHint = () => { if(done || !EXP[cur]){ hint.innerHTML = ''; return; }
    const a = EXP[cur][0], b = EXP[cur][Math.min(5, NPTS-1)], ang = Math.atan2(b[1]-a[1], b[0]-a[0]);
    const x = a[0]*KV, y = a[1]*KV, ax = x + Math.cos(ang)*13, ay = y + Math.sin(ang)*13;
    hint.innerHTML = `<path class="harrow" d="M${x} ${y}L${ax} ${ay}"/><path class="harrowh" d="M${ax} ${ay}l${Math.cos(ang+2.5)*5} ${Math.sin(ang+2.5)*5}M${ax} ${ay}l${Math.cos(ang-2.5)*5} ${Math.sin(ang-2.5)*5}"/>
      <circle class="hdot" cx="${x}" cy="${y}" r="5.5"/><text class="hnum" x="${x}" y="${y+2.6}">${cur+1}</text>`; };
  const dots = () => [...$('#sdots').children].forEach((el, i) => el.classList.toggle('on', i < cur));
  const drawStroke = (layer, i, cls, ms) => new Promise(res => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', D[i]); p.setAttribute('class', cls); layer.appendChild(p);
    const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = reduce ? 0 : L;
    if(reduce || !ms) { p.style.strokeDashoffset = 0; return res(p); }
    const an = p.animate([{strokeDashoffset:L},{strokeDashoffset:0}], {duration:ms, easing:'ease-in-out', fill:'forwards'}); an.onfinish = () => res(p); });
  const watch = async () => { if(busy) return; busy = true; hint.innerHTML = ''; flash.innerHTML = '';
    for(let i = 0; i < D.length; i++){ if(!svg.isConnected) return;
      const p = await drawStroke(flash, i, 'sanim', 520 + i*0);
      const s0 = EXP[i][0]; flash.insertAdjacentHTML('beforeend', `<circle class="anum-bg" cx="${s0[0]*KV}" cy="${s0[1]*KV}" r="5"/><text class="anum" x="${s0[0]*KV}" y="${s0[1]*KV+2.4}">${i+1}</text>`);
      await new Promise(r => setTimeout(r, 160)); }
    await new Promise(r => setTimeout(r, 650)); if(!svg.isConnected) return;
    flash.innerHTML = ''; busy = false; showHint(); };
  const replayOne = async i => { flash.innerHTML = ''; await drawStroke(flash, i, 'sflash', 600); setTimeout(() => { if(flash.isConnected) flash.innerHTML = ''; }, 700); };

  // drawing on the overlay canvas
  const cv = $('#masu'), wrap = $('#mw'), size = Math.floor(wrap.getBoundingClientRect().width), dpr = devicePixelRatio || 1;
  cv.width = size*dpr; cv.height = size*dpr; cv.style.width = cv.style.height = size + 'px';
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const unit = size / (KV + 2*PAD);                                   // pixels per KanjiVG unit
  const toK = e => { const r = cv.getBoundingClientRect(); return [((e.clientX-r.left)/r.width*(KV+2*PAD) - PAD) / KV, ((e.clientY-r.top)/r.height*(KV+2*PAD) - PAD) / KV]; };
  let line = null;
  const paintLine = () => { ctx.clearRect(0,0,size,size); if(!line || line.length < 1) return;
    ctx.strokeStyle = '#1E2A45'; ctx.lineWidth = 6.5*unit; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); line.forEach((p, i) => { const x = (p[0]*KV + PAD)*unit, y = (p[1]*KV + PAD)*unit; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
  cv.onpointerdown = e => { if(done || busy) return; e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(_){} line = [toK(e)]; paintLine(); };
  cv.onpointermove = e => { if(!line) return; line.push(toK(e)); paintLine(); };
  cv.onpointerup = cv.onpointercancel = () => { if(!line) return; const pts = line; line = null; judge(pts); };

  const judge = pts => {
    const len = pts.reduce((s, p, i) => i ? s + Math.hypot(p[0]-pts[i-1][0], p[1]-pts[i-1][1]) : 0, 0);
    if(len < .03){ ctx.clearRect(0,0,size,size); return; }            // a tap, not a stroke
    const u = resample(pts), dF = j => meanDist(u, EXP[j]), dR = j => meanDist(u, [...EXP[j]].reverse());
    const here = dF(cur);
    ctx.clearRect(0,0,size,size);
    if(here <= OK_DIST){
      drawStroke(ink, cur, 'sink', 160); cur++; failsHere = 0; dots(); sfx.tap();
      if(cur >= D.length) return finished();
      showHint(); return; }
    fails++; failsHere++; if(RS) RS.fails++;
    let msg = 'もう いちど かきましょう';
    if(dR(cur) <= OK_DIST) msg = 'むきが ちがいます';
    else if(EXP.some((_, j) => j > cur && dF(j) <= OK_DIST)) msg = 'じゅんばんが ちがいます';
    sfx.no(); shake(wrap); say(msg); replayOne(cur);
  };
  const finished = () => {
    done = true; hint.innerHTML = '';
    const first = !S.kana[k]; S.kana[k] = (S.kana[k]||0) + 1; save();
    $('#tstamp').hidden = false; sfx.win(); say('よく できました！'); confetti(); addHana(first ? 2 : 1); if(RS) RS.earned += first ? 2 : 1;
    const b = $('#tnext'); b.hidden = false; $('#tclear').hidden = true;
    if(RS){ const last = RS.j >= RS.chars.length-1; b.textContent = last ? 'できました！' : 'つぎ ▶';
      b.onclick = () => { if(last) return finishRow(); RS.j++; go('trace', RS.chars[RS.j]); }; }
    else { b.textContent = idx < LIST.length-1 ? 'つぎ ▶' : 'おわり';
      b.onclick = () => idx < LIST.length-1 ? go('trace', LIST[idx+1]) : go('kana'); }
  };
  $('#tclear').onclick = () => { ink.innerHTML = ''; flash.innerHTML = ''; cur = 0; failsHere = 0; done = false; ctx.clearRect(0,0,size,size); dots(); showHint(); };
  $('#twatch').onclick = () => { say('かきじゅんを みましょう'); ink.innerHTML = ''; cur = 0; dots(); watch(); };

  if(firstTime && D.length){ say(!RS || RS.j === 0 ? ['かきじゅんを みましょう', k] : [k]); setTimeout(() => { if(svg.isConnected) watch(); }, reduce ? 0 : 900); }
  else { say(!RS || RS.j === 0 ? ['なぞって かきましょう', k] : k); showHint(); }
}

function stickers(){
  const n = STICKERS.filter(s => S.stickers[s.id]).length;
  h(`<h1 class="screen-title">シール</h1><p class="sub">${n} / ${STICKERS.length}</p>
    <div class="sgrid">${STICKERS.map(s => `<div class="sticker ${S.stickers[s.id]?'':'locked'}"><span class="emo" aria-hidden="true">${s.e}</span><small>${s.label}</small></div>`).join('')}</div>`);
  say('シール');
}

/* ---------- hear yourself ----------
   In phrase practice the child can record their try (up to 6 s) and hear it right away, then the model again. */
const MIC = '<span class="emo">🎤</span>', EAR = '<span class="emo">👂</span>';
let REC = null;
const canRecord = () => !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
function stopRecorder(){ if(!REC) return; clearTimeout(REC.t); try{ if(REC.mr.state !== 'inactive') REC.mr.stop(); }catch(e){} }
function bindRecorder(mic, me){ let url = null; const out = new Audio();
  const play = () => { if(!url) return; try{ player.pause(); }catch(e){} out.src = url; out.play().catch(() => {}); bump(me); };
  me.onclick = play;
  mic.onclick = async () => {
    if(REC){ stopRecorder(); return; }
    try{ player.pause(); }catch(e){}
    let stream; try{ stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}}); }catch(e){ sfx.no(); shake(mic); return; }
    if(!mic.isConnected){ stream.getTracks().forEach(t => t.stop()); return; }
    const chunks = [], mr = new MediaRecorder(stream);
    REC = {mr, t:setTimeout(stopRecorder, 6000)}; mic.classList.add('on');
    mr.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); REC = null; mic.classList.remove('on');
      if(!mic.isConnected || !chunks.length) return;
      if(url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob(chunks, {type:mr.mimeType || 'audio/mp4'}));
      me.hidden = false; play(); };
    mr.start(); sfx.tap();
  };
}

/* ---------- grown-ups ---------- */
function modal(html){ const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(o); return o; }
function openGate(){
  const a = 11 + Math.floor(Math.random()*9), b = 3 + Math.floor(Math.random()*4);
  const o = modal(`<h2>For grown-ups</h2><p>Answer to open settings and progress.</p><label class="gate-q" for="gateIn">${a} × ${b} =</label>
    <input id="gateIn" inputmode="numeric" autocomplete="off"><p class="warn" id="gateErr" hidden>Not quite. Try again.</p>
    <div class="row"><button class="btn" id="gX">Cancel</button><button class="btn primary" id="gOK">Open</button></div>`);
  const inp = o.querySelector('#gateIn'); setTimeout(() => inp.focus(), 50);
  const ok = () => { if(parseInt(inp.value,10) === a*b){ o.remove(); go('parent'); } else { o.querySelector('#gateErr').hidden = false; inp.value = ''; inp.focus(); } };
  o.querySelector('#gOK').onclick = ok; inp.onkeydown = e => { if(e.key === 'Enter') ok(); };
  o.querySelector('#gX').onclick = () => o.remove();
  o.onclick = e => { if(e.target === o) o.remove(); };
}

function parent(){
  const learned = ALLW.filter(w => mastered(w.k)).length;
  const learnedP = ALLP.filter(w => mastered(w.k)).length;
  const topicRow = t => { const m = t.words.filter(w => mastered(w.k)).length; return `<div class="trow"><span class="emo">${t.icon}</span><span class="kana" style="font-size:18px">${t.name}</span><div class="bar-track"><div class="bar-fill" style="width:${m/t.words.length*100}%"></div></div><small>${m}/${t.words.length} · ${S.themes[t.id]||0} lessons</small></div>`; };
  const weak = [...ALLW, ...ALLP].filter(w => { const s = S.words[w.k]; return s && s.miss > 0 && s.streak < 2; }).sort((a,b) => S.words[b.k].miss - S.words[a.k].miss).slice(0,14);
  h(`<div class="parent">
    <h1>Grown-ups</h1>
    <p class="lede">Progress is saved in this browser on this device only.</p>
    <div class="stats">
      <div class="stat"><b>${S.hana}</b><span>Hanamaru</span></div>
      <div class="stat"><b>${streak()}</b><span>Day streak</span></div>
      <div class="stat"><b>${learned}<small style="font-size:16px;color:var(--muted)">/${ALLW.length}</small></b><span>Words learned</span></div>
      <div class="stat"><b>${learnedP}<small style="font-size:16px;color:var(--muted)">/${ALLP.length}</small></b><span>Phrases learned</span></div>
      <div class="stat"><b>${kanaDone()}<small style="font-size:16px;color:var(--muted)">/46</small></b><span>Hiragana traced</span></div>
      <div class="stat"><b>${kataDone()}<small style="font-size:16px;color:var(--muted)">/46</small></b><span>Katakana traced</span></div>
      <div class="stat"><b>${S.days.length}</b><span>Days practiced</span></div>
      <div class="stat"><b>${STOPS.filter(x => stopDone(x.id)).length}<small style="font-size:16px;color:var(--muted)">/${STOPS.length}</small></b><span>Journey stops</span></div>
    </div>
    <p class="note">A word counts as learned after 3 correct answers, with the last 2 in a row. Answers after using the hint button don’t count.</p>

    <h2>Word topics</h2>
    ${THEMES.map(topicRow).join('')}
    <h2>Phrase topics</h2>
    ${PHRASES.map(topicRow).join('')}

    <h2>Needs practice</h2>
    ${weak.length ? `<div class="chips">${weak.map(w => `<button class="chip kana" data-say="${w.k}">${w.k} <small>✕${S.words[w.k].miss}</small></button>`).join('')}</div><p class="note">Tap a word to hear it. Try using these at home this week.</p>`
      : `<p class="empty">Nothing yet. Words show up here after your child misses them in a game.</p>`}

    <h2>Word and phrase list</h2>
    <p class="note">Everything in the app with romaji and meaning, for any grown-up helping out. Your child sees only Japanese, pictures, and the meaning when they tap ? on a learning card.</p>
    ${ALL.map(t => `<details><summary>${t.icon} <span class="kana">${t.name}</span> <small class="note">${t.kind === 'phrase' ? 'phrases' : 'words'}</small></summary>${t.words.map(w => `<div class="phrase"><button class="chip" data-say="${w.k}" aria-label="Hear">▶</button><span><span class="kana">${w.k}</span> <span class="ro">${romaji(w.k)}</span></span><span class="en">${w.en}</span></div>`).join('')}</details>`).join('')}

    <h2>Talk together</h2>
    <p class="note">The app teaches words. Hearing and using them with you is what turns them into speech. A few lines to use during the day:</p>
    ${THEMES.map(t => `<details><summary>${t.icon} <span class="kana">${t.name}</span></summary>${TALK[t.id].map(([jp,en]) => `<div class="phrase"><button class="chip" data-say="${jp}" aria-label="Hear">▶</button><span class="kana">${jp}</span><span class="en">${en}</span></div>`).join('')}</details>`).join('')}

    <h2>Settings</h2>
    <div class="set"><label for="setKana">Show hiragana under pictures</label><input type="checkbox" id="setKana" ${S.settings.kana?'checked':''}></div>
    <div class="set"><span>Voice speed (slow is a real slow recording, for learning pronunciation; your child has the same bar in every lesson)</span>${speedBar()}</div>
    <div class="set"><label for="setSfx">Sound effects</label><input type="checkbox" id="setSfx" ${S.settings.sfx?'checked':''}></div>
    <div class="set"><span>Voice: recorded Japanese audio, __VOICE_CREDIT__. Anything without a recording uses the device voice.</span><button class="small-btn" id="testV">Test voice</button></div>
    <div class="set"><span>Progress file: move progress to another device, or keep a copy</span><span class="bk"><button class="small-btn" id="bkSave">Save</button><label class="small-btn">Load<input type="file" id="bkLoad" accept=".json,application/json" hidden></label></span></div>
    <div class="set"><span id="offRow">${offlineText()}</span></div>
    <div class="set"><span>Stroke order: KanjiVG (kanjivg.tagaini.net), © Ulrich Apel, CC BY-SA 3.0.</span></div>
    <div class="set"><span>Reset all progress</span><button class="small-btn danger" id="reset">Reset</button></div>
  </div>`);
  view.querySelectorAll('[data-say]').forEach(b => b.onclick = () => say(b.dataset.say));
  $('#setKana').onchange = e => { S.settings.kana = e.target.checked; save(); };
  $('#setSfx').onchange = e => { S.settings.sfx = e.target.checked; save(); sfx.ok(); };
  $('#testV').onclick = () => say('こんにちは！ いっしょに にほんごを べんきょう しましょう。');
  /* backup: progress is per device, so a file moves it (share sheet on iPhone/iPad, a download elsewhere) */
  const dl = f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
  $('#bkSave').onclick = () => { const f = new File([JSON.stringify({app:'kidlingo', v:1, at:new Date().toISOString(), state:S})], `kidlingo-progress-${fmt(new Date())}.json`, {type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[f]})) navigator.share({files:[f], title:'Kidlingo progress'}).catch(e => { if(!e || e.name !== 'AbortError') dl(f); }); else dl(f); };
  $('#bkLoad').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if(!f) return; let d = null; try{ d = JSON.parse(await f.text()); }catch(_){}
    if(!d || d.app !== 'kidlingo' || !d.state){ toast('<span>That isn’t a Kidlingo progress file</span>'); return; }
    const when = new Date(d.at).toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'});
    const o = modal(`<h2>Load progress?</h2><p>This replaces the progress on this device with the file from ${when}.</p><div class="row"><button class="btn" id="bkNo">Cancel</button><button class="btn primary" id="bkYes">Load</button></div>`);
    o.querySelector('#bkNo').onclick = () => o.remove();
    o.querySelector('#bkYes').onclick = () => { o.remove(); S = Object.assign(fresh(), d.state, {settings:Object.assign({...DEF_SET}, d.state.settings||{})}); save(); go('parent'); toast('<span>Progress loaded</span>'); }; };
  $('#soundInfo') && ($('#soundInfo').onclick = soundHelp);
  let armed = false;
  $('#reset').onclick = e => { const b = e.currentTarget;
    if(!armed){ armed = true; b.textContent = 'Tap again to erase everything'; setTimeout(() => { armed = false; if(b.isConnected) b.textContent = 'Reset'; }, 4000); return; }
    const keep = S.settings; S = fresh(); S.settings = keep; save(); go('parent'); toast('<span>Progress reset</span>'); };
}

/* ---------- boot ---------- */
$('#hmSlot').innerHTML = hanamaru(30);
$('#homeBtn').onclick = () => { sfx.tap(); go(up()); };
$('#lockBtn').onclick = openGate;
/* the speed bar: one handler for every bar on the page; moving it replays the last word at the new speed */
view.addEventListener('input', e => { if(!e.target.classList.contains('spd')) return;
  S.settings.speed = +e.target.value; save(); sfx.tap(); if(lastSaid) say(lastSaid); else say('こんにちは'); });
$('#soundWarn').onclick = soundHelp;
go('home');
/* offline: sw.js keeps a copy of the app (and its fonts) on the device after the first visit */
let OFFLINE = {done:0, total:0, on:false};
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  navigator.serviceWorker.addEventListener('message', e => { if(e.data && e.data.type === 'clips'){ OFFLINE = {...OFFLINE, ...e.data}; const el = $('#offRow'); if(el) el.textContent = offlineText(); } });
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(reg => { OFFLINE.on = true;
    const urls = [...new Set(Object.values(CLIPS).filter(u => !u.startsWith('data:')))]; OFFLINE.total = urls.length;
    if(reg.active && urls.length) reg.active.postMessage({type:'save-clips', urls}); }).catch(() => {});
}
function offlineText(){ const o = OFFLINE; if(!o.on) return 'Offline copy: not available in this browser.';
  return o.total && o.done >= o.total ? `Ready offline · all ${o.total} voice clips saved on this device` : `Saving voice clips for offline… ${o.total ? Math.round(o.done / o.total * 100) : 0}%`; }
