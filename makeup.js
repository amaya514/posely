// AR makeup: tracks faces with Google's MediaPipe Face Landmarker (runs on the phone) and paints
// lipstick, eyeliner, eyeshadow, blush and brows on a layer that is multiplied over the camera image.
import { getVision } from './match.js';

export const LOOKS = [
  { id: 'none', name: 'None' },
  { id: 'natural', name: 'Natural', lip: '#c4746a', lipA: 0.35, blush: '#f2a5a0', blushA: 0.28, liner: 0.25, brow: 0.15 },
  { id: 'soft-pink', name: 'Soft Pink', lip: '#e07a95', lipA: 0.45, blush: '#f7a1b5', blushA: 0.38, liner: 0.45, shadow: '#e6b3c2', shadowA: 0.4, brow: 0.2 },
  { id: 'peach', name: 'Peach Glow', lip: '#e9846b', lipA: 0.45, blush: '#ffad8a', blushA: 0.42, liner: 0.35, shadow: '#e8a77d', shadowA: 0.38, brow: 0.2 },
  { id: 'glam', name: 'Glam', lip: '#b0334a', lipA: 0.55, blush: '#e98e82', blushA: 0.32, liner: 1, wing: 1, shadow: '#a77a5a', shadowA: 0.5, brow: 0.35 },
  { id: 'red', name: 'Red Lip', lip: '#c4161c', lipA: 0.65, blush: '#ec9a92', blushA: 0.2, liner: 0.8, wing: 0.9, brow: 0.3 },
  { id: 'smoky', name: 'Smoky Eye', lip: '#a86b62', lipA: 0.32, liner: 1, wing: 0.6, shadow: '#3c3236', shadowA: 0.8, brow: 0.35 },
  { id: 'berry', name: 'Berry', lip: '#7a1f45', lipA: 0.6, blush: '#d77a95', blushA: 0.3, liner: 0.6, shadow: '#8a5a73', shadowA: 0.4, brow: 0.3 },
  { id: 'nude', name: 'Nude', lip: '#b98471', lipA: 0.45, blush: '#d9a08c', blushA: 0.25, liner: 0.5, wing: 0.3, shadow: '#b38f78', shadowA: 0.35, brow: 0.25 }
];
// lipstick colours you can swap into any look ('' = the look's own colour)
export const LIPS = ['', '#c4161c', '#e07a95', '#b0334a', '#e9846b', '#7a1f45', '#b98471', '#8e3b2e', '#d94f70'];

// MediaPipe face mesh landmark indices
const LIP_OUT = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const LIP_IN = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
const EYES = [
  { upper: [133, 173, 157, 158, 159, 160, 161, 246, 33], brow: [107, 66, 105, 63, 70], browFill: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46], cheek: 205 },
  { upper: [362, 398, 384, 385, 386, 387, 388, 466, 263], brow: [336, 296, 334, 293, 300], browFill: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276], cheek: 425 }
];

