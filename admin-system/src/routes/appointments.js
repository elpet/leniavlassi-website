const express = require('express');
const db = require('../db');
const { encrypt, decrypt } = require('../crypto');
const { requireAuth } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { logAction } = require('../audit');

const router = express.Router();
router.use(requireAuth);

const SELECT_WITH_PATIENT = `
  SELECT a.*, p.full_name AS patient_name
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
`;

function serialize(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    topic: decrypt(row.topic_enc),
    moodRating: row.mood_rating,
    progressRating: row.progress_rating,
    notes: decrypt(row.notes_enc),
    plan: decrypt(row.plan_enc),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateRating(value, label, errors) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    errors.push(`Η βαθμολογία "${label}" πρέπει να είναι ακέραιος από 1 έως 5.`);
    return null;
  }
  return n;
}

router.get('/', (req, res) => {
  const { from, to, patientId } = req.query;
  const clauses = [];
  const params = [];
  if (from && to) {
    clauses.push('a.starts_at BETWEEN ? AND ?');
    params.push(from, to);
  }
  if (patientId) {
    clauses.push('a.patient_id = ?');
    params.push(patientId);
  }
  let query = SELECT_WITH_PATIENT;
  if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
  query += ' ORDER BY a.starts_at ASC';
  const rows = db.prepare(query).all(...params);
  res.json(rows.map(serialize));
});

router.post('/', requireCsrf, (req, res) => {
  const { patientId, startsAt, endsAt, status, topic, moodRating, progressRating, notes, plan } = req.body || {};
  if (!patientId || !startsAt) {
    return res.status(400).json({ error: 'Απαιτούνται ασθενής και ημερομηνία/ώρα έναρξης.' });
  }
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId);
  if (!patient) return res.status(400).json({ error: 'Ο ασθενής δεν βρέθηκε.' });

  const errors = [];
  const mood = validateRating(moodRating, 'Διάθεση', errors);
  const progress = validateRating(progressRating, 'Πρόοδος', errors);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const info = db
    .prepare(
      `INSERT INTO appointments (patient_id, starts_at, ends_at, status, topic_enc, mood_rating, progress_rating, notes_enc, plan_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(patientId, startsAt, endsAt || null, status || 'scheduled', encrypt(topic), mood, progress, encrypt(notes), encrypt(plan));
  logAction(req.session.userId, 'create', 'appointment', info.lastInsertRowid, {});
  const row = db.prepare(`${SELECT_WITH_PATIENT} WHERE a.id = ?`).get(info.lastInsertRowid);
  res.status(201).json(serialize(row));
});

router.put('/:id', requireCsrf, (req, res) => {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Το ραντεβού δεν βρέθηκε.' });
  const { startsAt, endsAt, status, topic, moodRating, progressRating, notes, plan } = req.body || {};

  const errors = [];
  const mood = moodRating !== undefined ? validateRating(moodRating, 'Διάθεση', errors) : row.mood_rating;
  const progress = progressRating !== undefined ? validateRating(progressRating, 'Πρόοδος', errors) : row.progress_rating;
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  db.prepare(
    `UPDATE appointments SET starts_at = ?, ends_at = ?, status = ?, topic_enc = ?, mood_rating = ?, progress_rating = ?, notes_enc = ?, plan_enc = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    startsAt ?? row.starts_at,
    endsAt !== undefined ? endsAt : row.ends_at,
    status ?? row.status,
    topic !== undefined ? encrypt(topic) : row.topic_enc,
    mood,
    progress,
    notes !== undefined ? encrypt(notes) : row.notes_enc,
    plan !== undefined ? encrypt(plan) : row.plan_enc,
    row.id
  );
  logAction(req.session.userId, 'update', 'appointment', row.id, {});
  const updated = db.prepare(`${SELECT_WITH_PATIENT} WHERE a.id = ?`).get(row.id);
  res.json(serialize(updated));
});

router.delete('/:id', requireCsrf, (req, res) => {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Το ραντεβού δεν βρέθηκε.' });
  db.prepare('DELETE FROM appointments WHERE id = ?').run(row.id);
  logAction(req.session.userId, 'delete', 'appointment', row.id, {});
  res.json({ ok: true });
});

module.exports = router;
