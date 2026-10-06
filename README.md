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
  _data/site.js         Όνομα, URL του site
  _data/settings.json   Τηλέφωνο, email, ωράριο, social, κλειδί φόρμας (επεξεργάσιμα από το /admin/)
  admin/                Admin panel (Sveltia CMS) → /admin/
  assets/  images/
lib/greeklish.js        Ελληνικοί τίτλοι → URL με λατινικούς
scripts/facebook-share.mjs     Αυτόματη ανάρτηση νέων άρθρων στη σελίδα Facebook
eleventy.config.js
.github/workflows/deploy.yml   Build & deploy στο GitHub Pages, καθημερινό rebuild, ανάρτηση στο Facebook
.github/facebook-shared.json   Ποια άρθρα έχουν ήδη αναρτηθεί στο Facebook (το ενημερώνει το Actions)

admin-system/           Ασφαλές back-office ραντεβού & ασθενών (Node/Express)
```

## Admin panel, Blog, Facebook & φόρμα

Δείτε το **[BLOG.md](BLOG.md)**. Περιέχει:
- σύνδεση στο admin panel (`/admin/`)
- συγγραφή, πρόχειρα και προγραμματισμό άρθρων
- αυτόματη ανάρτηση στη σελίδα Facebook (secrets `FB_PAGE_ID`, `FB_PAGE_TOKEN`)
- ενεργοποίηση της φόρμας επικοινωνίας (Web3Forms)

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

Η σελίδα είναι προσωρινά διαθέσιμη στο `https://elpet.github.io/leniavlassi-website/`. Κάθε πρωί στις 07:00 γίνεται αυτόματο rebuild, ώστε να δημοσιεύονται τα προγραμματισμένα άρθρα.

### Μεταφορά σε δικό σας domain (leniavlassi.com / .gr)

Δεν χρειάζεται καμία αλλαγή στον κώδικα:

0. Στο `booking-backend/Code.gs` (στο script.google.com) αλλάξτε το `CONFIG_URL` στο νέο domain και κάντε νέα έκδοση.
1. **Repo variables**: Settings → Secrets and variables → Actions → **Variables**:
   - `SITE_URL` = `https://leniavlassi.gr` (το τελικό domain, χωρίς `/` στο τέλος)
   - `PATH_PREFIX` = `/`
2. **Settings → Pages → Custom domain**: γράψτε το domain και ενεργοποιήστε **Enforce HTTPS** μόλις γίνει διαθέσιμο.
3. **DNS** στον πάροχο του domain:
   - 4 εγγραφές `A` για το `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` για το `www` → `elpet.github.io`
4. Actions → «Deploy site to GitHub Pages» → **Run workflow**.

> Αν το domain φιλοξενεί σήμερα άλλη ιστοσελίδα (π.χ. το leniavlassi.com), η αλλαγή DNS την αντικαθιστά.
> Τότε αφαιρέστε και την κάρτα «Επίσημη Ιστοσελίδα — leniavlassi.com» από το `src/_includes/partials/platforms.njk`.

## Νομική συμμόρφωση

Δείτε το **[LEGAL.md](LEGAL.md)**:
- Κώδικας Δεοντολογίας Ψυχολόγων (ΦΕΚ Β' 2344/2019), ΓΚΠΔ, cookies, π.δ. 131/2003
- πώς εφαρμόζονται στο site
- τι πρέπει να συμπληρώσει η επαγγελματίας (άδεια άσκησης επαγγέλματος, αμοιβές κ.λπ.)

## Κρατήσεις ραντεβού (`/rantevou/`)

Online κράτηση σε 3 βήματα: υπηρεσία → ημέρα & ώρα → στοιχεία. Είναι στο design του site και συνδέεται με το Google Calendar μέσω Google Apps Script (`booking-backend/`). Ωράριο, υπηρεσίες και αργίες ρυθμίζονται από το `/admin/`.

Εγκατάσταση: **[booking-backend/README.md](booking-backend/README.md)**. Μέχρι να γίνει, η σελίδα δείχνει το Google Appointment Schedule (αν οριστεί `googleBookingUrl`) ή παραπέμπει στη φόρμα επικοινωνίας.

## Διαχειριστικό σύστημα (`admin-system/`)

Node/Express back-office ώστε η Λένια να διαχειρίζεται ραντεβού και φακέλους ασθενών: είσοδος με κωδικό, server-side sessions, CSRF προστασία, κρυπτογράφηση ευαίσθητων πεδίων (AES-256-GCM), audit log, δικαιώματα ΓΚΠΔ (εξαγωγή/διαγραφή δεδομένων), και καρτέλα ασθενή με τυποποιημένες σημειώσεις ανά συνεδρία.

Δείτε το [`admin-system/README.md`](admin-system/README.md) για πλήρη τεκμηρίωση, οδηγίες εγκατάστασης και το checklist πριν μπουν πραγματικά δεδομένα ασθενών σε παραγωγική χρήση.
