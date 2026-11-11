// What a log was made from (QA 0.5.11, F176): the commit comes from git, or, in a tree exported with `git archive`
// (no .git, as on the QA box), from commit.txt, which `git archive` fills in through export-subst (.gitattributes).
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { release } from 'node:os';
import { fileURLToPath } from 'node:url';

// git always runs in the product tree itself; a tree unpacked inside another checkout (QA 0.5.13, F180) has no git
// history of its own, so its log heading comes from commit.txt and not from the surrounding repository
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const git = (...args) => spawnSync('git', args, { encoding: 'utf8', cwd: ROOT }).stdout?.trim() ?? '';
const same = (a, b) => { try { return realpathSync(a).toLowerCase() === realpathSync(b).toLowerCase(); } catch { return false; } };
const ownRepo = () => { const top = git('rev-parse', '--show-toplevel'); return !!top && same(top, ROOT); };

/** the short commit hash, ' (uncommitted changes)' when the work tree differs, or 'unknown' */
export function commitOf() {
  const head = ownRepo() ? git('rev-parse', '--short', 'HEAD') : '';
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
