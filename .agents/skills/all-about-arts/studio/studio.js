// Original Studio implementation. Motion's point-to-frame review workflow is
// credited in studio-upstreams.json; this player uses only window.AAA.
export function pointToProject(clientX, clientY, rect, width, height) {
  if (!(rect.width > 0 && rect.height > 0)) throw new Error('Preview has no visible area');
  return { x: Math.max(0, Math.min(width, (clientX - rect.left) / rect.width * width)), y: Math.max(0, Math.min(height, (clientY - rect.top) / rect.height * height)) };
}

export function pickRegion(regions, point) {
  return (Array.isArray(regions) ? regions : []).filter((region) => region && typeof region.id === 'string' && [region.x, region.y, region.width, region.height].every(Number.isFinite) && region.width > 0 && region.height > 0 && point.x >= region.x && point.y >= region.y && point.x <= region.x + region.width && point.y <= region.y + region.height).sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
}

export function sceneAt(scenes, time) {
  return [...scenes].reverse().find((scene) => Number.isFinite(scene.start) && time >= scene.start && (time < scene.end || time === scenes.at(-1)?.end)) ?? null;
}

export function changeParameter(config, parameter, value) {
  const parts = parameter.key?.split('.');
  if (!parts?.length || parts.some((part) => !part || ['__proto__', 'prototype', 'constructor'].includes(part))) throw new Error('Invalid parameter path');
  const copy = structuredClone(config);
  let target = copy;
  for (const part of parts.slice(0, -1)) {
    if (!target || typeof target !== 'object' || !Object.hasOwn(target, part)) throw new Error(`Unknown parameter ${parameter.key}`);
    target = target[part];
  }
  const key = parts.at(-1);
  if (!target || typeof target !== 'object' || !Object.hasOwn(target, key)) throw new Error(`Unknown parameter ${parameter.key}`);
  if (['number', 'range', 'integer'].includes(parameter.type)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (parameter.min != null && value < parameter.min) || (parameter.max != null && value > parameter.max) || (parameter.type === 'integer' && !Number.isInteger(value))) throw new Error(`${parameter.label || parameter.key} is outside its permitted range`);
  } else if (['boolean', 'checkbox'].includes(parameter.type)) {
    if (typeof value !== 'boolean') throw new Error('Expected a boolean parameter');
  } else if (typeof value !== 'string') throw new Error('Expected a text parameter');
  target[key] = value;
  return copy;
}

const formatTime = (seconds) => {
  const time = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${(time % 60).toFixed(2).padStart(5, '0')}`;
};
const $ = (selector) => document.querySelector(selector);
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const state = { config: null, draft: null, fingerprint: null, film: null, description: null, notes: [], revisions: [], time: 0, renderedTime: 0, playing: false, dirty: false, busy: false, rendering: false, queuedTime: null, noteMode: false, anchor: null, generation: 0, playbackGeneration: 0 };

async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status === 'failure' || !data) throw Object.assign(new Error(data?.error?.message || data?.error || `Request failed (${response.status})`), { status: response.status });
  return data;
}

function notice(message, error = false) {
  $('#notice').textContent = message;
  $('#notice').classList.toggle('error', error);
  $('#notice').hidden = !message;
  $('#notice').setAttribute('role', error ? 'alert' : 'status');
}

function selectTab(name) {
  for (const tab of ['parameters', 'notes', 'history']) {
    $(`#tab-${tab}`).setAttribute('aria-selected', String(tab === name));
    $(`#tab-${tab}`).tabIndex = tab === name ? 0 : -1;
    $(`#panel-${tab}`).hidden = tab !== name;
  }
}

function updateControls() {
  const ready = Boolean(state.film);
  for (const id of ['play', 'previous-frame', 'next-frame', 'scrubber', 'add-note']) $(`#${id}`).disabled = !ready;
  for (const id of ['render', 'export']) $(`#${id}`).disabled = !ready || state.busy || state.dirty;
  $('#save').disabled = !state.dirty || state.busy || !$('#parameters-form').checkValidity();
  $('#undo').disabled = state.busy || state.dirty || !state.revisions.some((revision) => !revision.restoredAt);
  $('#reload').disabled = state.busy;
  $('#save-state').textContent = state.dirty ? 'Unsaved changes · save to update preview' : 'All changes saved';
  $('#footer-state').textContent = state.dirty ? 'A new version is taking shape.' : `${state.notes.filter((note) => note.status !== 'done').length} open notes · ${state.revisions.length} saved versions`;
  for (const input of document.querySelectorAll('#parameters input, #parameters textarea, #parameters select')) input.disabled = state.busy;
  for (const button of document.querySelectorAll('#history-list button')) button.disabled = state.busy || state.dirty;
}

