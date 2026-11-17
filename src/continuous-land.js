import * as T from 'three';
import {buildLand,makeField,refreshLandRoads} from './sandbox-model.js';
import {disposeGroup} from './model.js';
import {createNavigation} from './navigation.js';
import {contains,regionAt,sliceRegion} from './territory.js';
import {changedAreas,overlapsBounds} from './edit-bounds.js';
import {tileKey,tileShift,continentHeight,LAND,items,themes,biomes} from './sandbox-state.js';

// Global design data stays intact; only nearby terrain and its decoration reach the GPU.
export function createContinuousLand(kit){
  const group=new T.Group(),cache=new Map(),fields=new Map();
  let current,quality;
  const level=.20;
  function localField(x,z){
    const key=tileKey(x,z);
    if(fields.has(key))return fields.get(key);
    const local=sliceRegion(current,x,z);
    if(!local)return null;
    const field=makeField(local,{x,z,continuous:true});
    fields.set(key,field);
    if(fields.size>32)fields.delete(fields.keys().next().value);
    return field;
  }
  function sample(x,z,method){
    const [rx,rz]=regionAt(x,z),[sx,sz]=tileShift(rx,rz);
    return localField(rx,rz)?.[method](x-sx,z-sz);
  }
  const field={level,height:(x,z)=>sample(x,z,'height')??continentHeight(x,z),depth:(x,z)=>sample(x,z,'depth')??0,
    paint:(x,z)=>sample(x,z,'paint'),type:(channel,x,z)=>{
      const [rx,rz]=regionAt(x,z),[sx,sz]=tileShift(rx,rz);return localField(rx,rz)?.type(channel,x-sx,z-sz)??0;
    }};
  const paletteCache=new Map();
  function tint(x,z){
    const [rx,rz]=regionAt(x,z),[sx,sz]=tileShift(rx,rz),lx=x-sx,lz=z-sz;
    const nx=lx<0?-1:1,nz=lz<0?-1:1;
    const wx=Math.max(0,1-(LAND.x-Math.abs(lx))/2.4)*.5,wz=Math.max(0,1-(LAND.z-Math.abs(lz))/2.4)*.5;
    const base=current.regions[tileKey(rx,rz)]??current;
    const colorAt=(a,b)=>{
      const meta=current.regions[tileKey(a,b)]??base;
      const colors=current.season==='winter'?['#c3d4cc','#dce4d7','#a6beb5']:current.season==='autumn'?['#9f995f','#b7aa74','#838e5c']:(meta.biome?biomes[meta.biome].colors:themes[meta.theme].colors);
      const key=colors.join('/');
      if(!paletteCache.has(key))paletteCache.set(key,colors.map(c=>new T.Color(c)));
      const palette=paletteCache.get(key);
      return palette[0].clone().lerp(palette[1],.45+.39*Math.sin(x*.32+z*.42)).lerp(palette[2],.23+.20*Math.cos(z*.61-x*.37));
    };
    return colorAt(rx,rz).lerp(colorAt(rx+nx,rz),wx).lerp(colorAt(rx,rz+nz).lerp(colorAt(rx+nx,rz+nz),wx),wz);
  }
  function update(world,focus,detail,roadChanges=null){
    const previous=current;
    if(!current||current.regions!==world.regions||current.season!==world.season)fields.clear();
    else if(current.objects!==world.objects||current.strokes!==world.strokes){
      const changes=changedAreas(current,world);
      for(const key of fields.keys()){
        const [sx,sz]=tileShift(...key.split(',').map(Number));
        const bounds={x0:sx-LAND.x-1,x1:sx+LAND.x+1,z0:sz-LAND.z-1,z1:sz+LAND.z+1};
        if(changes.some(area=>overlapsBounds(bounds,area)))fields.delete(key);
      }
    }
    current=world;
    if(quality!==detail){for(const entry of cache.values())disposeGroup(entry.land);cache.clear();quality=detail;}
    const wanted=new Set(),trees=[],bridges=[];
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=focus.x+dx,z=focus.z+dz,key=tileKey(x,z),local=sliceRegion(world,x,z);
      if(!local)continue;
      wanted.add(key);
      const coarse=detail==='low'||dx!==0||dz!==0;
      const signature=JSON.stringify({...local,objects:local.objects.filter(o=>items[o.type].category!=='animal'),coarse,neighborThemes:[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>world.regions[tileKey(x+dx,z+dz)]?.theme)});
      let entry=cache.get(key);
      if(entry?.signature!==signature){
        const [sx,sz]=tileShift(x,z),raw=localField(x,z);
        const stitched={...raw,height:(px,pz)=>field.height(px+sx,pz+sz),depth:(px,pz)=>field.depth(px+sx,pz+sz)};
        const region={x,z,coarse,resolution:detail==='low'?32:62,continuous:true,field:stitched,tint:(px,pz)=>tint(px+sx,pz+sz)};
        if(roadChanges&&entry?.world===previous&&entry.land.userData.region.coarse===coarse){
          const localChanges=roadChanges.map(a=>({x0:a.x0-sx,x1:a.x1-sx,z0:a.z0-sz,z1:a.z1-sz}));
          refreshLandRoads(kit,entry.land,local,region,localChanges);
          entry.signature=signature;
        }else{
          if(entry)disposeGroup(entry.land);
          const land=buildLand(kit,local,region);
          land.position.set(sx,0,sz);group.add(land);
          entry={signature,land};cache.set(key,entry);
        }
      }
      entry.world=world;
      if(entry.land.parent!==group)group.add(entry.land);
      cache.delete(key);cache.set(key,entry);
      const [sx,sz]=tileShift(x,z);
      for(const tree of entry.land.userData.navigation.trees)if(tree.id===undefined)trees.push({...tree,x:tree.x+sx,z:tree.z+sz,region:key});
      for(const piece of entry.land.userData.bridges)bridges.push({...piece,x:piece.x+sx,z:piece.z+sz});
    }
    // Keep at most the same nine terrain meshes. At an outer edge, spare slots
    // hold the last strip so walking back does not allocate it again.
    for(const [key,entry] of cache){
      if(wanted.has(key))continue;
      entry.land.removeFromParent();
      if(cache.size>9||!world.regions[key]){disposeGroup(entry.land);cache.delete(key);}
    }
    const bounds=(x,z,r)=>contains(world.regions,x,z,r)&&Math.abs(regionAt(x,z)[0]-focus.x)<=1&&Math.abs(regionAt(x,z)[1]-focus.z)<=1;
    group.userData={field,navigation:createNavigation(world,field,{bounds},trees,bridges),visible: o=>Math.abs(o.x-focus.x*30)<=LAND.x*3+5&&Math.abs(o.z-focus.z*22.8)<=LAND.z*3+5};
    return group;
  }
  function clear(){
    for(const entry of cache.values())disposeGroup(entry.land);
    group.removeFromParent();cache.clear();fields.clear();current=null;
  }
  return {update,group,clear};
}
