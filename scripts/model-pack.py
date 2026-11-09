"""Original 林栖 asset pack. Run with Blender --background --python scripts/model-pack.py.

All geometry is authored here, no external assets/textures. Vertex colours share one
opaque material per asset; rigid-part NLA animation avoids skinning on mobile GPUs.
"""
import bpy, math, random, json, os
from mathutils import Vector
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(809)
PI = math.pi
assets = []
parts = []

def linear(v):
    return v / 12.92 if v < .04045 else ((v+.055)/1.055)**2.4

def color(hex):
    return tuple(linear(int(hex[i:i+2],16)/255) for i in (1,3,5)) + (1,)

def reset():
    global parts, material
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    parts=[]
    material=bpy.data.materials.new('Mineral + timber · vertex palette')
    material.use_nodes=True
    nodes=material.node_tree.nodes
    shader=nodes.get('Principled BSDF'); shader.inputs['Roughness'].default_value=.78
    vertex=nodes.new('ShaderNodeVertexColor'); vertex.layer_name='Color'
    material.node_tree.links.new(vertex.outputs['Color'],shader.inputs['Base Color'])

def finish(obj, shade, name='Detail'):
    obj.name=name
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.clear();obj.data.materials.append(material)
    attr=obj.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
    c=color(shade)
    for face in obj.data.polygons:
        k=random.uniform(.94,1.035)
        for i in face.loop_indices:attr.data[i].color=tuple(min(1,v*k) for v in c[:3])+(1,)
    parts.append(obj)
    return obj

def box(loc, size, shade, bevel=0, name='Timber', rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc,rotation=rot)
    obj=bpy.context.object;obj.scale=size
    finish(obj,shade,name)
    if bevel:
        mod=obj.modifiers.new('Soft carved edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def ico(loc, scale, shade, level=1, name='Stone'):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=level,radius=1,location=loc)
    obj=bpy.context.object;obj.scale=scale
    return finish(obj,shade,name)

def cone(loc,radius,depth,shade,top=0,n=12,name='Column'):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=radius,radius2=top,depth=depth,location=loc)
    return finish(bpy.context.object,shade,name)

def beam(a,b,r,shade,n=8):
    a,b=Vector(a),Vector(b)
    obj=cone((a+b)/2,r,(b-a).length,shade,top=r,n=n,name='Branch')
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return obj

def mesh(name, verts, faces, shade):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    return finish(obj,shade,name)

def join(objects,name,pivot=(0,0,0)):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    obj=objects[0];obj.name=name
    bpy.context.scene.cursor.location=pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj

def roof(radius,z,rise,n=6):
    # Curved eaves, thick edge band, ribs, and sculpted ridge finial.
    rings=[(radius*1.09,z+.16),(radius,z),(radius*.70,z+.17),(radius*.36,z+rise*.73),(.055,z+rise)]
    verts=[(r*math.cos(i*2*PI/n),r*math.sin(i*2*PI/n),h) for r,h in rings for i in range(n)]
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(rings)-1) for i in range(n)]
    mesh('Glazed curved roof',verts,faces,'#4b7774')
    for i in range(n):
        angle=i*2*PI/n
        for j in range(len(rings)-1):
            r,h=rings[j];rr,hh=rings[j+1]
            beam((r*math.cos(angle),r*math.sin(angle),h+.03),(rr*math.cos(angle),rr*math.sin(angle),hh+.03),.035,'#9cac91',6)
        a=Vector(verts[i]);b=Vector(verts[(i+1)%n]);beam(a,b,.05,'#324f52',6)
    cone((0,0,z+rise+.13),.12,.35,'#bd9c59',n=8)

def pavilion():
    cone((0,0,.13),2.18,.26,'#c5c0a4',top=2.18,n=6)
    cone((0,0,.29),2,.15,'#aaac95',top=2,n=6)
    for i in range(6):
        t=i*2*PI/6;x,y=1.65*math.cos(t),1.65*math.sin(t)
        cone((x,y,1.57),.095,2.57,'#9b4f3b',top=.08,n=8)
        box((x,y,.44),(.26,.26,.19),'#d0c5a4',.025)
        box((x,y,2.65),(.29,.25,.14),'#b78250',.025)
        for k in range(3):box((x,y,2.72+k*.08),(.35+k*.11,.26,.08),'#a86f43')
        a=(x,y,2.72);tt=(i+1)*2*PI/6;b=(1.65*math.cos(tt),1.65*math.sin(tt),2.72)
        beam(a,b,.095,'#8a4c3a')
        if i!=4:
            aa=Vector((x,y,.82));bb=Vector((b[0],b[1],.82))
            beam(aa,bb,.055,'#a97450')
            for s in (.2,.4,.6,.8):
                p=aa.lerp(bb,s);beam((p.x,p.y,.39),(p.x,p.y,.82),.026,'#b5895b',6)
    roof(2.21,2.84,1.04)
    cone((0,0,2.31),.23,.40,'#e8c885',top=.23,n=8)
    for z in (2.1,2.51):cone((0,0,z),.25,.07,'#70523e',top=.25,n=8)
    box((0,-1.94,.15),(1.0,.7,.17),'#d7ccb3',.025)

