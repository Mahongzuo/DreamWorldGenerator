import {isRoadEdit} from './road-coverage.js';

// Bounds stay in world coordinates until a terrain tile is actually repainted.
export function strokeBounds(stroke,from=0){
  const r=stroke.w/2+.06;
  let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;
  for(let i=from;i<stroke.p.length;i++){
    const [x,z]=stroke.p[i];
    x0=Math.min(x0,x-r);z0=Math.min(z0,z-r);
    x1=Math.max(x1,x+r);z1=Math.max(z1,z+r);
  }
  return {x0,z0,x1,z1};
}
export function objectBounds(o,pad=0){
  const c=Math.abs(Math.cos(o.a)),s=Math.abs(Math.sin(o.a));
  const dx=(c*o.w+s*o.d)/2+pad,dz=(s*o.w+c*o.d)/2+pad;
  return {x0:o.x-dx,z0:o.z-dz,x1:o.x+dx,z1:o.z+dz};
}
export function overlapsBounds(a,b){
  return a.x0<=b.x1&&a.x1>=b.x0&&a.z0<=b.z1&&a.z1>=b.z0;
}
export function roadEditAreas(old,next){
  if(!old||old.strokes===next.strokes||old.objects!==next.objects||
    ['regions','seed','theme','season','biome','scene','felled'].some(k=>old[k]!==next[k]))return null;
  const before=old.strokes,after=next.strokes;
  let first=0,lastOld=before.length,lastNew=after.length;
  while(first<lastOld&&first<lastNew&&before[first]===after[first])first++;
  while(lastOld>first&&lastNew>first&&before[lastOld-1]===after[lastNew-1]){lastOld--;lastNew--;}
  const edits=[...before.slice(first,lastOld),...after.slice(first,lastNew)];
  return edits.length&&edits.every(stroke=>isRoadEdit(stroke.type))?edits.map(stroke=>strokeBounds(stroke)):null;
}
export function changedAreas(old,next){
  const areas=[];
  function changes(before,after,bounds){
    if(before===after)return;
    const oldById=new Map(before.map(entry=>[entry.id,entry]));
    for(const entry of after){
      const prev=oldById.get(entry.id);
      if(prev!==entry){
        if(prev)areas.push(bounds(prev));
        areas.push(bounds(entry));
      }
      oldById.delete(entry.id);
    }
    for(const entry of oldById.values())areas.push(bounds(entry));
  }
  changes(old.strokes,next.strokes,strokeBounds);
  changes(old.objects,next.objects,o=>objectBounds(o,1));
  return areas;
}
