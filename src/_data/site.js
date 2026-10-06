// Βασικά στοιχεία της ιστοσελίδας. Το SITE_URL ορίζεται στο GitHub Actions
// (δείτε .github/workflows/deploy.yml) — αλλάξτε το όταν μπει δικό σας domain.
export default {
  name: "Λένια Βλάσση",
  title: "Λένια Βλάσση | Ψυχολόγος - Γνωσιακή Συμπεριφορική Θεραπεύτρια",
  description:
    "Λένια Βλάσση, Ψυχολόγος - Γνωσιακή Συμπεριφορική Θεραπεύτρια στον Άλιμο & online. Ατομική θεραπεία ενηλίκων, θεραπεία ζεύγους, διαχείριση άγχους.",
  url: (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, ""),
  locale: "el_GR",
  defaultImage: "/images/office-sofa.jpg",
  phone: "216 002 4060",
  phoneHref: "tel:+302160024060",
  email: "cvlassi@gmail.com",
  address: "Λεωφόρος Καλαμακίου 3, Άλιμος Αττικής, 174 55",
};
