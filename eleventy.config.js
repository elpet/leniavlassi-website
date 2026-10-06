import { HtmlBasePlugin } from "@11ty/eleventy";
import markdownIt from "markdown-it";
import { structuredData } from "./lib/structured-data.js";

const md = markdownIt({ html: false, linkify: true, typographer: false });

export default function (eleventyConfig) {
  // Τα links γράφονται ως "/blog/" κ.λπ. — το plugin προσθέτει αυτόματα το pathPrefix
  // (π.χ. /leniavlassi-website/ στο GitHub Pages).
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  // Admin panel (Sveltia CMS): αντιγράφεται αυτούσιο, δεν περνά από templates
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.ignores.add("src/admin/**");

  eleventyConfig.addFilter("telHref", (phone) => {
    const digits = String(phone).replace(/[^\d+]/g, "");
    return "tel:" + (digits.startsWith("+") ? digits : "+30" + digits);
  });
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));
  // Markdown από τα αρχεία δεδομένων (π.χ. απαντήσεις FAQ που γράφονται στο /admin/)
  eleventyConfig.addFilter("md", (text) => md.render(String(text || "")));
  // JSON-LD της τρέχουσας σελίδας· το "<" γίνεται < ώστε να μην κλείνει το <script>
  eleventyConfig.addShortcode("structuredData", function () {
    const json = JSON.stringify(structuredData(this.ctx, (text) => md.render(String(text || ""))));
    return json.replace(/</g, "\\u003c");
  });

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/blog/posts/*.md")
      .sort((a, b) => b.date - a.date)
  );

  const months = [
    "Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
    "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου",
  ];
  eleventyConfig.addFilter("dateGr", (date) => {
    const d = new Date(date);
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("dateIso", (date) => new Date(date).toISOString().slice(0, 10));

  // Εκτιμώμενος χρόνος ανάγνωσης (~200 λέξεις/λεπτό)
  eleventyConfig.addFilter("readingTime", (content) => {
    const words = String(content).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