let faceLm = null, loading = null, ts = 0;
export function loadFaces() {
  if (faceLm) return Promise.resolve(faceLm);
  if (loading) return loading;
  loading = (async () => {
    const { mod, fs } = await getVision();
    const opts = d => ({ baseOptions: { modelAssetPath: new URL('./models/face_landmarker.task', import.meta.url).href, delegate: d },
      runningMode: 'VIDEO', numFaces: 3, minFaceDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { faceLm = await mod.FaceLandmarker.createFromOptions(fs, opts('GPU')); }
    catch (e) { faceLm = await mod.FaceLandmarker.createFromOptions(fs, opts('CPU')); }
    return faceLm;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}
// landmarks for every face in a video frame or image (normalised 0..1)
export function detectFaces(source) {
  if (!faceLm) return [];
  ts = Math.max(ts + 1, performance.now());
  try { return faceLm.detectForVideo(source, ts).faceLandmarks || []; } catch (e) { return []; }
}

const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
function smoothPath(ctx, pts, close) {
  ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
  const n = pts.length;
  for (let i = 1; i < (close ? n + 1 : n - 1); i++) {
    const p = pts[i % n], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  if (close) ctx.closePath();
}
// soft-edged fill: only the blurred shadow of the shape is drawn
function softFill(ctx, draw, color, blur) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 10000; ctx.fillStyle = color;
  ctx.translate(-10000, 0); ctx.beginPath(); draw(); ctx.fill(); ctx.restore();
}

// Paint the look for every face. map(point) -> [x, y] in the target canvas.
export function paintMakeup(ctx, faces, map, look, lipColor, amount) {
  if (!look || look.id === 'none' || amount <= 0) return;
  for (const lm of faces) {
    const P = i => map(lm[i]);
    const fw = Math.hypot(P(234)[0] - P(454)[0], P(234)[1] - P(454)[1]);
    if (fw < 12) continue;
    // blush
    if (look.blush) for (const e of EYES) {
      const c = P(e.cheek), r = fw * 0.14;
      const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
      g.addColorStop(0, rgba(look.blush, look.blushA * amount)); g.addColorStop(1, rgba(look.blush, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.fill();
    }
    // eyeshadow: from the lid up toward the brow, fading out
    if (look.shadow) for (const e of EYES) {
      const lid = e.upper.map(P), brow = e.brow.map(P);
      const mid = brow.map((b, i) => { const l = lid[Math.round(i * (lid.length - 1) / (brow.length - 1))]; return [l[0] + (b[0] - l[0]) * 0.55, l[1] + (b[1] - l[1]) * 0.55]; });
      softFill(ctx, () => { smoothPath(ctx, [...lid, ...mid.reverse()], true); }, rgba(look.shadow, look.shadowA * amount), fw * 0.035);
    }
    // brows
    if (look.brow) for (const e of EYES) softFill(ctx, () => smoothPath(ctx, e.browFill.map(P), true), rgba('#3a2a22', look.brow * amount * 0.6), fw * 0.012);
    // eyeliner along the upper lash line, thicker toward the outer corner, with an optional wing
    if (look.liner) for (const e of EYES) {
      const lid = e.upper.map(P), n = lid.length;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba('#17110f', 0.85 * look.liner * amount);
      for (let i = 0; i < n - 1; i++) {
        ctx.lineWidth = fw * (0.005 + 0.012 * (i / (n - 1)) * look.liner);
        ctx.beginPath(); ctx.moveTo(lid[i][0], lid[i][1]); ctx.lineTo(lid[i + 1][0], lid[i + 1][1]); ctx.stroke();
      }
      if (look.wing) {
        const o = lid[n - 1], b = lid[n - 3];
        let dx = o[0] - b[0], dy = o[1] - b[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        // tilt the wing upward (toward the top of the face)
        const up = map({ x: lm[10].x, y: lm[10].y }), down = map({ x: lm[152].x, y: lm[152].y });
        let ux = up[0] - down[0], uy = up[1] - down[1]; const U = Math.hypot(ux, uy) || 1; ux /= U; uy /= U;
        const wx = dx * 0.8 + ux * 0.6, wy = dy * 0.8 + uy * 0.6, len = fw * 0.07 * look.wing;
        const tip = [o[0] + wx * len, o[1] + wy * len];
        ctx.fillStyle = rgba('#17110f', 0.85 * look.liner * amount);
        ctx.beginPath(); ctx.moveTo(o[0] - uy * fw * 0.006, o[1] + ux * fw * 0.006); ctx.lineTo(tip[0], tip[1]);
        ctx.lineTo(o[0] + ux * fw * 0.012, o[1] + uy * fw * 0.012); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // lipstick: outer lip shape minus the open mouth
    const color = lipColor || look.lip;
    if (color) {
      ctx.save();
      ctx.fillStyle = rgba(color, look.lipA * amount * (lipColor ? 1.1 : 1));
      ctx.shadowColor = rgba(color, look.lipA * amount * 0.6); ctx.shadowBlur = fw * 0.008;
      ctx.beginPath(); smoothPath(ctx, LIP_OUT.map(P), true); smoothPath(ctx, LIP_IN.map(P), true);
      ctx.fill('evenodd'); ctx.restore();
    }
  }
}
