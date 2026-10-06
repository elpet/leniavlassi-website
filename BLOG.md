# Admin panel, Blog & Facebook — οδηγός

## 1. Admin panel

Η διαχείριση γίνεται στη διεύθυνση **`/admin/`** του site, π.χ.
`https://elpet.github.io/leniavlassi-website/admin/` (αργότερα `https://leniavlassi.gr/admin/`).

Από εκεί:
- **Άρθρα Blog**: νέο άρθρο, επεξεργασία, διαγραφή, ανέβασμα εικόνων, πρόχειρα, προγραμματισμός.
- **Ρυθμίσεις**: τηλέφωνο, email, διεύθυνση, ωράριο, Facebook/Instagram, κλειδί φόρμας επικοινωνίας.

Κάθε αποθήκευση ενημερώνει το site μόνη της σε περίπου 2 λεπτά.

### Πρώτη σύνδεση (μία φορά ανά υπολογιστή/κινητό)

Το admin panel αποθηκεύει τις αλλαγές στο GitHub, οπότε χρειάζεται ένα «κλειδί» (token):

1. Συνδεθείτε στο GitHub με λογαριασμό που έχει πρόσβαση στο repo `elpet/leniavlassi-website`.
2. Ανοίξτε το **https://github.com/settings/personal-access-tokens/new**:
   - **Token name**: `Admin ιστοσελίδας`
   - **Expiration**: έως 1 έτος (μετά φτιάχνετε νέο)
   - **Repository access** → *Only select repositories* → `leniavlassi-website`
   - **Permissions → Repository permissions → Contents** → *Read and write*
   - **Generate token**, και αντιγράψτε το (ξεκινά με `github_pat_…`)
3. Στο `/admin/` πατήστε **«Σύνδεση με χρήση token πρόσβασης»** και επικολλήστε το.

> Το κουμπί «Σύνδεση με GitHub» **δεν** λειτουργεί σε αυτή τη φιλοξενία. Χρησιμοποιήστε το token.
> Το token είναι σαν κωδικός: μην το στέλνετε σε κανέναν.

## 2. Γράφοντας ένα άρθρο

| Πεδίο | Τι κάνει |
|---|---|
| **Τίτλος** | Ο τίτλος. Από αυτόν βγαίνει αυτόματα η διεύθυνση με λατινικούς, π.χ. «Άγχος & ύπνος» → `/blog/agxos-ypnos/` |
| **Σύντομη περιγραφή** | 1-2 προτάσεις: στη λίστα του blog και στην κάρτα του Facebook |
| **Ημερομηνία** | Σήμερα → δημοσιεύεται αμέσως. **Μελλοντική** → δημοσιεύεται αυτόματα εκείνη τη μέρα στις 07:00 |
| **Κεντρική εικόνα** | Οριζόντια, περίπου **1200×630**. Αυτή φαίνεται στο Facebook |
| **Πρόχειρο** | Ενεργό → αποθηκεύεται αλλά **δεν** δημοσιεύεται |
| **Αυτόματη ανάρτηση στο Facebook** | Ενεργό (προεπιλογή) → το άρθρο αναρτάται στη σελίδα Facebook μόλις δημοσιευτεί |
| **Κείμενο ανάρτησης Facebook** | Προαιρετικό. Αν μείνει κενό, μπαίνει η σύντομη περιγραφή |

## 3. Facebook

**Αυτόματα:** με τη ρύθμιση της ενότητας 5, κάθε νέο άρθρο αναρτάται μόνο του στη σελίδα Facebook. Κάθε άρθρο αναρτάται μία φορά μόνο. Όσα είναι παλαιότερα από 14 ημέρες δεν αναρτώνται (για να μη γεμίσει η σελίδα όταν πρωτοενεργοποιηθεί).

**Χειροκίνητα:** στο τέλος κάθε άρθρου υπάρχουν κουμπιά Facebook, LinkedIn, WhatsApp, Viber, X, Email και Αντιγραφή link. Στο κινητό υπάρχει και το «Κοινοποίηση…» για Messenger, Instagram κ.λπ.

> Αν αλλάξετε εικόνα ή τίτλο αφού έχει κοινοποιηθεί, περάστε το link από το
> [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → **Scrape Again**.

## 4. Φόρμα επικοινωνίας (μία φορά)

Η φόρμα στέλνει τα μηνύματα στο email σας μέσω της δωρεάν υπηρεσίας [Web3Forms](https://web3forms.com):

1. Στο web3forms.com βάλτε το email όπου θέλετε να έρχονται τα αιτήματα → **Create Access Key**.
2. Θα σας έρθει με email ένα κλειδί (π.χ. `a1b2c3d4-…`).
3. `/admin/` → **Ρυθμίσεις → Στοιχεία επικοινωνίας & φόρμα** → **Κλειδί φόρμας** → επικόλληση → Save.

Μέχρι να μπει κλειδί, η φόρμα ανοίγει το πρόγραμμα email του επισκέπτη με το μήνυμα έτοιμο.

## 5. Ρύθμιση αυτόματης ανάρτησης στο Facebook (μία φορά, από τον διαχειριστή)

Χρειάζονται δύο τιμές, που μπαίνουν ως **secrets** στο GitHub:
repo → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Τιμή |
|---|---|
| `FB_PAGE_ID` | Το ID της σελίδας Facebook (Σελίδα → Σχετικά → Διαφάνεια σελίδας, ή από το βήμα 4 παρακάτω) |
| `FB_PAGE_TOKEN` | Page access token που δεν λήγει (δείτε τα βήματα) |

Βήματα για το token:

1. Στο [developers.facebook.com](https://developers.facebook.com/apps) → **Create App** → τύπος *Business* (ή *Other → Business*). Δεν χρειάζεται App Review αν το χρησιμοποιείτε μόνο εσείς, ως διαχειριστής της σελίδας.
2. Ανοίξτε το [Graph API Explorer](https://developers.facebook.com/tools/explorer/), επιλέξτε την εφαρμογή σας και προσθέστε τα permissions:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` → **Generate Access Token** → εγκρίνετε τη σελίδα.
3. Στο [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) επικολλήστε το token → **Extend Access Token**. Αντιγράψτε το νέο, μακράς διάρκειας token.
4. Στο Graph API Explorer, με αυτό το token, τρέξτε `GET me/accounts`. Στη γραμμή της σελίδας σας θα δείτε:
   - `id` → αυτό είναι το **FB_PAGE_ID**
   - `access_token` → αυτό είναι το **FB_PAGE_TOKEN** (δεν λήγει)
5. Βάλτε τα δύο secrets στο GitHub.

Έλεγχος: repo → **Actions** → το τελευταίο «Deploy site to GitHub Pages» → job **facebook**. Εκεί φαίνεται τι αναρτήθηκε. Χωρίς secrets, το job απλώς παραλείπεται.

## 6. Προεπισκόπηση στον υπολογιστή (προαιρετικό, για προγραμματιστές)

```bash
npm install
npm start       # → http://localhost:8080 (φαίνονται και τα πρόχειρα/προγραμματισμένα)
```
