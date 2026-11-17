import {MAX_POINTS,round} from './sandbox-state.js';

// A knot refers to a sample of the original stroke. Keeping the indices in the
// save means pulling a corner straight never makes its handle disappear.
export function validFenceKnots(points,knots){
  return Array.isArray(knots)&&knots.length>0&&knots[0]===0&&knots.at(-1)===points.length-1&&
    knots.every((k,i)=>Number.isInteger(k)&&(i===0||k>knots[i-1]));
}

function cumulativeLength(points){
  const length=[0];
  for(let i=1;i<points.length;i++){
    const [x,z]=points[i], [xx,zz]=points[i-1];
    length.push(length[i-1]+Math.hypot(x-xx,z-zz));
  }
  return length;
}

// Keep turns where taking a straight shortcut would move the fence by over
// 20 cm. A densely sampled straight brush stroke only needs a few handles.
function findCorners(points){
  const corners=[0];
  function split(a,b){
    const [x,z]=points[a],dx=points[b][0]-x,dz=points[b][1]-z;
    const span=dx*dx+dz*dz;
    let farthest=-1,limit=.2**2;
    for(let i=a+1;i<b;i++){
      const ox=points[i][0]-x,oz=points[i][1]-z;
      const t=span?Math.max(0,Math.min(1,(ox*dx+oz*dz)/span)):0;
      const d=(ox-t*dx)**2+(oz-t*dz)**2;
      if(d>limit){farthest=i;limit=d;}
    }
    if(farthest>=0){split(a,farthest);split(farthest,b);}
    else corners.push(b);
  }
  if(points.length>1)split(0,points.length-1);
  return corners;
}

export function prepareFencePath(stroke){
  if(validFenceKnots(stroke.p,stroke.knots))return stroke;
  const points=stroke.p.filter(([x,z],i,p)=>!i||x!==p[i-1][0]||z!==p[i-1][1]);
  if(points.length<2)return {...stroke,p:points,knots:points.length?[0]:[]};
  const corners=findCorners(points),length=cumulativeLength(points);
  const knotIndices=new Set(corners),insertions=new Map();
  let room=MAX_POINTS-points.length;
  for(let k=1;k<corners.length;k++){
    const start=corners[k-1],end=corners[k],span=length[end]-length[start];
    const steps=Math.min(MAX_POINTS-1,Math.max(Math.ceil(span/3.5),corners.length===2&&span>=1.75?2:1));
    let index=start+1;
    for(let step=1;step<steps;step++){
      const target=length[start]+span*step/steps;
      while(index<end&&length[index]<target)index++;
      const near=target-length[index-1]<length[index]-target?index-1:index;
      if(Math.abs(length[near]-target)<=.32||room<=0){knotIndices.add(near);continue;}
      const t=(target-length[index-1])/(length[index]-length[index-1]);
      const [x,z]=points[index-1],[xx,zz]=points[index];
      const extra=insertions.get(index)??[];
      extra.push([round(x+(xx-x)*t),round(z+(zz-z)*t)]);
      insertions.set(index,extra);room--;
    }
  }
  const p=[],knots=[];
  for(let i=0;i<points.length;i++){
    for(const extra of insertions.get(i)??[]){knots.push(p.length);p.push(extra);}
    if(knotIndices.has(i))knots.push(p.length);
    p.push(points[i]);
  }
  return {...stroke,p,knots};
}

function isClosedFence(p){
  if(p.length<3)return false;
  const [x,z]=p[0],last=p.at(-1);
  return last[0]===x&&last[1]===z&&p.some(([px,pz])=>px!==x||pz!==z);
}

export function fenceHandleIndices(prepared){
  return isClosedFence(prepared.p)?prepared.knots.slice(0,-1):prepared.knots;
}

export function moveFenceKnot(stroke,index,x,z){
  const prepared=prepareFencePath(stroke),{p,knots}=prepared;
  if(!knots.includes(index)||!Number.isFinite(x)||!Number.isFinite(z))return prepared;
  const dx=round(x)-p[index][0],dz=round(z)-p[index][1];
  if(Math.abs(dx)<.00001&&Math.abs(dz)<.00001)return prepared;
  const length=cumulativeLength(p),updated=p.slice();
  const seam=(index===0||index===p.length-1)&&isClosedFence(p);
  const moving=new Set(seam?[0,p.length-1]:[index]);
  for(const i of moving)updated[i]=[round(x),round(z)];
  for(let k=1;k<knots.length;k++){
    const a=knots[k-1],b=knots[k],from=Number(moving.has(a)),to=Number(moving.has(b));
    if(!from&&!to)continue;
    const span=length[b]-length[a];
    for(let i=a+1;i<b;i++){
      const t=span?(length[i]-length[a])/span:(i-a)/(b-a);
      const weight=(1-t)*from+t*to;
      updated[i]=[round(p[i][0]+dx*weight),round(p[i][1]+dz*weight)];
    }
  }
  return {...prepared,p:updated};
}
