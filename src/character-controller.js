// Lightweight capsule-footprint controller. Animation follows resolved travel, never drives physics.
export const CHARACTER={radius:.30,height:1.65,walk:1.55,jog:3.05,sprint:5.6,acceleration:24,braking:30,gravity:18,jump:6.3,step:.32};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function createCharacter(x,z,y,a=Math.PI){return {x,z,y,a,vx:0,vz:0,vy:0,speed:0,travel:0,grounded:true,coyote:.10,jumpBuffer:0,jumpHeld:false,landTime:0,state:'idle',lean:0,turn:0,swing:0,t:0};}
export function requestJump(p){if(!p.jumpHeld)p.jumpBuffer=.15;p.jumpHeld=true;}
export function releaseJump(p){p.jumpHeld=false;}
export function stopCharacter(p){if(!p)return;p.vx=p.vz=p.speed=0;p.jumpBuffer=0;p.jumpHeld=false;}
// A bounded sweep + contact-plane projection works in wall-local space, including rotated walls.
export function slideMove(x,z,dx,dz,contact){
 let remainingX=dx,remainingZ=dz;
 for(let pass=0;pass<4&&Math.hypot(remainingX,remainingZ)>1e-7;pass++){
  const n=Math.max(1,Math.ceil(Math.hypot(remainingX,remainingZ)/.055));let fraction=1,hit=null;
  for(let i=1;i<=n;i++){hit=contact(x+remainingX*i/n,z+remainingZ*i/n);if(hit){
   let lo=(i-1)/n,hi=i/n;for(let k=0;k<9;k++){const mid=(lo+hi)/2;if(contact(x+remainingX*mid,z+remainingZ*mid))hi=mid;else lo=mid;}
   fraction=Math.max(0,lo-1e-4);break;
  }}
  x+=remainingX*fraction;z+=remainingZ*fraction;
  if(!hit)break;
  remainingX*=1-fraction;remainingZ*=1-fraction;
  const dot=remainingX*hit.x+remainingZ*hit.z;
  if(dot>=-1e-9)break;
  remainingX-=hit.x*dot;remainingZ-=hit.z*dot;
 }
 return {x,z};
}
export function stepCharacter(p,input,dt,nav,crowd,body){
 const steps=Math.max(1,Math.ceil(Math.min(dt,.1)*120)),h=Math.min(dt,.1)/steps;
 for(let i=0;i<steps;i++){
  const side=input.side||0,forward=input.forward||0,n=Math.max(1,Math.hypot(side,forward));
  const ix=(Math.sin(input.yaw)*forward-Math.cos(input.yaw)*side)/n,iz=(Math.cos(input.yaw)*forward+Math.sin(input.yaw)*side)/n;
  const intent=Math.hypot(ix,iz),target=input.run?CHARACTER.sprint:input.walk?CHARACTER.walk:CHARACTER.jog;
  const oldSpeed=p.speed,oldAngle=p.a;
  p.jumpBuffer=Math.max(0,p.jumpBuffer-h);p.landTime=Math.max(0,p.landTime-h);
  p.coyote=p.grounded?.10:Math.max(0,p.coyote-h);
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=CHARACTER.jump;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.landTime=0;}
  const desiredX=ix*target,desiredZ=iz*target,dvx=desiredX-p.vx,dvz=desiredZ-p.vz,dv=Math.hypot(dvx,dvz);
  const accel=p.grounded?(intent?CHARACTER.acceleration:CHARACTER.braking):8;
  const blend=dv?Math.min(1,accel*h/dv):0;p.vx+=dvx*blend;p.vz+=dvz*blend;
  const fromX=p.x,fromZ=p.z,fromY=nav.support(p.x,p.z,CHARACTER.radius);
  const contact=(x,z)=>{
   const hit=nav.contact(x,z,CHARACTER.radius);if(hit)return hit;
   const animal=crowd?.contact(x,z,CHARACTER.radius,'land',body);if(animal)return animal;
   const ground=nav.support(x,z,CHARACTER.radius);
   if(ground>p.y+CHARACTER.step&&(p.grounded||ground>p.y+.08)){
    const dx=fromX-x,dz=fromZ-z,len=Math.hypot(dx,dz)||1;return {x:dx/len,z:dz/len};
   }
   return null;
  };
  const next=slideMove(p.x,p.z,p.vx*h,p.vz*h,contact);p.x=next.x;p.z=next.z;
  const moved=Math.hypot(p.x-fromX,p.z-fromZ);p.travel+=moved;p.speed=h?moved/h:0;
  // Remove velocity into the wall without losing the tangential component.
  if(h&&p.speed<Math.hypot(p.vx,p.vz)-.01){p.vx=(p.x-fromX)/h;p.vz=(p.z-fromZ)/h;}
  const floor=nav.support(p.x,p.z,CHARACTER.radius);
  if(p.grounded&&floor<fromY-.12){p.grounded=false;p.vy=0;}
  if(!p.grounded){
   const gravity=CHARACTER.gravity+(p.vy>0&&!p.jumpHeld?14:0);
   p.y+=p.vy*h-gravity*h*h/2;p.vy-=gravity*h;
   if(p.vy<=0&&p.y<=floor){p.y=floor;p.grounded=true;p.vy=0;p.landTime=.17;}
  }else p.y=floor;
  if(intent>.03){const wanted=Math.atan2(ix,iz),difference=angle(p.a,wanted);p.a+=clamp(difference,-h*14,h*14);}
  p.turn=h?angle(oldAngle,p.a)/h:0;
  p.lean+=(clamp((p.speed-oldSpeed)/(h||1)*.006,-.12,.14)-p.lean)*(1-Math.exp(-h*12));
  if(!p.grounded)p.state=p.vy>.12?'jump':'fall';
  else if(p.landTime>0)p.state='land';
  else if(p.speed<.07)p.state='idle';
  else if(intent<.03)p.state='stop';
  else if(Math.abs(angle(p.a,Math.atan2(ix,iz)))>.9)p.state='pivot';
  else if(p.speed<target*.55)p.state='start';
  else p.state=input.run?'sprint':input.walk?'walk':'jog';
 }
 return p;
}
// Contract immediately on obstruction, release with frame-rate independent damping.
export function cameraDistance(current,allowed,dt){return allowed<current?allowed:current+(allowed-current)*(1-Math.exp(-dt*5));}
export function cameraSweep(origin,desired,blocked,r=.18){
 const dx=desired.x-origin.x,dy=desired.y-origin.y,dz=desired.z-origin.z,length=Math.hypot(dx,dy,dz);
 const steps=Math.max(1,Math.ceil(length/.09));
 for(let i=0;i<=steps;i++){const t=i/steps;if(blocked(origin.x+dx*t,origin.y+dy*t,origin.z+dz*t,r))return Math.max(0,t-.12/(length||1));}
 return 1;
}
