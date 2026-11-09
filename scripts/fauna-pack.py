"""Original species sculptures and rigid-part locomotion. Background Blender only."""
import bpy, math, json, importlib.util
from pathlib import Path
from mathutils import Vector
spec=importlib.util.spec_from_file_location('kit',Path(__file__).with_name('model-pack.py'))
k=importlib.util.module_from_spec(spec);spec.loader.exec_module(k)
PI=math.pi
DARK='#353c37';CREAM='#e9dac0'

def ic(p,s,c,lev=1,name='Detail'):return k.ico(p,s,c,lev,name)
def node(start,name,pivot):
    obj=k.join(k.parts[start:],name,pivot)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return obj
def anim(o,clip,frames):k.animate(o,clip,frames)
def idle(o,pitch=.10,yaw=.20,graze=False):
    frames=[(1,(0,0,0)),(25,(pitch*.2,0,yaw)),(45,(0,0,0)),(70,((.7 if graze else pitch),0,-yaw*.35)),(100,((.7 if graze else -pitch*.3),0,0)),(121,(0,0,0))]
    anim(o,'Idle',frames)
def headMotion(o,graze=False,sniff=False):
    anim(o,'Walk',[(1,(.035,0,-.025)),(7,(-.035,0,.025)),(13,(.035,0,-.025)),(19,(-.035,0,.025)),(25,(.035,0,-.025))]);idle(o,.17 if sniff else .07,.17,graze)
def eyes(y,z,x=.13):
    for side in [-1,1]:
        ic((side*x,y,z),(.026,.021,.026),DARK,2,'Eye')
        ic((side*x-.004,y-.016,z+.008),(.008,.008,.008),'#f9efd5',1,'Eye glint')
def tailMotion(o,extent=.13):
    anim(o,'Walk',[(1,(0,0,-extent)),(13,(0,0,extent)),(25,(0,0,-extent))]);idle(o,.04,extent*.55)
def leg(x,y,h,c,name,phase=0,thick=.065,hoof=True,hop=False,slow=False):
    start=len(k.parts)
    k.beam((x,y,h),(x,y+.025,h*.50),thick,c,6)
    k.beam((x,y+.025,h*.50),(x,y-.035,.09),thick*.70,c,6)
    ic((x,y-.07,.075),(thick*1.15,thick*1.8,.073),DARK if hoof else c,1,'Hoof' if hoof else 'Paw')
    limb=node(start,name,(x,y,h))
    if hop:
        frames=[(1,(-.32,0,0)),(7,(.51,0,0)),(13,(.1,0,0)),(19,(-.32,0,0)),(25,(-.32,0,0))]
    else:
        frames=[]
        for f in [1,7,13,19,25]:frames.append((f,(math.sin((f-1)/24*2*PI+phase)*(.26 if slow else .42),0,0)))
    anim(limb,'Walk',frames);anim(limb,'Idle',[(1,(0,0,0)),(121,(0,0,0))])
    return limb

def finishBody(hop=False,heavy=False):
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.animation_data]
    body=k.join(meshes,'Body')
    if hop:
        root=bpy.data.objects.new('HopRoot',None);bpy.context.collection.objects.link(root)
        for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:o.parent=root
        for f,z in [(1,0),(5,.035),(9,.14),(13,.22),(17,.12),(21,.015),(25,0)]:root.location.z=z;root.keyframe_insert(data_path='location',frame=f)
        action=root.animation_data.action;action.name='Walk_HopRoot';track=root.animation_data.nla_tracks.new();track.name='Walk';track.strips.new('Walk',1,action);root.animation_data.action=None
        for f in [1,121]:root.location.z=0;root.keyframe_insert(data_path='location',frame=f)
        action=root.animation_data.action;action.name='Idle_HopRoot';track=root.animation_data.nla_tracks.new();track.name='Idle';track.strips.new('Idle',1,action);root.animation_data.action=None
    elif heavy:
        anim(body,'Walk',[(1,(0,-.025,0)),(7,(0,.025,0)),(13,(0,-.025,0)),(19,(0,.025,0)),(25,(0,-.025,0))]);idle(body,.01,.01)


