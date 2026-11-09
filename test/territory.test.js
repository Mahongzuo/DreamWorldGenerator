import test from 'node:test';
import assert from 'node:assert/strict';
import {joinRegions,appendRegion,sliceRegion,contains,normalizeTerritory,territoryEnvelope} from '../src/territory.js';
import {preset} from '../src/sandbox-state.js';
import {createNavigation} from '../src/navigation.js';
const blank=()=>preset('blank');

test('migrates separate legacy saves without ID collisions or losing either plot',()=>{
  const a=preset('pine'),b=preset('ink');
  const world=joinRegions([[0,0,a],[1,0,b]]);
  assert.equal(world.objects.length,a.objects.length+b.objects.length);
  assert.equal(new Set([...world.objects,...world.strokes].map(o=>o.id)).size,world.objects.length+world.strokes.length);
  assert.equal(world.objects[a.objects.length].x,b.objects[0].x+30);
  assert.deepEqual(a,preset('pine'));
});

test('one building and one road span a seam, survive reload and project to both tiles',()=>{
  let world=joinRegions([[0,0,blank()],[1,0,blank()]]);
  world={...world,objects:[{id:1,type:'cedar',x:15,z:0,w:5,d:4,a:0}],strokes:[{id:2,type:'stonepath',w:1,p:[[10,5],[15,5],[20,5],[35,5]]}]};
  const loaded=normalizeTerritory(JSON.parse(JSON.stringify(territoryEnvelope(world))));
  assert.deepEqual(loaded.objects[0].x,15);
  assert.deepEqual(loaded.strokes[0].p,world.strokes[0].p);
  for(const x of [0,1]){
    const tile=sliceRegion(loaded,x,0);
    assert.equal(tile.objects.length,1);assert.equal(tile.strokes.length,1);
    assert.equal(tile.objects[0].x,15-x*30);
  }
  assert.equal(loaded.objects.length,1);
});

test('acquisition is idempotent and continuous bounds preserve unclaimed holes',()=>{
  let world=joinRegions([[0,0,blank()],[1,0,blank()],[0,1,blank()]]);
  assert.equal(appendRegion(world,preset('pine'),1,0),world);
  assert.equal(contains(world.regions,15,0,2),true);
  assert.equal(contains(world.regions,15,11.4,.3),false);
  assert.equal(contains(world.regions,0,11.4,.3),true);
  assert.equal(contains(world.regions,45,0,.3),false);
});

test('global navigation crosses an owned seam and respects structures on both sides',()=>{
  const world=joinRegions([[0,0,blank()],[1,0,blank()]]);
  world.objects=[{id:1,type:'cedar',x:15,z:0,w:5,d:4,a:0}];
  const nav=createNavigation(world,{level:0,height:()=>0,depth:()=>0},{bounds:(x,z,r)=>contains(world.regions,x,z,r)},[],[]);
  assert.equal(nav.sweep(13,5,18,5,.3,'land'),true);
  assert.equal(nav.sweep(10,0,20,0,.3,'land'),false);
  assert.equal(nav.sweep(43,5,48,5,.3,'land'),false);
});

test('long strokes and negative regions persist without old sandbox coordinate clamping',()=>{
  let world=joinRegions([[0,0,blank()],[-1,0,blank()],[-2,0,blank()]]);
  world.strokes=[{id:1,type:'dirtpath',w:1,p:[[-70,0],[-40,0],[-10,0],[10,0]]}];
  world.objects=[{id:2,type:'tudor',x:-60,z:0,w:4,d:3,a:0}];
  const loaded=normalizeTerritory(territoryEnvelope(world));
  assert.equal(loaded.strokes[0].p[0][0],-70);
  assert.equal(loaded.objects[0].x,-60);
  assert.equal(normalizeTerritory({format:1,world:{...world,regions:{'oops':{}}}}),null);
});
