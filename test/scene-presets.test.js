import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneDesigns,createScene,appendScene} from '../src/scene-presets.js';
import {items,preset,footprint,normalize} from '../src/sandbox-state.js';
import {appendRegion,normalizeTerritory,territoryEnvelope,joinRegions} from '../src/territory.js';

test('three editable scenes contain valid independent objects and survive normalization',()=>{
 for(const id of Object.keys(sceneDesigns)){
  const scene=createScene(id),restored=normalize(scene);
  assert.ok(scene.objects.length>=18&&scene.objects.length<=24);
  assert.equal(restored.scene,id);assert.deepEqual(restored.objects,scene.objects);assert.deepEqual(restored.strokes,scene.strokes);
  assert.equal(new Set([...scene.objects,...scene.strokes].map(o=>o.id)).size,scene.objects.length+scene.strokes.length);
  for(const o of scene.objects){assert.ok(items[o.type]&&!items[o.type].brush);assert.ok(footprint(o).every(([x,z])=>Math.abs(x)<15&&Math.abs(z)<11.4));}
  const copy=createScene(id);scene.objects[0].x=99;scene.strokes[0].p[0][0]=99;assert.notEqual(copy.objects[0].x,99);assert.notEqual(copy.strokes[0].p[0][0],99);
 }
});

test('generating repeatedly preserves existing construction, IDs, edits and expansion after reload',()=>{
 let world=joinRegions([[0,0,preset('pine')]]);
 const original=structuredClone(world),oldObjects=world.objects,oldStrokes=world.strokes;
 for(const id of Object.keys(sceneDesigns)){
  const result=appendScene(world,id,{x:0,z:0});world=result.world;
  assert.equal(world.regions[`${result.x},${result.z}`].scene,id);
 }
 assert.equal(Object.keys(world.regions).length,4);
 assert.deepEqual(world.objects.slice(0,oldObjects.length),oldObjects);assert.deepEqual(world.strokes.slice(0,oldStrokes.length),oldStrokes);
 assert.deepEqual(original,joinRegions([[0,0,preset('pine')]]));
 const moved=world.objects.find(o=>o.type==='build-huizhou');moved.x+=1.25;moved.a=.75;
 world.objects=world.objects.filter(o=>o.type!=='build-lighthouse');
 world=normalizeTerritory(JSON.parse(JSON.stringify(territoryEnvelope(world))));
 assert.equal(world.objects.find(o=>o.id===moved.id).x,moved.x);assert.ok(!world.objects.some(o=>o.type==='build-lighthouse'));
 assert.equal(Object.values(world.regions).filter(m=>m.scene).length,3);
 world=appendRegion(world,preset('blank'),2,0);assert.equal(Object.keys(world.regions).length,5);
 assert.equal(new Set([...world.objects,...world.strokes].map(o=>o.id)).size,world.objects.length+world.strokes.length);
});

test('new scenes avoid a building already straddling the requested frontier',()=>{
 const base=preset('blank');base.objects=[{id:1,type:'build-huizhou',x:15,z:0,w:5.5,d:4.8,a:0}];
 const world=joinRegions([[0,0,base]]),result=appendScene(world,'garden',{x:0,z:0});
 assert.notDeepEqual([result.x,result.z],[1,0]);assert.deepEqual(result.world.objects[0],world.objects[0]);
});
