import { lstat, mkdir, open, readFile, readdir, rename, rm, rmdir, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { atomicJSON, checkedPath, projectRoot, readJSON, stateDirectory, stateError, withStateLock } from './studio-state.mjs';

const omitted = new Set(['.git', 'node_modules', 'out']);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-f0-9-]{36}$/;

function sourcePath(path) {
  if (typeof path !== 'string' || !path || path === '.aaa/state' || path.startsWith('.aaa/state/') || path.includes('\\') || path.includes('\0') || path.split('/').some((part) => !part || part === '.' || part === '..' || omitted.has(part)) || /^[a-z]:/i.test(path)) throw stateError('Invalid source path in snapshot');
  return path;
}

async function directories(state) {
  const history = join(state, 'history');
  for (const path of [history, join(history, 'blobs')]) {
    if (!(await checkedPath(path, { directory: true, optional: true }))) {
      try { await mkdir(path); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      await checkedPath(path, { directory: true });
    }
  }
  return history;
}

async function readIndex(directory) {
  const index = await readJSON(join(directory, 'index.json'), { schemaVersion: 1, snapshots: [] }, 'history');
  if (index?.schemaVersion !== 1 || !Array.isArray(index.snapshots)) throw stateError('Invalid history format', 500);
  const ids = new Set();
  for (const entry of index.snapshots) {
    if (!idPattern.test(entry.id) || ids.has(entry.id) || !Array.isArray(entry.files) || typeof entry.createdAt !== 'string' || !digestPattern.test(entry.fingerprint)) throw stateError('Invalid history snapshot', 500);
    ids.add(entry.id);
    const paths = new Set();
    for (const file of entry.files) {
      sourcePath(file.path);
      if (paths.has(file.path) || !digestPattern.test(file.hash) || !Number.isInteger(file.mode) || file.mode < 0 || file.mode > 0o777 || !Number.isInteger(file.size) || file.size < 0) throw stateError('Invalid history file', 500);
      paths.add(file.path);
    }
    for (const path of paths) {
      let parent = dirname(path);
      while (parent !== '.') {
        if (paths.has(parent)) throw stateError('Conflicting source paths in snapshot', 500);
        parent = dirname(parent);
      }
    }
  }
  return index;
}

async function sourceFiles(root, relative = '') {
  const files = [];
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    if (omitted.has(entry.name) || (relative === '.aaa' && entry.name === 'state')) continue;
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    sourcePath(path);
    if (entry.isSymbolicLink()) throw stateError(`Refusing symbolic link in source: ${path}`);
    if (entry.isDirectory()) files.push(...await sourceFiles(root, path));
    else if (entry.isFile()) files.push(path);
    else throw stateError(`Unsupported source file type: ${path}`);
  }
  return files;
}

function summary(entry) {
  const { files, ...metadata } = entry;
  return { ...metadata, fileCount: files.length };
}

export async function snapshot(project, { message = 'Saved revision' } = {}) {
  if (typeof message !== 'string' || message.length > 1000) throw stateError('Snapshot message must be at most 1000 characters');
  const root = projectRoot(project);
  return withStateLock(root, 'history', async (state) => {
    const directory = await directories(state);
    const index = await readIndex(directory);
    const files = [];
    for (const path of await sourceFiles(root)) {
      const stat = await checkedPath(join(root, path));
      const content = await readFile(join(root, path));
      const digest = hash(content);
      const blobPath = join(directory, 'blobs', digest);
      if (!(await checkedPath(blobPath, { optional: true }))) {
        const handle = await open(blobPath, 'wx', 0o600);
        try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
      } else if (hash(await readFile(blobPath)) !== digest) throw stateError(`Snapshot blob integrity check failed: ${digest}`, 500);
      files.push({ path, hash: digest, mode: stat.mode & 0o777, size: content.length });
    }
    const entry = { id: randomUUID(), createdAt: new Date().toISOString(), message, fingerprint: hash(JSON.stringify(files)), files };
    index.snapshots.push(entry);
    await atomicJSON(join(directory, 'index.json'), index);
    return summary(entry);
  });
}

export async function history(project) {
  const directory = await directories(await stateDirectory(project));
  return (await readIndex(directory)).snapshots.slice().reverse().map(summary);
}

export async function undo(project, { id } = {}) {
  if (id != null && (typeof id !== 'string' || !idPattern.test(id))) throw stateError('Invalid snapshot ID');
  const root = projectRoot(project);
  return withStateLock(root, 'history', async (state) => {
    const directory = await directories(state);
    const index = await readIndex(directory);
    const entry = id ? index.snapshots.find((item) => item.id === id) : index.snapshots.findLast((item) => !item.restoredAt);
    if (!entry) throw stateError(id ? 'Snapshot not found' : 'No snapshot available to undo', 404);
    // Preflight every blob and every current path before the first source change.
    const contents = new Map();
    for (const file of entry.files) {
      const blob = join(directory, 'blobs', file.hash);
      await checkedPath(blob);
      const content = await readFile(blob);
      if (hash(content) !== file.hash || content.length !== file.size) throw stateError(`Snapshot blob integrity check failed: ${file.path}`, 500);
      contents.set(file.path, content);
    }
    const current = await sourceFiles(root);
    const wanted = new Set(entry.files.map((file) => file.path));
    const directoryConflicts = new Set();
    const checkDirectoryConflict = async (relative) => {
      for (const child of await readdir(join(root, relative), { withFileTypes: true })) {
        const childPath = `${relative}/${child.name}`;
        if (omitted.has(child.name) || childPath === '.aaa/state') throw stateError(`Cannot restore ${relative}: it contains a preserved directory`);
        if (child.isDirectory()) await checkDirectoryConflict(childPath);
      }
      directoryConflicts.add(relative);
    };
    for (const path of wanted) {
      const stat = await lstat(join(root, path)).catch((error) => { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; });
      if (stat?.isDirectory()) await checkDirectoryConflict(path);
    }
    const removed = current.filter((path) => !wanted.has(path));
    for (const path of removed) await rm(join(root, path));
    // Remove only empty source directories, never excluded output/state trees.
    const parents = new Set(directoryConflicts);
    for (const path of removed) {
      let parent = dirname(path);
      while (parent !== '.') { parents.add(parent); parent = dirname(parent); }
    }
    for (const parent of [...parents].sort((a, b) => b.length - a.length)) {
      try { await rmdir(join(root, parent)); } catch (error) { if (!['ENOTEMPTY', 'ENOENT'].includes(error.code)) throw error; }
    }
    for (const file of entry.files) {
      const path = join(root, file.path);
      const existing = await lstat(path).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
      if (existing?.isDirectory()) await rmdir(path);
      await mkdir(dirname(path), { recursive: true });
      const temp = join(dirname(path), `.aaa-restore-${randomUUID()}`);
      const handle = await open(temp, 'wx', file.mode);
      try { await handle.writeFile(contents.get(file.path)); await handle.sync(); } finally { await handle.close(); }
      try { await rename(temp, path); await chmod(path, file.mode); } finally { await rm(temp, { force: true }); }
    }
    entry.restoredAt = new Date().toISOString();
    await atomicJSON(join(directory, 'index.json'), index);
    return summary(entry);
  });
}
