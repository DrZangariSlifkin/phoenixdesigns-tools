import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState, validateState } from '../cloudflare-worker/activity-picker.mjs';

test('shared state starts with Nathanael\'s four activities', () => {
  assert.deepEqual(defaultState().activities.map((item) => item.name), [
    'Play PS5', 'Read', 'Paint', 'Computer stuff'
  ]);
});

test('shared state validation removes stale bag entries', () => {
  const state = validateState({
    activities: [{ id: 'read', name: 'Read' }],
    remainingIds: ['deleted', 'read'],
    currentId: 'deleted',
    lastPickedId: null
  });
  assert.deepEqual(state.remainingIds, ['read']);
  assert.equal(state.currentId, null);
});

test('shared state validation rejects duplicate activity IDs', () => {
  assert.equal(validateState({
    activities: [{ id: 'same', name: 'Read' }, { id: 'same', name: 'Paint' }],
    remainingIds: [],
    currentId: null,
    lastPickedId: null
  }), null);
});
