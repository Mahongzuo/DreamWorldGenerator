import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {preset} from '../src/sandbox-state.js';
import {joinRegions,sliceRegion} from '../src/territory.js';
import {createRoadPreview} from '../src/road-preview.js';
import {buildObject,updateRoadDetails,makeTileTerrain,withRoadCoverage} from '../src/sandbox-model.js';

const kit={
  geometry:Object.fromEntries(['box','grass','rock'].map(name=>[name,new T.BoxGeometry()])),
  materials:Object.fromEntries(['basic','wood','metal','window','grass'].map(name=>[name,new T.MeshBasicMaterial()]))
};
const ground={level:0,height:()=>0,depth:(_x,z)=>Math.abs(z-3.5)<1?1:0,
  type:(channel,_x,z)=>channel===0&&Math.abs(z-3.5)<1?1:0};
const makeStroke=(id,type,w,p)=>({id,type,w,p});
function fixture(){
  const blank={...preset('blank'),objects:[],strokes:[]};
  const world=joinRegions([[0,0,blank],[1,0,blank]]);
  const cedar={type:'cedar',id:1,w:5.4,d:4.2,x:11.7,z:0,a:0};
  world.objects=[cedar,{...cedar,id:2,x:-5,z:3}];
  world.strokes=[makeStroke(3,'stonepath',1.65,[[-14,3.5],[44,3.5]])];
  const scene=new T.Scene(),land=new T.Group();
  land.userData.field=withRoadCoverage(ground,world.strokes);
  for(const x of [0,1]){
    const local=sliceRegion(world,x,0),region={x,z:0,continuous:true},tile=new T.Group();
    const field=withRoadCoverage(ground,local.strokes);
    const surface=makeTileTerrain(local,field,region),roadDetails=new T.Group();
    updateRoadDetails(kit,local,field,region,roadDetails);
    const vegetation=new T.Group(),stem=new T.InstancedMesh(kit.geometry.grass,kit.materials.grass,1);
    const localX=x?-14:14.7;
    stem.setMatrixAt(0,new T.Matrix4().makeTranslation(localX,.2,0));
    vegetation.add(stem);
    vegetation.userData.samples=[{x:localX,z:0,hidden:false,instances:[{mesh:stem,index:0}]}];
    tile.userData={world:local,region,field,surface,roadDetails,vegetation};
    tile.position.x=x*30;tile.add(surface,vegetation,roadDetails);land.add(tile);
  }
  scene.add(land);
  const objects=new Map(world.objects.map(object=>{
    const group=buildObject(kit,object,world,land.userData.field);
    scene.add(group);return [object.id,{object,group}];
  }));
  return {world,land,scene,objects,preview:createRoadPreview(kit,scene,objects)};
}
test('live drawing swaps only the affected cedar, restores the saved doorway and adjacent tile surfaces on cancel',()=>{
  const {world,land,objects,scene,preview}=fixture();
  const home=objects.get(1).group,distant=objects.get(2).group;
  const colors=land.children.map(tile=>tile.userData.surface.geometry.attributes.color.array.slice());
  const draft=makeStroke(4,'dirtpath',1.2,[[22,0]]);
  preview.show(world,land,true,draft);
  assert.equal(home.visible,true);
  draft.p.push([18,.03],[14.42,.03]);
  preview.show(world,land,true,draft);
  assert.equal(home.visible,false);
  const visible=scene.children.filter(m=>m.visible&&m.userData.object?.id===1);
  assert.equal(visible.length,1);
  assert.equal(visible[0].userData.cabinLayout.entry.side,'right');
  assert.equal(home.userData.cabinLayout.entry.side,'front');
  assert.deepEqual(scene.children.filter(m=>m.userData.object?.id===2),[distant]);
  assert.ok(distant.visible);
  for(const [i,tile] of land.children.entries()){
    assert.notDeepEqual(tile.userData.surface.geometry.attributes.color.array,colors[i]);
    assert.ok(tile.userData.vegetation.userData.samples[0].hidden);
    assert.equal(tile.userData.vegetation.children[0].instanceMatrix.array[5],0);
    assert.ok(tile.userData.roadDetails.visible);
    assert.ok(tile.userData.roadDetails.children.some(group=>!group.visible));
  }
  preview.clear();
  assert.equal(visible[0].parent,null);
  assert.ok(home.visible);
  for(const [i,tile] of land.children.entries()){
    assert.deepEqual(tile.userData.surface.geometry.attributes.color.array,colors[i]);
    assert.equal(tile.userData.vegetation.userData.samples[0].hidden,false);
    assert.equal(tile.userData.vegetation.children[0].instanceMatrix.array[5],1);
    assert.ok(tile.userData.roadDetails.visible);
    assert.equal(tile.children.length,3);
  }
});
function seamPlanks(details,tileX,visibleOnly=false){
  const matrix=new T.Matrix4();
  let count=0;
  const inspect=mesh=>{
    if(!mesh.isInstancedMesh)return;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);
      if(Math.abs(matrix.elements[5]-.112)<1e-5&&Math.abs(tileX+matrix.elements[12]-15)<.65)count++;
    }
  };
  if(visibleOnly)details.traverseVisible(inspect);
  else details.traverse(inspect);
  return count;
}
test('a live eraser replaces only touched patches across a seam; appending points and cancel restore all originals',()=>{
  const {world,land,preview}=fixture(),draft=makeStroke(4,'road-erase',2.3,[[15,2.5],[15,4.5]]);
  const farGroups=land.children.map((tile,i)=>tile.userData.roadDetails.userData.cells.get(i?'1,0':'-2,0').group);
  preview.show(world,land,true,draft);
  for(let i=0;i<2;i++){
    const tile=land.children[i],committed=tile.userData.roadDetails;
    assert.ok(seamPlanks(committed,tile.position.x)>0);
    assert.equal(seamPlanks(tile,tile.position.x,true),0);
    assert.ok(committed.visible);
    assert.ok(farGroups[i].visible);
    assert.equal(farGroups[i].parent,committed);
  }
  // Extend the same drag well away from the original cutoff. The patch cut on
  // the previous input is still the visible one and the remote west patch stays resident.
  for(const x of [17,19,21,23,25,27,29,31,33,35,37,39,41,43]){
    draft.p.push([x,3.5]);preview.show(world,land,true,draft);
  }
  assert.equal(seamPlanks(land.children[0],0,true),0);
  assert.ok(farGroups[0].visible);
  assert.equal(farGroups[1].visible,false);
  preview.clear();
  for(const [i,tile] of land.children.entries()){
    assert.equal(tile.children.length,3);
    assert.ok(farGroups[i].visible);
    assert.equal(farGroups[i].parent,tile.userData.roadDetails);
    assert.ok(tile.userData.roadDetails.children.every(group=>group.visible));
    assert.ok(seamPlanks(tile,tile.position.x,true)>0);
  }
});
