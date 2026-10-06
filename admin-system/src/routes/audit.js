const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Μόνο ανάγνωση: το ιστορικό πρόσβασης δεν τροποποιείται ποτέ (αρχή λογοδοσίας ΓΚΠΔ άρθρο 5§2).
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details ? JSON.parse(r.details) : null,
      createdAt: r.created_at,
    }))
  );
});

module.exports = router;
