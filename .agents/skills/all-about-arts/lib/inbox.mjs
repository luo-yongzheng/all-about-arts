import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicJSON, readJSON, stateDirectory, stateError, withStateLock } from './studio-state.mjs';

const statuses = new Set(['open', 'in_progress', 'done']);
const inputKeys = new Set(['text', 't', 'x', 'y', 'scene', 'objectId']);

function validateNote(input, { stored = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw stateError('Note must be an object');
  if (!stored && Object.keys(input).some((key) => !inputKeys.has(key))) throw stateError('Note contains an unsupported field');
  if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 10000) throw stateError('Note text must contain 1–10000 characters');
  for (const key of ['t', 'x', 'y']) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0) throw stateError(`Note ${key} must be a finite nonnegative number`);
  }
  for (const key of ['scene', 'objectId']) {
    if (input[key] != null && (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 256)) throw stateError(`Note ${key} must be a nonempty string or null`);
  }
  if (stored && (typeof input.id !== 'string' || !input.id || !statuses.has(input.status) || typeof input.createdAt !== 'string' || typeof input.updatedAt !== 'string')) throw stateError('Invalid stored note');
  return { text: input.text.trim(), t: input.t, x: input.x, y: input.y, scene: input.scene ?? null, objectId: input.objectId ?? null };
}

async function readNotes(state) {
  const data = await readJSON(join(state, 'inbox.json'), { schemaVersion: 1, notes: [] }, 'inbox');
  try {
    if (data?.schemaVersion !== 1 || !Array.isArray(data.notes)) throw new Error('Unsupported format');
    const ids = new Set();
    for (const note of data.notes) {
      validateNote(note, { stored: true });
      if (ids.has(note.id)) throw new Error('Duplicate note ID');
      ids.add(note.id);
    }
  } catch (error) { throw stateError(`Cannot read inbox: ${error.message}`, 500); }
  return data.notes;
}

export async function listInbox(project) {
  return readNotes(await stateDirectory(project));
}

export async function addNote(project, input) {
  const clean = validateNote(input);
  return withStateLock(project, 'inbox', async (state) => {
    const notes = await readNotes(state);
    const at = new Date().toISOString();
    const note = { id: randomUUID(), ...clean, status: 'open', createdAt: at, updatedAt: at };
    notes.push(note);
    await atomicJSON(join(state, 'inbox.json'), { schemaVersion: 1, notes });
    return note;
  });
}

export async function updateNote(project, id, status) {
  if (typeof id !== 'string' || !id || id.length > 256) throw stateError('A note ID is required');
  if (!statuses.has(status)) throw stateError('Note status must be open, in_progress, or done');
  return withStateLock(project, 'inbox', async (state) => {
    const notes = await readNotes(state);
    const note = notes.find((item) => item.id === id);
    if (!note) throw stateError(`Note ${id} not found`, 404);
    Object.assign(note, { status, updatedAt: new Date().toISOString() });
    await atomicJSON(join(state, 'inbox.json'), { schemaVersion: 1, notes });
    return note;
  });
}
