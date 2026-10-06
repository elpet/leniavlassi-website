require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('Χρήση: npm run create-admin -- <email> <κωδικός>');
  process.exit(1);
}
if (passwordArg.length < 10) {
  console.error('Ο κωδικός πρέπει να έχει τουλάχιστον 10 χαρακτήρες.');
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const hash = bcrypt.hashSync(passwordArg, 12);

db.prepare(
  `INSERT INTO users (email, password_hash) VALUES (?, ?)
   ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash`
).run(email, hash);

console.log(`Ο λογαριασμός διαχειριστή για "${email}" δημιουργήθηκε/ενημερώθηκε.`);
process.exit(0);
