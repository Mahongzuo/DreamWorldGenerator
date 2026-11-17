import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelDefinitions,modelAsset} from '../src/asset-registry.js';
import {animatePackModel,packThumbnail} from '../src/model-pack.js';
import {items} from '../src/sandbox-state.js';

const assets=new URL('../public/models/',import.meta.url);
const types=['water-stilt','build-covered-bridge','shore-stones','reeds','water-lily','kingfisher','frog'];

async function load(type){
  const raw=await readFile(new URL(modelAsset(type)+'.glb',assets));
  return new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
}

test('seven waterside assets retain their footprints, actual previews and mobile geometry budgets',async()=>{
  for(const type of types){
    const meta=modelDefinitions[type],item=items[type],gltf=await load(type);
    assert.equal(meta.width,item.width);assert.equal(meta.depth,item.depth);
    const thumbnail=await readFile(new URL(modelAsset(type)+'.png',assets));
    assert.equal(packThumbnail(type),'/models/'+modelAsset(type)+'.png');
    assert.equal(thumbnail.toString('hex',0,8),'89504e470d0a1a0a');
    assert.deepEqual([thumbnail.readUInt32BE(16),thumbnail.readUInt32BE(20)],[320,260]);
    let triangles=0,parts=0;
    const materials=new Set();
    gltf.scene.traverse(n=>{
      if(!n.isMesh)return;
      parts++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;
      assert.ok(n.geometry.attributes.color);assert.ok(!n.material.transparent&&!n.material.map);
      materials.add(n.material);
    });
    assert.equal(materials.size,1);
    assert.ok(parts<=(meta.animal?6:1),type+' mesh count');
    assert.ok(triangles<=(item.category==='house'?5000:3200),type+' triangle limit');
    if(meta.animal)continue;
    const b=new T.Box3().setFromObject(gltf.scene,true);
    assert.ok(Math.max(-b.min.x,b.max.x)<=meta.width/2+.005,type+' width');
    assert.ok(Math.max(-b.min.z,b.max.z)<=meta.depth/2+.005,type+' depth');
    assert.ok(b.max.y<=meta.maxHeight+.002 && b.min.y>=-.005,type+' height');
  }
});

test('visitor joints stay within the measured body during all eight authored motions',async()=>{
  for(const [type,clips] of [['kingfisher',['Perch','Takeoff','Fly','Land']],['frog',['Crouch','Gather','Leap','Settle']]]){
    const data=await load(type),meta=modelDefinitions[type],position=new T.Vector3();
    assert.deepEqual(new Set(data.animations.map(a=>a.name)),new Set(clips));
    const mixer=new T.AnimationMixer(data.scene);
    for(const clip of data.animations){
      const action=mixer.clipAction(clip).play();
      for(let i=0;i<=21;i++){
        mixer.setTime(clip.duration*i/21);
        data.scene.updateMatrixWorld(true);
        data.scene.traverse(n=>{
          if(!n.isMesh)return;
          const attribute=n.geometry.attributes.position;
          for(let j=0;j<attribute.count;j++){
            position.fromBufferAttribute(attribute,j).applyMatrix4(n.matrixWorld);
            assert.ok(Math.hypot(position.x,position.z)<=meta.radius+.002,type+' '+clip.name+' radius');
            assert.ok(position.y<=meta.maxHeight+.002,type+' '+clip.name+' height');
            if(clip.name!=='Leap')assert.ok(position.y>=-.006,type+' '+clip.name+' planted pose');
          }
        });
      }
      action.stop();
    }
  }
});

test('authored bird and frog poses are separately controlled and a distant instance sleeps',async()=>{
  for(const [type,rest,motion,joint] of [
    ['kingfisher','Perch','Fly','KingfisherWingRight'],
    ['frog','Crouch','Leap','FrogHindRight'],
  ]){
    const {scene,animations}=await load(type),mixer=new T.AnimationMixer(scene);
    const actions=Object.fromEntries(animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
    const group=new T.Group();group.add(scene);
    const state=group.userData.packAnimation={mixer,model:scene,actions,restClip:rest,active:actions[rest].play(),detail:true,stride:.55};
    animatePackModel(group,{delta:.1,motion:rest,phase:0});
    const jointObj=scene.getObjectByName(joint);
    const stopped=jointObj.quaternion.clone();
    animatePackModel(group,{delta:.1,motion,phase:.60});
    assert.ok(jointObj.quaternion.angleTo(stopped)>.25,type+' distinctive pose');
    const mid=jointObj.quaternion.clone();
    state.detail=false;
    animatePackModel(group,{delta:1,motion:rest,phase:.25});
    assert.ok(jointObj.quaternion.angleTo(mid)<.001);
    state.detail=true;
    animatePackModel(group,{delta:.1,motion:rest,phase:0});
    assert.ok(jointObj.quaternion.angleTo(stopped)<.01);
  }
});
