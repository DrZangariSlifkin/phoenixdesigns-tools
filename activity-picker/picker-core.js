(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ActivityPickerCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function makeBag(activityIds, previousId, random = Math.random) {
    const bag = shuffle(activityIds, random);
    if (bag.length > 1 && bag[bag.length - 1] === previousId) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    return bag;
  }

  function pickNext(activityIds, remainingIds, previousId, random = Math.random) {
    if (!activityIds.length) return { pickedId: null, remainingIds: [] };
    const validIds = new Set(activityIds);
    let bag = remainingIds.filter((id) => validIds.has(id));
    if (!bag.length) bag = makeBag(activityIds, previousId, random);
    const pickedId = bag.pop();
    return { pickedId, remainingIds: bag };
  }

  return { shuffle, makeBag, pickNext };
});
