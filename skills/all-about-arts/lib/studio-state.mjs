import { lstat, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export function stateError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export function projectRoot(project) {
  const root = typeof project === 'string' ? project : project?.root;
  if (typeof root !== 'string' || !root) throw stateError('A project directory is required');
  return resolve(root);
}

export async function checkedPath(path, { directory = false, optional = false } = {}) {
  let stat;
  try { stat = await lstat(path); }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
  if (stat.isSymbolicLink()) throw stateError(`Refusing symbolic link: ${path}`);
  if (directory ? !stat.isDirectory() : !stat.isFile()) throw stateError(`Unexpected file type: ${path}`);
  return stat;
}

export async function stateDirectory(project) {
  const root = projectRoot(project);
  await checkedPath(root, { directory: true });
  let current = root;
  for (const part of ['.aaa', 'state']) {
    current = join(current, part);
    if (!(await checkedPath(current, { directory: true, optional: true }))) {
      try { await mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      await checkedPath(current, { directory: true });
    }
  }
  return current;
}

export async function atomicJSON(path, value) {
  await checkedPath(path, { optional: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`);
    await handle.sync();
  } finally { await handle.close(); }
  try { await rename(temp, path); } finally { await rm(temp, { force: true }); }
}

export async function readJSON(path, fallback, label) {
  if (!(await checkedPath(path, { optional: true }))) return fallback;
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw stateError(`Cannot read ${label}: ${error.message}`, 500); }
}

// Exclusive create works across independent CLI/server processes. A live lock is
// never stolen; a crashed writer leaves a visible, actionable timeout instead.
export async function withStateLock(project, name, operation) {
  const state = await stateDirectory(project);
  const path = join(state, `${name}.lock`);
  const deadline = Date.now() + 10000;
  let handle;
  while (!handle) {
    try { handle = await open(path, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw stateError(`${name} is locked by another operation. If its process stopped, remove ${path} and retry.`, 409);
      await delay(15);
    }
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    return await operation(state);
  } finally {
    await handle.close();
    await rm(path, { force: true });
  }
}
