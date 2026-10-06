const params = new URLSearchParams(window.location.search);
const patientId = params.get('id');
let patient = null;
let sessions = [];

const MOOD_LABELS = { 1: 'Πολύ Χαμηλή', 2: 'Χαμηλή', 3: 'Μέτρια', 4: 'Καλή', 5: 'Πολύ Καλή' };
const PROGRESS_LABELS = { 1: 'Επιδείνωση', 2: 'Ελαφρά Επιδείνωση', 3: 'Σταθερή', 4: 'Ελαφρά Βελτίωση', 5: 'Σημαντική Βελτίωση' };

function formatTime(iso) {
  return new Date(iso).toLocaleString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderPatient() {
  document.getElementById('patientName').textContent = patient.fullName;
  document.getElementById('patientContact').textContent = [patient.phone, patient.email].filter(Boolean).join(' · ') || 'Χωρίς στοιχεία επικοινωνίας';
}

function renderSummary() {
  const el = document.getElementById('summaryBar');
  const rated = sessions.filter((s) => s.progressRating);
  const avgProgress = rated.length ? (rated.reduce((sum, s) => sum + s.progressRating, 0) / rated.length).toFixed(1) : '—';
  const lastSession = sessions.length ? sessions[sessions.length - 1] : null;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  el.innerHTML = `
    <div class="summary-tile"><strong>${sessions.length}</strong><span>σύνολο συνεδριών</span></div>
    <div class="summary-tile"><strong>${completedCount}</strong><span>ολοκληρωμένες</span></div>
    <div class="summary-tile"><strong>${avgProgress}</strong><span>μέση αξιολόγηση προόδου</span></div>
    <div class="summary-tile"><strong>${lastSession ? formatTime(lastSession.startsAt).split(',')[0] : '—'}</strong><span>τελευταία συνεδρία</span></div>
  `;
}

function renderSessions() {
  const el = document.getElementById('sessionsList');
  if (!sessions.length) {
    el.innerHTML = '<div class="empty-state">Δεν υπάρχουν καταχωρημένες συνεδρίες.</div>';
    return;
  }
  const sorted = [...sessions].sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  el.innerHTML = sorted.map((s) => `
    <div class="session-card">
      <div class="session-top">
        <span class="session-date">${formatTime(s.startsAt)}</span>
        <div class="session-badges">
          <span class="badge badge-${s.status}">${s.status}</span>
          ${s.moodRating ? `<span class="badge badge-scale">Διάθεση: ${s.moodRating}/5 — ${MOOD_LABELS[s.moodRating]}</span>` : ''}
          ${s.progressRating ? `<span class="badge badge-scale">Πρόοδος: ${s.progressRating}/5 — ${PROGRESS_LABELS[s.progressRating]}</span>` : ''}
        </div>
      </div>
      ${s.topic ? `<div class="session-field"><strong>Θέμα:</strong>${s.topic}</div>` : ''}
      ${s.notes ? `<div class="session-field"><strong>Παρατηρήσεις:</strong>${s.notes}</div>` : ''}
      ${s.plan ? `<div class="session-field"><strong>Επόμενα βήματα:</strong>${s.plan}</div>` : ''}
      <div class="actions-row" style="margin-top:10px">
        <button class="btn btn-secondary btn-small" data-action="edit-session" data-id="${s.id}">Επεξεργασία</button>
        <button class="btn btn-danger btn-small" data-action="delete-session" data-id="${s.id}">Διαγραφή</button>
      </div>
    </div>
  `).join('');
}

async function loadAll() {
  patient = await apiFetch(`/patients/${patientId}`);
  sessions = await apiFetch(`/appointments?patientId=${patientId}`);
  renderPatient();
  renderSummary();
  renderSessions();
}

// --- Modal: στοιχεία ασθενή ---
function openInfoModal() {
  document.getElementById('fullName').value = patient.fullName;
  document.getElementById('phone').value = patient.phone || '';
  document.getElementById('email').value = patient.email || '';
  document.getElementById('infoError').textContent = '';
  document.getElementById('infoModal').hidden = false;
}
function closeInfoModal() { document.getElementById('infoModal').hidden = true; }

async function exportPatient() {
  const data = await apiFetch(`/patients/${patientId}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `patient-${patientId}-export.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function deletePatient() {
  if (!confirm(`Οριστική διαγραφή του/της "${patient.fullName}" και όλων των συνεδριών του/της; Η ενέργεια δεν αναιρείται.`)) return;
  await apiFetch(`/patients/${patientId}`, { method: 'DELETE' });
  window.location.href = '/patients.html';
}

// --- Modal: σημείωση συνεδρίας ---
function openSessionModal(sessionIdToEdit) {
  const form = document.getElementById('sessionForm');
  form.reset();
  document.getElementById('sessionError').textContent = '';
  if (sessionIdToEdit) {
    const s = sessions.find((x) => x.id === sessionIdToEdit);
    document.getElementById('sessionModalTitle').textContent = 'Επεξεργασία Σημείωσης Συνεδρίας';
    document.getElementById('sessionId').value = s.id;
    document.getElementById('startsAt').value = toLocalInputValue(s.startsAt);
    document.getElementById('status').value = s.status;
    document.getElementById('topic').value = s.topic || '';
    document.getElementById('moodRating').value = s.moodRating || '';
    document.getElementById('progressRating').value = s.progressRating || '';
    document.getElementById('notes').value = s.notes || '';
    document.getElementById('plan').value = s.plan || '';
  } else {
    document.getElementById('sessionModalTitle').textContent = 'Νέα Σημείωση Συνεδρίας';
    document.getElementById('sessionId').value = '';
    document.getElementById('startsAt').value = toLocalInputValue(new Date().toISOString());
  }
  document.getElementById('sessionModal').hidden = false;
}
function closeSessionModal() { document.getElementById('sessionModal').hidden = true; }

async function deleteSession(id) {
  if (!confirm('Διαγραφή αυτής της σημείωσης συνεδρίας;')) return;
  await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
  await loadAll();
}

document.getElementById('editInfoBtn').addEventListener('click', openInfoModal);
document.getElementById('cancelInfoBtn').addEventListener('click', closeInfoModal);
document.getElementById('exportBtn').addEventListener('click', exportPatient);
document.getElementById('deleteBtn').addEventListener('click', deletePatient);
document.getElementById('newSessionBtn').addEventListener('click', () => openSessionModal());
document.getElementById('cancelSessionBtn').addEventListener('click', closeSessionModal);

document.getElementById('infoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await apiFetch(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify({
        fullName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
      }),
    });
    closeInfoModal();
    await loadAll();
  } catch (err) {
    document.getElementById('infoError').textContent = err.message;
  }
});

document.getElementById('sessionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('sessionId').value;
  const payload = {
    patientId: Number(patientId),
    startsAt: new Date(document.getElementById('startsAt').value).toISOString(),
    status: document.getElementById('status').value,
    topic: document.getElementById('topic').value,
    moodRating: document.getElementById('moodRating').value || null,
    progressRating: document.getElementById('progressRating').value || null,
    notes: document.getElementById('notes').value,
    plan: document.getElementById('plan').value,
  };
  try {
    if (id) {
      await apiFetch(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/appointments', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeSessionModal();
    await loadAll();
  } catch (err) {
    document.getElementById('sessionError').textContent = err.message;
  }
});

document.getElementById('sessionsList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'edit-session') openSessionModal(id);
  else if (btn.dataset.action === 'delete-session') deleteSession(id);
});

(async function init() {
  if (!patientId) {
    window.location.href = '/patients.html';
    return;
  }
  const me = await ensureSession();
  document.getElementById('userEmail').textContent = me.email;
  await loadAll();
})();
