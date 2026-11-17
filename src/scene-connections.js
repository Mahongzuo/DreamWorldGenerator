import {items,inFootprint,tileShift,LAND} from './sandbox-state.js';
import {layoutGuide} from './layout-guide.js';
import {createRoadCoverage, crossSection, isRoadPaint, smoothPoints} from './road-coverage.js';
export const channel=s=>isRoadPaint(s.type)?'road':items[s.type]?.category==='water'?'river':null;
export function distanceToStroke(x,z,s){
 let best=Infinity,point;
 for(let i=0;i<s.p.length;i++){
  const a=s.p[i],b=s.p[i+1]??a,dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
  const t=den?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/den)):0,p=[a[0]+dx*t,a[1]+dz*t],d=Math.hypot(x-p[0],z-p[1]);
  if(d<best){best=d;point=p;}
 }
 return {distance:best,point};
}
// Mouths inferred from a nearby endpoint may stop a little short of a tile edge.
function roadMouths(roads,stroke,p,anchor,axis){
 const tangent=1-axis, steps=Math.ceil(Math.abs(p[axis]-anchor[axis])/.1);
 const strips=crossSection(stroke.w,offset=>{
  const x=anchor[0]+(tangent===0?offset:0), z=anchor[1]+(tangent===1?offset:0);
  if(roads.strokeAt(x,z)!==stroke)return false;
  for(let j=1;j<=steps;j++){
   const edit=roads.editAt(x+(p[0]-anchor[0])*j/steps,z+(p[1]-anchor[1])*j/steps);
   if(edit?.type==='road-erase')return false;
  }
  return true;
 });
 return strips.filter(([lo,hi])=>hi-lo>=.55-.001).map(([lo,hi])=>{
  const offset=(lo+hi)/2,edge=[...p],join=[...anchor];
  edge[tangent]+=offset;join[tangent]+=offset;
  return {p:edge,anchor:join,w:Math.max(.55,hi-lo)};
 });
}

function remainingMouth(p,anchor,axis,width,edits,index){
 // Along the lip, check which strips are still wet all the way from the old endpoint.
 const tangent=1-axis,steps=17,travel=Math.max(1,Math.ceil(Math.hypot(p[0]-anchor[0],p[1]-anchor[1])/.25));
 const segments=[];
 let run=null;
 for(let i=0;i<steps;i++){
  const offset=((i+.5)/steps-.5)*width;
  let wet=true;
  for(let j=0;wet&&j<=travel;j++){
   const point=[anchor[0]+(p[0]-anchor[0])*j/travel,anchor[1]+(p[1]-anchor[1])*j/travel];
   point[tangent]+=offset;
   for(const edit of edits){
    if(edit.index<=index)break;
    if(distanceToStroke(point[0],point[1],edit.stroke).distance>edit.stroke.w*.5)continue;
    wet=edit.stroke.type!=='shore-fill';break;
   }
  }
  if(wet){
   if(!run){run={from:i,to:i+1};segments.push(run);}
   else run.to=i+1;
  }else run=null;
 }
 if(!segments.length)return null;
 const mid=steps/2;
 const open=segments.find(r=>r.from<mid&&r.to>mid)??segments.sort((a,b)=>(b.to-b.from)-(a.to-a.from))[0];
 if(open.from===0&&open.to===steps)return {p,anchor,w:width};
 const offset=((open.from+open.to)/(2*steps)-.5)*width,edge=[...p],join=[...anchor];
 edge[tangent]+=offset;join[tangent]+=offset;
 return {p:edge,anchor:join,w:Math.max(.55,width*(open.to-open.from)/steps)};
}