def deer(elk=False):
    c='#8d6044' if elk else '#b38254';pale='#d9b98a';h=.93 if elk else .72
    ic((0,.04,h+.16),(.29 if elk else .23,.58 if elk else .46,.30 if elk else .23),c,2,'Deep chest')
    ic((0,.46 if elk else .37,h+.17),(.22,.17,.22),pale,2,'Rump patch')
    start=len(k.parts)
    k.beam((0,-.33,h+.13),(0,-.52,h+.57),.13 if elk else .105,c,8)
    if elk:ic((0,-.43,h+.29),(.19,.17,.28),'#685044',2,'Neck mane')
    ic((0,-.57,h+.62),(.16,.25,.17),c,2,'Deer head')
    ic((0,-.76,h+.55),(.105,.17,.09),pale,2,'Tapered muzzle');ic((0,-.88,h+.57),(.075,.045,.049),DARK,1,'Nose')
    for side in [-1,1]:
        ear=ic((side*.22,-.48,h+.77),(.18,.078,.068),c,2,'Leaf ear');ear.rotation_euler.y=side*.38
        ic((side*.235,-.50,h+.79),(.12,.047,.032),pale,1,'Inner ear')
        points=[(side*.08,-.51,h+.77),(side*.13,-.40,h+1.01),(side*.23,-.33,h+1.25),(side*.37,-.25,h+(1.49 if elk else 1.34))]
        for a,b in zip(points,points[1:]):k.beam(a,b,.027 if elk else .020,'#c7ab7c',6)
        for j in range(1,4 if elk else 3):
            a=points[min(j,2)];k.beam(a,(a[0]+side*.08,a[1]-.17,a[2]+.17),.020,'#c7ab7c',5)
    eyes(-.687,h+.655,.14)
    head=node(start,'Head',(0,-.32,h+.17));headMotion(head,True)
    start=len(k.parts);ic((0,.60 if elk else .49,h+.19),(.075,.15,.07),pale,1,'Short tail');tailMotion(node(start,'Tail',(0,.47,h+.18)),.18)
    for i,(side,fore) in enumerate([(-1,-1),(1,-1),(-1,1),(1,1)]):
        leg(side*.17,fore*(.38 if elk else .30),h,c,('Fore' if fore<0 else 'Hind')+('L' if side<0 else 'R'),[0,PI,PI*.5,PI*1.5][i],.055 if elk else .043)
    finishBody()

def rabbit(squirrel=False):
    c='#a86d3b' if squirrel else '#b19980';pale='#e3caa7'
    ic((0,.04,.31),(.19,.27,.23),c,2,'Round haunches');ic((0,-.12,.37),(.14,.19,.19),pale,2,'Chest')
    start=len(k.parts)
    ic((0,-.28,.48),(.15,.16,.15),c,2,'Head');ic((0,-.405,.44),(.092,.09,.07),pale,2,'Muzzle')
    for side in [-1,1]:
        ear=ic((side*.086,-.24,.70 if not squirrel else .64),(.055,.063,.23 if not squirrel else .12),c,2,'Ear');ear.rotation_euler.x=-.15
        ic((side*.086,-.28,.72 if not squirrel else .65),(.028,.025,.15 if not squirrel else .07),'#d2a18d',1,'Ear lining')
    eyes(-.387,.515,.12);ic((0,-.479,.46),(.023,.023,.018),'#806357',1,'Nose')
    head=node(start,'Head',(0,-.15,.38));headMotion(head,False,True)
    start=len(k.parts)
    if squirrel:
        for i in range(5):ic((.04*math.sin(i),.24+i*.055,.33+i*.13),(.16-i*.012,.18,.22),'#9d6235' if i%2 else '#b78046',2,'Plume')
        tailMotion(node(start,'Tail',(0,.19,.28)),.17)
    else:ic((0,.31,.34),(.10,.10,.095),pale,2,'Cotton tail')
    for side in [-1,1]:
        leg(side*.105,-.15,.29,c,'Fore'+('L' if side<0 else 'R'),thick=.035,hoof=False,hop=True)
        start=len(k.parts);ic((side*.14,.13,.20),(.095,.14,.14),c,2,'Haunch');ic((side*.14,.05,.055),(.065,.18,.052),pale,1,'Long hind foot')
        limb=node(start,'Hind'+('L' if side<0 else 'R'),(side*.14,.16,.27));anim(limb,'Walk',[(1,(.25,0,0)),(7,(-.55,0,0)),(13,(-.35,0,0)),(19,(.20,0,0)),(25,(.25,0,0))]);anim(limb,'Idle',[(1,(0,0,0)),(121,(0,0,0))])
    finishBody(True)

