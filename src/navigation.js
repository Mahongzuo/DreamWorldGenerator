import {modelDefinitions,modelHeight,collisionParts} from './asset-registry.js';
import {inside,inFootprint,isSolid,isTree,items,tileInside} from './sandbox-state.js';
import {bridgeRise,architectureHeight} from './asset-models.js';

const size=3;
const key=(x,z)=>Math.floor(x/size)+','+Math.floor(z/size);
export function createNavigation(world,field,region,trees,bridges){
  const grid=new Map(), deckGrid=new Map(), terrainBounds=region?.bounds??(region?tileInside:inside);
  const obstacles=world.objects.filter(o=>isSolid(o)||isTree(o.type));
  const crossings=obstacles.filter(o=>items[o.type].form==='bridge');
  const allTrees=[...trees,...obstacles.filter(o=>isTree(o.type)).map(o=>({x:o.x,z:o.z,r:modelDefinitions[o.type]?.treeRadius?modelDefinitions[o.type].treeRadius*o.w/modelDefinitions[o.type].width:o.w*.10,id:o.id,type:o.type,crown:Math.max(o.w,o.d)*.62}))];
  const add=(target,entry,x,z,r)=>{
    for(let a=Math.floor((x-r-.75)/size);a<=Math.floor((x+r+.75)/size);a++)
      for(let b=Math.floor((z-r-.75)/size);b<=Math.floor((z+r+.75)/size);b++){
        const k=a+','+b;
        if(!target.has(k))target.set(k,[]);
        target.get(k).push(entry);
      }
  };
  for(const o of obstacles)if(isSolid(o)&&items[o.type].form!=='bridge'){
    const margin=items[o.type].category==='house'?.18:0;
    for(const part of collisionParts(o))add(grid,{object:part,margin},part.x,part.z,Math.hypot(part.w,part.d)*.5+margin);
  }
  for(const tree of allTrees)add(grid,{tree},tree.x,tree.z,tree.crown??tree.r);
  for(const o of crossings)add(deckGrid,{object:o},o.x,o.z,Math.hypot(o.w,o.d)*.5);
  for(const piece of bridges)add(deckGrid,{piece},piece.x,piece.z,piece.w*.5+.2);
  function nearby(x,z,r){
    const found=new Set();
    for(let i=Math.floor((x-r)/size);i<=Math.floor((x+r)/size);i++)
      for(let j=Math.floor((z-r)/size);j<=Math.floor((z+r)/size);j++)
        for(const entry of grid.get(i+','+j)??[])found.add(entry);
    return found;
  }
  // Rounded rectangle vs circular capsule footprint, with an outward world-space normal.
  function shapeContact(entry,x,z,r){
    const {object:o,tree,margin=0}=entry;
    if(tree){const dx=x-tree.x,dz=z-tree.z,d=Math.hypot(dx,dz),depth=tree.r+r-d;return depth>0?{x:d?dx/d:1,z:d?dz/d:0,depth}:null;}
    const c=Math.cos(o.a),s=Math.sin(o.a),dx=x-o.x,dz=z-o.z,lx=c*dx-s*dz,lz=s*dx+c*dz;
    const hx=o.w/2+margin,hz=o.d/2+margin,qx=Math.max(-hx,Math.min(hx,lx)),qz=Math.max(-hz,Math.min(hz,lz));
    let nx=lx-qx,nz=lz-qz,d=Math.hypot(nx,nz),depth=r-d;
    if(d){nx/=d;nz/=d;}else if(hx-Math.abs(lx)<hz-Math.abs(lz)){nx=Math.sign(lx)||1;nz=0;depth=r+hx-Math.abs(lx);}else{nx=0;nz=Math.sign(lz)||1;depth=r+hz-Math.abs(lz);}
    return depth>0?{x:c*nx+s*nz,z:-s*nx+c*nz,depth}:null;
  }
  function contact(x,z,r=.30){
    let deepest=null;
    for(const entry of nearby(x,z,r)){const hit=shapeContact(entry,x,z,r);if(hit&&(!deepest||hit.depth>deepest.depth))deepest=hit;}
    if(deepest)return deepest;
    const allowed=(a,b)=>terrainBounds(a,b,r+.03)&&(deck(a,b,r)!==null||[[0,0],[-r,0],[r,0],[0,-r],[0,r]].every(([dx,dz])=>field.depth(a+dx,b+dz)<=.42));
    if(allowed(x,z))return null;
    // Sample the boundary's outward gradient; handles shorelines and unowned territory.
    let nx=0,nz=0;
    for(let i=0;i<16;i++){const a=i*Math.PI/8,dx=Math.cos(a),dz=Math.sin(a);if(allowed(x+dx*.15,z+dz*.15)){nx+=dx;nz+=dz;}}
    const length=Math.hypot(nx,nz);return length?{x:nx/length,z:nz/length,depth:.01}:{x:0,z:0,depth:.01};
  }
  function cameraBlocked(x,y,z,r=.18){
    if(y-r<(deck(x,z,r)??field.height(x,z)))return true;
    for(const entry of nearby(x,z,r)){
      if(!shapeContact(entry,x,z,r))continue;
      const o=entry.object,t=entry.tree,base=field.height(o?.x??t.x,o?.z??t.z);
      const height=o?(modelHeight(o)??(items[o.type].category==='house'?architectureHeight(items[o.type].form,o.w):Math.max(1,o.w))):Math.max(2,(t.crown??1)*2.7);
      if(y+r>base&&y-r<base+height)return true;
    }
    return false;
  }
  function solid(x,z,r,kind){
    const extra=Math.max(0,r-.75);
    for(let i=Math.floor((x-extra)/size);i<=Math.floor((x+extra)/size);i++){
      for(let j=Math.floor((z-extra)/size);j<=Math.floor((z+extra)/size);j++){
        for(const {object,tree,margin} of grid.get(i+','+j)??[]){
          const blocked=object?inFootprint(x,z,object,r+margin):
            (x-tree.x)**2+(z-tree.z)**2<((kind==='fly'?tree.crown??tree.r:tree.r)+r)**2;
          if(blocked)return true;
        }
      }
    }
    return false;
  }
  function deck(x,z,r=0){
    for(const {object:o,piece} of deckGrid.get(key(x,z))??[]){
      if(o){
        if(!inFootprint(x,z,o,-Math.min(r,.20)))continue;
        const local=Math.cos(o.a)*(x-o.x)-Math.sin(o.a)*(z-o.z);
        const anchor=field.depth(o.x,o.z)>.56?field.level:field.height(o.x,o.z);
        return anchor+bridgeRise(local,o.w)+.012;
      }
      const dx=x-piece.x,dz=z-piece.z,c=Math.cos(piece.a),s=Math.sin(piece.a);
      if(Math.abs(c*dx-s*dz)<piece.w*.5-r*.56&&Math.abs(s*dx+c*dz)<.19)return piece.h+.056;
    }
    return null;
  }
  function valid(x,z,r=.18,kind='land'){
    if(!terrainBounds(x,z,region?.coarse ? .08 : r+.03)||solid(x,z,r,kind))return false;
    if(kind==='fly')return true;
    if(kind==='land'&&deck(x,z,r)!==null)return true;
    for(const [dx,dz] of [[0,0],[-r,0],[r,0],[0,-r],[0,r]]){
      const wet=field.depth(x+dx,z+dz);
      if(kind==='water' ? wet<.67 : wet>.42)return false;
    }
    return true;
  }
  function sweep(x,z,xx,zz,r,kind){
    const n=Math.max(1,Math.ceil(Math.hypot(xx-x,zz-z)/.14));
    for(let i=1;i<=n;i++)if(!valid(x+(xx-x)*i/n,z+(zz-z)*i/n,r,kind))return false;
    return true;
  }
  function find(x,z,r,kind,limit=3.5,available=()=>true){
    if(valid(x,z,r,kind)&&available(x,z))return {x,z};
    for(let distance=.24;distance<=limit;distance+=.29)for(let i=0;i<16;i++){
      const a=i*Math.PI/8,xx=x+Math.cos(a)*distance,zz=z+Math.sin(a)*distance;
      if(valid(xx,zz,r,kind)&&available(xx,zz))return {x:xx,z:zz};
    }
    return null;
  }
  return {valid,sweep,find,contact,cameraBlocked,support:(x,z,r=.30)=>deck(x,z,r)??field.height(x,z),trees:allTrees,height(x,z){return deck(x,z)??field.height(x,z);}};
}

