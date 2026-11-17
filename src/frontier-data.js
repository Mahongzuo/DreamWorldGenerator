import {LAND,tileKey,wildTile} from './sandbox-state.js';
import {neighborPorts,connectScene} from './scene-connections.js';

const directions=[[1,0,'东'],[0,1,'南'],[-1,0,'西'],[0,-1,'北']];
export function frontierEdges(world,focus){
  const choices=new Map();
  for(const key of Object.keys(world.regions??{})){
    const [x,z]=key.split(',').map(Number);
    for(const [dx,dz,name] of directions){
      const nx=x+dx,nz=z+dz,distance=Math.abs(x-focus.x)+Math.abs(z-focus.z);
      if(Math.abs(nx)>99999||Math.abs(nz)>99999||world.regions[tileKey(nx,nz)])continue;
      const id=tileKey(nx,nz);
      if(choices.has(id)&&choices.get(id).distance<=distance)continue;
      choices.set(id,{x:nx,z:nz,dx,dz,name,distance,edgeX:(x+.5*dx)*2*LAND.x,edgeZ:(z+.5*dz)*2*LAND.z});
    }
  }
  const ordered=[...choices.values()].sort((a,b)=>a.distance-b.distance);
  return ordered.filter(e=>e.distance===ordered[0]?.distance);
}
export function previewExpansion(world,edge){
  if(world.regions[tileKey(edge.x,edge.z)])return null;
  const local=connectScene(world,wildTile('LINQI-ATLAS',edge.x,edge.z),edge.x,edge.z);
  return {local,ports:neighborPorts(world,edge.x,edge.z),edge};
}

