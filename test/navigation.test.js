import assert from 'node:assert/strict';
import test from 'node:test';
import {createAnimalCrowd,createNavigation,makeWander,wander} from '../src/navigation.js';

const field={depth:x=>Math.abs(x-3)<.95?1:0,level:0,height:()=>.2};
const tree={key:8,type:'oak',x:-2,z:0,r:.20,crown:.78};
const building={id:1,type:'cedar',x:0,z:0,w:3,d:2.2,a:Math.PI/4};
const bridge={id:2,type:'stone-bridge',x:3,z:5,w:3.8,d:1.4,a:0};
const nav=createNavigation({objects:[building,bridge]},field,{x:0,z:0},[tree],[]);

test('land routes account for rotated footprints, tree trunks and deep water',()=>{
  assert.equal(nav.valid(.5,.35,.21,'land'),false);
  assert.equal(nav.valid(-2.29,0,.20,'land'),false);
  assert.equal(nav.valid(-2.7,0,.13,'land'),true);
  assert.equal(nav.valid(-2.7,0,.13,'fly'),false);
  assert.equal(nav.valid(3,3,.18,'land'),false);
  assert.equal(nav.valid(3,3,.18,'water'),true);
  assert.equal(nav.valid(1.6,3,.18,'water'),false);
  assert.equal(nav.sweep(1.2,3,4.8,3,.17,'land'),false);
});

test('bridge deck allows walking across water without entering it',()=>{
  assert.equal(nav.sweep(1,5,5,5,.18,'land'),true);
  assert.ok(nav.height(3,5)>.5);
  assert.equal(nav.sweep(1,5.9,5,5.9,.18,'land'),false);
});

test('simulated walking and swimming stay in their assigned habitats',()=>{
  const walkers=[makeWander(nav,-2.7,0,.23,'land',1.1,4),makeWander(nav,3.1,2.9,.15,'water',2.2,3)];
  for(const actor of walkers){
    assert.ok(actor);
    for(let i=0;i<2400;i++){
      const {x,z}=actor;
      wander(nav,actor,.05,.72);
      assert.ok(nav.valid(actor.x,actor.z,actor.r,actor.kind));
      assert.ok(nav.sweep(x,z,actor.x,actor.z,actor.r,actor.kind));
    }
    assert.ok(actor.clock>100);
  }
});

test('herd members spawn with room and cannot cross an occupied body',()=>{
  const crowd=createAnimalCrowd();
  const a=makeWander(nav,-5,3,.73,'land',1,3,crowd);
  const b=makeWander(nav,-5,3,.76,'land',2,3,crowd);
  assert.ok(a&&b);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=1.53);
  assert.equal(crowd.fits(a.x,a.z,.73,'land'),false);
  assert.equal(crowd.fits(a.x,a.z,.73,'water'),true);
  assert.equal(crowd.clearPath(b.x,b.z,a.x,a.z,.76,'land',b),false);
  crowd.remove(a);
  assert.equal(crowd.fits(a.x,a.z,.73,'land'),true);
});

test('a dense deer herd keeps its spacing, turns gradually and comes to rest',()=>{
  const crowd=createAnimalCrowd();
  const actors=Array.from({length:9},(_,i)=>makeWander(nav,-6.2+i%3*.5,4+Math.floor(i/3)*.4,.74,'land',i+.13,3,crowd));
  assert.ok(actors.every(Boolean));
  let stopped=false;
  for(let step=0;step<1400;step++){
    for(const a of actors){
      const {x,z,heading,travel}=a;
      wander(nav,a,.05,.63);
      assert.ok(Math.abs(a.heading-heading)<=1.35*.05+1e-8);
      assert.ok(Math.abs(a.travel-travel-Math.hypot(a.x-x,a.z-z))<1e-8);
      if(a.rest>.33&&a.speed===0&&a.travel>0)stopped=true;
      for(const b of actors)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=a.r+b.r+.04-1e-8);
    }
  }
  assert.ok(actors.filter(a=>a.travel>2).length>=6);
  assert.ok(stopped);
});
