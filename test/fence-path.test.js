import test from 'node:test';
import assert from 'node:assert/strict';
import {fenceHandleIndices,prepareFencePath,moveFenceKnot,validFenceKnots} from '../src/fence-path.js';
import {MAX_POINTS,normalize,preset} from '../src/sandbox-state.js';

const fence=p=>({id:9,type:'fence',w:.9,p});

test('old straight or single-post fences get editable knots without modifying the saved stroke',()=>{
  const old=fence([[0,0],[6,0]]);
  const prepared=prepareFencePath(old);
  assert.deepEqual(prepared.p,[[0,0],[3,0],[6,0]]);
  assert.deepEqual(prepared.knots,[0,1,2]);
  assert.deepEqual(old.p,[[0,0],[6,0]]);
  assert.equal(old.knots,undefined);
  assert.equal(prepareFencePath(prepared),prepared);
  assert.equal(moveFenceKnot(prepared,1,3.001,0),prepared);
  const single=prepareFencePath(fence([[1,1],[1,1]]));
  assert.deepEqual(single.knots,[0]);
  assert.deepEqual(moveFenceKnot(single,0,2,3).p,[[2,3]]);
  assert.deepEqual(prepareFencePath(fence([[0,0],[.2,0]])).knots,[0,1]);
});

test('adjusting a sampled fence moves only the two neighboring spans and retains its bends and knot IDs',()=>{
  const points=Array.from({length:25},(_,n)=>[n/4,n>0&&n<24?.08*(n%2):0]);
  for(let i=1;i<=12;i++)points.push([6, i/4]);
  const old=fence(points),prepared=prepareFencePath(old);
  const corner=prepared.p.findIndex(([x,z])=>x===6&&z===0);
  assert.ok(prepared.knots.includes(corner));
  const inside=prepared.knots[1],moved=moveFenceKnot(prepared,inside,3,1);
  assert.equal(moved.knots,prepared.knots);
  assert.deepEqual(moved.p[inside],[3,1]);
  const stop=prepared.knots[2];
  assert.equal(moved.p[0],prepared.p[0]);
  for(let i=stop;i<prepared.p.length;i++)assert.equal(moved.p[i],prepared.p[i]);
  assert.ok(moved.p[inside-1][1]>prepared.p[inside-1][1]);
  assert.deepEqual(old.p,points);
  const restored=JSON.parse(JSON.stringify(moved));
  assert.equal(prepareFencePath(restored),restored);
  assert.equal(moveFenceKnot(restored,-1,2,4),restored);
});

test('fence path remains within the save limit even when a sparse section is very long',()=>{
  const points=Array.from({length:MAX_POINTS-1},(_,i)=>[i*.25,0]);
  points.at(-1)[0]=10000;
  const limited=prepareFencePath(fence(points));
  assert.ok(limited.p.length<=MAX_POINTS);
  assert.ok(validFenceKnots(limited.p,limited.knots));
  assert.deepEqual(limited.p.at(-1),[10000,0]);
  assert.equal(validFenceKnots([[0,0],[1,1],[2,2]],[0,0,2]),false);
  assert.equal(validFenceKnots([[0,0],[1,1],[2,2]],[0,1.1,2]),false);
});

test('reload preserves edited knots and fence endpoints on the protruding island shore',()=>{
  const stroke={...fence([[14,0],[15.05,.2],[15.26,1]]),knots:[0,1,2]};
  const world={...preset('blank'),objects:[],strokes:[stroke]};
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(world))).strokes,[stroke]);
  const broken={...stroke,knots:[0,5,2]};
  const restored=normalize({...world,strokes:[broken]}).strokes[0];
  assert.deepEqual(restored.p,stroke.p);
  assert.equal(restored.knots,undefined);
  assert.ok(validFenceKnots(prepareFencePath(restored).p,prepareFencePath(restored).knots));
});

test('a closed fence shares one movable seam post and blends both adjacent runs after reload',()=>{
  const square=fence([[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1],[0,0]]);
  const prepared=prepareFencePath(square);
  assert.deepEqual(fenceHandleIndices(prepared),[0,2,4,6]);
  const moved=moveFenceKnot(prepared,0,-1,-1);
  assert.deepEqual(moved.p,[[-1,-1],[.5,-.5],[2,0],[2,1],[2,2],[1,2],[0,2],[-.5,.5],[-1,-1]]);
  const restored=prepareFencePath(JSON.parse(JSON.stringify(moved)));
  assert.deepEqual(fenceHandleIndices(restored),[0,2,4,6]);
  assert.deepEqual(moveFenceKnot(restored,8,0,0).p,square.p);
  const interior=moveFenceKnot(prepared,2,3,1);
  assert.equal(interior.p[0],prepared.p[0]);assert.equal(interior.p.at(-1),prepared.p.at(-1));
  const open=prepareFencePath(fence([[0,0],[1,0],[.01,0]]));
  assert.deepEqual(fenceHandleIndices(open),open.knots);
  assert.deepEqual(fenceHandleIndices(prepareFencePath(fence([[0,0]]))),[0]);
});
