const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { issueCsrfToken } = require('../middleware/csrf');
const { logAction } = require('../audit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Πάρα πολλές προσπάθειες σύνδεσης. Δοκιμάστε ξανά σε 15 λεπτά.' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Απαιτούνται email και κωδικός.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAction(null, 'login_failed', 'user', null, { email });
    return res.status(401).json({ error: 'Λανθασμένα στοιχεία σύνδεσης.' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Σφάλμα διακομιστή.' });
    req.session.userId = user.id;
    req.session.email = user.email;
    const csrfToken = issueCsrfToken(req);
    logAction(user.id, 'login_success', 'user', user.id, {});
    res.json({ ok: true, csrfToken, email: user.email });
  });
});

router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(() => {
    logAction(userId, 'logout', 'user', userId, {});
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Δεν έχετε συνδεθεί.' });
  const csrfToken = req.session.csrfToken || issueCsrfToken(req);
  res.json({ ok: true, email: req.session.email, csrfToken });
});

module.exports = router;
