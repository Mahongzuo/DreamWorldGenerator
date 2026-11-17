import test from 'node:test';
import assert from 'node:assert/strict';
import {createShoreSurvey,shoreReport} from '../src/shore-habitat.js';
import {createShoreVisitors} from '../src/shore-visitors.js';
import {createAnimalCrowd} from '../src/navigation.js';
import {joinRegions} from '../src/territory.js';
import {preset} from '../src/sandbox-state.js';

const fixtures=[
  {type:'dipper',anchor:'watermill',clip:'Fly',idle:'Perch'},
  {type:'meadow-hare',anchor:'pasture-shelter',clip:'Leap',idle:'Crouch'},
  {type:'sea-gull',anchor:'build-lighthouse',clip:'Fly',idle:'Perch'},
  {type:'shore-crab',anchor:'tidal-rocks',clip:'Scuttle',idle:'Idle'}
];
function fixture({type,anchor}){
  // The landmark is in plot 0. Its water, lawn, sand and trees are in the eastern plot.
  const plot=preset('blank'),world=joinRegions([[0,0,plot],[1,0,plot]]);
  const landmark={id:1,type:anchor,x:13.4,z:0,w:2,d:2,a:0};
  world.objects=[landmark,{id:2,type:'oak',x:19,z:5,w:1,d:1,a:0}];
  const terrain=type==='meadow-hare'?'lawn':'sand';
  const water=type==='dipper'?'brook':'pond';
  world.strokes=[{id:3,type:type==='meadow-hare'?terrain:water,w:3.7,p:[[18,-6],[18,6]]}];
  const depth=(x,z)=>type==='meadow-hare'?0:Math.max(0,Math.min(1,(1.85-Math.abs(x-18))*2.2));
  const field={height:(x,z)=>.025*z,depth,paint:(x,z)=>depth(x,z)>.28?water:x>15?terrain:undefined};
  const nav={height:field.height,cameraBlocked:(x,y,z,r)=>y-r<field.height(x,z)||Math.hypot(x-landmark.x,z)<1.26+r,
    valid:(x,z,r)=>x>12&&x<22&&Math.abs(z)<6&&depth(x,z)<.28&&Math.hypot(x-landmark.x,z)>1.26+r};
  const center={x:0,z:0},crowd=createAnimalCrowd();
  return {world,field,nav,crowd,center,landmark};
}

for(const spec of fixtures)test(spec.type+' finds habitat across a seam, moves, and leaves after editing',()=>{
  const {world,field,nav,crowd,center,landmark}=fixture(spec);
  const survey=createShoreSurvey().update(world,field,nav,center);
  const habitat=shoreReport(survey,field,nav,landmark)[spec.type];
  assert.ok(habitat.ready,JSON.stringify(habitat));
  let lastReport;
  const poses=[];
  const visitors=createShoreVisitors({makeModel:type=>type,removeModel:()=>{},
    paintModel:(type,pose)=>{if(type===spec.type)poses.push(pose);},onReport:r=>lastReport=r});
  visitors.update(world,field,nav,crowd,center);
  visitors.watch(landmark);
  let observed=false;
  for(let i=0;i<630;i++){
    visitors.step(1/30,true,landmark,true);
    observed||=visitors.targets().some(t=>t.type===spec.type&&t.wildVisitor);
  }
  assert.equal(lastReport[spec.type].state,'here');
  assert.ok(observed);
  assert.ok(poses.some(p=>p.motion===spec.clip)&&poses.some(p=>p.motion===spec.idle));
  if(spec.type==='shore-crab')assert.ok(poses.every(p=>Math.abs(p.y-field.height(p.x,p.z))<1e-6));
  const changed=spec.type==='meadow-hare'?{...world,objects:[landmark]}:{...world,strokes:[]};
  const dryField={...field,depth:()=>0,paint:()=>undefined};
  // In a dry garden the same props alone cannot attract coastal or stream wildlife.
  visitors.update(changed,spec.type==='meadow-hare'?field:dryField,nav,crowd,center);
  for(let i=0;i<120;i++)visitors.step(1/30,true,landmark);
  assert.equal(visitors.count(),0);assert.equal(lastReport[spec.type].state,'missing');
  assert.equal(changed.objects[0],landmark);
});

test('fresh ponds do not attract running-water dippers, and painted gravel cannot replace tidepool sand',()=>{
  for(const spec of [fixtures[0],fixtures[3]]){
    const {world,field,nav,center,landmark}=fixture(spec);
    const masked={...field,paint:(x,z)=>field.depth(x,z)>.28?'pond':'gravel'};
    const survey=createShoreSurvey().update(world,masked,nav,center);
    assert.equal(shoreReport(survey,masked,nav,landmark)[spec.type].ready,false);
  }
});
