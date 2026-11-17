"""Build the Jiangnan waterside miniatures with Blender 4.5 in background mode.

Run: Blender --background --python scripts/waterside-pack.py
All colors are baked to vertices, and each moving part is a rigid mesh.
"""
import importlib.util
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('architecture', Path(__file__).with_name('architecture-pack.py'))
architecture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(architecture)
kit = architecture.h
box, beam, ico, mesh = kit.box, kit.beam, kit.ico, kit.mesh
tau = math.tau
slate, cedar, heartwood, ochre = '#465b5b', '#9e7250', '#674c3e', '#d1a167'


roof_edge = architecture.roof_edge
gauze_lantern = architecture.gauze_lantern


def stilt_house():
    # The side gallery and exposed timber piles distinguish the stilt dwelling.
    for x in (-1.77, -.58, .58, 1.77):
        for y in (-1.19, 1.15):
            kit.cone((x,y,.43), .095, .86, '#725d4d', top=.077, n=8)
            kit.cone((x,y,.08), .135, .16, '#979788', top=.13, n=8)
    for x in (-1.77, 1.77):
        for s in (-1, 1):
            beam((x,s*.15,.17), (x,s*1.10,.76), .045, cedar, 6)
    for y in (-1.20, 1.15):
        box((0,y,.72), (4.18,.14,.19), heartwood)
    for n in range(21):
        box(((n-10)*.2,0,.85), (.195,2.94,.12), ['#b28a63','#ad8059','#bd9367'][n%3])
    box((0,.22,1.79), (3.83,1.99,1.78), '#deccb0')
    box((0,.23,1.14), (3.88,2.04,.48), '#977353')
    for x in (-1.88,-.91,.91,1.88):
        for y in (-.795,1.226):
            box((x,y,1.82), (.13,.12,1.79), heartwood)
    for x in (-1.34,1.34):
        architecture.window(x,-.84,1.92,.73,.84,heartwood)
        for dx in (-.22,.22):
            box((x+dx,-.936,1.92), (.036,.035,.78), cedar)
    architecture.door(0,-.82,1.66,.87,1.47)
    # Slanting wood shutters on the end wall.
    for y in (-.47,.15,.78):
        box((1.94,y,1.94), (.055,.48,.66), '#77897d')
        for z in (1.67,1.84,2.01,2.18):
            box((1.98,y,z),(.07,.5,.04), heartwood)
    for x in (-1.95,0,1.95):
        box((x,-1.34,1.70),(.11,.11,1.65),cedar)
        for sign in (-1,1):
            beam((x,-1.34,2.20),(x+sign*.25,-1.34,2.44),.042,cedar,6)
    # Gaps at the ends open into the gallery; lattice rails edge the water.
    for center in (-1.45,1.45):
        for z in (1.08,1.45):
            box((center,-1.40,z),(.98,.066,.060),heartwood)
        for dx in (-.36,-.12,.12,.36):
            box((center+dx,-1.40,1.26),(.035,.045,.35),ochre)
    architecture.gable(3.53,4.68,2.56,1.02,slate,axis='x')
    for y in (-1.73,1.73):
        for side in (-1,1):
            roof_edge(side*1.68,side*2.33,y,2.56,.20,.055)
    for side in (-1,1):
        roof_edge(side*1.69,side*2.35,0,3.60,.12,.06)
    for x in (-1.45,1.45):
        gauze_lantern(x,-1.45,2.16,.80)
    # Weathered mooring ring, pegged stairs and fenders.
    for i in range(3):
        box((.54,-1.35-i*.19,.73-i*.23),(.68,.29,.13),cedar)
    for x in (-2.10,2.10):
        kit.cone((x,-1.38,.63),.072,1.25,heartwood,top=.072,n=8)
        for z in (.90,.95,1.0):
            kit.cone((x,-1.38,z),.076,.021,ochre,top=.076,n=8)


def folded_leaf(base, tip, width, shade):
    base,tip=Vector(base),Vector(tip)
    side=(tip-base).cross(Vector((0,0,1)))
    if side.length<.001:
        side=Vector((1,0,0))
    side.normalize()
    side*=width
    middle=base.lerp(tip,.47)
    ridge=middle+Vector((0,0,width*.32))
    mesh('Folded blade',[base,middle+side,tip,middle-side,ridge],
         [(0,1,4),(1,2,4),(2,3,4),(3,0,4)],shade)


