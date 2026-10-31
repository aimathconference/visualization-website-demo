/* ---------- LociTeX: TeX math in explanations (docs/submitting.md, section 6) ----------
   One tokenizer, shared by md() in app.js (the renderer) and the Explanation check in checks.js (the gate),
   so the two can never disagree about what counts as math.
     split(src)      -> {parts:[{text}|{tex, display, raw, line}], warnings:[{line, msg}]}
                        skips fenced and indented code blocks and inline code; \$ is a literal dollar;
                        $$…$$ (display) is matched before $…$ (inline); neither crosses a blank line.
                        Inline $ follows Pandoc: the opening $ is not followed by a space, the closing $ is not
                        preceded by a space nor followed by a digit, so "from $5 to $10" is not math.
     problem(tex)    -> null, or why the span is refused before KaTeX sees it (custom macros, trust-gated commands)
     OPTS            -> the KaTeX options both sides use; anything KaTeX throws on is shown raw and fails the gate
     protect(src)    -> {src with placeholders, html(out)}: math is lifted out before marked runs (marked eats
                        backslash escapes and turns _ and * into emphasis) and restored as <span class="tex">
                        holding the raw TeX in <code>, which is also the offline fallback
     typeset(root)   -> loads KaTeX on the page the first time root has math, then typesets it. Never in the worker.
     load()          -> Promise<katex>, pinned on cdnjs with SRI
   Loads under node too (no DOM at load time). */