def greenhouse():
    box((0,0,.13),(4.7,3.7,.25),'#acaa91',.06)
    box((0,0,.39),(4.45,3.45,.31),'#c9b89a',.025)
    # Opaque blue-green panes are intentionally mobile-friendly, with broad highlights.
    box((0,0,1.46),(4.3,3.3,1.9),'#83aaa4')
    for x in (-2.2,2.2):
        for y in (-1.7,1.7):box((x,y,1.54),(.11,.11,2.25),'#f0dfb8')
    for x in [-2.1+i*.6 for i in range(8)]:
        for y in (-1.68,1.68):
            box((x,y,1.52),(.055,.07,1.97),'#e0d6b1')
            box((x+.11,y-.014,1.66),(.035,.08,.91),'#b8cebc',rot=(0,.16,0))
    for y in [-1.6+i*.55 for i in range(7)]:
        for x in (-2.17,2.17):box((x,y,1.52),(.06,.055,1.97),'#e0d6b1')
    for z in (.58,1.44,2.47):
        for y in (-1.7,1.7):box((0,y,z),(4.45,.08,.08),'#d7c99e')
        for x in (-2.2,2.2):box((x,0,z),(.08,3.45,.08),'#d7c99e')
    for s in (-1,1):
        mesh('Greenhouse roof',[(0,-1.83,3.47),(0,1.83,3.47),(s*2.30,1.83,2.48),(s*2.30,-1.83,2.48)],[(0,1,2,3)],'#9eb9ab')
        for y in [-1.8+i*.6 for i in range(7)]:beam((0,y,3.50),(s*2.3,y,2.51),.035,'#e9dfbe',6)
    beam((0,-1.85,3.5),(0,1.85,3.5),.07,'#e1c891')
    for x in (-.46,.46):box((x,-1.77,1.38),(.09,.09,1.68),'#f2dfba')
    box((0,-1.77,2.21),(.99,.10,.09),'#f2dfba')
    for x in (-1.6,1.55):
        box((x,-1.93,.59),(.63,.44,.40),'#b87550',.04)
        for j in range(3):ico((x+(j-1)*.17,-1.94,.94),(.18,.18,.24),'#6f8e58')

def windmill():
    cone((0,0,1.80),1.59,3.4,'#d4c5a2',top=1.04,n=12)
    cone((0,0,.13),1.75,.26,'#a1a28e',top=1.75,n=12)
    cone((0,0,3.92),1.46,1.12,'#697c83',n=12)
    for z in (.48,1.18,1.89,2.59,3.29):
        r=1.59-(z-.1)/3.4*.55
        for i in range(12):
            t=(i+(int(z*10)%2)*.5)*2*PI/12
            box((math.cos(t)*r,math.sin(t)*r,z),(.30,.025,.12),'#b9a989',rot=(0,0,t-PI/2))
    box((0,-1.53,.94),(.68,.14,1.5),'#715744',.05)
    for x,z in [(-.48,2.37),(.5,2.99)]:
        box((x,-1.27,z),(.43,.15,.59),'#6c7c7b',.04)
        box((x,-1.36,z),(.035,.04,.53),'#e4c486')
    base=len(parts)
    hub=(0,-1.55,2.7)
    ico(hub,(.21,.20,.21),'#88623d',2)
    for i in range(4):
        t=i*PI/2+.28
        dx,dz=math.sin(t),math.cos(t)
        beam((dx*.12,-1.63,2.7+dz*.12),(dx*2.6,-1.63,2.7+dz*2.6),.066,'#72513a')
        for j in range(5):
            r=.8+j*.37
            # Paddle slats fan out perpendicular to the rotating mast.
            box((dx*r+dz*.22,-1.67,2.7+dz*r-dx*.22),(.56,.055,.24),'#d9c69a',.01,rot=(0,t,0))
    rotor=join(parts[base:],'Rotor',hub)
    animate(rotor,'Turn',[(1,(0,0,0)),(121,(0,2*PI,0))],linear_keys=True)
    return rotor

