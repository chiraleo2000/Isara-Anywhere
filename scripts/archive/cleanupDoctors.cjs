/**
 * Cleanup Doctors Script
 * Removes all doctors except admin1@izara.com and doctor.test@izara.com
 */

const axios = require('axios');

const GCS_API_URL = 'http://localhost:3012';

async function cleanupDoctors() {
  try {
    console.log('🧹 Starting doctor cleanup...\n');

    // 1. Read current doctors.json
    console.log('📖 Reading doctors.json...');
    const response = await axios.get(`${GCS_API_URL}/api/storage/read`, {
      params: {
        bucket: 'izara-doctors-data',
        path: 'doctors.json'
      }
    });

    const allDoctors = response.data;
    console.log(`Found ${allDoctors.length} doctors\n`);

    // 2. Filter to keep only admin and doctor.test
    const doctorsToKeep = allDoctors.filter(doc => 
      doc.email === 'admin1@izara.com' || 
      doc.email === 'doctor.test@izara.com'
    );

    console.log('✅ Doctors to KEEP:');
    doctorsToKeep.forEach(doc => {
      console.log(`   - ${doc.name} (${doc.email}) - ${doc.id}`);
    });
    console.log('');

    const doctorsToRemove = allDoctors.filter(doc => 
      doc.email !== 'admin1@izara.com' && 
      doc.email !== 'doctor.test@izara.com'
    );

    console.log('🗑️  Doctors to REMOVE:');
    doctorsToRemove.forEach(doc => {
      console.log(`   - ${doc.name} (${doc.email}) - ${doc.id}`);
    });
    console.log('');

    // 3. Update doctors.json with only the kept doctors
    console.log('💾 Updating doctors.json...');
    await axios.post(`${GCS_API_URL}/api/storage/write`, {
      bucket: 'izara-doctors-data',
      path: 'doctors.json',
      data: doctorsToKeep
    });
    console.log('✅ doctors.json updated\n');

    // 4. Remove individual doctor profile files
    console.log('🗑️  Removing individual doctor profile files...');
    for (const doc of doctorsToRemove) {
      try {
        await axios.delete(`${GCS_API_URL}/api/storage/delete`, {
          data: {
            bucket: 'izara-doctors-data',
            path: `doctors/${doc.id}.json`
          }
        });
        console.log(`   ✅ Deleted doctors/${doc.id}.json`);
      } catch (err) {
        console.log(`   ⚠️  Could not delete doctors/${doc.id}.json (may not exist)`);
      }
    }
    console.log('');

    // 5. Summary
    console.log('✅ CLEANUP COMPLETE!');
    console.log(`   - Kept: ${doctorsToKeep.length} doctors`);
    console.log(`   - Removed: ${doctorsToRemove.length} doctors`);
    console.log('\n📋 Remaining doctors:');
    doctorsToKeep.forEach(doc => {
      console.log(`   - ${doc.name} (${doc.email})`);
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run cleanup
cleanupDoctors();
