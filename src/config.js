import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');

export async function loadConfig() {
  const raw = await readFile(path.join(rootDir, 'config.json'), 'utf-8');
  return JSON.parse(raw);
}

export const paths = {
  root: rootDir,
  state: path.join(rootDir, 'data', 'state.json'),
  certificates: path.join(rootDir, 'data', 'certificates'),
  badges: path.join(rootDir, 'data', 'badges'),
  leaderboard: path.join(rootDir, 'data', 'leaderboard.svg'),
};
