const fs = require('fs');
const p = 'c:/Users/chira/Documents/Isara-telemed/Isara-Anywhere/scripts/database/cleanup-test-data.sql';
let c = fs.readFileSync(p, 'utf8');
const block = [
  'DELETE FROM meeting_transcripts;',
  'DO ' + String.fromCharCode(36,36) + ' BEGIN',
  "  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_chats') THEN",
  '    DELETE FROM meeting_chats;',
  '  END IF;',
  'END ' + String.fromCharCode(36,36) + ';',
  'DELETE FROM ai_validations;',
].join('\n');
c = c.replace(/DELETE FROM meeting_transcripts;[\s\S]*?DELETE FROM ai_validations;/, block);
fs.writeFileSync(p, c);
console.log(c.split('\n').slice(12, 20).join('\n'));
