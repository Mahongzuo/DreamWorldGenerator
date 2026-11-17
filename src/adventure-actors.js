import * as T from 'three';
import {seededRandom} from './scene-presets.js';
import {tileShift} from './sandbox-state.js';
import {regionAt} from './territory.js';
// Two shared low-poly golems per explored plot; never a full-world simulation.
export function createAdventureActors(scene,onEvent){
 const geometry=new T.IcosahedronGeometry(1,0),material=new T.MeshStandardMaterial({color:'#75668c',roughness:.88,flatShading:true});
 const warning=new T.MeshStandardMaterial({color:'#eda762',emissive:'#864222',emissiveIntensity:.6,roughness:.7});
 const eyeGeometry=new T.BoxGeometry(.16,.08,.04),eyeMaterial=new T.MeshBasicMaterial({color:'#ffe6a0'});
 const actors=new Map();let world,nav,crowd,region='',enabled=false,active=false,site=null;
 const sign=new T.Group(),jade=new T.MeshStandardMaterial({color:0x75a69b,emissive:0x173e38,roughness:.72});
 const stone=new T.Mesh(new T.CylinderGeometry(.48,.57,.10,8),material);
 const crystal=new T.Mesh(new T.OctahedronGeometry(.25),jade);
 crystal.scale.set(.75,1.6,.75);crystal.position.y=.49;sign.add(stone,crystal);
 function remove(a){a.crowd?.remove(a);a.group.removeFromParent();actors.delete(a.id);}
 function stop(){for(const a of [...actors.values()])remove(a);sign.removeFromParent();active=false;site=null;region='';}
 function sync(next,n,c,player){
  const changedNav=nav!==n;
  world=next;nav=n;crowd=c;enabled=next.game?.mode==='adventure';
  if(!enabled||!player||!world.game.health){stop();return;}
  const coords=regionAt(player.x,player.z),key=coords.join(',');
  if(region!==key){stop();region=key;}
  if([0,1].every(i=>world.game.defeated.includes(key+':'+i))){stop();region=key;return;}
  if(!site||changedNav){
    const [x,z]=tileShift(...coords);
    const within=(a,b)=>regionAt(a,b).join(',')===key;
    site=nav.find(x+4,z+4,.65,'land',12,within);
    if(!site){stop();return;}
    sign.position.set(site.x,nav.height(site.x,site.z)+.06,site.z);
  }
  if(!active){if(sign.parent!==scene)scene.add(sign);return;}
  for(const a of [...actors.values()]){if(world.game.defeated.includes(a.id)){remove(a);continue;}if(a.crowd!==c){a.crowd?.remove(a);a.cell=null;a.crowd=c;const safe=n.find(a.x,a.z,a.r,'land',4,(x,z)=>c.fits(x,z,a.r,'land'));if(!safe){remove(a);continue;}a.x=safe.x;a.z=safe.z;c.update(a);place(a);}}
  if(!player)return;
  const rng=seededRandom(world.seed+'/'+key+'/guard');
  for(let i=0;i<2;i++){
   const id=key+':'+i,angle=rng()*Math.PI*2;
   if(actors.has(id)||world.game.defeated.includes(id))continue;
   const spot=nav.find(site.x+Math.cos(angle)*(4+i),site.z+Math.sin(angle)*(4+i),.8,'land',7,(x,z)=>regionAt(x,z).join(',')===key&&Math.hypot(x-player.x,z-player.z)>2.2&&crowd.fits(x,z,.8,'land'));
   if(!spot)continue;
   const group=new T.Group(),body=new T.Mesh(geometry,material),head=new T.Mesh(geometry,material);
   body.scale.set(.55,.7,.4);body.position.y=.78;head.scale.set(.36,.34,.33);head.position.y=1.43;group.add(body,head);
   const arms=[];for(const side of [-1,1]){const arm=new T.Mesh(geometry,material);arm.scale.set(.19,.5,.22);arm.position.set(side*.57,.8,0);group.add(arm);arms.push(arm);const eye=new T.Mesh(eyeGeometry,eyeMaterial);eye.position.set(side*.15,1.48,.29);group.add(eye);}
   scene.add(group);const a={id,...spot,r:.8,kind:'land',hp:60,maxHp:60,heading:0,windup:0,cooldown:1.4,flash:0,clock:rng()*6,group,body,head,arms,crowd:c,cell:null};c.update(a);actors.set(id,a);place(a);
  }
 }
 function place(a){a.y=nav.height(a.x,a.z);a.h=1.8;a.group.position.set(a.x,a.y,a.z);a.group.rotation.y=a.heading;}
 function step(dt,player){
  if(!enabled||!player||!dt)return;
  for(const a of actors.values()){
   a.clock+=dt;a.cooldown=Math.max(0,a.cooldown-dt);a.flash=Math.max(0,a.flash-dt);
   const dx=player.x-a.x,dz=player.z-a.z,d=Math.hypot(dx,dz);
   const line=Math.abs((player.y??0)-a.y)<1.2&&nav.sweep(a.x,a.z,player.x,player.z,.2,'land');
   if(a.windup>0){
    a.windup-=dt;if(a.windup<=0){a.cooldown=1.7;if(d<1.55&&line)onEvent({type:'hurt',damage:14});}
   }else if(d<1.45&&line&&a.cooldown===0){a.windup=.75;}
   else if(d>1.2&&d<14){
    const angle=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(angle-a.heading),Math.cos(angle-a.heading));a.heading+=Math.max(-dt*2,Math.min(dt*2,turn));
    for(const offset of [0,.7,-.7,1.3,-1.3]){const heading=a.heading+offset,x=a.x+Math.sin(heading)*dt*1.12,z=a.z+Math.cos(heading)*dt*1.12;
     if(nav.sweep(a.x,a.z,x,z,a.r,'land')&&crowd.clearPath(a.x,a.z,x,z,a.r,'land',a)){a.x=x;a.z=z;crowd.update(a);break;}}
   }
   a.body.material=a.head.material=a.windup>0||a.flash>0?warning:material;
   for(let i=0;i<2;i++)a.arms[i].rotation.x=a.windup>0?-1.4:Math.sin(a.clock*6+i*Math.PI)*.3;
   place(a);
  }
 }
 function attack(player,power){
  const targets=[...actors.values()].map(a=>({a,d:Math.hypot(a.x-player.x,a.z-player.z)})).filter(({a,d})=>d<2.6&&Math.abs((player.y??0)-a.y)<1.2&&nav.sweep(player.x,player.z,a.x,a.z,.2,'land')).sort((a,b)=>a.d-b.d);
  const a=targets[0]?.a;if(!a)return null;
  a.hp-=power;a.flash=.3;a.windup=0;a.cooldown=.65;
  player.a=Math.atan2(a.x-player.x,a.z-player.z);
  if(a.hp<=0){remove(a);onEvent({type:'defeat',id:a.id});return {hp:0};}
  return {hp:a.hp};
 }
 function canStart(player){return Boolean(enabled&&player&&world.game.health>0&&site&&!active&&Math.hypot(player.x-site.x,player.z-site.z)<=3.2);}
 function start(player){
   if(!canStart(player))return false;
   active=true;sign.removeFromParent();sync(world,nav,crowd,player);
   if(!actors.size){active=false;if(site)scene.add(sign);return false;}
   return true;
 }
 function status(player){
   if(!enabled||!player)return {text:'',canAttack:false,canChallenge:false};
   const nearest=[...actors.values()].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
   if(nearest)return {text:'荒晶守卫 '+nearest.hp+'/60 · '+(nearest.windup>0?'正在蓄力':'挑战进行中'),canAttack:Math.hypot(nearest.x-player.x,nearest.z-player.z)<2.6&&Math.abs((player.y??0)-nearest.y)<1.2&&nav.sweep(player.x,player.z,nearest.x,nearest.z,.2,'land'),canChallenge:false};
   const distance=site?Math.round(Math.hypot(site.x-player.x,site.z-player.z)):0;
   return {text:site?'青晶遗迹 · '+distance+' 米 · 自选挑战':'本地没有待开启的挑战',canChallenge:canStart(player),canAttack:false};
 }
 return {sync,step,attack,start,status,pause(){for(const a of actors.values()){a.windup=0;a.cooldown=1;}},clear:stop};
}
