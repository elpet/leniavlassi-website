// Δομημένα δεδομένα schema.org (JSON-LD) για τις μηχανές αναζήτησης.
// Χρησιμοποιεί μόνο πραγματικά στοιχεία από τα αρχεία δεδομένων (settings, about,
// areas, booking, faq) — τίποτα επινοημένο, ούτε αξιολογήσεις (Κώδικας Δεοντολογίας).

const DAYS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const stripHtml = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

function openingHours(weeklyHours = {}) {
  const specs = [];
  for (const [key, ranges] of Object.entries(weeklyHours)) {
    for (const range of ranges || []) {
      const [opens, closes] = String(range).split("-").map((s) => s.trim());
      if (opens && closes) specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[key], opens, closes });
    }
  }
  return specs;
}

export function structuredData(data, renderMarkdown) {
  const { site, settings, about, areas, booking, faq, page } = data;
  const base = site.url;
  const practiceId = `${base}/#practice`;
  const personId = `${base}/#person`;
  const phone = String(settings.phone).replace(/[^\d+]/g, "");
  const graph = [];

  // Ο επαγγελματίας & το γραφείο — σε κάθε σελίδα, ώστε να συνδέονται όλες μεταξύ τους
  graph.push({
    "@type": ["ProfessionalService", "LocalBusiness"],
    "@id": practiceId,
    name: `${site.name} — ${settings.legal.title}`,
    description: site.description,
    url: `${base}/`,
    image: `${base}${site.defaultImage}`,
    logo: `${base}/favicon.svg`,
    telephone: phone.startsWith("+") ? phone : `+30${phone}`,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Λεωφόρος Καλαμακίου 3",
      addressLocality: "Άλιμος",
      postalCode: "17455",
      addressRegion: "Αττική",
      addressCountry: "GR",
    },
    ...(settings.seo?.geo?.latitude
      ? { geo: { "@type": "GeoCoordinates", latitude: settings.seo.geo.latitude, longitude: settings.seo.geo.longitude } }
      : {}),
    hasMap: settings.seo?.googleBusinessUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`,
    areaServed: [{ "@type": "City", name: "Άλιμος" }, { "@type": "AdministrativeArea", name: "Αττική" }],
    openingHoursSpecification: openingHours(booking.weeklyHours),
    knowsAbout: areas.list,
    founder: { "@id": personId },
    sameAs: [settings.seo?.googleBusinessUrl, ...(settings.seo?.sameAs || [])].filter(Boolean),
  });

  graph.push({
    "@type": "Person",
    "@id": personId,
    name: settings.legal.fullName,
    alternateName: site.name,
    jobTitle: settings.legal.title,
    description: about.subtitle,
    url: `${base}/about/`,
    image: `${base}/images/office-desk.jpg`,
    worksFor: { "@id": practiceId },
    alumniOf: (about.alumniOf || []).map((name) => ({ "@type": "CollegeOrUniversity", name })),
    knowsAbout: areas.list,
    knowsLanguage: ["el"],
  });

  graph.push({
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/`,
    name: site.name,
    inLanguage: "el",
    publisher: { "@id": practiceId },
  });

  // Breadcrumbs στις εσωτερικές σελίδες
  if (data.breadcrumb || data.ogType === "article") {
    const items = [{ name: "Αρχική", item: `${base}/` }];
    if (data.ogType === "article") items.push({ name: "Blog", item: `${base}/blog/` });
    items.push({ name: data.ogType === "article" ? data.title : data.breadcrumb, item: `${base}${page.url}` });
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, ...it })),
    });
  }

  // Άρθρο blog
  if (data.ogType === "article") {
    graph.push({
      "@type": "BlogPosting",
      headline: data.title,
      description: data.description,
      image: `${base}${data.image || site.defaultImage}`,
      datePublished: new Date(page.date).toISOString(),
      dateModified: new Date(data.updated || page.date).toISOString(),
      inLanguage: "el",
      mainEntityOfPage: `${base}${page.url}`,
      author: { "@id": personId },
      publisher: { "@id": practiceId },
      ...(data.category ? { articleSection: data.category } : {}),
    });
  }

  // Συχνές ερωτήσεις
  if (page.url === "/faq/" && faq?.list?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.list.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: stripHtml(renderMarkdown(q.answer)) },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
