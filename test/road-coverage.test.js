import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRoadCoverage} from '../src/road-coverage.js';
import {buildRoadDetails,makeTerrain,makeTileTerrain,updateRoadSurface,withRoadCoverage} from '../src/sandbox-model.js';
import {createNavigation} from '../src/navigation.js';
import {neighborPorts} from '../src/scene-connections.js';
import {preset} from '../src/sandbox-state.js';
import {joinRegions,sliceRegion} from '../src/territory.js';

const stroke=(id,type,w,p)=>({id,type,w,p});
const road=stroke(1,'stonepath',2,[[-4,0],[4,0]]);
const cut=stroke(2,'road-erase',1,[[0,-2],[0,2]]);
test('local road erase, overpaint and undo query the same ordered footprint',()=>{
  const repainted=stroke(3,'dirtpath',.6,[[0,-1],[0,1]]);
  const before=createRoadCoverage([road]), after=createRoadCoverage([road,cut]), redone=createRoadCoverage([road,cut,repainted]);
  assert.equal(before.typeAt(0,0),'stonepath');
  assert.equal(after.typeAt(0,0),null);
  assert.equal(after.typeAt(1,0),'stonepath');
  assert.equal(redone.typeAt(0,0),'dirtpath');
  assert.equal(redone.survivesAt(road,0,0),false);
  assert.equal(createRoadCoverage([road,repainted]).survivesAt(road,0,0),true);
  assert.equal(redone.survivesAt(repainted,0,0),true);
  assert.equal(redone.typeAt(.4,0),null);
  assert.equal(before.typeAt(0,0),'stonepath');
});

function wetBridge(strokes){
  const world={seed:'bridge-cut',strokes,objects:[]};
  const field=withRoadCoverage({height:()=>-1,level:0,depth:()=>1,type:()=>0},strokes);
  const kit={geometry:{box:new T.BoxGeometry()},materials:{wood:new T.MeshBasicMaterial()}};
  const boards=[];
  buildRoadDetails(kit,world,field,null,boards);
  const nav=createNavigation(world,field,null,[],boards);
  return {boards,nav};
}
test('cutting a hole or one edge clips both wet planks and walking support; overpainting does not double the deck',()=>{
  const base=wetBridge([road]), severed=wetBridge([road,cut]);
  assert.ok(base.nav.valid(0,0,.12,'land'));
  assert.equal(severed.nav.valid(0,0,.12,'land'),false);
  assert.ok(severed.nav.valid(1.6,0,.12,'land'));
  assert.ok(severed.boards.every(b=>Math.abs(b.x)>.5));
  const edge=wetBridge([road,stroke(2,'road-erase',1.2,[[-2,.9],[2,.9]])]);
  const plank=edge.boards.find(b=>Math.abs(b.x)<.15);
  assert.ok(Math.abs(plank.w-1.3)<.01);
  assert.ok(Math.abs(plank.z+.35)<.01);
  assert.equal(edge.nav.valid(0,.8,.1,'land'),false);
  assert.ok(edge.nav.valid(0,-.5,.1,'land'));
  const restored=wetBridge([road,cut,{...road,id:3,type:'dirtpath'}]);
  assert.deepEqual(restored.boards,base.boards);
});

test('a seam produces one road footprint after a partial cut, erasure and painting it again',()=>{
  const local=preset('blank');
  local.objects=[];
  local.strokes=[stroke(1,'stonepath',2,[[12,0],[18,0]])];
  let world=joinRegions([[0,0,local],[1,0,{...local,strokes:[]}]]);
  const ports=()=>neighborPorts(world,1,0).filter(p=>p.kind==='road');
  const halves=()=>[0,1].map(x=>createRoadCoverage(sliceRegion(world,x,0).strokes));
  assert.equal(ports()[0].w,2);
  world={...world,strokes:[...world.strokes,stroke(2,'road-erase',1.4,[[14,1],[16,1]])]};
  const [left,right]=halves();
  assert.equal(left.typeAt(14.97,.8),null);
  assert.equal(right.typeAt(-14.97,.8),null);
  assert.equal(left.typeAt(14.97,0),'stonepath');
  assert.equal(right.typeAt(-14.97,0),'stonepath');
  assert.ok(Math.abs(ports()[0].w-1.3)<.01);
  world={...world,strokes:[...world.strokes,stroke(3,'road-erase',4,[[15,0]])]};
  assert.deepEqual(ports(),[]);
  world={...world,strokes:[...world.strokes,stroke(4,'dirtpath',.8,[[14,0],[16,0]])]};
  assert.equal(ports().length,1);
  assert.equal(ports()[0].type,'dirtpath');
  assert.equal(ports()[0].w,.8);
});

test('a material stripe along a seam keeps the adjacent unpainted port',()=>{
  const world={regions:{'0,0':{}},strokes:[
    stroke(1,'stonepath',2,[[11,0],[16,0]]),
    stroke(2,'dirtpath',1,[[12,.5],[16,.5]])]};
  const ports=neighborPorts(world,1,0).sort((a,b)=>a.p[1]-b.p[1]);
  assert.deepEqual(ports.map(p=>p.type),['stonepath','dirtpath']);
  assert.ok(ports.every(p=>Math.abs(p.w-1)<.01));
});


test('incremental preview and cancellation exactly match a new terrain mesh, including wet ground tint',()=>{
  const world=preset('blank');
  const ground={height:(x,z)=>Math.sin(x)*.14,level:0,depth:()=>0,type:(ch,x,z)=>ch===0&&z>0?1:ch===1?1:0};
  const before=withRoadCoverage(ground,[road]), after=withRoadCoverage(ground,[road,cut]);
  for(const build of [f=>makeTerrain(world,f),f=>makeTileTerrain(world,f,{continuous:true,x:0,z:0})]){
    const mesh=build(before),colors=mesh.geometry.attributes.color;
    const saved=colors.array.slice();
    updateRoadSurface(mesh,after,-.5,-2.5,.5,2.5);
    assert.notDeepEqual(colors.array,saved);
    assert.deepEqual(colors.array,build(after).geometry.attributes.color.array);
    updateRoadSurface(mesh,before,-.5,-2.5,.5,2.5);
    assert.deepEqual(colors.array,saved);
  }
});
