"""Original nature sculptures for 林栖. Run in background Blender."""
import bpy, math, json, importlib.util
from pathlib import Path
from mathutils import Vector
spec=importlib.util.spec_from_file_location('pack_helpers',Path(__file__).with_name('model-pack.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
PI=math.pi

def render_preview(id):
    """Frame the real projected silhouette with breathing room at card aspect."""
    scene=bpy.context.scene;scene.frame_set(1)
    scene.render.engine='CYCLES';scene.cycles.samples=16
    scene.render.resolution_x=320;scene.render.resolution_y=260;scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.78,.74,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    points=[o.matrix_world@v.co for o in scene.objects if o.type=='MESH' for v in o.data.vertices]
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(low+high)/2
    bpy.ops.object.camera_add(location=center+Vector((7,-10,7)))
    camera=bpy.context.object;rotation=(center-camera.location).to_track_quat('-Z','Y')
    camera.rotation_euler=rotation.to_euler();camera.data.type='ORTHO'
    projected=[rotation.inverted()@(p-center) for p in points]
    xlo=min(p.x for p in projected);xhi=max(p.x for p in projected)
    ylo=min(p.y for p in projected);yhi=max(p.y for p in projected)
    camera.location+=rotation@Vector(((xlo+xhi)/2,(ylo+yhi)/2,0))
    camera.data.ortho_scale=max(xhi-xlo,(yhi-ylo)*320/260)*1.16
    scene.camera=camera
    bpy.ops.object.light_add(type='AREA',location=center+Vector((-3,-4,8)))
    light=bpy.context.object;light.data.energy=480;light.data.shape='DISK';light.data.size=6
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=str(h.OUT/(id+'.png'));bpy.ops.render.render(write_still=True)

h.render_preview=render_preview

# Leaves are solid two-faced diamonds sharing the same opaque vertex palette.
def leaf(base,tip,width,shade):
    a,b=Vector(base),Vector(tip);direction=b-a
    side=direction.cross(Vector((0,0,1)))
    if side.length<.001:side=Vector((1,0,0))
    side.normalize();side*=width
    middle=a.lerp(b,.43);ridge=middle+Vector((0,0,width*.18))
    h.mesh('Folded leaf',[a,middle+side,b,middle-side,ridge],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],shade)

def bamboo():
    for i,(x,y,height,lean) in enumerate([(-.56,.11,3.5,-.40),(-.25,-.15,4.1,-.08),(.13,.18,3.8,.40),(.52,.1,3.2,.63),(.3,-.43,2.5,.25)]):
        nodes=[]
        for j in range(8):
            t=j/7;nodes.append(Vector((x+lean*t*t,y+.10*math.sin(t*2),height*t)))
        for j in range(7):
            h.beam(nodes[j],nodes[j+1],.047 if i!=1 else .058,'#658547',7)
            at=nodes[j].lerp(nodes[j+1],.94);end=nodes[j].lerp(nodes[j+1],1)
            h.beam(at,end,.058,'#b0b77a',7)
        for j in [3,5,6]:
            a=nodes[j];side=-1 if (i+j)%2 else 1;b=a+Vector((side*.49,-.12,.17))
            h.beam(a,b,.015,'#718c4d',5)
            for k in range(5):
                p=a.lerp(b,k/5)
                leaf(p,p+Vector((side*(.24+.035*k),(-1 if k%2 else 1)*.22,.15-.08*k)),.055,['#5d8045','#8ba45e'][k%2])
    for i in range(5):
        a=i*2.4;leaf((0,0,.025),(.8*math.cos(a),.6*math.sin(a),.04),.035,'#afa56b')

def bonsai():
    trunk=[(0,0,0),(-.12,.04,.53),(.19,.07,1.03),(.46,.05,1.39),(.30,.04,1.84),(.45,.05,2.20)]
    for i in range(len(trunk)-1):h.beam(trunk[i],trunk[i+1],.19-i*.027,'#705c48',8)
    for i,(a,b) in enumerate([(trunk[1],(-.87,.03,.71)),(trunk[2],(-.58,.40,1.35)),(trunk[3],(1.02,.18,1.62)),(trunk[4],(-.13,-.40,2.02))]):
        h.beam(a,b,.075-i*.009,'#7e6850',7)
    for i,(x,y,z,sx,sy) in enumerate([(-.78,.03,.91,.63,.48),(-.44,.42,1.55,.62,.53),(.93,.15,1.82,.58,.47),(-.14,-.36,2.22,.64,.49),(.43,.04,2.43,.57,.45)]):
        for dx,dy,k in [(-.26,0,.72),(.17,.11,.85),(0,-.10,1)]:h.ico((x+dx*sx,y+dy,z),(.62*sx*k,sy*k,.145),['#496d59','#68876a','#799772'][i%3],2,'Cloud pruned foliage')
    for a in [0,1.4,3.1,4.7]:h.beam((0,0,.18),(.43*math.cos(a),.36*math.sin(a),.01),.075,'#82705a',7)
    h.ico((.16,-.02,.035),(.55,.42,.055),'#7c8f63',1,'Moss')

def wisteria():
    for x in [-.8,.8]:
        for y in [-.45,.45]:h.box((x,y,1.08),(.085,.085,2.16),'#92744f',.01)
    for x in [-.9,-.45,0,.45,.9]:h.box((x,0,2.15),(.085,1.35,.09),'#ac8d60',.01)
    for y in [-.62,0,.62]:h.box((0,y,2.10),(2.05,.075,.09),'#7b6247')
    for i in range(15):
        t=i/14;h.beam((-.79+.1*math.sin(t*16),-.44+.1*math.cos(t*16),t*2.18),(-.79+.1*math.sin((t+.08)*16),-.44+.1*math.cos((t+.08)*16),(t+.08)*2.18),.035,'#655d40',5)
    for i in range(11):
        a=i*2.4;x=.77*math.cos(a);y=.51*math.sin(a)
        h.ico((x,y,2.28),(.39,.30,.15),['#6e8a52','#8aa260'][i%2],1,'Vine foliage')
        for j in range(4):
            r=.105-j*.022;h.ico((x+.08,y-.13,2.14-j*.13),(r,r,r*1.24),['#a38db5','#bba0ca','#ccb5d2','#d6c0db'][j],1,'Pendant flower raceme')

def willow():
    h.beam((0,0,0),(.12,.05,2.25),.11,'#7a6d4e',9)
    for i in range(8):
        a=i*2*PI/8;direction=Vector((math.cos(a),math.sin(a),0));end=direction*.77+Vector((.12,.05,2.55+.12*math.sin(i)))
        h.beam((.08,.03,1.55),end,.039,'#8e8154',6)
        h.ico(end,(.43,.37,.23),'#8b9e62',1,'Upper canopy')
        for k in range(3):
            shift=Vector((.12*math.cos(a+.9*k),.12*math.sin(a+.9*k),0));start=end+shift
            previous=start
            for j in range(1,6):
                t=j/5;p=start+direction*(.27*math.sin(t*1.6))+Vector((0,0,-t*(1.33+.16*k)))
                h.beam(previous,p,.009,'#829150',4)
                for side in [-1,1]:leaf(p,p+Vector((math.cos(a+side*.6)*.12,math.sin(a+side*.6)*.12,-.18)),.033,['#769159','#a6b879'][j%2])
                previous=p

def palm():
    for j in range(12):
        z=.12+j*.22;x=.09*math.sin(z*.7)
        h.cone((x,0,z),.12-j*.004,.25,['#907b55','#aa9266'][j%2],top=.107-j*.004,n=8)
        if j%2==0:h.cone((x,0,z+.12),.123-j*.004,.043,'#705f42',top=.123-j*.004,n=8)
    top=Vector((.08,0,2.82))
    for i in range(9):
        a=i*2*PI/9;direction=Vector((math.cos(a),math.sin(a),0));stem=top+direction*.42+Vector((0,0,.12));h.beam(top,stem,.025,'#9d9c55',5)
        # Radial pleated fan leaf; bright ridges alternate with recessed folds.
        verts=[stem];radius=.78
        for j in range(13):
            t=a+(j/12-.5)*1.32;verts.append(stem+Vector((math.cos(t)*radius,math.sin(t)*radius,.18 if j%2 else .06)))
        h.mesh('Pleated fan frond',verts,[(0,j+1,j+2) for j in range(12)],['#587b54','#739253','#92a665'][i%3])
        for j in range(0,13,3):h.beam(stem,verts[j+1],.008,'#a5ae72',4)
    for i in range(4):h.ico((.1+.08*math.cos(i),.08*math.sin(i),2.73),(.11,.09,.13),'#9f8051',1,'Palm fruit')

def fern():
    for i in range(11):
        a=i*2.4;direction=Vector((math.cos(a),math.sin(a),0));prev=Vector((0,0,.05))
        length=.63+.18*math.sin(i*1.7)
        for j in range(1,7):
            t=j/6;p=direction*length*t+Vector((0,0,.05+.45*math.sin(t*1.9)))
            h.beam(prev,p,.008,'#77944f',4)
            if j<6:
                side=Vector((-direction.y,direction.x,0))*.17*(1-t*.8)
                for sign in [-1,1]:leaf(p,p+side*sign+direction*.08+Vector((0,0,.025)),.035,['#4c7950','#76a062'][i%2])
            prev=p
        leaf(prev,prev+direction*.1,.027,'#8cae70')
    h.ico((0,0,.025),(.43,.37,.04),'#83976d',1,'Moss bed')

def layered_rings(name,rings,colors,n=10,seed=.1):
    for j in range(len(rings)-1):
        r,z=rings[j];rr,zz=rings[j+1];verts=[]
        for radius,height in [(r,z),(rr,zz)]:
            for i in range(n):
                a=i*2*PI/n;v=1+.08*math.sin(i*4.1+seed);verts.append((math.cos(a)*radius*v,math.sin(a)*radius*v*.77,height))
        faces=[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]+[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
        h.mesh(name,verts,faces,colors[j%len(colors)])

def mesa():
    layered_rings('Sandstone strata',[(1.18,0),(1.12,.18),(.94,.28),(.98,.46),(.86,.53),(.90,.85),(.73,.94),(.75,1.18),(.65,1.24),(.68,1.45),(.55,1.52),(.56,1.66)],['#a76847','#c48a5d','#d4a272','#b7764f'],11)
    for x,y,s in [(-.88,-.67,.24),(.97,-.41,.20),(-.63,.65,.31)]:h.ico((x,y,.10),(s,s*.7,.16),'#bf8c64',1,'Fallen sandstone')
    h.ico((.08,.05,1.68),(.40,.31,.035),'#c4b886',1,'Pale plateau cap')

def peak():
    for i,(x,y,z,r) in enumerate([(-.49,.0,2.7,.61),(.32,.13,3.55,.72),(.74,.12,1.92,.40),(-.2,-.52,1.65,.42)]):
        n=7;verts=[(x+r*math.cos(j*2*PI/n),y+r*.75*math.sin(j*2*PI/n),0) for j in range(n)]
        verts+=[(x+.13+r*.45*math.cos(j*2*PI/n),y+r*.34*math.sin(j*2*PI/n),z*.56+.1*math.sin(j*2)) for j in range(n)]+[(x+.20,y+.03,z)]
        h.mesh('Fractured granite spire',verts,[(j,(j+1)%n,n+(j+1)%n,n+j) for j in range(n)]+[(n+j,n+(j+1)%n,2*n) for j in range(n)],['#8d9a9c','#73868c','#9ea8a3'][i%3])
        cap=[(x+.13+r*.46*math.cos(j*2*PI/n),y+r*.35*math.sin(j*2*PI/n),z*.57+.10*math.sin(j*2)) for j in range(n)]+[(x+.20,y+.03,z+.015)]
        h.mesh('Angular snow cap',cap,[(j,(j+1)%n,n) for j in range(n)],'#d7e2dc')
    h.ico((.05,0,.08),(1.11,.76,.11),'#bac8c1',1,'Scree apron')

def sea_arch():
    # Stack of offset thin slabs gives an eroded arch silhouette rather than a rock torus.
    for side in [-1,1]:
        for j in range(5):
            h.ico((side*(.75-.045*j),.03*math.sin(j),.19+j*.28),(.32-j*.016,.40,.22),['#919e9a','#afb5a4','#c0c1ac'][j%3],1,'Eroded limestone pier')
    for j in range(7):
        t=j*PI/6;h.ico((.62*math.cos(t),0,1.29+.46*math.sin(t)),(.23,.39,.22),['#b6bca8','#d0cfb9'][j%2],1,'Arch lintel')
    h.ico((-.72,.06,1.66),(.33,.32,.06),'#82986f',1,'Salt tolerant moss')
    for i in range(6):
        a=i*2.4;h.ico((math.cos(a)*.90,math.sin(a)*.62,.07),(.20,.13,.08),'#a7b7ae',1,'Rounded shore cobble')

def terraces():
    # Stepped, shallow basin surfaces outlined with irregular scalloped pale rims.
    for j in range(4):
        y=-.66+j*.40;z=.13+j*.27;w=1.10-j*.15;d=.43
        h.box((0,y,z*.5),(w*2,d*1.6,z),'#c6c9ac',.04)
        h.box((0,y-.015,z+.01),(w*1.83,d*1.35,.035),['#91b8ad','#a2c6b7','#b0ccbd','#b9d0c1'][j])
        for side in [-1,1]:h.beam((side*w,y-d*.75,z+.05),(side*w,y+d*.75,z+.05),.045,'#e1d9b9',6)
        for i in range(10):
            x=-w+(i+.5)*w*.2;h.ico((x,y-d*.74+.035*math.sin(i*2.4),z+.05),(.14,.07,.06),'#ded8b8',1,'Scalloped travertine rim')
    for x,y in [(-1.11,.59),(.95,-.38)]:h.ico((x,y,.12),(.19,.23,.15),'#adbb8b',1,'Bank vegetation')

entries=[
 ('nature-bamboo',bamboo,2.8,2.8,'plant','竹影弯梢竹丛','阔叶树 · 东方园林','#75964f','#b3bd7b','broad','分节竹秆向外微弯，细长叶片形成疏透的扇形。竹丛可以围合院落或衬托白墙。',.69),
 ('nature-bonsai',bonsai,2.8,2.8,'plant','云片虬枝松','针叶树 · 中式盆景','#55745a','#899a71','umbrella','扭转的枝干托起层层云片状树冠，疏密交错的枝叶适合放在庭院入口与岩石旁。',.40),
 ('nature-wisteria',wisteria,2.8,2.8,'plant','紫藤花架','阔叶树 · 花园藤木','#9384a8','#c8add4','broad','木架上方铺展绿叶，串串紫色花序向下悬垂。花架适合标记花园步道和休息处。',1.12),
 ('nature-willow',willow,2.8,2.8,'plant','丝帘垂柳','阔叶树 · 水岸栽植','#87a065','#b1bf82','weeping','细长柳条从外展枝梢垂下，透空树冠与水面形成柔和的层次。',.25),
 ('nature-palm',palm,2.8,2.8,'plant','折扇棕榈','阔叶树 · 暖地庭园','#6e8d59','#b3b67c','palm','环状叶痕围绕细长树干，折扇形叶片从冠顶向外伸展。适合搭配暖色墙面和砂岩。',.19),
 ('nature-fern',fern,1.8,1.8,'plant','羽叶蕨丛','蕨类 · 林下植物','#598458','#96b47e','fern','弓形叶轴两侧排列细小羽片。低矮蕨丛可布置在树下和岩石边，增加近地层次。',0),
 ('nature-mesa',mesa,2.8,2.8,'decor','层理红砂岩台地','地貌雕刻 · 荒漠台地','#b87d56','#d4a978','monolith','不同厚度和颜色的水平岩层层层退台，顶部形成平坦平台，展现砂岩台地的轮廓。',0),
 ('nature-peak',peak,2.8,2.8,'decor','雪冠花岗岩针峰','地貌雕刻 · 高山尖峰','#92a2a3','#d9e3da','monolith','陡峭的棱角岩峰与不规则雪线形成强烈剪影，适合组合成远景山脊。',0),
 ('nature-sea-arch',sea_arch,2.8,2.8,'decor','海蚀层岩拱门','地貌雕刻 · 海岸侵蚀','#b0b9a7','#d2d0b6','monolith','两侧层状岩柱支撑透空拱洞，底部散布圆滑卵石，可与水体组合表现海岸地貌。',0),
 ('nature-travertine',terraces,2.8,2.8,'decor','钙华阶池','地貌雕刻 · 矿物沉积','#c5c9b0','#9ebfb0','monolith','浅色钙华池缘层层下落，每层保留浅蓝绿色池面，适合组织阶梯状的水岸景观。',0)
]
metadata={};catalog={'plant':[],'decor':[]}
for id,build,w,d,category,name,family,c,a,form,fact,radius in entries:
    def wrapped(build=build,w=w,d=d):
        build();bpy.context.view_layer.update()
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
        points=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
        low=[min(p[i] for p in points) for i in range(3)];high=[max(p[i] for p in points) for i in range(3)]
        scale=min(1,w/(high[0]-low[0]),d/(high[1]-low[1]))*.98
        cx=(low[0]+high[0])/2;cy=(low[1]+high[1])/2
        for obj in objects:
            bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
            bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
            for v in obj.data.vertices:v.co=Vector(((v.co.x-cx)*scale,(v.co.y-cy)*scale,(v.co.z-low[2])*scale))
        bpy.context.view_layer.update()
    h.export(id,wrapped,w,d,category)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
    height=max(p.z for p in points);width=max(p.x for p in points)-min(p.x for p in points);depth=max(p.y for p in points)-min(p.y for p in points)
    meta={'width':w,'depth':d,'maxHeight':round(height,4),'treeRadius':radius} if category=='plant' else {'width':w,'depth':d,'maxHeight':round(height,4),'collision':True}
    metadata[id]=meta
    h.assets[-1]['bounds']={'width':round(width,4),'depth':round(depth,4),'height':round(height,4)}
    catalog[category].append([id,name,family,c,a,w,d,form,fact])
(h.OUT/'nature-manifest.json').write_text(json.dumps({'generator':'Blender 4.5 original nature sculptures','assets':h.assets},ensure_ascii=False,indent=2))
Path(__file__).resolve().parents[1].joinpath('src/nature-pack-data.js').write_text('export const natureCatalog = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\n\nexport const natureModels = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\n')
print('NATURE_PACK_COMPLETE',flush=True)