function fitFrame() {
  const description = state.description || state.config;
  if (!description) return;
  const bounds = $('#stage').getBoundingClientRect();
  const scale = Math.max(0.01, Math.min(bounds.width / description.width, bounds.height / description.height));
  $('#frame').style.width = `${description.width * scale}px`;
  $('#frame').style.height = `${description.height * scale}px`;
  $('#film').style.width = `${description.width}px`;
  $('#film').style.height = `${description.height}px`;
  $('#film').style.transform = `scale(${scale})`;
}

function updateTime() {
  $('#time').textContent = formatTime(state.time);
  $('#scrubber').value = String(state.time);
  const scene = sceneAt(state.description?.scenes || [], state.time);
  $('#current-scene').textContent = scene?.title || scene?.id || 'Preview';
  for (const item of document.querySelectorAll('[data-scene-id]')) {
    item.classList.toggle('current', item.dataset.sceneId === scene?.id);
    if (item.matches('button')) item.setAttribute('aria-current', String(item.dataset.sceneId === scene?.id));
  }
}

async function seek(time, { syncAudio = true } = {}) {
  if (!state.film) return;
  state.time = Math.max(0, Math.min(state.description.duration, time));
  state.queuedTime = state.time;
  if (syncAudio && $('#preview-audio').hasAttribute('src')) $('#preview-audio').currentTime = state.time;
  updateTime();
  if (state.rendering) return;
  state.rendering = true;
  const generation = state.generation;
  try {
    while (state.queuedTime != null && generation === state.generation) {
      const next = state.queuedTime;
      state.queuedTime = null;
      await state.film.render(next);
      if (generation !== state.generation) return;
      state.renderedTime = next;
      renderPins();
    }
  } catch (error) { pause(); notice(`Preview could not render: ${error.message}`, true); }
  finally { if (generation === state.generation) state.rendering = false; }
}

function pause() {
  state.playing = false;
  state.playbackGeneration++;
  $('#preview-audio').pause();
  $('#play').setAttribute('aria-label', 'Play');
  $('#play').firstElementChild.textContent = '▶';
}

