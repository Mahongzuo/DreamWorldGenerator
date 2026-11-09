import {LAND, round, tileKey, tileShift, normalize, MAX_OBJECTS, MAX_STROKES} from './sandbox-state.js';

export const TERRITORY_KEY='linqi-continuous-v1';
export const regionAt=(x,z)=>[Math.floor((x+LAND.x)/(LAND.x*2)),Math.floor((z+LAND.z)/(LAND.z*2))];
export function contains(regions,x,z,margin=0){
  const [ax,az]=regionAt(x-margin,z-margin),[bx,bz]=regionAt(x+margin,z+margin);
  for(let a=ax;a<=bx;a++)for(let b=az;b<=bz;b++)if(!Object.hasOwn(regions,tileKey(a,b)))return false;
  return true;
}
export function appendRegion(world,local,x,z){
  const key=tileKey(x,z);
  if(world.regions[key])return world;
  const [sx,sz]=tileShift(x,z);
  let id=Math.max(0,...world.objects.map(o=>o.id),...world.strokes.map(s=>s.id))+1;
  const {objects,strokes,game,...meta}=local;
  return {...world,regions:{...world.regions,[key]:meta},
    objects:[...world.objects,...objects.map(o=>({...o,id:id++,x:round(o.x+sx),z:round(o.z+sz)}))],
    strokes:[...world.strokes,...strokes.map(s=>({...s,id:id++,p:s.p.map(([px,pz])=>[round(px+sx),round(pz+sz)])}))]};
}
export function joinRegions(entries){
  let world={...entries[0][2],regions:{},objects:[],strokes:[]};
  for(const [x,z,local] of entries)world=appendRegion(world,local,x,z);
  return world;
}
export function normalizeTerritory(data){
  if(!data||data.format!==1||!data.world?.regions)return null;
  const regions={};
  for(const [key,value] of Object.entries(data.world.regions)){
    const coords=key.split(',').map(Number);
    if(coords.length!==2||!coords.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=100000)||tileKey(...coords)!==key)return null;
    const meta=normalize({...value,objects:[],strokes:[]});
    if(!meta)return null;
    const {objects,strokes,game,...rest}=meta;regions[key]=rest;
  }
  const count=Object.keys(regions).length;
  if(!count||!regions['0,0'])return null;
  const world=normalize(data.world,{coordinateLimit:3000015,maxObjects:MAX_OBJECTS*count,maxStrokes:MAX_STROKES*count});
  return world?{...world,regions}:null;
}
const overlaps=(min,max,center,half)=>max>=center-half&&min<=center+half;
export function sliceRegion(world,x,z){
  const [sx,sz]=tileShift(x,z),meta=world.regions[tileKey(x,z)];
  if(!meta)return null;
  return {...meta,season:world.season,light:world.light,
    objects:world.objects.filter(o=>Math.abs(o.x-sx)<=LAND.x+Math.hypot(o.w,o.d)/2+2&&Math.abs(o.z-sz)<=LAND.z+Math.hypot(o.w,o.d)/2+2)
      .map(o=>({...o,x:o.x-sx,z:o.z-sz})),
    strokes:world.strokes.filter(s=>{
      const xx=s.p.map(p=>p[0]),zz=s.p.map(p=>p[1]);
      return overlaps(Math.min(...xx)-s.w,Math.max(...xx)+s.w,sx,LAND.x)&&overlaps(Math.min(...zz)-s.w,Math.max(...zz)+s.w,sz,LAND.z);
    }).map(s=>({...s,p:s.p.map(([px,pz])=>[px-sx,pz-sz])}))};
}
export function territoryEnvelope(world){return {format:1,world};}
