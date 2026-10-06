function formatTime(iso) {
  return new Date(iso).toLocaleString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderList(el, appointments) {
  if (!appointments.length) {
    el.innerHTML = '<div class="empty-state">Δεν υπάρχουν ραντεβού.</div>';
    return;
  }
  el.innerHTML = '<table><thead><tr><th>Ώρα</th><th>Ασθενής</th><th>Κατάσταση</th></tr></thead><tbody>' +
    appointments.map((a) => `
      <tr>
        <td>${formatTime(a.startsAt)}</td>
        <td>${a.patientName}</td>
        <td><span class="badge badge-${a.status}">${a.status}</span></td>
      </tr>
    `).join('') + '</tbody></table>';
}

(async function init() {
  try {
    const me = await ensureSession();
    document.getElementById('userEmail').textContent = me.email;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [todayAppts, upcomingAppts] = await Promise.all([
      apiFetch(`/appointments?from=${startOfToday}&to=${endOfToday}`),
      apiFetch(`/appointments?from=${startOfToday}&to=${in7Days}`),
    ]);

    renderList(document.getElementById('todayList'), todayAppts);
    renderList(document.getElementById('upcomingList'), upcomingAppts);
  } catch (err) {
    console.error(err);
  }
})();
