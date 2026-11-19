// Turns a pose image on a plain background into a transparent, tightly cropped guide.
// Works by flood-filling the background colour in from the edges, so the figure (and any
// props touching it) stays, even where the figure itself is light grey.

function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

export async function cutout(src, { maxH = 1400, tol = 30 } = {}) {
  const im = await loadImage(src);
  const k = Math.min(1, maxH / im.naturalHeight);
  const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;

  // background colour = median of the border pixels
  const border = [];
  for (let x = 0; x < w; x += 2) { border.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y += 2) { border.push(y * w, y * w + w - 1); }
  const med = ch => { const v = border.map(i => d[i * 4 + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const dist = i => Math.hypot(d[i * 4] - bg[0], d[i * 4 + 1] - bg[1], d[i * 4 + 2] - bg[2]);

  // flood fill from every edge pixel that matches the background
  const state = new Uint8Array(w * h); // 0 unknown, 1 background
  const stack = [];
  for (const i of border) if (dist(i) < tol) { state[i] = 1; stack.push(i); }
  for (let x = 1; x < w; x += 2) { const i = x; if (!state[i] && dist(i) < tol) { state[i] = 1; stack.push(i); } }
  while (stack.length) {
    const i = stack.pop(), x = i % w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
    for (const n of nb) {
      if (n < 0 || n >= w * h || state[n]) continue;
      if (dist(n) < tol) { state[n] = 1; stack.push(n); }
    }
  }
  // clear background; soften the edge one pixel deep
  for (let i = 0; i < w * h; i++) {
    if (state[i]) { d[i * 4 + 3] = 0; continue; }
    const x = i % w;
    const touches = (x > 0 && state[i - 1]) || (x < w - 1 && state[i + 1]) || (i >= w && state[i - w]) || (i + w < w * h && state[i + w]);
    if (touches) { const t = Math.min(1, dist(i) / (tol * 2.2)); d[i * 4 + 3] = Math.round(255 * Math.max(0.35, t)); }
  }
  // drop tiny specks (fewer than ~0.05% of pixels) by finding the bounding box of solid pixels with a row/col threshold
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  const minRun = Math.max(2, Math.round(w * 0.004));
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 40) { run++; if (run >= minRun) { if (x - run + 1 < x0) x0 = x - run + 1; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      else run = 0;
    }
  }
  g.putImageData(img, 0, 0);
  if (x1 < 0) return { src: c.toDataURL('image/png'), ar: w / h, empty: true };
  const pad = Math.round(h * 0.015);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const o = document.createElement('canvas'); o.width = cw; o.height = ch;
  o.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
  return { src: o.toDataURL('image/png'), ar: cw / ch };
}
