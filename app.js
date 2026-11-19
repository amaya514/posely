import { GUIDES, CATS } from './guides.js';
import { cutout } from './cutout.js';
import { loadTracker, toPoints, compare } from './match.js';

const $ = id => document.getElementById(id);
const CUT_V = 3;
let framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }

const S = { cat: 'All', pose: null, custom: [], stream: null, facing: 'environment', timer: 0, photos: [], flip: 1, scale: 1,
  pos: { x: 50, y: 56 }, view: 'poses', vIndex: 0, match: true, auto: false, flash: false, tips: true, step: 0 };
const LIB = {}; // id -> { status: 'missing' | 'loading' | 'ready', src, ar, refs, key }
window.__posely = { S, LIB };

/* ---------- On-device storage ---------- */
const DB = { db: null };
function dbOpen() {
  return new Promise(res => {
    try {
      const r = indexedDB.open('posely', 3);
      r.onupgradeneeded = () => { const d = r.result; for (const s of ['photos', 'guides', 'renders']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); };
      r.onsuccess = () => { DB.db = r.result; res(true); };
      r.onerror = () => res(false); r.onblocked = () => res(false);
    } catch (e) { res(false); }
  });
}
const dbReq = (store, mode, fn) => new Promise(res => {
  if (!DB.db) return res(null);
  try { const q = fn(DB.db.transaction(store, mode).objectStore(store)); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); } catch (e) { res(null); }
});
const dbAll = s => dbReq(s, 'readonly', o => o.getAll()).then(r => r || []);
const dbGet = (s, id) => dbReq(s, 'readonly', o => o.get(id));
function dbPut(store, v, quiet) {
  if (!DB.db) return;
  try { const tx = DB.db.transaction(store, 'readwrite'); tx.objectStore(store).put(v); if (!quiet) tx.onerror = () => toast('Phone storage is full. Delete some photos.'); } catch (e) {}
}
const dbDel = (s, id) => dbReq(s, 'readwrite', o => o.delete(id));
let askedPersist = false;
function keepStorage() { if (askedPersist) return; askedPersist = true; try { navigator.storage?.persist?.().catch(() => {}); } catch (e) {} }

const PREF_KEY = 'posely-prefs';
function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (e) { return {}; } }
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ opacity: +$('opacity').value, timer: S.timer, grid: $('gridlines').classList.contains('on'), match: S.match, auto: S.auto, tips: S.tips })); } catch (e) {} }

/* ---------- Pose pictures ---------- */
async function findImage(g) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const url = `guides/${g.id}.${ext}`;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      if (r.ok) return { url, sig: r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length') || '' };
    } catch (e) {}
  }
  return null;
}
async function prepare(g) {
  LIB[g.id] = { status: 'loading' };
  const found = await findImage(g);
  if (!found) { LIB[g.id] = { status: 'missing' }; return; }
  const key = `guide:${g.id}:${found.sig}:${CUT_V}`;
  const hit = await dbGet('renders', key);
  if (hit) { LIB[g.id] = { status: 'ready', src: hit.src, ar: hit.ar, refs: hit.refs, key }; return; }
  try {
    const c = await cutout(found.url);
    LIB[g.id] = { status: 'ready', src: c.src, ar: c.ar, key };
    dbPut('renders', { id: key, src: c.src, ar: c.ar }, true);
  } catch (e) { console.warn('could not prepare', g.id, e); LIB[g.id] = { status: 'missing' }; }
}
async function loadLibrary() {
  GUIDES.forEach(g => { LIB[g.id] = { status: 'loading' }; });
  renderGrid();
  let i = 0;
  const worker = async () => { while (i < GUIDES.length) { const g = GUIDES[i++]; await prepare(g); updateCard(g); renderProgress(); } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  renderGrid(); renderProgress();
}

// joint positions on the guide picture, for live matching (worked out once, then remembered)
let trackerTs = 0;
const nextTs = () => (trackerTs = Math.max(trackerTs + 1, performance.now()));
async function ensureRefs(entry, store) {
  if (!entry || entry.refs !== undefined || !entry.src) return;
  try {
    const tracker = await loadTracker();
    const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = entry.src; });
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.fillStyle = '#d9d4ce'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0);
    const res = tracker.detectForVideo(c, nextTs());
    entry.refs = (res.landmarks || []).map(l => toPoints(l, c.width, c.height, false)).filter(p => p.ls && p.rs);
    if (store === 'renders' && entry.key) dbPut('renders', { id: entry.key, src: entry.src, ar: entry.ar, refs: entry.refs }, true);
    if (store === 'guides') dbPut('guides', entry, true);
  } catch (e) { /* matching not available here */ }
}

