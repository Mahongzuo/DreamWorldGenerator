"""Ten original architectural sculptures. Blender --background --python scripts/architecture-pack.py."""
import bpy, math, json, importlib.util
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('linqi_sculpt',Path(__file__).with_name('model-pack.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
box,ico,cone,beam,mesh=h.box,h.ico,h.cone,h.beam,h.mesh
PI=math.pi
TIMBER='#71513b';STONE='#b4ad96';WHITE='#e7dec4';DARK='#3d5556';GOLD='#d5ab65'

def window(x,y,z,w=.65,tall=.82,shade=TIMBER):
    box((x,y,z),(w+.13,.10,tall+.13),shade)
    box((x,y-.059,z),(w,.026,tall),'#a7b3a0')
    box((x,y-.082,z),(.047,.033,tall),shade)
    box((x,y-.084,z),(w,.034,.047),shade)
    box((x,y-.05,z-tall*.5-.1),(w+.2,.23,.10),STONE)

def door(x,y,z=1.0,w=.88,height=1.8):
    box((x,y,z),(w+.17,.14,height+.16),STONE)
    box((x,y-.09,z),(w,.06,height),TIMBER)
    for dx in [-w*.3,0,w*.3]:box((x+dx,y-.13,z),(.018,.025,height*.94),'#9c7750')
    ico((x+w*.27,y-.18,z),(.034,.027,.035),GOLD)

def gable(w,d,z,rise,c='#788277',x=0,y=0,axis='y',tile=True):
    def p(a,b,c):return (x+(b if axis=='x' else a),y+(a if axis=='x' else b),c)
    verts=[p(-w/2,-d/2,z),p(w/2,-d/2,z),p(0,-d/2,z+rise),p(-w/2,d/2,z),p(w/2,d/2,z),p(0,d/2,z+rise)]
    mesh('Pitched roof',verts,[(0,3,5,2),(1,2,5,4),(0,2,1),(3,4,5)],c)
    for yy in [-d/2,d/2]:
        for sign in [-1,1]:beam(p(sign*w/2,yy,z),p(0,yy,z+rise),.065,TIMBER,6)
    beam(p(0,-d/2-.02,z+rise+.03),p(0,d/2+.02,z+rise+.03),.065,c,8)
    if tile:
        for i in range(1,9):
            a=w/2*i/9;zz=z+rise*(1-i/9)+.025
            for sign in [-1,1]:beam(p(sign*a,-d/2,zz),p(sign*a,d/2,zz),.028,c,5)

def hip(w,d,z,rise,c=DARK):
    rings=[(1,z+.12),(.91,z),(.65,z+rise*.28),(.28,z+rise*.85),(.03,z+rise)]
    verts=[]
    for k,zz in rings:
        verts.extend([(-w*k/2,-d*k/2,zz),(w*k/2,-d*k/2,zz),(w*k/2,d*k/2,zz),(-w*k/2,d*k/2,zz)])
    mesh('Swept eave ceramic roof',verts,[(j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i) for j in range(4) for i in range(4)],c)
    for corner in range(4):
        for j in range(4):beam(verts[j*4+corner],verts[(j+1)*4+corner],.045,'#7c9586',6)
    for axis in [0,1]:
        span=d if axis==0 else w
        for n in range(-3,4):
            q=n/4
            for sign in [-1,1]:
                a=[sign*w*.49,q*d*.48,z+.1] if axis==0 else [q*w*.48,sign*d*.49,z+.1]
                b=[sign*w*.33,q*d*.31,z+rise*.29] if axis==0 else [q*w*.31,sign*d*.33,z+rise*.29]
                beam(a,b,.025,c,5)

def base(w,d):
    box((0,0,.10),(w,d,.2),STONE,bevel=.035)

def moongate():
    # Exact round aperture through a rectangular white wall, ring extruded along Y.
    radius=1.0;center=1.1;half=2.85;top=2.65;bottom=.0;n=48
    verts=[]
    for y in [-.27,.27]:
        for i in range(n):
            a=i*2*PI/n;dx,dz=math.cos(a),math.sin(a)
            reach=min(half/max(abs(dx),1e-9),(top-center if dz>=0 else center-bottom)/max(abs(dz),1e-9))
            verts.extend([(radius*dx,y,center+radius*dz),(reach*dx,y,center+reach*dz)])
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(2*i,2*j,2*j+1,2*i+1),(2*n+2*i+1,2*n+2*j+1,2*n+2*j,2*n+2*i),(2*i,2*n+2*i,2*n+2*j,2*j),(2*i+1,2*j+1,2*n+2*j+1,2*n+2*i+1)])
    mesh('White wall with true circular passage',verts,faces,WHITE)
    for i in range(n):
        a=i*2*PI/n;b=(i+1)*2*PI/n
        beam((radius*math.cos(a),-.31,center+radius*math.sin(a)),(radius*math.cos(b),-.31,center+radius*math.sin(b)),.07,'#8b958a',6)
    for x in [-2.0,2.0]:
        window(x,-.3,1.42,.62,.67,DARK)
        for i in [-1,1]:beam((x-.25,-.39,1.42+i*.2),(x+.25,-.39,1.42-i*.2),.025,DARK,5)
    gable(.86,5.9,2.62,.30,DARK,axis='x')
    for x in [-2.7,2.7]:box((x,0,.08),(.42,.82,.16),STONE)

