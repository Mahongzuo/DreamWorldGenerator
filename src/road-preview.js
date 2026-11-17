import {Group} from 'three';
import {LAND} from './sandbox-state.js';
import {resolveCabinLayout} from './cabin-layout.js';
import {disposeGroup} from './model.js';
import {buildObject,updateRoadDetails,updateRoadSurface,updateRoadVegetation,withRoadCoverage} from './sandbox-model.js';
import {objectBounds,overlapsBounds,strokeBounds} from './edit-bounds.js';

// Preview shares the live terrain. Only the edited vertices, road batches on
// touched tiles and cabins whose doorway changes need replacements.
export function createRoadPreview(kit,scene,objects){
  const tiles=new Map(),cabins=new Map();
  let previous=null,pointCount=0;
  function clear(){
    for(const [tile,preview] of tiles){
      const {surface,field,vegetation}=tile.userData;
      const {x0,z0,x1,z1}=preview.bounds;
      updateRoadSurface(surface,field,x0,z0,x1,z1);
      if(vegetation)updateRoadVegetation(vegetation,field,[preview.bounds]);
      disposeGroup(preview.details);
      for(const original of preview.hidden)original.visible=true;
    }
    for(const [id,preview] of cabins){
      disposeGroup(preview);
      const entry=objects.get(id);if(entry)entry.group.visible=true;
    }
    tiles.clear();cabins.clear();previous=null;pointCount=0;
  }
  function show(world,land,continuous,brush){
    if(brush===previous&&brush.p.length===pointCount)return;
    if(brush!==previous)clear();
    const dirty=strokeBounds(brush,Math.max(0,pointCount-3));
    previous=brush;pointCount=brush.p.length;
    const stroke={...brush,p:brush.p.slice()};
    const draftWorld={...world,strokes:[...world.strokes,stroke]};
    for(const tile of continuous?land.children:[land]){
      const {surface,world:local,region,field,roadDetails,vegetation}=tile.userData;
      const {x,z}=tile.position;
      if(!overlapsBounds(dirty,{x0:x-LAND.x-1,x1:x+LAND.x+1,z0:z-LAND.z-1,z1:z+LAND.z+1}))continue;
      const localBrush=x||z?{...stroke,p:stroke.p.map(([px,pz])=>[px-x,pz-z])}:stroke;
      const next={...local,strokes:[...local.strokes,localBrush]};
      const previewField=withRoadCoverage(field,next.strokes);
      const bounds={x0:dirty.x0-x,z0:dirty.z0-z,x1:dirty.x1-x,z1:dirty.z1-z};
      updateRoadSurface(surface,previewField,bounds.x0,bounds.z0,bounds.x1,bounds.z1);
      if(vegetation)updateRoadVegetation(vegetation,previewField,[bounds]);
      let preview=tiles.get(tile);
      if(!preview){
        preview={details:new Group(),bounds:{...bounds},hidden:new Set()};
        tile.add(preview.details);tiles.set(tile,preview);
      }else{
        const total=preview.bounds;
        total.x0=Math.min(total.x0,bounds.x0);total.z0=Math.min(total.z0,bounds.z0);
        total.x1=Math.max(total.x1,bounds.x1);total.z1=Math.max(total.z1,bounds.z1);
      }
      updateRoadDetails(kit,next,previewField,region,preview.details,[bounds],key=>{
        const original=roadDetails.userData.cells.get(key)?.group;
        if(original?.visible){original.visible=false;preview.hidden.add(original);}
      });

    }
    for(const [id,{group,object:o}] of objects){
      if(o.type!=='cedar'||!overlapsBounds(dirty,objectBounds(o,1)))continue;
      const layout=resolveCabinLayout(o,draftWorld,land.userData.field);
      const old=cabins.get(id),prior=(old??group).userData.cabinLayout;
      if(prior.entry.side===layout.entry.side&&prior.entry.u===layout.entry.u)continue;
      if(old)disposeGroup(old);
      const mesh=buildObject(kit,o,draftWorld,land.userData.field,layout);
      group.visible=false;scene.add(mesh);cabins.set(id,mesh);
    }
  }
  return {show,clear};
}
