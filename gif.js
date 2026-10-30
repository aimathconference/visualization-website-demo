/* ---------- LociGif: a small GIF89a encoder and a STORED-only zip writer, no dependencies (the clip recorder, app.js) ----------
   palette(images, max=256) -> Uint8Array(3*256): one global palette by median cut over pixels sampled from a few
     frames ({data, width, height} like ImageData). Deterministic: the same frames give the same palette.
   new Encoder(w, h, pal) -> enc
     enc.frame(rgba, delayCs) maps the frame to the palette (nearest colour, no dithering, so flat theme colours stay
       flat), keeps only the rectangle that changed since the last frame (disposal "do not dispose") and LZW-encodes it.
       Returns {same, bytes}: same is true when no pixel changed. delayCs is the frame delay in 1/100 s.
     enc.finish() -> Blob (image/gif): header, global colour table, NETSCAPE2.0 loop forever, the frames, trailer.
   zip(files) -> Blob (application/zip) of [{name, bytes}] with no compression (PNGs are compressed already).
   Works in a page or a worker; no DOM. */
(function(root){
'use strict';

/* ---------- byte sink ---------- */
class Bytes{
  constructor(n=1<<16){ this.b=new Uint8Array(n); this.n=0; }
  need(k){ if(this.n+k<=this.b.length) return; let m=this.b.length*2; while(m<this.n+k) m*=2; const nb=new Uint8Array(m); nb.set(this.b.subarray(0,this.n)); this.b=nb; }
  byte(x){ this.need(1); this.b[this.n++]=x&255; }
  u16(x){ this.need(2); this.b[this.n++]=x&255; this.b[this.n++]=(x>>8)&255; }
  u32(x){ this.need(4); for(let i=0;i<4;i++) this.b[this.n++]=(x>>>(8*i))&255; }
  bytes(a){ this.need(a.length); this.b.set(a,this.n); this.n+=a.length; }
  ascii(s){ for(let i=0;i<s.length;i++) this.byte(s.charCodeAt(i)); }
  take(){ const out=this.b.slice(0,this.n); this.n=0; return out; }
}

/* ---------- palette: median cut on a 5-bit-per-channel histogram ---------- */
function palette(images,max=256){
  const N=32768, cnt=new Float64Array(N), sr=new Float64Array(N), sg=new Float64Array(N), sb=new Float64Array(N);
  for(const im of images){
    const d=im.data, n=d.length>>2, step=Math.max(1,Math.floor(n/250000));
    for(let p=0;p<n;p+=step){ const i=p<<2, r=d[i], g=d[i+1], b=d[i+2], k=(r>>3)<<10|(g>>3)<<5|(b>>3); cnt[k]++; sr[k]+=r; sg[k]+=g; sb[k]+=b; }
  }
  const keys=[]; for(let k=0;k<N;k++) if(cnt[k]) keys.push(k);
  const ch=(k,c)=>c===0?k>>10:c===1?(k>>5)&31:k&31;
  const mkBox=ks=>{
    let lo=[31,31,31], hi=[0,0,0], n=0;
    for(const k of ks){ n+=cnt[k]; for(let c=0;c<3;c++){ const v=ch(k,c); if(v<lo[c]) lo[c]=v; if(v>hi[c]) hi[c]=v; } }
    const rg=[hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]], c=rg[1]>=rg[0]&&rg[1]>=rg[2]?1:rg[0]>=rg[2]?0:2;
    return {ks, n, c, range:rg[c]};
  };
  let boxes=[mkBox(keys)];
  while(boxes.length<max){
    let bi=-1, best=0;
    for(let i=0;i<boxes.length;i++){ const b=boxes[i]; if(b.ks.length<2||!b.range) continue; const s=b.range*Math.sqrt(b.n); if(s>best){ best=s; bi=i; } }
    if(bi<0) break;
    const b=boxes[bi], c=b.c, ks=b.ks.slice().sort((x,y)=>ch(x,c)-ch(y,c)||x-y);
    let acc=0, cut=1; for(let i=0;i<ks.length-1;i++){ acc+=cnt[ks[i]]; cut=i+1; if(acc>=b.n/2) break; }
    boxes.splice(bi,1,mkBox(ks.slice(0,cut)),mkBox(ks.slice(cut)));
  }
  const pal=new Uint8Array(768);
  boxes.forEach((b,i)=>{ let n=0,r=0,g=0,bl=0; for(const k of b.ks){ n+=cnt[k]; r+=sr[k]; g+=sg[k]; bl+=sb[k]; } pal[3*i]=Math.round(r/n); pal[3*i+1]=Math.round(g/n); pal[3*i+2]=Math.round(bl/n); });
  pal.count=Math.max(1,boxes.length);
  return pal;
}

/* ---------- LZW (GIF variant: variable code size from 9 to 12 bits, clear when the table is full) ---------- */
const HASH=1<<20; // (prefix code < 4096) << 8 | pixel
function lzwInto(out,ix,stride,x0,y0,w,h,tab){
  const CLEAR=256, EOI=257; let size=9, next=258;
  const blk=new Uint8Array(255); let bl=0, acc=0, nb=0;
  const put=code=>{ acc|=code<<nb; nb+=size; while(nb>=8){ blk[bl++]=acc&255; acc>>>=8; nb-=8; if(bl===255){ out.byte(255); out.bytes(blk); bl=0; } } };
  out.byte(8); // minimum code size
  put(CLEAR); tab.gen++;
  let prefix=-1;
  for(let y=y0;y<y0+h;y++){ let o=y*stride+x0;
    for(let x=0;x<w;x++,o++){
      const k=ix[o];
      if(prefix<0){ prefix=k; continue; }
      const key=(prefix<<8)|k;
      if(tab.stamp[key]===tab.gen){ prefix=tab.code[key]; continue; }
      put(prefix);
      if(next<4096){ tab.stamp[key]=tab.gen; tab.code[key]=next; if(next===(1<<size)&&size<12) size++; next++; }
      else { put(CLEAR); tab.gen++; size=9; next=258; }
      prefix=k;
    }
  }
  put(prefix);
  if(next===(1<<size)&&size<12) size++; // the decoder adds one more entry before it reads EOI
  put(EOI);
  if(nb>0){ blk[bl++]=acc&255; if(bl===255){ out.byte(255); out.bytes(blk); bl=0; } }
  if(bl){ out.byte(bl); out.bytes(blk.subarray(0,bl)); }
  out.byte(0); // block terminator
}

class Encoder{
  constructor(w,h,pal){
    this.w=w; this.h=h; this.pal=pal; this.count=pal.count||256; this.parts=[]; this.frames=0;
    this.cur=new Uint8Array(w*h); this.prev=null; this.lut=new Int16Array(1<<18).fill(-1);
    this.tab={stamp:new Int32Array(HASH), code:new Uint16Array(HASH), gen:0};
    const o=new Bytes(1024);
    o.ascii('GIF89a'); o.u16(w); o.u16(h); o.byte(0xF7); o.byte(0); o.byte(0); // global colour table of 256, 8-bit colour resolution
    o.bytes(pal);
    o.byte(0x21); o.byte(0xFF); o.byte(11); o.ascii('NETSCAPE2.0'); o.byte(3); o.byte(1); o.u16(0); o.byte(0); // loop forever
    this.parts.push(o.take()); this.out=new Bytes();
  }
  nearest(r,g,b){
    const p=this.pal; let bi=0, bd=Infinity;
    for(let i=0;i<this.count;i++){ const dr=p[3*i]-r, dg=p[3*i+1]-g, db=p[3*i+2]-b, d=dr*dr*2+dg*dg*3+db*db; if(d<bd){ bd=d; bi=i; if(!d) break; } }
    return bi;
  }
  frame(rgba,delayCs){
    const {w,h,cur,lut}=this, n=w*h;
    for(let p=0,i=0;p<n;p++,i+=4){
      const r=rgba[i], g=rgba[i+1], b=rgba[i+2], k=(r>>2)<<12|(g>>2)<<6|(b>>2);
      let x=lut[k]; if(x<0) x=lut[k]=this.nearest((r&252)|2,(g&252)|2,(b&252)|2);
      cur[p]=x;
    }
    // the rectangle that changed since the last frame
    let x0=0, y0=0, x1=w-1, y1=h-1, same=false; const pv=this.prev;
    if(pv){
      x0=w; y0=h; x1=-1; y1=-1;
      for(let y=0;y<h;y++){ const o=y*w; for(let x=0;x<w;x++) if(cur[o+x]!==pv[o+x]){ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; y1=y; } }
      if(x1<0){ same=true; x0=0; y0=0; x1=0; y1=0; } // nothing changed: a 1×1 frame that repaints one pixel as it was
    }
    const o=this.out, fw=x1-x0+1, fh=y1-y0+1;
    o.byte(0x21); o.byte(0xF9); o.byte(4); o.byte(1<<2); o.u16(Math.max(2,Math.round(delayCs))); o.byte(0); o.byte(0); // disposal 1, no transparency
    o.byte(0x2C); o.u16(x0); o.u16(y0); o.u16(fw); o.u16(fh); o.byte(0); // no local colour table, not interlaced
    lzwInto(o,cur,w,x0,y0,fw,fh,this.tab);
    const bytes=o.take(); this.parts.push(bytes); this.frames++;
    if(!this.prev) this.prev=new Uint8Array(n); this.prev.set(cur);
    return {same, bytes:bytes.length};
  }
  get size(){ return this.parts.reduce((a,b)=>a+b.length,0)+1; }
  finish(){ return new Blob([...this.parts,new Uint8Array([0x3B])],{type:'image/gif'}); }
}

/* ---------- zip, STORED only ---------- */
let CRC=null;
function crc32(u8){
  if(!CRC){ CRC=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; CRC[n]=c>>>0; } }
  let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=CRC[(c^u8[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0;
}
function zip(files){
  const parts=[], cd=new Bytes(4096), enc=new TextEncoder(); let off=0;
  const DATE=(0<<9)|(1<<5)|1, TIME=0; // 1980-01-01 00:00: a fixed date keeps the archive byte-identical between runs
  for(const f of files){
    const name=enc.encode(f.name), data=f.bytes, crc=crc32(data), h=new Bytes(30+name.length);
    h.u32(0x04034b50); h.u16(10); h.u16(0x0800); h.u16(0); h.u16(TIME); h.u16(DATE); h.u32(crc); h.u32(data.length); h.u32(data.length); h.u16(name.length); h.u16(0); h.bytes(name);
    const head=h.take(); parts.push(head,data);
    cd.u32(0x02014b50); cd.u16(20); cd.u16(10); cd.u16(0x0800); cd.u16(0); cd.u16(TIME); cd.u16(DATE); cd.u32(crc); cd.u32(data.length); cd.u32(data.length);
    cd.u16(name.length); cd.u16(0); cd.u16(0); cd.u16(0); cd.u16(0); cd.u32(0); cd.u32(off); cd.bytes(name);
    off+=head.length+data.length;
  }
  const dir=cd.take(), e=new Bytes(22);
  e.u32(0x06054b50); e.u16(0); e.u16(0); e.u16(files.length); e.u16(files.length); e.u32(dir.length); e.u32(off); e.u16(0);
  return new Blob([...parts,dir,e.take()],{type:'application/zip'});
}

const api={palette, Encoder, zip, crc32};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.LociGif=api;
})(typeof globalThis!=='undefined'?globalThis:this);
