import { greeklish } from "../../../lib/greeklish.js";

// Κοινές ρυθμίσεις για όλα τα άρθρα του φακέλου.
// - `draft: true` → εμφανίζεται μόνο τοπικά (npm start), δεν δημοσιεύεται.
// - Ημερομηνία στο μέλλον → προγραμματισμένο άρθρο: δημοσιεύεται αυτόματα εκείνη τη
//   μέρα (το GitHub Actions ξαναχτίζει το site κάθε πρωί).
const isDev = process.env.ELEVENTY_RUN_MODE === "serve";

function isHidden(data) {
  if (isDev) return false;
  if (data.draft) return true;
  return new Date(data.page.date) > new Date();
}

export default {
  layout: "layouts/post.njk",
  ogType: "article",
  eleventyComputed: {
    // Το URL βγαίνει από το πεδίο `slug` αν υπάρχει, αλλιώς από το όνομα του αρχείου,
    // πάντα σε λατινικούς χαρακτήρες: /blog/agxos-kai-ypnos/
    permalink: (data) =>
      isHidden(data) ? false : `/blog/${greeklish(data.slug || data.page.fileSlug)}/`,
    eleventyExcludeFromCollections: (data) => isHidden(data),
  },
};
