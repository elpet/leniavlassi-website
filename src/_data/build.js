import { execSync } from "node:child_process";

// Ημερομηνία τελευταίας ενημέρωσης του περιεχομένου = τελευταίο commit που άλλαξε
// το src/ (άρθρο 11 Κώδικα Δεοντολογίας Ψυχολόγων: «Η ιστοσελίδα πρέπει να
// αναφέρει το χρόνο της τελευταίας της ενημέρωσης»). Τα καθημερινά rebuilds δεν
// την αλλάζουν, γιατί δεν κάνουν commit.
function lastContentUpdate() {
  try {
    const iso = execSync("git log -1 --format=%cI -- src", { encoding: "utf8" }).trim();
    if (iso) return new Date(iso);
  } catch {
    // εκτός git (π.χ. zip) → ημερομηνία build
  }
  return new Date();
}

export default {
  lastUpdated: lastContentUpdate(),
  isProduction: process.env.ELEVENTY_RUN_MODE === "build",
};
