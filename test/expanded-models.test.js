import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelDefinitions,modelAsset} from '../src/asset-registry.js';
import {animalProfile} from '../src/animal-behavior.js';
import {items} from '../src/sandbox-state.js';
import {createAnimalCrowd,createNavigation,makeWander,wander} from '../src/navigation.js';
const root=new URL('../public/models/',import.meta.url);

test('36 expanded models meet measured geometry budgets and animated collision envelopes',async()=>{
 let total=0,count=0;
 for(const pack of ['architecture','nature','fauna']){
  const manifest=JSON.parse(await readFile(new URL(pack+'-manifest.json',root)));
  for(const asset of manifest.assets){
   const id=asset.type??asset.id,meta=modelDefinitions[id];assert.ok(items[id]);assert.ok(meta);
   const raw=await readFile(new URL(modelAsset(id)+'.glb',root));total+=raw.length;count++;
   const data=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
   let meshes=0,triangles=0;const materials=new Set();
   data.scene.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;materials.add(n.material);assert.ok(n.geometry.attributes.color);assert.ok(!n.material.map&&!n.material.transparent);}});
   assert.equal(materials.size,1);assert.ok(meshes<=(meta.animal?8:1));assert.ok(triangles<=(pack==='architecture'?5000:3200));
   const png=await readFile(new URL(modelAsset(id)+'.png',root));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
   if(meta.animal){
    assert.deepEqual(new Set(data.animations.map(c=>c.name)),new Set(['Walk','Idle']));
    for(const clip of data.animations){
     const mixer=new T.AnimationMixer(data.scene);mixer.clipAction(clip).play();
     for(let i=0;i<17;i++){
      mixer.setTime(clip.duration*i/16);data.scene.updateMatrixWorld(true);
      data.scene.traverse(n=>{if(!n.isMesh)return;const p=n.geometry.attributes.position,v=new T.Vector3();
       for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(n.matrixWorld);assert.ok(Math.hypot(v.x,v.z)<=meta.radius+.008,`${id} ${clip.name} exceeds collision radius`);}
      });
     }
     mixer.stopAllAction();mixer.uncacheRoot(data.scene);
    }
   }else{
    const bounds=new T.Box3().setFromObject(data.scene),size=bounds.getSize(new T.Vector3());
    assert.ok(size.x<=meta.width+.01&&size.z<=meta.depth+.01,id+' footprint');
    assert.ok(bounds.max.y<=meta.maxHeight+.01&&bounds.min.y>=-.01,id+' height');
   }
  }
 }
 assert.equal(count,36);assert.ok(total<6_000_000,`expanded payload ${total}`);
});

test('mixed species avoid each other and the player with individual body sizes',()=>{
 const nav=createNavigation({objects:[]},{depth:()=>0,level:0,height:()=>.2},null,[],[]),crowd=createAnimalCrowd();
 const player={x:0,z:0,r:.25,kind:'land'};crowd.update(player);
 const ids=['deer','deer','rabbit','squirrel','bear','fauna-tortoise','fauna-capybara'];
 const actors=ids.map((id,i)=>{
  const profile=animalProfile({type:id,w:items[id].width});
  const a=makeWander(nav,-5+(i%3)*4,-4+Math.floor(i/3)*4,profile.radius,'land',i+.1,3,crowd);assert.ok(a);a.profile=profile;return a;
 });
 for(let step=0;step<750;step++)for(const a of actors){
  const heading=a.heading;wander(nav,a,.05,a.profile.speed);
  assert.ok(Math.abs(a.heading-heading)<=a.profile.turnRate*.05+1e-8);
  for(const b of [...actors,player])if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=a.r+b.r+.04-1e-8);
 }
 assert.ok(actors.every(a=>a.travel>.5));
});

test('moon gate passage and sculpted landscape use authored collision shapes',()=>{
 const objects=[{id:1,type:'build-moon-gate',x:0,z:0,w:6.2,d:2.4,a:0},{id:2,type:'nature-mesa',x:6,z:0,w:2.8,d:2.8,a:0}];
 const nav=createNavigation({objects},{depth:()=>0,level:0,height:()=>.2},null,[],[]);
 assert.ok(nav.sweep(0,-2,0,2,.25,'land'));assert.equal(nav.sweep(1.9,-2,1.9,2,.25,'land'),false);assert.equal(nav.valid(6,0,.25,'land'),false);
});
