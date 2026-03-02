$f="c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere\test-output.txt"
$fs=[System.IO.FileStream]::new($f,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
$sr=[System.IO.StreamReader]::new($fs)
$c=$sr.ReadToEnd()
$sr.Close(); $fs.Close()
$lines=$c -split [char]10
Write-Host "Lines: $($lines.Count)"
$start=[Math]::Max(0,$lines.Count-30)
for($i=$start;$i -lt $lines.Count;$i++){Write-Host $lines[$i]}
