"""Low-poly miniatures for the four regional habitats. Run in background Blender."""
import importlib.util
import math
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("waterside", Path(__file__).with_name("waterside-pack.py"))
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)
k, arch = w.kit, w.architecture
box, beam, ico, cone, mesh = k.box, k.beam, k.ico, k.cone, k.mesh
oak, bark, brass = '#9d774f', '#5f493d', '#bc9b5d'
pi, tau = math.pi, math.tau


def wheelhouse():
    box((-.41,0,.42),(3.31,2.85,.84),'#a49c86',.045)
    box((-.41,0,1.65),(3.26,2.79,1.63),'#e1d3b3')
    for y in (-1.42,1.42):
        for x in (-1.99,-.98,.12,1.17):
            box((x,y,1.56),(.11,.1,1.84),bark)
        for z in (.87,2.35):
            box((-.42,y,z),(3.35,.12,.12),bark)
        for x in (-1.51,.61):
            beam((x-.44,y,.92),(x+.43,y,2.29),.055,oak,6)
    arch.gable(3.58,3.91,2.45,1.03,'#79776b',x=-.42,axis='x')
    arch.door(-.53,-1.42,.91,.73,1.59)
    for x in (-1.52,.49):
        arch.window(x,-1.46,1.67,.51,.65)
    box((-1.32,.55,3.24),(.39,.5,1.58),'#a47860')
    box((-1.32,.55,4.02),(.51,.6,.16),'#705e55')
    beam((1.03,0,1.17),(2.41,0,1.17),.13,bark)
    start=len(k.parts)
    for i in range(14):
        a=i*tau/14
        def point(x,r,angle):
            return (x,r*math.cos(angle),1.17+r*math.sin(angle))
        for x in (1.61,2.32):
            beam(point(x,1.02,a),point(x,1.02,a+tau/14),.07,bark,6)
            if i%2==0: beam(point(x,.09,a),point(x,1.02,a),.057,oak,6)
        box(point(1.97,1.02,a),(.76,.28,.102),'#b99062',rot=(a,0,0))
    wheel=w.limb(start,'Oak paddle wheel',(1.965,0,1.17))
    k.animate(wheel,'Turn',[(1,(0,0,0)),(121,(tau,0,0))],True)


def pasture():
    # Hand-hewn bent frames, open central bay, individual slats and tied hay.
    for x in (-1.83,0,1.83):
        for y in (-1.13,1.13):
            box((x,y,1.13),(.16,.16,2.26),bark)
            box((x,y,.12),(.25,.25,.24),'#aaa48c')
            beam((x,y,1.61),(x+(.44 if x<=0 else -.44),y,2.11),.055,oak)
        box((x,0,2.13),(.16,2.52,.17),oak)
    arch.gable(3.09,4.27,2.18,.79,'#948469',axis='x')
    for j in range(7):
        box((0,1.12,.34+j*.21),(3.68,.072,.177),['#93704e','#ad8960'][j%2])
    for y in (-.73,-.27,.2,.66):
        box((-1.83,y,1.06),(.075,.36,1.62),'#a58159')
    for x,y,z in ((-.99,.50,.38),(.13,.64,.38),(-.58,.64,1.01)):
        bale=cone((x,y,z),.36,.85,'#c9a75b',top=.36,n=12)
        bale.rotation_euler.y=pi/2
        for dx in (-.25,.25):
            hoop=cone((x+dx,y,z),.369,.035,'#99804b',top=.369,n=12)
            hoop.rotation_euler.y=pi/2
    box((1.13,-.76,.39),(1.05,.48,.36),'#ae875b',.04)
    for x in (.71,1.56):
        for y in (-.92,-.60): box((x,y,.18),(.08,.08,.36),bark)


def lighthouse():
    arch.lighthouse()
    # Split-panel Fresnel lens, visible between the lantern's uprights.
    for i in range(8):
        a=(i+.5)*tau/8
        for j in range(4):
            p=(.73*math.cos(a),.73*math.sin(a),4.60+j*.135)
            box(p,(.24,.035,.062),'#e7c36e',rot=(0,0,a+pi/2))


def tide():
    # Low shelved rocks with tide-dark lower bands and scattered limpets.
    for n,(x,y,rx,ry,h) in enumerate(((-.72,-.09,.62,.51,.52),(.29,.30,.67,.36,.39),(.91,-.10,.42,.31,.28),(.39,-.60,.42,.22,.16),(-.58,-.63,.31,.18,.09),(-.21,.64,.35,.20,.16))):
        rings=[(.89,.015),(1,h*.33),(.93,h*.58),(.70,h)]
        angles=[i*tau/9+.23*n for i in range(9)]
        pts=[(x+rx*r*math.cos(a),y+ry*r*math.sin(a),z) for r,z in rings for a in angles]
        for j,shade in enumerate(('#566666','#78817c','#9b9b88')):
            faces=[(j*9+i,j*9+(i+1)%9,(j+1)*9+(i+1)%9,(j+1)*9+i) for i in range(9)]
            mesh('Stratified reef',pts,faces,shade)
        mesh('Sunlit shelf',pts[27:],[tuple(range(9))],'#aca491')
        for i in range(3):
            a=i*2.4+n
            cone((x+rx*.47*math.cos(a),y+ry*.41*math.sin(a),h+.019),.041,.038,'#d2ba97',top=.014,n=7)
    for i in range(13):
        x=.54+.13*math.sin(i*2.4);y=-.26+.10*math.cos(i*2.4)
        w.folded_leaf((x,y,.06),(x+.13*math.sin(i),y+.13*math.cos(i),.17+i%3*.027),.033,'#87915b')


