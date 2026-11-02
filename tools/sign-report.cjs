// The signature state of the release binaries, written next to them as signature-<version>.txt (QA 0.5.10 F150):
// the build is not code-signed (no certificate), and the report says so plainly instead of a build log that
// mentions a signing tool. Windows only; runs after `npm run desktop:build`.
const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const version = require('../package.json').version;
const dir = process.argv[2] || path.join(process.env.LOCALAPPDATA || '', 'PhlippoCAD', 'release');
if (process.platform !== 'win32') { console.log('sign-report: Windows only'); process.exit(0); }
if (!existsSync(dir)) { console.error(`sign-report: ${dir} does not exist`); process.exit(1); }
const files = readdirSync(dir).filter((f) => f.includes(version) && f.endsWith('.exe')).map((f) => path.join(dir, f));
const unpacked = path.join(dir, 'win-unpacked', 'Phlippo CAD.exe');
if (existsSync(unpacked)) files.push(unpacked);
const lines = [`Phlippo CAD ${version} — Authenticode signatures (${new Date().toISOString()})`, 'The build is not code-signed: there is no certificate. SmartScreen warns at the first start; see README.', ''];
for (const f of files) {
  const out = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-AuthenticodeSignature -FilePath '${f.replace(/'/g, "''")}').Status`], { encoding: 'utf8' }).trim();
  lines.push(`${out.padEnd(12)} ${f}`);
}
const report = lines.join('\n') + '\n';
writeFileSync(path.join(dir, `signature-${version}.txt`), report);
console.log(report);
