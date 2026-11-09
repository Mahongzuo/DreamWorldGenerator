import test from 'node:test';import assert from 'node:assert/strict';
import {createScene,appendScene} from '../src/scene-presets.js';
import {neighborPorts,channel} from '../src/scene-connections.js';
import {preset,items} from '../src/sandbox-state.js';
import {joinRegions,normalizeTerritory,territoryEnvelope} from '../src/territory.js';
test('seeded layouts repeat, different seeds vary, and density and plant targets affect content',()=>{
 const options={seed:'LAYOUT-A',density:.5,plants:0};
 const a=createScene('garden',options);assert.deepEqual(a,createScene('garden',options));assert.notDeepEqual(a.objects,createScene('garden',{...options,seed:'LAYOUT-B'}).objects);
 assert.equal(a.objects.filter(o=>items[o.type].category==='plant').length,0);
 const b=createScene('garden',{...options,density:1.5,plants:18});
 assert.ok(b.objects.filter(o=>items[o.type].category==='plant').length>=12);
 assert.ok(b.objects.filter(o=>items[o.type].category==='house').length>a.objects.filter(o=>items[o.type].category==='house').length);
});
test('multi-plot generation preserves prior content, metadata and global cross-border strokes',()=>{
 const old=preset('blank');old.strokes=[{id:1,type:'stonepath',w:1.4,p:[[0,2],[15,2]]},{id:2,type:'jade',w:3,p:[[0,-5],[15,-5]]}];
 const world=joinRegions([[0,0,old]]),ports=neighborPorts(world,1,0);assert.equal(ports.length,2);
 const result=appendScene(world,'village',{x:0,z:0},{seed:'MULTI',width:2,height:2,density:1,plants:8});
 assert.equal(Object.keys(result.world.regions).length,5);assert.deepEqual(result.world.strokes.slice(0,2),world.strokes);
 const newStrokes=result.world.strokes.slice(2);for(const p of ports)assert.ok(newStrokes.some(s=>s.type===p.type&&s.w===p.w&&s.p.some(q=>Math.hypot(q[0]-p.p[0],q[1]-p.p[1])<.01)));
 const restored=normalizeTerritory(JSON.parse(JSON.stringify(territoryEnvelope(result.world))));
 assert.equal(Object.keys(restored.regions).length,5);assert.deepEqual(restored.strokes,result.world.strokes);
 assert.equal(Object.values(restored.regions).filter(r=>r.generation?.width===2).length,4);
 assert.equal(new Set([...restored.objects,...restored.strokes].map(o=>o.id)).size,restored.objects.length+restored.strokes.length);
});
