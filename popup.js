const STORAGE_KEYS = {
  username: 'cfUsername',
  stats: 'cfStreakStats',
  lastUpdated: 'cfLastUpdated',
  error: 'cfError',
};

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatUpdated(isoString) {
  if (!isoString) return 'Never updated';
  return `Updated ${new Date(isoString).toLocaleString()}`;
}

function statusText(stats) {
  if (stats.solvedToday) return '✅ Today completed';
  if (stats.solvedYesterday) return '⚠️ Do a problem today to keep streak alive';
  return '❌ Streak currently broken';
}

async function loadPopup() {
  const data = await browser.storage.local.get(Object.values(STORAGE_KEYS));

  const noUser = document.getElementById('no-user');
  const errorState = document.getElementById('error-state');
  const statsState = document.getElementById('stats-state');

  noUser.classList.add('hidden');
  errorState.classList.add('hidden');
  statsState.classList.add('hidden');

  const username = data[STORAGE_KEYS.username];
  const error = data[STORAGE_KEYS.error];
  const stats = data[STORAGE_KEYS.stats];

  if (!username) {
    noUser.classList.remove('hidden');
    return;
  }

  if (error) {
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = `Could not fetch data: ${error}`;
    return;
  }

  if (!stats) {
    errorState.classList.remove('hidden');
    document.getElementById('error-message').textContent = 'No stats available yet. Try refresh.';
    return;
  }

  statsState.classList.remove('hidden');
  document.getElementById('username').textContent = username;
  document.getElementById('status-label').textContent = statusText(stats);
  document.getElementById('current-streak').textContent = String(stats.currentStreak ?? 0);
  document.getElementById('longest-streak').textContent = String(stats.longestStreak ?? 0);
  document.getElementById('total-days').textContent = String(stats.totalSolvedDays ?? 0);
  document.getElementById('last-solved').textContent = formatDate(stats.lastSolvedDate);
  document.getElementById('updated-at').textContent = formatUpdated(data[STORAGE_KEYS.lastUpdated]);
}

async function triggerRefresh() {
  await browser.runtime.sendMessage({ type: 'refresh-streak' });
  await loadPopup();
}

document.getElementById('open-options').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

document.getElementById('settings').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

document.getElementById('retry').addEventListener('click', triggerRefresh);
document.getElementById('refresh').addEventListener('click', triggerRefresh);

loadPopup();
