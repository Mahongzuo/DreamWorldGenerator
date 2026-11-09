import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {packModels,packThumbnail,animatePackModel} from '../src/model-pack.js';
import {items} from '../src/sandbox-state.js';

const root=new URL('../public/models/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));

test('every authored preset has a bounded, texture-free GLB and real preview',async()=>{
  let total=0;
  for(const model of manifest.assets){
    const data=await readFile(new URL(model.id+'.glb',root));
    const header=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
    assert.equal(data.readUInt32LE(0),0x46546c67);
    assert.equal(data.length,data.readUInt32LE(8));
    assert.ok(header.meshes.reduce((n,m)=>n+m.primitives.length,0)<=7);
    assert.ok(header.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!==undefined)));
    assert.equal(header.materials.length,1);
    assert.equal(header.textures?.length??0,0);
    assert.ok(model.triangles<=3000);
    assert.ok(items[model.id]);assert.ok(packModels[model.id]);
    assert.equal(packThumbnail(model.id),`/models/${model.id}.png`);
    const png=await readFile(new URL(model.id+'.png',root));
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
    total+=data.length;
  }
  assert.ok(total<1_500_000,`Total model payload ${total}`);
});

test('fox and red panda have playable Walk / Idle clips with distance-driven feet',async()=>{
  for(const id of ['pack-fox','pack-red-panda']){
    const raw=await readFile(new URL(id+'.glb',root));
    const data=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
    assert.deepEqual(new Set(data.animations.map(c=>c.name)),new Set(['Walk','Idle']));
    const group=new T.Group();group.add(data.scene);
    const mixer=new T.AnimationMixer(data.scene),actions={};
    for(const clip of data.animations)actions[clip.name]=mixer.clipAction(clip).play();
    group.userData.packAnimation={mixer,actions,weight:1};
    const foot=data.scene.getObjectByName('ForeL');assert.ok(foot);
    animatePackModel(group,{delta:.016,speed:.6,travel:0});
    const start=foot.quaternion.clone();
    animatePackModel(group,{delta:.016,speed:.6,travel:.365});
    assert.ok(start.angleTo(foot.quaternion)>.4);
    const step=foot.quaternion.clone();
    animatePackModel(group,{delta:.016,speed:.6,travel:.365});
    assert.ok(step.angleTo(foot.quaternion)<.03,'same distance keeps feet at same gait phase');
    for(let i=0;i<100;i++)animatePackModel(group,{delta:.016,speed:0,travel:.365});
    assert.ok(actions.Walk.getEffectiveWeight()<.001,'feet stop while idle');
    assert.ok(actions.Idle.getEffectiveWeight()>.99);
    const bounds=new T.Box3().setFromObject(data.scene);
    assert.ok(bounds.min.y>-.25&&bounds.max.y<1.4);
    assert.ok(bounds.getSize(new T.Vector3()).z<2.05);
  }
});

test('windmill includes an independently animated rotor',async()=>{
  const raw=await readFile(new URL('pack-windmill.glb',root));
  const data=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
  const clip=data.animations.find(c=>c.name==='Turn');assert.ok(clip);
  const rotor=data.scene.getObjectByName('Rotor');assert.ok(rotor);
  const mixer=new T.AnimationMixer(data.scene);mixer.clipAction(clip).play();
  const original=rotor.quaternion.clone();mixer.update(.5);
  assert.ok(original.angleTo(rotor.quaternion)>.3);
});
