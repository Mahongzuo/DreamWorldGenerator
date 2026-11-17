import {Vector3} from 'three';
import {buildFenceStroke} from './sandbox-model.js';
import {disposeGroup} from './model.js';
import {LAND} from './sandbox-state.js';
import {strokeBounds,overlapsBounds} from './edit-bounds.js';

export function createFencePreview(kit){
  const replacements=[];
  function clear(){
    const changed=replacements.length>0;
    for(const {original,preview} of replacements){
      if(original)original.visible=true;
      if(preview)disposeGroup(preview);
    }
    replacements.length=0;
    return changed;
  }
  function show(tiles,stroke){
    clear();
    const bounds=strokeBounds(stroke);
    for(const tile of tiles){
      const {x,z}=tile.position;
      const {field,world,region,fences}=tile.userData;
      const original=fences.get(stroke.id);
      if(original)original.visible=false;
      let preview;
      if(!region||overlapsBounds(bounds,{x0:x-LAND.x,x1:x+LAND.x,z0:z-LAND.z,z1:z+LAND.z})){
        const local=x||z?{...stroke,p:stroke.p.map(([px,pz])=>[px-x,pz-z])}:stroke;
        preview=buildFenceStroke(kit,local,world,field,region);
        tile.add(preview);
      }
      if(original||preview)replacements.push({original,preview});
    }
  }
  return {show,clear};
}

// Test the actual visible rails and posts in screen pixels. A narrow fence
// remains easy to pick at any zoom, including where it runs beside a building.
export function pickFence(tiles,camera,ray,rect,event,objectHitDistance){
  const px=event.clientX-rect.left,py=event.clientY-rect.top;
  let best=(event.pointerType==='touch'?13:7)**2,depth=Infinity,id=null;
  const a=new Vector3(),b=new Vector3(),worldA=new Vector3(),worldB=new Vector3();
  function segment(tile,start,end,h1,h2,fenceId){
    const {x,z}=tile.position;
    worldA.set(start[0]+x,start[1]+h1,start[2]+z);
    worldB.set(end[0]+x,end[1]+h2,end[2]+z);
    a.copy(worldA).project(camera);b.copy(worldB).project(camera);
    const ax=(1+a.x)*rect.width/2,ay=(1-a.y)*rect.height/2;
    const dx=(b.x-a.x)*rect.width/2,dy=(a.y-b.y)*rect.height/2;
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));
    const d=(ax+t*dx-px)**2+(ay+t*dy-py)**2;
    if(d>best)return;
    const dist=worldA.lerp(worldB,t).distanceToSquared(ray.origin);
    if(dist>objectHitDistance||d===best&&dist>=depth)return;
    best=d;depth=dist;id=fenceId;
  }
  for(const tile of tiles){
    for(const [fenceId,group] of tile.userData.fences){
      if(!group.visible)continue;
      for(const post of group.userData.fencePosts)segment(tile,post,post,0,.95,fenceId);
      for(const [a,b] of group.userData.fenceRails){
        segment(tile,a,b,.28,.28,fenceId);segment(tile,a,b,.67,.67,fenceId);
      }
    }
  }
  return id;
}