/* ---------- Poses view ---------- */
const all = () => [...GUIDES, ...S.custom];
const entryOf = p => p.cat === 'Mine' ? p : LIB[p.id];
// only show poses (and places) that have a picture
const usable = p => p.cat === 'Mine' || LIB[p.id]?.status !== 'missing';
function renderCats() {
  if (S.cat !== 'All' && !all().some(p => p.cat === S.cat && usable(p))) S.cat = 'All';
  $('cats').innerHTML = CATS.filter(c => c === 'All' || all().some(p => p.cat === c && usable(p))).map(c => `<button class="chip ${c === S.cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
}
function thumbHTML(p) {
  const e = entryOf(p);
  if (e && e.status === 'ready' || p.cat === 'Mine') return `<img src="${e.src}" alt="">`;
  if (e && e.status === 'missing') return `<div class="missingBox">Picture needed<b>guides/${p.id}.png</b></div>`;
  return '<div class="loadingFig"></div>';
}
function cardHTML(p) {
  const e = entryOf(p), missing = e && e.status === 'missing';
  const del = p.cat === 'Mine' ? `<span class="del" role="button" aria-label="Remove ${p.name}" data-del="${p.id}">×</span>` : '';
  const tag = p.cam === 'selfie' ? '<span class="tag">Selfie</span>' : '';
  return `<button class="card${missing ? ' missing' : ''}" data-id="${p.id}"><div class="thumb">${thumbHTML(p)}</div>${tag}<div class="meta"><div class="name">${p.name}</div><div class="cat">${p.cat}</div></div>${del}</button>`;
}
function updateCard(p) { const el = document.querySelector(`.card[data-id="${p.id}"]`); if (!el) return; if (usable(p)) el.outerHTML = cardHTML(p); else el.remove(); }
function renderGrid() {
  const list = (S.cat === 'All' ? all() : all().filter(p => p.cat === S.cat)).filter(usable);
  const loading = GUIDES.some(g => LIB[g.id]?.status === 'loading');
  $('poseGrid').innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty">${loading ? 'Loading poses…' : 'No pose pictures yet. Add them to the guides folder, or use your own pose picture below.'}</div>`;
}
function renderProgress() {
  const ready = GUIDES.filter(g => LIB[g.id]?.status === 'ready').length, done = GUIDES.every(g => LIB[g.id]?.status !== 'loading');
  const el = $('progress');
  el.hidden = true; // pictures still missing are simply not shown
  if (done) renderCats();
  el.innerHTML = `<b>${ready} of ${GUIDES.length} pose pictures added.</b> Make the rest in Gemini with the prompts in PROMPTS.md and save them in the <b>guides</b> folder with the names shown.<div class="bar"><span style="width:${Math.round(ready / GUIDES.length * 100)}%"></span></div>`;
}
$('cats').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; S.cat = b.dataset.c; renderCats(); renderGrid(); };
$('poseGrid').onclick = e => {
  const d = e.target.closest('[data-del]');
  if (d) { e.stopPropagation(); removeGuide(d.dataset.del); return; }
  const c = e.target.closest('.card'); if (!c) return;
  const p = all().find(x => x.id === c.dataset.id), en = p && entryOf(p);
  if (!en || en.status === 'missing') { toast(`Add guides/${c.dataset.id}.png first`); return; }
  if (en.status === 'loading') { toast('Still preparing this pose…'); return; }
  choosePose(p.id);
};
function choosePose(id) {
  const p = all().find(x => x.id === id); if (!p) return;
  S.pose = p; S.scale = 1; S.flip = 1; $('flipBtn').classList.remove('on');
  S.pos = { x: 50, y: p.cam === 'selfie' ? 58 : 56 }; $('size').value = 100;
  if (p.cam) S.facing = p.cam === 'selfie' ? 'user' : 'environment';
  applyGuide(); go('camera');
}
function removeGuide(id) {
  S.custom = S.custom.filter(p => p.id !== id); dbDel('guides', id);
  if (S.pose && S.pose.id === id) S.pose = null;
  if (!S.custom.length && S.cat === 'Mine') S.cat = 'All';
  renderCats(); renderGrid(); toast('Pose removed');
}
$('ownGuide').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    let c;
    try { c = await cutout(r.result); } catch (err) { toast('Could not read that picture'); return; }
    const n = S.custom.length + 1;
    const p = { id: 'mine' + Date.now(), name: 'My pose ' + n, cat: 'Mine', status: 'ready', src: c.src, ar: c.ar, ts: Date.now(),
      steps: ['Line yourself up with the guide', 'Lower the Guide slider to check details'] };
    S.custom.push(p); dbPut('guides', p); keepStorage();
    S.cat = 'Mine'; renderCats(); renderGrid(); choosePose(p.id); toast('Pose saved');
  };
  r.readAsDataURL(f); e.target.value = '';
};

