// Live pose matching with Google's MediaPipe Pose Landmarker (pre-trained, runs on the phone).
// Compares limb angles on screen, so it doesn't matter how big you are in the frame.
let landmarker = null, loading = null;

export function loadTracker() {
  if (landmarker) return Promise.resolve(landmarker);
  if (loading) return loading;
  loading = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import('./vendor/mediapipe/vision_bundle.js');
    const base = new URL('./vendor/mediapipe/wasm', import.meta.url).href;
    const fs = await FilesetResolver.forVisionTasks(base);
    const opts = d => ({ baseOptions: { modelAssetPath: new URL('./models/pose_landmarker_full.task', import.meta.url).href, delegate: d },
      runningMode: 'VIDEO', numPoses: 3, minPoseDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { landmarker = await PoseLandmarker.createFromOptions(fs, opts('GPU')); }
    catch (e) { landmarker = await PoseLandmarker.createFromOptions(fs, opts('CPU')); }
    return landmarker;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

const IDX = { ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28, hd: 0 };

// landmarks (normalised to the video) -> points in display pixels (height = 1)
export function toPoints(lms, vw, vh, mirrored) {
  const p = {};
  for (const k in IDX) {
    const l = lms[IDX[k]];
    if (!l || (l.visibility !== undefined && l.visibility < 0.55)) continue;
    let x = l.x * vw / vh;
    if (mirrored) x = vw / vh - x;
    p[k] = [x, l.y];
  }
  return p;
}

// split into limbs by where they are on screen, not by the person's own left/right
function limbs(p, armsOnly) {
  const out = {};
  const sideOf = (a, b) => (p[a] && p[b]) ? (p[a][0] <= p[b][0] ? [a[0], b[0]] : [b[0], a[0]]) : null;
  const arms = sideOf('ls', 'rs');
  if (arms) {
    const [L, R] = arms;
    out.armL = [p[L + 's'], p[L + 'e']]; out.foreL = [p[L + 'e'], p[L + 'w']];
    out.armR = [p[R + 's'], p[R + 'e']]; out.foreR = [p[R + 'e'], p[R + 'w']];
  }
  const legs = armsOnly ? null : sideOf('lh', 'rh');
  if (legs) {
    const [L, R] = legs;
    out.thighL = [p[L + 'h'], p[L + 'k']]; out.shinL = [p[L + 'k'], p[L + 'a']];
    out.thighR = [p[R + 'h'], p[R + 'k']]; out.shinR = [p[R + 'k'], p[R + 'a']];
  }
  for (const k in out) if (!out[k][0] || !out[k][1]) delete out[k];
  return out;
}

const ang = ([a, b]) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const diff = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return (d > Math.PI ? 2 * Math.PI - d : d) * 180 / Math.PI; };
const NAMES = { armL: 'arm on the left', foreL: 'forearm on the left', armR: 'arm on the right', foreR: 'forearm on the right',
  thighL: 'leg on the left', shinL: 'lower leg on the left', thighR: 'leg on the right', shinR: 'lower leg on the right' };

function flipRef(r, ar) { const o = {}; for (const k in r) o[k] = [ar - r[k][0], r[k][1]]; return o; }
const midX = p => p.ls && p.rs ? (p.ls[0] + p.rs[0]) / 2 : (p.hd ? p.hd[0] : 0);

// refs: reference joints per guide figure; people: detected point sets.
// Returns {pct, matched, hint, segs:[{a,b,ok}]}
export function compare(refs, ar, flipped, people, armsOnly) {
  if (!people.length) return { pct: 0, matched: false, hint: 'Step into the frame so your whole body shows', segs: [] };
  const R = refs.map(r => flipped ? flipRef(r, ar) : r).sort((a, b) => midX(a) - midX(b));
  const P = people.slice().sort((a, b) => midX(a) - midX(b));
  if (P.length < R.length) return { pct: 0, matched: false, hint: `Waiting for everyone: ${P.length} of ${R.length} in frame`, segs: [] };
  const use = P.length > R.length ? pickClosest(P, R.length) : P;
  let total = 0, n = 0, worst = null; const segs = [];
  use.forEach((p, i) => {
    const rl = limbs(R[i], armsOnly), pl = limbs(p, armsOnly);
    for (const k in rl) {
      if (!pl[k]) continue;
      const d = diff(ang(rl[k]), ang(pl[k]));
      total += d; n++;
      segs.push({ a: pl[k][0], b: pl[k][1], ok: d < 22 });
      if (!worst || d > worst.d) worst = { d, k, ref: rl[k], got: pl[k], who: i, of: use.length };
    }
  });
  if (n < (armsOnly ? 2 : 4)) return { pct: 0, matched: false, hint: armsOnly ? 'Make sure your shoulders and arms are in view' : 'Step back so your whole body shows', segs };
  const mean = total / n;
  const pct = Math.max(0, Math.min(100, Math.round(100 - mean * 1.8)));
  const matched = mean < 14 && worst.d < 32;
  let hint = matched ? 'Perfect! Hold still' : '';
  if (!matched && worst) {
    const ry = Math.sin(ang(worst.ref)), gy = Math.sin(ang(worst.got));
    const verb = ry < gy - 0.15 ? 'Raise' : ry > gy + 0.15 ? 'Lower' : (Math.cos(ang(worst.ref)) * (worst.k.endsWith('L') ? -1 : 1) > Math.cos(ang(worst.got)) * (worst.k.endsWith('L') ? -1 : 1) ? 'Move out' : 'Bring in');
    const who = worst.of > 1 ? `Person ${worst.who + 1} from the left: ` : '';
    hint = `${who}${verb} your ${NAMES[worst.k]}`;
  }
  return { pct, matched, hint, segs };
}

function pickClosest(P, n) {
  // keep the n people nearest the middle of the frame
  const c = P.reduce((s, p) => s + midX(p), 0) / P.length;
  return P.slice().sort((a, b) => Math.abs(midX(a) - c) - Math.abs(midX(b) - c)).slice(0, n).sort((a, b) => midX(a) - midX(b));
}
