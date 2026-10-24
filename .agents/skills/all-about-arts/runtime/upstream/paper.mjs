// Adapted from Lemo paper-lantern/demo/src/paper.js. MIT; LICENSE-lemo.txt.
import {mulberry,TAU} from "./lemo-lib.mjs";
export function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

// —— 纹理：纸纤维（正面肌理）与透光云纹（背光时看到的纸浆絮状）——
function makeGrain(n, seed) {
  const c = cv(n, n), x = c.getContext('2d'), R = mulberry(seed), img = x.createImageData(n, n), d = img.data;
  for (let i = 0; i < n * n; i++) { const v = R(); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v < .5 ? 0 : 255; d[i * 4 + 3] = Math.abs(v - .5) * 30; }
  x.putImageData(img, 0, 0); x.lineCap = 'round';
  for (let i = 0; i < n * 1.4; i++) {
    const px = R() * n, py = R() * n, a = R() * TAU, l = 5 + R() * 22;
    x.strokeStyle = R() < .5 ? 'rgba(40,30,20,.10)' : 'rgba(255,255,255,.16)'; x.lineWidth = .5 + R() * .8;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .5) * l * .5, py + Math.sin(a + .5) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return c;
}
let GRAIN;
export const grain = () => GRAIN || (GRAIN = makeGrain(512,7));

export function finish(c, o = {}) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  if (o.grain !== false) { x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = o.grainA ?? .9; x.fillStyle = x.createPattern(grain(), 'repeat'); x.fillRect(0, 0, W, H); x.restore(); }
  const band = (dy, col, blur) => {
    const t = cv(W, H), y = t.getContext('2d');
    y.drawImage(c, 0, 0); y.globalCompositeOperation = 'destination-out'; y.drawImage(c, 0, dy);
    y.globalCompositeOperation = 'source-in'; y.fillStyle = col; y.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = 'source-atop'; if (blur) x.filter = `blur(${blur}px)`; x.drawImage(t, 0, 0); x.restore();
  };
  if (o.rim !== 0) band(o.rimPx ?? 3, o.rimCol || `rgba(255,236,200,${o.rim ?? .35})`, .6);
  if (o.under !== 0) band(-(o.underPx ?? 3), `rgba(0,0,0,${o.under ?? .28})`, .8);
  return c;
}

