const fs = require('fs');
const p = 'c:/Users/chira/Documents/Isara-telemed/Isara-Anywhere/scripts/database/cleanup-test-data.sql';
let c = fs.readFileSync(p, 'utf8');
const block = `DELETE FROM meeting_transcripts;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_chats') THEN
    DELETE FROM meeting_chats;
  END IF;
END $$;
DELETE FROM ai_validations;`;
c = c.replace(/DELETE FROM meeting_transcripts;[\s\S]*?DELETE FROM ai_validations;/, block);
fs.writeFileSync(p, c);
console.log('fixed');
