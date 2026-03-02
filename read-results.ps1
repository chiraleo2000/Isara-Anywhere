$f = "c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere\test-output.txt"
try {
  $r = [System.IO.File]::ReadAllLines($f)
  Write-Host "Lines: $($r.Count)"
  $start = [Math]::Max(0, $r.Count - 50)
  for ($i = $start; $i -lt $r.Count; $i++) { Write-Host $r[$i] }
} catch { Write-Host "ERROR: $($_.Exception.Message)" }
