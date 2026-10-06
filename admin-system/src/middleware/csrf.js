const crypto = require('crypto');

// Double-submit pattern: το token εκδίδεται στο session κατά το login και πρέπει
// να επιστρέφεται σε custom header σε κάθε αίτημα που αλλάζει δεδομένα.
function issueCsrfToken(req) {
  const token = crypto.randomBytes(24).toString('hex');
  req.session.csrfToken = token;
  return token;
}

function requireCsrf(req, res, next) {
  const headerToken = req.get('X-CSRF-Token');
  if (!headerToken || !req.session.csrfToken || headerToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Μη έγκυρο ή ληγμένο token ασφαλείας. Ανανεώστε τη σελίδα.' });
  }
  next();
}

module.exports = { issueCsrfToken, requireCsrf };