def shoreline():
    def stone(x,y,rx,ry,h,shade,n,phase):
        # A level crown with tapered, uneven sides. Flat crown is usable by the frog.
        verts=[]
        for scale,level in ((.77,.005),(1,h*.43),(.70,h)):
            for i in range(n):
                a=i*tau/n+phase
                k=scale*(1+.055*math.sin(i*5.3+phase))
                verts.append((x+rx*k*math.cos(a),y+ry*k*math.sin(a),level))
        faces=[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
        faces += [(n+i,n+(i+1)%n,2*n+(i+1)%n,2*n+i) for i in range(n)]
        faces += [tuple(range(2*n,3*n)),tuple(reversed(range(n)))]
        mesh('Water-worn stone',verts,faces,shade)
    stones=[(-.55,-.24,.56,.38,.25,'#919a8e'),(.13,.26,.60,.39,.19,'#84918b'),
            (.73,.12,.44,.34,.21,'#a5aaa0'),(-.92,.28,.29,.23,.14,'#a6a897'),
            (.38,-.40,.33,.23,.12,'#a19d89'),(.96,-.26,.24,.19,.12,'#7c8b83')]
    for i,(x,y,rx,ry,h,c) in enumerate(stones):
        stone(x,y,rx,ry,h,c,9,i*.74)
    for i in range(15):
        a=i*2.4; x=.98*math.cos(a); y=.57*math.sin(a)
        stone(x,y,.095+i%3*.028,.073+i%2*.027,.048+i%3*.011,['#939c94','#b0ae9c','#758681'][i%3],7,a)
    for x,y,w,d,z in ((-.72,-.31,.20,.12,.251),(.05,.39,.26,.08,.191),(.84,.07,.16,.09,.211)):
        ico((x,y,z+.008),(w,d,.016),'#8b985f',1,'Moss patch')
    for a,b,r in [((-.67,.25,.15),(.12,.08,.35),.074),((.12,.08,.35),(.70,.01,.68),.049),
                 ((.70,.01,.68),(1.02,-.12,.76),.022),((.12,.08,.35),(.33,.32,.49),.029),
                 ((.33,.32,.49),(.43,.44,.49),.017),((-.24,.17,.25),(-.31,.37,.40),.026)]:
        beam(a,b,r,'#a08a67',7)
    for i in range(7):
        a=i*2.4
        folded_leaf((-.12,.41,.11),(-.12+.16*math.cos(a),.41+.16*math.sin(a),.23+i%3*.055),.016,'#77965f')


def reeds():
    for i in range(8):
        a=i*2.40; r=(.11,.26,.17)[i%3]; x=r*math.cos(a); y=r*math.sin(a)
        h=.74+.26*math.sin(i*1.2+.5); dx=.13*math.cos(a); dy=.09*math.sin(a)
        stem=[Vector((x+dx*t*t,y+dy*t*t,h*t)) for t in (0,.42,.73,1)]
        for k in range(3):
            beam(stem[k],stem[k+1],.016-k*.003,['#738558','#9a995c','#a59560'][k],6)
        for j in range(3):
            phi=a+j*2.22; origin=stem[0].lerp(stem[2],.18+j*.24)
            tip=origin+Vector((.28*math.cos(phi),.23*math.sin(phi),.16+j*.034))
            folded_leaf(origin,tip,.034,['#69864f','#90a46a','#9caa6f'][j])
        for j in range(7):
            t=(j+.5)/7; start=stem[-1]+Vector((dx*t*.4,dy*t*.4,t*.18))
            phi=a+j*2.4; end=start+Vector((.066*math.cos(phi),.055*math.sin(phi),.055+.039*(1-t)))
            beam(start,end,.006,'#ae9b72',5)
            tuft=ico(end,(.026,.027,.077*(1-t*.40)),['#c2aa80','#cbb792','#b59f73'][j%3],1,'Silky reed panicle')
            tuft.rotation_euler.y=.40*math.cos(phi)
            tuft.rotation_euler.x=-.43*math.sin(phi)
        beam(stem[-1],stem[-1]+Vector((dx*.45,dy*.45,.215)),.008,'#c5b284',5)
    for obj in kit.parts:
        obj.location.x+=.071



def lily():
    def pad(x,y,r,angle,height,shade):
        pts=[(x,y,height+.003)]
        for i in range(17):
            a=angle+.22+i*(tau-.44)/16
            v=r*(.96+.055*math.sin(i*1.6))
            pts.append((x+v*math.cos(a),y+v*.84*math.sin(a),height+.009*math.sin(i*.8)))
        mesh('Notched floating pad',pts,[(0,i+1,i+2) for i in range(16)],shade)
        for i in (3,6,10,13):
            p=Vector(pts[i]); start=Vector(pts[0]);end=start.lerp(p,.78)
            folded_leaf(start+Vector((0,0,.002)),end+Vector((0,0,.006)),.003,'#94ab77')
    for row in [(-.14,-.07,.195,2.0,.035,'#779863'),(.13,.12,.177,-.2,.035,'#6d9061'),
                (.17,-.16,.132,1.4,.024,'#7f9c63'),(-.18,.15,.1,.7,.023,'#63865c')]:
        pad(*row)
    for cx,cy,k in [(-.06,-.10,1),(.16,.09,.65)]:
        beam((cx,cy,.025),(cx,cy,.105*k),.012*k,'#84976b',6)
        for ring,(num,length,width,lift) in enumerate([(10,.125,.040,.060),(8,.092,.032,.085),(6,.060,.025,.080)]):
            for i in range(num):
                a=(i/num+ring*.085)*tau
                base=(cx,cy,.087*k)
                tip=(cx+math.cos(a)*length*k,cy+math.sin(a)*length*k,(.087+lift)*k)
                folded_leaf(base,tip,width*k,['#d99baf','#edbcbd','#f5d4c6'][ring])
        ico((cx,cy,.143*k),(.033*k,.033*k,.025*k),'#e4b565',2,'Golden stamens')


def limb(start, name, pivot):
    obj=kit.join(kit.parts[start:],name,pivot)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return obj


def rotations(obj, clip, poses):
    kit.animate(obj,clip,poses)


def kingfisher():
    # A russet breast under an azure mantle; the spear bill is a tapered bipyramid.
    ico((0,.008,.237),(.128,.175,.155),'#c47c49',2,'Chestnut breast')
    ico((0,.052,.301),(.112,.158,.088),'#226b80',2,'Kingfisher mantle')
    for i in range(4):
        y=.086+i*.02
        ico((0,y,.351),(.046,.047,.022),'#65b6b0',1,'Blue dorsal streak')
    for side in (-1,1):
        x=side*.046
        beam((x,.005,.16),(x,.009,.039),.012,'#a45c43',6)
        for toe in (-1,0,1):
            beam((x,.009,.037),(x+toe*.019,-.055,.017),.008,'#c07951',5)
        beam((x,.009,.035),(x,.052,.016),.008,'#bb7654',5)
    for i in (-1,0,1):
        p=(i*.034,.099,.291);q=(i*.050,.314-.015*abs(i),.220)
        folded_leaf(p,q,.043,['#326f77','#40a3a0','#2c6374'][i+1])
    start=len(kit.parts)
    ico((0,-.096,.383),(.141,.149,.128),'#277e89',2,'Turquoise crown')
    ico((0,-.187,.325),(.091,.078,.064),'#e7dfbb',2,'Pale throat patch')
    for side in (-1,1):
        ico((side*.099,-.062,.335),(.030,.058,.039),'#e8dbb5',2,'Ivory neck flash')
        ico((side*.113,-.129,.388),(.025,.069,.024),'#2f6065',2,'Dark facial band')
        ico((side*.108,-.133,.357),(.034,.083,.046),'#cf8850',2,'Cinnamon cheek')
        ico((side*.108,-.179,.398),(.016,.030,.021),'#263f44',2,'Dark eye stripe')
        ico((side*.119,-.183,.401),(.010,.015,.013),'#202e32',2,'Eye')
        ico((side*.124,-.190,.408),(.0045,.007,.0045),'#e9e4c4',1,'Catchlight')
        for j in range(4):
            x=.066+.008*j; y=-.161+j*.038
            # Keep the turquoise barring embedded in the actual crown's curved surface.
            top=.383+.128*math.sqrt(max(0,1-(x/.141)**2-((y+.096)/.149)**2))
            ico((side*x,y,top-.006),(.017,.015,.009),'#72ada7',1,'Crown fleck')
    verts=[(-.035,-.20,.392),(.035,-.20,.392),(0,-.20,.422),(0,-.20,.367),(0,-.408,.387)]
    mesh('Dagger upper bill',verts,[(0,2,4),(2,1,4),(1,0,4),(0,1,2)],'#364548')
    mesh('Copper bill base',verts,[(1,3,4),(3,0,4),(1,0,3)],'#90604b')
    head=limb(start,'KingfisherHead',(0,-.07,.337))
    rotations(head,'Perch',[(1,(0,0,0)),(16,(.04,0,0)),(24,(.08,0,.34)),(45,(.08,0,.34)),(53,(-.11,0,.08)),(79,(.03,0,-.23)),(99,(.02,0,-.23)),(121,(0,0,0))])
    rotations(head,'Takeoff',[(1,(.02,0,0)),(6,(.22,0,0)),(14,(-.18,0,0))])
    rotations(head,'Fly',[(1,(-.18,0,0)),(6,(-.13,0,0)),(12,(-.18,0,0))])
    rotations(head,'Land',[(1,(-.18,0,0)),(8,(.14,0,0)),(16,(0,0,0))])
    for side in (-1,1):
        start=len(kit.parts); pivot=(side*.105,.023,.301)
        # Flight feathers are separate overlapping blades, welded into one wing node.
        wing_colors=['#245a76','#2c7489','#2e8994','#47979d','#6fa8a2']
        for j in range(5):
            x=side*(.39-.032*j);y=.08+j*.042
            folded_leaf(pivot,(x,y,.277-.007*j),.053-.002*j,wing_colors[j])
        ico((side*.18,.06,.308),(.105,.072,.029),'#318589',2,'Wing coverts')
        for j in range(3):
            ico((side*(.165+j*.036),.071,.334),(.016,.020,.006),'#9ac8b9',1,'Wing flecks')
        wing=limb(start,'KingfisherWing'+('Left' if side<0 else 'Right'),pivot)
        folded=(0,side*.53,side*1.10)
        high=(0,-side*.76,side*.07);low=(0,side*.63,side*.05)
        rotations(wing,'Perch',[(1,folded),(71,(0,side*.49,side*1.06)),(121,folded)])
        rotations(wing,'Takeoff',[(1,folded),(5,(0,-side*.12,side*.58)),(8,high),(14,low)])
        rotations(wing,'Fly',[(1,low),(4,(0,side*.10,side*.05)),(7,high),(10,(0,-side*.12,side*.08)),(12,low)])
        rotations(wing,'Land',[(1,high),(5,(0,side*.24,side*.16)),(9,(0,-side*.48,side*.63)),(16,folded)])
    ico((0,.015,.14),(.056,.073,.029),'#bd8b58',1,'Lower breast')


def frog():
    ico((0,.016,.123),(.128,.169,.087),'#709260',2,'Speckled green back')
    ico((0,-.015,.084),(.113,.133,.050),'#b2bd85',2,'Pale belly')
    for side in (-1,1):
        for j in range(4):
            ico((side*(.074+.012*math.sin(j)),.124-j*.065,.179+.014*math.sin(j)),
                (.017,.036,.009),'#c0b571',1,'Gold dorsolateral fold')
        for x,y in ((.04,.06),(.084,.01),(.056,-.057),(.090,.081)):
            ico((side*x,y,.19-.3*x),(.016,.018,.008),'#556e49',1,'Olive marking')
    start=len(kit.parts)
    ico((0,-.121,.151),(.143,.106,.080),'#819b68',2,'Wide head')
    ico((0,-.159,.116),(.120,.074,.034),'#b8be90',2,'Lower jaw')
    for side in (-1,1):
        ico((side*.085,-.124,.211),(.048,.048,.047),'#7c965c',2,'Raised eye')
        ico((side*.102,-.157,.226),(.032,.023,.027),'#bea569',2,'Golden iris')
        ico((side*.109,-.175,.228),(.022,.008,.010),'#303c33',2,'Horizontal pupil')
        ico((side*.108,-.181,.234),(.005,.003,.004),'#eae3c4',1,'Eye glint')
        ico((side*.126,-.071,.153),(.020,.022,.022),'#8c865c',1,'Tympanum')
    head=limb(start,'FrogHead',(0,-.05,.13))
    rotations(head,'Crouch',[(1,(0,0,0)),(25,(-.07,0,.03)),(62,(0,0,-.07)),(97,(0,0,0))])
    rotations(head,'Gather',[(1,(0,0,0)),(10,(.18,0,0))])
    rotations(head,'Leap',[(1,(.18,0,0)),(4,(-.30,0,0)),(12,(-.13,0,0))])
    rotations(head,'Settle',[(1,(-.13,0,0)),(4,(.15,0,0)),(13,(0,0,0))])
    for side in (-1,1):
        # Z-folded haunch, calf and webbed toes share a hip pivot on each side.
        start=len(kit.parts); p=(side*.10,.09,.11)
        ico((side*.125,.045,.093),(.069,.111,.053),'#79905b',2,'Folded haunch')
        beam((side*.138,-.024,.076),(side*.168,.131,.039),.025,'#9b9e6b',7)
        for i in range(3):
            beam((side*.168,.131,.038),(side*(.16+.026*i),.182+.018*i,.024),.011,'#a5a477',5)
        leg=limb(start,'FrogHind'+('Left' if side<0 else 'Right'),p)
        crouched=(0,0,0);loaded=(.32,side*.03,side*.13);extended=(-.82,side*.12,-side*.39)
        rotations(leg,'Crouch',[(1,crouched),(55,(.03,0,side*.02)),(97,crouched)])
        rotations(leg,'Gather',[(1,crouched),(10,loaded)])
        rotations(leg,'Leap',[(1,loaded),(5,extended),(9,extended),(12,(-.055,0,-side*.12))])
        rotations(leg,'Settle',[(1,(-.055,0,-side*.12)),(5,(.28,0,side*.13)),(13,crouched)])
        start=len(kit.parts);origin=(side*.086,-.10,.125)
        beam(origin,(side*.151,-.085,.056),.020,'#869c69',7)
        beam((side*.151,-.085,.056),(side*.155,-.166,.031),.015,'#a3ab77',7)
        for i in (-1,0,1):
            beam((side*.155,-.166,.031),(side*(.158+i*.023),-.22+abs(i)*.013,.020),.007,'#b7b887',5)
        fore=limb(start,'FrogFore'+('Left' if side<0 else 'Right'),origin)
        rotations(fore,'Crouch',[(1,(0,0,0)),(97,(0,0,0))])
        rotations(fore,'Gather',[(1,(0,0,0)),(10,(.085,0,side*.08))])
        rotations(fore,'Leap',[(1,(.085,0,side*.08)),(5,(-.32,0,-side*.06)),(12,(-.66,0,-side*.07))])
        rotations(fore,'Settle',[(1,(-.66,0,-side*.07)),(4,(.10,0,side*.10)),(13,(0,0,0))])


def thumbnail(asset):
    scene=bpy.context.scene
    # Isolate the calm pose for stills; clip tracks on the mesh remain in the GLB.
    for obj in scene.objects:
        if obj.animation_data:
            for track in obj.animation_data.nla_tracks:
                track.mute=track.name not in ('Crouch','Perch')
    scene.frame_set(1)
    scene.render.engine='CYCLES'
    scene.cycles.samples=12
    scene.render.resolution_x,scene.render.resolution_y=320,260
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.world.use_nodes=True
    background=scene.world.node_tree.nodes['Background']
    background.inputs[0].default_value=(.79,.83,.77,1);background.inputs[1].default_value=.62
    points=[obj.matrix_world@v.co for obj in scene.objects if obj.type=='MESH' for v in obj.data.vertices]
    lo=Vector([min(v[i] for v in points) for i in range(3)])
    hi=Vector([max(v[i] for v in points) for i in range(3)])
    center=(lo+hi)/2
    elevation=4.0 if asset in ('waterside-kingfisher','waterside-frog') else 6.7
    angle=(11.4,-5.1,elevation) if asset=='waterside-kingfisher' else (8.7,-9.7,elevation)
    bpy.ops.object.camera_add(location=center+Vector(angle))
    camera=bpy.context.object
    rotation=(center-camera.location).to_track_quat('-Z','Y')
    camera.rotation_euler=rotation.to_euler();camera.data.type='ORTHO';scene.camera=camera
    projected=[rotation.inverted()@(p-center) for p in points]
    left,right=min(p.x for p in projected),max(p.x for p in projected)
    lower,upper=min(p.y for p in projected),max(p.y for p in projected)
    camera.location+=rotation@Vector(((left+right)/2,(lower+upper)/2,0))
    camera.data.ortho_scale=max(right-left,(upper-lower)*320/260)*1.18
    for offset,strength,size in [((-3,-4,7),490,5),((3,4,5),250,4)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(offset))
        light=bpy.context.object;light.data.energy=strength;light.data.size=size
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=str(kit.OUT/(asset+'.png'))
    bpy.ops.render.render(write_still=True)


entries=[
    ('water-stilt','waterside-stilt-house',stilt_house,5,3.9,'house'),
    ('build-covered-bridge','build-covered-bridge',architecture.coveredbridge,7.2,3.1,'house'),
    ('shore-stones','waterside-shore-stones',shoreline,2.6,1.55,'decor'),
    ('reeds','waterside-reeds',reeds,.96,.96,'plant'),
    ('water-lily','waterside-lily',lily,.77,.77,'plant'),
    ('kingfisher','waterside-kingfisher',kingfisher,.54,.54,'animal'),
    ('frog','waterside-frog',frog,.5,.5,'animal'),
]

if __name__=='__main__':
    kit.render_preview=thumbnail
    for object_id,asset,build,width,depth,category in entries:
        kit.export(asset,build,width,depth,category)
        print('EXPORTED',object_id,flush=True)
