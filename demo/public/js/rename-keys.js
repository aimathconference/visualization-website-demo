// The site was called Loci: move this browser's keys from the old names (loci:…, loci.…, loci-…) to the new ones,
// keeping a value already saved under the new name. main.js imports this first, so it runs before anything reads them.
for (const store of ['localStorage', 'sessionStorage']) {
  try {
    const s = window[store], old = [];
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && /^loci[:.-]/.test(k)) old.push(k); }
    for (const k of old) { const n = 'eigenreel' + k.slice(4); if (s.getItem(n) === null) s.setItem(n, s.getItem(k)); s.removeItem(k); }
  } catch { /* storage blocked */ }
}