// The same index holds wildlife and placed animals. Flights and swimmers occupy separate layers.
export function createAnimalCrowd(){
  const cells=new Map();
  let largest=0;
  function remove(a){
    if(!a?.cell)return;
    const bucket=cells.get(a.cell);
    bucket?.delete(a);
    if(!bucket?.size)cells.delete(a.cell);
    a.cell=null;
  }
  function update(a){
    const cell=a.kind+':'+key(a.x,a.z);
    if(a.cell===cell)return;
    remove(a);
    if(!cells.has(cell))cells.set(cell,new Set());
    cells.get(cell).add(a);
    a.cell=cell;
    largest=Math.max(largest,a.r);
  }
  function clearPath(x,z,xx,zz,r,kind,ignore){
    const dx=xx-x,dz=zz-z, length=dx*dx+dz*dz;
    const reach=r+largest+.04;
    for(let i=Math.floor((Math.min(x,xx)-reach)/size);i<=Math.floor((Math.max(x,xx)+reach)/size);i++){
      for(let j=Math.floor((Math.min(z,zz)-reach)/size);j<=Math.floor((Math.max(z,zz)+reach)/size);j++){
        for(const other of cells.get(kind+':'+i+','+j)??[]){
          if(other===ignore)continue;
          const along=length?Math.max(0,Math.min(1,((other.x-x)*dx+(other.z-z)*dz)/length)):0;
          if((other.x-x-dx*along)**2+(other.z-z-dz*along)**2<(r+other.r+.04)**2)return false;
        }
      }
    }
    return true;
  }
  function contact(x,z,r,kind,ignore){
    const reach=r+largest+.04;let best=null;
    for(let i=Math.floor((x-reach)/size);i<=Math.floor((x+reach)/size);i++)for(let j=Math.floor((z-reach)/size);j<=Math.floor((z+reach)/size);j++){
      for(const other of cells.get(kind+':'+i+','+j)??[]){
        if(other===ignore)continue;
        const dx=x-other.x,dz=z-other.z,d=Math.hypot(dx,dz),depth=r+other.r+.04-d;
        if(depth>0&&(!best||depth>best.depth))best={x:d?dx/d:1,z:d?dz/d:0,depth};
      }
    }
    return best;
  }
  return {remove,update,clearPath,contact,fits(x,z,r,kind,ignore){return clearPath(x,z,x,z,r,kind,ignore);}};
}

