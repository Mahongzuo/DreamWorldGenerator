import {items, LAND} from './sandbox-state.js';
import {randFrom} from './model.js';
import {modelDefinitions} from './asset-registry.js';

const directions = Array.from({length:16},(_,i) => [Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]);
const reeds = new Set(['reeds','cattail']);
const perches = new Set(['shore-stones','willow','nature-willow']);
export const visitorRadius = {frog:modelDefinitions.frog.radius,kingfisher:modelDefinitions.kingfisher.radius};

const openPool = (field,x,z) => [[0,0],[.56,0],[-.56,0],[0,.56],[0,-.56]]
  .every(([dx,dz]) => field.depth(x+dx,z+dz) >= .68);

function wetFeatures(field,nav,center,needOpen) {
  let shallow = false, bank = null, pool = null;
  const banks=[];
  for (const [dx,dz] of directions) {
    let previous = {x:center.x,z:center.z,depth:field.depth(center.x,center.z)};
    for (let distance=0; distance<= (needOpen?4.5:3.25); distance+=.32) {
      const x=center.x+dx*distance, z=center.z+dz*distance, depth=field.depth(x,z);
      if (needOpen && !pool && depth>=.68 && openPool(field,x,z)) pool={x,z};
      if (!needOpen) {
        shallow ||= depth>.06 && depth<.68;
        if ((previous.depth>.42)!==(depth>.42)) {
          shallow = true;
          const towardDry=depth<=.42?1:-1;
          for (const back of [.27,.48,.72,.94]) {
            const bx=x+dx*back*towardDry,bz=z+dz*back*towardDry;
            if (field.depth(bx,bz)>.28 || !nav.valid(bx,bz,visitorRadius.frog,'land') ||
                Math.abs(nav.height(bx,bz)-field.height(bx,bz))>.10) continue;
            const candidate={x:bx,z:bz};
            if(!banks.some(b=>(b.x-bx)**2+(b.z-bz)**2<.45**2))banks.push(candidate);
            if(!bank || distanceTo(candidate,center)<distanceTo(bank,center))bank=candidate;
            break;
          }
        }
      }
      previous={x,z,depth};
      if (pool) return {shallow,bank,banks,pool};
    }
  }
  return {shallow,bank,banks,pool};
}

function perchPoint(o,field,seed) {
  let x,y,z;
  if (o.type==='shore-stones') {
    const sx=o.w/2.6,sz=o.d/1.55;
    x=.87*sx; y=.745*Math.sqrt(sx*sz); z=.055*sz;
  } else if (o.type==='nature-willow') {
    x=.50*o.w/2.8; z=-.02*o.d/2.8; y=2.16*Math.sqrt(o.w*o.d)/2.8;
  } else {
    // Match the first genuine side limb of the procedural willow, including its seeded angle.
    const h=o.w*2.29,random=randFrom(seed+'-'+o.id);
    random(); random(); random(); random();
    const angle=2.399+random()*.32, r=(.12+random()*.17)*h;
    x=Math.cos(angle)*r*.74; z=Math.sin(angle)*r*.74; y=(.46+(.72+random()*.22-.46)*.74)*h+.02;
  }
  const a=o.a??0,c=Math.cos(a),s=Math.sin(a);
  return {x:o.x+x*c+z*s,z:o.z-x*s+z*c,y:field.height(o.x,o.z)+y};
}

function addNearPlants(world,field,nav,survey) {
  for (const o of survey.anchors) {
    const frog = reeds.has(o.type), type = frog?'frog':'kingfisher';
    const features=wetFeatures(field,nav,o,!frog);
    const seat = frog ? features.bank : perchPoint(o,field,world.seed);
    const clear = !frog && seat && (!nav.cameraBlocked || !nav.cameraBlocked(seat.x,seat.y+.16,seat.z,.10));
    const checks=frog ? [features.shallow,true,!!features.bank] : [!!features.pool,true];
    const ready=frog?!!(features.shallow && features.bank):!!(features.pool && clear);
    survey.options[type].push({type,anchor:o.id,at:{x:o.x,z:o.z},checks,ready,seat,
      banks:features.banks, pool:features.pool, blocked:!frog && !!features.pool && !clear});
  }
}

const distanceTo = (a,b) => (a.x-b.x)**2+(a.z-b.z)**2;

