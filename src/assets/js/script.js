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

// Contact form — αποστολή μέσω Web3Forms (το κλειδί ορίζεται στο /admin/ → Ρυθμίσεις)
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

    // Χωρίς κλειδί: ανοίγει το email του επισκέπτη με το μήνυμα έτοιμο
    if (!key) {
      const body = `Ονοματεπώνυμο: ${data.get('name')}\nEmail: ${data.get('email')}\nΤηλέφωνο: ${data.get('phone')}\n\n${data.get('message')}`;
      window.location.href = `mailto:${contactForm.dataset.fallbackEmail}?subject=${encodeURIComponent(data.get('subject'))}&body=${encodeURIComponent(body)}`;
      return;
    }

    data.append('access_key', key);
    const button = contactForm.querySelector('button[type="submit"]');
    button.disabled = true;
    formNote.textContent = 'Αποστολή…';
    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      formNote.textContent = 'Ευχαριστούμε! Το αίτημά σας εστάλη. Θα επικοινωνήσουμε σύντομα μαζί σας.';
      contactForm.reset();
    } catch {
      formNote.textContent = `Κάτι πήγε στραβά. Δοκιμάστε ξανά ή στείλτε email στο ${contactForm.dataset.fallbackEmail}.`;
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
