import { graphql } from '@octokit/graphql';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_DAYS = 365;

export function makeClient(token) {
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

async function withRetry(fn, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimited = err?.message?.includes('rate limit') || err?.message?.includes('secondary rate limit');
      if (!isRateLimited || i === attempts - 1) throw err;
      const wait = 2000 * 2 ** i;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

export async function fetchOrgId(client, org) {
  const query = `
    query($org: String!) {
      organization(login: $org) { id }
    }
  `;
  const { organization } = await withRetry(() => client(query, { org }));
  return organization.id;
}

export async function fetchOrgMembers(client, org) {
  const query = `
    query($org: String!, $cursor: String) {
      organization(login: $org) {
        membersWithRole(first: 100, after: $cursor) {
          nodes { login avatarUrl(size: 96) }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;
  const members = [];
  let cursor = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const { organization } = await withRetry(() => client(query, { org, cursor }));
    const page = organization.membersWithRole;
    members.push(...page.nodes.map((n) => ({ login: n.login, avatarUrl: n.avatarUrl })));
    hasNextPage = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
  }
  return members;
}

export function splitIntoWindows(fromISO, toISO) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const windows = [];
  let cursor = from;
  while (cursor < to) {
    const next = new Date(Math.min(cursor.getTime() + MAX_WINDOW_DAYS * DAY_MS, to.getTime()));
    windows.push([cursor.toISOString(), next.toISOString()]);
    cursor = next;
  }
  return windows;
}

export async function fetchContributions(client, login, orgId, fromISO, toISO) {
  const query = `
    query($login: String!, $orgId: ID!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(organizationID: $orgId, from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
        }
      }
    }
  `;
  const { user } = await withRetry(() => client(query, { login, orgId, from: fromISO, to: toISO }));
  return user.contributionsCollection;
}

export async function fetchMergedPullRequestCount(client, org, login, fromISO, toISO) {
  const fromDate = fromISO.slice(0, 10);
  const toDate = toISO.slice(0, 10);
  const q = `org:${org} author:${login} is:pr is:merged merged:${fromDate}..${toDate}`;
  const query = `
    query($q: String!) {
      search(query: $q, type: ISSUE, first: 0) { issueCount }
    }
  `;
  const { search } = await withRetry(() => client(query, { q }));
  return search.issueCount;
}