// Cache a local 3D survey. Editing an outlying plot or only changing inventory does not resample terrain.
export function createShoreSurvey() {
  let cached;
  function update(world,field,nav,center) {
    const left=center.x-LAND.x-5,right=center.x+LAND.x+5,top=center.z-LAND.z-5,bottom=center.z+LAND.z+5;
    const objects=world.objects.filter(o => o.x+o.w>=left-5 && o.x-o.w<=right+5 && o.z+o.d>=top-5 && o.z-o.d<=bottom+5 && items[o.type]?.category!=='animal');
    const strokes=world.strokes.filter(s => {
      let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
      for(const [x,z] of s.p){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
      return x1+s.w>=left-5 && x0-s.w<=right+5 && z1+s.w>=top-5 && z0-s.w<=bottom+5;
    });
    const nearbyRegions = [];
    if (world.regions) {
      const rx=Math.round(center.x/30),rz=Math.round(center.z/22.8);
      for(let z=rz-1;z<=rz+1;z++)for(let x=rx-1;x<=rx+1;x++)nearbyRegions.push(world.regions[x+','+z]);
    } else nearbyRegions.push(world.theme,world.biome,world.felled);
    const unchanged=(a,b)=>a.length===b.length&&a.every((item,i)=>item===b[i]);
    if(cached && cached.center.x===center.x && cached.center.z===center.z && cached.seed===world.seed &&
        cached.season===world.season && unchanged(cached.objects,objects) && unchanged(cached.strokes,strokes) &&
        unchanged(cached.nearbyRegions,nearbyRegions))return cached;
    const anchors=objects.filter(o => (reeds.has(o.type)||perches.has(o.type))&&o.x>=left&&o.x<=right&&o.z>=top&&o.z<=bottom);
    const result={waterChecks:new Map(),center,seed:world.seed,season:world.season,nearbyRegions,objects,strokes,anchors,options:{frog:[],kingfisher:[]},
      waters:strokes.filter(s=>items[s.type]?.category==='water')};
    addNearPlants(world,field,nav,result);
    cached=result;
    return result;
  }
  return {update};
}

function nearestWater(waters,p) {
  let best=null,bestD=Infinity;
  for(const s of waters)for(let i=0;i<s.p.length;i++){
    const a=s.p[i],b=s.p[i+1]??a,dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1)));
    const point={x:a[0]+dx*t,z:a[1]+dz*t},d=distanceTo(point,p);
    if(d<bestD){best=point;bestD=d;}
  }
  return bestD<=9**2?best:null;
}

export function shoreReport(survey,field,nav,focus) {
  const water=nearestWater(survey.waters,focus);
  const results={};
  let bank;
  const waterKey=water?Math.floor(water.x/2)+','+Math.floor(water.z/2):null;
  for(const type of ['frog','kingfisher']) {
    const nearest=survey.options[type].reduce((best,s) => !best || distanceTo(s.at,focus)<distanceTo(best.at,focus)?s:best,null);
    if(nearest && distanceTo(nearest.at,focus)<=10**2) results[type]=nearest;
    else {
      if (water && !bank){
        bank=survey.waterChecks.get(waterKey);
        if(!bank){
          bank=wetFeatures(field,nav,water,false);
          bank.open=openPool(field,water.x,water.z);
          survey.waterChecks.set(waterKey,bank);
        }
      }
      results[type]={type,checks:type==='frog'?[!!bank?.shallow,false,!!bank?.bank]:[!!bank?.open,false],ready:false};
    }
  }
  return results;
}

// Expand only after the normal local placement search fails. An edited habitat never deletes a placed animal.
const waterByNavigation=new WeakMap();
export function findResidentRefuge(nav,crowd,o,r,kind,world) {
  if(kind==='water'&&world){
    let waters=waterByNavigation.get(nav);
    if(!waters){
      waters=world.strokes.filter(s=>items[s.type]?.category==='water');
      waterByNavigation.set(nav,waters);
    }
    if(!waters.length)return null;
    let best=null,bestDistance=Infinity;
    for(const s of waters)for(let i=0;i<s.p.length;i++){
      const [x,z]=s.p[i],[xx,zz]=s.p[i+1]??s.p[i],dx=xx-x,dz=zz-z;
      const t=Math.max(0,Math.min(1,((o.x-x)*dx+(o.z-z)*dz)/(dx*dx+dz*dz||1)));
      const wx=x+dx*t,wz=z+dz*t,d=(wx-o.x)**2+(wz-o.z)**2;
      if(d>=bestDistance || d>70**2)continue;
      if(nav.valid(wx,wz,r,'water')&&crowd.fits(wx,wz,r,'water')){best={x:wx,z:wz};bestDistance=d;}
    }
    if(best)return best;
  }
  for(let distance=4;distance<=33;distance+=1.05){
    const count=Math.ceil(distance*3.5);
    for(let i=0;i<count;i++){
      const a=i*Math.PI*2/count,x=o.x+Math.cos(a)*distance,z=o.z+Math.sin(a)*distance;
      if(nav.valid(x,z,r,kind)&&crowd.fits(x,z,r,kind))return {x,z};
    }
  }
  return null;
}
