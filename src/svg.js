function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

const PALETTE = {
  bgFrom: '#1b1033',
  bgTo: '#2a1856',
  accent: '#ffb84d',
  accentSoft: '#ffd68a',
  track: 'rgba(255,255,255,0.16)',
  text: '#f5f3ff',
  textMuted: '#c9c2e8',
  chipBg: 'rgba(255,255,255,0.10)',
};

function levelRing({ cx, cy, r, progress, level }) {
  const circumference = 2 * Math.PI * r;
  const dash = circumference * Math.max(0.02, progress);
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${PALETTE.track}" stroke-width="8" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${PALETTE.accent}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${dash} ${circumference}"
      transform="rotate(-90 ${cx} ${cy})" />
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="10" fill="${PALETTE.textMuted}"
      font-family="Segoe UI, Verdana, sans-serif">NIVEL</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="24" font-weight="700" fill="${PALETTE.text}"
      font-family="Segoe UI, Verdana, sans-serif">${level}</text>
  `;
}

function statBlock(x, y, icon, label, value) {
  return `
    <g transform="translate(${x}, ${y})">
      <text x="0" y="0" font-size="16" font-family="Segoe UI Emoji, Segoe UI, sans-serif">${icon}</text>
      <text x="24" y="-1" font-size="16" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">${value}</text>
      <text x="24" y="14" font-size="9" fill="${PALETTE.textMuted}" font-family="Segoe UI, Verdana, sans-serif">${label}</text>
    </g>
  `;
}

function watermark({ dataUri, opacity, clipId, x, y, w, h }) {
  if (!dataUri) return '';
  return `<g clip-path="url(#${clipId})"><image href="${dataUri}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}" /></g>`;
}

function avatar(login, opts, width) {
  if (opts.avatarDataUri) {
    return `<image href="${opts.avatarDataUri}" x="${width - 88}" y="20" width="64" height="64" clip-path="url(#avatar-clip-${login})" />`;
  }

  const initial = escapeXml(login.slice(0, 1).toUpperCase());
  return `
    <circle cx="${width - 56}" cy="52" r="32" fill="rgba(255,255,255,0.10)" />
    <text x="${width - 56}" y="62" text-anchor="middle" font-size="28" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">${initial}</text>
  `;
}

function badgeChip(x, y, badge) {
  const label = escapeXml(badge.label);
  const width = Math.max(70, label.length * 6.4 + 34);
  return {
    width,
    svg: `
      <g transform="translate(${x}, ${y})">
        <rect width="${width}" height="26" rx="13" fill="${PALETTE.chipBg}" stroke="rgba(255,255,255,0.18)" />
        <text x="12" y="17" font-size="12" font-family="Segoe UI Emoji, Segoe UI, sans-serif">${badge.icon}</text>
        <text x="30" y="17" font-size="11" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">${label}</text>
      </g>
    `,
  };
}

export function renderCard(login, data, opts = {}) {
  const width = 480;
  const height = 260;
  const { level, progress, ceil, floor } = data.levelInfo;
  const title = data.badges[0]?.label ?? 'Contribuidor';
  const maxChipX = width - 24 - 36; // deixa espaco pro "+N" final, se precisar
  const chips = [];
  let chipX = 24;
  let shownCount = 0;
  for (const b of data.badges) {
    const chip = badgeChip(chipX, 208, b);
    if (chipX + chip.width > maxChipX && shownCount > 0) break;
    chips.push(chip.svg);
    chipX += chip.width + 8;
    shownCount++;
  }
  const extra = data.badges.length - shownCount;
  const extraLabel = extra > 0 ? `<text x="${chipX + 4}" y="225" font-size="11" fill="${PALETTE.textMuted}" font-family="Segoe UI, Verdana, sans-serif">+${extra}</text>` : '';

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scorecard de ${escapeXml(login)}">
  <defs>
    <linearGradient id="bg-${login}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PALETTE.bgFrom}" />
      <stop offset="100%" stop-color="${PALETTE.bgTo}" />
    </linearGradient>
    <clipPath id="avatar-clip-${login}">
      <circle cx="${width - 56}" cy="52" r="32" />
    </clipPath>
    <clipPath id="card-clip-${login}">
      <rect width="${width}" height="${height}" rx="18" />
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" rx="18" fill="url(#bg-${login})" stroke="rgba(255,255,255,0.12)" />
  ${watermark({
    dataUri: opts.watermarkDataUri, opacity: opts.watermarkOpacity ?? 0.08, clipId: `card-clip-${login}`,
    x: width - 76, y: height - 76, w: 60, h: 60,
  })}

  ${levelRing({ cx: 64, cy: 60, r: 40, progress, level })}

  <text x="128" y="46" font-size="20" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">@${escapeXml(login)}</text>
  <text x="128" y="66" font-size="12" fill="${PALETTE.accentSoft}" font-family="Segoe UI, Verdana, sans-serif">${escapeXml(title)}</text>

  ${avatar(login, opts, width)}
  <circle cx="${width - 56}" cy="52" r="32" fill="none" stroke="${PALETTE.accent}" stroke-width="2" />

  <text x="128" y="92" font-size="10" fill="${PALETTE.textMuted}" font-family="Segoe UI, Verdana, sans-serif">XP ${Math.round(data.score - floor)} / ${Math.round(ceil - floor)} para o proximo nivel</text>
  <rect x="128" y="98" width="320" height="10" rx="5" fill="${PALETTE.track}" />
  <rect x="128" y="98" width="${Math.max(4, 320 * progress)}" height="10" rx="5" fill="${PALETTE.accent}" />

  <line x1="24" y1="128" x2="${width - 24}" y2="128" stroke="rgba(255,255,255,0.12)" />

  ${statBlock(24, 160, '\u{1F4DD}', 'Commits', data.totals.commits)}
  ${statBlock(122, 160, '\u{1F500}', 'Pull Requests', data.totals.pullRequests)}
  ${statBlock(232, 160, '✅', 'PRs Merged', data.totals.mergedPullRequests)}
  ${statBlock(340, 160, '\u{1F441}', 'Reviews', data.totals.reviews)}
  ${statBlock(420, 160, '\u{1F4CB}', 'Issues', data.totals.issues)}

  <text x="24" y="248" font-size="14" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">Score: ${Math.round(data.score)} pts</text>
  ${chips.join('')}
  ${extraLabel}
</svg>`;
}

