/* ---------- monthly distinctions (docs/distinctions.md) ----------
   Loaded after catalog.js and before app.js. A distinction is a signed, two-sentence citation from a jury of three
   reviewers who never see like, save or watch counts. The categories are fixed; any may go unawarded in a month.
   Everything below is a SAMPLE written for this prototype to show the format: no jury has met and no nominations
   were collected. sample:true puts a "sample" note on the citation in the Explanation tab; the roundup post says so too. */
const DIST_CATS = {
  clear:   {name:'Clearest single idea', short:'Clearest idea'},
  teach:   {name:'Best teaching piece',  short:'Teaching'},
  research:{name:'Research picture',     short:'Research'},
  craft:   {name:'Craft',                short:'Craft'},
  explain: {name:'Best explanation',     short:'Explanation'},
};
const DIST_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const distMonth = (m,short) => { const [y,mo]=m.split('-').map(Number), n=DIST_MONTHS[mo-1]; return (short?n.slice(0,3):n)+' '+y; };
const OCT_JURY = ['@may.iterates','@levien.tan','@fatou.dust']; // their own pieces are ineligible this month
const DISTINCTIONS = [
  { month:'2026-10', cat:'teach', viz:'times-table', jury:OCT_JURY, sample:true,
    citation:'Set n = 101 and wait for k = 51: since 51 · 2 ≡ 1 (mod 101), the cardioid’s chords come back, and a class meets inverses mod n before anyone names them. The same slide then carries the envelope of a family of chords to an epicycloid with k − 1 cusps, so one picture serves a number theory lesson and a geometry one.' },
  { month:'2026-10', cat:'research', viz:'elliptic-group-law', jury:OCT_JURY, sample:true,
    citation:'Lower b below 2/(3√3) ≈ 0.385 and the real curve splits into an oval and an unbounded branch; put P on the oval and Q on the branch, and P + Q lands back on the oval, so the oval is visibly a coset of the identity component. It is the picture of E(ℝ) ≅ S¹ × ℤ/2ℤ we would put on a slide in a talk.' },
  { month:'2026-10', cat:'clear', viz:'riemann-sums', jury:OCT_JURY, sample:true,
    citation:'One knob, the sample point, and the log–log inset answers the question it raises: the left-rule error falls with slope −1 and the midpoint error with slope −2. A student sees that where you sample decides how fast the sum converges, not whether it does.' },
];
const distinctionsFor = id => DISTINCTIONS.filter(d=>d.viz===id);
