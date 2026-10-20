import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { listInbox, addNote, updateNote } from '../../skills/all-about-arts/lib/inbox.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'AAA 笔记 project '));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const input = { text: 'Make this title brighter', t: 2.5, x: 125, y: 250, scene: 'opening', objectId: 'title' };

test('inbox retains time, project coordinates, scene and object with durable status updates', async (t) => {
  const root = await fixture(t);
  assert.deepEqual(await listInbox(root), []);
  const note = await addNote(root, { ...input, text: '  Make this title brighter  ' });
  assert.equal(note.status, 'open');
  for (const [key, value] of Object.entries(input)) assert.equal(note[key], value);
  assert.equal((await updateNote(root, note.id, 'in_progress')).status, 'in_progress');
  assert.equal((await updateNote(root, note.id, 'done')).status, 'done');
  assert.equal((await listInbox(root))[0].status, 'done');
  const fallback = await addNote(root, { ...input, scene: null, objectId: null });
  assert.equal(fallback.objectId, null);
  assert.equal(fallback.x, 125);
});

test('inbox rejects malformed notes and unsupported states without overwriting valid notes', async (t) => {
  const root = await fixture(t);
  const note = await addNote(root, input);
  for (const invalid of [{ text: '' }, { t: '2' }, { t: -1 }, { x: Infinity }, { y: null }, { objectId: {} }, { scene: 7 }, { status: 'done' }, { text: 'x'.repeat(10001) }]) {
    await assert.rejects(addNote(root, { ...input, ...invalid }));
  }
  await assert.rejects(updateNote(root, note.id, 'cancelled'), /status/i);
  await assert.rejects(updateNote(root, 'missing', 'done'), /not found/i);
  assert.equal((await listInbox(root)).length, 1);
  assert.equal((await listInbox(root))[0].status, 'open');
});

test('parallel processes cannot lose notes or produce torn JSON', async (t) => {
  const root = await fixture(t);
  const moduleURL = new URL('../../skills/all-about-arts/lib/inbox.mjs', import.meta.url).href;
  const script = `import { addNote } from ${JSON.stringify(moduleURL)}; for (let i = 0; i < 12; i++) await addNote(process.argv[1], {text: process.argv[2] + i, t: i, x: i, y: i, scene: null, objectId: null});`;
  const run = (prefix) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script, root, prefix]);
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr)));
  });
  await Promise.all([run('first-'), run('second-'), run('third-')]);
  const notes = await listInbox(root);
  assert.equal(notes.length, 36);
  assert.equal(new Set(notes.map((note) => note.text)).size, 36);
  assert.equal(new Set(notes.map((note) => note.id)).size, 36);
  const stored = await readFile(join(root, '.aaa/state/inbox.json'), 'utf8');
  assert.doesNotThrow(() => JSON.parse(stored));
});

test('corrupt inbox fails visibly and never silently discards existing data', async (t) => {
  const root = await fixture(t);
  await addNote(root, input);
  const path = join(root, '.aaa/state/inbox.json');
  await writeFile(path, '{broken');
  await assert.rejects(listInbox(root), /inbox/i);
  await assert.rejects(addNote(root, input), /inbox/i);
  assert.equal(await readFile(path, 'utf8'), '{broken');
});

test('inbox rejects a state-directory symlink', async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, '.aaa'));
  await mkdir(join(root, 'outside'));
  await symlink(join(root, 'outside'), join(root, '.aaa/state'));
  await assert.rejects(addNote(root, input), /symbolic link/i);
});
