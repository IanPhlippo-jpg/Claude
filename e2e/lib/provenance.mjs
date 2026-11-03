// What a log was made from (QA 0.5.11, F176): the commit comes from git, or, in a tree exported with `git archive`
// (no .git, as on the QA box), from commit.txt, which `git archive` fills in through export-subst (.gitattributes).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { release } from 'node:os';

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim() ?? '';

/** the short commit hash, ' (uncommitted changes)' when the work tree differs, or 'unknown' */
export function commitOf() {
  const head = git('rev-parse', '--short', 'HEAD');
  if (head) return head + (git('status', '--porcelain', '--untracked-files=no') ? ' (uncommitted changes)' : '');
  try {
    const exported = readFileSync(new URL('./commit.txt', import.meta.url), 'utf8').trim().split(/\s+/)[0];
    if (exported && !exported.includes('$')) return `${exported} (git archive)`;
  } catch { /* no file */ }
  return process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : 'unknown';
}

/** the head lines every log starts with: what, which version, which commit, which platform, when */
export function logHead(what, version) {
  return `${what} ${version}\ncommit ${commitOf()}\nplatform ${process.platform} ${release()}\ndate ${new Date().toISOString()}\n`;
}
