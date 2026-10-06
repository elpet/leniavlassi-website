# Λένια Βλάσση — Ιστοσελίδα & Διαχειριστικό Σύστημα

Ιστοσελίδα και back-office για την **Ελένη «Λένια» Βλάσση**, Ψυχολόγο - Γνωσιακή Συμπεριφορική Θεραπεύτρια (Άλιμος & online).

## Δομή του repository

```
src/                    Δημόσια ιστοσελίδα (Eleventy → στατικό HTML)
  index.njk             Αρχική
  about.njk             /about/     Σχετικά
  services.njk          /services/  Υπηρεσίες & προσέγγιση
  faq.njk               /faq/       Συχνές ερωτήσεις
  contact.njk           /contact/   Επικοινωνία & φόρμα
  blog/index.njk        /blog/      Λίστα άρθρων (σελιδοποίηση ανά 9)
  blog/posts/*.md       /blog/<slug>/  Τα άρθρα (Markdown)
  blog/feed.njk         /blog/feed.xml RSS
  _includes/            Layouts (base, post) & κοινά κομμάτια (header, footer, CTA)
  _data/site.js         Όνομα, URL, τηλέφωνο, email, διεύθυνση
  assets/  images/
eleventy.config.js
.github/workflows/deploy.yml   Αυτόματο build & deploy στο GitHub Pages

admin-system/           Ασφαλές back-office ραντεβού & ασθενών (Node/Express)
```

## Blog

Δείτε το **[BLOG.md](BLOG.md)**: πώς γράφετε ένα άρθρο (κατευθείαν από το GitHub, χωρίς εγκατάσταση) και πώς το κοινοποιείτε στο Facebook.

Κάθε άρθρο είναι ξεχωριστή σελίδα με Open Graph tags. Έτσι σε Facebook, LinkedIn, Viber και WhatsApp εμφανίζεται σωστή προεπισκόπηση (τίτλος, περιγραφή, εικόνα).

## Τοπική εκτέλεση

```bash
npm install
npm start        # dev server με live reload στο http://localhost:8080
npm run build    # παραγωγή στο _site/
```

## Δημοσίευση (GitHub Pages)

Κάθε push στο `main` κάνει αυτόματα build και deploy μέσω GitHub Actions.

Μία φορά: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Η σελίδα είναι διαθέσιμη στο `https://elpet.github.io/leniavlassi-website/`. Για δικό σας domain, ορίστε τα repository variables `SITE_URL` και `PATH_PREFIX` (δείτε το `deploy.yml`).

## Διαχειριστικό σύστημα (`admin-system/`)

Node/Express back-office ώστε η Λένια να διαχειρίζεται ραντεβού και φακέλους ασθενών: είσοδος με κωδικό, server-side sessions, CSRF προστασία, κρυπτογράφηση ευαίσθητων πεδίων (AES-256-GCM), audit log, δικαιώματα ΓΚΠΔ (εξαγωγή/διαγραφή δεδομένων), και καρτέλα ασθενή με τυποποιημένες σημειώσεις ανά συνεδρία.

Δείτε το [`admin-system/README.md`](admin-system/README.md) για πλήρη τεκμηρίωση, οδηγίες εγκατάστασης και το checklist πριν μπουν πραγματικά δεδομένα ασθενών σε παραγωγική χρήση.
