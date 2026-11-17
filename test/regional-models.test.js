import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelAsset,modelDefinitions} from '../src/asset-registry.js';
import {items} from '../src/sandbox-state.js';

const expected = {
  watermill:['Turn'], 'pasture-shelter':[], 'build-lighthouse':[], 'tidal-rocks':[],
  dipper:['Perch','Takeoff','Fly','Land'], 'sea-gull':['Perch','Takeoff','Fly','Land'],
  'meadow-hare':['Crouch','Gather','Leap','Settle'], 'shore-crab':['Idle','Scuttle']
};
test('regional miniatures fit their collision envelopes throughout authored animations',async()=>{
  const base=new URL('../public/models/',import.meta.url),point=new Vector3();
  for(const [id,clips] of Object.entries(expected)){
    const meta=modelDefinitions[id], name=modelAsset(id);
    assert.ok(items[id],id);
    const file=await readFile(new URL(name+'.glb',base));
    const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
    const still=await readFile(new URL(name+'.png',base));
    assert.equal(still.toString('hex',0,8),'89504e470d0a1a0a');
    assert.deepEqual(new Set(gltf.animations.map(c=>c.name)),new Set(clips),id);
    const meshes=[],materials=new Set();
    gltf.scene.traverse(node=>{
      if(node.isMesh){meshes.push(node);materials.add(node.material);assert.ok(node.geometry.attributes.color);}
    });
    assert.equal(materials.size,1,id);
    const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
    assert.ok(triangles<=2200 && meshes.length<=(meta.animal?8:2),id+' mobile budget');
    assert.ok(file.length<260_000,id+' network budget');
    function measure(){
      gltf.scene.updateMatrixWorld(true);
      for(const m of meshes){
        const positions=m.geometry.attributes.position;
        for(let i=0;i<positions.count;i++){
          point.fromBufferAttribute(positions,i).applyMatrix4(m.matrixWorld);
          assert.ok(point.y>=-.011 && point.y<=meta.maxHeight+.012,id+' height');
          if(meta.animal) assert.ok(Math.hypot(point.x,point.z)<=meta.radius+.008,id+' radius');
          else assert.ok(Math.abs(point.x)<=meta.width*.5+.012 && Math.abs(point.z)<=meta.depth*.5+.012,id+' footprint');
        }
      }
    }
    if(!clips.length)measure();
    for(const clip of gltf.animations){
      const mixer=new AnimationMixer(gltf.scene);
      mixer.clipAction(clip).play();
      for(let i=0;i<31;i++){mixer.setTime(clip.duration*i/31);measure();}
      mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
    }
  }
});