def fox():k.animal(False)

def stocky(kind):
    colors={'raccoon':('#857f70','#d9d0b9'),'beaver':('#875d3e','#c09a6b'),'badger':('#858579','#e1dbc8'),'bear':('#79533d','#b79064'),'capybara':('#a58050','#c9ad79')}
    c,pale=colors[kind];bear=kind=='bear';cap=kind=='capybara';beaver=kind=='beaver';raccoon=kind=='raccoon'
    h=.52 if bear else .32;length=.56 if bear else .42;width=.35 if bear else .27
    ic((0,.03,h+.15),(width,length,.32 if bear else .25),c,2,'Barrel torso')
    if bear:ic((0,-.28,h+.29),(.34,.26,.31),'#73503b',2,'Shoulder hump')
    start=len(k.parts)
    if cap:
        k.box((0,-.44,h+.13),(.38,.44,.32),c,.055,'Blunt head');ic((0,-.66,h+.11),(.20,.12,.11),pale,2,'Broad muzzle')
    else:
        ic((0,-.43,h+.23),(.27 if bear else .22,.25,.23 if bear else .17),c,2,'Head')
        ic((0,-.65,h+.15),(.18 if bear else .12,.19 if bear else .17,.12 if bear else .09),pale,2,'Muzzle')
    for side in [-1,1]:
        ic((side*(.20 if bear else .15),-.36,h+.42),(.10 if bear else .065,.055,.095),c,2,'Round ear')
        ic((side*(.20 if bear else .15),-.40,h+.43),(.055,.025,.047),pale,1,'Ear center')
        if raccoon:ic((side*.125,-.615,h+.27),(.095,.035,.055),DARK,2,'Eye mask')
        if kind=='badger':
            stripe=ic((side*.105,-.50,h+.32),(.065,.24,.075),'#41463e',2,'Facial stripe');stripe.rotation_euler.y=side*.18
    eyes(-.638 if not cap else -.64,h+.285,.145 if bear else .13)
    ic((0,-.785 if not cap else -.744,h+.17),(.075 if bear else .055,.04,.04),DARK,1,'Nose')
    if beaver:
        for x in [-.025,.025]:k.box((x,-.795,h+.06),(.04,.026,.07),'#e9d5a1',.005,'Incisor')
    head=node(start,'Head',(0,-.26,h+.16));headMotion(head,False,True)
    start=len(k.parts)
    if beaver:
        tail=ic((0,.65,.13),(.20,.37,.055),'#564638',2,'Paddle tail');
        for i in range(4):k.beam((-.12,.45+i*.10,.181),(.12,.45+i*.10,.181),.009,'#8e7251',5)
        tailMotion(node(start,'Tail',(0,.37,.20)),.08)
    elif raccoon:
        for i in range(6):ic((0,.43+i*.08,.25-i*.023),(.105,.10,.10),DARK if i%2 else '#b4aa90',2,'Ringed tail')
        tailMotion(node(start,'Tail',(0,.36,.29)),.14)
    elif not cap:ic((0,length+.04,h+.1),(.08,.09,.08),c,1,'Stub tail')
    for i,(side,fore) in enumerate([(-1,-1),(1,-1),(-1,1),(1,1)]):leg(side*(.24 if bear else .18),fore*.30,h,c,('Fore' if fore<0 else 'Hind')+('L' if side<0 else 'R'),[0,PI,PI*.6,PI*1.6][i],.10 if bear else .065,False,False,bear)
    finishBody(heavy=bear)

