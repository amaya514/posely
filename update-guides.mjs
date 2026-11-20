// Run after adding or replacing pose pictures:  node update-guides.mjs
// Writes guides/index.json so the app knows which pictures exist without probing for them.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'guides');
const pref = ['png', 'jpg', 'jpeg', 'webp'];
const index = {};
for (const f of fs.readdirSync(dir).sort()) {
  const m = f.match(/^(.+)\.(png|jpe?g|webp)$/i);
  if (!m) continue;
  const id = m[1], ext = m[2].toLowerCase();
  if (index[id] && pref.indexOf(index[id].ext) <= pref.indexOf(ext)) continue;
  const st = fs.statSync(path.join(dir, f));
  index[id] = { file: f, ext, sig: `${st.size}-${Math.round(st.mtimeMs)}` };
}
const out = {};
for (const [id, v] of Object.entries(index)) out[id] = { file: v.file, sig: v.sig };
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`guides/index.json: ${Object.keys(out).length} pose pictures`);
