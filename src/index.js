import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { loadConfig, paths } from './config.js';
import { loadState, saveState, getUserState } from './state.js';
import {
  makeClient, fetchOrgId, fetchOrgMembers, splitIntoWindows,
  fetchContributions, fetchMergedPullRequestCount,
} from './github.js';
import { computeScore, computeLevel, computeBadges } from './score.js';
import { renderCard, renderBadgeCompact, renderLeaderboard } from './svg.js';
import { renderIndexPage } from './page.js';
import { boxDownscale } from './png-utils.js';

const ORG = process.env.ORG_NAME;
const TOKEN = process.env.GH_TOKEN;

if (!ORG || !TOKEN) {
  console.error('Defina as variaveis de ambiente ORG_NAME e GH_TOKEN antes de rodar.');
  process.exit(1);
}

const MIME_BY_EXT = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const BADGE_WATERMARK_SIZE = 56;

async function loadWatermark(config) {
  if (!config.watermark?.enabled) return {};
  const fullPath = path.join(paths.root, config.watermark.path);
  try {
    const buf = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'image/png';
    const watermarkDataUri = `data:${mime};base64,${buf.toString('base64')}`;

    let badgeWatermarkDataUri = watermarkDataUri;
    if (ext === '.png') {
      const png = PNG.sync.read(buf);
      const small = boxDownscale(png, BADGE_WATERMARK_SIZE);
      const out = new PNG({ width: small.width, height: small.height });
      small.data.copy(out.data);
      badgeWatermarkDataUri = `data:image/png;base64,${PNG.sync.write(out).toString('base64')}`;
    }

    return { watermarkDataUri, badgeWatermarkDataUri, watermarkOpacity: config.watermark.opacity };
  } catch {
    console.warn(`Marca d'agua nao encontrada em ${fullPath}, seguindo sem ela.`);
    return {};
  }
}

async function main() {
  const config = await loadConfig();
  const state = await loadState();
  const client = makeClient(TOKEN);
  const watermarkOpts = await loadWatermark(config);

  console.log(`Buscando membros da organizacao ${ORG}...`);
  const orgId = await fetchOrgId(client, ORG);
  const members = await fetchOrgMembers(client, ORG);
  console.log(`${members.length} membros encontrados.`);

  const nowISO = new Date().toISOString();
  const leaderboardEntries = [];

  await mkdir(paths.certificates, { recursive: true });
  await mkdir(paths.badges, { recursive: true });

  for (const login of members) {
    const userState = getUserState(state, login);
    const from = userState.lastSyncedAt ?? config.bootstrapStartDate;
    const windows = splitIntoWindows(from, nowISO);

    const delta = { commits: 0, pullRequests: 0, mergedPullRequests: 0, reviews: 0, issues: 0 };
    for (const [winFrom, winTo] of windows) {
      const cc = await fetchContributions(client, login, orgId, winFrom, winTo);
      delta.commits += cc.totalCommitContributions;
      delta.pullRequests += cc.totalPullRequestContributions;
      delta.reviews += cc.totalPullRequestReviewContributions;
      delta.issues += cc.totalIssueContributions;
      delta.mergedPullRequests += await fetchMergedPullRequestCount(client, ORG, login, winFrom, winTo);
    }

    for (const key of Object.keys(delta)) {
      userState.totals[key] += delta[key];
    }

    const contributedThisRun = Object.values(delta).some((v) => v > 0);
    userState.currentStreak = contributedThisRun ? userState.currentStreak + 1 : 0;
    userState.longestStreak = Math.max(userState.longestStreak, userState.currentStreak);
    userState.lastSyncedAt = nowISO;

    const score = computeScore(userState.totals, config.weights);
    const levelInfo = computeLevel(score, config.levelBase);
    const badges = computeBadges(userState.totals, userState, config.badgeThresholds);

    const cardData = { totals: userState.totals, score, levelInfo, badges };
    await writeFile(`${paths.certificates}/${login}.svg`, renderCard(login, cardData, watermarkOpts));
    const badgeWatermarkOpts = { ...watermarkOpts, watermarkDataUri: watermarkOpts.badgeWatermarkDataUri };
    await writeFile(`${paths.badges}/${login}.svg`, renderBadgeCompact(login, cardData, badgeWatermarkOpts));

    leaderboardEntries.push({ login, score });
    console.log(`  @${login}: score ${Math.round(score)} (nivel ${levelInfo.level})`);
  }

  leaderboardEntries.sort((a, b) => b.score - a.score);
  const top = leaderboardEntries.slice(0, config.leaderboardSize);
  await writeFile(paths.leaderboard, renderLeaderboard(top, ORG));
  await writeFile(paths.indexHtml, renderIndexPage(ORG, leaderboardEntries));

  state.lastRunAt = nowISO;
  await saveState(state);
  console.log('Concluido.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