async function play() {
  if (!state.film) return;
  if (state.playing) { pause(); return; }
  if (state.time >= state.description.duration) state.time = 0;
  const startTime = state.time;
  const playbackGeneration = ++state.playbackGeneration;
  const audio = $('#preview-audio');
  const withAudio = audio.hasAttribute('src');
  state.playing = true;
  $('#play').setAttribute('aria-label', 'Pause');
  $('#play').firstElementChild.textContent = 'Ⅱ';
  if (withAudio) {
    audio.currentTime = startTime;
    try { await audio.play(); }
    catch (error) {
      if (state.playing) { pause(); notice(`Soundtrack playback failed: ${error.message}`, true); }
      return;
    }
    if (!state.playing || playbackGeneration !== state.playbackGeneration) return;
  }
  const startClock = performance.now();
  const tick = (now) => {
    if (!state.playing || playbackGeneration !== state.playbackGeneration) return;
    const time = Math.min(state.description.duration, withAudio ? audio.currentTime : startTime + (now - startClock) / 1000);
    void seek(time, { syncAudio: false });
    if (time >= state.description.duration || (withAudio && audio.ended)) pause();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderScenes() {
  $('#scenes').replaceChildren();
  $('#scene-track').replaceChildren();
  const scenes = state.description.scenes || [];
  $('#scene-count').textContent = String(scenes.length).padStart(2, '0');
  scenes.forEach((scene, index) => {
    const button = element('button', 'scene-button');
    button.dataset.sceneId = scene.id;
    button.setAttribute('aria-label', `${scene.title || scene.id} scene, ${formatTime(scene.start)}`);
    button.append(element('div', 'scene-art', ['↗', '≈', '✳'][index % 3]));
    const caption = element('div', 'scene-caption');
    caption.append(element('strong', '', `${String(index + 1).padStart(2, '0')}  ${scene.title || scene.id}`), element('small', '', `${Math.max(0, scene.end - scene.start).toFixed(1)}s`));
    button.append(caption);
    button.addEventListener('click', () => { pause(); void seek(scene.start); });
    $('#scenes').append(button);
    const segment = element('div', 'track-scene', scene.title || scene.id);
    segment.dataset.sceneId = scene.id;
    segment.style.flex = String(Math.max(0.001, scene.end - scene.start));
    $('#scene-track').append(segment);
  });
}

function renderParameters() {
  const container = $('#parameters');
  container.replaceChildren();
  for (const parameter of state.description.parameters || []) {
    const label = element('label', 'parameter-field');
    label.append(element('span', '', parameter.label || parameter.key));
    const type = parameter.type;
    let input;
    if (type === 'select' && Array.isArray(parameter.options)) {
      input = element('select');
      for (const option of parameter.options) {
        const item = element('option', '', typeof option === 'object' ? option.label : option);
        item.value = typeof option === 'object' ? option.value : option;
        input.append(item);
      }
    } else if (type === 'textarea' || (typeof parameter.value === 'string' && parameter.value.length > 90)) {
      input = element('textarea'); input.rows = 3;
    } else {
      input = element('input');
      input.type = ['boolean', 'checkbox'].includes(type) ? 'checkbox' : ['number', 'integer', 'range'].includes(type) ? 'number' : type === 'color' ? 'color' : 'text';
      if (input.type === 'number') { input.step = type === 'integer' ? '1' : 'any'; if (parameter.min != null) input.min = parameter.min; if (parameter.max != null) input.max = parameter.max; }
    }
    input.dataset.key = parameter.key;
    input.setAttribute('aria-label', parameter.label || parameter.key);
    if (input.type === 'checkbox') input.checked = Boolean(parameter.value);
    else input.value = parameter.value ?? '';
    input.addEventListener('input', () => {
      input.setCustomValidity('');
      const value = input.type === 'checkbox' ? input.checked : input.type === 'number' ? input.valueAsNumber : input.value;
      try { state.draft = changeParameter(state.draft, parameter, value); state.dirty = JSON.stringify(state.draft) !== JSON.stringify(state.config); }
      catch (error) { input.setCustomValidity(error.message); }
      updateControls();
    });
    label.append(input);
    container.append(label);
  }
  if (!container.children.length) container.append(element('p', 'empty-message', 'This film has no declared parameters. You can still review frames and leave notes.'));
}

function renderPins() {
  $('#pins').replaceChildren();
  if (!state.description) return;
  state.notes.forEach((note, index) => {
    if (Math.abs(note.t - state.renderedTime) > Math.max(0.25, 1 / state.description.fps)) return;
    const pin = element('button', `pin ${note.status}`, index + 1);
    pin.style.left = `${note.x / state.description.width * 100}%`;
    pin.style.top = `${note.y / state.description.height * 100}%`;
    pin.setAttribute('aria-label', `Open note: ${note.text}`);
    pin.addEventListener('click', (event) => { event.stopPropagation(); selectTab('notes'); $(`[data-note-id="${note.id}"]`)?.scrollIntoView({ block: 'nearest' }); });
    $('#pins').append(pin);
  });
}

function setNoteMode(active) {
  state.noteMode = active;
  $('#note-overlay').classList.toggle('active', active);
  $('#note-overlay').tabIndex = active ? 0 : -1;
  $('#add-note').setAttribute('aria-pressed', String(active));
  if (active) { pause(); selectTab('notes'); notice('Click a detail in the frame to anchor your note.'); $('#note-overlay').focus(); }
}

async function chooseAnchor(clientX, clientY) {
  if (!state.noteMode || !state.film) return;
  pause();
  const point = pointToProject(clientX, clientY, $('#frame').getBoundingClientRect(), state.description.width, state.description.height);
  let regions = [];
  try { regions = await state.film.regions(state.renderedTime); } catch { /* Coordinates remain useful if a film provides no regions. */ }
  const region = pickRegion(regions, point);
  const scene = sceneAt(state.description.scenes || [], state.renderedTime);
  state.anchor = { t: state.renderedTime, x: point.x, y: point.y, scene: region?.scene || scene?.id || null, objectId: region?.id || null };
  $('#note-anchor').textContent = `${formatTime(state.anchor.t)} · ${state.anchor.scene || 'frame'} · ${state.anchor.objectId || `${Math.round(point.x)}, ${Math.round(point.y)}`}`;
  const box = region || { x: point.x - 10, y: point.y - 10, width: 20, height: 20 };
  for (const [style, key, dimension] of [['left', 'x', 'width'], ['top', 'y', 'height'], ['width', 'width', 'width'], ['height', 'height', 'height']]) $('#selection').style[style] = `${box[key] / state.description[dimension] * 100}%`;
  $('#selection').hidden = false;
  $('#note-form').hidden = false;
  $('#note-text').focus();
  notice('');
}

function cancelNote() {
  state.anchor = null;
  setNoteMode(false);
  $('#selection').hidden = true;
  $('#note-form').hidden = true;
  $('#note-text').value = '';
}

function renderNotes() {
  $('#note-count').textContent = state.notes.length;
  const container = $('#notes-list');
  container.replaceChildren();
  for (const note of state.notes) {
    const card = element('article', `note-card ${note.status}`);
    card.dataset.noteId = note.id;
    const location = element('button', 'note-location', `${formatTime(note.t)} · ${note.scene || 'frame'}${note.objectId ? ` / ${note.objectId}` : ` / ${Math.round(note.x)}, ${Math.round(note.y)}`}`);
    location.addEventListener('click', () => { pause(); void seek(note.t); });
    const status = element('select');
    status.setAttribute('aria-label', 'Note status');
    for (const [value, name] of [['open', 'Open'], ['in_progress', 'In progress'], ['done', 'Done']]) { const option = element('option', '', name); option.value = value; status.append(option); }
    status.value = note.status;
    status.addEventListener('change', async () => {
      status.disabled = true;
      try { await api(`/api/notes/${encodeURIComponent(note.id)}`, { status: status.value }, 'PATCH'); await refreshNotes(); }
      catch (error) { status.value = note.status; notice(error.message, true); }
      finally { status.disabled = false; }
    });
    card.append(location, element('p', 'note-text', note.text), status);
    container.append(card);
  }
  if (!state.notes.length) container.append(element('p', 'empty-message', 'No notes yet. Choose “Add note” beneath the preview, then point to a detail in the frame.'));
  renderPins();
  updateControls();
}

function renderHistory() {
  const container = $('#history-list');
  container.replaceChildren();
  for (const revision of state.revisions) {
    const card = element('article', 'history-card');
    const date = new Date(revision.createdAt);
    card.append(element('strong', '', revision.message || 'Saved revision'), element('p', '', `${Number.isNaN(date.getTime()) ? 'Saved version' : date.toLocaleString()} · ${revision.fileCount ?? '—'} files${revision.restoredAt ? ' · restored' : ''}`));
    const restore = element('button', 'quiet', 'Restore version');
    restore.addEventListener('click', () => runOperation(async () => { await api('/api/undo', { id: revision.id }); await loadProject(); notice('Earlier source and assets restored.'); }));
    card.append(restore);
    container.append(card);
  }
  if (!state.revisions.length) container.append(element('p', 'empty-message', 'Your first save starts the history. Each version preserves your film’s source and assets.'));
  updateControls();
}

async function refreshNotes() {
  const result = await api('/api/notes');
  const notes = Array.isArray(result) ? result : result.notes || [];
  if (JSON.stringify(notes) !== JSON.stringify(state.notes) || !$('#notes-list').children.length) { state.notes = notes; renderNotes(); }
}

async function refreshHistory() {
  const result = await api('/api/history');
  const revisions = Array.isArray(result) ? result : result.history || [];
  if (JSON.stringify(revisions) !== JSON.stringify(state.revisions) || !$('#history-list').children.length) { state.revisions = revisions; renderHistory(); }
}

async function loadFrame() {
  const generation = ++state.generation;
  state.film = null;
  state.queuedTime = null;
  pause();
  updateControls();
  $('#preview-status').textContent = 'Loading';
  $('#stage-empty').hidden = false;
  const frame = $('#film');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Film preview did not load')), 12000);
    frame.onload = () => { clearTimeout(timer); resolve(); };
    frame.onerror = () => { clearTimeout(timer); reject(new Error('Film preview could not load')); };
    frame.src = `/film/?v=${encodeURIComponent(state.fingerprint)}`;
  });
  const deadline = performance.now() + 12000;
  while (!frame.contentWindow?.AAA) {
    if (performance.now() >= deadline) throw new Error('Film must expose window.AAA');
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  const film = frame.contentWindow.AAA;
  let readyTimer;
  try { await Promise.race([Promise.resolve(film.ready), new Promise((_, reject) => { readyTimer = setTimeout(() => reject(new Error('Film readiness timed out')), 12000); })]); }
  finally { clearTimeout(readyTimer); }
  const description = await film.describe();
  if (generation !== state.generation) return;
  if (![description.width, description.height, description.duration, description.fps].every((number) => Number.isFinite(number) && number > 0) || typeof film.render !== 'function') throw new Error('Film returned an invalid browser description');
  state.film = film;
  state.description = description;
  state.rendering = false;
  $('#frame-size').textContent = `${description.width} × ${description.height} · ${description.fps} fps · ${$('#preview-audio').hasAttribute('src') ? 'Sound on' : 'Silent'}`;
  $('#duration').textContent = formatTime(description.duration);
  $('#timeline-end').textContent = formatTime(description.duration).slice(0, -3);
  $('#scrubber').max = description.duration;
  $('#scrubber').step = 1 / description.fps;
  fitFrame();
  renderScenes();
  renderParameters();
  await seek(Math.min(state.time, description.duration));
  $('#stage-empty').hidden = true;
  $('#preview-status').textContent = 'Ready';
  updateControls();
}

async function prepareAudio(prepared) {
  const audio = $('#preview-audio');
  pause();
  audio.removeAttribute('src');
  audio.load();
  if (!prepared.audio?.url) return;
  const url = new URL(prepared.audio.url, window.location.origin);
  if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('Prepared soundtrack must use the local project server');
  url.searchParams.set('v', prepared.fingerprint || String(Date.now()));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Soundtrack could not load in time')), 15000);
    const loaded = () => finish();
    const failed = () => finish(new Error('Prepared soundtrack could not be decoded'));
    function finish(error) {
      clearTimeout(timer);
      audio.removeEventListener('canplay', loaded);
      audio.removeEventListener('error', failed);
      if (error) reject(error); else resolve();
    }
    audio.addEventListener('canplay', loaded, { once: true });
    audio.addEventListener('error', failed, { once: true });
    audio.src = url.href;
    audio.load();
  });
}

