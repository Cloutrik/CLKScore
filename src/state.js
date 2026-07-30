import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { paths } from './config.js';

export async function loadState() {
  try {
    const raw = await readFile(paths.state, 'utf-8');
    const parsed = JSON.parse(raw);
    return { lastRunAt: parsed.lastRunAt ?? null, users: parsed.users ?? {} };
  } catch {
    return { lastRunAt: null, users: {} };
  }
}

export async function saveState(state) {
  await mkdir(path.dirname(paths.state), { recursive: true });
  await writeFile(paths.state, JSON.stringify(state, null, 2));
}

export function getUserState(state, login) {
  if (!state.users[login]) {
    state.users[login] = {
      lastSyncedAt: null,
      totals: { commits: 0, pullRequests: 0, mergedPullRequests: 0, reviews: 0, issues: 0 },
      currentStreak: 0,
      longestStreak: 0,
    };
  }
  return state.users[login];
}