def hedgehog():
    c='#9c7b59';ic((0,.06,.23),(.25,.33,.22),'#715d43',2,'Spined dome')
    for j in range(4):
        theta=(j+.5)/4*PI/2
        for i in range(11):
            a=i*2.4+j*.7; x=math.sin(theta)*math.cos(a)*.25;y=.06+math.sin(theta)*math.sin(a)*.32;z=.23+math.cos(theta)*.20
            spike=k.cone((x,y,z+.055),.043,.16,['#b79a6c','#d3b98b','#836c4b'][i%3],0,5,'Spine');spike.rotation_euler=(math.sin(a)*theta*.65,math.cos(a)*theta*.65,0)
    start=len(k.parts);ic((0,-.29,.20),(.14,.18,.12),c,2,'Wedge face');ic((0,-.46,.17),(.055,.06,.045),DARK,1,'Snout');eyes(-.386,.26,.097)
    for side in [-1,1]:ic((side*.12,-.22,.30),(.06,.035,.06),c,2,'Ear')
    head=node(start,'Head',(0,-.15,.18));headMotion(head,False,True)
    for i,(side,fore) in enumerate([(-1,-1),(1,-1),(-1,1),(1,1)]):leg(side*.15,fore*.16,.13,c,('Fore' if fore<0 else 'Hind')+('L' if side<0 else 'R'),[0,PI,PI,0][i],.026,False,False,True)
    finishBody()

def farm(goat=False):
    c='#b29875' if goat else '#dfd4b9';dark='#6e5947';h=.58
    ic((0,0,h+.12),(.28,.43,.26),c,2,'Body')
    if not goat:
        for i in range(18):
            a=i*2.4;y=-.29+(i%6)*.12;ic((math.cos(a)*.20,y,h+.17+math.sin(a)*.15),(.14,.14,.13),['#e0d4b8','#e9dfc6','#cbbc9e'][i%3],1,'Wool curl')
    start=len(k.parts)
    k.beam((0,-.28,h+.10),(0,-.39,h+.36),.12,c,8)
    ic((0,-.45,h+.39),(.145,.22,.17),c if goat else dark,2,'Long head');ic((0,-.64,h+.32),(.10,.12,.07),'#d2bc96',2,'Muzzle')
    for side in [-1,1]:
        ic((side*.19,-.38,h+.43),(.13,.065,.055),c,2,'Lateral ear')
        if goat:
            points=[(side*.09,-.37,h+.53),(side*.13,-.29,h+.78),(side*.12,-.13,h+.83)]
            for j in range(2):k.beam(points[j],points[j+1],.034-j*.01,'#75634c',6)
    if goat:
        beard=k.cone((0,-.49,h+.14),.075,.22,dark,0,5,'Beard');beard.rotation_euler.x=PI
    eyes(-.573,h+.43,.123)
    head=node(start,'Head',(0,-.24,h+.22));headMotion(head,True)
    start=len(k.parts);ic((0,.46,h+.19),(.06,.14,.075),c,1,'Tail');tailMotion(node(start,'Tail',(0,.37,h+.18)),.21)
    for i,(side,fore) in enumerate([(-1,-1),(1,-1),(-1,1),(1,1)]):leg(side*.18,fore*.29,h,c,('Fore' if fore<0 else 'Hind')+('L' if side<0 else 'R'),[0,PI,PI*.7,PI*1.7][i],.046)
    finishBody()

def duck():
    ic((0,.04,.18),(.23,.36,.19),'#a89a80',2,'Floating hull');ic((0,.17,.25),(.20,.23,.13),'#7e7d67',2,'Folded wings')
    for side in [-1,1]:ic((side*.18,.05,.25),(.038,.17,.057),'#526d8d',1,'Blue speculum')
    ic((0,.37,.24),(.13,.16,.055),'#4e5243',1,'Tail')
    start=len(k.parts);k.beam((0,-.15,.22),(0,-.23,.41),.08,'#44725a',8);ic((0,-.26,.45),(.12,.13,.12),'#3f795b',2,'Green head');k.cone((0,-.20,.32),.084,.038,CREAM,.084,10,'White collar');ic((0,-.41,.415),(.09,.12,.027),'#d5ac50',2,'Flat bill');eyes(-.34,.485,.095)
    head=node(start,'Head',(0,-.16,.26));headMotion(head)
    for side in [-1,1]:
        start=len(k.parts);ic((side*.14,.04,-.005),(.08,.13,.022),'#c98b42',1,'Webbed paddle');legnode=node(start,'PaddleL' if side<0 else 'PaddleR',(side*.14,.03,.09))
        anim(legnode,'Walk',[(1,(side*.5,0,0)),(13,(-side*.5,0,0)),(25,(side*.5,0,0))]);anim(legnode,'Idle',[(1,(0,0,0)),(121,(0,0,0))])
    finishBody()

