import {items,round,tileKey,LAND} from './sandbox-state.js';
import {sceneDesigns} from './scene-designs.js';
import {appendRegion,joinRegions} from './territory.js';
export {sceneDesigns};
export function createScene(id){
 const design=sceneDesigns[id];if(!design)throw Error('Unknown scene');
 let next=1;
 return {v:2,theme:design.theme,scene:id,seed:design.seed,season:'summer',light:'day',felled:[],
  objects:design.objects.map(([type,x,z,scale=1,a=0])=>({id:next++,type,x,z,w:round(items[type].width*scale),d:round((items[type].depth??items[type].width)*scale),a:round(a)})),
  strokes:design.strokes.map(([type,p,w])=>({id:next++,type,w,p:p.map(point=>[...point])}))};
}
// Choose a vacant connected frontier, never replace a user's existing plot.
export function sceneDestination(world,focus={x:0,z:0}){
 const candidates=new Map();
 for(const key of Object.keys(world.regions)){
  const [x,z]=key.split(',').map(Number);
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const xx=x+dx,zz=z+dz,k=tileKey(xx,zz);
   if(Math.abs(xx)<=99999&&Math.abs(zz)<=99999&&!world.regions[k])candidates.set(k,{x:xx,z:zz});
  }
 }
 const ordered=[...candidates.values()].sort((a,b)=>Math.abs(a.x-focus.x)+Math.abs(a.z-focus.z)-Math.abs(b.x-focus.x)-Math.abs(b.z-focus.z)||b.x-a.x||b.z-a.z);
 // A neighboring building can cross the boundary. Keep its footprint clear too.
 const free=ordered.find(({x,z})=>!world.objects.some(o=>{
  const r=Math.hypot(o.w,o.d)/2;
  return Math.abs(o.x-x*30)<LAND.x+r&&Math.abs(o.z-z*22.8)<LAND.z+r;
 }));
 if(!free)throw Error('相邻空地不足，请先向外扩建后再生成场景');
 return free;
}
export function appendScene(current,id,focus){
 const world=current.regions?current:joinRegions([[0,0,current]]);
 const destination=sceneDestination(world,focus);
 const next=appendRegion(world,createScene(id),destination.x,destination.z);
 return {world:next,...destination};
}
