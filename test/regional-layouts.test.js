import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,appendScene} from '../src/scene-presets.js';
import {items,preset} from '../src/sandbox-state.js';
import {joinRegions,normalizeTerritory,territoryEnvelope,regionAt} from '../src/territory.js';
import {recordShoreVisit} from '../src/habitat-progress.js';
import {normalizeGame} from '../src/gameplay.js';
import {distanceToStroke} from '../src/scene-connections.js';

const variants=[['village','mill','watermill','dipper'],['village','pasture','pasture-shelter','meadow-hare'],
  ['coast','beacon','build-lighthouse','sea-gull'],['coast','tidepool','tidal-rocks','shore-crab']];

test('four editable layouts survive adjoining expansion, changes and journal export',()=>{
  const base=preset('blank');
  base.strokes=[{id:1,type:'dirtpath',p:[[5,1],[15,1]],w:1.2}];
  let world=joinRegions([[0,0,base]]);
  world.game=normalizeGame();
  for(const [id,layout,landmark,species] of variants){
    const config={layout,seed:'REGION-17',density:.5,plants:8};
    const a=createScene(id,config);
    assert.deepEqual(a,createScene(id,config));
    assert.ok(a.objects.some(o=>o.type===landmark));
    assert.ok(!a.objects.some(o=>o.type===species),'wild visitors are not stamped into the layout');
    assert.equal(createScene(id,{...config,plants:0}).objects.filter(o=>items[o.type].category==='plant').length,0);
    const old=structuredClone(world);
    const result=appendScene(world,id,{x:0,z:0},config);
    world=result.world;
    assert.deepEqual(world.strokes.slice(0,old.strokes.length),old.strokes);
    assert.deepEqual(world.objects.slice(0,old.objects.length),old.objects);
    assert.equal(world.regions[result.x+','+result.z].generation.layout,layout);
    const placed=world.objects.slice(old.objects.length).find(o=>o.type===landmark);
    assert.ok(placed,'appending '+layout+' retains its landmark');
    world.objects=world.objects.map(o=>o===placed?{...o,x:o.x+.2,a:1.25}:o);
    world.game=recordShoreVisit(world.game,{wildVisitor:true,type:species,x:placed.x,z:placed.z});
  }
  const restored=normalizeTerritory(JSON.parse(JSON.stringify(territoryEnvelope(world))));
  assert.deepEqual(Object.values(restored.regions).map(r=>r.generation?.layout),Object.values(world.regions).map(r=>r.generation?.layout));
  assert.deepEqual(restored.game.shore,world.game.shore);
  assert.equal(restored.game.shore.visits.length,4);
  assert.equal(restored.objects.filter(o=>o.a===1.25).length,4);
});
test('a mirrored mill keeps its waterwheel on the stream side',()=>{
  for(let i=0;i<14;i++){
    const scene=createScene('village',{layout:'mill',seed:'WHEEL-'+i,density:1,plants:2});
    const mill=scene.objects.find(o=>o.type==='watermill'),brook=scene.strokes.find(s=>s.type==='brook');
    const axle=[mill.x+1.965*Math.cos(mill.a),mill.z-1.965*Math.sin(mill.a)];
    assert.ok(distanceToStroke(...axle,brook).distance<brook.w*.5,'water under axle '+i);
  }
});

test('joining nine seeded plots preserves a landmark in every new territory',()=>{
  for(const [id,layout,landmark] of variants){
    const {world}=appendScene(joinRegions([[0,0,createScene('garden')]]),id,{x:0,z:0},
      {seed:'CROSS-0',width:3,height:3,layout,plants:8});
    const occupied=new Set(world.objects.filter(o=>o.type===landmark).map(o=>regionAt(o.x,o.z).join(',')));
    assert.equal(occupied.size,9,layout);
  }
});
