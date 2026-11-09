import * as T from 'three';

// Blender-authored opaque vertex-colour models: no large texture downloads,
// transparency sorting, or per-frame skinning. Cached geometries are shared.
export const packModels = {
  'pack-pavilion': {width:4.8,depth:4.8},
  'pack-windmill': {width:5.4,depth:3.7,ambient:'Turn'},
  'pack-greenhouse': {width:4.7,depth:4.2},
  'pack-fox': {width:.82,depth:.82,animal:true},
  'pack-red-panda': {width:.82,depth:.82,animal:true},
  'pack-ginkgo': {width:1.7,depth:1.7},
  'pack-basalt': {width:2.1,depth:1.9},
  'pack-karst': {width:2.6,depth:1.4}
};
const cache=new Map(),loading=new Map(),listeners=new Set();
let loaderPromise;
export const packThumbnail=id=>Object.hasOwn(packModels,id)?`/models/${id}.png`:null;

function load(id){
  if(cache.has(id))return Promise.resolve(cache.get(id));
  if(loading.has(id))return loading.get(id);
  loaderPromise??=import('three/addons/loaders/GLTFLoader.js').then(({GLTFLoader})=>new GLTFLoader());
  const pending=loaderPromise.then(loader=>loader.loadAsync(`/models/${id}.glb`)).then(gltf=>{
    gltf.scene.traverse(node=>{
      if(!node.isMesh)return;
      // The pack owns these buffers for the session. Instance disposal only
      // removes the clone from the scene, following the kit's ownership rule.
      delete node.userData.owned;
      node.castShadow=true;node.receiveShadow=true;
      node.material.side=T.DoubleSide;
    });
    cache.set(id,gltf);
    for(const ready of listeners)ready(id);
    return gltf;
  }).catch(error=>{
    console.warn(`Model ${id} unavailable; keeping procedural fallback.`,error);
    return null;
  });
  loading.set(id,pending);
  return pending;
}

// Register once at startup. Downloads start only for models actually displayed,
// keeping the normal first visit and legacy scenes free of pack payloads.
export function preloadModelPack(onReady){
  if(onReady)listeners.add(onReady);
  return Promise.resolve();
}

export function createPackModel(def,o){
  const meta=packModels[def.id];
  if(!meta)return null;
  const gltf=cache.get(def.id);
  if(!gltf){void load(def.id);return null;}
  const group=new T.Group(),model=gltf.scene.clone(true);
  const sx=o.w/meta.width,sz=o.d/meta.depth;
  model.scale.set(sx,meta.animal?sx:Math.sqrt(sx*sz),meta.animal?sx:sz);
  group.add(model);
  group.userData.packModel=def.id;
  if(gltf.animations.length){
    const mixer=new T.AnimationMixer(model),actions={};
    for(const clip of gltf.animations){
      const name=clip.name.split('_')[0];
      const action=mixer.clipAction(clip);action.play();action.setEffectiveWeight(name==='Walk'?0:1);
      actions[name]=action;
    }
    group.userData.packAnimation={mixer,actions,phase:null,weight:0};
  }
  return group;
}

export function animatePackModel(group,{delta=0,speed=0,travel=0,time=0}={}){
  const state=group.userData.packAnimation;
  if(!state||!delta)return;
  const {mixer,actions}=state;
  const moving=T.MathUtils.clamp(speed/.32,0,1);
  state.weight=T.MathUtils.damp(state.weight,moving,9,delta);
  if(actions.Walk){
    actions.Walk.setEffectiveWeight(state.weight);
    // World distance, rather than elapsed time, drives foot contacts.
    const period=actions.Walk.getClip().duration;
    actions.Walk.time=(travel/.73%1)*period;
    actions.Walk.paused=true;
  }
  if(actions.Idle)actions.Idle.setEffectiveWeight(1-state.weight);
  if(actions.Turn)actions.Turn.setEffectiveTimeScale(.26);
  mixer.update(delta);
}
