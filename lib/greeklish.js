// Μετατροπή ελληνικού κειμένου σε λατινικούς χαρακτήρες για URL.
// "Άγχος & ύπνος: 5 συμβουλές" → "agxos-ypnos-5-symvoules"
const pairs = [
  ["ου", "ou"], ["ού", "ou"], ["αι", "ai"], ["αί", "ai"], ["ει", "ei"], ["εί", "ei"],
  ["οι", "oi"], ["οί", "oi"], ["αυ", "av"], ["ευ", "ev"], ["μπ", "mp"], ["ντ", "nt"], ["γκ", "gk"], ["γγ", "gg"],
  ["θ", "th"], ["χ", "x"], ["ψ", "ps"], ["ξ", "ks"],
];
const letters = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", ι: "i", κ: "k", λ: "l",
  μ: "m", ν: "n", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", ω: "o",
};

export function greeklish(text) {
  let s = String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [gr, lat] of pairs) s = s.split(gr.normalize("NFD").replace(/[̀-ͯ]/g, "")).join(lat);
  s = s.replace(/[α-ω]/g, (c) => letters[c] ?? c);
  return s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

