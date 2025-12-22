# HTML Presentation Generator for Mermaid Diagrams
# Generates 16:9 aspect ratio presentation HTML files with navigation

$basePath = "c:\Users\chira\Documents\Isara-telemed\Isara-anywhere-V0.0.2\Presentations"
$diagramsPath = Join-Path $basePath "diagrams"
$outputPath = Join-Path $basePath "html-presentations"

# Ensure output directory exists
if (!(Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath | Out-Null
}

# Define presentation titles and subtitles
$presentations = @{
    "01-system-architecture" = @{ title = "IZARA TELEMEDICINE"; subtitle = "System Architecture Overview" }
    "02-patient-features" = @{ title = "PATIENT PORTAL"; subtitle = "Features & Capabilities" }
    "03-doctor-features" = @{ title = "DOCTOR PORTAL"; subtitle = "Clinical Tools & Features" }
    "04-appointment-workflow" = @{ title = "APPOINTMENT BOOKING"; subtitle = "Scheduling Workflow" }
    "05-consultation-workflow" = @{ title = "VIDEO CONSULTATION"; subtitle = "Telemedicine Session Flow" }
    "06-emr-workflow" = @{ title = "EMR DOCUMENTATION"; subtitle = "Electronic Medical Records" }
    "07-prescribing-workflow" = @{ title = "E-PRESCRIBING"; subtitle = "Digital Prescription System" }
    "08-content-workflow" = @{ title = "MEDICAL CONTENT"; subtitle = "Content Management Workflow" }
    "09-gcs-bucket-architecture" = @{ title = "CLOUD STORAGE"; subtitle = "GCS Bucket Architecture" }
    "10-gcp-services" = @{ title = "GOOGLE CLOUD PLATFORM"; subtitle = "GCP Services Integration" }
    "11-google-services" = @{ title = "GOOGLE SERVICES"; subtitle = "Workspace Integration" }
    "12-lab-imaging-workflow" = @{ title = "LAB & IMAGING"; subtitle = "Order Management Workflow" }
    "13-auth-workflow" = @{ title = "AUTHENTICATION"; subtitle = "Security & Access Control" }
    "14-phr-workflow" = @{ title = "PERSONAL HEALTH RECORDS"; subtitle = "PHR Management System" }
    "15-healthcare-map-workflow" = @{ title = "HEALTHCARE MAP"; subtitle = "Facility Location Service" }
    "16-data-sync-workflow" = @{ title = "DATA SYNCHRONIZATION"; subtitle = "Real-time Sync Architecture" }
}

# Get all mermaid files
$mermaidFiles = Get-ChildItem -Path $diagramsPath -Filter "*.mmd" | Sort-Object Name

$fileCount = $mermaidFiles.Count

for ($i = 0; $i -lt $fileCount; $i++) {
    $file = $mermaidFiles[$i]
    $baseName = $file.BaseName
    
    # Get metadata
    $metadata = $presentations[$baseName]
    if (!$metadata) {
        Write-Warning "No metadata found for $baseName, skipping..."
        continue
    }
    
    # Read mermaid content
    $mermaidContent = Get-Content $file.FullName -Raw
    
    # Determine navigation
    $prevLink = if ($i -gt 0) { 
        $mermaidFiles[$i-1].BaseName + ".html" 
    } else { 
        $null 
    }
    
    $nextLink = if ($i -lt ($fileCount - 1)) { 
        $mermaidFiles[$i+1].BaseName + ".html" 
    } else { 
        $null 
    }
    
    # Generate HTML
$htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IZARA - $($metadata.title)</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
        }
        
        .container {
            width: 100%;
            max-width: 1920px;
            aspect-ratio: 16 / 9;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 3rem;
            display: flex;
            flex-direction: column;
        }
        
        header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 4px solid #667eea;
        }
        
        h1 {
            font-size: 3.5rem;
            color: #2d3748;
            font-weight: 800;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .subtitle {
            font-size: 1.8rem;
            color: #667eea;
            font-weight: 600;
        }
        
        .diagram-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
        }
        
        .mermaid {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .nav-buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 2px solid #e2e8f0;
        }
        
        .nav-button {
            padding: 1rem 2.5rem;
            font-size: 1.3rem;
            font-weight: 700;
            color: #ffffff;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .nav-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }
        
        .nav-button.home {
            background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
        }
        
        .nav-button.disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            opacity: 0.5;
            pointer-events: none;
        }
        
        .nav-button.disabled:hover {
            transform: none;
            box-shadow: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>$($metadata.title)</h1>
            <div class="subtitle">$($metadata.subtitle)</div>
        </header>
        
        <div class="diagram-container">
            <div class="mermaid">
$mermaidContent
            </div>
        </div>
        
        <div class="nav-buttons">
            <div>
                <a href="index.html" class="nav-button home">🏠 Home</a>
"@

    if ($prevLink) {
        $htmlContent += @"

                <a href="$prevLink" class="nav-button">← Previous</a>
"@
    }

    $htmlContent += @"

            </div>
            <div>
"@

    if ($nextLink) {
        $htmlContent += @"

                <a href="$nextLink" class="nav-button">Next →</a>
"@
    }

    $htmlContent += @"

            </div>
        </div>
    </div>

    <script>
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                fontSize: '20px',
                fontFamily: 'Arial, sans-serif'
            },
            securityLevel: 'loose'
        });
    </script>
</body>
</html>
"@

    # Save HTML file
    $outputFile = Join-Path $outputPath "$baseName.html"
    $htmlContent | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "Generated: $baseName.html" -ForegroundColor Green
}

Write-Host "`nAll presentation files generated successfully!" -ForegroundColor Cyan
Write-Host "Location: $outputPath" -ForegroundColor Cyan
Write-Host "Open index.html to start browsing." -ForegroundColor Yellow