def eye_pair(width,y,z,r):
    for side in (-1,1):
        ico((side*width,y,z),(r,r*.87,r),'#282e2c',2,'Eye')
        ico((side*(width+r*.66),y-r*.45,z+r*.45),(r*.26,)*3,'#f1e6ca',1,'Eye glint')


def bird(gull):
    scale=1 if gull else .61
    color='#eff0dc' if gull else '#514839'
    wing='#a6b1ac' if gull else '#635747'
    feet='#c0975e' if gull else '#6e6a60'
    ico((0,.016,.276),(.152,.275,.145),color,2,'Body')
    ico((0,.086,.34),(.128,.227,.075),wing,2,'Mantle')
    for i in (-1,0,1):
        w.folded_leaf((.03*i,.17,.318),(.06*i,.46 if gull else .31,.282 if gull else .36),.045,wing)
    for side in (-1,1):
        beam((side*.065,0,.18),(side*.073,0,.029),.012,feet)
        for j in (-1,0,1): beam((side*.073,0,.029),(side*.073+j*.027,-.067,.017),.009,feet,5)
    start=len(k.parts)
    ico((0,-.16,.411),(.13,.145,.13),color,2,'Head')
    if not gull: ico((0,-.189,.317),(.122,.105,.119),'#eee4ca',2,'White bib')
    billcolor='#ddb866' if gull else '#3e4139'
    verts=[(-.046,-.256,.407),(.046,-.256,.407),(0,-.256,.443),(0,-.256,.39),(0,-.41 if gull else -.35,.397)]
    mesh('Bill',verts,[(0,1,2),(0,2,4),(2,1,4),(1,3,4),(3,0,4)],billcolor)
    eye_pair(.111,-.197,.434,.019)
    head=w.limb(start,'Head',(0,-.106,.34))
    glance=[(1,(0,0,0)),(15,(.32,0,.05)),(22,(0,0,.02)),(31,(.27,0,-.04)),(40,(0,0,0)),(69,(0,0,0))] if not gull else [(1,(0,0,0)),(22,(-.04,0,.4)),(48,(-.04,0,.4)),(65,(.09,0,-.14)),(90,(0,0,0))]
    k.animate(head,'Perch',glance)
    for clip in ('Takeoff','Fly','Land'):
        k.animate(head,clip,[(1,(.01,0,0)),(9,(-.11,0,0)),(18,(.01,0,0))])
    for side in (-1,1):
        start=len(k.parts);pivot=(side*.108,.045,.34)
        tip=.71 if gull else .45
        for j in range(5):
            mid=(side*(.30-j*.013),.074+j*.028,.334)
            w.folded_leaf(pivot,(side*(tip*.74-j*.018),.12+j*.041,.318),.066,wing)
            w.folded_leaf(mid,(side*(tip-j*.054),.205+j*.042,.30),.047,'#404947' if gull else '#524c42')
            if gull and j<3:
                ico((side*(tip-.043-j*.054),.204+j*.042,.306),(.028,.022,.009),'#e3e7d8')
        wingmesh=w.limb(start,'Wing'+str(side),pivot)
        folded=(0,side*.48,side*1.22); high=(0,-side*.79,side*.08);low=(0,side*.48,side*.14)
        k.animate(wingmesh,'Perch',[(1,folded),(69,folded)])
        k.animate(wingmesh,'Takeoff',[(1,folded),(7,high),(14,low)])
        # Gulls pause with level wings to glide, the dipper beats quickly.
        wingpose=[(1,low),(10,high),(20,(0,0,side*.12)),(49,(0,-side*.06,side*.14)),(60,low)] if gull else [(1,low),(4,high),(8,low)]
        k.animate(wingmesh,'Fly',wingpose)
        k.animate(wingmesh,'Land',[(1,high),(6,low),(11,high),(18,folded)])
    if scale!=1:
        # Scaling around a common origin preserves the pivots of the animation.
        for o in k.bpy.context.scene.objects:
            if o.type=='MESH': o.location*=scale;o.scale*=scale


