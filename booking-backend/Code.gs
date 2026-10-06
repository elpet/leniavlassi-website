/**
 * Σύστημα κρατήσεων ραντεβού — Google Apps Script backend.
 *
 * Τρέχει στον λογαριασμό Google της θεραπεύτριας και:
 *  - υπολογίζει τις ελεύθερες ώρες από το ωράριο (ρυθμίζεται στο /admin/ του site)
 *    και τα ήδη υπάρχοντα γεγονότα του Google Calendar,
 *  - καταχωρεί το ραντεβού στο Google Calendar,
 *  - στέλνει email επιβεβαίωσης (με σύνδεσμο ακύρωσης) και ειδοποίηση στη θεραπεύτρια,
 *  - στέλνει υπενθύμιση την προηγούμενη μέρα (sendReminders, καθημερινός trigger).
 *
 * Οδηγίες εγκατάστασης: booking-backend/README.md
 */

// ====== ΡΥΘΜΙΣΕΙΣ ======
const SETTINGS = {
  // Οι ρυθμίσεις κρατήσεων (ωράριο, υπηρεσίες κ.λπ.) διαβάζονται από το site.
  // Αλλάξτε το όταν το site μεταφερθεί στο τελικό domain.
  CONFIG_URL: 'https://elpet.github.io/leniavlassi-website/rantevou/config.json',
  // Το ημερολόγιο όπου γράφονται τα ραντεβού ('primary' = το βασικό ημερολόγιο του λογαριασμού).
  CALENDAR_ID: 'primary',
  // Επιπλέον ημερολόγια που, αν έχουν γεγονός, κάνουν την ώρα μη διαθέσιμη.
  EXTRA_BUSY_CALENDAR_IDS: [],
  // Πού έρχεται η ειδοποίηση για νέο ραντεβού (κενό = ο λογαριασμός που τρέχει το script).
  NOTIFY_EMAIL: '',
  // Μέγιστος αριθμός κρατήσεων ανά email ανά 24ωρο (προστασία από spam).
  MAX_BOOKINGS_PER_EMAIL_PER_DAY: 3,
};
// ========================

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const MONTH_NAMES = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];
const MODE_LABELS = { inperson: 'Δια ζώσης', online: 'Online' };

class UserError extends Error {}

// ---------- HTTP endpoints ----------

function doGet(e) {
  const params = (e && e.parameter) || {};
  try {
    if (params.action === 'slots') {
      const config = getConfig_();
      return json_({ ok: true, ...getSlots_(config, findService_(config, params.service)) });
    }
    return json_({ ok: true, service: 'booking' });
  } catch (err) {
    return errorResponse_(err);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'book') return json_(book_(body));
    if (body.action === 'cancel') return json_(cancel_(body));
    if (body.action === 'contact') return json_(contact_(body));
    throw new UserError('Άγνωστη ενέργεια.');
  } catch (err) {
    return errorResponse_(err);
  }
}

// ---------- Διαθεσιμότητα ----------

function getConfig_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('config');
  if (cached) return JSON.parse(cached);
  const res = UrlFetchApp.fetch(SETTINGS.CONFIG_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Δεν διαβάστηκαν οι ρυθμίσεις από ' + SETTINGS.CONFIG_URL);
  const text = res.getContentText();
  cache.put('config', text, 300); // 5 λεπτά
  return JSON.parse(text);
}

function findService_(config, id) {
  const service = (config.services || []).find((s) => s.id === id);
  if (!service) throw new UserError('Η υπηρεσία δεν βρέθηκε.');
  return service;
}

function getSlots_(config, service) {
  const now = new Date();
  const from = startOfDay_(now);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + Number(config.maxDaysAhead) + 1);
  return computeSlots_(config, service, getBusy_(from, to), now);
}

/** Καθαρή συνάρτηση (χωρίς Google services) — υπολογίζει τις ελεύθερες ώρες. */
function computeSlots_(config, service, busy, now) {
  const duration = Number(service.duration) * 60000;
  const interval = Number(config.slotInterval || service.duration) * 60000;
  const buffer = Number(config.bufferMinutes || 0) * 60000;
  const earliest = now.getTime() + Number(config.minNoticeHours || 0) * 3600000;
  const blocked = new Set(config.blockedDates || []);
  const today = startOfDay_(now);
  const days = {};

  for (let offset = 0; offset <= Number(config.maxDaysAhead); offset++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const ymd = ymd_(day);
    if (blocked.has(ymd)) continue;
    const windows = (config.weeklyHours || {})[DAY_KEYS[day.getDay()]] || [];
    const slots = [];
    windows.forEach((range) => {
      const [startStr, endStr] = String(range).split('-').map((s) => s.trim());
      const windowStart = atTime_(day, startStr).getTime();
      const windowEnd = atTime_(day, endStr).getTime();
      for (let t = windowStart; t + duration <= windowEnd; t += interval) {
        if (t < earliest) continue;
        const clash = busy.some((b) => b.start < t + duration + buffer && b.end > t - buffer);
        if (!clash) slots.push({ start: new Date(t).toISOString(), label: hhmm_(new Date(t)) });
      }
    });
    if (slots.length) days[ymd] = slots;
  }
  return { days };
}

