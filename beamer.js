/* beamer.js: the text files of Share's "Export to Beamer (zip)" (docs/ideas/round2/208), stills only. app.js renders
   the stills and zips them with these:
     note(s)                -> a note or title as LaTeX: its $…$ / $$…$$ TeX (LociTeX.split) passes through as-is, the text
                               between is escaped, and Unicode maths in it (√, ≡, ℂ, ℘′, −, Greek) goes in $…$ for
                               unicode-math. So the engine is lualatex (README.txt).
     qr(code, url)          -> qr/NN.tex: QR.encode's module matrix drawn as TikZ \fill rectangles, one per run of dark
                               modules in a row, with a 4-module quiet zone. Pure TeX: no SVG, no image.
     slides(o)              -> slides.tex: one frame per moment. o = {title, listURL, moments:[{k, title, id, note, url,
                               still, qr, line}]}; still and qr are file names or null.
     bib(pieces, year)      -> loci.bib: one @misc per piece, key loci-<id>; no version field (there are no versioned modules).
     readme(o)              -> README.txt: the engine and the exact compile command.
   Loads under node too (needs LociTeX there: require('./tex.js') first, or pass split). */
(function(root){
'use strict';
const MATHCH=/[\u0370-\u03FF\u00B1\u00D7\u00F7\u00AC\u2032-\u2037\u2070-\u209F\u2100-\u214F\u2190-\u23FF\u2460-\u24FF\u25A0-\u25FF\u27C0-\u27FF\u2900-\u2AFF]|[\uD835][\uDC00-\uDFFF]/;
const RUN_TAIL=new RegExp(`((?:${MATHCH.source})+)([A-Za-z0-9.]*)`,'g');
const TEXT={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','#':'\\#','$':'\\$','%':'\\%','&':'\\&','_':'\\_','~':'\\textasciitilde{}','^':'\\textasciicircum{}'};
/* text between formulas: LaTeX specials escaped (\$ is a literal dollar, as in LociTeX), Unicode maths into $…$ */
function textTeX(s){
  let out='';
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='\\' && s[i+1]==='$'){ out+='\\$'; i++; continue; }
    out+=TEXT[c]||c;
  }
  // a run of Unicode maths and what follows it up to a space; √x: unicode-math reads √ as \sqrt, so its argument goes inside
  return out.replace(RUN_TAIL,(m,sym,tail)=>/√$/.test(sym)?`$${sym.slice(0,-1)}\\sqrt{${tail||'\\phantom{x}'}}$`:`$${sym}$${tail}`);
}
function note(s,split){
  split=split||(root.LociTeX&&root.LociTeX.split);
  s=String(s==null?'':s).replace(/\s+/g,' ').trim(); if(!s) return '';
  const parts=split?split(s).parts:[{text:s}];
  return parts.map(p=>p.text!=null?textTeX(p.text):p.display?`$\\displaystyle ${p.tex}$`:`$${p.tex}$`).join('');
}
const pad=k=>String(k).padStart(2,'0');
/* the QR code as TikZ, 1 unit a module, y up; the picture is (size + 8) units square with its quiet zone */
function qr(code,url){
  const n=code.size, q=4, w=n+2*q, rows=[]; let dark=0;
  for(let y=0;y<n;y++){
    const yy=n-1-y+q;
    for(let x=0;x<n;){
      if(!code.modules[y][x]){ x++; continue; }
      let e=x; while(e<n && code.modules[y][e]){ e++; dark++; }
      rows.push(`(${x+q},${yy}) rectangle (${e+q},${yy+1})`); x=e;
    }
  }
  return `% QR code of ${url}\n% qr.js: version ${code.version}, ${n} x ${n} modules (${dark} dark), mask ${code.mask}, quiet zone ${q}\n`+
    `\\begin{tikzpicture}[x=1mm,y=1mm]\n\\fill[white] (0,0) rectangle (${w},${w});\n\\fill[black]\n  ${rows.join('\n  ')};\n\\end{tikzpicture}%\n`;
}
/* \urldef makes the link robust: a share link's & and = survive being stored in a macro for the footline */
const urlArg=u=>String(u).replace(/[{}\\]/g,c=>encodeURIComponent(c)); // inside \url's verbatim argument only unbalanced braces can break
function slides(o){
  const n=o.moments.length;
  const head=`% !TEX program = lualatex
% ${o.title||'Untitled list'}: ${n} moment${n===1?'':'s'} exported from Loci. Compile with: lualatex slides.tex (see README.txt).
% The whole list plays at ${urlArg(o.listURL)}
\\documentclass[aspectratio=1610,11pt]{beamer}
\\usefonttheme{professionalfonts}
\\usepackage{fontspec}
\\usepackage{unicode-math}
\\setmathfont{Latin Modern Math}
\\usepackage{tikz}
\\usepackage{xurl}
\\setbeamertemplate{navigation symbols}{}
\\setbeamerfont{frametitle}{size=\\large}
\\newcommand\\locik{}
\\newcommand\\lociurl{}
\\setbeamertemplate{footline}{%
  \\leavevmode\\hbox to\\paperwidth{\\hskip3mm\\parbox[b]{\\dimexpr\\paperwidth-6mm}{\\tiny\\raggedright
    \\insertshorttitle\\ \\textperiodcentered\\ \\locik\\par\\lociurl\\par\\vskip2mm}}}
\\title{${note(o.title)||'Untitled list'}}
\\begin{document}
`;
  const frames=o.moments.map(m=>{
    const side=(m.qr?`\\resizebox{\\linewidth}{!}{\\input{${m.qr}}}\\par\\smallskip\n`:'')+`{\\tiny ${note(m.title)}\\par ${m.line}\\par}`;
    const pic=m.still?`\\includegraphics[width=\\linewidth,height=0.7\\textheight,keepaspectratio]{${m.still}}`:`\\fbox{\\parbox{0.9\\linewidth}{\\small This piece could not be rendered in the exporting browser; the link below opens the moment.}}`;
    return `% ${m.k}. ${m.title} (${m.id}); cite it with \\cite{loci-${m.id}} (loci.bib)
\\renewcommand\\locik{${m.k} / ${n}}
\\urldef\\lociurl\\url{${urlArg(m.url)}}
\\begin{frame}{${note(m.note)||note(m.title)}}
  \\begin{columns}[T,onlytextwidth]
    \\column{0.74\\textwidth}
    ${pic}
    \\column{0.23\\textwidth}
    ${side}
  \\end{columns}
\\end{frame}
`;
  });
  return head+frames.join('\n')+'\\end{document}\n';
}
const bibText=s=>note(s).replace(/"/g,"''");
function bib(pieces,year){
  return pieces.map(p=>{
    const y=(String(p.reviewed||'').match(/\b(19|20)\d\d\b/)||[String(year)])[0];
    return `@misc{loci-${p.id},
  author = {{${p.author}}},
  title = {{${bibText(p.title)}}},
  howpublished = {Loci},
  url = {${p.url}},
  year = {${y}},
  note = {${p.reviewed?`reviewed ${p.reviewed}`:'checked by machine, not yet community reviewed'}},
}
`; }).join('\n');
}
function readme(o){
  const n=o.moments.length;
  return `${o.title||'Untitled list'}: ${n} moment${n===1?'':'s'} from Loci, as Beamer slides
${'='.repeat(Math.min(72,(o.title||'Untitled list').length+40))}

Engine: lualatex (TeX Live 2024 or later). The notes are Unicode mathematics (√, ≡, ℂ, ℘′, −), which pdflatex
cannot typeset without extra mappings, so slides.tex loads fontspec and unicode-math.

Compile, in this folder:

    lualatex slides.tex

One run makes slides.pdf, one frame per moment. Nothing else is needed: no bibtex or biber run, no shell escape.

What is here
  slides.tex   one frame per moment: the note as the frame title, the still, a QR code and the moment's link
  stills/NN.png each moment as a ${o.size} px still, rendered at its own parameters, time t and view
  qr/NN.tex    each moment's QR code, drawn in TikZ (\\input by slides.tex); it opens the same link as the footline
  loci.bib     one @misc entry per piece (keys loci-<id>), to cite a figure in your own paper:
               \\usepackage[style=numeric]{biblatex} \\addbibresource{loci.bib} ... \\cite{loci-<id>}
               An entry names the piece and the month it was reviewed, not a module version; each slide's own link
               (footline and QR code) records the exact state: parameters, t and view.

The whole list plays at:
  ${o.listURL}

Animated frames: Loci's Share > Record clip > "PNG frames (.zip) for Beamer's animate" makes them for one moment.
A handout: add [handout] to \\documentclass, and \\usepackage{pgfpages} \\pgfpagesuselayout{4 on 1}[a4paper,border shrink=5mm].
`;
}
const api={note, qr, slides, bib, readme, pad};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.LociBeamer=api;
})(typeof globalThis!=='undefined'?globalThis:this);