/* ---------- Guide overlay + step tips ---------- */
const guide = $('guide');
let stepTimer = 0;
function applyGuide() {
  const p = S.pose, e = p && entryOf(p);
  if (!p || !e || e.status !== 'ready') { guide.innerHTML = ''; $('stepPill').hidden = true; return; }
  guide.innerHTML = `<img src="${e.src}" alt="">`;
  guide.style.setProperty('--ar', e.ar);
  guide.style.height = p.cam === 'selfie' ? '96%' : (p.cat === 'Couple' || p.cat === 'Friends') ? '70%' : '82%';
  S.step = 0; showStep(); updateGuidePos(); resetMatchUI();
}
function showStep() {
  clearTimeout(stepTimer);
  const steps = S.pose?.steps || [];
  $('stepPill').hidden = !S.tips || !steps.length || S.view !== 'camera';
  $('tipsBtn').classList.toggle('on', S.tips);
  if ($('stepPill').hidden) return;
  $('stepN').textContent = `${S.step + 1}/${steps.length}`;
  $('stepText').textContent = steps[S.step];
  stepTimer = setTimeout(() => { S.step = (S.step + 1) % steps.length; showStep(); }, 3800);
}
$('stepPill').onclick = () => { const n = S.pose?.steps?.length || 1; S.step = (S.step + 1) % n; showStep(); };
$('tipsBtn').onclick = () => { S.tips = !S.tips; savePrefs(); showStep(); };
function updateGuidePos() {
  guide.style.left = S.pos.x + '%'; guide.style.top = S.pos.y + '%';
  guide.style.setProperty('--s', S.scale); guide.style.setProperty('--fx', S.flip);
  guide.style.opacity = $('opacity').value / 100;
}
$('opacity').oninput = updateGuidePos; $('opacity').onchange = savePrefs;
$('size').oninput = e => { S.scale = e.target.value / 100; updateGuidePos(); };
$('flipBtn').onclick = () => { S.flip *= -1; $('flipBtn').classList.toggle('on', S.flip < 0); updateGuidePos(); };
function setGrid(on) { $('gridlines').classList.toggle('on', on); $('gridBtn').classList.toggle('on', on); }
$('gridBtn').onclick = () => { setGrid(!$('gridlines').classList.contains('on')); savePrefs(); };
$('backBtn').onclick = () => go('poses');

const pointers = new Map(); let drag = null, pinch = null;
guide.addEventListener('pointerdown', e => {
  guide.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, px: S.pos.x, py: S.pos.y };
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: S.scale }; drag = null; }
});
guide.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = $('stage').getBoundingClientRect();
  if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; setScale(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); }
  else if (drag) { S.pos.x = Math.min(100, Math.max(0, drag.px + (e.clientX - drag.x) / r.width * 100)); S.pos.y = Math.min(100, Math.max(0, drag.py + (e.clientY - drag.y) / r.height * 100)); updateGuidePos(); }
});
const endPtr = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (pointers.size === 0) drag = null; };
guide.addEventListener('pointerup', endPtr); guide.addEventListener('pointercancel', endPtr);
$('stage').addEventListener('wheel', e => { e.preventDefault(); setScale(S.scale * (e.deltaY < 0 ? 1.06 : 0.94)); }, { passive: false });
function setScale(s) { S.scale = Math.min(1.8, Math.max(0.4, s)); $('size').value = Math.round(S.scale * 100); updateGuidePos(); }

