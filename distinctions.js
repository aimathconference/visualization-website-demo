/* ---------- monthly distinctions (docs/distinctions.md) ----------
   Loaded after catalog.js and before app.js. A distinction is a signed, two-sentence citation from a jury of three
   reviewers who never see like, save or watch counts. The categories are fixed; any may go unawarded in a month.
   Each: { month:'YYYY-MM', cat, viz, jury:[handles], citation }. None yet. */
const DIST_CATS = {
  clear:   {name:'Clearest single idea', short:'Clearest idea'},
  teach:   {name:'Best teaching piece',  short:'Teaching'},
  research:{name:'Research picture',     short:'Research'},
  craft:   {name:'Craft',                short:'Craft'},
  explain: {name:'Best explanation',     short:'Explanation'},
};
const DIST_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const distMonth = (m,short) => { const [y,mo]=m.split('-').map(Number), n=DIST_MONTHS[mo-1]; return (short?n.slice(0,3):n)+' '+y; };
const DISTINCTIONS = [];
const distinctionsFor = id => DISTINCTIONS.filter(d=>d.viz===id);