def huizhou():
    base(5.2,4.2);box((0,0,1.43),(4.75,3.65,2.68),WHITE)
    gable(4.85,3.85,2.65,1.05,DARK)
    for x in [-2.43,2.43]:
        for y,w,z,hg in [(0,1.0,3.38,1.35),(-1.0,1.0,3.05,.70),(1.0,1.0,3.05,.70),(-1.64,.32,2.86,.36),(1.64,.32,2.86,.36)]:
            box((x,y,z),(.17,w,hg),WHITE)
            box((x,y,z+hg/2+.04),(.28,w+.12,.09),DARK)
    door(0,-1.9,1.08,1.05,1.98)
    for x in [-1.5,1.5]:window(x,-1.87,1.6,.88,.95,DARK)
    for x in [-1.8,-1.2,1.2,1.8]:box((x,-1.95,.38),(.48,.09,.36),'#8d9290')
    box((0,-2.12,.17),(1.5,.45,.15),STONE)

def pagoda():
    cone((0,0,.14),2.05,.28,STONE,top=2.05,n=8)
    for tier in range(4):
        k=1-tier*.16;z=.28+tier*1.23
        box((0,0,z+.48),(2.6*k,2.6*k,.95),'#9d493b')
        for x in [-1,1]:
            for y in [-1,1]:
                cone((x*1.29*k,y*1.29*k,z+.49),.095*k,1.0,'#6a3c31',top=.095*k,n=8)
                box((x*1.27*k,y*1.27*k,z+.85),(.32*k,.32*k,.14),GOLD)
        for x in [-.72,0,.72]:window(x*k,-1.33*k,z+.48,.27*k,.49,'#3f493e')
        hip(4.0*k,4.0*k,z+.99,.65,'#527669')
    cone((0,0,5.64),.13,.65,GOLD,top=.015,n=8)
    for z in [5.47,5.64,5.81]:cone((0,0,z),.18,.04,GOLD,top=.18,n=10)

def coveredbridge():
    w=7.2;d=2.15;n=24
    for i in range(n):
        x=(i+.5)/n*w-w/2;z=.17+.47*max(0,1-(x/(w/2))**2)
        box((x,0,z-.075),(w/n,d,.15),'#a87a4e')
        if i%3==0:
            for y in [-d/2,d/2]:
                box((x,y,z+.40),(.12,.12,.84),TIMBER)
    for y in [-1.02,1.02]:
        for i in range(12):
            x=-3.36+i*.56;xx=x+.56
            z=.17+.47*max(0,1-(x/3.6)**2);zz=.17+.47*max(0,1-(xx/3.6)**2)
            beam((x,y,z+.73),(xx,y,zz+.73),.055,'#9a6845',6)
        for x in [-2.4,0,2.4]:
            box((x,y,1.63),(.16,.16,2.20),'#844b36')
            beam((x-.38,y,2.6),(x,y,2.2),.07,TIMBER)
            beam((x+.38,y,2.6),(x,y,2.2),.07,TIMBER)
    gable(2.8,6.7,2.67,.71,DARK,axis='x')
    for x in [-2.5,2.5]:
        for y in [-.83,.83]:box((x,y,.16),(.23,.23,.32),STONE)

