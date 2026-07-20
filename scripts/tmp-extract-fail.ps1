$content = Get-Content -Path 'reports/unit-packs/coverage-gate.txt' -Encoding Unicode
Write-Output ("total lines: " + $content.Count)
$failLines = $content | Select-String -Pattern 'FAIL'
Write-Output ("fail-containing lines: " + $failLines.Count)
$failLines | ForEach-Object { $_.Line } | Set-Content -Encoding utf8 'reports/unit-packs/fail-lines.txt'
