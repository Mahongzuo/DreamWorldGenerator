import assert from 'node:assert/strict';
import test from 'node:test';
import {createNavigation,makeWander,wander} from '../src/navigation.js';

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
