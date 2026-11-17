import test from 'node:test';
import assert from 'node:assert/strict';
import {createShoreSurvey,shoreReport,visitorRadius,findResidentRefuge} from '../src/shore-habitat.js';
import {createShoreVisitors} from '../src/shore-visitors.js';
import {normalizeShore,recordShoreVisit,shoreRegion} from '../src/habitat-progress.js';
import {normalizeGame} from '../src/gameplay.js';
import {createNavigation,createAnimalCrowd} from '../src/navigation.js';
import {joinRegions,normalizeTerritory,territoryEnvelope,contains} from '../src/territory.js';
import {preset} from '../src/sandbox-state.js';

function fixture(){
  const base=preset('blank');
  const world=joinRegions([[0,0,base],[1,0,base]]);
  world.objects=[
    {type:'reeds',id:1,x:14.3,z:0,w:.96,d:.96,a:0},
    {type:'nature-willow',id:2,x:19.75,z:.5,w:2.8,d:2.8,a:0}];
  world.strokes=[{id:3,type:'pond',p:[[17.3,-7],[17.3,7]],w:3.2}];
  const field={height:()=>0,level:0,depth:(x,z)=>Math.abs(z)>8?0:Math.max(0,Math.min(1,(1.75-Math.abs(x-17.3))*2.75))};
  const nav=createNavigation(world,field,{bounds:(x,z,r)=>contains(world.regions,x,z,r)},[],[]);
  return {world,field,nav,crowd:createAnimalCrowd(),center:{x:0,z:0}};
}
function setupVisitors(){
  const reports=[],shapes=new Map();
  const visitors=createShoreVisitors({
    makeModel(type,id){const m={type,id,poses:[]};shapes.set(id,m);return m;},
    removeModel(m){shapes.delete(m.id);},
    paintModel(m,pose){m.poses.push({...pose});},
    onReport:r=>reports.push(r)
  });
  const run=(seconds,viewer={x:15,z:0})=>{for(let i=0;i<Math.ceil(seconds*30);i++)visitors.step(1/30,true,viewer);};
  return {visitors,run,reports,shapes};
}

test('a planted bank recognises painted water across the plot edge and isolates remote edits',()=>{
  const {world,field,nav,center}=fixture(),cache=createShoreSurvey(),survey=cache.update(world,field,nav,center);
  assert.ok(world.objects[0].x<15 && world.strokes[0].p[0][0]>15);
  const bank=survey.options.frog[0],perch=survey.options.kingfisher[0];
  assert.ok(bank.ready);
  assert.ok(nav.valid(bank.seat.x,bank.seat.z,visitorRadius.frog,'land'));
  assert.ok(perch.ready);
  assert.deepEqual(shoreReport(survey,field,nav,{x:15,z:0}).kingfisher.checks,[true,true]);
  const remote={...world,objects:[...world.objects,{...world.objects[0],id:11,x:120}]};
  assert.equal(cache.update(remote,field,nav,center),survey);
  const removed=cache.update({...world,objects:world.objects.slice(0,1)},field,nav,center);
  assert.equal(removed.options.kingfisher.length,0);
  const withoutReeds=cache.update({...world,objects:world.objects.slice(1)},field,nav,center);
  assert.deepEqual(shoreReport(withoutReeds,field,nav,{x:16,z:1}).frog.checks,[true,false,true]);
});

test('visitors arrive, animate and retain identity across a plot seam; removing a perch causes safe departure',()=>{
  const {world,field,nav,crowd,center}=fixture(), {visitors,shapes,run}=setupVisitors();
  visitors.update(world,field,nav,crowd,center);
  run(5);
  assert.equal(visitors.count(),2);
  const king=shapes.get(2);
  assert.ok(king.poses.some(p=>p.motion==='Land'));
  assert.ok(king.poses.some(p=>p.motion==='Perch'));
  assert.equal(visitors.targets().filter(t=>t.wildVisitor).length,2);
  visitors.update(world,field,nav,crowd,{x:30,z:0});run(.5);
  assert.equal(shapes.get(2),king);
  const edited={...world,objects:world.objects.slice(0,1)};
  visitors.update(edited,field,nav,crowd,{x:30,z:0});run(3);
  assert.equal(shapes.has(2),false);
  assert.ok(king.poses.some(p=>p.motion==='Takeoff'));
  assert.ok(shapes.get(1).poses.some(p=>p.motion==='Leap'));
  assert.ok(visitors.targets().every(t=>t.type==='frog'));
  assert.equal(world.objects.length,2);
});

test('a crowded shore waits for room and finds legal ground for residents without deleting their world object',()=>{
  const {world,field,nav,crowd,center}=fixture(), {visitors,run}=setupVisitors();
  const survey=createShoreSurvey().update(world,field,nav,center),seat=survey.options.frog[0].seat;
  const resident={type:'frog',x:seat.x,z:seat.z,r:5,kind:'land'};
  crowd.update(resident);visitors.update(world,field,nav,crowd,center);run(5);
  assert.ok(!visitors.targets().some(a=>a.type==='frog'));
  crowd.remove(resident);
  resident.r=visitorRadius.frog;crowd.update(resident);
  run(3);
  const arrival=visitors.targets().find(a=>a.type==='frog');
  assert.ok(arrival && Math.hypot(arrival.x-resident.x,arrival.z-resident.z)>=2*resident.r);
  const object={id:10,type:'mallard',x:9,z:0,w:.55,d:.55,a:0};
  const slot=findResidentRefuge(nav,crowd,object,.35,'water');
  assert.ok(slot&&nav.valid(slot.x,slot.z,.35,'water'));
  assert.equal(object.x,9);
});

test('only wild observations enter the world page, with skip, locations and completion preserved through export',()=>{
  const {world}=fixture();let g=normalizeGame();
  assert.deepEqual(g.shore,{skipped:false,visits:[]});
  assert.equal(recordShoreVisit(g,{type:'frog',x:14,z:1}),g);
  const observed={wildVisitor:true,type:'frog',x:14.99,z:1};
  g=recordShoreVisit(g,observed);assert.equal(recordShoreVisit(g,observed),g);
  g=recordShoreVisit(g,{...observed,x:15.01});g=recordShoreVisit(g,{...observed,type:'kingfisher'});
  g={...g,shore:{...g.shore,skipped:true}};
  assert.equal(new Set(g.shore.visits.map(v=>v.type)).size,2);
  assert.equal(shoreRegion(g.shore.visits[0].x,1),'0,0');
  world.game={...g,mode:'adventure'};
  const reload=normalizeTerritory(JSON.parse(JSON.stringify(territoryEnvelope(world))));
  assert.deepEqual(reload.game.shore,g.shore);
  assert.deepEqual(normalizeShore({visits:[null,{x:NaN,z:0,type:'frog'},{x:0,z:1,type:'toString'}]}).visits,[]);
});