def heron():
    ic((0,.03,.92),(.17,.33,.22),'#7c9197',2,'Folded wings');ic((0,-.03,.84),(.11,.21,.17),'#bac6bc',2,'Belly');ic((0,.34,.89),(.09,.18,.06),'#4e6269',1,'Tail feathers')
    start=len(k.parts)
    for a,b,r in [((0,-.20,.97),(0,-.34,1.25),.075),((0,-.34,1.25),(0,-.24,1.49),.065),((0,-.24,1.49),(0,-.38,1.66),.055)]:k.beam(a,b,r,'#b6c4bc',8)
    ic((0,-.42,1.67),(.105,.17,.09),'#c5d0c6',2,'Head');k.beam((0,-.54,1.65),(0,-.90,1.62),.035,'#d3b66e',6)
    for side in [-1,1]:
        ic((side*.075,-.45,1.704),(.023,.025,.024),'#d7bd6c',2,'Golden eye');ic((side*.091,-.463,1.705),(.011,.013,.015),DARK,1,'Pupil')
        k.beam((side*.05,-.28,1.70),(side*.08,-.02,1.61),.015,'#394d52',5)
    head=node(start,'Head',(0,-.20,.96));anim(head,'Walk',[(1,(.04,0,0)),(13,(-.04,0,0)),(25,(.04,0,0))]);idle(head,.08,.19)
    for side in [-1,1]:
        start=len(k.parts);x=side*.085
        k.beam((x,0,.85),(x,.05,.43),.027,'#81734f',6);k.beam((x,.05,.43),(x,-.04,.075),.023,'#91815a',6)
        for toe in [-1,0,1]:k.beam((x,-.04,.055),(x+toe*.07,-.19,.025),.012,'#91815a',5)
        limb=node(start,'LegL' if side<0 else 'LegR',(x,0,.85));anim(limb,'Walk',[(1,(side*.24,0,0)),(7,(0,0,0)),(13,(-side*.24,0,0)),(19,(0,0,0)),(25,(side*.24,0,0))]);anim(limb,'Idle',[(1,(0,0,0)),(121,(0,0,0))])
    finishBody()

def tortoise():
    ic((0,.04,.23),(.33,.43,.24),'#756c46',2,'Domed shell')
    for j in range(3):
        for i in range(3):
            x=(i-1)*.17;y=(j-1)*.20+.04;z=.28+.17*(1-(x/.4)**2-(y/.6)**2)
            scute=k.cone((x,y,z),.13,.045,['#a49258','#90804d','#b0a068'][(i+j)%3],.115,6,'Hexagonal scute');scute.rotation_euler=(y*.5,-x*.7,0)
    k.cone((0,.04,.13),.34,.06,'#c1ad73',.34,12,'Shell rim').scale.y=1.24
    start=len(k.parts);k.beam((0,-.25,.18),(0,-.48,.17),.07,'#999565',8);ic((0,-.52,.18),(.10,.13,.075),'#b0ad78',2,'Tortoise head');eyes(-.59,.21,.073)
    head=node(start,'Head',(0,-.25,.17));headMotion(head,False,True)
    for i,(side,fore) in enumerate([(-1,-1),(1,-1),(-1,1),(1,1)]):
        start=len(k.parts);x=side*.27;y=fore*.23
        ic((x,y,.11),(.12,.115,.095),'#979266',2,'Scaly leg');ic((x+side*.065,y-.055,.055),(.095,.10,.05),'#b1a879',1,'Broad foot')
        limb=node(start,('Fore' if fore<0 else 'Hind')+('L' if side<0 else 'R'),(side*.20,y,.15));anim(limb,'Walk',[(1,(0,0,side*fore*.22)),(13,(0,0,-side*fore*.22)),(25,(0,0,side*fore*.22))]);anim(limb,'Idle',[(1,(0,0,0)),(121,(0,0,0))])
    finishBody()

