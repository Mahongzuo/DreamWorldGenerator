import {inside,inFootprint,isSolid,isTree,items,tileInside} from './sandbox-state.js';
import {bridgeRise} from './asset-models.js';

const size=3;
const key=(x,z)=>Math.floor(x/size)+','+Math.floor(z/size);
export function createNavigation(world,field,region,trees,bridges){
  const grid=new Map(), deckGrid=new Map(), terrainBounds=region?tileInside:inside;
  const obstacles=world.objects.filter(o=>isSolid(o)||isTree(o.type));
  const crossings=obstacles.filter(o=>items[o.type].form==='bridge');
  const allTrees=[...trees,...obstacles.filter(o=>isTree(o.type)).map(o=>({x:o.x,z:o.z,r:o.w*.10,id:o.id,type:o.type,crown:o.w*.62}))];
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
    add(grid,{object:o,margin},o.x,o.z,Math.hypot(o.w,o.d)*.5+margin);
  }
  for(const tree of allTrees)add(grid,{tree},tree.x,tree.z,tree.crown??tree.r);
  for(const o of crossings)add(deckGrid,{object:o},o.x,o.z,Math.hypot(o.w,o.d)*.5);
  for(const piece of bridges)add(deckGrid,{piece},piece.x,piece.z,piece.w*.5+.2);
  function solid(x,z,r,kind){
    return (grid.get(key(x,z))??[]).some(({object,tree,margin})=>object?inFootprint(x,z,object,r+margin):
      (x-tree.x)**2+(z-tree.z)**2<((kind==='fly'?tree.crown??tree.r:tree.r)+r)**2);
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
  function find(x,z,r,kind,limit=3.5){
    if(valid(x,z,r,kind))return {x,z};
    for(let distance=.24;distance<=limit;distance+=.29)for(let i=0;i<16;i++){
      const a=i*Math.PI/8,xx=x+Math.cos(a)*distance,zz=z+Math.sin(a)*distance;
      if(valid(xx,zz,r,kind))return {x:xx,z:zz};
    }
    return null;
  }
  return {valid,sweep,find,trees:allTrees,height(x,z){return deck(x,z)??field.height(x,z);}};
}

export function makeWander(nav,x,z,r,kind,seed,radius=2){
  const initial=nav.find(x,z,r,kind);
  if(!initial)return null;
  return {...initial,homeX:initial.x,homeZ:initial.z,r,kind,radius,heading:seed,seed,clock:0,rest:0};
}
export function wander(nav,a,dt,speed){
  if(!a||dt<=0)return;
  a.clock+=dt;
  if(a.rest>0){a.rest=Math.max(0,a.rest-dt);return;}
  const dx=a.homeX-a.x,dz=a.homeZ-a.z;
  const target=Math.hypot(dx,dz)>a.radius?Math.atan2(dx,dz):a.heading+Math.sin(a.clock*.87+a.seed)*dt*.86;
  const step=dt*speed;
  for(const offset of [0,.54,-.54,1.12,-1.12,1.72,-1.72,Math.PI]){
    const angle=target+offset,xx=a.x+Math.sin(angle)*step,zz=a.z+Math.cos(angle)*step;
    if(!nav.sweep(a.x,a.z,xx,zz,a.r,a.kind))continue;
    a.x=xx;a.z=zz;a.heading=angle;
    return;
  }
  a.heading+=.91;
}
