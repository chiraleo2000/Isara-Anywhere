// Temporary test file to debug environment variables
// Delete this after fixing the issue

console.log('===== ENVIRONMENT VARIABLE TEST =====');
console.log('Mode:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);
console.log('');
console.log('Google Maps API Key:');
console.log('  Value:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
console.log('  Type:', typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
console.log('  Length:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.length || 0);
console.log('  Exists:', !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
console.log('');
console.log('Map ID:');
console.log('  Value:', import.meta.env.VITE_GOOGLE_MAPS_MAP_ID);
console.log('');
console.log('All VITE_ variables:');
Object.keys(import.meta.env)
  .filter(key => key.startsWith('VITE_'))
  .forEach(key => {
    const value = import.meta.env[key];
    console.log(`  ${key}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
  });
console.log('===== END TEST =====');

export default function TestEnv() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variable Test</h1>
      <p>Check browser console for details</p>
      <pre>{JSON.stringify({
        MODE: import.meta.env.MODE,
        HAS_MAPS_KEY: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        MAPS_KEY_LENGTH: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.length || 0,
        MAPS_KEY_PREVIEW: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 15) + '...' || 'NOT FOUND',
        HAS_MAP_ID: !!import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
      }, null, 2)}</pre>
    </div>
  );
}
