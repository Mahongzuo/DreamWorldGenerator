import * as T from 'three';
import {randFrom} from './model.js';
import {biomeOf, inFootprint, items} from './sandbox-state.js';
import {makeWander, wander} from './navigation.js';
import {architectureHeight} from './asset-models.js';

const twoPi=Math.PI*2;
const wingGeometry=(side)=>{
  const x=side;
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([
    0,0,.12, x*.34,.023,.11, x*.78,.014,-.19,
    0,0,.12, x*.78,.014,-.19, x*.34,-.033,-.24,
    0,0,.12, x*.34,-.033,-.24, 0,0,-.11
  ],3));
  g.computeVertexNormals();
  return g;
};
const butterflyGeometry=(side)=>{
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([
    0,0,.045,side*.14,0,.105,side*.19,0,.041,
    0,0,.045,side*.19,0,.041,side*.16,0,-.066,
    0,0,.045,side*.16,0,-.066,0,0,-.055
  ],3));
  g.computeVertexNormals();
  return g;
};
function meshOf(geometry,material,max){
  const mesh=new T.InstancedMesh(geometry,material,max);
  mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.count=0;
  return mesh;
}

export function buildEcology(world,field,region,nav) {
  const group=new T.Group();
  const biome=biomeOf(world);
  const random=randFrom(world.seed+'wildlife');
  const color=new T.Color();
  const form=new T.SphereGeometry(1,8,6);
  const matte=new T.MeshStandardMaterial({roughness:.93,flatShading:true,side:T.DoubleSide});
  const cloudMaterial=new T.MeshBasicMaterial({color:'#f8f7e7',transparent:true,opacity:.53,depthWrite:false});
  const shapes={
    body:meshOf(form,matte,154),
    left:meshOf(wingGeometry(-1),matte,9),
    right:meshOf(wingGeometry(1),matte,9),
    butterflyL:meshOf(butterflyGeometry(-1),matte,9),
    butterflyR:meshOf(butterflyGeometry(1),matte,9),
    cloud:meshOf(new T.SphereGeometry(1,11,7),cloudMaterial,24)
  };
  for(const m of Object.values(shapes)) group.add(m);

  const safe=(x,z)=>nav.valid(x,z,.23,'land');
  const targets=[];
  const report=(type,a,x,z)=>targets.push({kind:'animal',type,x,z,agent:a});
  const findDry=(preferFlower=false)=>{
    let first;
    for(let i=0;i<76;i++){
      const x=(random()*2-1)*10.4,z=1.55+random()*6.45;
      if(!safe(x,z)||!safe(x+.67,z)||!safe(x-.67,z)||!safe(x,z+.58)) continue;
      first??={x,z};
      const grass=field.type(1,x,z);
      if(!preferFlower||grass===2||grass===3)return {x,z};
    }
    return first;
  };
  const runners=[];
  const kind=biome==='forest'||biome==='ridge'?'deer':'rabbit';
  for(let i=0;i<(kind==='deer'?3:4);i++){
    const center=findDry(kind==='rabbit');
    if(!center)continue;
    const offset=random()*twoPi;
    const agent=makeWander(nav,center.x,center.z,kind==='deer'?.43:.23,'land',offset,1.85);
    if(agent)runners.push({agent,kind,offset,scale:.85+random()*.27});
  }
  const butterflies=[];
  if(biome==='meadow'||world.strokes.some(s=>['flowers','heather'].includes(s.type))){
    for(let i=0;i<6;i++){
      const center=findDry(true);
      if(!center)continue;
      const phase=random()*twoPi;
      const agent=makeWander(nav,center.x,center.z,.10,'fly',phase,1.35);
      if(agent)butterflies.push({agent,phase,color:['#efca79','#cb9bb4','#e4d39b'][i%3]});
    }
  }
  const streams=world.strokes.filter(s=>items[s.type].category==='water');
  const ducks=[];
  for(let i=0;streams.length&&i<4;i++){
    const stream=streams[i%streams.length];
    const [x,z]=stream.p[Math.floor(stream.p.length*(.18+i*.17))];
    const phase=i*1.84+random()*.7;
    const agent=makeWander(nav,x,z,.16,'water',phase,2.7);
    if(agent)ducks.push({agent,phase});
  }
  const flock=Array.from({length:7},(_,i)=>({a:i*.126+random()*.08,r:6.0+random()*1.9,
    y:5.65+random()*1.4,rate:3.5+random()*1.4,s:.69+random()*.18}));
  const clouds=[
    {x:-12.3,z:-9.45,y:6.2,s:1.08},{x:7.0,z:-10.9,y:7.6,s:1.16},
    {x:-1.9,z:-16.6,y:7.5,s:.76}
  ];
  if(region)clouds.push({x:15.3,z:4,y:9.9,s:1.07});
  const puffs=[[-1.5,.02,0,1.20,.40,.67],[-.55,.24,.1,1.23,.65,.75],[.48,.35,-.07,1.19,.77,.81],[1.28,.12,.12,1.04,.54,.66],[1.97,-.035,.0,.76,.30,.53]];
  const actor=new T.Object3D(), part=new T.Object3D(), matrix=new T.Matrix4();
  function pose(x,y,z,a=0,s=1){
    actor.position.set(x,y,z);actor.rotation.set(0,a,0);actor.scale.setScalar(s);actor.updateMatrix();
  }
  function draw(which,hex,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
    const m=shapes[which],i=m.count++;
    part.position.set(x,y,z);part.rotation.set(rx,ry,rz);part.scale.set(sx,sy,sz);part.updateMatrix();
    m.setMatrixAt(i,matrix.multiplyMatrices(actor.matrix,part.matrix));
    m.setColorAt(i,color.set(hex));
  }
  const body=(...args)=>draw('body',...args);
  function deer(time,phase){
    const tan='#a97850',light='#c49a68',hoof='#664c39';
    const stride=Math.sin(time*3.2+phase), head=.07*Math.sin(time*1.6+phase);
    body(tan,0,.63,0,.23,.27,.47);
    body(light,0,.73,.24,.165,.28,.20,.16);
    body(tan,0,.97+head,.38,.125,.15,.215,-.25);
    body('#d3b189',0,.928+head,.52,.098,.09,.113);
    body('#524639',0,.955+head,.605,.06,.055,.045);
    for(const x of [-1,1]){
      body(tan,x*.114,1.07+head,.33,.052,.104,.058,0,0,-x*.47);
      body('#53483b',x*.105,.99+head,.453,.021,.026,.023);
      body(hoof,x*.075,1.16+head,.28,.021,.11,.022,-.22,0,-x*.31);
      body(hoof,x*.095,1.21+head,.325,.018,.083,.019,.58);
      for(const z of [-1,1]){
        const lift=Math.max(0,stride*x*z)*.058;
        body(tan,x*.141,.29+lift,z*.278,.059,.30,.061,stride*x*z*.18);
        body(hoof,x*.141,.065+lift,z*.30,.059,.063,.07);
      }
    }
    body('#e3c69b',0,.72,-.431,.086,.115,.082,-.52);
  }
  function rabbit(time,phase){
    const pulse=Math.max(0,Math.sin(time*2.7+phase))*.088;
    body('#a88d72',0,.174+pulse,0,.162,.147,.226);
    body('#b99d83',0,.226+pulse,.177,.114,.123,.128);
    body('#e1d1ae',0,.18+pulse,-.213,.078,.074,.069);
    for(const side of [-1,1]){
      body('#ad927b',side*.053,.367+pulse,.148,.038,.117,.040,-.19,0,-side*.15);
      body('#d6a29b',side*.053,.372+pulse,.175,.021,.079,.019,-.19,0,-side*.15);
      body('#594c40',side*.085,.246+pulse,.251,.019,.023,.017);
    }
  }
  function step(time,light='day',dt=0){
    targets.length=0;
    for(const m of Object.values(shapes)) m.count=0;
    for(const o of runners){
      const {agent:a}=o;
      wander(nav,a,dt,o.kind==='deer'?.49:.39);
      pose(a.x,nav.height(a.x,a.z),a.z,a.heading,o.scale);
      if(o.kind==='deer')deer(a.rest>0?0:time,o.offset);
      else rabbit(a.rest>0?0:time,o.offset);
      report(o.kind,a,a.x,a.z);
    }
    for(const o of ducks){
      const a=o.agent;
      wander(nav,a,dt,.38);
      pose(a.x,field.level+.065+.025*Math.sin(time*2.4+o.phase),a.z,a.heading);
      body('#c6b39a',0,.014,0,.135,.101,.20);
      body('#7e8262',0,.086,.125,.071,.089,.08);
      body('#497b64',0,.151,.144,.082,.074,.086);
      body('#e5aa50',0,.127,.233,.049,.026,.073);
      body('#f6e3bc',0,.081,.15,.076,.027,.065);
      report('mallard',a,a.x,a.z);
    }
    for(const o of butterflies){
      const a=o.agent;
      wander(nav,a,dt,.57);
      const flap=Math.sin(time*11+o.phase)*.90;
      pose(a.x,field.height(a.x,a.z)+.44+.16*Math.sin(time*1.86+o.phase),a.z,a.heading,.98);
      draw('butterflyL',o.color,0,0,0,1,1,1,0,0,flap);
      draw('butterflyR',o.color,0,0,0,1,1,1,0,0,-flap);
      report('butterfly',a,a.x,a.z);
    }
    for(const bird of flock){
      const angle=time*.165+bird.a+1.8;
      const x=Math.cos(angle)*bird.r,z=Math.sin(angle)*bird.r*.79-4.55;
      const base=field.height(x,z);
      const roof=world.objects.reduce((height,o)=>items[o.type].category==='house'&&inFootprint(x,z,o,1.05)
        ? Math.max(height,architectureHeight(items[o.type].form,o.w)+(o.type==='tower'?3:0)) : height,0);
      const y=Math.max(bird.y+.32*Math.sin(angle*2+bird.a),roof+.45)+Math.max(0,base);
      const heading=Math.atan2(-Math.sin(angle),Math.cos(angle)*.79);
      const flap=Math.sin(time*bird.rate+bird.a*8)*.46;
      pose(x,y,z,heading,bird.s);
      const plumage=biome==='wetland'?'#e2e5cc':'#53615d';
      body(plumage,0,0,0,.105,.077,.228);
      body('#eee3bb',0,-.019,.146,.070,.053,.091);
      draw('left',plumage,-.035,.015,0,1,1,1,0,0,flap);
      draw('right',plumage,.035,.015,0,1,1,1,0,0,-flap);
    }
    for(const [i,o] of clouds.entries()){
      const shift=Math.sin(time*.057+i*.75)*2.2;
      pose(o.x+shift,o.y+.12*Math.sin(time*.11+i),o.z+.21*Math.sin(time*.08+i),.21,o.s);
      for(const [j,puff] of puffs.entries()) draw('cloud',
        light==='night'?(j%2?'#777e94':'#98a1b3'):light==='gold'?(j%2?'#edceaf':'#f3e3cb'):(j%2?'#e4eadc':'#f6f6e8'),...puff);
    }
    for(const m of Object.values(shapes)){
      m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor)m.instanceColor.needsUpdate=true;
    }
  }
  function dispose(){
    group.removeFromParent();
    for(const m of Object.values(shapes)){m.geometry.dispose();m.dispose();}
    matte.dispose();cloudMaterial.dispose();
  }
  step(0,world.light);
  return {group,step,dispose,targets};
}