def ginkgo():
    beam((0,0,0),(.13,0,2.7),.14,'#8b7251')
    for i in range(7):
        t=i*2.4;r=.65+(i%2)*.22;z=1.3+i*.19
        tip=(math.cos(t)*r,math.sin(t)*r,z+.56)
        beam((.06,0,z),tip,.06,'#8b7251',6)
        for j in range(9):
            a=j*2.4+i;rj=.20+(j%3)*.12
            p=(tip[0]+math.cos(a)*rj,tip[1]+math.sin(a)*rj,tip[2]+(j%3)*.17)
            # Fan-shaped individual leaf clusters, no alpha planes or overdraw.
            verts=[p]+[(p[0]+.42*math.cos(a+k*.30),p[1]+.42*math.sin(a+k*.30),p[2]+.08*math.sin(k*.7)) for k in range(7)]
            mesh('Golden fan leaves',verts,[(0,k,k+1) for k in range(1,7)],['#d7b94f','#e6cc6c','#bca34c'][j%3])
    ico((.05,0,3.08),(.54,.55,.49),'#d2b851',2)
    for i in range(7):
        t=i*2.4;ico((math.cos(t)*.5,math.sin(t)*.5,.045),(.10,.08,.024),'#d3b555')

def basalt():
    for i,(x,y,h,r) in enumerate([(-.49,.1,2.4,.38),(.1,.2,3.0,.41),(.61,.25,1.96,.34),(-.76,-.39,1.18,.32),(-.11,-.43,1.53,.4),(.52,-.43,.91,.35)]):
        cone((x,y,h/2),r,h,['#657775','#728480','#82928a'][i%3],top=r*.9,n=6)
        cone((x,y,h+.025),r*.92,.055,'#a2ad88',top=r*.92,n=6)
        for z in [h*.28,h*.62]:cone((x,y,z),r*1.004,.018,'#4f6565',top=r*1.004,n=6)
    for i in range(6):
        t=i*2.4;ico((math.cos(t)*.8,math.sin(t)*.7,.13),(.3,.24,.21),'#7e9270')

def karst():
    # An open limestone arch, deliberately different from a painted rock mound.
    for side in (-1,1):
        for j in range(3):
            ico((side*(.72+.08*j),.06*side,.40+j*.63),(.48-j*.05,.48,.54),['#acae99','#babaa2','#d1cdb1'][j],2)
    for i in range(7):
        t=i*PI/6;ico((math.cos(t)*.80,0,1.55+math.sin(t)*.63),(.34,.43,.32),'#c7c5ad',2)
    for x,y in [(-.82,-.34),(.9,.17),(-.2,.22)]:ico((x,y,.1),(.4,.30,.13),'#85956c')
    for i in range(4):
        x=-.8+i*.48;ico((x,.15,2.02+math.sin(i*.8)*.23),(.24,.3,.10),'#8d9c6e')

def animate(obj,name,frames,linear_keys=False):
    obj.rotation_mode='XYZ'
    for frame,rotation in frames:
        obj.rotation_euler=rotation;obj.keyframe_insert(data_path='rotation_euler',frame=frame)
    action=obj.animation_data.action;action.name=name+'_'+obj.name
    if linear_keys:
        for fc in action.fcurves:
            for k in fc.keyframe_points:k.interpolation='LINEAR'
    track=obj.animation_data.nla_tracks.new();track.name=name
    track.strips.new(name,int(action.frame_range[0]),action)
    obj.animation_data.action=None
    obj.rotation_euler=(0,0,0)

