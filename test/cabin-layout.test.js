import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {resolveCabinLayout, atticWindowFits, cabinRise} from '../src/cabin-layout.js';
import {buildCabin} from '../src/model.js';

const field = {height: () => 0};
const house = {type:'cedar',id:3,w:5.4,d:4.2,x:0,z:0,a:0};
const stroke = (p,type='dirtpath') => ({id:1,type,w:1,p});
const solve = (o=house, strokes=[]) => resolveCabinLayout(o,{strokes},field);

test('facades grow by whole bays while structural openings keep their dimensions', () => {
  const counts = [2.4,5.4,8].map(w => {
    const layout = solve({...house,w});
    const front = layout.facades[0].openings.filter(op=>op.kind !== 'attic');
    assert.equal(front.filter(op=>op.kind === 'door').length,1);
    assert.ok(front.every(op=>op.width === (op.kind==='door' ? 1.02 : .85)));
    for (const op of front) assert.ok(Math.abs(op.u) + op.width/2 < w/2);
    return front.length;
  });
  assert.ok(counts[0] < counts[1] && counts[1] < counts[2]);
  assert.equal(cabinRise(house),house.w*.37);
  assert.equal(solve({...house,ridgeRise:.35}).facades[0].openings.some(op=>op.kind==='attic'),false);
});

test('a perpendicular surviving approach aligns the door with the path, parallel roads leave it alone', () => {
  const front = stroke([[0,5],[0,2.1]]);
  const side = stroke([[5.8,.34],[2.7,.34]]);
  const erase = stroke([[0,3.6],[0,2.1]],'road-erase');
  assert.equal(solve(house,[front,side]).entry.side,'front');
  const layout=solve(house,[front,erase,side]);
  assert.equal(layout.entry.side,'right');
  assert.ok(Math.abs(layout.entry.u+.34)<1e-8);
  for(const step of layout.walkable.slice(1))assert.ok(Math.abs(step.z-.34)<1e-8);
  assert.equal(solve(house,[stroke([[2.85,-1.5],[2.85,1.5]])]).entry.side,'front');
  // Same road and house translated and rotated across the region boundary.
  const moved={...house,a:.61,x:15,z:12};
  const c=Math.cos(moved.a),s=Math.sin(moved.a);
  const worldPoints=side.p.map(([x,z])=>[15+c*x+s*z,12-s*x+c*z]);
  const movedLayout=solve(moved,[stroke(worldPoints)]);
  assert.ok(Math.abs(movedLayout.entry.u-layout.entry.u)<1e-8);
  assert.equal(movedLayout.entry.side,'right');
});

test('an overpainted road end stays connected, while an isolated patch loses its door', () => {
  const side = stroke([[5.8,0],[2.7,0]]);
  const front = stroke([[0,6],[0,2.1]]);
  const repaint = stroke([[2.71,0]],'stonepath');
  assert.equal(solve(house,[side,front,repaint]).entry.side,'right');
  const sever = {...stroke([[3.25,-1],[3.25,1]],'road-erase'),w:.55};
  assert.equal(solve(house,[side,front,repaint,sever]).entry.side,'front');
  const wipe = stroke([[2.7,0],[4.7,0]],'road-erase');
  assert.equal(solve(house,[side,wipe,repaint]).entry.side,'front');
  const broadPatch = {...repaint,w:3};
  assert.equal(solve(house,[side,broadPatch]).entry.side,'right');
  assert.equal(solve(house,[side,wipe,broadPatch]).entry.side,'front');
  assert.equal(solve(house,[repaint,stroke([[2.72,-1.5],[2.72,1.5]])]).entry.side,'front');
});

test('rendered stairs use the same surface dimensions as the cabin layout on a slope', () => {
  const geometry=Object.fromEntries(['box','grass'].map(name=>[name,new T.BoxGeometry()]));
  const materials=Object.fromEntries(['basic','wood','window','metal','grass'].map(name=>[name,new T.MeshBasicMaterial()]));
  const state={roof:'gable',width:house.w,depth:house.d,wood:'cedar',seed:'test',
    groundHeight:(x,z)=>.06*x-.09*z,deck:true,chimney:true};
  const layout=resolveCabinLayout(house,{strokes:[]},{height:state.groundHeight});
  const mesh=buildCabin({geometry,materials},{...state,layout});
  const matrix=new T.Matrix4(),center=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion();
  const tops=[];
  for(const batch of mesh.children) {
    for(let i=0;i<batch.count;i++) {
      batch.getMatrixAt(i,matrix);matrix.decompose(center,q,scale);
      assert.ok([...center,...scale].every(Number.isFinite));
      if(Math.abs(scale.x-1.46)<1e-5 && Math.abs(scale.y-.056)<1e-5)
        tops.push({x:center.x,z:center.z,top:center.y+scale.y/2});
    }
  }
  const treads=layout.walkable.filter(p=>p.kind==='step');
  assert.ok(treads.length>3);
  assert.equal(tops.length,treads.length);
  treads.forEach((step,i)=>{
    assert.ok(Math.abs(tops[i].x-step.x)+Math.abs(tops[i].z-step.z)+Math.abs(tops[i].top-step.top)<1e-5);
    assert.ok((i?treads[i-1].top:layout.walkable[0].top)-step.top <= .155);
  });
  assert.equal(atticWindowFits(2.4,1.2,2.4*.71,3.4,.62,.58),false);
});