// Ports are inferred from editable strokes, so hand-drawn roads and rivers also connect.
export function neighborPorts(world,x,z){
 const [sx,sz]=tileShift(x,z),ports=[];
 const roads=createRoadCoverage(world.strokes),roadPoints=new Map(roads.paths.map(({stroke,points})=>[stroke,points]));
 let lastFill=-1;
 const edits=[];
 for(let i=world.strokes.length-1;i>=0;i--){
  if(world.strokes[i].type==='shore-fill'){lastFill=i;break;}
 }
 if(lastFill>=0)for(let index=world.strokes.length-1;index>=0;index--){
  const stroke=world.strokes[index];
  if(stroke.type!=='shore-fill'&&channel(stroke)!=='river')continue;
  const xs=stroke.p.map(p=>p[0]),zs=stroke.p.map(p=>p[1]),mx=LAND.x+stroke.w+4,mz=LAND.z+stroke.w+4;
  if(Math.min(...xs)>sx+mx||Math.max(...xs)<sx-mx||Math.min(...zs)>sz+mz||Math.max(...zs)<sz-mz)continue;
  edits.push({index,stroke:{...stroke,p:smoothPoints(stroke.p)}});
 }
 for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
  if(!world.regions[`${x+dx},${z+dz}`])continue;
  const axis=dx?0:1,edge=axis===0?sx+dx*LAND.x:sz+dz*LAND.z,tangent=axis===0?sz:sx,half=axis===0?LAND.z:LAND.x;
  for(const [index,s] of world.strokes.entries()){
   const kind=channel(s);if(!kind)continue;
   const points=[],path=roadPoints.get(s)??s.p;
   for(let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1];if((a[axis]-edge)*(b[axis]-edge)>0||a[axis]===b[axis])continue;
    const t=(edge-a[axis])/(b[axis]-a[axis]);if(t<0||t>1)continue;
    const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];points.push({p,anchor:p});
   }
   for(const p of [s.p[0],s.p.at(-1)]){
    const outside=(p[axis]-edge)*(dx||dz);
    if(outside>=-.05&&outside<=3.1){const q=[...p];q[axis]=edge;points.push({p:q,anchor:p});}
   }
   for(const endpoint of points){
    let mouths=[{...endpoint,w:s.w}];
    if(kind==='road')mouths=roadMouths(roads,s,endpoint.p,endpoint.anchor,axis);
    else if(index<lastFill)mouths=[remainingMouth(endpoint.p,endpoint.anchor,axis,s.w,edits,index)];
    for(const mouth of mouths){
     if(!mouth)continue;
     const {p,anchor,w}=mouth;
     if(Math.abs(p[1-axis]-tangent)>half-1.2)continue;
     // Adjacent materials or two surviving sides of a split road are distinct ports.
     const duplicate=ports.some(q=>q.kind===kind&&q.dx===dx&&q.dz===dz&&
       Math.abs(q.p[1-axis]-p[1-axis])<(kind==='road'?(q.w+w)/2-.01:Math.max(1,w*.6)));
     if(!duplicate)ports.push({kind,type:s.type,w,p,anchor,dx,dz});
    }
   }
  }
 }
 return ports;
}
// Small bounded grid search bends new corridors around authored buildings.
function route(start,target,objects,width){
 const blocked=(x,z)=>objects.some(o=>inFootprint(x,z,o,width/2+.45));
 const points=[];for(let x=-14;x<=14;x++)for(let z=-10;z<=10;z++)if(!blocked(x,z))points.push([x,z]);
 const nearest=p=>points.reduce((best,q)=>!best||Math.hypot(q[0]-p[0],q[1]-p[1])<Math.hypot(best[0]-p[0],best[1]-p[1])?q:best,null);
 const a=nearest(start),b=nearest(target);if(!a||!b)return [start,target];
 const key=p=>p.join(','),open=[a],previous=new Map([[key(a),null]]),allowed=new Set(points.map(key));
 for(let i=0;i<open.length;i++){
  const p=open[i];if(key(p)===key(b))break;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+dx,p[1]+dz],k=key(q);if(allowed.has(k)&&!previous.has(k)){previous.set(k,p);open.push(q);}}
 }
 if(!previous.has(key(b)))return [start,target];
 const path=[];for(let p=b;p;p=previous.get(key(p)))path.unshift(p);
 const reduced=path.filter((p,i)=>i===0||i===path.length-1||path[i-1][0]-p[0]!==p[0]-path[i+1][0]||path[i-1][1]-p[1]!==p[1]-path[i+1][1]);
 return [start,...reduced,target];
}
export function connectScene(world,local,x,z){
 const [sx,sz]=tileShift(x,z),ports=neighborPorts(world,x,z),strokes=local.strokes.map(s=>({...s,p:s.p.map(p=>[...p])}));
 const layout=local.generation?.layout??Object.keys(layoutGuide[local.scene]??{})[0];
 const landmark=layoutGuide[local.scene]?.[layout]?.landmark;
 const obstacles=local.objects.filter(o=>o.type===landmark || items[o.type].category==='house'&&items[o.type].form!=='bridge');
 const localPorts=ports.map(p=>({...p,p:[p.p[0]-sx,p.p[1]-sz],anchor:[p.anchor[0]-sx,p.anchor[1]-sz]}));
 // Move an exposed endpoint onto the incoming channel before drawing the joining curve.
 for(const s of strokes){const kind=channel(s);if(!kind)continue;
  for(const i of [0,s.p.length-1]){
   const p=s.p[i],dx=Math.abs(p[0])>14.8?Math.sign(p[0]):0,dz=!dx&&Math.abs(p[1])>11.2?Math.sign(p[1]):0;
   if(!dx&&!dz||!world.regions[`${x+dx},${z+dz}`])continue;
   const candidates=localPorts.filter(q=>q.kind===kind&&q.dx===dx&&q.dz===dz).sort((a,b)=>Math.hypot(a.p[0]-p[0],a.p[1]-p[1])-Math.hypot(b.p[0]-p[0],b.p[1]-p[1]));
   if(candidates.length&&Math.hypot(candidates[0].p[0]-p[0],candidates[0].p[1]-p[1])<=2)s.p[i]=[...candidates[0].p];else s.p[i]=[p[0]-dx*3,p[1]-dz*3];
  }
 }
 let id=Math.max(0,...local.objects.map(o=>o.id),...strokes.map(s=>s.id))+1;
 for(const port of localPorts){
  const start=[port.p[0]-port.dx*2,port.p[1]-port.dz*2];
  const networks=strokes.filter(s=>channel(s)===port.kind);
  const clearTarget=p=>!obstacles.some(o=>inFootprint(...p,o,port.w/2+.45));
  const connections=networks.flatMap(s=>[distanceToStroke(...start,s).point,...s.p]);
  const candidates=connections.filter(clearTarget).sort((a,b)=>Math.hypot(a[0]-start[0],a[1]-start[1])-Math.hypot(b[0]-start[0],b[1]-start[1]));
  let target=candidates[0];
  if(!target)target=[-port.dx*10+(port.dx?0:port.p[0]),-port.dz*8+(port.dz?0:port.p[1])];
  // Keep an actual overlap on both sides of the seam; width/type come from the old design.
  const p=[port.anchor,port.p,...route(start,target,obstacles,port.w)];
  strokes.push({id:id++,type:port.type,w:port.w,p});
 }
 // New structures yield to connection corridors; existing construction is never moved.
 const corridors=strokes.slice(local.strokes.length).filter(s=>channel(s));
 const objects=local.objects.filter(o=>{
  if(o.type===landmark||items[o.type].category==='animal'||items[o.type].form==='bridge')return true;
  return !corridors.some(s=>{
   const {distance,point}=distanceToStroke(o.x,o.z,s);
   const margin=channel(s)==='river'?s.w/2+.35:s.w/2+.1;
   return distance<Math.hypot(o.w,o.d)/2+margin&&inFootprint(...point,o,margin);
  });
 });
 return {...local,objects,strokes};
}
