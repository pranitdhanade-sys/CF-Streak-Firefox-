const STORAGE_KEYS = {
  username: 'cfUsername',
  stats: 'cfStreakStats',
  lastUpdated: 'cfLastUpdated',
  error: 'cfError',
};

const form = document.getElementById('settings-form');
const usernameInput = document.getElementById('username');
const statusEl = document.getElementById('status');
const clearBtn = document.getElementById('clear');

async function loadSettings() {
  const { [STORAGE_KEYS.username]: username } = await browser.storage.local.get(STORAGE_KEYS.username);
  if (username) {
    usernameInput.value = username;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) {
    statusEl.textContent = 'Please enter a username.';
    return;
  }

  await browser.storage.local.set({ [STORAGE_KEYS.username]: username });
  statusEl.textContent = 'Saved. Refreshing stats...';
  await browser.runtime.sendMessage({ type: 'refresh-streak' });
  statusEl.textContent = 'Saved and synced successfully.';
});

clearBtn.addEventListener('click', async () => {
  await browser.storage.local.remove(Object.values(STORAGE_KEYS));
  await browser.action.setBadgeText({ text: '' });
  statusEl.textContent = 'Saved data cleared.';
});

loadSettings();