def hare():
    coat,cream='#a8855f','#dec7a5'
    ico((0,.045,.266),(.178,.296,.193),coat,2,'Long body')
    ico((0,.302,.306),(.069,.084,.078),cream,2,'Scut')
    start=len(k.parts)
    ico((0,-.173,.434),(.127,.165,.133),coat,2,'Head')
    ico((0,-.29,.401),(.085,.09,.065),cream,2,'Muzzle')
    ico((0,-.367,.416),(.037,.022,.023),'#635049',1)
    eye_pair(.111,-.226,.465,.023)
    head=w.limb(start,'Listening head',(0,-.12,.35))
    k.animate(head,'Crouch',[(1,(0,0,0)),(27,(.25,0,0)),(53,(.1,0,-.19)),(89,(0,0,0))])
    for side in (-1,1):
        start=len(k.parts);p=(side*.062,-.15,.51)
        ear=ico((side*.079,-.108,.672),(.047,.057,.192),coat,2);ear.rotation_euler.x=-.24
        inner=ico((side*.08,-.145,.678),(.029,.032,.139),'#b58b79',2);inner.rotation_euler.x=-.24
        ico((side*.082,-.076,.824),(.026,.035,.046),'#534c40',1)
        e=w.limb(start,'Long ear'+str(side),p)
        k.animate(e,'Crouch',[(1,(0,0,0)),(30,(.04,side*.08,0)),(38,(-.15,-side*.13,0)),(57,(0,0,0)),(89,(0,0,0))])
        for clip,poses in [('Gather',[0,-.37]),('Leap',[-.37,-.90,-.48]),('Settle',[-.48,.10,0])]:
            k.animate(e,clip,[(1+i*6,(val,0,0)) for i,val in enumerate(poses)])
        for hind in (True,False):
            start=len(k.parts)
            x=side*(.13 if hind else .088);y=.16 if hind else -.15
            pivot=(x,y,.285)
            ico((x,y-.028,.183),(.085 if hind else .037,.135 if hind else .047,.14),coat,2)
            ico((x,y-.072,.065),(.05,.15 if hind else .082,.039),cream,2)
            leg=w.limb(start,('Haunch' if hind else 'Forepaw')+str(side),pivot)
            for clip,poses in [('Crouch',[0,0]),('Gather',[0,.20]),('Leap',[.20,-1.02 if hind else .55,-.36 if hind else -.26]),('Settle',[-.36 if hind else -.26,.13,0])]:
                k.animate(leg,clip,[(1+i*6,(val,0,0)) for i,val in enumerate(poses)])


def crab():
    shell,edge='#bd714c','#d69669'
    ico((0,0,.148),(.211,.155,.09),shell,2,'Carapace')
    for i in range(6):
        ico((.13*math.cos(i),.068*math.sin(i*2),.222),(.019,.012,.008),'#d89c70')
    for side in (-1,1):
        beam((side*.071,-.076,.192),(side*.095,-.134,.225),.012,shell)
        ico((side*.095,-.134,.226),(.023,.022,.018),'#333833',2,'Eyestalk')
        start=len(k.parts);pivot=(side*.138,-.071,.143)
        beam(pivot,(side*.232,-.149,.17),.031,edge)
        ico((side*.228,-.184,.175),(.055,.072,.051),shell,2)
        for j in (-1,1):
            beam((side*(.224+j*.024),-.211,.18),(side*(.212+j*.031),-.273,.216+.017*j),.014,'#dcae87',6)
        claw=w.limb(start,'Feeding chela'+str(side),pivot)
        k.animate(claw,'Idle',[(1,(0,0,0)),(18,(.19,0,-side*.4)),(31,(.31,0,-side*.61)),(55,(0,0,0))])
        k.animate(claw,'Scuttle',[(1,(.07,0,0)),(8,(-.03,0,side*.04)),(16,(.07,0,0))])
        for phase in (0,1):
            start=len(k.parts)
            for i in range(phase,4,2):
                y=-.078+i*.062
                a=(side*.15,y,.148);b=(side*(.259+.025*math.sin(i)),y+(i-1.5)*.026,.135)
                c=(side*(.352+.022*math.sin(i)),y+(i-1.5)*.057,.022)
                beam(a,b,.022,edge,6); beam(b,c,.015,shell,6)
            legs=w.limb(start,'Walking legs'+str(side)+'_'+str(phase),(side*.15,.02,.145))
            swing=side*(1 if phase else -1)
            raised=(0,-side*.22,.08*swing)
            contact=(0,0,-.08*swing)
            a,b=(raised,contact) if phase else (contact,raised)
            k.animate(legs,'Scuttle',[(1,a),(8,b),(16,a)])


if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    k.render_preview=w.thumbnail
    for id,func,width,depth,kind in [
        ('watermill',wheelhouse,4.9,3.8,'house'),('pasture-shelter',pasture,4.4,3.2,'house'),
        ('build-lighthouse',lighthouse,4,4,'house'),('tidal-rocks',tide,2.8,2,'decor'),
        ('dipper',lambda:bird(False),.45,.45,'animal'),('sea-gull',lambda:bird(True),.75,.75,'animal'),
        ('meadow-hare',hare,.58,.58,'animal'),('shore-crab',crab,.46,.46,'animal')]:
        if not args or id in args: k.export(id,func,width,depth,kind)
