#!/usr/bin/env pwsh
<#
.SYNOPSIS
Automated Markdown Linting and Validation Script for Izara Telemedicine
Validates all markdown files against markdownlint rules and reports issues.

.DESCRIPTION
This script scans markdown files recursively, validates them with markdownlint,
and provides a comprehensive report of issues found. It can also attempt auto-fixes
for common issues.

.PARAMETER Path
Root path to scan for markdown files. Defaults to current directory.

.PARAMETER FixIssues
If specified, attempts to auto-fix common markdown issues.

.PARAMETER ExitOnError
If specified, exits with error code if issues are found.

.EXAMPLE
./markdown-validate.ps1 -Path ./Processes -FixIssues -ExitOnError
#>

param(
    [string]$Path = ".",
    [switch]$FixIssues,
    [switch]$ExitOnError
)

# Configuration
$RULES_CONFIG = @{
    'MD009' = 'no-trailing-spaces'
    'MD012' = 'no-multiple-blanks'
    'MD022' = 'blanks-around-headings'
    'MD024' = 'no-duplicate-heading'
    'MD032' = 'blanks-around-lists'
    'MD034' = 'no-bare-urls'
    'MD036' = 'no-emphasis-as-heading'
    'MD058' = 'blanks-around-tables'
    'MD060' = 'table-column-style'
}

# Colors for output
$ScriptRoot = (Get-Item $Path).FullName
$LogFile = "$ScriptRoot/markdown-validation-report.log"
$WarningCount = 0
$FixedCount = 0

Write-Host "🔍 Markdown Validation Script for Izara Telemedicine" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Path: $ScriptRoot" -ForegroundColor Gray
Write-Host "Mode: $(if ($FixIssues) { 'AUTO-FIX ENABLED' } else { 'REPORT ONLY' })" -ForegroundColor Yellow
Write-Host ""

# Check if markdownlint is installed
try {
    $mdlintVersion = npx markdownlint --version 2>$null
    Write-Host "✅ markdownlint found: $mdlintVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  markdownlint not found. Installing..." -ForegroundColor Yellow
    npm install -g markdownlint-cli 2>&1 | Out-Null
}

# Find all markdown files
$mdFiles = @(Get-ChildItem -Path $ScriptRoot -Filter "*.md" -Recurse | Where-Object { $_.FullName -notmatch 'node_modules' })
Write-Host "📄 Found $($mdFiles.Count) markdown files to validate" -ForegroundColor Cyan
Write-Host ""

# Validation results
$results = @()
$issuesByType = @{}
$issuesByFile = @{}

# Validate each file
foreach ($file in $mdFiles) {
    $relativePath = $file.FullName -replace [regex]::Escape($ScriptRoot), "."
    Write-Host "Scanning: $relativePath" -ForegroundColor Gray -NoNewline
    
    # Run markdownlint
    $lintOutput = & npx markdownlint "$($file.FullName)" 2>&1 | Where-Object { $_ -match '\[MD\d+\]' }
    
    if ($lintOutput) {
        Write-Host " ❌ Found issues" -ForegroundColor Red
        
        foreach ($line in $lintOutput) {
            if ($line -match '(\d+):\s*(\[MD\d+\])\s*(.+)') {
                $lineNum = $matches[1]
                $ruleId = ($matches[2] -replace '[\[\]]', '')
                $message = $matches[3]
                
                $issue = @{
                    File = $relativePath
                    FullPath = $file.FullName
                    Line = $lineNum
                    Rule = $ruleId
                    Message = $message
                }
                
                $results += $issue
                $WarningCount++
                
                # Track by issue type
                if (-not $issuesByType[$ruleId]) {
                    $issuesByType[$ruleId] = @()
                }
                $issuesByType[$ruleId] += $issue
                
                # Track by file
                if (-not $issuesByFile[$relativePath]) {
                    $issuesByFile[$relativePath] = @()
                }
                $issuesByFile[$relativePath] += $issue
            }
        }
    } else {
        Write-Host " ✅ Clean" -ForegroundColor Green
    }
}

