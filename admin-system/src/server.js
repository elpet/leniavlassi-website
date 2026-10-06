require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const auditRoutes = require('./routes/audit');

if (!process.env.SESSION_SECRET) {
  console.error('Λείπει το SESSION_SECRET. Αντιγράψτε το .env.example σε .env και συμπληρώστε το.');
  process.exit(1);
}
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  console.error('Λείπει ή είναι μη έγκυρο το ENCRYPTION_KEY (πρέπει να είναι 64 hex χαρακτήρες).');
  process.exit(1);
}

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SQLiteStore = SQLiteStoreFactory(session);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(express.json({ limit: '200kb' }));

app.use(
  session({
    store: new SQLiteStore({ dir: DATA_DIR, db: 'sessions.sqlite' }),
    name: 'clinic.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 4, // 4 ώρες αδράνειας
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/audit', auditRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  res.status(404).json({ error: 'Δεν βρέθηκε.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Σφάλμα διακομιστή.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Το διαχειριστικό σύστημα τρέχει στο http://localhost:${PORT}`);
  if (!isProd) {
    console.log('ΠΡΟΣΟΧΗ: NODE_ENV != production — τα session cookies δεν είναι "secure". Μη χρησιμοποιείτε πραγματικά δεδομένα ασθενών εκτός production πίσω από HTTPS.');
  }
});