def teahall():
    base(5.8,4.6);box((0,.55,.31),(5.5,3.3,.45),'#aa9b7a')
    box((0,.7,1.55),(4.7,2.65,2.05),'#a8764c')
    for x in [-2.1,-.72,.72,2.1]:
        box((x,-1.5,1.46),(.15,.15,2.45),'#734536')
        window(x,-.68,1.65,.75,1.0)
        if abs(x)>1:box((x,-1.55,.77),(.86,.26,.13),'#b78d5d')
    box((0,-1.4,.39),(5.4,1.12,.17),'#bd9a6a')
    hip(5.9,4.6,2.78,.95,'#426a62')
    for x in [-1.5,1.5]:
        cone((x,-1.65,2.2),.13,.36,'#d9b475',top=.13,n=8)
        beam((x,-1.65,2.35),(x,-1.65,2.65),.015,TIMBER,5)
    for i in range(3):box((0,-2.1-i*.12,.20-i*.055),(1.7,.32,.12),STONE)

def guildhall():
    base(4.7,4.5);box((0,0,1.64),(4.1,3.85,3.1),'#e0cba6')
    for x in [-2.02,-.66,.66,2.02]:box((x,-1.97,1.7),(.13,.12,3.05),'#543f36')
    for z in [.48,1.74,3.02]:box((0,-1.98,z),(4.2,.13,.14),'#543f36')
    for x in [-1.34,1.34]:
        beam((x-.53,-2.0,1.83),(x+.53,-2.0,2.91),.055,'#543f36')
        beam((x+.53,-2.0,1.83),(x-.53,-2.0,2.91),.055,'#543f36')
        window(x,-2.07,1.0,.75,.76)
    for x in [-2.1,2.1]:
        for y in [-1.6,0,1.6]:box((x,y,1.7),(.11,.14,3.1),'#543f36')
    gable(4.7,4.45,3.15,1.65,'#a25d48')
    box((0,-1.5,3.6),(1.25,1.1,.95),'#e2c7a2');gable(1.55,1.35,4.03,.65,'#86634b',y=-1.58)
    window(0,-2.09,3.65,.68,.64)
    door(0,-2.05,.97,.85,1.65)
    box((1.35,.8,4.4),(.4,.42,1.35),'#9e8874');box((1.35,.8,5.1),(.55,.56,.13),STONE)

def chapel():
    base(4.6,5.5);box((0,.1,1.69),(3.8,4.8,3.2),'#bcb8a2')
    gable(4.4,5.18,3.25,1.62,'#5c6d7b')
    for x in [-1.86,1.86]:
        for y in [-1.9,-.2,1.55]:
            box((x*1.08,y,1.12),(.32,.39,2.1),'#9f9f90')
            # narrow pointed lancet on side, inset amber/blue glazing
            box((x*1.012,y+.38,2.02),(.10,.34,1.1),'#6c8f9c')
            ico((x*1.03,y+.38,2.63),(.09,.21,.27),'#778c98')
    door(0,-2.37,1.2,1.12,2.1)
    for i in range(16):
        a=i*2*PI/16;beam((math.cos(a)*.57,-2.38,3.15+math.sin(a)*.57),(math.cos(a+2*PI/16)*.57,-2.38,3.15+math.sin(a+2*PI/16)*.57),.05,'#d1c9ad',6)
    for a in [0,PI/4,PI/2,3*PI/4]:beam((math.cos(a)*.51,-2.4,3.15+math.sin(a)*.51),(-math.cos(a)*.51,-2.4,3.15-math.sin(a)*.51),.025,'#8a8b7e',5)
    box((0,1.6,4.61),(.9,.9,1.3),'#bcb8a2');cone((0,1.6,5.72),.79,1.7,'#536a79',top=0,n=4)
    box((0,1.6,6.75),(.06,.06,.48),GOLD);box((0,1.6,6.84),(.30,.06,.06),GOLD)

