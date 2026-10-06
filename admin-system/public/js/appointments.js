let appointments = [];
let patients = [];

function formatTime(iso) {
  return new Date(iso).toLocaleString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderAppointments() {
  const el = document.getElementById('appointmentsList');
  if (!appointments.length) {
    el.innerHTML = '<div class="empty-state">Δεν υπάρχουν ραντεβού.</div>';
    return;
  }
  el.innerHTML = '<table><thead><tr><th>Ημ/νία &amp; Ώρα</th><th>Ασθενής</th><th>Κατάσταση</th><th></th></tr></thead><tbody>' +
    appointments.map((a) => `
      <tr>
        <td>${formatTime(a.startsAt)}</td>
        <td><a href="/patient.html?id=${a.patientId}">${a.patientName}</a></td>
        <td><span class="badge badge-${a.status}">${a.status}</span></td>
        <td class="actions-row">
          <button class="btn btn-secondary btn-small" data-action="edit" data-id="${a.id}">Επεξεργασία</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${a.id}">Διαγραφή</button>
        </td>
      </tr>
    `).join('') + '</tbody></table>';
}

async function loadAppointments() {
  appointments = await apiFetch('/appointments');
  renderAppointments();
}

function populatePatientSelect() {
  const select = document.getElementById('patientId');
  select.innerHTML = patients.map((p) => `<option value="${p.id}">${p.fullName}</option>`).join('');
}

function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openCreateModal() {
  if (!patients.length) {
    alert('Καταχωρήστε πρώτα έναν ασθενή από τη σελίδα "Ασθενείς".');
    return;
  }
  document.getElementById('modalTitle').textContent = 'Νέο Ραντεβού';
  document.getElementById('apptForm').reset();
  document.getElementById('apptId').value = '';
  document.getElementById('formError').textContent = '';
  document.getElementById('apptModal').hidden = false;
}

function openEditModal(id) {
  const a = appointments.find((x) => x.id === id);
  if (!a) return;
  document.getElementById('modalTitle').textContent = 'Επεξεργασία Ραντεβού';
  document.getElementById('apptId').value = a.id;
  document.getElementById('patientId').value = a.patientId;
  document.getElementById('startsAt').value = toLocalInputValue(a.startsAt);
  document.getElementById('status').value = a.status;
  document.getElementById('topic').value = a.topic || '';
  document.getElementById('moodRating').value = a.moodRating || '';
  document.getElementById('progressRating').value = a.progressRating || '';
  document.getElementById('notes').value = a.notes || '';
  document.getElementById('plan').value = a.plan || '';
  document.getElementById('formError').textContent = '';
  document.getElementById('apptModal').hidden = false;
}

function closeModal() {
  document.getElementById('apptModal').hidden = true;
}

async function deleteAppointment(id) {
  if (!confirm('Διαγραφή αυτού του ραντεβού;')) return;
  await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
  await loadAppointments();
}

document.getElementById('newApptBtn').addEventListener('click', openCreateModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

document.getElementById('apptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('apptId').value;
  const payload = {
    patientId: Number(document.getElementById('patientId').value),
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
    closeModal();
    await loadAppointments();
  } catch (err) {
    document.getElementById('formError').textContent = err.message;
  }
});

document.getElementById('appointmentsList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'edit') openEditModal(id);
  else if (btn.dataset.action === 'delete') deleteAppointment(id);
});

(async function init() {
  const me = await ensureSession();
  document.getElementById('userEmail').textContent = me.email;
  patients = await apiFetch('/patients');
  populatePatientSelect();
  await loadAppointments();
})();
