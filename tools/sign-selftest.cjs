// Local self-test of the signing pipeline (QA 0.5.13 F49/F117), without buying a certificate: a throwaway self-signed
// code-signing certificate is made for this run (CurrentUser\My, exported to a .pfx in a temporary folder), the
// desktop build is packed twice (the win-unpacked folder, electron-builder --dir) and read by tools/sign-report.cjs:
//   1. no certificate configured: the exe is NotSigned and the report says "NotSigned (no certificate configured)", exit 0
//   2. WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD point at the throwaway .pfx: electron-builder calls the sign hook, the exe
//      carries a signature by exactly that certificate, and the report FAILS (exit 1) because a self-signed
//      certificate is not trusted (Windows reads UnknownError), as it must for anything that is not Valid
// The certificate (with its private key) and the .pfx are deleted afterwards, also when a step fails; nothing is
// written to the repository except the log e2e-out/sign-selftest-<version>.txt. Windows only; needs `npm run build`
// first (the packed app is dist/). The timestamp is left out (offline).
// Usage: node tools/sign-selftest.cjs
const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

if (process.platform !== 'win32') { console.log('sign-selftest: Windows only'); process.exit(0); }
const root = path.join(__dirname, '..');
if (!existsSync(path.join(root, 'dist', 'index.html'))) { console.error('sign-selftest: run npm run build first (dist/ is packed)'); process.exit(1); }
const version = require('../package.json').version;
const tmp = mkdtempSync(path.join(os.tmpdir(), 'phlippo-sign-selftest-'));
const pfx = path.join(tmp, 'throwaway.pfx');
const password = randomBytes(18).toString('base64url');
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const ps = (script, env = {}) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; ${script}`], { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
// the variables electron-builder and the report read, cleared so a certificate of the shell cannot leak in
const clean = { WIN_CSC_LINK: '', CSC_LINK: '', WIN_CSC_KEY_PASSWORD: '', CSC_KEY_PASSWORD: '' };
const pack = (out, env) => spawnSync(process.execPath, [path.join(root, 'node_modules', 'electron-builder', 'cli.js'), '--win', 'dir', '--x64', '--publish', 'never', `--config.directories.output=${out}`], { cwd: root, encoding: 'utf8', env: { ...process.env, ...clean, ...env }, maxBuffer: 64 * 1024 * 1024 });
const report = (dir, env) => spawnSync(process.execPath, [path.join(root, 'tools', 'sign-report.cjs'), dir], { cwd: root, encoding: 'utf8', env: { ...process.env, ...clean, ...env } });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); say(`${ok ? 'ok  ' : 'FAIL'} ${name}${info ? `  (${info})` : ''}`); };

let thumbprint = '';
try {
  thumbprint = ps("$c = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=Phlippo CAD signing self-test (throwaway)' -CertStoreLocation Cert:\\CurrentUser\\My -NotAfter (Get-Date).AddDays(1) -KeyExportPolicy Exportable -KeyAlgorithm RSA -KeyLength 2048; Export-PfxCertificate -Cert $c -FilePath $env:PFX -Password (ConvertTo-SecureString -String $env:PW -AsPlainText -Force) | Out-Null; $c.Thumbprint", { PFX: pfx, PW: password });
  say(`sign-selftest ${version}: throwaway certificate ${thumbprint} (CurrentUser\\My, .pfx in ${tmp})`);

  // 1. no certificate configured
  const outU = path.join(tmp, 'unsigned');
  const pU = pack(outU, {});
  check('pack without a certificate', pU.status === 0, `exit ${pU.status}`);
  const rU = report(outU, {});
  say(rU.stdout.trim());
  check('report without a certificate: exit 0, "NotSigned (no certificate configured)"', rU.status === 0 && /NotSigned \(no certificate configured\)/.test(rU.stdout), `exit ${rU.status}`);

  // 2. the throwaway certificate through the variables CI fills from its secrets
  const outS = path.join(tmp, 'signed');
  const certEnv = { WIN_CSC_LINK: pfx, WIN_CSC_KEY_PASSWORD: password, PHLIPPO_SIGN_TIMESTAMP: 'none' };
  const pS = pack(outS, certEnv);
  const signedLines = `${pS.stdout}${pS.stderr}`.split('\n').filter((l) => /• signed|signing/.test(l)).map((l) => l.replace(password, '***').trim());
  for (const l of signedLines) say(l);
  check('pack with the certificate: electron-builder calls the sign hook', pS.status === 0 && signedLines.some((l) => l.includes(thumbprint)), `exit ${pS.status}`);
  const exe = path.join(outS, 'win-unpacked', 'Phlippo CAD.exe');
  const sig = ps("$s = Get-AuthenticodeSignature -LiteralPath $env:F; '{0}|{1}|{2}' -f $s.Status, $s.SignerCertificate.Thumbprint, $s.StatusMessage", { F: exe }).split('|');
  say(`Authenticode status of the signed exe as Windows reads it: ${sig[0]} (${sig[2]})`);
  check('the exe carries a signature by the throwaway certificate', sig[1] === thumbprint, sig[1]);
  check('a self-signed certificate is not trusted: the status is not Valid', sig[0] !== 'Valid', sig[0]);
  const rS = report(outS, certEnv);
  say(rS.stdout.trim());
  check('report with a certificate configured fails on a status that is not Valid (exit 1)', rS.status === 1 && /FAIL: 1 of 1/.test(rS.stdout), `exit ${rS.status}`);
} catch (e) {
  check('self-test ran', false, String(e.message || e).replace(password, '***').split('\n')[0]);
} finally {
  // the certificate with its private key out of the store, the .pfx and the packed folders off the disk
  if (thumbprint) ps("Remove-Item -LiteralPath ('Cert:\\CurrentUser\\My\\' + $env:T) -DeleteKey", { T: thumbprint });
  rmSync(tmp, { recursive: true, force: true });
  const left = thumbprint ? ps("@(Get-ChildItem Cert:\\CurrentUser\\My | Where-Object Thumbprint -eq $env:T).Count", { T: thumbprint }) : '0';
  check('cleaned up: the certificate is gone from CurrentUser\\My and the temporary folder is deleted', left === '0' && !existsSync(tmp), `left ${left}`);
}
const ok = results.every(Boolean);
say(`${ok ? 'PASS' : 'FAIL'} ${results.filter(Boolean).length}/${results.length}`);
mkdirSync(path.join(root, 'e2e-out'), { recursive: true });
writeFileSync(path.join(root, 'e2e-out', `sign-selftest-${version}.txt`), log.join('\n') + '\n');
process.exit(ok ? 0 : 1);
