// Κοινές ρυθμίσεις για όλα τα άρθρα του φακέλου.
// Τα άρθρα με `draft: true` εμφανίζονται μόνο τοπικά (npm start) και δεν δημοσιεύονται.
const isDev = process.env.ELEVENTY_RUN_MODE === "serve";

export default {
  layout: "layouts/post.njk",
  ogType: "article",
  eleventyComputed: {
    permalink: (data) =>
      data.draft && !isDev ? false : `/blog/${data.page.fileSlug}/`,
    eleventyExcludeFromCollections: (data) => Boolean(data.draft && !isDev),
  },
};