export function renderBadgeCompact(login, data, opts = {}) {
  const width = 260;
  const height = 56;
  const { level } = data.levelInfo;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Score de ${escapeXml(login)}">
  <defs>
    <linearGradient id="bgc-${login}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${PALETTE.bgFrom}" />
      <stop offset="100%" stop-color="${PALETTE.bgTo}" />
    </linearGradient>
    <clipPath id="badge-clip-${login}">
      <rect width="${width}" height="${height}" rx="12" />
    </clipPath>
  </defs>
  <rect width="${width}" height="${height}" rx="12" fill="url(#bgc-${login})" stroke="rgba(255,255,255,0.14)" />
  ${watermark({
    dataUri: opts.watermarkDataUri, opacity: (opts.watermarkOpacity ?? 0.08) * 1.4, clipId: `badge-clip-${login}`,
    x: width - 46, y: 10, w: 40, h: 40,
  })}
  <circle cx="30" cy="28" r="18" fill="none" stroke="${PALETTE.accent}" stroke-width="4" />
  <text x="30" y="33" text-anchor="middle" font-size="14" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">${level}</text>
  <text x="58" y="24" font-size="13" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">@${escapeXml(login)}</text>
  <text x="58" y="40" font-size="11" fill="${PALETTE.accentSoft}" font-family="Segoe UI, Verdana, sans-serif">${Math.round(data.score)} pts na organizacao</text>
</svg>`;
}

export function renderLeaderboard(entries, orgName) {
  const width = 560;
  const rowHeight = 34;
  const top = entries.slice(0, entries.length);
  const height = 70 + top.length * rowHeight;
  const maxScore = Math.max(1, ...top.map((e) => e.score));
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

  const rows = top.map((entry, i) => {
    const y = 70 + i * rowHeight;
    const barMaxWidth = 300;
    const barWidth = Math.max(4, (entry.score / maxScore) * barMaxWidth);
    const rank = medals[i] ?? `${i + 1}.`;
    return `
      <text x="24" y="${y + 18}" font-size="13" font-family="Segoe UI, Verdana, sans-serif" fill="${PALETTE.textMuted}">${rank}</text>
      <text x="58" y="${y + 18}" font-size="13" font-weight="600" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">@${escapeXml(entry.login)}</text>
      <rect x="200" y="${y + 6}" width="${barMaxWidth}" height="12" rx="6" fill="${PALETTE.track}" />
      <rect x="200" y="${y + 6}" width="${barWidth}" height="12" rx="6" fill="${PALETTE.accent}" />
      <text x="${200 + barMaxWidth + 12}" y="${y + 16}" font-size="12" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">${Math.round(entry.score)}</text>
    `;
  }).join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ranking de contribuicao - ${escapeXml(orgName)}">
  <defs>
    <linearGradient id="bgl" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PALETTE.bgFrom}" />
      <stop offset="100%" stop-color="${PALETTE.bgTo}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="18" fill="url(#bgl)" stroke="rgba(255,255,255,0.12)" />
  <text x="24" y="36" font-size="18" font-weight="700" fill="${PALETTE.text}" font-family="Segoe UI, Verdana, sans-serif">Ranking de contribuicao - ${escapeXml(orgName)}</text>
  <line x1="24" y1="52" x2="${width - 24}" y2="52" stroke="rgba(255,255,255,0.12)" />
  ${rows}
</svg>`;
}
