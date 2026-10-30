// The review bot (DEMO_PLAN.md section 8, "triage.yml"). Runs with write access after the check finishes, from
// the base branch. It never checks out or runs submitted code; it reads only the check's result file, and
// trusts the check workflow's conclusion over anything that file claims.
//
//  - check failed  → post a "Request changes" review listing the problems
//  - check passed  → dismiss the bot's earlier change requests, request 2 random reviewers from
//                    reviewers.yml (never the author; the same two again on a revision), enable auto-merge
// Tag-based assignment comes later: reviewers.yml already lists each reviewer's tags.

const fs = require('fs');

const BOT = 'github-actions[bot]';
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/** Reads `- login: someone` lines from reviewers.yml (a deliberately tiny format, so no YAML library is needed). */
function reviewerPool(text) {
  return text.split('\n').map(l => l.match(/^\s*-\s*login:\s*([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\s*$/)?.[1]).filter(Boolean);
}

function readResult() {
  try {
    const r = JSON.parse(fs.readFileSync('check-result/result.json', 'utf8'));
    // Untrusted input: keep only short plain strings.
    return (Array.isArray(r.errors) ? r.errors : []).slice(0, 20).map(e => ({
      file: String(e.file ?? '').slice(0, 120),
      line: Number.isInteger(e.line) ? e.line : null,
      message: String(e.message ?? '').replace(/[`<>\r\n]/g, ' ').slice(0, 300),
    }));
  } catch {
    return [{ file: '', line: null, message: 'The check failed before it could report details. Open the "check" run on this pull request to see why.' }];
  }
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const run = context.payload.workflow_run;
  // Fork pull requests aren't listed on the run itself, so match by head commit.
  const open = await github.paginate(github.rest.pulls.list, { owner, repo, state: 'open', per_page: 100 });
  const pr = open.find(p => p.head.sha === run.head_sha);
  if (!pr) return core.info(`No open pull request has head ${run.head_sha}; nothing to do.`);

  const reviews = await github.paginate(github.rest.pulls.listReviews, { owner, repo, pull_number: pr.number });

  if (run.conclusion !== 'success') {
    const errors = readResult();
    const body = [
      'Thanks for the submission! The automated check found some problems. Fix them and push to this pull request; the check reruns by itself.',
      '',
      ...errors.map(e => `- \`${e.file || 'submission'}\`${e.line ? ` line ${e.line}` : ''}: ${e.message}`),
    ].join('\n');
    await github.rest.pulls.createReview({ owner, repo, pull_number: pr.number, commit_id: run.head_sha, event: 'REQUEST_CHANGES', body });
    return core.info(`Requested changes on #${pr.number}.`);
  }

  for (const r of reviews.filter(r => r.user?.login === BOT && r.state === 'CHANGES_REQUESTED')) {
    await github.rest.pulls.dismissReview({ owner, repo, pull_number: pr.number, review_id: r.id, message: 'The automated check passes now.' });
  }

  const pool = reviewerPool(fs.readFileSync('reviewers.yml', 'utf8')).filter(l => !same(l, pr.user.login));
  const involved = [...(pr.requested_reviewers || []).map(u => u.login), ...reviews.map(r => r.user?.login).filter(Boolean)]
    .filter(l => l !== BOT && pool.some(p => same(p, l)));
  const chosen = [...new Set(involved)].slice(0, 2);
  const rest = pool.filter(l => !chosen.some(c => same(c, l)));
  while (chosen.length < 2 && rest.length) chosen.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  if (chosen.length < 2) core.warning('Fewer than two eligible reviewers in reviewers.yml.');
  if (chosen.length) await github.rest.pulls.requestReviewers({ owner, repo, pull_number: pr.number, reviewers: chosen });
  core.info(`Reviewers for #${pr.number}: ${chosen.join(', ')}`);

  // GitHub merges by itself once the ruleset's two approvals arrive ("uploaded automatically").
  try {
    await github.graphql(
      'mutation($id: ID!) { enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) { clientMutationId } }',
      { id: pr.node_id },
    );
  } catch (e) {
    core.warning(`Could not enable auto-merge (is "Allow auto-merge" on in the repo settings?): ${e.message}`);
  }
};