function getBusy_(from, to) {
  const ids = [SETTINGS.CALENDAR_ID].concat(SETTINGS.EXTRA_BUSY_CALENDAR_IDS);
  const busy = [];
  ids.forEach((id) => {
    const calendar = id === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
    if (!calendar) return;
    calendar.getEvents(from, to).forEach((event) => {
      if (event.getMyStatus && event.getMyStatus() === CalendarApp.GuestStatus.NO) return;
      // Τα ολοήμερα γεγονότα (π.χ. «Άδεια») κλείνουν όλη τη μέρα
      const start = event.isAllDayEvent() ? event.getAllDayStartDate() : event.getStartTime();
      const end = event.isAllDayEvent() ? event.getAllDayEndDate() : event.getEndTime();
      busy.push({ start: start.getTime(), end: end.getTime() });
    });
  });
  return busy;
}

// ---------- Κράτηση ----------

function book_(body) {
  if (body.website) return { ok: true }; // honeypot: bots

  const config = getConfig_();
  const service = findService_(config, body.service);
  const name = clean_(body.name, 100);
  const email = clean_(body.email, 200).toLowerCase();
  const phone = clean_(body.phone, 30);
  const message = clean_(body.message, 1000);
  const modes = service.modes && service.modes.length ? service.modes : ['inperson'];
  const mode = modes.includes(body.mode) ? body.mode : modes[0];

  if (name.length < 2) throw new UserError('Συμπληρώστε το ονοματεπώνυμό σας.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError('Το email δεν είναι έγκυρο.');
  if (!phone) throw new UserError('Συμπληρώστε ένα τηλέφωνο επικοινωνίας.');
  if (body.consent !== true) throw new UserError('Απαιτείται η συναίνεσή σας για την επεξεργασία των στοιχείων.');
  if (body.adult !== true) throw new UserError('Η online κράτηση απευθύνεται σε ενήλικες. Για ανήλικο, καλέστε τηλεφωνικά.');

  const cache = CacheService.getScriptCache();
  const rateKey = 'rate:' + email;
  const count = Number(cache.get(rateKey) || 0);
  if (count >= SETTINGS.MAX_BOOKINGS_PER_EMAIL_PER_DAY) {
    throw new UserError('Έχετε ήδη κάνει αρκετές κρατήσεις σήμερα. Επικοινωνήστε τηλεφωνικά για περισσότερες.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Ξαναελέγχουμε τη διαθεσιμότητα μέσα στο lock, ώστε να μη γίνει διπλή κράτηση
    const { days } = getSlots_(config, service);
    const start = new Date(body.start);
    const available = (days[ymd_(start)] || []).some((s) => s.start === start.toISOString());
    if (!available) throw new UserError('Η ώρα αυτή μόλις κλείστηκε. Παρακαλώ επιλέξτε άλλη.');

    const end = new Date(start.getTime() + Number(service.duration) * 60000);
    const token = Utilities.getUuid();
    const calendar = SETTINGS.CALENDAR_ID === 'primary'
      ? CalendarApp.getDefaultCalendar()
      : CalendarApp.getCalendarById(SETTINGS.CALENDAR_ID);
    const event = calendar.createEvent(`${service.name} — ${name}`, start, end, {
      location: mode === 'online' ? 'Online συνεδρία' : config.address,
      description: [
        `Υπηρεσία: ${service.name} (${MODE_LABELS[mode]})`,
        `Όνομα: ${name}`,
        `Email: ${email}`,
        `Τηλέφωνο: ${phone}`,
        message ? `\nΜήνυμα:\n${message}` : '',
        '\nΚράτηση από την ιστοσελίδα.',
      ].join('\n'),
    });
    event.setTag('booking', '1');
    event.setTag('token', token);
    event.setTag('email', email);
    event.setTag('name', name);
    event.setTag('reminded', '0');

    cache.put(rateKey, String(count + 1), 86400);
    cache.remove('config');

    const when = formatWhen_(start);
    const cancelUrl = `${config.siteUrl}/rantevou/akyrosi/?id=${encodeURIComponent(event.getId())}&t=${token}`;
    sendConfirmation_(config, { name, email, service, mode, start, end, when, cancelUrl });
    MailApp.sendEmail({
      to: SETTINGS.NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
      subject: `Νέο ραντεβού: ${name} — ${when}`,
      body: `${service.name} (${MODE_LABELS[mode]})\n${when}\n\n${name}\n${email}\n${phone}\n${message ? '\n' + message : ''}`,
      replyTo: email,
    });

    return { ok: true, when, service: service.name, mode: MODE_LABELS[mode] };
  } finally {
    lock.releaseLock();
  }
}

// ---------- Φόρμα επικοινωνίας ----------

function contact_(body) {
  if (body.website) return { ok: true }; // honeypot: bots
  const config = getConfig_();
  const name = clean_(body.name, 100);
  const email = clean_(body.email, 200).toLowerCase();
  const phone = clean_(body.phone, 30);
  const message = clean_(body.message, 3000);
  if (name.length < 2) throw new UserError('Συμπληρώστε το ονοματεπώνυμό σας.');
  if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) throw new UserError('Το email δεν είναι έγκυρο.');
  if (!message) throw new UserError('Γράψτε το μήνυμά σας.');
  if (body.consent !== true) throw new UserError('Απαιτείται η συναίνεσή σας για την επεξεργασία των στοιχείων.');

  const cache = CacheService.getScriptCache();
  const rateKey = 'contact:' + email;
  const count = Number(cache.get(rateKey) || 0);
  if (count >= 5) throw new UserError('Έχετε στείλει ήδη αρκετά μηνύματα. Θα επικοινωνήσω σύντομα μαζί σας.');
  cache.put(rateKey, String(count + 1), 86400);

  MailApp.sendEmail({
    to: SETTINGS.NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
    subject: `Μήνυμα από την ιστοσελίδα: ${name}`,
    body: `${name}
${email}
${phone}

${message}

— Φόρμα επικοινωνίας ${config.siteUrl}`,
    replyTo: email,
  });
  return { ok: true };
}

// ---------- Ακύρωση ----------

function cancel_(body) {
  const config = getConfig_();
  const calendar = SETTINGS.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(SETTINGS.CALENDAR_ID);
  const event = body.id ? calendar.getEventById(String(body.id)) : null;
  if (!event || event.getTag('booking') !== '1' || event.getTag('token') !== String(body.token || '')) {
    throw new UserError('Το ραντεβού δεν βρέθηκε ή έχει ήδη ακυρωθεί.');
  }
  const start = event.getStartTime();
  const hoursLeft = (start.getTime() - Date.now()) / 3600000;
  if (hoursLeft < Number(config.cancelNoticeHours || 0)) {
    throw new UserError(`Η online ακύρωση γίνεται έως ${config.cancelNoticeHours} ώρες πριν. Παρακαλώ καλέστε στο ${config.phone}.`);
  }
  if (body.confirm !== true) {
    return { ok: true, when: formatWhen_(start), title: event.getTitle().split(' — ')[0] };
  }

  const name = event.getTag('name');
  const email = event.getTag('email');
  const when = formatWhen_(start);
  event.deleteEvent();

  MailApp.sendEmail({
    to: SETTINGS.NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
    subject: `Ακύρωση ραντεβού: ${name} — ${when}`,
    body: `Ο/Η ${name} (${email}) ακύρωσε το ραντεβού της ${when}.`,
  });
  MailApp.sendEmail({
    to: email,
    name: config.siteName,
    replyTo: config.email,
    subject: `Ακύρωση ραντεβού — ${when}`,
    htmlBody: emailLayout_(config, `
      <p>Αγαπητέ/ή ${escape_(name)},</p>
      <p>Το ραντεβού σας της <strong>${when}</strong> ακυρώθηκε.</p>
      <p>Μπορείτε να κλείσετε νέο ραντεβού όποτε θέλετε:</p>
      <p><a href="${config.siteUrl}/rantevou/" style="${BUTTON_STYLE}">Νέο ραντεβού</a></p>`),
  });
  return { ok: true, cancelled: true, when };
}

// ---------- Υπενθυμίσεις (καθημερινός trigger) ----------

function sendReminders() {
  const config = getConfig_();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const calendar = SETTINGS.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(SETTINGS.CALENDAR_ID);

  calendar.getEvents(from, to).forEach((event) => {
    if (event.getTag('booking') !== '1' || event.getTag('reminded') === '1') return;
    const when = formatWhen_(event.getStartTime());
    MailApp.sendEmail({
      to: event.getTag('email'),
      name: config.siteName,
      replyTo: config.email,
      subject: `Υπενθύμιση ραντεβού — αύριο ${hhmm_(event.getStartTime())}`,
      htmlBody: emailLayout_(config, `
        <p>Αγαπητέ/ή ${escape_(event.getTag('name'))},</p>
        <p>Σας υπενθυμίζω το ραντεβού μας <strong>αύριο, ${when}</strong>.</p>
        <p>${escape_(event.getLocation() || '')}</p>
        <p>Αν χρειαστεί να το αλλάξετε, καλέστε στο ${escape_(config.phone)}.</p>`),
    });
    event.setTag('reminded', '1');
  });
}

/** Εκτελέστε το ΜΙΑ φορά από τον editor: δίνει άδειες και ενεργοποιεί τις καθημερινές υπενθυμίσεις. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sendReminders')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendReminders').timeBased().everyDays(1).atHour(10).create();
  const config = getConfig_();
  Logger.log('ΟΚ — ρυθμίσεις από %s, %s υπηρεσίες. Ημερολόγιο: %s',
    SETTINGS.CONFIG_URL, config.services.length, CalendarApp.getDefaultCalendar().getName());
}

// ---------- Emails ----------

const BUTTON_STYLE = 'display:inline-block;background:#4a7c74;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:600';

function sendConfirmation_(config, b) {
  const calendarLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(`${b.service.name} — ${config.siteName}`)
    + '&dates=' + gcalDate_(b.start) + '/' + gcalDate_(b.end)
    + '&location=' + encodeURIComponent(b.mode === 'online' ? 'Online' : config.address);
  const where = b.mode === 'online'
    ? 'Online συνεδρία — θα λάβετε τον σύνδεσμο της βιντεοκλήσης πριν το ραντεβού.'
    : escape_(config.address);

  MailApp.sendEmail({
    to: b.email,
    name: config.siteName,
    replyTo: config.email,
    subject: `Επιβεβαίωση ραντεβού — ${b.when}`,
    htmlBody: emailLayout_(config, `
      <p>Αγαπητέ/ή ${escape_(b.name)},</p>
      <p>Το ραντεβού σας κλείστηκε. Σας περιμένω!</p>
      <table style="border-collapse:collapse;margin:20px 0;font-size:15px">
        <tr><td style="padding:6px 16px 6px 0;color:#5b5b5b">Υπηρεσία</td><td><strong>${escape_(b.service.name)}</strong> (${MODE_LABELS[b.mode]})</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#5b5b5b">Ημερομηνία</td><td><strong>${b.when}</strong></td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#5b5b5b">Διάρκεια</td><td>${b.service.duration} λεπτά</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#5b5b5b">Τοποθεσία</td><td>${where}</td></tr>
      </table>
      <p><a href="${calendarLink}" style="${BUTTON_STYLE}">Προσθήκη στο ημερολόγιό μου</a></p>
      <p style="font-size:13px;color:#5b5b5b;margin-top:28px">Αν δεν μπορείτε να έρθετε, μπορείτε να
        <a href="${b.cancelUrl}" style="color:#4a7c74">ακυρώσετε το ραντεβού</a> έως ${config.cancelNoticeHours} ώρες πριν,
        ή να καλέσετε στο ${escape_(config.phone)}.</p>`),
  });
}

function emailLayout_(config, inner) {
  return `<div style="background:#faf8f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e6e1da">
      <p style="font-family:Georgia,serif;font-size:22px;color:#345c56;margin:0 0 20px">${escape_(config.siteName)}</p>
      ${inner}
      <hr style="border:none;border-top:1px solid #e6e1da;margin:28px 0 16px">
      <p style="font-size:12px;color:#8a8a8a;margin:0">${escape_(config.address)} · ${escape_(config.phone)}</p>
    </div></div>`;
}

// ---------- Βοηθητικά ----------

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(err) {
  if (err instanceof UserError) return json_({ ok: false, error: err.message });
  console.error(err);
  return json_({ ok: false, error: 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά ή επικοινωνήστε τηλεφωνικά.' });
}

function clean_(value, max) {
  return String(value || '').trim().slice(0, max);
}

function escape_(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function atTime_(day, hm) {
  const [h, m] = hm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m || 0);
}

function pad_(n) {
  return String(n).padStart(2, '0');
}

function ymd_(d) {
  return `${d.getFullYear()}-${pad_(d.getMonth() + 1)}-${pad_(d.getDate())}`;
}

function hhmm_(d) {
  return `${pad_(d.getHours())}:${pad_(d.getMinutes())}`;
}

function formatWhen_(d) {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${hhmm_(d)}`;
}

function gcalDate_(d) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
