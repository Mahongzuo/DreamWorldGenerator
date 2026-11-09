const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
export function traversalPose(action,time){
 const t=Math.max(0,Math.min(1,time/action.duration)),lift=action.kind==='climb'?.52:.30,across=action.kind==='climb'?.84:.76;
 if(t<.13){const k=smooth(t/.13);return {x:lerp(action.start.x,action.approach.x,k),z:lerp(action.start.z,action.approach.z,k),y:lerp(action.start.y,action.approach.y,k)};}
 if(t<lift)return {x:action.approach.x,z:action.approach.z,y:lerp(action.approach.y,action.clearY,smooth((t-.13)/(lift-.13)))};
 if(t<across){const k=smooth((t-lift)/(across-lift));return {x:lerp(action.approach.x,action.end.x,k),z:lerp(action.approach.z,action.end.z,k),y:action.clearY+Math.sin(k*Math.PI)*.05};}
 return {x:action.end.x,z:action.end.z,y:lerp(action.clearY,action.end.y,smooth((t-across)/(1-across)))};
}
export function bodyClear(nav,crowd,body,p,r=.30){return nav.support(p.x,p.z,r,p.y+.015)<=p.y+.035&&!nav.bodyContact(p.x,p.y,p.z,r,1.65)&&!crowd?.contact(p.x,p.z,r,'land',body,p.y,1.65);}
export function segmentClear(nav,crowd,body,a,b,r=.30){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.055));
 for(let i=1;i<=n;i++){const t=i/n;if(!bodyClear(nav,crowd,body,{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)},r))return false;}
 return true;
}
// Slab intersection measures obstacle thickness in the requested direction, including rotated boxes.
function rayBox(p,dx,dz,o){
 const c=Math.cos(o.a),s=Math.sin(o.a),x=c*(p.x-o.x)-s*(p.z-o.z),z=s*(p.x-o.x)+c*(p.z-o.z),vx=c*dx-s*dz,vz=s*dx+c*dz;
 let near=-Infinity,far=Infinity;
 for(const [origin,v,half] of [[x,vx,o.w/2],[z,vz,o.d/2]]){if(Math.abs(v)<1e-8){if(Math.abs(origin)>half)return null;}else{let a=(-half-origin)/v,b=(half-origin)/v;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);}}
 return far>=Math.max(near,0)?{near,far}:null;
}
export function planTraversal(p,dx,dz,nav,crowd,body){
 const r=.30,entries=nav.surfacesNear(p.x+dx*.75,p.z+dz*.75,1.3),choices=[];
 for(const e of entries){
  const rise=e.top-p.y;if(rise<.38||rise>1.85)continue;
  const ray=rayBox(p,dx,dz,e.object);if(!ray||ray.near<r-.04||ray.near>1.12)continue;
  choices.push({e,ray});
 }
 choices.sort((a,b)=>a.ray.near-b.ray.near||b.e.top-a.e.top);
 for(const {e,ray} of choices){
  const endAt=t=>({x:p.x+dx*t,z:p.z+dz*t});
  let kind='climb',end;
  if(e.top-p.y<=1.08&&ray.far-ray.near<=1.12){
   const beyond=endAt(ray.far+r+.16),floor=nav.support(beyond.x,beyond.z,r,p.y+.32);
   if(Math.abs(floor-p.y)<=.45){kind='vault';end={...beyond,y:floor};}
  }
  if(!end){
   const top=endAt(ray.near+r+.12);
   if(!nav.surfaceAt(top.x,top.z,r,e.top).length)continue;
   end={...top,y:e.top};
  }
  if(!bodyClear(nav,crowd,body,end,r))continue;
  const close=endAt(Math.max(0,ray.near-r-.045));const approach={...close,y:nav.support(close.x,close.z,r,p.y+.32)};
  const action={kind,approach,start:{x:p.x,y:p.y,z:p.z},end,top:e.top,clearY:e.top+.045,sourceId:e.sourceId,token:nav.sourceToken(e.sourceId),duration:kind==='vault'?.72:.98+(e.top-p.y)*.12,elapsed:0,heading:Math.atan2(dx,dz),entrySpeed:p.speed,progress:0,hand:{x:p.x+dx*ray.near,z:p.z+dz*ray.near,y:e.top}};
  let last=action.start,valid=true;
  for(let i=1;i<=30;i++){const point=traversalPose(action,action.duration*i/30);if(!segmentClear(nav,crowd,body,last,point,r)){valid=false;break;}last=point;}
  if(valid)return action;
 }
 return null;
}
export function advanceTraversal(p,dt,nav,crowd,body){
 const action=p.traversal;if(!action)return false;
 action.elapsed=Math.min(action.duration,action.elapsed+dt);action.progress=action.elapsed/action.duration;
 const next=traversalPose(action,action.elapsed);
 const floor=nav.support(action.end.x,action.end.z,.30,action.end.y+.04);
 if(nav.sourceToken(action.sourceId)!==action.token||Math.abs(floor-action.end.y)>.05||!segmentClear(nav,crowd,body,p,next)){
  p.traversal=null;p.grounded=false;p.vy=0;p.vx=p.vz=p.speed=0;p.state='fall';return true;
 }
 p.travel+=Math.hypot(next.x-p.x,next.z-p.z);Object.assign(p,next);p.a=action.heading;p.vx=p.vz=p.speed=p.vy=0;p.grounded=false;p.state=action.kind;
 if(action.elapsed>=action.duration){
  p.traversal=null;p.grounded=true;p.landTime=.13;p.landingImpact=2;p.state='land';
  const speed=Math.min(action.entrySpeed,3.05)*.5;p.vx=Math.sin(action.heading)*speed;p.vz=Math.cos(action.heading)*speed;
 }
 return true;
}
