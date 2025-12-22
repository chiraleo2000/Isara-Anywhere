# Enhanced HTML Presentation Generator for Mermaid Diagrams
# Generates responsive, full-screen presentations with dynamic sizing

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
    
    # Generate Enhanced HTML
$htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$($metadata.title) - IZARA TELEMEDICINE</title>
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
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1vh;
            overflow: hidden;
        }
        
        .container {
            width: 98vw;
            height: 96vh;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 2vh 2vw;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        header {
            text-align: center;
            margin-bottom: 1.5vh;
            padding-bottom: 1vh;
            border-bottom: 4px solid #667eea;
            flex-shrink: 0;
        }
        
        h1 {
            font-size: clamp(2rem, 4vw, 4rem);
            color: #2d3748;
            font-weight: 800;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .subtitle {
            font-size: clamp(1.2rem, 2.5vw, 2rem);
            color: #667eea;
            font-weight: 600;
        }
        
        .diagram-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            min-height: 0;
            padding: 2vh 1vw;
            background: #fafafa;
            border-radius: 12px;
            position: relative;
        }
        
        .mermaid {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            transform-origin: center center;
            transition: transform 0.3s ease;
        }
        
        .mermaid svg {
            max-width: 95% !important;
            max-height: 95% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
        }
        
        /* Ensure SVG scales to fit container */
        .mermaid > svg {
            display: block;
            margin: 0 auto;
        }
        
        .nav-buttons {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5vh;
            padding-top: 1vh;
            border-top: 2px solid #e2e8f0;
            flex-shrink: 0;
        }
        
        .nav-button {
            padding: 1vh 2vw;
            font-size: clamp(1rem, 1.5vw, 1.4rem);
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
        
        /* Zoom controls */
        .zoom-controls {
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            z-index: 100;
            background: rgba(255, 255, 255, 0.9);
            padding: 0.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .zoom-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #667eea;
            color: white;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .zoom-btn:hover {
            background: #764ba2;
            transform: scale(1.1);
        }
        
        .download-btn {
            position: absolute;
            top: 1rem;
            left: 1rem;
            padding: 0.8rem 1.5rem;
            background: linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
            transition: all 0.3s ease;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .download-btn:hover {
            background: linear-gradient(135deg, #EE5A24 0%, #C23616 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
        }
        
        /* Improve text visibility */
        .mermaid text {
            font-size: 32px !important;
            font-weight: 900 !important;
            font-family: 'Segoe UI', Arial, sans-serif !important;
        }
        
        .mermaid .nodeLabel {
            font-size: 36px !important;
            font-weight: 900 !important;
            line-height: 1.5 !important;
        }
        
        .mermaid .edgeLabel {
            font-size: 28px !important;
            font-weight: 800 !important;
            background: rgba(255, 255, 255, 0.95) !important;
            padding: 8px 16px !important;
            border-radius: 8px !important;
            box-shadow: 0 3px 10px rgba(0,0,0,0.15) !important;
        }
        
        .mermaid .cluster-label {
            font-size: 38px !important;
            font-weight: 900 !important;
        }
        
        /* Section title text */
        .mermaid .cluster text {
            font-size: 36px !important;
            font-weight: 900 !important;
        }
        
        /* Improve node visibility */
        .mermaid .node rect,
        .mermaid .node circle,
        .mermaid .node polygon {
            stroke-width: 4px !important;
        }
        
        /* Improve edge visibility */
        .mermaid .edgePath path {
            stroke-width: 4px !important;
        }
        
        /* Arrow markers */
        .mermaid .marker
        .mermaid .node circle,
        .mermaid .node polygon {
            stroke-width: 3px !important;
        }
        
        /* Improve edge visibility */
        .mermaid .edgePath path {
            stroke-width: 3px !important;
        }
        
        /* Keyboard hint */
        .keyboard-hint {
            position: absolute;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.9rem;
            color: #666;
            background: rgba(255, 255, 255, 0.9);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
        
        .keyboard-hint:hover {
            opacity: 1;
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
            <button class="download-btn" onclick="downloadPNG()" title="Download as PNG">
                <span>📥</span>
                <span>Download PNG</span>
            </button>
            <div class="zoom-controls">
                <button class="zoom-btn" onclick="zoomIn()" title="Zoom In">+</button>
                <button class="zoom-btn" onclick="resetZoom()" title="Reset">⟲</button>
                <button class="zoom-btn" onclick="zoomOut()" title="Zoom Out">−</button>
            </div>
            <div class="keyboard-hint">
                💡 Use arrow keys to navigate | +/- to zoom | R to reset
            </div>
            <div class="mermaid" id="diagram">
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
    } else {
        $htmlContent += @"

                <span class="nav-button disabled">← Previous</span>
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
    } else {
        $htmlContent += @"

                <span class="nav-button disabled">Next →</span>
"@
    }

    $htmlContent += @"

            </div>
        </div>
    </div>

    <script>
        // Enhanced Mermaid initialization with larger text
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                fontSize: '40px',
                fontFamily: 'Segoe UI, Arial, sans-serif'
            },
            flowchart: {
                curve: 'basis',
                padding: 30,
                nodeSpacing: 120,
                rankSpacing: 140,
                diagramPadding: 30,
                htmlLabels: true,
                useMaxWidth: true
            },
            securityLevel: 'loose'
        });
        
        // Auto-fit diagram on load
        window.addEventListener('load', function() {
            setTimeout(function() {
                const diagram = document.querySelector('.mermaid svg');
                if (diagram) {
                    // Get viewport and SVG dimensions
                    const container = document.querySelector('.diagram-container');
                    const containerWidth = container.clientWidth * 0.95;
                    const containerHeight = container.clientHeight * 0.95;
                    
                    const svgWidth = diagram.getBBox().width;
                    const svgHeight = diagram.getBBox().height;
                    
                    // Calculate scale to fit
                    const scaleX = containerWidth / svgWidth;
                    const scaleY = containerHeight / svgHeight;
                    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down if needed
                    
                    // Set viewBox to ensure complete visibility
                    const bbox = diagram.getBBox();
                    diagram.setAttribute('viewBox', (bbox.x - 20) + ' ' + (bbox.y - 20) + ' ' + (bbox.width + 40) + ' ' + (bbox.height + 40));
                    diagram.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                }
            }, 500);
        });

        // Zoom functionality
        let currentZoom = 1;
        const zoomStep = 0.2;
        const minZoom = 0.5;
        const maxZoom = 3;
        const diagram = document.getElementById('diagram');

        function updateZoom() {
            diagram.style.transform = 'scale(' + currentZoom + ')';
        }

        function zoomIn() {
            if (currentZoom < maxZoom) {
                currentZoom += zoomStep;
                updateZoom();
            }
        }

        function zoomOut() {
            if (currentZoom > minZoom) {
                currentZoom -= zoomStep;
                updateZoom();
            }
        }

        function resetZoom() {
            currentZoom = 1;
            updateZoom();
        }

        // Download PNG function with improved SVG to PNG conversion
        async function downloadPNG() {
            const svg = document.querySelector('.mermaid svg');
            if (!svg) {
                alert('Diagram not ready yet. Please wait a moment and try again.');
                return;
            }

            try {
                // Clone SVG to avoid modifying original
                const svgClone = svg.cloneNode(true);
                
                // Get computed styles and inline them
                const allElements = svgClone.querySelectorAll('*');
                allElements.forEach((element) => {
                    const computedStyle = window.getComputedStyle(svg.querySelector(element.tagName));
                    let styleString = '';
                    for (let i = 0; i < computedStyle.length; i++) {
                        const prop = computedStyle[i];
                        styleString += prop + ':' + computedStyle.getPropertyValue(prop) + ';';
                    }
                    element.setAttribute('style', styleString);
                });

                // Get SVG dimensions
                const bbox = svg.getBBox();
                const width = bbox.width + 80;
                const height = bbox.height + 80;
                
                // Set SVG attributes
                svgClone.setAttribute('width', width);
                svgClone.setAttribute('height', height);
                svgClone.setAttribute('viewBox', (bbox.x - 40) + ' ' + (bbox.y - 40) + ' ' + width + ' ' + height);

                // Serialize SVG
                const svgString = new XMLSerializer().serializeToString(svgClone);
                const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});

                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = width * 2; // 2x for better quality
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                ctx.scale(2, 2); // Scale for better quality

                // Create image
                const img = new Image();
                const url = URL.createObjectURL(svgBlob);

                img.onload = function() {
                    // Fill white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    
                    // Draw SVG
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to PNG and download
                    canvas.toBlob(function(blob) {
                        const link = document.createElement('a');
                        link.download = '$baseName.png';
                        link.href = URL.createObjectURL(blob);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        URL.revokeObjectURL(link.href);
                        
                        alert('PNG image downloaded successfully!');
                    }, 'image/png', 1.0);
                };

                img.onerror = function(error) {
                    console.error('Error loading SVG:', error);
                    alert('Error converting to PNG. Please try again.');
                    URL.revokeObjectURL(url);
                };

                img.src = url;
                
            } catch (error) {
                console.error('Download error:', error);
                alert('Error downloading PNG: ' + error.message);
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', function(event) {
            switch(event.key) {
                case 'ArrowLeft':
"@

    if ($prevLink) {
        $htmlContent += @"

                    window.location.href = '$prevLink';
"@
    }

    $htmlContent += @"

                    break;
                case 'ArrowRight':
"@

    if ($nextLink) {
        $htmlContent += @"

                    window.location.href = '$nextLink';
"@
    }

    $htmlContent += @"

                    break;
                case '=':
                case '+':
                    zoomIn();
                    break;
                case '-':
                case '_':
                    zoomOut();
                    break;
                case 'r':
                case 'R':
                case '0':
                    resetZoom();
                    break;
                case 'h':
                case 'H':
                    window.location.href = 'index.html';
                    break;
            }
        });

        // Auto-hide keyboard hint after 5 seconds
        setTimeout(() => {
            const hint = document.querySelector('.keyboard-hint');
            if (hint) {
                hint.style.opacity = '0.3';
            }
        }, 5000);
    </script>
</body>
</html>
"@

    # Write HTML file
    $outputFile = Join-Path $outputPath "$baseName.html"
    $htmlContent | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "Generated: $baseName.html"
}

Write-Host "`nAll presentation files generated successfully!"
Write-Host "Location: $outputPath"
Write-Host "Open index.html to start browsing."
