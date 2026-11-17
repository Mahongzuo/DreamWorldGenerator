import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildFenceStroke,refreshLandFences} from '../src/sandbox-model.js';
import {moveFenceKnot,prepareFencePath} from '../src/fence-path.js';

const kit={geometry:{box:new T.BoxGeometry()},materials:{wood:new T.MeshBasicMaterial()}};
const field={height:(x,z)=>.13*x-.18*z,depth:()=>0};
const world={objects:[],strokes:[]};
const fence=(id,p,knots)=>({id,type:'fence',w:.9,p,knots});
const build=(s,w=world,f=field,r=null)=>buildFenceStroke(kit,s,w,f,r);
const key=p=>p.map(v=>v.toFixed(4)).join(',');

test('legacy fence samples become even bays with an end post and a shared corner; the actual rails meet their posts on a slope',()=>{
  const p=Array.from({length:13},(_,i)=>[i*.25,0]);
  p.push([3,.25],[3,.5],[3,.75],[3,1],[3,1.25],[3,1.5],[3,1.75],[3,2]);
  const s=fence(7,p),mesh=build(s),{fencePosts:posts,fenceRails:rails}=mesh.userData;
  assert.equal(posts.length,6);
  assert.equal(rails.length,5);
  assert.deepEqual(posts.map(([x,,z])=>[x,z]),[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2]]);
  const attached=new Set(posts.map(key));
  for(const [a,b] of rails){assert.ok(attached.has(key(a)));assert.ok(attached.has(key(b)));}
  const actual=new Set(),mat=new T.Matrix4();
  for(const batch of mesh.children){
    assert.equal(batch.userData.fenceId,s.id);
    for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,mat);
      const axis=new T.Vector3().setFromMatrixColumn(mat,2);
      if(Math.abs(axis.length()-.082)>1e-5)continue;
      const ends=[-.5,.5].map(v=>key(new T.Vector3(v,0,0).applyMatrix4(mat).toArray()));
      actual.add(ends.join('/'));
    }
  }
  const expected=rails.flatMap(([a,b])=>[.28,.67].map(h=>[a,b].map(([x,y,z])=>key([x,y+h,z])).join('/')));
  assert.deepEqual([...actual].sort(),expected.sort());
});

test('tiles share an uninterrupted sloped fence and assign each seam post and rail exactly once',()=>{
  const s=fence(8,[[12,1],[15,1],[17,3]],[0,1,2]);
  const west={continuous:true,x:0,z:0},east={continuous:true,x:1,z:0};
  const a=build(s,world,field,west),local={...s,p:s.p.map(([x,z])=>[x-30,z])};
  const b=build(local,world,{...field,height:(x,z)=>field.height(x+30,z)},east);
  const both=[a,b],posts=[],rails=[];
  for(const [i,mesh] of both.entries()){
    const shift=([x,y,z])=>[x+i*30,y,z];
    posts.push(...mesh.userData.fencePosts.map(shift));
    rails.push(...mesh.userData.fenceRails.map(pair=>pair.map(shift)));
  }
  assert.equal(posts.length,7);
  assert.equal(rails.length,6);
  assert.equal(new Set(posts.map(key)).size,posts.length);
  assert.equal(posts.filter(([x,,z])=>x===15&&z===1).length,1);
  assert.ok(rails.some(([a,b])=>a[0]<15&&b[0]===15));
  assert.ok(rails.some(([a,b])=>a[0]===15&&b[0]>15));
  const ordered=posts.sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<ordered.length;i++)
    assert.ok(rails.some(([a,b])=>key(a)===key(ordered[i-1])&&key(b)===key(ordered[i])));
});

test('moving one fence knot replaces only that fence and undo restores all original matrices',()=>{
  const s=prepareFencePath(fence(2,[[0,0],[2,0],[2,3]])),far=fence(3,[[-9,1],[-6,1]]);
  const original={...world,strokes:[s,far]},tile=new T.Group();
  tile.userData={field,fences:new Map()};
  refreshLandFences(kit,tile,original,null,[s.id,far.id]);
  const before=tile.userData.fences.get(s.id),fixed=tile.userData.fences.get(far.id);
  const matrices=before.children[0].instanceMatrix.array.slice();
  const next=moveFenceKnot(s,s.knots[1],3,-1);
  refreshLandFences(kit,tile,{...world,strokes:[next,far]},null,[s.id]);
  const edited=tile.userData.fences.get(s.id);
  assert.equal(before.parent,null);
  assert.notDeepEqual(edited.children[0].instanceMatrix.array,matrices);
  assert.deepEqual(edited.userData.fencePosts,build(next).userData.fencePosts);
  assert.equal(tile.userData.fences.get(far.id),fixed);
  refreshLandFences(kit,tile,original,null,[s.id]);
  assert.deepEqual(tile.userData.fences.get(s.id).children[0].instanceMatrix.array,matrices);
  refreshLandFences(kit,tile,{...world,strokes:[far]},null,[s.id]);
  assert.equal(tile.userData.fences.has(s.id),false);
  assert.equal(tile.userData.fences.get(far.id),fixed);
});

test('single-point fences keep a movable post, and cut terrain or a house never leaves a rail across an omitted span',()=>{
  const post=build(fence(1,[[2,1]]));
  assert.equal(post.userData.fencePosts.length,1);
  assert.equal(post.userData.fenceRails.length,0);
  const s=fence(4,[[-3,0],[3,0]],[0,1]),pool={...field,depth:x=>Math.abs(x-1)<.2?1:0};
  const house={id:3,type:'cedar',w:.6,d:1,x:-1,z:0,a:0};
  const group=build(s,{...world,objects:[house]},pool);
  assert.deepEqual(group.userData.fencePosts.map(([x])=>x),[-3,-2,0,2,3]);
  assert.deepEqual(group.userData.fenceRails.map(([a,b])=>[a[0],b[0]]),[[-3,-2],[2,3]]);
});
