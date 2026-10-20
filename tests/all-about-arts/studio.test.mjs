import test from 'node:test';
import assert from 'node:assert/strict';
import { pointToProject, pickRegion, sceneAt, changeParameter } from '../../skills/all-about-arts/studio/studio.js';

test('note coordinates follow the film frame scale and smallest registered object', () => {
  const point = pointToProject(170, 120, { left: 10, top: 30, width: 320, height: 180 }, 1920, 1080);
  assert.deepEqual(point, { x: 960, y: 540 });
  const regions = [{ id: 'background', x: 0, y: 0, width: 1920, height: 1080 }, { id: 'title', scene: 'opening', x: 800, y: 450, width: 500, height: 150 }];
  assert.equal(pickRegion(regions, point)?.id, 'title');
  assert.equal(pickRegion([], point), null);
  assert.equal(pickRegion([{ id: 'invalid', x: 0, y: 0, width: -10, height: 10 }], point), null);
});

test('scene lookup chooses the following scene exactly at its boundary', () => {
  const scenes = [{ id: 'opening', start: 0, end: 3 }, { id: 'closing', start: 3, end: 6 }];
  assert.equal(sceneAt(scenes, 2.99)?.id, 'opening');
  assert.equal(sceneAt(scenes, 3)?.id, 'closing');
  assert.equal(sceneAt(scenes, 6)?.id, 'closing');
});

test('declared parameter edits retain config structure and reject unsafe or unknown paths', () => {
  const original = { content: { title: 'Before' }, scenes: [{ title: 'First' }], seed: 4 };
  const updated = changeParameter(original, { key: 'content.title', type: 'text' }, 'After');
  assert.equal(updated.content.title, 'After');
  assert.equal(original.content.title, 'Before');
  assert.equal(changeParameter(original, { key: 'scenes.0.title', type: 'string' }, 'Scene').scenes[0].title, 'Scene');
  assert.throws(() => changeParameter(original, { key: '__proto__.polluted', type: 'text' }, 'bad'));
  assert.throws(() => changeParameter(original, { key: 'content.missing', type: 'text' }, 'bad'));
  assert.throws(() => changeParameter(original, { key: 'seed', type: 'number', min: 0, max: 10 }, 11));
  assert.throws(() => changeParameter(original, { key: 'seed', type: 'number' }, '7'));
});
