$base = "c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere"
$reportHtml = [System.IO.File]::ReadAllText("$base\tests\e2e\playwright-report\index.html")
if ($reportHtml -match '"passed":(\d+)') { Write-Host "Passed: $($Matches[1])" }
if ($reportHtml -match '"failed":(\d+)') { Write-Host "Failed: $($Matches[1])" }
if ($reportHtml -match '"skipped":(\d+)') { Write-Host "Skipped: $($Matches[1])" }
if ($reportHtml -match '"expected":(\d+)') { Write-Host "Expected: $($Matches[1])" }
if ($reportHtml -match '"unexpected":(\d+)') { Write-Host "Unexpected: $($Matches[1])" }
