import {bridgeFit} from './bridge-fit.js';
import {resolveCabinLayout} from './cabin-layout.js';
import {createRoadCoverage, crossSection, roadTypes as roadIds} from './road-coverage.js';
import {traversalAnchor,isTraversable} from './traversal-shapes.js';
import * as T from 'three';
import {batch, buildCabin, contactShadow, disposeGroup, randFrom} from './model.js';
import {baseHeight, biomeOf, biomes, continentHeight, contour, footprint, inFootprint, inside, items, LAND, themes, tileInside, tileShift, waterAnimal} from './sandbox-state.js';

import {buildArchitecture, buildDecor, buildPlant} from './asset-models.js';
import {buildCreature} from './creatures.js';
import {createPackModel} from './model-pack.js';
import {createNavigation} from './navigation.js';

const SIZE = 320;
const waterIds = Object.keys(items).filter(id=>items[id].category==='water');
const grassIds = Object.keys(items).filter(id=>['grass','terrain'].includes(items[id].category));
const ox = (x) => (.5 + x / (LAND.x * 2.18)) * SIZE;
const oz = (z) => (.5 + z / (LAND.z * 2.18)) * SIZE;
const scale = SIZE / (LAND.x * 2.18);

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return c;
}
function outline(ctx) {
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = i * Math.PI * 2 / 96, r = contour(a);
    const x = ox(Math.cos(a) * r * LAND.x), y = oz(Math.sin(a) * r * LAND.z);
    if (i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.clip();
}
function drawStroke(ctx, points, width, color) {
  ctx.save();
  ctx.scale(1,LAND.x / LAND.z);
  const p = points.map(([x,z]) => [ox(x), oz(z) * LAND.z / LAND.x]);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = width * scale;
  ctx.beginPath();
  if (p.length === 1) {
    ctx.arc(...p[0], ctx.lineWidth / 2,0,Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(...p[0]);
    for (let i=1;i<p.length-1;i++) {
      const a=p[i], b=p[i+1];
      ctx.quadraticCurveTo(...a,(a[0]+b[0])/2,(a[1]+b[1])/2);
    }
    ctx.lineTo(...p.at(-1));
    ctx.stroke();
  }
  ctx.restore();
}

export function makeField(world,region) {
  const waterCanvas = canvas(), grassCanvas = canvas();
  const [water,grass] = [waterCanvas,grassCanvas].map(c=>c.getContext('2d',{willReadFrequently:true}));
  for (const ctx of [water,grass]){
    if(region){ctx.beginPath();ctx.rect(ox(-LAND.x),oz(-LAND.z),ox(LAND.x)-ox(-LAND.x),oz(LAND.z)-oz(-LAND.z));ctx.clip();}
    else outline(ctx);
  }
  // Layer neighbouring rivers together just as older saves did. Fill breaks a batch at its exact
  // position in the drawing history, so later water can reclaim a channel through the bank.
  const rivers=[];
  function paintRivers(){
    if(!rivers.length)return;
    for(const [width,depth] of [[.95,26],[.42,97],[.03,222],[-.17,255]]){
      for(const s of rivers)drawStroke(water,s.p,s.w+width,`rgb(${(waterIds.indexOf(s.type)+1)*24},${depth},0)`);
    }
    rivers.length=0;
  }
  for(const stroke of world.strokes){
    if(items[stroke.type].category==='water')rivers.push(stroke);
    else if(stroke.type==='shore-fill'){
      paintRivers();
      water.save();
      water.globalCompositeOperation='destination-out';
      drawStroke(water,stroke.p,stroke.w+.30,'rgba(0,0,0,.35)');
      drawStroke(water,stroke.p,stroke.w,'#000');
      water.restore();
    }
  }
  paintRivers();
  for (const s of world.strokes) {
    if (grassIds.includes(s.type)){
      const id=(grassIds.indexOf(s.type)+1)*10;
      for(const [scale,height] of [[1,.18],[.81,.54],[.61,.87],[.42,1]]){
        drawStroke(grass,s.p,s.w*scale,`rgb(${id},${Math.round(height*255)},0)`);
      }
    }
  }
  water.globalCompositeOperation = 'destination-out';
  for (const o of world.objects) {
    if (items[o.type].category !== 'house'||items[o.type].form==='bridge') continue;
    water.beginPath();
    footprint(o,.47).forEach(([x,z],i)=>i ? water.lineTo(ox(x),oz(z)) : water.moveTo(ox(x),oz(z)));
    water.closePath();
    water.fill();
  }
  const data = [water,grass].map(ctx=>ctx.getImageData(0,0,SIZE,SIZE).data);
  const index = (x,z) => (Math.max(0,Math.min(SIZE-1,Math.floor(oz(z))))*SIZE+Math.max(0,Math.min(SIZE-1,Math.floor(ox(x)))))*4;
  const shift=region?tileShift(region.x,region.z):[0,0];
  const surface=region?(x,z)=>continentHeight(x+shift[0],z+shift[1]):baseHeight;
  const level=region?.continuous?.20:region?surface(0,0)-.26:-.018;
  const edgeFade=(x,z)=>region&&!region.continuous?T.MathUtils.clamp(Math.min(LAND.x-Math.abs(x),LAND.z-Math.abs(z))/.48,0,1):1;
  const depth = (x,z) => {const i=index(x,z);return data[0][i+1]*data[0][i+3]/65025*edgeFade(x,z);};
  const type = (channel,x,z) => {
    const i=index(x,z);
    return data[channel][i+3] < 130 ? 0 : Math.round(data[channel][i]/[24,10,60][channel]);
  };
  return withRoadCoverage({data, depth, type, level,
    height(x,z) {
      const i=index(x,z);
      const top=items[grassIds[Math.round(data[1][i]/10)-1]];
      const coverage=data[1][i+1]*data[1][i+3]/65025;
      const profile=top?.form==='plateau'?Math.min(1,coverage*2.8):top?.form==='rock'?coverage**1.6:top?.form==='valley'?Math.sqrt(coverage):coverage;
      const relief=top?.category==='terrain'?(top.depth??0)*profile*edgeFade(x,z):0;
      const ripples=top?.form==='dune'?relief*.16*Math.sin(x*2.1+z*.43):0;
      const ground=surface(x,z)+relief+ripples, wet=depth(x,z);
      return ground+Math.min(-.13,level-.37-ground)*wet;
    }},world.strokes);
}

// The stroke list must be expressed in the same coordinate frame as the field.
export function withRoadCoverage(field,strokes) {
  const roadCoverage=createRoadCoverage(strokes);
  const type=(channel,x,z)=>channel===2?roadIds.indexOf(roadCoverage.typeAt(x,z))+1:field.type(channel,x,z);
  const paint=(x,z)=>roadCoverage.typeAt(x,z)??waterIds[type(0,x,z)-1]??grassIds[type(1,x,z)-1];
  return {...field,type,paint,roadCoverage};
}

const color = (hex) => new T.Color(hex);
const at = (list,n) => list[Math.min(list.length-1,n)];
const landColors = {
  winter:['#c3d4cc','#dce4d7','#a6beb5','#bbcbbb'],
  autumn:['#9f995f','#b7aa74','#838e5c','#a79763']
};
// Cache the three possible road appearances of each editable surface vertex.
// Grass, bank shading and the seeded ground tint are sampled once, at terrain build time.
const roadPalettes=new WeakMap();
const roadColors=roadIds.map(id=>color(items[id].color));
const surfaceShade=new T.Color();
function bakeRoadColors(variants,i,base,strength,bank,bankStrength,light){
  for(let material=0;material<=roadColors.length;material++){
    surfaceShade.copy(base);
    if(material)surfaceShade.lerp(roadColors[material-1],strength);
    if(bank)surfaceShade.lerp(bank,bankStrength);
    surfaceShade.multiplyScalar(light).toArray(variants,i*9+material*3);
  }
}

export function updateRoadSurface(surface,field,xmin,zmin,xmax,zmax){
  const cached=roadPalettes.get(surface);
  if(!cached)return;
  const {variants,start,end}=cached;
  const {position,color:attribute}=surface.geometry.attributes;
  const points=position.array,colors=attribute.array;
  let first=Infinity,last=-1;
  for(let i=start;i<end;i++){
    const idx=i*3,x=points[idx],z=points[idx+2];
    if(x<xmin||x>xmax||z<zmin||z>zmax)continue;
    const at=i*9+field.type(2,x,z)*3;
    if(colors[idx]===variants[at]&&colors[idx+1]===variants[at+1]&&colors[idx+2]===variants[at+2])continue;
    colors[idx]=variants[at];colors[idx+1]=variants[at+1];colors[idx+2]=variants[at+2];
    first=Math.min(first,idx);last=idx+3;
  }
  if(last>=0){
    attribute.addUpdateRange(first,last-first);
    attribute.needsUpdate=true;
  }
}

export function makeTerrain(world,field) {
  const position=[], tint=[], uv=[], index=[];
  const rows=66, count=116;
  const variants=new Float32Array((1+rows*count)*9);
  const palette = (landColors[world.season] ?? themes[world.theme].colors).map(color);
  const patches = grassIds.map(id=>color(items[id].color));
  const banks = waterIds.map(id=>color(items[id].accent));
  const soil = ['#6e694c','#797255','#6a634d','#8f8062'].map(color);
  const random = randFrom(world.seed + 'earth');
  function vertex(x,z,y,shade) {
    position.push(x,y,z);
    tint.push(shade.r,shade.g,shade.b);
    uv.push(ox(x)/SIZE,1-oz(z)/SIZE);
  }
  const centerWet=field.type(0,0,0);
  bakeRoadColors(variants,0,palette[0],.91,centerWet?at(banks,centerWet-1):null,.84,1);
  vertex(0,0,field.height(0,0),surfaceShade.fromArray(variants,field.type(2,0,0)*3));
  for (let j=1;j<=rows+2;j++) {
    for (let i=0;i<count;i++) {
      const a=i/count*Math.PI*2;
      const r=contour(a)*Math.min(j/rows,1)*(j===rows+2 ? .975 : 1);
      const x=Math.cos(a)*r*LAND.x,z=Math.sin(a)*r*LAND.z;
      const y=j<=rows ? field.height(x,z) : j===rows+1 ? -.35-random()*.17 : -1.02;
      const grass=field.type(1,x,z), wet=field.type(0,x,z);
      let shade=palette[0].clone().lerp(palette[1],.43+.34*Math.sin(x*.4+z*.64))
        .lerp(palette[2],.23+.21*Math.cos(z*.61-x*.37)).lerp(palette[3],.2);
      if (grass) shade.lerp(at(patches,grass-1),world.season==='winter' ? .33 : .86);
      if (j>rows) shade=soil[i%soil.length].clone().multiplyScalar(j===rows+2 ? .69 : 1);
      else {
        const v=position.length/3,road=field.type(2,Math.fround(x),Math.fround(z));
        bakeRoadColors(variants,v,shade,.91,wet?at(banks,wet-1):null,.84,.95+random()*.095);
        shade.fromArray(variants,v*9+road*3);
      }
      vertex(x,z,y,shade);
      const now=1+(j-1)*count+i,next=1+(j-1)*count+(i+1)%count;
      if (j===1) index.push(0,next,now);
      else index.push(now-count,next-count,now,now,next-count,next);
      if (j===rows+2) index.push(1+(rows+2)*count,now,next);
    }
  }
  vertex(0,0,-1.02,soil[2]);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(tint,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
  mesh.receiveShadow=true;
  mesh.userData.owned=true;
  roadPalettes.set(mesh,{variants,start:0,end:1+rows*count});
  return mesh;
}

function makeWater(kit,world,field,region) {
  const c=canvas(),ctx=c.getContext('2d'), image=ctx.createImageData(SIZE,SIZE);
  const data=field.data[0];
  const hues=waterIds.map(id=>color(items[id].color));
  const random=randFrom(world.seed+'surface');
  const scratch=new T.Color();
  for (let i=0;i<data.length;i+=4) {
    if (data[i+1]<170 || data[i+3]<142) continue;
    const n=i/4, x=n%SIZE, z=Math.floor(n/SIZE);
    if(region && !tileInside((x/SIZE-.5)*LAND.x*2.18,(z/SIZE-.5)*LAND.z*2.18,region.continuous?0:.34)) continue;
    scratch.copy(at(hues,Math.max(0,Math.round(data[i]/24)-1))).multiplyScalar(.78+.12*Math.sin(x*.145+z*.062)+random()*.11);
    scratch.getRGB(scratch,T.SRGBColorSpace);
    image.data[i]=scratch.r*255; image.data[i+1]=scratch.g*255; image.data[i+2]=scratch.b*255; image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  ctx.globalCompositeOperation='source-atop';
  for (let i=0;i<2450;i++) {
    const x=random()*SIZE,z=random()*SIZE,r=.4+random()*2.8;
    ctx.strokeStyle=i%4 ? '#e1fff45a' : '#326d7150';
    ctx.lineWidth=.29+random()*.39;
    ctx.beginPath();
    ctx.ellipse(x,z,r,r*.26,random()*.3,0,Math.PI*1.25);
    ctx.stroke();
  }
  const map=new T.CanvasTexture(c);
  map.colorSpace=T.SRGBColorSpace;
  map.anisotropy=4;
  const mesh=new T.Mesh(new T.PlaneGeometry(LAND.x*2.18,LAND.z*2.18),
    new T.MeshStandardMaterial({map,alphaTest:.47,roughness:.39,metalness:.05,emissive:'#47898b',emissiveIntensity:.13}));
  mesh.rotation.x=-Math.PI/2;
  mesh.position.y=field.level;
  mesh.material.onBeforeCompile=shader=>{
    shader.uniforms.uStreamTime=kit.time;
    shader.fragmentShader='uniform float uStreamTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float current = sin(vMapUv.x * 215.0 + vMapUv.y * 160.0 - uStreamTime * 1.15);
      float glint = sin(vMapUv.x * 92.0 - vMapUv.y * 260.0 + uStreamTime * 0.8);
      diffuseColor.rgb *= 1.0 + current * glint * 0.059;`);
  };
  mesh.receiveShadow=true;
  mesh.userData.owned=true;
  return mesh;
}

export function eachAlong(points,step,callback) {
  if (points.length<2) {if(points.length) callback(...points[0],0,0);return;}
  let next=0, traveled=0;
  for (let j=1;j<points.length;j++) {
    const [x,z]=points[j-1], [xx,zz]=points[j], length=Math.hypot(xx-x,zz-z);
    if(length<.0001) continue;
    const angle=Math.atan2(xx-x,zz-z);
    while (next<=traveled+length) {
      const t=(next-traveled)/length;
      callback(x+(xx-x)*t,z+(zz-z)*t,angle,next);
      next+=step;
    }
    traveled+=length;
  }
}
function beam(parts,shade,a,b,width,height=width,surface='wood') {
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],flat=Math.hypot(dx,dz);
  parts.box(shade,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,Math.hypot(flat,dy),height,width,
    {surface,ry:-Math.atan2(dz,dx),rz:Math.atan2(dy,flat)});
}
function rock(parts,shade,x,y,z,w,h,d,a=0) {
  parts.put('rock','basic',shade,x,y,z,w,h,d,0,a);
}

function tree(parts,type,x,z,y,h,random,season) {
  const winter=season==='winter';
  const fall=season==='autumn';
  if(type==='pine') {
    parts.put('trunk','basic','#6f5741',x,y+h*.39,z,h*.038,h*.78,h*.038,0,random()*6);
    const shade=fall ? '#57724b' : '#477653';
    for (let i=0;i<6;i++) {
      const t=i/5, r=h*(.215-t*.165);
      parts.put('fir','fir',color(shade).lerp(color('#83a665'),t*.58).multiplyScalar(.88+random()*.2),
        x+i*.014,y+h*(.30+t*.62),z,r,h*(.30-t*.087),r,0,i*.61);
      if(winter && i%2===0) parts.put('fir','fir','#d5e1d3',x+i*.014,y+h*(.34+t*.62),z,r*.76,h*(.27-t*.08),r*.76,0,i*.61);
    }
    return;
  }
  const willow=type==='willow';
  const leaf=winter ? ['#abbcb2','#c8d6c6','#8da99c'] : willow ? ['#718851','#8fa256','#a0b166'] :
    type==='sakura' ? ['#b77a85','#d799a2','#e4b1ab'] : fall ? ['#b07b46','#bb904f','#d1a65e'] : ['#688e56','#86a263','#9aab65'];
  parts.put('trunk','basic','#745b43',x,y+h*.39,z,h*.048,h*.78,h*.048,0,.3,.07);
  const clusters=willow ? 12 : 8;
  for(let i=0;i<clusters;i++){
    const a=i*2.399+random()*.32,r=(i===0 ? .025 : .12+random()*.17)*h;
    const xx=x+Math.cos(a)*r, zz=z+Math.sin(a)*r, yy=y+h*(.72+random()*.22);
    if(i<6) beam(parts,'#6d563f',[x,y+h*.46,z],[xx,yy,zz],h*.036,h*.038,'basic');
    const s=h*(.134+random()*.072);
    rock(parts,leaf[i%leaf.length],xx,yy,zz,s,s*(willow ? 1.45 : .98),s,a);
    if(willow && i>3) rock(parts,leaf[(i+1)%leaf.length],xx,yy-h*.19,zz,s*.53,s*1.29,s*.58,a);
  }
}
function camp(parts,x,y,z,s,random) {
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    rock(parts,i%3 ? '#a8a08c':'#838774',x+Math.cos(a)*s*.43,y+s*.08,z+Math.sin(a)*s*.43,s*.16,s*.12,s*.14,a);
  }
  parts.put('disc','basic','#4b4433',x,y+.027,z,s*.37,.03,s*.37);
  for(let i=0;i<4;i++) parts.box('#745035',x+(i-1.5)*s*.11,y+s*.07,z,s*.54,s*.093,s*.091,{surface:'wood',ry:i%2?.73:-.66});
  for(let i=0;i<7;i++){
    const a=i*2.399,r=random()*s*.14;
    parts.put('flame','flame',i%2 ? '#ffab35':'#ffe29a',x+Math.cos(a)*r,y+s*(.22+random()*.10),z+Math.sin(a)*r,s*.079,s*(.15+random()*.11),s*.073,.11,a,.17,false);
  }
}

function landscape(kit,world,field,region) {
  const samples=[];
  let sampleParts=null;
  const parts=batch(kit,()=>sampleParts);
  function capture(x,z){
    const sample={x,z,hidden:false,instances:[],tree:null};
    samples.push(sample);sampleParts=sample.instances;
    return sample;
  }
  const biome=biomes[biomeOf(world)];
  const flora=world.biome?biome.growth:themes[world.theme].growth;
  const coarse=Boolean(region?.coarse);
  const limit=world.biome?biome.density:37;
  const inBounds=(x,z,m)=>region?tileInside(x,z,region.continuous?0:m):inside(x,z,m);
  const houses=world.objects.filter(o=>items[o.type].category==='house');
  const clear=(x,z,padding)=>houses.some(o=>inFootprint(x,z,o,padding));
  const treeSites=[],treeRandom=randFrom(world.seed+'tree-sites'),felled=new Set(world.felled);
  const sample=(radius,rng)=>{
    if(region) return [(rng()*2-1)*LAND.x*radius,(rng()*2-1)*LAND.z*radius];
    const angle=rng()*Math.PI*2,r=Math.sqrt(rng())*radius*contour(angle);
    return [Math.cos(angle)*r*LAND.x,Math.sin(angle)*r*LAND.z];
  };
  for(let i=0;!world.scene && flora && i<190 && treeSites.length<limit;i++){
    const [x,z]=sample(.96,treeRandom);
    const v=Math.hypot(x/LAND.x,z/LAND.z);
    if((!world.biome && (v<.6 || (z>1.5 && v<.84))) || field.depth(x,z)>.12 || clear(x,z,1.1) ||
      world.objects.some(o=>items[o.type].category!=='animal'&&Math.hypot(o.x-x,o.z-z)<1.55) || treeSites.some(([tx,tz])=>Math.hypot(tx-x,tz-z)<1.65)) continue;
    treeSites.push([x,z]);
    const candidate=capture(x,z);
    const rng=randFrom(world.seed+'tree-'+i);
    const h=(1.7+rng()*2.35)*(z<-1.4 ? 1.16 : .73);
    const kind=rng()<.63 ? flora : (flora==='pine'?'broadleaf':'pine');
    const y=field.height(x,z);
    if(felled.has(i)){
      parts.put('disc','wood','#795c45',x,y+.11,z,h*.055,.22,h*.055);
      parts.put('disc','basic','#bb9a6a',x,y+.227,z,h*.046,.02,h*.046);
      continue;
    }
    candidate.tree={key:i,type:kind==='broadleaf'?'oak':kind,x,z,r:h*.051,crown:h*(kind==='pine'?.20:.29)};
    tree(parts,kind,x,z,y,h,rng,world.season);
  }
  const grasses=landColors[world.season] ?? (world.biome?biome.colors:themes[world.theme].colors);
  for(let i=0;i<(coarse?290:1250);i++){
    sampleParts=null;
    const random=randFrom(world.seed+'-ground-cover-'+i);
    const [x,z]=sample(.98,random), wet=field.depth(x,z), grass=field.type(1,x,z);
    if(clear(x,z,.36)) continue;
    if(wet>.73){
      if(field.type(0,x,z)===3 && i%3===0){
        const r=.105+random()*.13;
        parts.put('disc','basic',i%2?'#6b935a':'#81a75f',x,field.level+.015,z,r,.017,r*.87,0,random()*6,0,false);
        if(i%2===0) rock(parts,'#e3b2be',x+.024,field.level+.083,z,.071,.064,.069,random()*6);
      }
      continue;
    }
    capture(x,z);
    const y=field.height(x,z), size=.14+random()*.31;
    const paint=items[grassIds[grass-1]];
    if(paint?.category==='terrain'){
      if(['rock','gravel','paving'].includes(paint.form)&&i%3===0){
        const s=paint.form==='rock'?.25+random()*.58:.08+random()*.24;
        rock(parts,paint.accent,x,y+s*.23,z,s,s*.58,s*.81,random()*6);
      }
      if(['rock','sand','dune','paving','flat','snow'].includes(paint.form))continue;
    }
    if(wet>.13&&wet<.66&&i%4===0&&biomeOf(world)==='wetland'){
      parts.put('grass','grass','#899353',x,y,z,size*.83,size*2.13,size*.82,0,random()*6,0,false);
    }
    if(!coarse&&biomeOf(world)==='forest'&&i%34===0&&wet<.13){
      const h=.08+random()*.09;
      parts.put('trunk','basic','#e1cc9d',x,y+h*.44,z,.024,h,.024,0,.4,0,false);
      parts.put('rock','basic','#ab6e51',x,y+h,z,.069,.036,.063,0,random()*6,0,false);
    }
    if(i%(biomeOf(world)==='ridge'?11:18)===0 && (!grass || grass===4)){
      const s=.22+random()*.55;
      rock(parts,i%3?'#969986':'#b1ab93',x,y+s*.22,z,s,s*.55,s*.69,random()*6);
      rock(parts,grasses[2],x-s*.18,y+s*.64,z,s*.54,s*.09,s*.43,.7);
      continue;
    }
    const shade=grass ? items[grassIds[grass-1]].color : grasses[i%grasses.length];
    parts.put('grass','grass',shade,x,y,z,size,size*(.38+random()*.52),size,0,random()*6,0,false);
    if(world.season!=='winter' && (grass===2 || grass===3 || paint?.form==='flower' || i%27===0)) {
      const petals=grass===3 ? ['#b786ac','#d0a8c3','#e1bac5'] : ['#f0ddab','#eac57b','#fff0c3'];
      for(let j=0;j<(grass===2||grass===3?4:2);j++){
        const px=x+(random()-.5)*.48,pz=z+(random()-.5)*.47,h=.13+random()*.19;
        if(clear(px,pz,.15)||field.depth(px,pz)>.6) continue;
        const floor=field.height(px,pz);
        parts.put('trunk','basic','#637d4a',px,floor+h/2,pz,.013,h,.013,0,0,.10,false);
        parts.put('flame','basic',petals[j%3],px,floor+h,pz,.057,.028,.054,0,random()*6,0,false);
      }
    }
  }
  sampleParts=null;
  for(const s of world.strokes){
    if(s.type==='fence'){
      let previous;
      eachAlong(s.p,.94,(x,z)=>{
        if(!inBounds(x,z,.2)||field.depth(x,z)>.38||clear(x,z,.13)){previous=undefined;return;}
        const y=field.height(x,z);
        parts.box('#8e6746',x,y+.44,z,.135,.89,.135,{surface:'wood'});
        parts.box('#b08b5f',x,y+.91,z,.173,.083,.172,{surface:'wood'});
        if(previous) for(const h of [.28,.67]) beam(parts,'#af875b',[previous.x,previous.y+h,previous.z],[x,y+h,z],.082,.103);
        previous={x,y,z};
      });
    }
  }
  const group=parts.finish(new T.Group());
  group.userData.samples=samples;
  return group;
}

// Road paint can hide a whole plant or wild tree without disturbing the other
// instances in its batch. Keep its original transform only while it's hidden.
export function updateRoadVegetation(group,field,bounds) {
  const trees=[];
  for(const sample of group.userData.samples){
    const {x,z}=sample;
    if(!bounds || bounds.some(b=>x>=b.x0 && x<=b.x1 && z>=b.z0 && z<=b.z1)){
      const hidden=field.type(2,x,z)!==0;
      if(sample.hidden!==hidden)for(const ref of sample.instances){
        const attribute=ref.mesh.instanceMatrix, start=ref.index*16;
        if(hidden){
          ref.original=attribute.array.slice(start,start+16);
          // Collapse all three local axes, retaining the instance's translation.
          attribute.array.fill(0,start,start+12);
        }else{
          attribute.array.set(ref.original,start);ref.original=null;
        }
        attribute.addUpdateRange(start,16);attribute.needsUpdate=true;
      }
      sample.hidden=hidden;
    }
    if(sample.tree&&!sample.hidden)trees.push(sample.tree);
  }
  return trees;
}

export function buildRoadDetails(kit,world,field,region,bridges=[],cell) {
  const parts=batch(kit), roads=field.roadCoverage??createRoadCoverage(world.strokes);
  const houses=world.objects.filter(o=>items[o.type].category==='house');
  const inBounds=(x,z)=>region?.continuous
    ? x>=-LAND.x&&x<LAND.x&&z>=-LAND.z&&z<LAND.z
    : region?tileInside(x,z,.17):inside(x,z,.17);
  const crossing=(x,z)=>field.depth(x,z)>.32;
  for(const {stroke,points,bounds} of roads.paths){
    if(cell&&(bounds.maxX<cell.x0||bounds.minX>=cell.x1||bounds.maxZ<cell.z0||bounds.minZ>=cell.z1))continue;
    eachAlong(points,.28,(x,z,a,dist)=>{
      if(cell&&(x<cell.x0||x>=cell.x1||z<cell.z0||z>=cell.z1))return;
      // Samples along one stroke keep their world alignment when sliced across tiles.
      const c=Math.cos(a),s=Math.sin(a),index=Math.round(dist/.28);
      if(!inBounds(x,z)||houses.some(o=>inFootprint(x,z,o,-.2)))return;
      const wet=crossing(x,z)||crossing(x+s*.37,z+c*.37)||crossing(x-s*.37,z-c*.37);
      if(!wet&&stroke.type!=='stonepath')return;
      const owns=(offset,along)=>roads.strokeAt(x+c*offset+s*along,z-s*offset+c*along)===stroke;
      const strips=crossSection(stroke.w,offset=>owns(offset,0)&&(!wet||(owns(offset,-.133)&&owns(offset,.133))));
      for(const [left,right] of strips){
        const w=right-left,offset=(left+right)/2,px=x+c*offset,pz=z-s*offset;
        if(w<.04)continue;
        const y=field.height(px,pz);
        if(wet){
          const h=Math.max(field.level+.29,y+.075),d=.28;
          bridges.push({x:px,z:pz,a,w,d,h});
          parts.box(index%4===0?'#a67a52':'#bc9063',px,h,pz,w,.112,d-.005,{surface:'wood',ry:a});
          if(w<.35)continue;
          for(const edge of [left+.045,right-.045]){
            const postX=x+c*edge,postZ=z-s*edge;
            if(index%3===0)parts.box('#805c42',postX,h+.26,postZ,.085,.62,.085,{surface:'wood',ry:a});
            parts.box('#9f7855',postX,h+.48,postZ,.077,.068,d,{surface:'wood',ry:a});
          }
        }else{
          const random=randFrom(world.seed+'-road-'+stroke.id+'-'+index);
          const shift=(random()-.5)*w*.2,stoneX=px+c*shift,stoneZ=pz-s*shift;
          const size=Math.min(w*.5,.48);
          rock(parts,random()<.5?'#bab6a0':'#a5a794',stoneX,y+.019,stoneZ,
            size,.055,Math.min(size,.19+random()*.063),a);
        }
      }
    });
  }
  return parts.finish(new T.Group());
}

// Group the committed road details into a small number of patches. A cut
// through the middle of a long bridge only replaces the affected patches.
export function updateRoadDetails(kit,world,field,region,details,dirty,onCell) {
  const cells=details.userData.cells??=new Map();
  const size=8;
  const nextRadius=(field.roadCoverage??createRoadCoverage(world.strokes)).paths.reduce((r,path)=>Math.max(r,path.stroke.w/2),0);
  const reach=Math.max(nextRadius,details.userData.radius??0)+.3;
  details.userData.radius=nextRadius;
  for(let iz=Math.floor(-LAND.z/size);iz<=Math.floor(LAND.z/size);iz++){
    for(let ix=Math.floor(-LAND.x/size);ix<=Math.floor(LAND.x/size);ix++){
      const x0=ix*size,z0=iz*size,x1=x0+size,z1=z0+size;
      if(dirty&&!dirty.some(b=>b.x0<=x1+reach&&b.x1>=x0-reach&&b.z0<=z1+reach&&b.z1>=z0-reach))continue;
      const key=ix+','+iz, previous=cells.get(key);
      onCell?.(key);
      if(previous){disposeGroup(previous.group);cells.delete(key);}
      const bridges=[],group=buildRoadDetails(kit,world,field,region,bridges,{x0,z0,x1,z1});
      if(!group.children.length)continue;
      if(region?.coarse)group.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});
      cells.set(key,{group,bridges});details.add(group);
    }
  }
  return Array.from(cells.values()).flatMap(cell=>cell.bridges);
}

export function makeTileTerrain(world,field,region){
  const count=region.resolution??62, rows=count===32?24:48;
  const variants=new Float32Array((rows+1)*(count+1)*9);
  const position=[],tint=[],index=[];
  const palette=(landColors[world.season]??(world.biome?biomes[world.biome].colors:themes[world.theme].colors)).map(color);
  const verge=color('#9da870'), [ox,oz]=tileShift(region.x,region.z);
  const grasses=grassIds.map(id=>color(items[id].color));
  const waters=waterIds.map(id=>color(items[id].accent));
  for(let j=0;j<=rows;j++) for(let i=0;i<=count;i++){
    const x=(i/count*2-1)*LAND.x,z=(j/rows*2-1)*LAND.z;
    const xx=x+ox,zz=z+oz;
    position.push(x,field.height(x,z),z);
    const boundary=region.continuous?1:T.MathUtils.clamp(Math.min(LAND.x-Math.abs(x),LAND.z-Math.abs(z))/1.25,0,1);
    const c=region.tint?region.tint(x,z):palette[0].clone().lerp(palette[1],.45+.39*Math.sin(xx*.32+zz*.42))
      .lerp(palette[2],.23+.20*Math.cos(zz*.61-xx*.37)).lerp(verge,1-boundary);
    const g=field.type(1,x,z),w=field.type(0,x,z),r=field.type(2,Math.fround(x),Math.fround(z));
    if(g)c.lerp(at(grasses,g-1),boundary*.85);
    const v=j*(count+1)+i,slot=v*9+r*3;
    bakeRoadColors(variants,v,c,boundary*.90,w?at(waters,w-1):null,boundary*.83,.968+.045*Math.sin(xx*4.81+zz*3.77));
    tint.push(variants[slot],variants[slot+1],variants[slot+2]);
    if(i===count||j===rows)continue;
    const a=j*(count+1)+i,b=a+count+1;
    index.push(a,b,a+1,a+1,b,b+1);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(tint,3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
  mesh.receiveShadow=!region.coarse;
  mesh.userData.owned=true;
  roadPalettes.set(mesh,{variants,start:0,end:(rows+1)*(count+1)});
  return mesh;
}
export function buildLand(kit,world,region) {
  const group=new T.Group(),field=region?.field??makeField(world,region);
  const surface=region?makeTileTerrain(world,field,region):makeTerrain(world,field);
  const vegetation=landscape(kit,world,field,region);
  const trees=updateRoadVegetation(vegetation,field);
  const roadDetails=new T.Group();
  const bridges=updateRoadDetails(kit,world,field,region,roadDetails);
  group.add(surface,vegetation,roadDetails);
  if(!region){
    const shadow=contactShadow();
    shadow.scale.set(1.58,1.47,1);
    shadow.position.y=-1.08;
    group.add(shadow);
  }
  if(world.strokes.some(s=>items[s.type].category==='water')) group.add(makeWater(kit,world,field,region));
  if(region?.coarse) group.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=false;});
  group.userData={world,region,surface,roadDetails,field,baseField:field,vegetation,bridges,
    navigation:createNavigation(world,field,region,trees,bridges)};
  return group;
}

// Same coordinate frame as buildLand: a standalone island uses world space,
// while each continuous tile receives local strokes and local dirty bounds.
export function refreshLandRoads(kit,land,world,region,localDirtyBounds) {
  const data=land.userData;
  const bounds=Array.isArray(localDirtyBounds)?localDirtyBounds:[localDirtyBounds];
  const field=withRoadCoverage(data.baseField,world.strokes);
  for(const b of bounds)updateRoadSurface(data.surface,field,b.x0,b.z0,b.x1,b.z1);
  const trees=updateRoadVegetation(data.vegetation,field,bounds);
  const bridges=updateRoadDetails(kit,world,field,region,data.roadDetails,bounds);
  Object.assign(data,{world,region,field,bridges,navigation:createNavigation(world,field,region,trees,bridges)});
  return land;
}

function tileRoof(group,parts,w,d,top,rise,hip,shade,tile,trim) {
  const pos=[],tint=[],indices=[],columns=24,rows=10;
  const w0=hip ? .23 : w*.32, d0=.025, w1=w/2+.59,d1=d/2+.58;
  const corners=[[-1,-1],[-1,1],[1,1],[1,-1]];
  const sample=(side,s,t)=>{
    const a=corners[side], b=corners[(side+1)%4];
    const x=T.MathUtils.lerp(a[0],b[0],s)*T.MathUtils.lerp(w0,w1,t);
    const z=T.MathUtils.lerp(a[1],b[1],s)*T.MathUtils.lerp(d0,d1,t);
    const y=top+rise*Math.pow(1-t,1.48)+.13*t**7+.28*Math.abs(s*2-1)**4*t**4;
    return [x,y,z];
  };
  const random=randFrom('terracotta-roof');
  for(let side=0;side<4;side++){
    const start=pos.length/3;
    for(let row=0;row<=rows;row++) for(let i=0;i<=columns;i++){
      const s=i/columns,t=row/rows;
      pos.push(...sample(side,s,t));
      const c=color(shade).lerp(color(tile),.13+random()*.36);
      tint.push(c.r,c.g,c.b);
      if(i===columns||row===rows) continue;
      const a=start+row*(columns+1)+i,b=a+columns+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
    const channels=Math.ceil((side%2===0 ? d : w)/.28);
    for(let i=0;i<=channels;i++) {
      const s=i/channels;
      for(let j=0;j<5;j++){
        const a=sample(side,s,j/5),b=sample(side,s,(j+1)/5);
        a[1]+=.035;b[1]+=.035;
        beam(parts,i%5===0?shade:tile,a,b,.051,.041,'metal');
      }
    }
    for(let i=0;i<12;i++){
      const a=sample(side,i/12,1),b=sample(side,(i+1)/12,1);
      a[1]-=.035;b[1]-=.035;
      beam(parts,trim,a,b,.12,.115,'wood');
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(tint,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.79,side:T.DoubleSide}));
  mesh.userData.owned=true;
  mesh.castShadow=mesh.receiveShadow=true;
  group.add(mesh);
  parts.box(tile,0,top+rise+.054,0,w0*2+.3,.10,.14,{surface:'metal'});
  for(const x of [-w0,w0]) parts.box(tile,x,top+rise+.123,0,.20,.08,.13,{rz:x<0?.39:-.39,surface:'metal'});
}

function windowFrame(parts,x,y,z,w,h,trim,a=0) {
  const c=Math.cos(a),s=Math.sin(a);
  const box=(shade,dx,dy,dz,ww,hh,dd,surface)=>parts.box(shade,x+c*dx+s*dz,y+dy,z-s*dx+c*dz,ww,hh,dd,{surface,ry:a});
  box(trim,0,0,0,w+.16,h+.16,.11,'wood');
  box('#ffe0a6',0,0,.062,w,h,.04,'window');
  for(const offset of [-w*.24,0,w*.24]) box(trim,offset,0,.092,.042,h,.043,'wood');
  box(trim,0,0,.096,w,.051,.04,'wood');
  box('#b9a07b',0,-h*.5-.067,.074,w+.24,.078,.15,'wood');
}
function oriental(kit,o) {
  const group=new T.Group(),parts=batch(kit),{w,d}=o;
  const pavilion=o.type==='pavilion', y=pavilion ? 2.63 : 2.75;
  const plaster='#e4dbbc', red='#804d3b', timber='#64483c';
  parts.box('#a49c82',0,.16,0,w+.31,.30,d+.30);
  parts.box('#cac1a2',0,.305,0,w+.38,.11,d+.37);
  if(!pavilion) parts.box(plaster,0,(y+.31)/2,0,w,y-.31,d);
  for(const x of [-w/2+.11,w/2-.11]) for(const z of [-d/2+.12,d/2-.12]){
    parts.box('#9d9881',x,.425,z,.33,.17,.32);
    parts.box(red,x,1.51,z,.19,2.18,.19,{surface:'wood'});
  }
  for(const z of [-d/2,d/2]){
    parts.box(timber,0,y-.21,z,w+.2,.20,.17,{surface:'wood'});
    for(const x of [-w*.33,w*.33]){
      if(pavilion) {
        parts.box('#9f7350',x,.62,z-.05,w*.21,.14,.28,{surface:'wood'});
        parts.box(red,x,.89,z,w*.21,.08,.09,{surface:'wood'});
      } else windowFrame(parts,x,1.48,z+Math.sign(z)*.055,w*.19,.78,timber,z<0?Math.PI:0);
      parts.box('#e4a369',x,y-.46,z+Math.sign(z)*.14,.17,.25,.17,{surface:'window'});
      parts.box(red,x,y-.31,z+Math.sign(z)*.14,.20,.052,.21,{surface:'wood'});
    }
  }
  for(const x of [-w/2,w/2]) {
    parts.box(red,x,y-.21,0,.16,.19,d+.12,{surface:'wood'});
    if(!pavilion){
      windowFrame(parts,x+Math.sign(x)*.055,1.53,0,d*.32,.84,timber,Math.sign(x)*Math.PI/2);
      for(let i=0;i<3;i++){
        const h=.18+i*.20,dw=d*(.86-i*.235);
        parts.box(plaster,x,y-.06+h/2,0,.18,h+.1,dw);
        parts.box('#50635b',x,y+h,dw*.001,.27,.085,dw+.11,{surface:'metal'});
      }
    }
  }
  if(!pavilion) {
    parts.box(timber,0,1.2,d/2+.065,w*.26,1.81,.15,{surface:'wood'});
    parts.box('#996849',0,1.22,d/2+.152,w*.215,1.65,.09,{surface:'wood'});
    for(const x of [-w*.055,w*.055]) parts.box('#cfb17a',x,1.32,d/2+.213,.042,.12,.045,{surface:'metal'});
  }
  for(let i=0;i<3;i++) parts.box('#aea78c',0,.28-i*.087,d/2+.23+i*.19,Math.min(w*.54,1.8),.15,.30);
  tileRoof(group,parts,w,d,y,pavilion?1.06:1.23,pavilion,pavilion?'#3c6c62':'#354b4c',pavilion?'#648877':'#60756b',timber);
  return parts.finish(group);
}

function tudor(kit,o) {
  const group=new T.Group(),parts=batch(kit),{w,d}=o;
  const wall=2.65,rise=w*.42,trim='#533d35',plaster='#e2c79b',roof='#9e6351';
  parts.box('#a39882',0,.21,0,w+.12,.38,d+.12);
  parts.box(plaster,0,1.45,0,w,2.42,d);
  const top=wall+rise;
  for(let i=0;i<Math.ceil(rise/.12);i++){
    const y=wall+(i+.5)*.12;
    const span=Math.max(.035,w*(top-y)/rise);
    parts.box(plaster,0,y,0,span,.125,d);
  }
  for(const side of [-1,1]){
    const angle=-side*Math.atan2(rise,w/2), x=side*(w/4+.16), y=top-rise*.5-.12, length=(w/2+.64)/Math.cos(angle);
    parts.box(roof,x,y,0,length,.15,d+.67,{rz:angle});
    for(let i=0;i<Math.ceil((d+.62)/.21);i++){
      const z=-d/2-.31+i*.21;
      parts.box(i%3===0?'#b98060':'#a76c54',x,y+.088,z,length,.039,.154,{rz:angle});
    }
    for(const z of [-d/2-.35,d/2+.35]) parts.box(trim,x,y-.02,z,length+.05,.192,.11,{rz:angle,surface:'wood'});
    for(const z of [-d/2-.038,d/2+.038]){
      for(const bx of [-w*.47,0,w*.47]) parts.box(trim,bx,1.46,z,.128,2.38,.105,{surface:'wood'});
      for(const by of [.49,1.96,2.62]) parts.box(trim,0,by,z,w+.095,.12,.103,{surface:'wood'});
      beam(parts,trim,[0,2.7,z],[side*w*.43,1.53,z],.086,.11);
    }
    const sx=side*(w/2+.049);
    for(const zz of [-d*.46,0,d*.46]) parts.box(trim,sx,1.45,zz,.105,2.41,.129,{surface:'wood'});
    parts.box(trim,sx,2.2,0,.105,.13,d+.12,{surface:'wood'});
    windowFrame(parts,sx+side*.06,1.49,-d*.22,Math.min(d*.29,1.03),.78,trim,side*Math.PI/2);
  }
  parts.box('#b27d60',0,top+.061,0,.16,.10,d+.72,{surface:'metal'});
  windowFrame(parts,-w*.247,1.49,d/2+.10,Math.min(w*.23,1.03),.76,trim);
  windowFrame(parts,0,wall+rise*.34,d/2+.08,.55,.58,trim);
  parts.box(trim,w*.235,1.15,d/2+.105,.92,1.79,.16,{surface:'wood'});
  parts.box('#947057',w*.235,1.14,d/2+.201,.70,1.60,.066,{surface:'wood'});
  parts.box('#b6aa88',w*.235,.26,d/2+.27,1.17,.18,.56);
  const cx=-w*.28,cy=top-rise*.55;
  parts.box('#97897b',cx,cy+.34,-d*.20,.39,1.52,.47);
  for(let i=0;i<8;i++) parts.box(i%2?'#a39785':'#857968',cx,cy-.31+i*.19,-d*.20,.405,.16,.48);
  parts.box('#b6a995',cx,cy+1.1,-d*.20,.48,.105,.56);
  return parts.finish(group);
}

function tower(kit,o) {
  const parts=batch(kit),{w,d}=o;
  const h=3.8+Math.min(w,d)*.17, rx=w*.5, rz=d*.5;
  const stones=['#aaa79a','#a09d8e','#b8b1a0','#969484','#bdb5a4'];
  parts.put('disc','basic','#9e9b8d',0,.22,0,rx*1.07,.40,rz*1.07);
  parts.put('disc','basic','#a9a496',0,h/2,0,rx,h,rz);
  for(let row=0;row<15;row++){
    const n=24;
    for(let i=0;i<n;i++){
      const a=(i+row%2*.5)/n*Math.PI*2;
      const x=Math.sin(a)*rx*.98,z=Math.cos(a)*rz*.98,y=.33+row*(h-.44)/15;
      parts.box(stones[(row*7+i*11)%stones.length],x,y,z,Math.min(rx,rz)*.27,.204,.16,{ry:a});
    }
  }
  parts.put('disc','basic','#b7af9b',0,h-.11,0,rx*1.1,.19,rz*1.10);
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    parts.box(stones[i%5],Math.sin(a)*rx,h+.095,Math.cos(a)*rz,.32,.34,.32,{ry:a});
  }
  parts.put('trunk','metal','#596b78',0,h+.73,0,rx*.97,1.56,rz*.97);
  parts.put('trunk','metal','#657d88',0,h+1.69,0,rx*.60,1.45,rz*.60);
  parts.put('trunk','metal','#657d88',0,h+2.35,0,rx*.37,.93,rz*.37);
  parts.put('trunk','metal','#a5926e',0,h+2.89,0,.052,.42,.052);
  for(const [x,z,a] of [[0,rz,0],[rx,0,Math.PI/2],[0,-rz,Math.PI],[-rx,0,-Math.PI/2]]) windowFrame(parts,x,2.66,z,.35,.85,'#635c50',a);
  parts.box('#6d5a48',0,1.13,rz+.05,.81,1.57,.25,{surface:'wood'});
  parts.box('#aa8967',0,1.10,rz+.185,.61,1.4,.067,{surface:'wood'});
  parts.box('#bdb4a0',0,.27,rz+.29,.93,.16,.49);
  return parts.finish(new T.Group());
}

export function objectHeight(field,o){
  if(isTraversable(o.type))return traversalAnchor(field,o);
  const def=items[o.type];
  if(def.form==='bridge')return bridgeFit(field,o).base;
  if(waterAnimal(o)||def.form==='lily')
    return field.level+(waterAnimal(o)?.043:0);
  return field.height(o.x,o.z);
}
const bridgeShear=new T.Matrix4();
export function alignBridge(group,field,o){
  const {base,slope}=bridgeFit(field,o);
  group.position.set(o.x,base,o.z);group.rotation.y=o.a;
  group.matrixAutoUpdate=false;group.updateMatrix();
  bridgeShear.identity().elements[1]=slope;
  group.matrix.multiply(bridgeShear);group.matrixWorldNeedsUpdate=true;
}
export function buildObject(kit,o,world,field,layout) {
  const def=items[o.type], y=objectHeight(field,o);
  let group=createPackModel(def,o);
  if(group){}
  else if(o.type==='jiangnan'||o.type==='pavilion') group=oriental(kit,o);
  else if(o.type==='tudor') group=tudor(kit,o);
  else if(o.type==='tower') group=tower(kit,o);
  else if(def.category==='house'&&!['cedar','alpine','shed'].includes(o.type))group=buildArchitecture(kit,o,def);
  else if(def.category==='house') {
    const c=Math.cos(o.a), s=Math.sin(o.a);
    if(o.type==='cedar')layout??=resolveCabinLayout(o,world,field);
    group=buildCabin(kit,{roof:o.type==='cedar'?'gable':o.type,width:o.w,depth:o.d,seed:world.seed+'-'+o.id,wood:o.wood??'cedar',
      layout,
      season:world.season,deck:o.deck!==false,chimney:o.chimney!==false,
      groundHeight:(x,z)=>field.height(o.x+x*c+z*s,o.z-x*s+z*c)-y});
  } else if(def.category==='animal')group=buildCreature(kit,o,def);
  else if(def.category==='plant'&&!['pine','sakura','willow'].includes(o.type))group=buildPlant(kit,o,def,world.season);
  else if(def.category==='decor'&&!['fire','rock','lantern'].includes(o.type))group=buildDecor(kit,o,def);
  else {
    const parts=batch(kit),s=o.w,random=randFrom(world.seed+'-'+o.id);
    if(o.type==='fire') camp(parts,0,0,0,s,random);
    else if(o.type==='rock') {
      rock(parts,'#9d9c87',0,s*.28,0,s*.62,s*.53,s*.61,.71);
      rock(parts,'#b1ac96',s*.32,s*.14,s*.27,s*.37,s*.32,s*.31,1.35);
      rock(parts,'#788e5e',-.04,s*.64,.02,s*.49,s*.08,s*.37,1.1);
    } else if(o.type==='lantern') {
      parts.put('disc','basic','#a19d86',0,.085*s,0,s*.35,.17*s,s*.35);
      parts.box('#a8a38a',0,s*.43,0,s*.21,s*.66,s*.21);
      parts.box('#8f8d7b',0,s*.78,0,s*.51,s*.14,s*.51);
      parts.box('#f6d490',0,s*.98,0,s*.30,s*.27,s*.30,{surface:'window'});
      parts.put('trunk','basic','#8d927e',0,s*1.22,0,s*.37,s*.18,s*.37,0,Math.PI*.25);
      parts.put('rock','basic','#a4aa91',0,s*1.36,0,s*.10,s*.095,s*.10);
    } else tree(parts,o.type,0,0,0,s*2.29,random,world.season);
    group=parts.finish(new T.Group());
  }
  group.position.set(o.x,y,o.z);
  group.rotation.y=o.a;
  if(def.form==='bridge')alignBridge(group,field,o);
  group.userData.object=o;
  if(layout)group.userData.cabinLayout=layout;
  return group;
}
