import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {preset} from '../src/sandbox-state.js';
import {buildLand,refreshLandRoads,withRoadCoverage} from '../src/sandbox-model.js';
import {strokeBounds} from '../src/edit-bounds.js';

const kit={
  geometry:Object.fromEntries(['box','grass','rock','fir','trunk','disc','flame'].map(k=>[k,new T.BoxGeometry()])),
  materials:Object.fromEntries(['basic','wood','grass','fir'].map(k=>[k,new T.MeshBasicMaterial()]))
};
const ground={level:0,height:()=>.1,depth:()=>0,type:()=>0};
test('a committed local road edit retains the terrain, dormant trees, untouched road patches and their GPU meshes',()=>{
  const far={id:1,type:'stonepath',w:1,p:[[8,4],[13,4]]};
  const world={...preset('pine'),objects:[],strokes:[far]};
  const region={x:0,z:0,continuous:true,coarse:true,resolution:32,field:withRoadCoverage(ground,world.strokes)};
  const land=buildLand(kit,world,region),{surface,vegetation,roadDetails,navigation}=land.userData;
  const farPatch=roadDetails.children[0];
  assert.ok(farPatch);
  const vertexData=surface.geometry.attributes.position.array;
  const matrices=vegetation.children.map(mesh=>mesh.instanceMatrix.array.slice());
  const target=navigation.trees.find(tree=>tree.x<-5&&Math.abs(tree.z)<10);
  assert.ok(target);
  const local={id:2,type:'dirtpath',w:1.1,p:[[target.x,target.z],[target.x+.2,target.z+.3]]};
  const next={...world,strokes:[far,local]},dirty=[strokeBounds(local)];
  refreshLandRoads(kit,land,next,region,dirty);
  assert.equal(land.userData.surface,surface);
  assert.equal(land.userData.vegetation,vegetation);
  assert.equal(surface.geometry.attributes.position.array,vertexData);
  assert.ok(land.userData.roadDetails.children.includes(farPatch));
  assert.equal(land.userData.navigation.trees.some(t=>t.key===target.key),false);
  const reloaded=buildLand(kit,next,{...region,field:withRoadCoverage(ground,next.strokes)});
  vegetation.children.forEach((mesh,i)=>assert.deepEqual(mesh.instanceMatrix.array,
    reloaded.userData.vegetation.children[i].instanceMatrix.array));
  refreshLandRoads(kit,land,world,region,dirty);
  assert.ok(land.userData.navigation.trees.some(t=>t.key===target.key));
  vegetation.children.forEach((mesh,i)=>assert.deepEqual(mesh.instanceMatrix.array,matrices[i]));
});
