export function computeScore(totals, weights) {
  return (
    totals.commits * weights.commits +
    totals.pullRequests * weights.pullRequests +
    totals.mergedPullRequests * weights.mergedPullRequests +
    totals.reviews * weights.reviews +
    totals.issues * weights.issues
  );
}

// Curva RPG: xp necessario para o nivel n = levelBase * n^2
export function xpForLevel(level, levelBase) {
  return levelBase * level * level;
}

export function computeLevel(score, levelBase) {
  let level = 1;
  while (xpForLevel(level + 1, levelBase) <= score) level++;
  const floor = level === 1 ? 0 : xpForLevel(level, levelBase);
  const ceil = xpForLevel(level + 1, levelBase);
  const progress = ceil === floor ? 1 : (score - floor) / (ceil - floor);
  return { level, progress: Math.max(0, Math.min(1, progress)), floor, ceil };
}

export function computeBadges(totals, streak, thresholds) {
  const badges = [];
  if (totals.mergedPullRequests >= thresholds.mergeMaster) {
    badges.push({ id: 'merge-master', icon: '\u{1F3C6}', label: 'Merge Master' });
  }
  if (totals.commits >= thresholds.commitMachine) {
    badges.push({ id: 'commit-machine', icon: '⚡', label: 'Commit Machine' });
  }
  if (totals.reviews >= thresholds.teamPlayer) {
    badges.push({ id: 'team-player', icon: '\u{1F465}', label: 'Team Player' });
  }
  if (totals.issues >= thresholds.issueTracker) {
    badges.push({ id: 'issue-tracker', icon: '\u{1F4CB}', label: 'Issue Tracker' });
  }
  if (streak.currentStreak >= thresholds.streakDays) {
    badges.push({ id: 'streak', icon: '\u{1F525}', label: `${streak.currentStreak}-day streak` });
  }
  return badges;
}