def thatch():
    base(4.9,4.2);box((0,0,1.16),(4.25,3.45,2.12),'#dfd0a5')
    gable(4.95,4.15,2.1,1.58,'#b69a58',tile=False)
    for i in range(-18,19):
        yy=i*.108
        for sign in [-1,1]:beam((sign*2.46,yy,2.12),(0,yy,3.69),.043,'#c8ad68',5)
    for x in [-1.35,1.35]:
        window(x,-1.78,1.25,.68,.75,'#628174')
        for dx in [-.48,.48]:box((x+dx,-1.84,1.25),(.20,.08,.8),'#709482')
        box((x,-1.94,.74),(.92,.33,.23),'#8d6144')
        for j in [-1,0,1]:ico((x+j*.26,-1.96,.93),(.18,.13,.12),'#9da267')
    door(0,-1.8,1.0,.83,1.75)
    box((1.05,.8,3.6),(.48,.52,1.50),'#9d8971');box((1.05,.8,4.38),(.62,.65,.14),'#bcaa8b')

def villa():
    base(5.7,5.2);box((-.8,.4,1.5),(3.75,4.2,2.8),'#e2c49b');box((1.67,.75,1.08),(1.15,3.5,1.98),'#d5b58b')
    gable(4.1,4.55,2.93,1.03,'#b86d4b',x=-.8,y=.4)
    gable(1.7,3.95,2.05,.45,'#ae6446',x=1.65,y=.75)
    for x in [-1.9,.2]:
        window(x,-1.77,1.65,.66,1.03,'#527d74')
        for dx in [-.46,.46]:box((x+dx,-1.84,1.65),(.21,.085,1.04),'#64877a')
    door(-.8,-1.8,1.02,.85,1.76)
    for x in [-2.35,2.35]:
        box((x,-2.1,.83),(.12,.12,1.6),TIMBER)
    for y in [-2.3,-1.8]:box((0,y,1.69),(5.0,.14,.14),TIMBER)
    for x in [-2.3+i*.42 for i in range(12)]:box((x,-2.05,1.8),(.10,.88,.12),TIMBER)
    for x in [-2.25,2.2]:
        cone((x,-2.2,.3),.22,.56,'#ab6947',top=.29,n=10)
        for i in range(5):ico((x+math.cos(i*2.4)*.13,-2.2+math.sin(i*2.4)*.13,.7),(.18,.17,.24),'#7b8b59')

def lighthouse():
    cone((0,0,.18),1.74,.36,STONE,top=1.74,n=16)
    for i in range(4):
        r=1.30-i*.13;cone((0,0,.36+i*.95+.475),r,.95,'#d9d7c1' if i%2==0 else '#a8624d',top=r-.13,n=16)
    cone((0,0,4.26),1.15,.20,'#7b8681',top=1.15,n=16)
    for i in range(12):
        a=i*2*PI/12;beam((math.cos(a)*1.05,math.sin(a)*1.05,4.3),(math.cos(a)*1.05,math.sin(a)*1.05,4.85),.033,'#535e58',6)
        b=(i+1)*2*PI/12;beam((math.cos(a)*1.05,math.sin(a)*1.05,4.8),(math.cos(b)*1.05,math.sin(b)*1.05,4.8),.025,'#535e58',6)
    cone((0,0,4.82),.72,1.02,'#adbeae',top=.72,n=12)
    for i in range(8):
        a=i*PI/4;beam((math.cos(a)*.72,math.sin(a)*.72,4.35),(math.cos(a)*.72,math.sin(a)*.72,5.33),.043,'#506562',6)
    cone((0,0,5.53),1.0,.50,'#536e6b',top=.04,n=12)
    cone((0,0,5.93),.045,.37,GOLD,top=0,n=8)
    door(0,-1.26,1.06,.66,1.5)
    for z in [2.1,3.35]:window(0,-(1.12-(z-2.1)*.13),z,.27,.45,'#65786d')