export function makeWander(nav,x,z,r,kind,seed,radius=2,crowd){
  const initial=nav.find(x,z,r,kind,3.5,(xx,zz)=>!crowd||crowd.fits(xx,zz,r,kind));
  if(!initial)return null;
  const state={...initial,homeX:initial.x,homeZ:initial.z,r,kind,radius,heading:seed%(Math.PI*2),
    seed,clock:0,rest:0,goal:null,speed:0,gait:0,travel:0,grazing:0,grazeIntent:false,turnTo:null,crowd,random:(Math.floor(seed*137453)>>>0)||1};
  crowd?.update(state);
  return state;
}
function random(a){
  a.random=(Math.imul(a.random,1664525)+1013904223)>>>0;
  return a.random/4294967296;
}
const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const approach=(from,to,limit)=>from+Math.max(-limit,Math.min(limit,to-from));
function pause(a,min,max,graze=false){
  a.goal=null;
  a.grazeIntent=graze;
  a.speed=0;
  a.rest=min+(max-min)*random(a);
}
function chooseGoal(nav,a){
  const dx=a.homeX-a.x,dz=a.homeZ-a.z;
  const fromHome=Math.hypot(dx,dz);
  const homeward=Math.atan2(dx,dz);
  const center=fromHome>a.radius*.78?homeward:a.heading+(random(a)-.5)*1.55;
  const side=random(a)<.5?-1:1;
  for(const offset of [0,.45,-.45,.92,-.92,1.55,-1.55,2.35,-2.35,Math.PI]){
    const angle=center+offset*side;
    for(const length of [(a.profile?.stepDistance??1.0)+random(a)*(a.profile?.stepDistance??1.25),.54]){
      const x=a.x+Math.sin(angle)*length,z=a.z+Math.cos(angle)*length;
      if(Math.hypot(x-a.homeX,z-a.homeZ)>a.radius+.35)continue;
      if(!nav.sweep(a.x,a.z,x,z,a.r,a.kind)||a.crowd&&!a.crowd.clearPath(a.x,a.z,x,z,a.r,a.kind,a))continue;
      return {x,z};
    }
  }
  return null;
}
export function wander(nav,a,dt,speed){
  if(!a||dt<=0)return;
  a.clock+=dt;
  const land=a.kind==='land';
  const turnRate=a.profile?.turnRate??(land?1.35:2.15);
  a.grazing=approach(a.grazing,Number(land&&a.grazeIntent&&a.rest>.45&&a.turnTo===null),dt*1.3);
  a.gait=approach(a.gait,a.speed,dt*1.7);
  if(a.rest>0){
    a.rest=Math.max(0,a.rest-dt);
    a.speed=0;
    if(a.turnTo!==null)a.heading+=approach(0,angleDiff(a.heading,a.turnTo),dt*turnRate);
    return;
  }
  a.turnTo=null;
  if(!a.goal)a.goal=chooseGoal(nav,a);
  if(!a.goal){pause(a,.33,.87);return;}
  const dx=a.goal.x-a.x,dz=a.goal.z-a.z;
  const remaining=Math.hypot(dx,dz);
  if(remaining<.085){pause(a,a.profile?.restMin??(land?1.25:.28),a.profile?.restMax??(land?3.8:1.45),land&&random(a)<.76);return;}
  const turn=angleDiff(a.heading,Math.atan2(dx,dz));
  a.heading+=approach(0,turn,dt*turnRate);
  const facing=Math.max(0,Math.cos(turn*1.25));
  const targetSpeed=Math.min(speed,Math.sqrt(remaining*.85))*facing;
  const distance=Math.min(remaining,a.speed*dt);
  const x=a.x+Math.sin(a.heading)*distance,z=a.z+Math.cos(a.heading)*distance;
  if(!nav.sweep(a.x,a.z,x,z,a.r,a.kind)||a.crowd&&!a.crowd.clearPath(a.x,a.z,x,z,a.r,a.kind,a)){
    pause(a,.26,.81);
    return;
  }
  a.x=x;a.z=z;a.travel+=distance;
  a.speed=approach(a.speed,targetSpeed,dt*(targetSpeed<a.speed?1.55:.72));
  a.crowd?.update(a);
}
