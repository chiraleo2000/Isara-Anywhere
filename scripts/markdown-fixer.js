#!/usr/bin/env node

/**
 * Markdown Auto-Fixer for Izara Telemedicine
 * Fixes common markdown linting issues automatically
 * Usage: node markdown-fixer.js [--path ./Processes] [--check-only]
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check-only');
const basePath = args.find(a => a.startsWith('--path='))?.split('=')[1] || '.';

const RULES = {
  MD009: 'no-trailing-spaces',
  MD012: 'no-multiple-blanks',
  MD022: 'blanks-around-headings',
  MD024: 'no-duplicate-heading',
  MD032: 'blanks-around-lists',
  MD034: 'no-bare-urls',
  MD036: 'no-emphasis-as-heading',
  MD058: 'blanks-around-tables',
  MD060: 'table-column-style'
};

console.log('\n✨ Markdown Auto-Fixer for Izara Telemedicine');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Mode: ${checkOnly ? 'CHECK ONLY' : 'AUTO-FIX'}`);
console.log(`Path: ${basePath}\n`);

// Find all markdown files
function findMarkdownFiles(dir) {
  const files = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item.name)) {
        files.push(...findMarkdownFiles(path.join(dir, item.name)));
      } else if (item.isFile() && item.name.endsWith('.md')) {
        files.push(path.join(dir, item.name));
      }
    }
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e.message);
  }
  return files;
}

// Fix markdown issues
function fixMarkdownFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // MD009: Remove trailing spaces
  content = content.replaceAll(/[ \t]+$/gm, '');
  
  // MD012: Multiple consecutive blank lines → single blank line
  content = content.replaceAll(/\n{3,}/g, '\n\n');
  
  // MD022: Ensure blank line before heading (except first line)
  content = content.replaceAll(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');
  
  // MD032: Ensure blank lines around lists
  content = content.replaceAll(/([^\n])\n([-*]\s)/gm, '$1\n\n$2');
  content = content.replaceAll(/(\n[-*]\s.+)\n([^\s*-])/gm, '$1\n\n$2');
  
  // MD036: Fix emphasis used as heading (bold/italic full lines)
  content = content.replaceAll(/^(\*{2}|_{2})([^*_\n]+)\1\s*$/gm, (match, p1, p2) => {
    // Check if this looks like it should be a heading
    if (p2.length < 100 && !p2.includes('\n')) {
      return `## ${p2}`;
    }
    return match;
  });
  
  // MD034: Wrap bare URLs in angle brackets
  content = content.replaceAll(/([^[\]<])(https?:\/\/[^\s\]]+)/g, '$1<$2>');
  content = content.replaceAll(/^(https?:\/\/[^\s\]]+)$/gm, '<$1>');
  
  // MD058: Ensure blank lines around tables
  content = content.replaceAll(/(\|.+\|)\n(?!\|)/g, '$1\n\n');
  
  // MD060: Fix table formatting (ensure spaces around pipes)
  const lines = content.split('\n');
  content = lines.map((line, i) => {
    if (line.match(/^\s*\|.+\|\s*$/)) {
      // This is a table row
      let fixed = line.trim();
      // Ensure spaces around pipes
      fixed = fixed.replace(/^\|/, '| ').replace(/\|$/, ' |');
      fixed = fixed.replaceAll(/\|\|/g, ' | ');
      fixed = fixed.replaceAll(/\s+\|/g, ' |').replaceAll(/\|\s+/g, '| ');
      // Clean up multiple spaces
      fixed = fixed.replaceAll(/\s+\|/g, ' |').replaceAll(/\|\s+/g, '| ');
      return fixed;
    }
    return line;
  }).join('\n');
  
  // Apply fixes only if content changed
  if (content !== originalContent) {
    if (checkOnly) {
      return true; // Would fix
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
  }
  return false;
}

// Main execution
const mdFiles = findMarkdownFiles(basePath);
console.log(`📄 Found ${mdFiles.length} markdown files\n`);

let filesFixed = 0;
let filesThatNeedFixes = 0;

for (const file of mdFiles) {
  const relativePath = path.relative(basePath, file);
  const needsFix = fixMarkdownFile(file);
  
  if (needsFix) {
    filesThatNeedFixes++;
    if (checkOnly) {
      console.log(`📝 Would fix: ${relativePath}`);
    } else {
      filesFixed++;
      console.log(`✅ Fixed: ${relativePath}`);
    }
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (checkOnly) {
  console.log(`\n📊 Check Results: ${filesThatNeedFixes} files would be fixed`);
  process.exit(filesThatNeedFixes > 0 ? 1 : 0);
} else {
  console.log(`\n✨ Fixed ${filesFixed} files successfully`);
  process.exit(0);
}
