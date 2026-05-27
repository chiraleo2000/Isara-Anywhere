import pg from 'pg';
import https from 'https';
const { Pool } = pg;
const pool = new Pool({ host:'35.240.157.230', port:5432, database:'izara_phase1', user:'postgres', password:'IzaraDb2024', ssl:false });

// Apply fixed notify_data_change() using row_to_json so it works on ALL tables
console.log('Applying fixed notify_data_change() trigger function...');
await pool.query(`
CREATE OR REPLACE FUNCTION notify_data_change()
RETURNS trigger AS $$
DECLARE
  payload JSON;
  rec     JSON;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := row_to_json(OLD);
  ELSE
    rec := row_to_json(NEW);
  END IF;

  payload := json_build_object(
    'table',      TG_TABLE_NAME,
    'operation',  TG_OP,
    'id',         rec->>'id',
    'patient_id', COALESCE(rec->>'patient_id', ''),
    'doctor_id',  COALESCE(rec->>'doctor_id',  '')
  );

  PERFORM pg_notify('data_changes', payload::TEXT);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
`);
console.log('  trigger function updated OK');

// Verify notifications insert works
try {
  await pool.query(
    "INSERT INTO notifications (user_id, type, title, title_thai, message, message_thai, data) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ['DOC-TEST-001','test_trigger','Test','ทดสอบ','Test msg','ข้อความทดสอบ',JSON.stringify({test:true})]
  );
  await pool.query("DELETE FROM notifications WHERE type='test_trigger'");
  console.log('  notifications insert with trigger: SUCCESS');
} catch(e) { console.log('  notifications insert ERROR:', e.message); }

await pool.end();

// Now test the assign API over HTTPS
const DOCTOR = 'izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app';
const doReq = (method, path, body, token) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const opts = {
    hostname: DOCTOR, path, method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    }
  };
  const req = https.request(opts, res => {
    let s = '';
    res.on('data', c => s += c);
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(s || '{}') }));
  });
  req.on('error', reject);
  req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  if (payload) req.write(payload);
  req.end();
});

console.log('\nTesting admin assign-doctor API...');
const login = await doReq('POST', '/api/auth/login', { email: 'admin.test@izara.com', password: 'IzaraAdmin@2024' });
const tok = login.body.token;
console.log('Admin login:', login.status, tok ? 'token OK' : 'NO TOKEN');

const apts = await doReq('GET', '/api/appointments', null, tok);
const list = apts.body.appointments || apts.body;
const unassigned = (Array.isArray(list) ? list : []).find(a => !a.doctor_id);
console.log('Unassigned apt:', unassigned ? unassigned.id + ' status:' + unassigned.status : 'none found');

if (unassigned) {
  const assign = await doReq('PATCH', '/api/appointments/' + unassigned.id + '/assign', { doctor_id: 'DOC-TEST-001' }, tok);
  console.log('Assign status:', assign.status, 'success:', assign.body.success, assign.body.error || '');
}


const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='notifications' ORDER BY ordinal_position");
console.log('notifications columns:', r2.rows.map(r=>r.column_name).join(', '));

// Try a dummy insert to admin_actions to see the real error
try {
  await pool.query("INSERT INTO admin_actions (admin_id, action, target_id, metadata) VALUES ($1,$2,$3,$4)",
    ['ADMIN-TEST-001','assign_appointment','APT-TEST',JSON.stringify({test:true})]);
  console.log('admin_actions insert: SUCCESS');
  await pool.query("DELETE FROM admin_actions WHERE action='assign_appointment' AND admin_id='ADMIN-TEST-001'");
} catch(e) { console.log('admin_actions insert ERROR:', e.message); }

// Try a dummy insert to notifications to see the real error
try {
  await pool.query("INSERT INTO notifications (user_id, type, title, title_thai, message, message_thai, data) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    ['DOC-TEST-001','appointment_assigned','Test','ทดสอบ','Test msg','ข้อความทดสอบ',JSON.stringify({test:true})]);
  console.log('notifications insert: SUCCESS');
  await pool.query("DELETE FROM notifications WHERE type='appointment_assigned' AND user_id='DOC-TEST-001'");
} catch(e) { console.log('notifications insert ERROR:', e.message); }

await pool.end();
