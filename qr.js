/* qr.js: a tiny QR code encoder with no dependencies, for the Present QR corner (app.js).
   Byte mode (UTF-8), error correction level M, versions 1-20 (up to 666 bytes), all eight masks
   scored with the four ISO/IEC 18004 penalty rules. QR.encode(text) returns
   {version, size, mask, modules} with modules[row][col] true for dark, or null if the text is too long.
   QR.svg(code) returns an SVG string with a 4-module quiet zone. Works in a page (window.QR) and in node. */
(function(root){
  'use strict';
  /* level M, per version: [EC codewords per block, blocks in group 1, data codewords per block in group 1, blocks in group 2] (group 2 blocks hold one more) */
  const M=[null,[10,1,16,0],[16,1,28,0],[26,1,44,0],[18,2,32,0],[24,2,43,0],[16,4,27,0],[18,4,31,0],[22,2,38,2],[22,3,36,2],[26,4,43,1],
    [30,1,50,4],[22,6,36,2],[22,8,37,1],[24,4,40,5],[24,5,41,5],[28,7,45,3],[28,10,46,1],[26,9,43,4],[26,3,44,11],[26,3,41,13]];
  const MAXV=M.length-1;
  /* modules left for data and EC after the function patterns, in bits */
  function rawModules(ver){
    let r=(16*ver+128)*ver+64;
    if(ver>=2){ const na=Math.floor(ver/7)+2; r-=(25*na-10)*na-55; if(ver>=7) r-=36; }
    return r;
  }
  function dataCodewords(ver){ const e=M[ver]; return e[1]*e[2]+e[3]*(e[2]+1); }
  function alignPositions(ver){
    if(ver===1) return [];
    const na=Math.floor(ver/7)+2, size=ver*4+17, step=Math.ceil((ver*4+4)/(na*2-2))*2, out=[6];
    for(let pos=size-7; out.length<na; pos-=step) out.splice(1,0,pos);
    return out;
  }
  /* GF(256) with the QR polynomial x^8+x^4+x^3+x^2+1 */
  const EXP=new Uint8Array(512), LOG=new Uint8Array(256);
  for(let i=0,x=1; i<255; i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&256) x^=0x11d; }
  for(let i=255; i<512; i++) EXP[i]=EXP[i-255];
  const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
  /* the generator (x-a^0)(x-a^1)...(x-a^(n-1)), highest coefficient (1) dropped */
  function rsDivisor(n){
    const g=new Uint8Array(n); g[n-1]=1; let r=1;
    for(let i=0; i<n; i++){
      for(let j=0; j<n; j++){ g[j]=mul(g[j],r); if(j+1<n) g[j]^=g[j+1]; }
      r=mul(r,2);
    }
    return g;
  }
  function rsRemainder(data,div){
    const out=new Uint8Array(div.length);
    for(const b of data){
      const f=b^out[0]; out.copyWithin(0,1); out[out.length-1]=0;
      for(let i=0; i<div.length; i++) out[i]^=mul(div[i],f);
    }
    return out;
  }
  function utf8(s){
    if(typeof TextEncoder!=='undefined') return Array.from(new TextEncoder().encode(s));
    return Array.from(Buffer.from(s,'utf8'));
  }
  /* the codeword sequence: header, data, terminator, padding, then blocks interleaved with their EC */
  function codewords(bytes,ver){
    const cap=dataCodewords(ver)*8, bits=[];
    const put=(v,n)=>{ for(let i=n-1; i>=0; i--) bits.push((v>>>i)&1); };
    put(4,4); put(bytes.length,ver<10?8:16); for(const b of bytes) put(b,8);
    put(0,Math.min(4,cap-bits.length));
    while(bits.length%8) bits.push(0);
    const data=[]; for(let i=0; i<bits.length; i+=8){ let b=0; for(let j=0; j<8; j++) b=b<<1|bits[i+j]; data.push(b); }
    for(let pad=0xec; data.length<cap/8; pad^=0xec^0x11) data.push(pad);
    const [ec,n1,k1,n2]=M[ver], div=rsDivisor(ec), blocks=[];
    for(let b=0,at=0; b<n1+n2; b++){ const k=b<n1?k1:k1+1, d=data.slice(at,at+k); at+=k; blocks.push({d, e:rsRemainder(d,div)}); }
    const out=[];
    for(let i=0; i<=k1; i++) for(const bl of blocks) if(i<bl.d.length) out.push(bl.d[i]);
    for(let i=0; i<ec; i++) for(const bl of blocks) out.push(bl.e[i]);
    return out;
  }
  function bch(v,poly,deg){ let r=v<<deg; for(let i=31; i>=deg; i--) if((r>>>i)&1) r^=poly<<(i-deg); return (v<<deg)|r; }
  const formatBits=mask=>bch((0<<3)|mask,0x537,10)^0x5412; // level M is 00
  const versionBits=ver=>bch(ver,0x1f25,12);
  const MASKS=[(x,y)=>(x+y)%2===0, (x,y)=>y%2===0, (x,y)=>x%3===0, (x,y)=>(x+y)%3===0,
    (x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0, (x,y)=>x*y%2+x*y%3===0, (x,y)=>(x*y%2+x*y%3)%2===0, (x,y)=>((x+y)%2+x*y%3)%2===0];
  /* the matrix: function patterns, then the codewords in the two-column zigzag, then one mask */
  function build(ver,cw,mask){
    const n=ver*4+17, m=[], fn=[];
    for(let y=0; y<n; y++){ m.push(new Array(n).fill(false)); fn.push(new Array(n).fill(false)); }
    const set=(x,y,d)=>{ m[y][x]=!!d; fn[y][x]=true; };
    for(let i=0; i<n; i++){ set(6,i,i%2===0); set(i,6,i%2===0); } // timing
    const finder=(cx,cy)=>{ for(let dy=-4; dy<=4; dy++) for(let dx=-4; dx<=4; dx++){ const x=cx+dx, y=cy+dy; if(x<0||y<0||x>=n||y>=n) continue; const d=Math.max(Math.abs(dx),Math.abs(dy)); set(x,y,d!==2&&d!==4); } };
    finder(3,3); finder(n-4,3); finder(3,n-4);
    const al=alignPositions(ver), na=al.length;
    for(let i=0; i<na; i++) for(let j=0; j<na; j++){
      if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0)) continue; // under the finders
      for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) set(al[i]+dx,al[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
    }
    const fb=formatBits(mask), bit=(v,i)=>(v>>>i)&1;
    for(let i=0; i<=5; i++) set(8,i,bit(fb,i));
    set(8,7,bit(fb,6)); set(8,8,bit(fb,7)); set(7,8,bit(fb,8));
    for(let i=9; i<15; i++) set(14-i,8,bit(fb,i));
    for(let i=0; i<8; i++) set(n-1-i,8,bit(fb,i));
    for(let i=8; i<15; i++) set(8,n-15+i,bit(fb,i));
    set(8,n-8,1); // the dark module
    if(ver>=7){ const vb=versionBits(ver); for(let i=0; i<18; i++){ const a=n-11+i%3, b=Math.floor(i/3); set(a,b,bit(vb,i)); set(b,a,bit(vb,i)); } }
    let i=0; const total=cw.length*8;
    for(let right=n-1; right>=1; right-=2){
      if(right===6) right=5;
      for(let v=0; v<n; v++) for(let j=0; j<2; j++){
        const x=right-j, up=((right+1)&2)===0, y=up?n-1-v:v;
        if(fn[y][x]) continue;
        if(i<total){ m[y][x]=!!((cw[i>>>3]>>>(7-(i&7)))&1); i++; } // remainder bits stay light
      }
    }
    const f=MASKS[mask];
    for(let y=0; y<n; y++) for(let x=0; x<n; x++) if(!fn[y][x] && f(x,y)) m[y][x]=!m[y][x];
    return m;
  }
  /* ISO/IEC 18004 section 7.8.3: runs of 5+, 2x2 blocks, finder-like 1:1:3:1:1 with four light, dark balance */
  function penalty(m){
    const n=m.length; let p=0, dark=0;
    const line=get=>{
      let run=1;
      for(let i=1; i<=n; i++){
        if(i<n && get(i)===get(i-1)) run++;
        else { if(run>=5) p+=3+run-5; run=1; }
      }
      for(let i=0; i+11<=n; i++){
        let a=true, b=true;
        const P=[1,0,1,1,1,0,1,0,0,0,0];
        for(let k=0; k<11; k++){ const d=get(i+k)?1:0; if(d!==P[k]) a=false; if(d!==P[10-k]) b=false; }
        if(a) p+=40; if(b) p+=40;
      }
    };
    for(let y=0; y<n; y++) line(x=>m[y][x]);
    for(let x=0; x<n; x++) line(y=>m[y][x]);
    for(let y=0; y<n-1; y++) for(let x=0; x<n-1; x++){ const c=m[y][x]; if(c===m[y][x+1] && c===m[y+1][x] && c===m[y+1][x+1]) p+=3; }
    for(const r of m) for(const c of r) if(c) dark++;
    p+=Math.floor(Math.abs(dark*20-n*n*10)/(n*n))*10;
    return p;
  }
  function encode(text,opts={}){
    const bytes=utf8(String(text));
    let ver=0;
    for(let v=Math.max(1,opts.minVersion||1); v<=MAXV; v++) if(4+(v<10?8:16)+bytes.length*8<=dataCodewords(v)*8){ ver=v; break; }
    if(!ver) return null;
    const cw=codewords(bytes,ver);
    let best=null;
    for(let k=0; k<8; k++){
      if(opts.mask!=null && opts.mask!==k) continue;
      const m=build(ver,cw,k), s=penalty(m);
      if(!best || s<best.s) best={m, s, k};
    }
    return {version:ver, size:ver*4+17, mask:best.k, modules:best.m};
  }
  function svg(code,{dark='#000', light='#fff', quiet=4}={}){
    const n=code.size, w=n+2*quiet; let d='';
    for(let y=0; y<n; y++) for(let x=0; x<n; x++) if(code.modules[y][x]) d+=`M${x+quiet} ${y+quiet}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${w}" height="${w}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  }
  const QR={encode, svg, MAX_VERSION:MAXV, maxBytes:()=>dataCodewords(MAXV)-3,
    _internal:{rsDivisor, rsRemainder, formatBits, versionBits, rawModules, dataCodewords, alignPositions, codewords, M, EXP, LOG, mul}};
  if(typeof module!=='undefined' && module.exports) module.exports=QR; else root.QR=QR;
})(typeof self!=='undefined'?self:this);
