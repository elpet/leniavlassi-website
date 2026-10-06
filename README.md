# Λένια Βλάσση — Ιστοσελίδα & Διαχειριστικό Σύστημα

Ιστοσελίδα και back-office για την **Ελένη «Λένια» Βλάσση**, Ψυχολόγο - Γνωσιακή Συμπεριφορική Θεραπεύτρια (Άλιμος & online).

## Δομή του repository

```
/                 Δημόσια ιστοσελίδα (στατικό HTML/CSS/JS, χωρίς build step)
  index.html
  styles.css
  script.js
  images/

admin-system/     Ασφαλές back-office ραντεβού & ασθενών (Node/Express)
  README.md       Πλήρης τεκμηρίωση, εγκατάσταση, checklist παραγωγής
```

## Ιστοσελίδα

Μονοσέλιδη, responsive παρουσίαση: βιογραφικό, υπηρεσίες, προσέγγιση, στοιχεία επικοινωνίας και φόρμα ραντεβού.

Τοπική εκτέλεση — απλά ανοίξτε το `index.html`, ή σερβίρετε τον φάκελο:

```bash
npx serve .
```

## Διαχειριστικό σύστημα (`admin-system/`)

Node/Express back-office ώστε η Λένια να διαχειρίζεται ραντεβού και φακέλους ασθενών: είσοδος με κωδικό, server-side sessions, CSRF προστασία, κρυπτογράφηση ευαίσθητων πεδίων (AES-256-GCM), audit log, δικαιώματα ΓΚΠΔ (εξαγωγή/διαγραφή δεδομένων), και καρτέλα ασθενή με τυποποιημένες σημειώσεις ανά συνεδρία.

Δείτε το [`admin-system/README.md`](admin-system/README.md) για πλήρη τεκμηρίωση, οδηγίες εγκατάστασης και το checklist πριν μπουν πραγματικά δεδομένα ασθενών σε παραγωγική χρήση.

## GitHub Pages

Για να δημοσιευτεί η ιστοσελίδα: **Settings → Pages → Build and deployment → Source → Deploy from a branch**, branch `main`, folder `/ (root)`. Η σελίδα θα είναι διαθέσιμη στο `https://elpet.github.io/leniavlassi-website/`.