/* ---------- Camera ---------- */
const video = $('video');
async function startCam() {
  stopCam();
  $('nocam').hidden = true;
  if (!navigator.mediaDevices?.getUserMedia) { showNoCam(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: S.facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    if (S.view !== 'camera') { stream.getTracks().forEach(t => t.stop()); return; }
    S.stream = stream;
    video.srcObject = stream;
    video.classList.toggle('mirror', S.facing === 'user');
    await video.play().catch(() => {});
    applyTorch();
    startMatching();
  } catch (err) { showNoCam(err); }
}
function stopCam() { if (S.stream) { S.stream.getTracks().forEach(t => t.stop()); S.stream = null; } stopMatching(); }
function showNoCam(err) {
  $('nocam').hidden = false;
  if (framed) $('nocamMsg').textContent = 'The camera is blocked inside this preview. Open Posely from its own web address (or the installed app) on your phone for the live guide. You can still take a normal photo below.';
  else if (err && err.name === 'NotAllowedError') $('nocamMsg').textContent = 'Camera permission was blocked. Allow camera access for this page in your browser settings, then tap “Try camera again”.';
}
$('retryCam').onclick = startCam;
$('switchBtn').onclick = () => { S.facing = S.facing === 'user' ? 'environment' : 'user'; startCam(); };
function setTimer(t) { S.timer = t; const b = $('timerBadge'); b.hidden = !t; b.textContent = t + 's'; $('timerBtn').classList.toggle('on', !!t); }
$('timerBtn').onclick = () => { setTimer(S.timer === 0 ? 3 : S.timer === 3 ? 10 : 0); savePrefs(); };

// Flash: the phone's torch on the back camera, a bright white screen on the selfie camera.
const torchTrack = () => { const t = S.stream?.getVideoTracks()[0]; try { return t && t.getCapabilities && t.getCapabilities().torch ? t : null; } catch (e) { return null; } };
function applyTorch() { const t = torchTrack(); if (t) t.applyConstraints({ advanced: [{ torch: S.flash && S.facing !== 'user' }] }).catch(() => {}); }
$('flashBtn').onclick = () => {
  S.flash = !S.flash; $('flashBtn').classList.toggle('on', S.flash); applyTorch();
  if (S.flash) toast(S.facing === 'user' ? 'Screen flash on' : torchTrack() ? 'Flash on' : 'This camera has no flash; using screen flash');
};

let shooting = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function shoot(delay) {
  if (shooting) return; shooting = true;
  for (let i = delay; i > 0; i--) { $('countdown').textContent = i; await sleep(1000); }
  $('countdown').textContent = '';
  const screenFlash = S.flash && (S.facing === 'user' || !torchTrack());
  const f = $('flash');
  if (screenFlash) { f.style.transition = 'none'; f.style.opacity = 1; await sleep(250); }
  capture();
  f.style.transition = 'none'; f.style.opacity = screenFlash ? 1 : 0.85;
  requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; });
  shooting = false;
}
$('shutter').onclick = () => { if (!S.stream) { $('fallbackShot').click(); return; } shoot(S.timer); };
function capture() {
  const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
  const sr = $('stage').getBoundingClientRect(), target = sr.width / sr.height;
  let sw = vw, sh = vh;
  if (vw / vh > target) sw = vh * target; else sh = vw / target;
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
  const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
  const g = c.getContext('2d');
  if (S.facing === 'user') { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
  addPhoto(c.toDataURL('image/jpeg', 0.92));
}
$('fallbackShot').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => addPhoto(r.result); r.readAsDataURL(f); e.target.value = '';
};

