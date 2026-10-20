import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { snapshot, undo, history } from '../../skills/all-about-arts/lib/history.mjs';
import { addNote, listInbox, updateNote } from '../../skills/all-about-arts/lib/inbox.mjs';

const studio = fileURLToPath(new URL('../../skills/all-about-arts/studio/', import.meta.url));

test('Studio edits, transports, anchors notes, restores history, exports and retains conflicting drafts', { timeout: 60000 }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'AAA Studio 电影 '));
  t.after(() => rm(root, { recursive: true, force: true }));
  const initial = { title: 'Local rehearsal', width: 960, height: 540, fps: 30, duration: 6, scenes: [{ id: 'opening', title: 'Opening', start: 0, end: 3 }, { id: 'closing', title: 'Closing', start: 3, end: 6 }] };
  await writeFile(join(root, 'aaa.json'), JSON.stringify(initial));
  const project = async () => { const bytes = await readFile(join(root, 'aaa.json')); return { config: JSON.parse(bytes), fingerprint: createHash('sha256').update(bytes).digest('hex') }; };
  let renders = 0, exports = 0, hasAudio = true;
  const wav = Buffer.alloc(44 + 6 * 8000 * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < 6 * 8000; i++) wav.writeInt16LE(Math.round(Math.sin(i / 8000 * 440 * Math.PI * 2) * 1000), 44 + i * 2);
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (['/', '/studio.js', '/studio.css'].includes(path)) {
        res.setHeader('content-type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
        return res.end(await readFile(join(studio, path === '/' ? 'index.html' : path.slice(1))));
      }
      if (path === '/media/audio.wav') {
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
        res.setHeader('content-type', 'audio/wav'); res.setHeader('accept-ranges', 'bytes');
        if (range) { res.statusCode = 206; res.setHeader('content-range', `bytes ${start}-${end}/${wav.length}`); }
        res.setHeader('content-length', end - start + 1);
        return res.end(wav.subarray(start, end + 1));
      }
      if (path === '/film/') {
        const { config } = await project();
        res.setHeader('content-type', 'text/html');
        return res.end(`<html><style>body{margin:0}canvas{width:100%;height:100%;display:block}</style><canvas width="960" height="540"></canvas><script>const config=${JSON.stringify(config).replaceAll('<', '\\u003c')}; const ctx=document.querySelector('canvas').getContext('2d'); window.AAA={ready:Promise.resolve(),describe:()=>({...config,parameters:[{key:'title',label:'Film title',type:'text',value:config.title}]}),render:async(t)=>{ctx.fillStyle='#204835';ctx.fillRect(0,0,960,540);ctx.fillStyle='white';ctx.font='40px sans-serif';ctx.fillText(config.title,20,60);window.lastRendered=t},texts:()=>[],regions:()=>[{id:'headline',scene:'opening',x:0,y:0,width:960,height:180}]};</script></html>`);
      }
      res.setHeader('content-type', 'application/json');
      let input = '';
      for await (const chunk of req) input += chunk;
      const body = input ? JSON.parse(input) : {};
      let result;
      if (path === '/api/prepare') result = { ...(await project()), audio: { url: hasAudio ? '/media/audio.wav' : null, precision: 'exact' } };
      else if (path === '/api/project') result = await project();
      else if (path === '/api/notes' && req.method === 'GET') result = { notes: await listInbox(root) };
      else if (path === '/api/notes') result = { note: await addNote(root, body) };
      else if (path.startsWith('/api/notes/')) result = { note: await updateNote(root, path.split('/').at(-1), body.status) };
      else if (path === '/api/history') result = { history: await history(root) };
      else if (path === '/api/save') {
        if (body.expectedFingerprint !== (await project()).fingerprint) { res.statusCode = 409; return res.end(JSON.stringify({ status: 'failure', error: { message: 'Project changed outside Studio. Reload before saving.' } })); }
        await snapshot(root);
        await writeFile(join(root, 'aaa.json'), JSON.stringify(body.config));
        result = await project();
      } else if (path === '/api/undo') { await undo(root, body); result = await project(); }
      else if (path === '/api/render') { renders++; result = { path: 'out/film.mp4' }; }
      else if (path === '/api/export') { exports++; result = { path: 'out/delivery.zip' }; }
      else { res.statusCode = 404; result = { status: 'failure', error: { message: 'Missing route' } }; }
      res.end(JSON.stringify({ status: 'success', ...result }));
    } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ status: 'failure', error: { message: error.message } })); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { chromium } = await import('../../skills/all-about-arts/node_modules/playwright-core/index.mjs');
  const browser = await chromium.launch({ executablePath: process.env.AAA_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel('Film title', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Closing scene/ }).click();
  assert.equal(await page.getByLabel('Playhead').inputValue(), '3');
  assert.equal(await page.locator('#preview-audio').evaluate((audio) => audio.currentTime), 3);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('#scrubber').value) > 3.2);
  assert.equal(await page.locator('#preview-audio').evaluate((audio) => audio.paused), false);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  assert.equal(await page.locator('#preview-audio').evaluate((audio) => audio.paused), true);
  await page.getByLabel('Film title', { exact: true }).fill('Saved title');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#project-name').textContent === 'Saved title' && document.querySelector('#preview-status').textContent === 'Ready');
  assert.equal((await project()).config.title, 'Saved title');
  await page.getByRole('button', { name: /Opening scene/ }).click();
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  const frame = await page.locator('#note-overlay').boundingBox();
  await page.mouse.click(frame.x + frame.width * 0.2, frame.y + frame.height * 0.1);
  await page.getByLabel('Note text', { exact: true }).fill('Lift the headline');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByText('Lift the headline', { exact: true }).waitFor();
  const notes = await listInbox(root);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].objectId, 'headline');
  assert.equal(notes[0].scene, 'opening');
  assert.ok(Math.abs(notes[0].x - 192) < 2);
  assert.ok(Math.abs(notes[0].y - 54) < 2);
  await updateNote(root, notes[0].id, 'in_progress');
  await page.waitForFunction(() => document.querySelector('#notes-list select').value === 'in_progress', null, { timeout: 6500 });
  await page.getByLabel('Note status').selectOption('done');
  await page.waitForFunction(() => document.querySelector('#notes-list select').value === 'done');
  await page.getByRole('button', { name: 'Undo last save', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#project-name').textContent === 'Local rehearsal' && document.querySelector('#preview-status').textContent === 'Ready');
  assert.equal((await listInbox(root))[0].status, 'done');
  await page.getByRole('button', { name: 'Render film', exact: true }).click();
  await page.getByText(/out\/film.mp4/).waitFor();
  await page.getByRole('button', { name: 'Export package', exact: true }).click();
  await page.getByText(/out\/delivery.zip/).waitFor();
  assert.equal(renders, 1);
  assert.equal(exports, 1);
  await page.getByRole('tab', { name: 'Parameters', exact: true }).click();
  await page.getByLabel('Film title', { exact: true }).fill('Unsaved draft');
  await writeFile(join(root, 'aaa.json'), JSON.stringify({ ...initial, title: 'External edit' }));
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByText(/Project changed outside Studio/).waitFor();
  assert.equal(await page.getByLabel('Film title', { exact: true }).inputValue(), 'Unsaved draft');
  assert.equal((await project()).config.title, 'External edit');
  hasAudio = false;
  await page.getByRole('button', { name: 'Reload project', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#project-name').textContent === 'External edit' && document.querySelector('#preview-status').textContent === 'Ready');
  assert.equal(await page.locator('#preview-audio').getAttribute('src'), null);
  assert.deepEqual(errors, []);
});

test('Studio saves an actual runtime scene title and previews the production soundtrack mix', { timeout: 60000 }, async (t) => {
  const { initProject, defaultConfig } = await import('../../skills/all-about-arts/lib/project.mjs');
  const { startServer } = await import('../../skills/all-about-arts/lib/server.mjs');
  const parent = await mkdtemp(join(tmpdir(), 'AAA real Studio 电影 '));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'film');
  const config = defaultConfig({ duration: 6, style: 'pixel-rpg', title: 'A small beginning' });
  Object.assign(config, { width: 640, height: 360 });
  config.audio.music.enabled = true;
  await initProject(root, { config });
  const server = await startServer({ project: root, studio: true });
  t.after(() => server.close());
  const { chromium } = await import('../../skills/all-about-arts/node_modules/playwright-core/index.mjs');
  const browser = await chromium.launch({ executablePath: process.env.AAA_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.url);
  await page.waitForFunction(() => document.querySelector('#preview-status').textContent === 'Ready');
  assert.match(await page.locator('#preview-audio').getAttribute('src'), /\/media\/audio.wav/);
  const title = page.locator('[data-key="scenes.0.title"]');
  await title.fill('A visible new title');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByText('Changes saved. Preview updated.', { exact: true }).waitFor();
  const texts = await page.locator('#film').evaluate(async (frame) => { await frame.contentWindow.AAA.render(1); return frame.contentWindow.AAA.texts(1); });
  assert.ok(texts.some((item) => item.text.includes('A visible new title')));
  assert.equal(JSON.parse(await readFile(join(root, 'aaa.json'), 'utf8')).scenes[0].title, 'A visible new title');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('#scrubber').value) > 0.25);
  const transport = await page.evaluate(() => ({ audio: document.querySelector('#preview-audio').currentTime, visual: Number(document.querySelector('#scrubber').value), paused: document.querySelector('#preview-audio').paused }));
  assert.equal(transport.paused, false);
  assert.ok(Math.abs(transport.audio - transport.visual) < 0.15);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  assert.ok((await page.locator('.topbar').boundingBox()).y >= 0, 'Editing inspector fields must not scroll the preview/header out of view');
  if (process.env.AAA_STUDIO_SCREENSHOT) await page.screenshot({ path: process.env.AAA_STUDIO_SCREENSHOT });
  assert.deepEqual(errors, []);
});
