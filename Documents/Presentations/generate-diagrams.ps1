<#
.SYNOPSIS
    Generates HTML visualization files from Mermaid (.mmd) diagram files.
.DESCRIPTION
    This script iterates through all .mmd files in Presentations/diagrams,
    wraps them in an HTML template with the Mermaid.js library,
    and saves them to Presentations/html-diagrams.
    It also generates an index.html for easy navigation.
#>

$diagramsDir = Join-Path $PSScriptRoot "..\Presentations\diagrams"
$outputDir = Join-Path $PSScriptRoot "..\Presentations\html-diagrams"
# Create output directory if it doesn't exist
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$htmlTemplate = @"
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
        <a href="index.html">🔙 Back to Index</a>
        <span>|</span>
        <a href="javascript:location.reload()">🔄 Refresh</a>
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
"@

$indexContent = @"
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
    <h1>🏥 Izara Telemedicine - Architecture Visualizations</h1>
    
    <div class="grid">
"@

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

$indexContent += @"
    </div>

    <div class="dbml-section">
        <h2>💾 Database Schema</h2>
        <p>The complete database schema is defined in DBML format with 20+ tables across auth, patient, doctor, clinical, AI, and audit domains.</p>
        <p><strong>File:</strong> <code>database/izara-complete-schema-v4.dbml</code></p>
        <p>Visualize with <a href="https://dbdiagram.io" target="_blank">dbdiagram.io</a> or the VS Code DBML extension.</p>
    </div>
</body>
</html>
"@

# Also add cards for any existing HTML files not generated from .mmd sources
$generatedNames = $files | ForEach-Object { $_.BaseName }
$extraHtmlFiles = Get-ChildItem -Path $outputDir -Filter "*.html" | 
    Where-Object { $_.BaseName -ne "index" -and $_.BaseName -notin $generatedNames } | 
    Sort-Object Name

if ($extraHtmlFiles.Count -gt 0) {
    # Insert extra diagram cards before the closing </div> of the grid
    $extraCards = ""
    foreach ($extraFile in $extraHtmlFiles) {
        $extraCards += @"
        <div class="card">
            <a href="$($extraFile.Name)">
                <h3>$($extraFile.BaseName)</h3>
                <p>Extended workflow diagram</p>
            </a>
        </div>
"@
    }
    # Insert before the grid closing tag
    $indexContent = $indexContent -replace "</div>\s*<div class=`"dbml-section`"", "$extraCards    </div>`n`n    <div class=`"dbml-section`""
}

$indexContent | Out-File -FilePath (Join-Path $outputDir "index.html") -Encoding UTF8

Write-Host "✅ Generated $($files.Count) HTML diagrams from .mmd sources"
if ($extraHtmlFiles.Count -gt 0) {
    Write-Host "📎 Also indexed $($extraHtmlFiles.Count) additional HTML diagrams"
}
Write-Host "📁 Output: $outputDir"
