// The signing step of the Windows build (QA 0.5.13 F49/F117), the sign hook of electron-builder
// (package.json build.win.signtoolOptions.sign). electron-builder calls it for every binary it signs and hands it the
// certificate it resolved from WIN_CSC_LINK / CSC_LINK (a .pfx path or base64) with WIN_CSC_KEY_PASSWORD /
// CSC_KEY_PASSWORD; in CI those come from repository secrets. Without a certificate it does nothing: the build stays
// unsigned and tools/sign-report.cjs says so.
// It signs with the Authenticode API of Windows itself (Set-AuthenticodeSignature, SHA-256, a RFC 3161 timestamp from
// PHLIPPO_SIGN_TIMESTAMP or DigiCert; "none" leaves the timestamp out, for the offline self-test), so no signing tool
// has to be fetched, and it checks that the file now carries a signature by that very certificate.
const { execFileSync } = require('node:child_process');

const PS = [
  "$ErrorActionPreference = 'Stop'",
  '$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($env:PHLIPPO_SIGN_PFX, $env:PHLIPPO_SIGN_PASSWORD)',
  "if (-not $cert.HasPrivateKey) { throw 'the certificate has no private key' }",
  "$opt = @{ LiteralPath = $env:PHLIPPO_SIGN_FILE; Certificate = $cert; HashAlgorithm = 'SHA256'; IncludeChain = 'NotRoot' }",
  "if ($env:PHLIPPO_SIGN_TIMESTAMP -ne 'none') { $opt.TimestampServer = $env:PHLIPPO_SIGN_TIMESTAMP }",
  '$null = Set-AuthenticodeSignature @opt',
  '$s = Get-AuthenticodeSignature -LiteralPath $env:PHLIPPO_SIGN_FILE',
  "if (-not $s.SignerCertificate -or $s.SignerCertificate.Thumbprint -ne $cert.Thumbprint) { throw ('not signed by the certificate: ' + $s.Status) }",
  "'{0}|{1}' -f $s.Status, $cert.Thumbprint",
].join('; ');

/** @param {{ path: string, hash: string, cscInfo?: { file?: string, password?: string | null } | null }} config */
module.exports = async function sign(config) {
  const csc = config.cscInfo;
  // no certificate configured: nothing to sign
  if (!csc || !csc.file) return;
  // one SHA-256 signature per file (signingHashAlgorithms is ["sha256"]; a SHA-1 pass is skipped if one comes)
  if (config.hash && config.hash !== 'sha256') return;
  const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', PS], {
    encoding: 'utf8',
    env: { ...process.env, PHLIPPO_SIGN_FILE: config.path, PHLIPPO_SIGN_PFX: csc.file, PHLIPPO_SIGN_PASSWORD: csc.password ?? '', PHLIPPO_SIGN_TIMESTAMP: process.env.PHLIPPO_SIGN_TIMESTAMP || 'http://timestamp.digicert.com' },
  }).trim();
  const [status, thumbprint] = out.split('|');
  console.log(`  • signed  file=${config.path} signer=${thumbprint} status=${status}`);
};
