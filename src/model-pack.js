import * as T from 'three';
import {modelDefinitions,modelAsset} from './asset-registry.js';

export const packModels=modelDefinitions;
export const packThumbnail=id=>Object.hasOwn(packModels,id)?`/models/${modelAsset(id)}.png`:null;
const cache=new Map(),loading=new Map(),listeners=new Set(),queue=[];
let loaderPromise,activeLoads=0,clock=0;
const CACHE_LIMIT=18;
export const modelStats=()=>({cached:cache.size,loading:activeLoads,queued:queue.length,live:[...cache.values()].reduce((n,e)=>n+e.refs,0)});

function trimCache(){
  const idle=[...cache.entries()].filter(([,entry])=>!entry.refs).sort((a,b)=>a[1].used-b[1].used);
  while(cache.size>CACHE_LIMIT&&idle.length){
    const [id,entry]=idle.shift(),geometries=new Set(),materials=new Set();
    entry.gltf.scene.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);materials.add(n.material);}});
    if(entry.flat)geometries.add(entry.flat);
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
    cache.delete(id);loading.delete(id);
  }
}
function pump(){
  while(activeLoads<2&&queue.length){
    const {id,resolve}=queue.shift();activeLoads++;
    loaderPromise??=Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/utils/BufferGeometryUtils.js')])
      .then(([{GLTFLoader},{mergeGeometries}])=>({loader:new GLTFLoader(),mergeGeometries}));
    loaderPromise.then(async({loader,mergeGeometries})=>{
      const gltf=await loader.loadAsync(`/models/${modelAsset(id)}.glb`),parts=[];
      let material;
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(node=>{
        if(!node.isMesh)return;
        delete node.userData.owned;node.castShadow=true;node.receiveShadow=true;
        if(packModels[id].animal){
          const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
          for(const name of Object.keys(geometry.attributes))if(!['position','normal','color'].includes(name))geometry.deleteAttribute(name);
          parts.push(geometry);material=node.material;
        }
      });
      const flat=parts.length?mergeGeometries(parts,false):null;
      parts.forEach(g=>g.dispose());
      cache.set(id,{gltf,flat,material,refs:0,used:++clock});
      for(const ready of listeners)ready(id);
      resolve(gltf);trimCache();
    }).catch(error=>{
      console.warn(`Model ${id} unavailable; keeping procedural fallback.`,error);
      resolve(null);
    }).finally(()=>{activeLoads--;pump();});
  }
}
function load(id){
  if(cache.has(id))return Promise.resolve(cache.get(id).gltf);
  if(loading.has(id))return loading.get(id);
  const pending=new Promise(resolve=>queue.push({id,resolve}));
  loading.set(id,pending);pump();return pending;
}
export function preloadModelPack(onReady){if(onReady)listeners.add(onReady);return Promise.resolve();}

export function createPackModel(def,o){
  const meta=packModels[def.id];if(!meta)return null;
  const entry=cache.get(def.id);if(!entry){void load(def.id);return null;}
  entry.refs++;entry.used=++clock;
  const {gltf}=entry,group=new T.Group(),model=gltf.scene.clone(true);
  const sx=o.w/meta.width,sz=o.d/meta.depth,scale=new T.Vector3(sx,meta.fixedHeight?1:meta.animal?sx:Math.sqrt(sx*sz),meta.animal?sx:sz);
  model.scale.copy(scale);group.add(model);
  group.userData.packModel=def.id;
  if(entry.flat){
    const far=new T.Mesh(entry.flat,entry.material);far.scale.copy(scale);far.visible=false;far.receiveShadow=true;
    group.add(far);group.userData.packLOD={near:model,far};
  }
  if(gltf.animations.length){
    const mixer=new T.AnimationMixer(model),actions={};
    for(const clip of gltf.animations){
      const name=clip.name.split('_')[0],action=mixer.clipAction(clip);
      action.play();action.setEffectiveWeight(name==='Walk'?0:1);
      // Different instances do not look around or flick their tails in lockstep.
      if(name==='Idle')action.time=((o.id*0.61803398875)%1)*clip.duration;
      actions[name]=action;
    }
    group.userData.packAnimation={mixer,actions,weight:0,stride:(meta.stride??.73)*sx,detail:true,model};
  }
  let disposed=false;
  group.userData.dispose=()=>{
    if(disposed)return;disposed=true;
    const animation=group.userData.packAnimation;
    if(animation){animation.mixer.stopAllAction();animation.mixer.uncacheRoot(model);}
    entry.refs--;trimCache();
  };
  return group;
}
export function setModelDetail(group,detailed){
  const lod=group.userData.packLOD;if(!lod)return;
  lod.near.visible=detailed;lod.far.visible=!detailed;
  if(group.userData.packAnimation)group.userData.packAnimation.detail=detailed;
}
export function animatePackModel(group,{delta=0,speed=0,travel=0}={}){
  const state=group.userData.packAnimation;
  if(!state||!delta||state.detail===false)return;
  const {mixer,actions}=state;
  state.weight=T.MathUtils.damp(state.weight,T.MathUtils.clamp(speed/.24,0,1),9,delta);
  if(actions.Walk){
    actions.Walk.setEffectiveWeight(state.weight);
    actions.Walk.time=(travel/(state.stride??.73)%1)*actions.Walk.getClip().duration;
    actions.Walk.paused=true;
  }
  if(actions.Idle)actions.Idle.setEffectiveWeight(1-state.weight);
  if(actions.Turn)actions.Turn.setEffectiveTimeScale(.26);
  mixer.update(delta);
}
