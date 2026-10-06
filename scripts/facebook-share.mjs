// Αυτόματη ανάρτηση νέων άρθρων στη σελίδα Facebook.
//
// Τρέχει στο GitHub Actions αμέσως μετά το deploy. Διαβάζει τη λίστα άρθρων από το
// live site (/blog/posts.json) και αναρτά όσα δεν έχουν αναρτηθεί ακόμα. Τα ήδη
// αναρτημένα καταγράφονται στο .github/facebook-shared.json (γίνεται commit), ώστε
// κανένα άρθρο να μη δημοσιευτεί δύο φορές.
//
// Απαιτούμενα secrets του repo: FB_PAGE_ID, FB_PAGE_TOKEN (δείτε FACEBOOK.md).

import { readFile, writeFile } from "node:fs/promises";

const {
  FB_PAGE_ID,
  FB_PAGE_TOKEN,
  FB_GRAPH_VERSION = "v23.0",
  SITE_URL,
  MAX_AGE_DAYS = "14", // παλαιότερα άρθρα δεν αναρτώνται (π.χ. όταν πρωτοενεργοποιείται)
  DRY_RUN,
} = process.env;

const STATE_FILE = ".github/facebook-shared.json";
const graph = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
  console.log("Δεν έχουν οριστεί FB_PAGE_ID / FB_PAGE_TOKEN — παράλειψη ανάρτησης στο Facebook.");
  process.exit(0);
}
if (!SITE_URL) throw new Error("Λείπει το SITE_URL");

async function fetchJson(url, attempts = 10) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) return await res.json();
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`Το ${url} δεν είναι ακόμα διαθέσιμο (${err.message}), νέα προσπάθεια σε 15″…`);
      await sleep(15_000);
    }
  }
}

async function graphPost(path, params) {
  const res = await fetch(`${graph}/${path}`, {
    method: "POST",
    body: new URLSearchParams({ ...params, access_token: FB_PAGE_TOKEN }),
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error?.message || `HTTP ${res.status}`);
  return body;
}

const state = JSON.parse(await readFile(STATE_FILE, "utf8").catch(() => "{}"));
const posts = await fetchJson(`${SITE_URL.replace(/\/$/, "")}/blog/posts.json`);
const cutoff = Date.now() - Number(MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;

const pending = posts
  .filter((post) => post.facebook && !state[post.path] && new Date(post.date).getTime() >= cutoff)
  .reverse(); // τα παλαιότερα πρώτα

if (!pending.length) {
  console.log("Κανένα νέο άρθρο για ανάρτηση.");
  process.exit(0);
}

let failed = false;
for (const post of pending) {
  const message = post.facebookMessage || post.description || post.title;
  console.log(`→ ${post.title}\n  ${post.url}`);
  if (DRY_RUN) continue;
  try {
    // Ζητάμε από το Facebook να διαβάσει τη σελίδα, ώστε η κάρτα να έχει σωστή εικόνα/τίτλο
    await graphPost("", { id: post.url, scrape: "true" }).catch((err) =>
      console.log(`  (scrape: ${err.message})`)
    );
    const result = await graphPost(`${FB_PAGE_ID}/feed`, { message, link: post.url });
    state[post.path] = { postedAt: new Date().toISOString(), facebookPostId: result.id };
    console.log(`  ✓ αναρτήθηκε (${result.id})`);
  } catch (err) {
    failed = true;
    console.error(`  ✗ αποτυχία: ${err.message}`);
  }
}

await writeFile(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
if (failed) process.exit(1);