def animal(panda=False):
    red='#ae5b35' if panda else '#c8753e';dark='#4e4140';cream='#eed8b0'
    ico((0,0,.56),(.32 if panda else .24,.41 if panda else .47,.30 if panda else .24),red,2,'Torso')
    if panda:ico((0,-.1,.46),(.24,.30,.18),dark,2,'Black belly')
    base=len(parts)
    ico((0,-.42,.72),(.30 if panda else .20,.23,.24 if panda else .19),red,2,'Head')
    ico((0,-.57,.66),(.20 if panda else .125,.14 if panda else .23,.11),cream,2,'Muzzle')
    ico((0,-(.70 if panda else .79),.69),(.065,.045,.041),dark,1,'Nose')
    for side in (-1,1):
        x=side*.17
        if panda:
            ico((side*.23,-.36,.93),(.105,.075,.13),cream,2,'Rounded ear')
            ico((side*.23,-.42,.93),(.065,.025,.083),red,1,'Ear inner')
        else:
            cone((x,-.38,1.0),.12,.31,red,top=.008,n=4,name='Pointed ear')
            cone((x,-.405,1.00),.075,.21,cream,top=.005,n=4,name='Ear inner')
        if panda:
            ico((side*.18,-.58,.77),(.105,.055,.09),cream,2,'White cheek')
            ico((side*.108,-.63,.76),(.058,.027,.064),dark,1,'Eye patch')
        ico((side*.115,-.642,.79),(.028,.017,.03),'#262c2a',2,'Eye')
        ico((side*.111,-.658,.8),(.008,.009,.009),'#f8ecd0',1,'Catchlight')
    head=join(parts[base:],'Head',(0,-.30,.66))
    for name,frames in [('Walk',[(1,(.035,0,-.025)),(7,(-.035,0,.025)),(13,(.035,0,-.025)),(19,(-.035,0,.025)),(25,(.035,0,-.025))]),('Idle',[(1,(0,0,0)),(31,(.05,0,.13)),(61,(0,0,0)),(91,(-.04,0,-.11)),(121,(0,0,0))])]:animate(head,name,frames)
    for side in (-1,1):
        for front in (-1,1):
            base=len(parts);x=side*.19;y=front*.28
            ico((x,y,.32),(.085,.11,.25),dark if panda else red,1,'Leg')
            ico((x,y-.04,.10),(.085,.13,.08),dark,1,'Paw')
            limb=join(parts[base:],('Fore' if front<0 else 'Hind')+('L' if side<0 else 'R'),(x,y,.49))
            phase=side*front
            animate(limb,'Walk',[(1,(phase*.43,0,0)),(7,(0,0,0)),(13,(-phase*.43,0,0)),(19,(0,0,0)),(25,(phase*.43,0,0))])
            animate(limb,'Idle',[(1,(0,0,0)),(121,(0,0,0))])
    base=len(parts)
    for i in range(6):
        y=.39+i*.105;z=.49-i*.045
        shade=('#d3a06a' if i%2 else red) if panda else (cream if i>3 else red)
        ico((.055*math.sin(i*.45),y,z),(.18-i*.008 if panda else .155-i*.012,.13,.17-i*.01 if panda else .15-i*.014),shade,2,'Tail ring')
    tail=join(parts[base:],'Tail',(0,.33,.48))
    animate(tail,'Walk',[(1,(0,0,-.16)),(13,(0,0,.16)),(25,(0,0,-.16))])
    animate(tail,'Idle',[(1,(0,0,-.08)),(61,(0,0,.08)),(121,(0,0,-.08))])
    # Join only untouched static torso parts; six animated rigid nodes stay separate.
    static=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.animation_data]
    join(static,'Body')

def render_preview(id):
    scene=bpy.context.scene
    scene.frame_set(1)
    scene.render.engine='CYCLES';scene.cycles.samples=12
    scene.render.resolution_x=320;scene.render.resolution_y=260;scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.world.color=(.7,.7,.7)
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.78,.74,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    meshes=[o for o in scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(low+high)/2
    bpy.ops.object.camera_add(location=center+Vector((7,-10,7)))
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=max((high-low).length*.93,1.3);scene.camera=camera
    bpy.ops.object.light_add(type='AREA',location=center+Vector((-3,-4,8)))
    light=bpy.context.object;light.data.energy=480;light.data.shape='DISK';light.data.size=6
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=str(OUT/(id+'.png'));bpy.ops.render.render(write_still=True)

def export(id,build,width,depth,category):
    reset();build();bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    animated=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.animation_data]
    static=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.animation_data]
    if static:join(static,'SculptedModel')
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:
        bpy.context.view_layer.objects.active=o
        mod=o.modifiers.new('Stable triangulation','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
    triangles=sum(len(o.data.polygons) for o in meshes)
    path=OUT/(id+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=bool(animated),export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_materials='EXPORT',export_yup=True,export_cameras=False,export_lights=False)
    assets.append(dict(id=id,width=width,depth=depth,category=category,triangles=triangles,meshes=len(meshes),bytes=path.stat().st_size))
    render_preview(id)
    print('ASSET_READY '+json.dumps(assets[-1]),flush=True)

export('pack-pavilion',pavilion,4.8,4.8,'house')
export('pack-windmill',windmill,5.4,3.7,'house')
export('pack-greenhouse',greenhouse,4.7,4.2,'house')
export('pack-fox',lambda:animal(False),.82,.82,'animal')
export('pack-red-panda',lambda:animal(True),.82,.82,'animal')
export('pack-ginkgo',ginkgo,1.7,1.7,'plant')
export('pack-basalt',basalt,2.1,1.9,'decor')
export('pack-karst',karst,2.6,1.4,'decor')
(OUT/'manifest.json').write_text(json.dumps({'generator':'Blender 4.5 · original procedural sculptures','license':'Original project assets','assets':assets},ensure_ascii=False,indent=2))
print('PACK_COMPLETE',flush=True)