async function loadProject() {
  cancelNote();
  pause();
  state.generation++;
  state.film = null;
  state.queuedTime = null;
  updateControls();
  $('#preview-status').textContent = 'Preparing';
  const prepared = await api('/api/prepare', {});
  const project = await api('/api/project');
  if (prepared.fingerprint && project.fingerprint !== prepared.fingerprint) throw new Error('Project changed while preparing the preview. Reload the project.');
  await prepareAudio(prepared);
  if (!project.config || typeof project.fingerprint !== 'string') throw new Error('Project response is missing its configuration or fingerprint');
  state.config = project.config;
  state.draft = structuredClone(project.config);
  state.fingerprint = project.fingerprint;
  state.dirty = false;
  $('#project-name').textContent = project.config.title || 'Untitled film';
  $('#project-meta').textContent = `${project.config.style || 'Custom film'} · ${project.config.duration}s`;
  document.title = `${project.config.title || 'Untitled film'} · Studio`;
  fitFrame();
  await Promise.all([refreshNotes(), refreshHistory(), loadFrame()]);
}

async function runOperation(operation) {
  if (state.busy) return;
  state.busy = true;
  updateControls();
  try { await operation(); }
  catch (error) { notice(error.message, true); }
  finally { state.busy = false; updateControls(); }
}