(function(root){
'use strict';
const VER='0.16.21', CDN=`https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${VER}/`;
const SRI={js:'sha512-jGjq63XP3PrAcXF6lp4bnZIwrVLGoqwh/4Rur2olg2TLt55eNVLjLCgPrrT07aTXxb0UkuMKlhxzfh5TBTACgQ==',
  css:'sha512-j+4buRc0VCpnAcYbe+UW/y6y3ySL9ORZGqzI9OnfQMfKnpwLP2V7Fm9fE+aaj7UKE5s7q87yCu7qGPD7zUFp+w=='};
const OPTS={throwOnError:true, strict:'error', trust:false, maxExpand:1000, output:'htmlAndMathml'};
const LONG=400;
const BANNED=/\\([gex]?def|(?:re)?newcommand|providecommand|newenvironment|renewenvironment|let|futurelet|global|href|url|includegraphics|html[A-Za-z]*)(?![A-Za-z])/;
function problem(tex){
  const m=BANNED.exec(tex);
  if(!m) return null;
  return /def|command|environment|let|global/.test(m[1]) ? `custom macros not allowed (\\${m[1]})` : `\\${m[1]} is not allowed (no links, images or HTML in formulas)`;
}

/* code-block lines (fenced, or indented four spaces after a blank line) are passed through untouched */
function blocks(src){
  const lines=src.split('\n'), out=[]; let fence=null, prevBlank=true, inIndent=false;
  let i=0;
  const push=(code,s)=>{ const b=out[out.length-1]; if(b && b.code===code) b.s+='\n'+s; else out.push({code,s,line:i+1}); };
  for(;i<lines.length;i++){
    const L=lines[i], blank=/^\s*$/.test(L);
    if(fence){ push(true,L); if(new RegExp('^ {0,3}'+fence[0]+'{'+fence.length+',}\\s*$').test(L)) fence=null; prevBlank=false; continue; }
    const f=/^ {0,3}(`{3,}|~{3,})/.exec(L);
    if(f && !(f[1][0]==='`' && L.slice(f[0].length).includes('`'))){ fence=f[1]; push(true,L); prevBlank=false; inIndent=false; continue; }
    if(!blank && /^(?: {4}|\t)/.test(L) && (prevBlank || inIndent)){ push(true,L); inIndent=true; prevBlank=false; continue; }
    if(blank && inIndent){ push(true,L); prevBlank=true; continue; }
    inIndent=false; push(false,L); prevBlank=blank;
  }
  return out;
}
function split(src){
  src=String(src==null?'':src).replace(/\r\n?/g,'\n');
  const parts=[], warnings=[];
  const text=s=>{ if(!s) return; const p=parts[parts.length-1]; if(p && p.text!=null) p.text+=s; else parts.push({text:s}); };
  blocks(src).forEach((b,bi)=>{
    if(bi) text('\n');
    if(b.code) return text(b.s);
    const s=b.s, lineAt=k=>{ let n=b.line; for(let j=0;j<k;j++) if(s.charCodeAt(j)===10) n++; return n; };
    // end of the paragraph that contains position k (a blank line ends inline constructs)
    const paraEnd=k=>{ const re=/\n[ \t]*\n/g; re.lastIndex=k; const m=re.exec(s); return m?m.index:s.length; };
    let i=0, last=0;
    while(i<s.length){
      const c=s[i];
      if(c==='\\'){ i+=2; continue; }
      if(c==='`'){
        let n=1; while(s[i+n]==='`') n++;
        const end=paraEnd(i), run='`'.repeat(n); let j=i+n, close=-1;
        while(j<end){ const k=s.indexOf(run,j); if(k<0||k>=end) break; let m=n; while(s[k+m]==='`') m++; if(m===n && s[k-1]!=='`'){ close=k; break; } j=k+m; }
        i=close<0?i+n:close+n; continue;
      }
      if(c!=='$'){ i++; continue; }
      const end=paraEnd(i);
      if(s[i+1]==='$'){
        let j=i+2, close=-1;
        while(j<end){ if(s[j]==='\\'){ j+=2; continue; } if(s[j]==='$' && s[j+1]==='$'){ close=j; break; } j++; }
        if(close<0 || !s.slice(i+2,close).trim()){ warnings.push({line:lineAt(i), msg:'unmatched $$ (write \\$ for a literal dollar sign)'}); i+=2; continue; }
        text(s.slice(last,i)); parts.push({tex:s.slice(i+2,close).trim(), display:true, raw:s.slice(i,close+2), line:lineAt(i)});
        i=last=close+2; continue;
      }
      let close=-1;
      if(s[i+1] && !/\s/.test(s[i+1])){
        let j=i+1;
        while(j<end){ if(s[j]==='\\'){ j+=2; continue; } if(s[j]==='$'){ if(!/\s/.test(s[j-1]) && !/[0-9]/.test(s[j+1]||'') && s[j+1]!=='$'){ close=j; break; } if(s[j+1]==='$') break; } j++; }
      }
      if(close<0){ warnings.push({line:lineAt(i), msg:'unmatched $ (write \\$ for a literal dollar sign)'}); i++; continue; }
      text(s.slice(last,i)); parts.push({tex:s.slice(i+1,close), display:false, raw:s.slice(i,close+1), line:lineAt(i)});
      i=last=close+1;
    }
    text(s.slice(last));
  });
  return {parts, warnings};
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A='', Z='';
function protect(src){
  const {parts}=split(src), spans=[];
  const out=parts.map(p=>{ if(p.text!=null) return p.text.replace(/[]/g,''); spans.push(p); return A+(spans.length-1)+Z; }).join('');
  const span=p=>`<span class="tex${p.display?' tex-d':''}" data-tex="${esc(p.tex)}"${p.display?' data-display="1"':''}><code>${esc(p.raw)}</code></span>`;
  return {src:out, count:spans.length, html(h){
    if(!spans.length) return h;
    return h.replace(new RegExp(`<p>${A}(\\d+)${Z}</p>`,'g'),(_,k)=>`<div class="texblock">${span(spans[+k])}</div>`)
            .replace(new RegExp(`${A}(\\d+)${Z}`,'g'),(_,k)=>span(spans[+k]));
  }};
}

let loading=null;
function load(){
  if(root.katex) return Promise.resolve(root.katex);
  if(loading) return loading;
  if(typeof document==='undefined') return Promise.reject(new Error('KaTeX needs a page'));
  loading=new Promise((res,rej)=>{
    const css=document.createElement('link'); css.rel='stylesheet'; css.href=CDN+'katex.min.css'; css.integrity=SRI.css; css.crossOrigin='anonymous'; css.referrerPolicy='no-referrer';
    document.head.appendChild(css);
    const js=document.createElement('script'); js.src=CDN+'katex.min.js'; js.integrity=SRI.js; js.crossOrigin='anonymous'; js.referrerPolicy='no-referrer';
    const to=setTimeout(()=>rej(new Error('KaTeX timed out')),15000);
    js.onload=()=>{ clearTimeout(to); root.katex?res(root.katex):rej(new Error('KaTeX did not define katex')); };
    js.onerror=()=>{ clearTimeout(to); js.remove(); css.remove(); rej(new Error('KaTeX could not be loaded')); };
    document.head.appendChild(js);
  }).catch(e=>{ loading=null; throw e; }); // offline: leave the raw TeX, try again on the next open
  return loading;
}
function typeset(el){
  if(!el || !el.querySelector || !el.querySelector('.tex:not(.tex-done)')) return Promise.resolve(0);
  return load().then(k=>{
    let n=0;
    for(const s of el.querySelectorAll('.tex:not(.tex-done)')){
      const tex=s.dataset.tex, display=s.dataset.display==='1';
      s.classList.add('tex-done');
      if(problem(tex)){ s.classList.add('tex-err'); continue; }
      try{ k.render(tex,s,{...OPTS, displayMode:display}); n++; }
      catch(e){ s.classList.add('tex-err'); s.title=String(e&&e.message||e); }
    }
    return n;
  },()=>0);
}

const api={VER, OPTS, LONG, split, problem, protect, load, typeset};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.LociTeX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
