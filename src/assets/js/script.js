document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

// Accordion (FAQ)
document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const panel = trigger.nextElementSibling;
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

    document.querySelectorAll('.accordion-trigger').forEach((otherTrigger) => {
      otherTrigger.setAttribute('aria-expanded', 'false');
      otherTrigger.nextElementSibling.style.maxHeight = null;
    });

    if (!isExpanded) {
      trigger.setAttribute('aria-expanded', 'true');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });
});

// Contact form — αποστολή μέσω του Google Apps Script των κρατήσεων (αν έχει ρυθμιστεί),
// αλλιώς μέσω Web3Forms (κλειδί στο /admin/ → Ρυθμίσεις), αλλιώς με το email του επισκέπτη.
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      formNote.textContent = 'Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία και αποδεχτείτε τη συναίνεση.';
      return;
    }

    const data = new FormData(contactForm);
    const key = contactForm.dataset.key;
    const endpoint = contactForm.dataset.endpoint;

    // Χωρίς backend: ανοίγει το email του επισκέπτη με το μήνυμα έτοιμο
    if (!key && !endpoint) {
      const body = `Ονοματεπώνυμο: ${data.get('name')}\nEmail: ${data.get('email')}\nΤηλέφωνο: ${data.get('phone')}\n\n${data.get('message')}`;
      window.location.href = `mailto:${contactForm.dataset.fallbackEmail}?subject=${encodeURIComponent(data.get('subject'))}&body=${encodeURIComponent(body)}`;
      return;
    }

    const button = contactForm.querySelector('button[type="submit"]');
    button.disabled = true;
    formNote.textContent = 'Αποστολή…';
    try {
      const response = endpoint
        ? await fetch(endpoint, {
            method: 'POST',
            // text/plain → χωρίς CORS preflight (απαιτείται από το Apps Script)
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'contact',
              name: data.get('name'),
              email: data.get('email'),
              phone: data.get('phone'),
              message: data.get('message'),
              consent: data.get('consent') === 'Ναι',
              website: data.get('botcheck') ? 'bot' : '',
            }),
          })
        : await fetch(contactForm.action, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: (data.append('access_key', key), data),
          });
      const result = await response.json();
      // Apps Script → { ok, error } · Web3Forms → { success, message }
      if (!(result.ok || result.success)) throw new Error(result.error || '');
      formNote.textContent = 'Ευχαριστούμε! Το αίτημά σας εστάλη. Θα επικοινωνήσουμε σύντομα μαζί σας.';
      contactForm.reset();
    } catch (err) {
      // Μηνύματα του server (π.χ. «Το email δεν είναι έγκυρο») · σφάλματα δικτύου → γενικό μήνυμα
      formNote.textContent = (err instanceof TypeError ? '' : err.message)
        || `Κάτι πήγε στραβά. Δοκιμάστε ξανά ή στείλτε email στο ${contactForm.dataset.fallbackEmail}.`;
    } finally {
      button.disabled = false;
    }
  });
}

// Blog share buttons
document.querySelectorAll('.share-copy').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.url);
      button.textContent = 'Αντιγράφηκε ✓';
    } catch {
      window.prompt('Αντιγράψτε το link:', button.dataset.url);
    }
  });
});

// Στο κινητό: το εγγενές μενού κοινοποίησης (Messenger, Instagram, Viber κ.λπ.)
if (navigator.share) {
  document.querySelectorAll('.share-native').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      navigator.share({ title: button.dataset.title, url: button.dataset.url }).catch(() => {});
    });
  });
}
