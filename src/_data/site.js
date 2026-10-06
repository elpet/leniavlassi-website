// Τεχνικά στοιχεία της ιστοσελίδας. Τα στοιχεία επικοινωνίας (τηλέφωνο, email,
// ωράριο κ.λπ.) βρίσκονται στο settings.json και αλλάζουν από το /admin/.
// Το SITE_URL ορίζεται στο GitHub Actions (δείτε .github/workflows/deploy.yml).
export default {
  name: "Λένια Βλάσση",
  title: "Λένια Βλάσση | Ψυχολόγος - Γνωσιακή Συμπεριφορική Θεραπεύτρια",
  description:
    "Λένια Βλάσση, Ψυχολόγος - Γνωσιακή Συμπεριφορική Θεραπεύτρια στον Άλιμο & online. Ατομική θεραπεία ενηλίκων, θεραπεία ζεύγους, διαχείριση άγχους.",
  url: (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, ""),
  locale: "el_GR",
  defaultImage: "/images/office-sofa.jpg",
};
