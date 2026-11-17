import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCabinLayout,facadePoint} from '../src/cabin-layout.js';
import {createNavigation} from '../src/navigation.js';
import {createCharacter,stepCharacter} from '../src/character-controller.js';
import {bodyClear} from '../src/traversal-motion.js';

const ground={height:(x,z)=>.22+.02*x-.025*z,depth:()=>0,level:0};
const site={bounds:()=>true};
const cabin={id:1,type:'cedar',x:14.25,z:0,w:5.4,d:4.2,a:Math.PI/6,deck:true};

function toWorld(x,z){
  const c=Math.cos(cabin.a),s=Math.sin(cabin.a);
  return [cabin.x+c*x+s*z,cabin.z-s*x+c*z];
}
const stroke=(id,type,w,path)=>({id,type,w,p:path.map(([x,z])=>toWorld(x,z))});

function walkToPorch(world,side){
  const layout=resolveCabinLayout(cabin,world,ground);
  assert.equal(layout.entry.side,side);
  const nav=createNavigation(world,ground,site,[],[]);
  const face=layout.facades.find(f=>f.side===side);
  const start=facadePoint(face,layout.entry.u,4.5);
  const [x,z]=toWorld(start.x,start.z);
  const heading=cabin.a+face.yaw+Math.PI;
  const p=createCharacter(x,z,nav.support(x,z,.30),heading);
  for(let i=0;i<185;i++){
    stepCharacter(p,{forward:1,walk:true,yaw:heading},1/60,nav);
    assert.ok(p.grounded && bodyClear(nav,null,null,p),'a walking capsule should ascend each step');
  }
  const deck=layout.walkable.find(part=>part.kind==='deck');
  assert.ok(Math.abs(p.y-ground.height(cabin.x,cabin.z)-deck.top)<.001);
  const door=facadePoint(face,layout.entry.u),[doorX,doorZ]=toWorld(door.x,door.z);
  assert.ok(Math.hypot(doorX-p.x,doorZ-p.z)<.51,'the closed door stops the character at its threshold');
  const rail=layout.rails[0],[rx,rz]=toWorld(rail.x,rail.z);
  assert.ok(nav.bodyContact(rx,ground.height(cabin.x,cabin.z)+deck.top,rz,.2),'porch rails remain solid');
  return nav;
}

test('rerouting a saved approach moves the walkable deck and stair flight to the correct rotated facade',()=>{
  const old=stroke(2,'stonepath',1.1,[[0,8],[0,2.1]]);
  const erased=stroke(3,'road-erase',2,[[0,2.1],[0,4.1]]);
  const east=stroke(4,'dirtpath',1.1,[[8,0],[2.7,0]]);
  const world={objects:[cabin],strokes:[old]};
  walkToPorch(world,'front');
  const edited=walkToPorch({...world,strokes:[old,erased,east]},'right');
  const original=resolveCabinLayout(cabin,world,ground).walkable.find(part=>part.kind==='deck');
  const [x,z]=toWorld(original.x,original.z);
  assert.equal(edited.support(x,z,.05),ground.height(x,z),'moving the entrance removes the old walkable deck');
  walkToPorch(world,'front');
});

test('a partially erased paint-generated bridge has no support beyond the remaining plank edge',()=>{
  const wet={height:()=>-.4,depth:()=>1,level:0,type:(_c,x)=>x>0?0:1};
  const plank={x:-.25,z:0,w:.5,d:.28,h:.35,a:0};
  const nav=createNavigation({objects:[],strokes:[]},wet,site,[],[plank]);
  assert.ok(nav.valid(-.25,0,.10,'land'));
  for(const [x,z] of [[.03,0],[-.2,.18]]) {
    assert.equal(nav.valid(x,z,.01,'land'),false);
    assert.equal(nav.support(x,z,.01),wet.height(x,z));
  }
});