/* ---------- Live pose matching ---------- */
let tracker = null, raf = 0, lastT = 0, matchedSince = 0, cooldown = 0;
const overlay = $('overlay'), octx = overlay.getContext('2d');
function setMatchBtn() { $('matchBtn').classList.toggle('on', S.match); $('autoBtn').classList.toggle('on', S.auto); $('autoBtn').style.visibility = S.match ? '' : 'hidden'; }
$('matchBtn').onclick = () => { S.match = !S.match; setMatchBtn(); savePrefs(); if (S.match) startMatching(); else stopMatching(); toast(S.match ? 'Live pose matching on' : 'Live pose matching off'); };
$('autoBtn').onclick = () => { S.auto = !S.auto; setMatchBtn(); savePrefs(); toast(S.auto ? 'Auto-shoot when you match the pose' : 'Auto-shoot off'); };
const currentEntry = () => S.pose && entryOf(S.pose);
function resetMatchUI(text) {
  guide.classList.remove('ok'); $('matchBar').classList.remove('ok');
  octx.clearRect(0, 0, overlay.width, overlay.height);
  const can = S.match && S.stream && currentEntry();
  $('matchBar').hidden = !(can || text);
  $('matchPct').textContent = ''; $('matchHint').textContent = text || (can ? (tracker ? 'Get into position' : 'Loading body tracker…') : '');
}
async function startMatching() {
  resetMatchUI();
  if (!S.match || !S.stream || !currentEntry()) return;
  if (!tracker) {
    try { tracker = await loadTracker(); }
    catch (e) { resetMatchUI('Live matching is not available here'); setTimeout(() => { if (!tracker) $('matchBar').hidden = true; }, 3000); return; }
  }
  const en = currentEntry();
  await ensureRefs(en, S.pose.cat === 'Mine' ? 'guides' : 'renders');
  if (!raf) raf = requestAnimationFrame(tick);
}
function stopMatching() { if (raf) cancelAnimationFrame(raf); raf = 0; matchedSince = 0; resetMatchUI(); if (!S.stream) $('matchBar').hidden = true; }
function tick(now) {
  raf = 0;
  if (S.view !== 'camera' || !S.stream || !S.match || !tracker) return;
  raf = requestAnimationFrame(tick);
  if (now - lastT < 90 || video.readyState < 2 || !video.videoWidth) return;
  lastT = now;
  const en = currentEntry();
  if (!en || !en.refs || !en.refs.length) { $('matchBar').hidden = false; $('matchPct').textContent = ''; $('matchHint').textContent = en && en.refs ? 'Live matching can’t read this pose picture' : 'Reading the pose…'; return; }
  let res; try { res = tracker.detectForVideo(video, nextTs()); } catch (e) { return; }
  const vw = video.videoWidth, vh = video.videoHeight, mir = S.facing === 'user';
  const people = (res.landmarks || []).map(l => toPoints(l, vw, vh, mir));
  const out = compare(en.refs, en.ar, S.flip < 0, people, S.pose.cam === 'selfie');
  $('matchBar').hidden = false;
  $('matchBar').classList.toggle('ok', out.matched); guide.classList.toggle('ok', out.matched);
  $('matchPct').textContent = out.pct ? out.pct + '%' : '';
  $('matchHint').textContent = out.hint;
  drawSegs(out.segs, vw, vh);
  if (out.matched) {
    if (!matchedSince) matchedSince = now;
    if (S.auto && !shooting && now - matchedSince > 1000 && now > cooldown) { cooldown = now + 3000; matchedSince = 0; shoot(0); }
  } else matchedSince = 0;
}
function drawSegs(segs, vw, vh) {
  const W = overlay.clientWidth, Hh = overlay.clientHeight;
  if (overlay.width !== W * 2) { overlay.width = W * 2; overlay.height = Hh * 2; }
  octx.setTransform(2, 0, 0, 2, 0, 0); octx.clearRect(0, 0, W, Hh);
  const k = Math.max(W / vw, Hh / vh), ox = (W - vw * k) / 2, oy = (Hh - vh * k) / 2;
  const P = p => [p[0] * vh * k + ox, p[1] * vh * k + oy];
  octx.lineWidth = 5; octx.lineCap = 'round';
  for (const s of segs) {
    const a = P(s.a), b = P(s.b);
    octx.strokeStyle = s.ok ? 'rgba(79,209,139,.9)' : 'rgba(243,211,176,.9)';
    octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke();
  }
}

