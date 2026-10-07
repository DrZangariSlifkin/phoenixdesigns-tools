const STORAGE_KEY = 'phoenix-activity-picker-v1';

const DEFAULT_ACTIVITIES = [
  'Play PS5',
  'Read',
  'Paint',
  'Computer stuff'
];

const ROTATION_START = Date.UTC(2026, 9, 7);

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `activity-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

const makeDefaults = () =>
  DEFAULT_ACTIVITIES.map((name) => ({
    id: createId(),
    name
  }));

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (
      saved &&
      Array.isArray(saved.activities) &&
      Array.isArray(saved.remainingIds)
    ) {
      return {
        activities: saved.activities.filter(
          (item) => item?.id && item?.name
        ),
        remainingIds: saved.remainingIds,
        currentId: saved.currentId || null,
        lastPickedId: saved.lastPickedId || null
      };
    }
  } catch (error) {
    console.warn('Could not load saved activities.', error);
  }

  const activities = makeDefaults();

  return {
    activities,
    remainingIds: activities.map((item) => item.id),
    currentId: null,
    lastPickedId: null
  };
}

let state = loadState();
let editingId = null;
let surpriseId = null;
let displayedDate = getDateKey();

const result = document.querySelector('#result');
const remaining = document.querySelector('#remaining');
const pickButton = document.querySelector('#pick-button');
const addForm = document.querySelector('#add-form');
const activityInput = document.querySelector('#activity-input');
const activityList = document.querySelector('#activity-list');
const emptyMessage = document.querySelector('#empty-message');
const syncStatus = document.querySelector('#sync-status');

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setSyncStatus(message, stateName) {
  syncStatus.textContent = message;
  syncStatus.dataset.state = stateName;
}

async function syncState() {
  setSyncStatus('Saving shared list...', 'working');

  try {
    const response = await fetch('/api/activity-picker', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state)
    });

    if (!response.ok) {
      throw new Error(
        `Save failed with status ${response.status}`
      );
    }

    setSyncStatus('Synced across devices', 'synced');
  } catch (error) {
    console.warn('Could not sync activity data.', error);

    setSyncStatus(
      'Saved in this browser; cloud sync unavailable',
      'offline'
    );
  }
}

function saveAndSync() {
  saveState();
  void syncState();
}

function getDateKey() {
  const now = new Date();

  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function rotationActivity(dayOffset = 0) {
  const activities = [...state.activities].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (!activities.length) {
    return null;
  }

  const now = new Date();

  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const daysSinceStart =
    Math.floor((today - ROTATION_START) / 86400000) +
    dayOffset;

  const index =
    ((daysSinceStart % activities.length) +
      activities.length) %
    activities.length;

  return activities[index];
}

function surpriseActivity() {
  return state.activities.find(
    (activity) => activity.id === surpriseId
  );
}

function renderResult() {
  const scheduled = rotationActivity();
  const surprise = surpriseActivity();
  const shown = surprise || scheduled;

  result.textContent = shown
    ? shown.name
    : 'Add an activity to begin the rotation.';

  result.classList.toggle('has-pick', Boolean(shown));

  pickButton.textContent = surprise
    ? 'Pick Another Surprise'
    : 'Surprise Me Instead';

  pickButton.disabled = state.activities.length < 2;
}

function renderRemaining() {
  const tomorrow = rotationActivity(1);

  if (!tomorrow) {
    remaining.textContent = 'Add an activity to get started.';
    return;
  }

  remaining.textContent = `Tomorrow: ${tomorrow.name}`;
}

function makeActivityRow(activity) {
  const item = document.createElement('li');
  item.dataset.id = activity.id;

  if (editingId === activity.id) {
    const form = document.createElement('form');
    form.className = 'edit-form';

    const input = document.createElement('input');
    input.value = activity.name;
    input.maxLength = 80;
    input.required = true;
    input.setAttribute('aria-label', 'Activity name');

    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = 'Save';

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'secondary';
    cancel.textContent = 'Cancel';

    cancel.addEventListener('click', () => {
      editingId = null;
      renderList();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = input.value.trim();

      if (!name) {
        return;
      }

      activity.name = name;
      editingId = null;

      saveAndSync();
      render();
    });

    form.append(input, save, cancel);
    item.append(form);

    requestAnimationFrame(() => input.focus());

    return item;
  }

  const name = document.createElement('span');
  name.textContent = activity.name;

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'text-button';
  edit.textContent = 'Edit';

  edit.addEventListener('click', () => {
    editingId = activity.id;
    renderList();
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'text-button danger';
  remove.textContent = 'Remove';

  remove.addEventListener('click', () => {
    removeActivity(activity.id);
  });

  actions.append(edit, remove);
  item.append(name, actions);

  return item;
}

function renderList() {
  const rows = state.activities.map(makeActivityRow);

  activityList.replaceChildren(...rows);
  emptyMessage.hidden = state.activities.length > 0;
}

function render() {
  renderResult();
  renderRemaining();
  renderList();
}

function pickActivity() {
  const scheduled = rotationActivity();

  const eligibleIds = state.activities
    .map((activity) => activity.id)
    .filter((id) => id !== scheduled?.id);

  if (!eligibleIds.length) {
    return;
  }

  const next = ActivityPickerCore.pickNext(
    eligibleIds,
    state.remainingIds,
    surpriseId
  );

  surpriseId = next.pickedId;
  state.lastPickedId = next.pickedId;
  state.remainingIds = next.remainingIds;
  state.currentId = null;

  saveAndSync();
  render();
}

function removeActivity(id) {
  state.activities = state.activities.filter(
    (item) => item.id !== id
  );

  state.remainingIds = state.remainingIds.filter(
    (itemId) => itemId !== id
  );

  if (state.currentId === id) {
    state.currentId = null;
  }

  if (state.lastPickedId === id) {
    state.lastPickedId = null;
  }

  if (surpriseId === id) {
    surpriseId = null;
  }

  saveAndSync();
  render();
}

function checkForNewDay() {
  const currentDate = getDateKey();

  if (currentDate === displayedDate) {
    return;
  }

  displayedDate = currentDate;
  surpriseId = null;
  render();
}

pickButton.addEventListener('click', pickActivity);

addForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = activityInput.value.trim();

  if (!name) {
    return;
  }

  const activity = {
    id: createId(),
    name
  };

  state.activities.push(activity);
  state.remainingIds.push(activity.id);

  activityInput.value = '';

  saveAndSync();
  render();
  activityInput.focus();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    checkForNewDay();
  }
});

setInterval(checkForNewDay, 60000);

render();

async function loadSharedState() {
  setSyncStatus('Loading shared list...', 'working');

  try {
    const response = await fetch('/api/activity-picker', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `Load failed with status ${response.status}`
      );
    }

    const sharedState = await response.json();

    if (
      !sharedState ||
      !Array.isArray(sharedState.activities) ||
      !Array.isArray(sharedState.remainingIds)
    ) {
      throw new Error(
        'Shared state has an invalid format.'
      );
    }

    state = sharedState;
    surpriseId = null;

    saveState();
    render();

    setSyncStatus(
      'Synced across devices',
      'synced'
    );
  } catch (error) {
    console.warn(
      'Could not load shared activity data.',
      error
    );

    setSyncStatus(
      'Saved in this browser; cloud sync unavailable',
      'offline'
    );
  }
}

void loadSharedState();
