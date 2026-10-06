function formatTime(iso) {
  return new Date(iso).toLocaleString('el-GR');
}

const ACTION_LABELS = {
  login_success: 'Επιτυχής σύνδεση',
  login_failed: 'Αποτυχημένη σύνδεση',
  logout: 'Αποσύνδεση',
  create: 'Δημιουργία',
  view: 'Προβολή',
  update: 'Ενημέρωση',
  delete: 'Διαγραφή',
  export: 'Εξαγωγή δεδομένων',
};

(async function init() {
  const me = await ensureSession();
  document.getElementById('userEmail').textContent = me.email;
  const rows = await apiFetch('/audit');
  const el = document.getElementById('auditList');
  if (!rows.length) {
    el.innerHTML = '<div class="empty-state">Δεν υπάρχουν καταχωρήσεις.</div>';
    return;
  }
  el.innerHTML = '<table><thead><tr><th>Ώρα</th><th>Ενέργεια</th><th>Τύπος</th><th>ID</th></tr></thead><tbody>' +
    rows.map((r) => `
      <tr>
        <td>${formatTime(r.createdAt)}</td>
        <td>${ACTION_LABELS[r.action] || r.action}</td>
        <td>${r.entityType}</td>
        <td>${r.entityId ?? '—'}</td>
      </tr>
    `).join('') + '</tbody></table>';
})();
