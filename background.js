const STORAGE_KEYS = {
  username: 'cfUsername',
  stats: 'cfStreakStats',
  lastUpdated: 'cfLastUpdated',
  error: 'cfError',
};

const UPDATE_ALARM = 'cf-streak-update';
const PAGE_SIZE = 1000;
const MAX_SUBMISSIONS = 10000;

function toUtcDateString(epochSeconds) {
  const date = new Date(epochSeconds * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateToKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey, offsetDays) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return dateToKey(shifted);
}

function analyzeSolvedDays(daySet) {
  const solvedDays = [...daySet].sort();
  if (solvedDays.length === 0) {
    const todayKey = dateToKey(new Date());
    return {
      currentStreak: 0,
      longestStreak: 0,
      solvedToday: false,
      solvedYesterday: false,
      lastSolvedDate: null,
      totalSolvedDays: 0,
      firstSolvedDate: null,
      todayKey,
      status: 'inactive',
    };
  }

  let longestStreak = 1;
  let running = 1;

  for (let i = 1; i < solvedDays.length; i += 1) {
    const prev = solvedDays[i - 1];
    const expected = shiftDateKey(prev, 1);
    if (solvedDays[i] === expected) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 1;
    }
  }

  const todayKey = dateToKey(new Date());
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const solvedToday = daySet.has(todayKey);
  const solvedYesterday = daySet.has(yesterdayKey);

  let currentStreak = 0;
  if (solvedToday || solvedYesterday) {
    let cursor = solvedToday ? todayKey : yesterdayKey;
    while (daySet.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDateKey(cursor, -1);
    }
  }

  const status = solvedToday ? 'safe' : (solvedYesterday ? 'at-risk' : 'broken');

  return {
    currentStreak,
    longestStreak,
    solvedToday,
    solvedYesterday,
    lastSolvedDate: solvedDays[solvedDays.length - 1],
    totalSolvedDays: solvedDays.length,
    firstSolvedDate: solvedDays[0],
    todayKey,
    status,
  };
}

async function fetchAllSubmissions(username) {
  const submissions = [];
  let from = 1;

  while (submissions.length < MAX_SUBMISSIONS) {
    const count = Math.min(PAGE_SIZE, MAX_SUBMISSIONS - submissions.length);
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}&from=${from}&count=${count}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload.status !== 'OK' || !Array.isArray(payload.result)) {
      const comment = payload.comment || 'Unexpected API response';
      throw new Error(comment);
    }
    submissions.push(...payload.result);

    if (payload.result.length < count) {
      break;
    }
    from += count;
  }

  return submissions;
}

function getSolvedDaySet(submissions) {
  const solvedDays = new Set();
  for (const sub of submissions) {
    if (sub.verdict === 'OK' && typeof sub.creationTimeSeconds === 'number') {
      solvedDays.add(toUtcDateString(sub.creationTimeSeconds));
    }
  }
  return solvedDays;
}

async function saveError(errorMessage) {
  await browser.storage.local.set({
    [STORAGE_KEYS.error]: errorMessage,
    [STORAGE_KEYS.lastUpdated]: new Date().toISOString(),
  });
  await browser.action.setBadgeText({ text: '!' });
  await browser.action.setBadgeBackgroundColor({ color: '#cc3300' });
}

async function saveStats(stats) {
  await browser.storage.local.set({
    [STORAGE_KEYS.stats]: stats,
    [STORAGE_KEYS.error]: null,
    [STORAGE_KEYS.lastUpdated]: new Date().toISOString(),
  });

  const badgeText = stats.currentStreak > 0 ? String(stats.currentStreak) : '';
  await browser.action.setBadgeText({ text: badgeText });
  await browser.action.setBadgeBackgroundColor({ color: stats.solvedToday ? '#2ea043' : '#d29922' });
}

async function updateStreakStats() {
  const { [STORAGE_KEYS.username]: username } = await browser.storage.local.get(STORAGE_KEYS.username);
  if (!username) {
    await browser.action.setBadgeText({ text: '' });
    return;
  }

  try {
    const submissions = await fetchAllSubmissions(username);
    const solvedDays = getSolvedDaySet(submissions);
    const stats = analyzeSolvedDays(solvedDays);
    stats.username = username;
    stats.submissionsFetched = submissions.length;
    await saveStats(stats);
  } catch (error) {
    await saveError(error instanceof Error ? error.message : String(error));
  }
}

browser.runtime.onInstalled.addListener(async () => {
  await browser.alarms.create(UPDATE_ALARM, { periodInMinutes: 60 });
  await updateStreakStats();
});

browser.runtime.onStartup.addListener(async () => {
  await browser.alarms.create(UPDATE_ALARM, { periodInMinutes: 60 });
  await updateStreakStats();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM) {
    updateStreakStats();
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === 'refresh-streak') {
    return updateStreakStats();
  }
  return undefined;
});
