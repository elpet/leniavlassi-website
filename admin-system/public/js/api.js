const API_BASE = '/api';
let csrfToken = null;

function setCsrfToken(token) {
  csrfToken = token;
}

async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (csrfToken && method !== 'GET') {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const res = await fetch(API_BASE + path, { ...options, headers, credentials: 'same-origin' });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Μη εξουσιοδοτημένη πρόσβαση.');
  }
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // no body (e.g. file download) — ignore
  }
  if (!res.ok) {
    throw new Error(data.error || 'Παρουσιάστηκε σφάλμα.');
  }
  return data;
}

// Επιβεβαιώνει ότι υπάρχει έγκυρο session· αν όχι, στέλνει στο login. Καλείται σε κάθε προστατευμένη σελίδα.
async function ensureSession() {
  const me = await apiFetch('/auth/me');
  setCsrfToken(me.csrfToken);
  return me;
}

async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login.html';
  }
}

// Κοινό wiring για το κουμπί αποσύνδεσης σε όλες τις σελίδες (CSP: χωρίς inline onclick).
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-logout]').forEach((el) => el.addEventListener('click', logout));
});
