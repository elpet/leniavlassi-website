// Σύστημα κρατήσεων — μιλά με το Google Apps Script (booking-backend/Code.gs)

const MONTHS = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
const MONTHS_GEN = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];
const DAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const formatDay = (s) => { const d = parseYmd(s); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };

async function api(endpoint, { params, body } = {}) {
  const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
  // text/plain → "simple request" χωρίς CORS preflight (απαραίτητο για το Apps Script)
  const response = await fetch(url, body
    ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }
    : undefined);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Σφάλμα');
  return data;
}

// ---------- Σελίδα κράτησης ----------

const root = document.getElementById('booking');
if (root && root.dataset.endpoint) initBooking(root);

function initBooking(root) {
  const endpoint = root.dataset.endpoint;
  const $ = (sel) => root.querySelector(sel);
  const state = { service: null, days: {}, month: null, date: null, slot: null };

  function goTo(step) {
    root.querySelectorAll('[data-step]').forEach((p) => { p.hidden = p.dataset.step !== String(step); });
    root.querySelectorAll('[data-step-indicator]').forEach((li) => {
      const n = Number(li.dataset.stepIndicator);
      li.classList.toggle('is-active', n === step);
      li.classList.toggle('is-done', n < step || step === 4);
    });
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  root.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go))));

  // Βήμα 1 → 2
  root.querySelectorAll('.booking-service').forEach((button) => {
    button.addEventListener('click', async () => {
      state.service = { ...button.dataset, modes: button.dataset.modes.split(',') };
      $('[data-chosen-service]').textContent = `· ${state.service.name}`;
      goTo(2);
      $('[data-loading]').hidden = false;
      $('[data-loading]').textContent = 'Αναζήτηση διαθέσιμων ωρών…';
      $('[data-picker]').hidden = true;
      $('[data-empty]').hidden = true;
      try {
        const { days } = await api(endpoint, { params: { action: 'slots', service: state.service.service } });
        state.days = days;
        const first = Object.keys(days).sort()[0];
        $('[data-loading]').hidden = true;
        if (!first) { $('[data-empty]').hidden = false; return; }
        state.date = first;
        state.month = parseYmd(first);
        state.month.setDate(1);
        $('[data-picker]').hidden = false;
        renderCalendar();
        renderTimes();
      } catch (err) {
        $('[data-loading]').textContent = `Δεν ήταν δυνατή η φόρτωση των διαθέσιμων ωρών. ${err.message}`;
      }
    });
  });

  function renderCalendar() {
    const grid = $('[data-cal-grid]');
    const year = state.month.getFullYear();
    const month = state.month.getMonth();
    $('[data-cal-month]').textContent = `${MONTHS[month]} ${year}`;
    const available = Object.keys(state.days).sort();
    const firstMonth = parseYmd(available[0]);
    const lastMonth = parseYmd(available[available.length - 1]);
    $('[data-cal-prev]').disabled = year * 12 + month <= firstMonth.getFullYear() * 12 + firstMonth.getMonth();
    $('[data-cal-next]').disabled = year * 12 + month >= lastMonth.getFullYear() * 12 + lastMonth.getMonth();

    grid.innerHTML = '';
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Δευτέρα πρώτη
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('span'));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = ymd(new Date());
    for (let day = 1; day <= daysInMonth; day++) {
      const key = ymd(new Date(year, month, day));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cal-day';
      button.textContent = day;
      if (key === today) button.classList.add('is-today');
      if (state.days[key]) {
        button.classList.add('is-available');
        button.setAttribute('aria-label', `${formatDay(key)} — ${state.days[key].length} διαθέσιμες ώρες`);
        button.addEventListener('click', () => { state.date = key; renderCalendar(); renderTimes(); });
      } else {
        button.disabled = true;
      }
      if (key === state.date) { button.classList.add('is-selected'); button.setAttribute('aria-pressed', 'true'); }
      grid.appendChild(button);
    }
  }

  function renderTimes() {
    const container = $('[data-times]');
    container.innerHTML = '';
    const slots = state.days[state.date] || [];
    $('[data-times-title]').textContent = state.date ? formatDay(state.date) : 'Επιλέξτε ημέρα';
    slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-slot';
      button.textContent = slot.label;
      button.addEventListener('click', () => {
        state.slot = slot;
        showForm();
      });
      container.appendChild(button);
    });
  }

  $('[data-cal-prev]').addEventListener('click', () => { state.month.setMonth(state.month.getMonth() - 1); renderCalendar(); });
  $('[data-cal-next]').addEventListener('click', () => { state.month.setMonth(state.month.getMonth() + 1); renderCalendar(); });

  // Βήμα 3
  const form = $('[data-form]');
  const note = $('[data-form-note]');
  form.addEventListener('input', () => { note.textContent = ''; });

  function showForm() {
    $('[data-summary-service]').textContent = state.service.name;
    $('[data-summary-when]').textContent = `${formatDay(state.date)}, ${state.slot.label}`;
    $('[data-summary-duration]').textContent = `${state.service.duration} λεπτά`;
    const modeRow = $('[data-mode-row]');
    modeRow.hidden = state.service.modes.length < 2;
    form.querySelectorAll('input[name="mode"]').forEach((input) => {
      input.closest('.mode-option').hidden = !state.service.modes.includes(input.value);
    });
    form.querySelector(`input[name="mode"][value="${state.service.modes[0]}"]`).checked = true;
    note.textContent = '';
    goTo(3);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      note.textContent = 'Παρακαλώ συμπληρώστε όλα τα πεδία και αποδεχτείτε τη συναίνεση.';
      return;
    }
    const data = new FormData(form);
    const submit = $('[data-submit]');
    submit.disabled = true;
    note.textContent = 'Καταχώρηση…';
    try {
      const result = await api(endpoint, {
        body: {
          action: 'book',
          service: state.service.service,
          start: state.slot.start,
          mode: data.get('mode'),
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          message: data.get('message'),
          consent: data.get('consent') === 'on',
          website: data.get('website'),
        },
      });
      $('[data-done-when]').textContent = `${result.service || state.service.name} · ${result.when || ''}`;
      form.reset();
      goTo(4);
    } catch (err) {
      note.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });
}

