const db = require('./db');

// Καταγράφει κάθε πρόσβαση/ενέργεια πάνω σε ευαίσθητα δεδομένα, για λόγους λογοδοσίας (GDPR άρθρο 5§2).
function logAction(userId, action, entityType, entityId, details) {
  db.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`
  ).run(userId ?? null, action, entityType, entityId ?? null, details ? JSON.stringify(details) : null);
}

module.exports = { logAction };