# Generate Report
Write-Host ""
Write-Host "📊 Validation Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "Total Files Checked: $($mdFiles.Count)" -ForegroundColor Gray
Write-Host "Files with Issues: $($issuesByFile.Count)" -ForegroundColor Yellow
Write-Host "Total Warnings: $WarningCount" -ForegroundColor $(if ($WarningCount -gt 0) { 'Red' } else { 'Green' })

# Group by issue type
Write-Host ""
Write-Host "Issues by Type:" -ForegroundColor Cyan
$issuesByType.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | ForEach-Object {
    $count = $_.Value.Count
    $ruleId = $_.Key
    $ruleName = $RULES_CONFIG[$ruleId]
    Write-Host "  $ruleId ($ruleName): $count issues" -ForegroundColor $(if ($count -gt 10) { 'Red' } else { 'Yellow' })
}

# Detailed issues by file
Write-Host ""
Write-Host "Issues by File:" -ForegroundColor Cyan
$issuesByFile.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | ForEach-Object {
    $file = $_.Key
    $count = $_.Value.Count
    Write-Host "  $file ($count issues)" -ForegroundColor Yellow
    
    $_.Value | Group-Object Rule | ForEach-Object {
        Write-Host "    $($_.Name): $($_.Count) issues" -ForegroundColor Gray
    }
}

# Save detailed report
Write-Host ""
Write-Host "💾 Saving detailed report to: $LogFile" -ForegroundColor Cyan

$reportContent = @"
# Markdown Validation Report
## Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Summary
- Total Files Checked: $($mdFiles.Count)
- Files with Issues: $($issuesByFile.Count)
- Total Warnings: $WarningCount

## Issues by Type
"@

$issuesByType.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | ForEach-Object {
    $ruleId = $_.Key
    $ruleName = $RULES_CONFIG[$ruleId]
    $count = $_.Value.Count
    $reportContent += "`n### $ruleId - $ruleName ($count issues)`n"
}

$reportContent += "`n## Detailed Issues`n"

$results | Group-Object File | ForEach-Object {
    $reportContent += "`n### $($_.Name)`n"
    $_.Group | ForEach-Object {
        $reportContent += "`n- Line $($_.Line): $($_.Rule) - $($_.Message)`n"
    }
}

$reportContent | Out-File -FilePath $LogFile -Encoding UTF8

Write-Host "✅ Report saved!" -ForegroundColor Green

# Apply auto-fixes if requested
if ($FixIssues) {
    Write-Host ""
    Write-Host "🔧 Auto-fix Mode: Attempting to fix common issues..." -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    foreach ($file in $mdFiles) {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Fix MD009: Remove trailing spaces
        $content = $content -replace '\s+$', '' -replace '(\r?\n)\s+(\r?\n)', '$1$1'
        
        # Fix MD012: Multiple consecutive blank lines → single blank line
        $content = $content -replace '(\r?\n){3,}', "`r`n`r`n"
        
        # Fix MD036: Emphasis as heading (italic/bold lines that look like headings)
        $content = $content -replace '(?m)^(\*\*|__)(.+?)(\*\*|__)$', '## $2'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $FixedCount++
            $relativePath = $file.FullName -replace [regex]::Escape($ScriptRoot), "."
            Write-Host "  ✅ Fixed: $relativePath" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "🎉 Auto-fix Complete!" -ForegroundColor Green
    Write-Host "Files fixed: $FixedCount" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Review the changes carefully before committing!" -ForegroundColor Yellow
}

# Exit with error if requested and issues found
if ($ExitOnError -and $WarningCount -gt 0) {
    Write-Host ""
    Write-Host "❌ Exiting with error code due to issues found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✨ Validation complete!" -ForegroundColor Green
exit 0
