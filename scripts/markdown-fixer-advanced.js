#!/usr/bin/env node

/**
 * Advanced Markdown Fixer for Izara Telemedicine
 * Fixes remaining markdown linting issues:
 * - MD026: Trailing punctuation in headings
 * - MD060: Table column style
 * - MD034: Bare URLs (email addresses in Thai context)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  extensions: ['.md'],
  skipDirs: ['node_modules', '.git', 'dist', 'build', '.next'],
  checkOnly: process.argv.includes('--check-only'),
  path: process.argv.includes('--path') ? process.argv[process.argv.indexOf('--path') + 1] : '.',
};

// Statistics
let stats = {
  filesProcessed: 0,
  filesWithIssues: 0,
  fixesApplied: 0,
};

/**
 * Find all markdown files recursively
 */
function findMarkdownFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (!CONFIG.skipDirs.includes(item)) {
        files = files.concat(findMarkdownFiles(itemPath));
      }
    } else if (path.extname(item).toLowerCase() === '.md') {
      files.push(itemPath);
    }
  }
  
  return files;
}

/**
 * Fix MD026: Remove trailing punctuation from headings
 * Exception: Thai content often uses ':' in headings for clarity
 */
function fixMD026(content) {
  let fixed = content;
  let count = 0;
  
  // Only remove trailing punctuation from English headings
  // Regex: heading followed by punctuation (not colon) at end of line
  const regex = /(^#{1,6}\s+.+?)([!?;.])\s*$/gm;
  
  fixed = fixed.replace(regex, (match, heading, punctuation) => {
    // Exception: Keep ':' if it's part of Thai content context
    if (punctuation === ':' && heading.match(/[\u0E00-\u0E7F]/)) {
      return match; // Keep Thai headings with ':'
    }
    count++;
    return heading + ' ';
  });
  
  return { fixed, count };
}

/**
 * Fix MD060: Normalize table formatting
 * Ensures consistent spacing around pipes
 */
function fixMD060(content) {
  const lines = content.split('\n');
  let count = 0;
  
  const fixed = lines.map((line, i) => {
    // Check if line is table row/separator
    if (!line.includes('|')) return line;
    
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return line;
    
    // Fix spacing: ensure space after opening | and before closing |
    let fixedLine = line;
    const originalLine = fixedLine;
    
    // Add space after opening pipe if missing
    fixedLine = fixedLine.replace(/\|\s*([^ ])/g, '| $1');
    
    // Add space before closing pipe if missing (but not after -)
    fixedLine = fixedLine.replace(/([^ -])\s*\|$/g, '$1 |');
    
    // Normalize separator lines to have spaces
    if (fixedLine.includes('-')) {
      fixedLine = fixedLine.replace(/\|\s*([-:]+)\s*\|/g, '| $1 |');
    }
    
    if (fixedLine !== originalLine) {
      count++;
    }
    
    return fixedLine;
  });
  
  return { fixed: fixed.join('\n'), count };
}

/**
 * Fix MD034: Wrap bare URLs and email addresses
 * Thai documentation context: email addresses in tables should not trigger this rule
 */
function fixMD034(content) {
  // Only wrap HTTP/HTTPS URLs that are not already wrapped
  if (typeof content === 'string') {
    // Skip fixing in table cells (emails in Thai context)
    const lines = content.split('\n');
    let count = 0;
    
    const fixed = lines.map(line => {
      // Skip table rows
      if (line.includes('|')) return line;
      
      const originalLine = line;
      // Only wrap http/https URLs not already wrapped or in markdown link
      let fixedLine = line.replace(/(?<![\[\<])(https?:\/\/[^\s\>\]\)]+)(?![\]\>])/g, '<$1>');
      
      if (fixedLine !== originalLine) {
        count++;
      }
      return fixedLine;
    });
    
    return { fixed: fixed.join('\n'), count };
  }
  
  return { fixed: content, count: 0 };
}

/**
 * Fix MD012 & MD022: Heading and spacing issues
 */
function fixHeadingSpacing(content) {
  let fixed = content;
  let count = 0;
  
  // Ensure blank line before heading (except at start)
  const headingRegex = /([^\n])\n+(#{1,6}\s)/g;
  fixed = fixed.replace(headingRegex, (match, before, heading) => {
    count++;
    return before + '\n\n' + heading;
  });
  
  // Ensure blank line after heading
  const afterHeadingRegex = /(#{1,6}\s+[^\n]+)\n(?![\n#\s])/g;
  fixed = fixed.replace(afterHeadingRegex, (match, heading) => {
    // Don't add extra line if already present
    if (match.includes('\n\n')) return match;
    count++;
    return heading + '\n';
  });
  
  return { fixed, count };
}

/**
 * Process a single markdown file
 */
function processFile(filepath) {
  stats.filesProcessed++;
  
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    const originalContent = content;
    let totalFixes = 0;
    
    // Apply fixes in sequence
    let result = fixMD026(content);
    content = result.fixed;
    totalFixes += result.count;
    
    result = fixMD060(content);
    content = result.fixed;
    totalFixes += result.count;
    
    result = fixMD034(content);
    content = result.fixed;
    totalFixes += result.count;
    
    result = fixHeadingSpacing(content);
    content = result.fixed;
    totalFixes += result.count;
    
    if (totalFixes > 0) {
      stats.filesWithIssues++;
      
      if (!CONFIG.checkOnly) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Fixed: ${filepath.replace(process.cwd() + '\\', '')} (${totalFixes} fixes)`);
        stats.fixesApplied += totalFixes;
      } else {
        console.log(`⚠️  Issues: ${filepath.replace(process.cwd() + '\\', '')} (${totalFixes} fixable)`);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${filepath}: ${error.message}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔧 Advanced Markdown Fixer - Izara Telemedicine');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Mode: ${CONFIG.checkOnly ? 'CHECK-ONLY' : 'AUTO-FIX'}`);
  console.log(`Path: ${CONFIG.path}\n`);
  
  const mdFiles = findMarkdownFiles(path.resolve(CONFIG.path));
  console.log(`📄 Found ${mdFiles.length} markdown files\n`);
  
  for (const file of mdFiles) {
    processFile(file);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Statistics:`);
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   Files with issues: ${stats.filesWithIssues}`);
  
  if (CONFIG.checkOnly) {
    console.log(`   Issues found: ${stats.fixesApplied}`);
    console.log(`   Status: ❌ Issues detected (use without --check-only to fix)`);
    process.exit(stats.filesWithIssues > 0 ? 1 : 0);
  } else {
    console.log(`   Fixes applied: ${stats.fixesApplied}`);
    console.log(`   Status: ✅ Files fixed successfully`);
    process.exit(0);
  }
}

main();
