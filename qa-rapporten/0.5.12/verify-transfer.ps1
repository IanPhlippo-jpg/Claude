$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\ianph\OneDrive\Bureaublad\Phlippo CAD\Claude\qa-rapporten\0.5.12'
Expand-Archive -LiteralPath 'Phlippo-CAD-0.5.12-eindrapport.zip' -DestinationPath '.'
$results = @(Get-Content -LiteralPath 'SHA256SUMS.txt' | ForEach-Object { $parts = $_ -split '  ',2; $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $parts[1]).Hash.ToLower(); [pscustomobject]@{path=$parts[1]; expected=$parts[0]; actual=$actual; match=($actual -eq $parts[0])} })
$results | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath 'SHA256-verificatie.json'
$results | Format-Table path,match -AutoSize
if (@($results | Where-Object { -not $_.match }).Count -gt 0) { exit 1 }
