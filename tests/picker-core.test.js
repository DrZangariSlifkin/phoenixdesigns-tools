const assert = require('node:assert/strict');
const test = require('node:test');
const { makeBag, pickNext } = require('../activity-picker/picker-core.js');

test('each activity is picked once before the bag refills', () => {
  const ids = ['a', 'b', 'c'];
  let remaining = [...ids];
  const picks = [];
  for (let index = 0; index < ids.length; index += 1) {
    const next = pickNext(ids, remaining, picks.at(-1), () => 0.5);
    picks.push(next.pickedId);
    remaining = next.remainingIds;
  }
  assert.equal(new Set(picks).size, 3);
  assert.equal(remaining.length, 0);
});

test('an empty bag reshuffles all current activities', () => {
  const next = pickNext(['a', 'b'], [], 'a', () => 0);
  assert.ok(['a', 'b'].includes(next.pickedId));
  assert.equal(next.remainingIds.length, 1);
});

test('a fresh bag avoids repeating the previous pick first', () => {
  const bag = makeBag(['a', 'b', 'c'], 'a', () => 0.9);
  assert.notEqual(bag.at(-1), 'a');
});

test('removed activities are discarded from a saved bag', () => {
  const next = pickNext(['a', 'c'], ['a', 'b', 'c'], null, () => 0.5);
  assert.notEqual(next.pickedId, 'b');
  assert.ok(!next.remainingIds.includes('b'));
});
