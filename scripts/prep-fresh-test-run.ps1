# Prepare fresh D/E/F test run: clear local workflow state and screenshot dirs
$root = Split-Path $PSScriptRoot -Parent
$dirs = @(
  "docs\screenshots\group-D",
  "docs\screenshots\group-E",
  "docs\screenshots\group-F",
  "docs\screenshots\group-J-meeting-jitsi",
  "test-results\workflow-snapshots"
)
foreach ($d in $dirs) {
  $p = Join-Path $root $d
  if (Test-Path $p) {
    Remove-Item -Path "$p\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cleared $d"
  }
}
$wf = Join-Path $root "tests\e2e\.workflow-state.json"
if (Test-Path $wf) { Remove-Item $wf -Force; Write-Host "Removed workflow-state.json" }
Write-Host "Ready for fresh Playwright screenshots"