SPECS=[
 ('deer',.8,lambda:deer(False),.92,.60,1.1,2.3,5,'walk'),('elk',1.07,lambda:deer(True),1.15,.52,.95,3,6,'walk'),
 ('rabbit',.56,lambda:rabbit(False),.57,.62,1.9,1.3,3,'hop'),('fox',.82,fox,.73,.71,1.7,1.5,4,'walk'),
 ('raccoon',.68,lambda:stocky('raccoon'),.58,.39,1.4,2,5,'walk'),('squirrel',.49,lambda:rabbit(True),.51,.85,2.2,.8,2.3,'hop'),
 ('beaver',.72,lambda:stocky('beaver'),.55,.32,1.0,2,5,'walk'),('hedgehog',.50,hedgehog,.28,.22,1.6,2,5,'walk'),
 ('badger',.75,lambda:stocky('badger'),.52,.38,1.2,2.5,6,'walk'),('bear',1.23,lambda:stocky('bear'),.92,.32,.8,3,7,'walk'),
 ('sheep',.88,lambda:farm(False),.65,.39,1.1,3,6,'walk'),('goat',.87,lambda:farm(True),.70,.50,1.5,2,5,'walk'),
 ('mallard',.55,duck,.46,.38,1.7,1.5,3,'swim'),('heron',.72,heron,.82,.24,.9,4,8,'walk'),
 ('fauna-tortoise',.7,tortoise,.30,.13,.75,3,8,'crawl'),('fauna-capybara',.92,lambda:stocky('capybara'),.55,.30,.9,4,8,'walk')]

def bounds_sample():
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];animated=[o for o in bpy.context.scene.objects if o.animation_data and o.animation_data.nla_tracks]
    radius=0;height=0;minimum=10
    for clip in ['Walk','Idle']:
        for o in animated:
            for tr in o.animation_data.nla_tracks:tr.mute=tr.name!=clip
        end=25 if clip=='Walk' else 121
        for f in range(1,end+1,3):
            bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
            for o in meshes:
                for v in o.data.vertices:
                    p=o.matrix_world@v.co;radius=max(radius,math.hypot(p.x,p.y));height=max(height,p.z);minimum=min(minimum,p.z)
    for o in animated:
        for tr in o.animation_data.nla_tracks:tr.mute=False
    bpy.context.scene.frame_set(1)
    return round(radius+.025,3),round(height,3),round(minimum,3)

metadata={};manifest=[]
for type,width,build,stride,speed,turn,restMin,restMax,movement in SPECS:
    asset=type if type.startswith('fauna-') else 'fauna-'+type
    def wrapped(build=build):
        build()
        r,h,minimum=bounds_sample();wrapped.bounds=(r,h,minimum)
    k.export(asset,wrapped,width,width,'animal')
    r,h,minimum=wrapped.bounds
    meta=dict(asset=asset,width=width,depth=width,animal=True,stride=stride,speed=speed,turnRate=turn,restMin=restMin,restMax=restMax,radius=r,maxHeight=h,movement=movement)
    metadata[type]=meta
    manifest.append({**k.assets[-1],**meta,'type':type,'minimumAnimatedY':minimum})
    print('FAUNA_READY '+type+' radius='+str(r),flush=True)

root=Path(__file__).resolve().parents[1]
(root/'public/models/fauna-manifest.json').write_text(json.dumps({'generator':'Blender original rigid animation','assets':manifest},ensure_ascii=False,indent=2))
new=[['fauna-tortoise','苔背陆龟','雕刻精选 · 陆生爬行动物','#90804d','#b1a879',.7,.7,'hedgehog','拱起的甲壳由多块盾片组成。陆龟缓慢交替迈步，停下时轻轻探头。'],['fauna-capybara','水岸水豚','雕刻精选 · 湿地哺乳动物','#a58050','#c9ad79',.92,.92,'beaver','钝圆的口鼻、小耳朵与桶形身体是水豚的特征。它在岸边慢行，歇息时抬头张望。']]
(root/'src/fauna-pack-data.js').write_text('export const faunaModels = '+json.dumps(metadata,ensure_ascii=False,indent=2)+';\nexport const faunaCatalog = '+json.dumps(new,ensure_ascii=False,indent=2)+';\n')
print('FAUNA_COMPLETE',flush=True)
