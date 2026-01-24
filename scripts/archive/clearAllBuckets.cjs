/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - BUCKET CLEANER
 * ================================================================================
 *
 * ⚠️  DANGER: This script DELETES ALL DATA from GCS buckets!
 *
 * Use this only when you need to completely reset the project.
 * Requires explicit confirmation to prevent accidental data loss.
 *
 * Usage:
 *   node scripts/project-init/clearAllBuckets.cjs
 *   node scripts/project-init/clearAllBuckets.cjs --confirm    (skip confirmation prompt)
 *   node scripts/project-init/clearAllBuckets.cjs --dry-run    (show what would be deleted)
 *
 * @version 1.0.0
 * @date December 2025
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm') || args.includes('-y');
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Load environment
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// GCS Buckets
const GCS_BUCKETS = {
  AUTH: process.env.GCS_BUCKET_AUTH || 'izara-users-credentials',
  PATIENT: process.env.GCS_BUCKET_PATIENT || 'izara-patients-data',
  DOCTOR: process.env.GCS_BUCKET_DOCTOR || 'izara-doctors-data',
  APPOINTMENTS: process.env.GCS_BUCKET_APPOINTMENTS || 'izara-appointments',
  METADATA: process.env.GCS_BUCKET_METADATA || 'izara-meta-data'
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const icons = {
    info: '📘',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    danger: '🔴',
    delete: '🗑️'
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// ============================================================================
// GCS FUNCTIONS
// ============================================================================

let storage;

function initializeStorage() {
  const projectId = process.env.GCP_PROJECT_ID || 'izara-telemedicine';
  
  const credentialPaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, '../../credentials/service-account.json'),
    path.join(__dirname, '../../Isara-doctor-portal/public/izara-telemedicine-dd0b6abe2bc8.json'),
  ].filter(Boolean);
  
  for (const credPath of credentialPaths) {
    if (fs.existsSync(credPath)) {
      return new Storage({ projectId, keyFilename: credPath });
    }
  }
  
  return new Storage({ projectId });
}

async function countFilesInBucket(bucketName) {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles();
    return files.length;
  } catch (error) {
    return 0;
  }
}

async function clearBucket(bucketName) {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      log(`  ${bucketName}: Already empty`, 'info');
      return { deleted: 0, errors: 0 };
    }
    
    let deleted = 0;
    let errors = 0;
    
    for (const file of files) {
      if (DRY_RUN) {
        if (VERBOSE) log(`    Would delete: ${file.name}`, 'delete');
      } else {
        try {
          await file.delete();
          if (VERBOSE) log(`    Deleted: ${file.name}`, 'delete');
          deleted++;
        } catch (err) {
          log(`    Error deleting ${file.name}: ${err.message}`, 'error');
          errors++;
        }
      }
    }
    
    if (DRY_RUN) {
      log(`  ${bucketName}: Would delete ${files.length} files`, 'info');
      return { deleted: files.length, errors: 0 };
    } else {
      log(`  ${bucketName}: Deleted ${deleted} files${errors > 0 ? `, ${errors} errors` : ''}`, 'success');
      return { deleted, errors };
    }
  } catch (error) {
    log(`  ${bucketName}: Error - ${error.message}`, 'error');
    return { deleted: 0, errors: 1 };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function clearAllBuckets() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║    ⚠️  IZARA TELEMEDICINE - BUCKET CLEANER                     ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  THIS WILL DELETE ALL DATA FROM ALL BUCKETS!                  ║');
  console.log('║  This action CANNOT be undone!                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
  }
  
  storage = initializeStorage();
  
  // Show what will be deleted
  console.log('Buckets to clear:\n');
  let totalFiles = 0;
  
  for (const [key, bucketName] of Object.entries(GCS_BUCKETS)) {
    const count = await countFilesInBucket(bucketName);
    totalFiles += count;
    console.log(`  ${key}: ${bucketName} (${count} files)`);
  }
  
  console.log(`\nTotal files to delete: ${totalFiles}\n`);
  
  if (totalFiles === 0) {
    log('All buckets are already empty. Nothing to delete.', 'success');
    process.exit(0);
  }
  
  // Confirmation
  if (!CONFIRM && !DRY_RUN) {
    console.log('');
    const confirmed = await askConfirmation('⚠️  Type "yes" to confirm deletion: ');
    
    if (!confirmed) {
      log('Aborted by user.', 'info');
      process.exit(0);
    }
  }
  
  // Clear buckets
  console.log('\nClearing buckets...\n');
  
  let totalDeleted = 0;
  let totalErrors = 0;
  
  for (const [key, bucketName] of Object.entries(GCS_BUCKETS)) {
    log(`Clearing ${key}...`, 'delete');
    const result = await clearBucket(bucketName);
    totalDeleted += result.deleted;
    totalErrors += result.errors;
  }
  
  // Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (DRY_RUN) {
    console.log(`🔍 DRY RUN: Would have deleted ${totalDeleted} files`);
  } else {
    console.log(`✅ Deleted ${totalDeleted} files from all buckets`);
    if (totalErrors > 0) {
      console.log(`❌ ${totalErrors} errors occurred`);
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (!DRY_RUN && totalErrors === 0) {
    console.log('You can now reinitialize the project:');
    console.log('  node scripts/project-init/initializeProject.cjs\n');
  }
}

clearAllBuckets().catch(error => {
  log(`Error: ${error.message}`, 'error');
  process.exit(1);
});