/* ---------- Gallery ---------- */
function addPhoto(src) {
  const ph = { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), src, ts: Date.now() };
  S.photos.unshift(ph); dbPut('photos', ph); keepStorage(); renderGal(); toast('Saved to Gallery');
}
function renderGal() {
  $('gal').innerHTML = S.photos.map((p, i) => `<img src="${p.src}" data-i="${i}" alt="Photo ${i + 1}">`).join('');
  const where = DB.db ? 'Saved on this device.' : 'Photos stay until you close this page.';
  $('galHead').textContent = S.photos.length ? `${S.photos.length} photo${S.photos.length > 1 ? 's' : ''} · ${where} Tap one to save, share or delete.` : 'Photos you take appear here. The guide is never saved in the photo.';
}
$('gal').onclick = e => { const im = e.target.closest('img'); if (im) openViewer(+im.dataset.i); };
function openViewer(i) { S.vIndex = i; const p = S.photos[i]; $('vImg').src = p.src; $('vCount').textContent = `Photo ${i + 1} of ${S.photos.length}`; $('viewer').classList.add('on'); }
$('vClose').onclick = () => $('viewer').classList.remove('on');
$('vDel').onclick = () => { const [p] = S.photos.splice(S.vIndex, 1); if (p) dbDel('photos', p.id); renderGal(); $('viewer').classList.remove('on'); toast('Deleted'); };
function dataUrlToBlob(u) {
  const [h, b] = u.split(','); const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: mime });
}
const fileName = p => 'posely-' + new Date(p.ts).toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.jpg';
let DL = null;
try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(d => { DL = d; }).catch(() => {}); } catch (e) {}
$('vSave').onclick = async () => {
  const p = S.photos[S.vIndex]; if (!p) return;
  const blob = dataUrlToBlob(p.src);
  if (DL) { try { await DL.save({ filename: fileName(p), data: blob }); toast('Saved'); } catch (e) { toast('Not saved. Long-press the photo instead.'); } return; }
  try {
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName(p);
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) { toast('Long-press the photo to save it'); }
};
const canShareFiles = (() => { try { return !framed && !!navigator.canShare && navigator.canShare({ files: [new File([new Blob()], 'x.jpg', { type: 'image/jpeg' })] }); } catch (e) { return false; } })();
$('vShare').hidden = !canShareFiles;
$('vShare').onclick = async () => {
  const p = S.photos[S.vIndex]; if (!p) return;
  try { await navigator.share({ files: [new File([dataUrlToBlob(p.src)], fileName(p), { type: 'image/jpeg' })], title: 'Posely photo' }); }
  catch (e) { if (e && e.name !== 'AbortError') toast('Sharing is not available here'); }
};

/* ---------- Navigation ---------- */
function go(v) {
  if (v === 'camera' && !S.pose) { toast('Pick a pose first'); v = 'poses'; }
  S.view = v;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'v-' + v));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.v === v));
  $('app').classList.toggle('dark', v === 'camera');
  if (v === 'camera') { startCam(); showStep(); } else { stopCam(); clearTimeout(stepTimer); }
}
document.querySelector('.tabs').onclick = e => { const t = e.target.closest('.tab'); if (t) go(t.dataset.v); };
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCam(); else if (S.view === 'camera') startCam(); });
let tt; function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1800); }

/* ---------- Install ---------- */
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvt = null;
if (!framed && !standalone) {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('installBtn').hidden = false; });
  if (isIOS) $('installBtn').hidden = false;
}
window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; toast('Posely installed'); });
$('installBtn').onclick = async () => {
  if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('installBtn').hidden = true; }
  else $('iosSheet').classList.add('on');
};
$('iosClose').onclick = () => $('iosSheet').classList.remove('on');
$('iosSheet').onclick = e => { if (e.target.id === 'iosSheet') $('iosSheet').classList.remove('on'); };
if (!framed && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

/* ---------- Start ---------- */
(async function init() {
  const pr = loadPrefs();
  if (pr.opacity != null) $('opacity').value = pr.opacity;
  if (pr.timer) setTimer(pr.timer);
  if (pr.grid) setGrid(true);
  if (pr.match === false) S.match = false;
  if (pr.auto) S.auto = true;
  if (pr.tips === false) S.tips = false;
  setMatchBtn(); renderCats(); renderGal();
  await dbOpen();
  const [photos, guides] = await Promise.all([dbAll('photos'), dbAll('guides')]);
  S.photos = photos.sort((a, b) => b.ts - a.ts).concat(S.photos.filter(p => !photos.some(q => q.id === p.id)));
  S.custom = guides.filter(g => g.cat === 'Mine' && g.src).sort((a, b) => a.ts - b.ts);
  renderCats(); renderGal();
  await loadLibrary();
})();
