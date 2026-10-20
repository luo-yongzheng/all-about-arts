import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot, undo, history } from '../../skills/all-about-arts/lib/history.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'AAA 历史 project '));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['assets', 'src', 'out', '.aaa/runtime', '.aaa/state', 'node_modules/pkg', '.git']) await mkdir(join(root, dir), { recursive: true });
  for (const [path, content] of Object.entries({ 'aaa.json': '{"title":"First"}', 'film.mjs': 'export const version = 1;', 'src/标题.txt': 'original title', 'assets/纹理.png': 'binary asset', 'out/film.mp4': 'render output', '.aaa/runtime/film.mjs': 'runtime copy', '.aaa/state/inbox.json': 'inbox state', 'node_modules/pkg/index.js': 'dependency', '.git/config': 'git metadata' })) await writeFile(join(root, path), content);
  return root;
}

test('undo restores changed and deleted source/assets while preserving generated output and state', async (t) => {
  const root = await fixture(t);
  const first = await snapshot(root, { message: 'Before title edit' });
  await writeFile(join(root, 'aaa.json'), '{"title":"Changed"}');
  await writeFile(join(root, 'film.mjs'), 'export const version = 2;');
  await writeFile(join(root, '.aaa/runtime/film.mjs'), 'custom runtime edit');
  await rm(join(root, 'src/标题.txt'));
  await writeFile(join(root, 'assets/纹理.png'), 'new asset');
  await writeFile(join(root, 'src/added.mjs'), 'new source');
  await writeFile(join(root, 'out/film.mp4'), 'latest render');
  await writeFile(join(root, '.aaa/state/inbox.json'), 'latest notes');
  const result = await undo(root);
  assert.equal(result.id, first.id);
  assert.equal(await readFile(join(root, 'aaa.json'), 'utf8'), '{"title":"First"}');
  assert.equal(await readFile(join(root, 'film.mjs'), 'utf8'), 'export const version = 1;');
  assert.equal(await readFile(join(root, 'src/标题.txt'), 'utf8'), 'original title');
  assert.equal(await readFile(join(root, 'assets/纹理.png'), 'utf8'), 'binary asset');
  await assert.rejects(readFile(join(root, 'src/added.mjs')), { code: 'ENOENT' });
  assert.equal(await readFile(join(root, 'out/film.mp4'), 'utf8'), 'latest render');
  assert.equal(await readFile(join(root, '.aaa/state/inbox.json'), 'utf8'), 'latest notes');
  assert.equal(await readFile(join(root, '.aaa/runtime/film.mjs'), 'utf8'), 'runtime copy');
  assert.equal(first.fileCount, 5);
});

test('content-addressed snapshots deduplicate assets and repeated undo walks backward', async (t) => {
  const root = await fixture(t);
  const first = await snapshot(root, { message: 'First' });
  await writeFile(join(root, 'aaa.json'), '{"title":"Second"}');
  const second = await snapshot(root, { message: 'Second' });
  await writeFile(join(root, 'aaa.json'), '{"title":"Third"}');
  assert.equal((await history(root))[0].id, second.id);
  assert.equal((await readdir(join(root, '.aaa/state/history/blobs'))).length, 6);
  assert.equal((await undo(root)).id, second.id);
  assert.equal(await readFile(join(root, 'aaa.json'), 'utf8'), '{"title":"Second"}');
  assert.equal((await undo(root)).id, first.id);
  assert.equal(await readFile(join(root, 'aaa.json'), 'utf8'), '{"title":"First"}');
  await assert.rejects(undo(root), /No snapshot/);
  await undo(root, { id: second.id });
  assert.equal(await readFile(join(root, 'aaa.json'), 'utf8'), '{"title":"Second"}');
});

test('restore rejects modified blob content before changing any source', async (t) => {
  const root = await fixture(t);
  const saved = await snapshot(root);
  await writeFile(join(root, 'film.mjs'), 'current source');
  for (const blob of await readdir(join(root, '.aaa/state/history/blobs'))) await writeFile(join(root, '.aaa/state/history/blobs', blob), 'tampered');
  await assert.rejects(undo(root, { id: saved.id }), /integrity|hash/i);
  assert.equal(await readFile(join(root, 'film.mjs'), 'utf8'), 'current source');
});

test('snapshot rejects symlinked source and state instead of reading or writing outside the project', async (t) => {
  const root = await fixture(t);
  await symlink(join(root, 'out'), join(root, 'src/link'));
  await assert.rejects(snapshot(root), /symbolic link/i);
  await rm(join(root, 'src/link'));
  await rm(join(root, '.aaa/state'), { recursive: true });
  await symlink(join(root, 'out'), join(root, '.aaa/state'));
  await assert.rejects(snapshot(root), /symbolic link/i);
  assert.deepEqual(await readdir(join(root, 'out')), ['film.mp4']);
});

test('concurrent snapshots retain all history entries', async (t) => {
  const root = await fixture(t);
  await Promise.all(Array.from({ length: 8 }, (_, index) => snapshot(root, { message: `Save ${index}` })));
  assert.equal((await history(root)).length, 8);
});

test('restore handles a source path changing between a file and a directory', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'component'), 'original file');
  const first = await snapshot(root);
  await rm(join(root, 'component'));
  await mkdir(join(root, 'component'));
  await writeFile(join(root, 'component/child.mjs'), 'child');
  const second = await snapshot(root);
  await undo(root, { id: first.id });
  assert.equal(await readFile(join(root, 'component'), 'utf8'), 'original file');
  await undo(root, { id: second.id });
  assert.equal(await readFile(join(root, 'component/child.mjs'), 'utf8'), 'child');
});

test('restore refuses a conflicting output directory before deleting any source', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'component'), 'original file');
  const first = await snapshot(root);
  await rm(join(root, 'component'));
  await mkdir(join(root, 'component/out'), { recursive: true });
  await writeFile(join(root, 'component/out/keep.mp4'), 'keep output');
  await writeFile(join(root, 'component/child.mjs'), 'keep source if restore fails');
  await assert.rejects(undo(root, { id: first.id }), /preserved directory/i);
  assert.equal(await readFile(join(root, 'component/child.mjs'), 'utf8'), 'keep source if restore fails');
  assert.equal(await readFile(join(root, 'component/out/keep.mp4'), 'utf8'), 'keep output');
});

test('restore rejects a manifest attempting to replace state', async (t) => {
  const root = await fixture(t);
  const first = await snapshot(root);
  const path = join(root, '.aaa/state/history/index.json');
  const index = JSON.parse(await readFile(path, 'utf8'));
  index.snapshots[0].files[0].path = '.aaa/state/inbox.json';
  await writeFile(path, JSON.stringify(index));
  await assert.rejects(undo(root, { id: first.id }), /Invalid source path/);
  assert.equal(await readFile(join(root, '.aaa/state/inbox.json'), 'utf8'), 'inbox state');
});
