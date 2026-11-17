import {items,round,tileKey,LAND,footprint,inFootprint} from './sandbox-state.js';
import {connectScene,distanceToStroke,channel} from './scene-connections.js';
import {sceneDesigns,gardenLayouts} from './scene-designs.js';
import {appendRegion,joinRegions} from './territory.js';
export {sceneDesigns};
export function seededRandom(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return (h>>>0)/4294967296;};}
export function generationOptions(value={}){return {...(Object.hasOwn(gardenLayouts,value.layout)?{layout:value.layout}:{}),width:Math.max(1,Math.min(3,Math.round(Number(value.width)||1))),height:Math.max(1,Math.min(3,Math.round(Number(value.height)||1))),density:Math.max(.4,Math.min(1.6,Number(value.density)||1)),plants:Math.max(0,Math.min(36,Math.round(Number(value.plants) || 0))),seed:String(value.seed??"LINQI").toUpperCase().replace(/[^A-Z0-9-]/g,"-").slice(0,18)||"LINQI"};}
export function createScene(id,options){
 const base=sceneDesigns[id];if(!base)throw Error('Unknown scene');
 const config=options?generationOptions(options):null;
 const layout=id==='garden'?(config?.layout??(config&&seededRandom(config.seed+'/layout')()>=.5?'court':'canal')):null;
 const design=layout?{...base,...gardenLayouts[layout]}:base;
 let next=1;
 const scene={v:2,theme:design.theme,scene:id,seed:design.seed,season:'summer',light:'day',felled:[],
  objects:design.objects.map(([type,x,z,scale=1,a=0])=>({id:next++,type,x,z,w:round(items[type].width*scale),d:round((items[type].depth??items[type].width)*scale),a:round(a)})),
  strokes:design.strokes.map(([type,p,w])=>({id:next++,type,w,p:p.map(point=>[...point])}))};
 if(!options)return scene;
 const random=seededRandom(config.seed),sx=random()<.5?-1:1,sz=random()<.5?-1:1;
 scene.seed=config.seed;scene.generation=layout?{...config,layout}:config;
 scene.strokes.forEach(s=>s.p=s.p.map(([x,z])=>[round(x*sx),round(z*sz)]));
 scene.objects.forEach(o=>{o.x=round(o.x*sx);o.z=round(o.z*sz);o.a=round(Math.atan2(Math.sin(o.a)*sx,Math.cos(o.a)*sz));});
 for(const o of scene.objects)if(o.type==='rock'||o.type==='shore-stones')o.a=round(o.a+(random()-.5)*.6);
 const houses=scene.objects.filter(o=>items[o.type].category==='house'),plants=scene.objects.filter(o=>items[o.type].category==='plant');
 const desired=Math.max(2,Math.round(houses.length*config.density));
 const essential=houses.filter(o=>['bridge','moon'].includes(items[o.type].form));
 const landmark=houses.find(o=>o.type===(layout==='court'?'pack-pavilion':layout==='canal'?'water-stilt':''));
 if(landmark)essential.push(landmark);
 const others=houses.filter(o=>!essential.includes(o)).map(o=>({o,rank:random()})).sort((a,b)=>a.rank-b.rank).map(t=>t.o);
 const chosen=[...essential,...others.slice(0,Math.max(0,desired-essential.length))];
 scene.objects=scene.objects.filter(o=>!houses.includes(o)&&!plants.includes(o)||chosen.includes(o));
 const safe=o=>!(layout==='court'&&Math.abs(o.x)<1.15&&o.z*sz>-5&&o.z*sz<7)&&footprint(o,.4).every(([x,z])=>Math.abs(x)<14.3&&Math.abs(z)<10.7)&&!scene.objects.some(b=>b.id!==o.id&&items[b.type].category!=='animal'&&Math.hypot(o.x-b.x,o.z-b.z)<(Math.max(o.w,o.d)+Math.max(b.w,b.d))*.52+.25)&&!scene.strokes.some(s=>channel(s)&&distanceToStroke(o.x,o.z,s).distance<Math.max(o.w,o.d)*.55+s.w*.5+.2);
 for(const o of chosen){if(essential.includes(o))continue;const candidate={...o,x:round(o.x+(random()-.5)*1.5),z:round(o.z+(random()-.5)*1.2)};if(safe(candidate))Object.assign(o,candidate);}
 for(let n=chosen.length;n<desired;n++){
  const model=others[Math.floor(random()*others.length)];if(!model)break;
  for(let attempt=0;attempt<80;attempt++){const o={...model,id:next++,x:round((random()-.5)*25),z:round((random()-.5)*18)};if(safe(o)){scene.objects.push(o);break;}}
 }
 // Shore plants keep their authored relationship with water as the seed mirrors the plot.
 const anchors=layout?['reeds','nature-willow','water-lily'].map(type=>plants.find(o=>o.type===type)).filter(Boolean):[];
 const placed=anchors.slice(0,config.plants);
 scene.objects.push(...placed);
 const dryPlants=plants.filter(o=>!['water-lily','reeds'].includes(o.type));
 for(let n=placed.length;n<config.plants;n++){
  const model=dryPlants[Math.floor(random()*dryPlants.length)];if(!model)break;
  for(let attempt=0;attempt<100;attempt++){const scale=.72+random()*.25,o={...model,id:next++,x:round((random()-.5)*27),z:round((random()-.5)*19),w:round(model.w*scale),d:round(model.d*scale),a:round(random()*Math.PI*2)};if(safe(o)){scene.objects.push(o);break;}}
 }
 return scene;
}
// Choose a vacant connected frontier, never replace a user's existing plot.
export function sceneDestination(world,focus={x:0,z:0},width=1,height=1){
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
 const choices=[];
 for(const c of ordered)for(let ix=0;ix<width;ix++)for(let iz=0;iz<height;iz++)choices.push({x:c.x-ix,z:c.z-iz});
 const free=choices.find(({x,z})=>{
  for(let ix=0;ix<width;ix++)for(let iz=0;iz<height;iz++){
   const xx=x+ix,zz=z+iz;if(Math.abs(xx)>99999||Math.abs(zz)>99999||world.regions[tileKey(xx,zz)])return false;
   if(world.objects.some(o=>{const r=Math.hypot(o.w,o.d)/2;return Math.abs(o.x-xx*30)<LAND.x+r&&Math.abs(o.z-zz*22.8)<LAND.z+r;}))return false;
  }return true;
 });
 if(!free)throw Error('相邻空地不足，请先向外扩建后再生成场景');
 return free;
}
export function appendScene(current,id,focus,options){
 const world=current.regions?current:joinRegions([[0,0,current]]),config=options?generationOptions(options):null;
 const destination=sceneDestination(world,focus,config?.width??1,config?.height??1);
 let next=world;
 for(let dz=0;dz<(config?.height??1);dz++)for(let dx=0;dx<(config?.width??1);dx++){
  const x=destination.x+dx,z=destination.z+dz;
  const local=createScene(id,config?{...config,seed:config.seed.slice(0,14)+'-'+dx+dz}:undefined);
  next=appendRegion(next,connectScene(next,local,x,z),x,z);
 }
 return {world:next,...destination};
}
