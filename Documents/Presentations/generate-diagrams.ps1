<#
.SYNOPSIS
    Generates HTML visualization files from Mermaid (.mmd) diagram files.
.DESCRIPTION
    This script iterates through all .mmd files in Presentations/diagrams,
    wraps them in an HTML template with the Mermaid.js library,
    and saves them to Presentations/html-diagrams.
    It also generates an index.html for easy navigation.
#>

$diagramsDir = Join-Path $PSScriptRoot "diagrams"
$outputDir = Join-Path $PSScriptRoot "html-diagrams"
# Create output directory if it doesn't exist
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$htmlTemplate = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Izara Diagram: {{TITLE}}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 100%; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .mermaid { display: flex; justify-content: center; margin-top: 20px; }
        .nav { margin-bottom: 20px; text-align: center; }
        .nav a { margin: 0 10px; color: #3498db; text-decoration: none; font-weight: bold; }
        .nav a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="nav">
        <a href="index.html">Back to Index</a>
        <span>|</span>
        <a href="javascript:location.reload()">Refresh</a>
    </div>
    <div class="container">
        <h1>{{TITLE}}</h1>
        <div class="mermaid">
            {{CONTENT}}
        </div>
    </div>
    <script>
        mermaid.initialize({
            startOnLoad: true,
            theme: 'base',
            securityLevel: 'loose',
            themeVariables: {
                primaryColor: '#E3F2FD',
                secondaryColor: '#E8F5E9',
                tertiaryColor: '#FFF3E0',
                fontSize: '16px'
            }
        });
    </script>
</body>
</html>
'@

$indexContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Izara Telemedicine - System Diagrams</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 40px; background: #f0f2f5; }
        h1 { color: #1a1a1a; text-align: center; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.15); }
        .card a { text-decoration: none; color: inherit; display: block; height: 100%; }
        .card h3 { margin: 0 0 10px 0; color: #2196F3; }
        .card p { margin: 0; color: #666; font-size: 0.9em; }
        .dbml-section { margin-top: 40px; background: #fff; padding: 25px; border-radius: 10px; }
        code { background: #eee; padding: 2px 5px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Izara Telemedicine - Architecture Visualizations</h1>
    <div class="grid">
'@

$files = Get-ChildItem -Path $diagramsDir -Filter "*.mmd" | Sort-Object Name

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $title = $file.BaseName -replace "-", " " -replace "\d+", ""
    $title = $title.Trim()
    
    # Process Diagram Content (Escape needed characters?)
    # Mermaid handles most, but ensuring safe embedding
    
    $html = $htmlTemplate -replace "\{\{TITLE\}\}", $file.BaseName
    $html = $html -replace "\{\{CONTENT\}\}", $content
    
    $outputPath = Join-Path $outputDir "$($file.BaseName).html"
    $html | Out-File -FilePath $outputPath -Encoding UTF8
    
    $indexContent += @"
        <div class="card">
            <a href="$($file.BaseName).html">
                <h3>$($file.BaseName)</h3>
                <p>View workflow diagram</p>
            </a>
        </div>
"@
}

$generatedNames = @($files | ForEach-Object { $_.BaseName })
$extraHtmlFiles = Get-ChildItem -Path $outputDir -Filter "*.html" |
    Where-Object { $_.BaseName -ne "index" -and $_.BaseName -notin $generatedNames } |
    Sort-Object Name

foreach ($extraFile in $extraHtmlFiles) {
    $bn = $extraFile.BaseName
    $indexContent += "`n        <div class=`"card`"><a href=`"$bn.html`"><h3>$bn</h3><p>Extended workflow diagram</p></a></div>"
}

$indexContent += @'

    </div>
    <p class="version" style="text-align:center;color:#666;">v1.7.48 · Documents hub: <a href="../../README.md">README</a></p>

    <h2 style="margin-top:30px;border-bottom:2px solid #2196F3;padding-bottom:8px;">Documentation bundles</h2>
    <div class="grid">
        <div class="card"><a href="../../Technical_Documents/01_System_Architecture_and_Workflow.md"><h3>Technical_Documents 01-05 (TH)</h3><p>As-is on Google Cloud</p></a></div>
        <div class="card"><a href="../../Documents/docs/diagrams/diagrams.drawio"><h3>draw.io master</h3><p>12-tab deck + PNG export</p></a></div>
        <div class="card"><a href="../TECHNICAL_DOCUMENTATION.md"><h3>TECHNICAL_DOCUMENTATION.md</h3><p>English overview + testing</p></a></div>
        <div class="card"><a href="../../Documents/docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md"><h3>Unit + UI coverage</h3><p>Screenshot cross-reference</p></a></div>
    </div>

    <div class="dbml-section">
        <h2>Database Schema</h2>
        <p>DBML: <code>Presentations/database/izara-complete-schema-v4.dbml</code></p>
        <p>Regenerate appendix: <code>python scripts/build-appendix-process-steps.py</code></p>
    </div>
</body>
</html>
'@

$indexPath = Join-Path $outputDir "index.html"
$indexContent | Out-File -FilePath $indexPath -Encoding UTF8

Write-Host "Generated $($files.Count) core HTML diagrams from .mmd"
Write-Host "Indexed $($extraHtmlFiles.Count) extended HTML diagrams"
Write-Host "Output: $outputDir"