DEFS=[
('build-moon-gate',moongate,6.2,2.4,'圆月漏窗院墙','中式精选 · 江南园林','moon',WHITE,DARK,'完整圆形门洞与两侧漏窗形成通透院墙。窄墙适合围合花园，圆门可以框住远处的景物。'),
('build-huizhou',huizhou,5.5,4.8,'徽州马头墙宅','中式精选 · 徽派民居','jiangnan',WHITE,DARK,'高低错落的马头墙、粉白墙面与黛瓦屋顶构成徽派民居鲜明的轮廓。'),
('build-red-pagoda',pagoda,4.7,4.7,'朱柱四重檐塔','中式精选 · 木构塔阁','pagoda','#9d493b','#527669','四层逐渐收分的塔身与宽阔叠檐向上展开，朱柱和金色塔刹强调层次。'),
('build-covered-bridge',coveredbridge,7.2,3.1,'杉木风雨廊桥','中式精选 · 风雨桥','bridge','#a87a4e',DARK,'拱起的木铺桥面两侧设有栏杆，屋顶为步行者提供遮蔽。桥下可通过水流，廊内可步行。'),
('build-teahall',teahall,6.3,5.0,'临水听荷茶堂','中式精选 · 园林厅堂','hall','#a8764c','#426a62','深挑檐、前廊、长凳与暖色吊灯组成开敞茶堂，可与水岸和竹林组合。'),
('build-guildhall',guildhall,5.2,4.9,'山城木骨会馆','西式精选 · 都铎街屋','lodge','#e0cba6','#a25d48','深色斜撑木骨架、陡坡瓦顶和独立老虎窗构成中世纪街屋的层次。'),
('build-chapel',chapel,5.0,5.9,'尖拱玫瑰窗礼堂','西式精选 · 哥特乡村','chapel','#bcb8a2','#5c6d7b','扶壁、细长窗、前立面圆形花窗和尖塔让石礼堂在远处也易于辨认。'),
('build-thatch',thatch,5.4,4.6,'花窗茅草农舍','西式精选 · 英伦乡居','stone','#dfd0a5','#b69a58','厚茅草坡顶、绿色百叶窗、窗台花箱与石烟囱组成柔和的乡村轮廓。'),
('build-villa',villa,6.1,5.6,'陶瓦藤架别墅','西式精选 · 地中海','adobe','#e2c49b','#b86d4b','主副屋体、暖色陶瓦、绿色窗板和入口木藤架适合搭配砂地与灌木花园。'),
('build-lighthouse',lighthouse,4.0,4.0,'赤白海岸灯塔','西式精选 · 海岸建筑','bell','#d9d7c1','#a8624d','红白相间的收分塔身、环形栏杆与顶部灯室形成高耸的海岸地标。')]

if __name__=='__main__':
    metadata={};catalog=[]
    for id,fn,w,d,name,family,form,c,a,fact in DEFS:
        h.export(id,fn,w,d,'house')
        bounds=[o.matrix_world@Vector(p) for o in bpy.context.scene.objects if o.type=='MESH' for p in o.bound_box]
        maxx=max(abs(p.x) for p in bounds);maxy=max(abs(p.y) for p in bounds);height=max(p.z for p in bounds)
        assert maxx<=w/2+.001,(id,'width',maxx,w)
        assert maxy<=d/2+.001,(id,'depth',maxy,d)
        assert h.assets[-1]['triangles']<=5000,(id,h.assets[-1])
        metadata[id]={'width':w,'depth':d,'maxHeight':round(height,3),'solid':True}
        if form=='bridge':metadata[id].update(solid=False,fixedHeight=True)
        if form=='moon':metadata[id]['collisionBoxes']=[{'x':-1.93,'z':0,'w':1.87,'d':.65},{'x':1.93,'z':0,'w':1.87,'d':.65}]
        catalog.append([id,name,family,c,a,w,d,form,fact])
    (h.OUT/'architecture-manifest.json').write_text(json.dumps({'generator':'Blender 4.5 original architecture','assets':h.assets},ensure_ascii=False,indent=2))
    (ROOT/'src'/'architecture-pack-data.js').write_text('export const architectureCatalog = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\nexport const architectureModels = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n')
    print('ARCHITECTURE_COMPLETE',flush=True)