// ---------- Σελίδα ακύρωσης ----------

const cancelRoot = document.getElementById('bookingCancel');
if (cancelRoot) initCancel(cancelRoot);

async function initCancel(root) {
  const endpoint = root.dataset.endpoint;
  const params = new URLSearchParams(location.search);
  const text = root.querySelector('[data-cancel-text]');
  const actions = root.querySelector('[data-cancel-actions]');
  const confirmButton = root.querySelector('[data-cancel-confirm]');
  const request = { action: 'cancel', id: params.get('id'), token: params.get('t') };

  if (!endpoint || !request.id || !request.token) {
    text.textContent = 'Ο σύνδεσμος ακύρωσης δεν είναι έγκυρος.';
    return;
  }
  try {
    const info = await api(endpoint, { body: request });
    text.innerHTML = '';
    text.append('Θέλετε να ακυρώσετε το ραντεβού ');
    const strong = document.createElement('strong');
    strong.textContent = `${info.title}, ${info.when}`;
    text.append(strong, ';');
    actions.hidden = false;
  } catch (err) {
    text.textContent = err.message;
    return;
  }
  confirmButton.addEventListener('click', async () => {
    confirmButton.disabled = true;
    try {
      const result = await api(endpoint, { body: { ...request, confirm: true } });
      text.textContent = `Το ραντεβού της ${result.when} ακυρώθηκε. Σας στείλαμε email επιβεβαίωσης.`;
      actions.hidden = true;
      root.querySelector('[data-cancel-new]').hidden = false;
    } catch (err) {
      text.textContent = err.message;
      confirmButton.disabled = false;
    }
  });
}
