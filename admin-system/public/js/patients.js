let patients = [];

function renderPatients() {
  const el = document.getElementById('patientsList');
  if (!patients.length) {
    el.innerHTML = '<div class="empty-state">Δεν υπάρχουν καταχωρημένοι ασθενείς.</div>';
    return;
  }
  el.innerHTML = '<table><thead><tr><th>Όνομα</th><th>Τηλέφωνο</th><th>Email</th><th>Συγκατάθεση</th><th></th></tr></thead><tbody>' +
    patients.map((p) => `
      <tr>
        <td>${p.fullName}</td>
        <td>${p.phone || '—'}</td>
        <td>${p.email || '—'}</td>
        <td>${p.consentGiven ? '✅' : '❌'}</td>
        <td class="actions-row">
          <a class="btn btn-small" href="/patient.html?id=${p.id}">Καρτέλα</a>
          <button class="btn btn-secondary btn-small" data-action="edit" data-id="${p.id}">Επεξεργασία</button>
          <button class="btn btn-secondary btn-small" data-action="export" data-id="${p.id}">Εξαγωγή</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${p.id}">Διαγραφή</button>
        </td>
      </tr>
    `).join('') + '</tbody></table>';
}

async function loadPatients() {
  patients = await apiFetch('/patients');
  renderPatients();
}

function openCreateModal() {
  document.getElementById('modalTitle').textContent = 'Νέος Ασθενής';
  document.getElementById('patientForm').reset();
  document.getElementById('patientId').value = '';
  document.getElementById('consentRow').hidden = false;
  document.getElementById('formError').textContent = '';
  document.getElementById('patientModal').hidden = false;
}

function openEditModal(id) {
  const p = patients.find((x) => x.id === id);
  if (!p) return;
  document.getElementById('modalTitle').textContent = 'Επεξεργασία Ασθενή';
  document.getElementById('patientId').value = p.id;
  document.getElementById('fullName').value = p.fullName;
  document.getElementById('phone').value = p.phone || '';
  document.getElementById('email').value = p.email || '';
  document.getElementById('notes').value = p.notes || '';
  document.getElementById('consentRow').hidden = true; // η συγκατάθεση δίνεται μία φορά, στη δημιουργία
  document.getElementById('formError').textContent = '';
  document.getElementById('patientModal').hidden = false;
}

function closeModal() {
  document.getElementById('patientModal').hidden = true;
}

async function exportPatient(id) {
  const data = await apiFetch(`/patients/${id}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `patient-${id}-export.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function deletePatient(id) {
  const p = patients.find((x) => x.id === id);
  if (!confirm(`Οριστική διαγραφή του/της "${p.fullName}" και όλων των ραντεβού του/της; Η ενέργεια δεν αναιρείται.`)) return;
  await apiFetch(`/patients/${id}`, { method: 'DELETE' });
  await loadPatients();
}

document.getElementById('newPatientBtn').addEventListener('click', openCreateModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

document.getElementById('patientForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('patientId').value;
  const payload = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    notes: document.getElementById('notes').value,
    consentGiven: document.getElementById('consentGiven').checked,
  };
  try {
    if (id) {
      await apiFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/patients', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal();
    await loadPatients();
  } catch (err) {
    document.getElementById('formError').textContent = err.message;
  }
});

document.getElementById('patientsList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === 'edit') openEditModal(id);
  else if (btn.dataset.action === 'export') exportPatient(id);
  else if (btn.dataset.action === 'delete') deletePatient(id);
});

(async function init() {
  const me = await ensureSession();
  document.getElementById('userEmail').textContent = me.email;
  await loadPatients();
})();
