// The signature state of the release binaries, written next to them as signature-<version>.txt (QA 0.5.10 F150,
// 0.5.13 F49/F117). Windows only; runs after the installer build (`npm run desktop:build`, CI windows-installer).
//   no certificate configured  every binary must be NotSigned and the report says "NotSigned (no certificate
//                              configured)": honest, exit 0
//   a certificate configured   (WIN_CSC_LINK or CSC_LINK set, the variables electron-builder signs with, or
//                              --expect-signed) every binary must be Valid; anything else fails the job (exit 1)
// Per binary the report gives the Authenticode status as Windows reads it, the signer's thumbprint and subject, and
// whether the signature carries a timestamp.
// Usage: node tools/sign-report.cjs [release-dir] [--expect-signed]
const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const version = require('../package.json').version;
const dir = args.find((a) => !a.startsWith('--')) || path.join(process.env.LOCALAPPDATA || '', 'PhlippoCAD', 'release');
const has = (name) => typeof process.env[name] === 'string' && process.env[name].trim() !== '';
const source = ['WIN_CSC_LINK', 'CSC_LINK'].find(has) ?? (args.includes('--expect-signed') ? '--expect-signed' : null);
if (process.platform !== 'win32') { console.log('sign-report: Windows only'); process.exit(0); }
if (!existsSync(dir)) { console.error(`sign-report: ${dir} does not exist`); process.exit(1); }
const files = readdirSync(dir).filter((f) => f.includes(version) && f.endsWith('.exe') && !f.includes('__uninstaller')).map((f) => path.join(dir, f));
const unpacked = path.join(dir, 'win-unpacked', 'Phlippo CAD.exe');
if (existsSync(unpacked)) files.push(unpacked);
if (!files.length) { console.error(`sign-report: no ${version} executables in ${dir}`); process.exit(1); }

/** what Windows reads from the file: status, signer thumbprint and subject, timestamp (the path goes in through the environment) */
function signature(file) {
  const ps = "$s = Get-AuthenticodeSignature -LiteralPath $env:PHLIPPO_SIGN_FILE; $c = $s.SignerCertificate; '{0}|{1}|{2}|{3}' -f $s.Status, $(if ($c) { $c.Thumbprint } else { '' }), $(if ($c) { $c.Subject } else { '' }), [bool]$s.TimeStamperCertificate";
  const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', env: { ...process.env, PHLIPPO_SIGN_FILE: file } }).trim();
  const [status, thumbprint, subject, stamped] = out.split('|');
  return { status, thumbprint, subject, stamped: stamped === 'True' };
}

const rows = files.map((f) => ({ file: f, ...signature(f) }));
const bad = source ? rows.filter((r) => r.status !== 'Valid') : rows.filter((r) => r.status !== 'NotSigned');
const head = source
  ? `A code-signing certificate is configured (${source}): every binary must be Valid.`
  : 'No code-signing certificate is configured (WIN_CSC_LINK / CSC_LINK empty): the build is not code-signed and SmartScreen warns at the first start; see README.';
const lines = [`Phlippo CAD ${version} — Authenticode signatures (${new Date().toISOString()})`, head, ''];
for (const r of rows) {
  const status = !source && r.status === 'NotSigned' ? 'NotSigned (no certificate configured)' : r.status;
  lines.push(`${status.padEnd(38)} ${r.file}${r.thumbprint ? `\n${''.padEnd(38)} signer ${r.thumbprint} ${r.subject}; timestamp ${r.stamped ? 'yes' : 'no'}` : ''}`);
}
lines.push('', bad.length ? `FAIL: ${bad.length} of ${rows.length} binaries are not ${source ? 'Valid although a certificate is configured' : 'NotSigned although no certificate is configured'}` : `OK: ${rows.length} binaries ${source ? 'Valid' : 'NotSigned, as no certificate is configured'}`);
const report = lines.join('\n') + '\n';
writeFileSync(path.join(dir, `signature-${version}.txt`), report);
console.log(report);
process.exit(bad.length ? 1 : 0);
