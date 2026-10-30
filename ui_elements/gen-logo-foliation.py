"""Singular foliation with a 3-prong singularity (zero of the quadratic
differential z dz^2), drawn with its transverse partner: leaves are level
sets of Im(z^{3/2}) (blue) and Re(z^{3/2}) (orange). Each foliation has three
separatrices meeting at the origin; the two sets of prongs interleave at 60deg."""
import cmath, math, random
random.seed(11)
S=260
def hexnorm(x,y):
    x,y=abs(x),abs(y); k=math.sqrt(3)/2
    return max(y/k,(k*x+0.5*y)/k)
def pw(w): return w**(2/3)          # principal branch
def leaf(s,fam,k):
    pts=[]
    for j in range(601):
        t=-2.2+4.4*j/600
        w=complex(t,s) if fam==0 else complex(s,t)
        pts.append(pw(w)*cmath.exp(2j*math.pi*k/3))
    return pts
def ray(a): return [cmath.rect(r/200*1.2,a) for r in range(201)]
def clip(pts,r):
    segs=[];cur=[]
    for z in pts:
        if hexnorm(z.real,z.imag)<r: cur.append(z)
        else:
            if len(cur)>6: segs.append(cur)
            cur=[]
    if len(cur)>6: segs.append(cur)
    return segs
def d(sg): return "M"+" L".join(f"{S*z.real:.1f},{-S*z.imag:.1f}" for z in sg[::2])
def family(fam):
    out=[]
    n=16; step=0.075
    for i in range(0,n):
        s=step*i
        r=random.uniform(0.82,1.0)
        if i==0:
            angs=[0,2*math.pi/3,4*math.pi/3] if fam==0 else [math.pi/3,math.pi,5*math.pi/3]
            for a in angs: out+= [d(sg) for sg in clip(ray(a),r)]
        else:
            for k in range(3): out+= [d(sg) for sg in clip(leaf(s,fam,k),r)]
    return out
def g(paths,col,w):
    return f'<g fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">'+"".join(f'<path d="{p}"/>' for p in paths)+'</g>'
hexpts=" ".join(f"{S*1.02*math.cos(math.pi/2+k*math.pi/3):.1f},{S*1.02*math.sin(math.pi/2+k*math.pi/3):.1f}" for k in range(6))
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 600 600" width="600" height="600" role="img" aria-label="Singular foliation logo">
<defs>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
<mask id="fade" maskUnits="userSpaceOnUse" x="-300" y="-300" width="600" height="600"><polygon points="{hexpts}" transform="scale(0.93)" fill="#fff" filter="url(#soft)"/></mask>
</defs>
<g mask="url(#fade)">
{g(family(0),"#1f6fe5",2.6)}
{g(family(1),"#ff8a1f",2.6)}
</g>
</svg>'''
open("logo-foliation.svg","w").write(svg)
