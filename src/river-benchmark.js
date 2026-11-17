import {createScene} from './scene-presets.js';
import {joinRegions,contains} from './territory.js';
import {createViewport} from './viewport.js';
import {normalizeGame} from './gameplay.js';
import {preloadModelPack} from './model-pack.js';
const entries=[];
for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
 const plot=z?createScene('garden',{seed:'JIANGNAN-QA-'+x+'-'+z,plants:18,density:1.15}):createScene('garden');
 if(!z){
   // Reserve a continuous promenade for repeatable camera travel through all three centre plots.
   plot.objects=plot.objects.filter(o=>o.type==='build-covered-bridge'||Math.abs(o.z-.6)>Math.hypot(o.w,o.d)*.5+1.15);
   plot.strokes.push({id:Math.max(...plot.objects.map(o=>o.id),...plot.strokes.map(s=>s.id))+1,type:'stonepath',w:2.15,p:[[-15,.6],[-3.6,.6]]});
 }
 entries.push([x,z,plot]);
}
const world=joinRegions([[0,0,entries.find(e=>e[0]===0&&e[1]===0)[2]],...entries.filter(e=>e[0]||e[1])]);
world.game=normalizeGame();
let crosses=0,seamFrames=0,focus={x:0,z:0},stats='';
const viewport=createViewport(document.querySelector('#stage'),str=>stats=str,()=>{},(dx,dz)=>{focus={x:focus.x+dx,z:focus.z+dz};seamFrames=3;crosses++;},()=>{});
preloadModelPack(type=>viewport.refreshModels(type));viewport.quality('low');
viewport.update(world,{...focus,continuous:true,claimed:(x,z)=>contains(world.regions,x*30,z*22.8)});
const result=document.querySelector('#result'),begin=document.querySelector('#begin');
result.textContent='固定种子 JIANGNAN-QA　·　9 块领地　·　'+world.objects.length+' 个物件';begin.disabled=false;
begin.onclick=()=>{
 begin.disabled=true;
 if(!viewport.beginWalk(-12,.6)){result.textContent='无法放置角色';return;}
 viewport.motion(true);
 let sign=1,previous=performance.now(),elapsed=0,total=0,seamMax=0,worst=0,lastReport=0;
 const times=[],format=n=>n.toFixed(1);
 function sample(now){
   if(document.hidden){previous=now;requestAnimationFrame(sample);return;}
   const dt=now-previous;previous=now;if(dt>0){elapsed+=dt;total++;times.push(dt);worst=Math.max(worst,dt);}
   if(seamFrames>0){seamMax=Math.max(seamMax,dt);seamFrames--;}
   const pos=viewport.walkPosition();
   if(pos.x>32)sign=-1;
   if(pos.x< -32)sign=1;
   viewport.steer(sign,0);
   if(elapsed-lastReport>1000||elapsed>=300000){
     lastReport=elapsed;const sorted=times.slice().sort((a,b)=>a-b);
     result.textContent=(elapsed>=300000?(crosses>1?'完成':'未完成跨区，请重新测试'):'漫步中')+' '+Math.floor(elapsed/1000)+' 秒 · 9 块 / '+world.objects.length+' 物件\n'+
     '平均 '+format(total*1000/elapsed)+' FPS · P95 '+format(sorted[Math.floor(sorted.length*.95)])+' ms\n'+
     '跨区 '+crosses+' 次 · 跨区最长帧 '+format(seamMax)+' ms · 最长帧 '+format(worst)+' ms\n'+stats+' · x '+format(pos.x)+' z '+format(pos.z);
   }
   if(elapsed<300000)requestAnimationFrame(sample);else{viewport.steer(0,0);viewport.endWalk();viewport.motion(false);}
 }
 document.addEventListener('visibilitychange',()=>{previous=performance.now();});
 requestAnimationFrame(sample);
};