async function deliver(kind) {
  return runOperation(async () => {
    pause();
    notice(kind === 'render' ? 'Rendering your film. You can continue reviewing frames.' : 'Preparing your export package.');
    const result = await api(`/api/${kind}`, {});
    const location = result.path || result.output || result.outputPath;
    const label = result.status === 'partial' ? 'Finished with details to review' : kind === 'render' ? 'Film rendered' : 'Export ready';
    notice(`${label}${typeof location === 'string' ? ` · ${location}` : '.'}`);
    if (typeof result.url === 'string') {
      const url = new URL(result.url, window.location.origin);
      if (url.origin === window.location.origin && ['http:', 'https:'].includes(url.protocol)) {
        const link = element('a', '', ' Open result'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener'; $('#notice').append(link);
      }
    }
  });
}

async function boot() {
  for (const name of ['parameters', 'notes', 'history']) $(`#tab-${name}`).addEventListener('click', () => selectTab(name));
  $('.inspector-tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['parameters', 'notes', 'history'];
    const current = tabs.findIndex((name) => $(`#tab-${name}`).getAttribute('aria-selected') === 'true');
    const next = tabs[(current + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
    selectTab(next); $(`#tab-${next}`).focus();
  });
  $('#play').addEventListener('click', play);
  $('#previous-frame').addEventListener('click', () => { pause(); void seek(state.time - 1 / state.description.fps); });
  $('#next-frame').addEventListener('click', () => { pause(); void seek(state.time + 1 / state.description.fps); });
  $('#scrubber').addEventListener('input', (event) => { pause(); void seek(Number(event.target.value)); });
  $('#add-note').addEventListener('click', () => setNoteMode(!state.noteMode));
  $('#note-overlay').addEventListener('click', (event) => { void chooseAnchor(event.clientX, event.clientY); });
  $('#note-overlay').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !state.noteMode) return;
    event.preventDefault(); const frame = $('#frame').getBoundingClientRect(); void chooseAnchor(frame.left + frame.width / 2, frame.top + frame.height / 2);
  });
  $('#cancel-note').addEventListener('click', cancelNote);
  $('#note-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.anchor) return;
    const button = $('#note-form button[type=submit]');
    button.disabled = true;
    try { await api('/api/notes', { ...state.anchor, text: $('#note-text').value }); cancelNote(); await refreshNotes(); notice('Note saved with its frame, position and scene.'); }
    catch (error) { notice(error.message, true); }
    finally { button.disabled = false; }
  });
  $('#parameters-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.dirty || !event.target.reportValidity()) return;
    void runOperation(async () => { await api('/api/save', { config: state.draft, expectedFingerprint: state.fingerprint }); await loadProject(); notice('Changes saved. Preview updated.'); });
  });
  $('#reload').addEventListener('click', () => runOperation(async () => { await loadProject(); notice('Project reloaded from disk.'); }));
  $('#undo').addEventListener('click', () => runOperation(async () => { await api('/api/undo', {}); await loadProject(); notice('Last save undone.'); }));
  $('#render').addEventListener('click', () => deliver('render'));
  $('#export').addEventListener('click', () => deliver('export'));
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,textarea,select,button,[contenteditable=true]') || !state.film) return;
    if (event.code === 'Space') { event.preventDefault(); play(); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); pause(); void seek(state.time + (event.key === 'ArrowRight' ? 1 : -1) / state.description.fps); }
    else if (event.key === 'Escape') cancelNote();
  });
  window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  new ResizeObserver(fitFrame).observe($('#stage'));
  state.busy = true;
  updateControls();
  try { await loadProject(); }
  catch (error) { $('#preview-status').textContent = 'Needs attention'; $('#stage-empty p').textContent = 'The film is not ready to preview.'; notice(error.message, true); }
  finally { state.busy = false; updateControls(); }
  setInterval(async () => {
    if (document.hidden || state.busy) return;
    try { await Promise.all([refreshNotes(), refreshHistory()]); }
    catch { $('#footer-state').textContent = 'Notes connection interrupted. Reload to reconnect.'; }
  }, 3000);
}

if (typeof document !== 'undefined') void boot();
