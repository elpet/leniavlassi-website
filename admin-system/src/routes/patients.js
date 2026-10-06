const express = require('express');
const db = require('../db');
const { encrypt, decrypt } = require('../crypto');
const { requireAuth } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { logAction } = require('../audit');

const router = express.Router();
router.use(requireAuth);

function serialize(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: decrypt(row.phone_enc),
    email: decrypt(row.email_enc),
    notes: decrypt(row.notes_enc),
    consentGiven: !!row.consent_given,
    consentAt: row.consent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM patients ORDER BY full_name COLLATE NOCASE').all();
  res.json(rows.map(serialize));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ο ασθενής δεν βρέθηκε.' });
  logAction(req.session.userId, 'view', 'patient', row.id, {});
  res.json(serialize(row));
});

router.post('/', requireCsrf, (req, res) => {
  const { fullName, phone, email, notes, consentGiven } = req.body || {};
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Το ονοματεπώνυμο είναι υποχρεωτικό.' });
  }
  if (!consentGiven) {
    return res.status(400).json({ error: 'Απαιτείται καταγεγραμμένη συγκατάθεση πριν την τήρηση στοιχείων του ασθενή.' });
  }
  const info = db
    .prepare(
      `INSERT INTO patients (full_name, phone_enc, email_enc, notes_enc, consent_given, consent_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'))`
    )
    .run(String(fullName).trim(), encrypt(phone), encrypt(email), encrypt(notes));
  logAction(req.session.userId, 'create', 'patient', info.lastInsertRowid, {});
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serialize(row));
});

router.put('/:id', requireCsrf, (req, res) => {
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ο ασθενής δεν βρέθηκε.' });
  const { fullName, phone, email, notes } = req.body || {};
  if (fullName !== undefined && !String(fullName).trim()) {
    return res.status(400).json({ error: 'Το ονοματεπώνυμο δεν μπορεί να είναι κενό.' });
  }
  db.prepare(
    `UPDATE patients SET full_name = ?, phone_enc = ?, email_enc = ?, notes_enc = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    fullName !== undefined ? String(fullName).trim() : row.full_name,
    phone !== undefined ? encrypt(phone) : row.phone_enc,
    email !== undefined ? encrypt(email) : row.email_enc,
    notes !== undefined ? encrypt(notes) : row.notes_enc,
    row.id
  );
  logAction(req.session.userId, 'update', 'patient', row.id, {});
  const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(row.id);
  res.json(serialize(updated));
});

// Δικαίωμα πρόσβασης/φορητότητας δεδομένων (ΓΚΠΔ άρθρα 15 & 20): πλήρης εξαγωγή σε JSON.
router.get('/:id/export', (req, res) => {
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ο ασθενής δεν βρέθηκε.' });
  const appointments = db
    .prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY starts_at')
    .all(row.id)
    .map((a) => ({
      id: a.id,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      status: a.status,
      topic: decrypt(a.topic_enc),
      moodRating: a.mood_rating,
      progressRating: a.progress_rating,
      notes: decrypt(a.notes_enc),
      plan: decrypt(a.plan_enc),
      createdAt: a.created_at,
    }));
  logAction(req.session.userId, 'export', 'patient', row.id, {});
  res.setHeader('Content-Disposition', `attachment; filename="patient-${row.id}-export.json"`);
  res.json({ patient: serialize(row), appointments });
});

// Δικαίωμα διαγραφής / λήθης (ΓΚΠΔ άρθρο 17): μόνιμη διαγραφή ασθενή & ραντεβού του.
router.delete('/:id', requireCsrf, (req, res) => {
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ο ασθενής δεν βρέθηκε.' });
  db.prepare('DELETE FROM patients WHERE id = ?').run(row.id);
  logAction(req.session.userId, 'delete', 'patient', row.id, { fullName: row.full_name });
  res.json({ ok: true });
});

module.exports = router;
