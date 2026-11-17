import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene} from '../src/scene-presets.js';
import {frontierEdges,previewExpansion} from '../src/frontier-data.js';
import {normalize,preset} from '../src/sandbox-state.js';
import {appendRegion,joinRegions} from '../src/territory.js';
import {createNavigation} from '../src/navigation.js';
import {createCharacter,requestJump,stepCharacter} from '../src/character-controller.js';

test('garden seeds pick two structurally distinct, reproducible and editable water layouts',()=>{
  const layouts=new Map();
  for(let i=0;i<40&&layouts.size<2;i++){
    const options={seed:'JIANGNAN-'+i,density:1,plants:10};
    const scene=createScene('garden',options);
    assert.deepEqual(scene,createScene('garden',options));
    assert.equal(normalize(scene).generation.layout,scene.generation.layout);
    layouts.set(scene.generation.layout,scene);
  }
  assert.deepEqual([...layouts.keys()].sort(),['canal','court']);
  const canal=layouts.get('canal'),court=layouts.get('court');
  assert.ok(canal.objects.some(o=>o.type==='water-stilt'));
  assert.ok(court.objects.some(o=>o.type==='pack-pavilion'));
  const spanningCanal=s=>s.strokes.some(r=>r.type==='jade'&&Math.abs(r.p[0][1]-r.p.at(-1)[1])>22);
  assert.equal(spanningCanal(canal),true);assert.equal(spanningCanal(court),false);
  for(const v of layouts.values())for(const type of ['water-lily','reeds','nature-willow'])assert.ok(v.objects.some(o=>o.type===type));
});

test('preview and cancel leave old roads and buildings intact; confirm uses identical water and road ports',()=>{
  const old=preset('blank');old.strokes=[{id:2,type:'stonepath',w:1.2,p:[[4,-3],[15,-3]]},{id:3,type:'jade',w:2.7,p:[[2,4],[15,4]]}];
  const world=joinRegions([[0,0,old]]),snapshot=structuredClone(world);
  const edges=frontierEdges(world,{x:0,z:0});assert.equal(edges.length,4);
  const east=edges.find(e=>e.dx===1),preview=previewExpansion(world,east);
  assert.deepEqual(world,snapshot);assert.equal(east.edgeX,15);
  assert.deepEqual(new Set(preview.ports.map(p=>p.kind)),new Set(['road','river']));
  const expanded=appendRegion(world,preview.local,east.x,east.z);
  for(const p of preview.ports)assert.ok(expanded.strokes.slice(2).some(s=>s.type===p.type&&s.p.some(([x,z])=>Math.abs(x-p.p[0])<.01&&Math.abs(z-p.p[1])<.01)));
  assert.deepEqual(expanded.objects.slice(0,world.objects.length),world.objects);
  assert.equal(previewExpansion(expanded,east),null);
});

test('rotated covered bridge supports its planks, blocks side rails, and stops a jump below its roof',()=>{
  const angle=.61,c=Math.cos(angle),s=Math.sin(angle),at=(x,z)=>[c*x+s*z,-s*x+c*z];
  const field={height:()=>0,depth:(x,z)=>Math.abs(c*x-s*z)<2.3?1:0,level:0};
  const bridge={id:1,type:'build-covered-bridge',x:0,z:0,w:7.2,d:3.1,a:angle};
  const nav=createNavigation({objects:[bridge]},field,{bounds:()=>true},[],[]);
  assert.ok(nav.sweep(...at(-4,0),...at(4,0),.30,'land'));
  assert.equal(nav.sweep(...at(0,0),...at(0,1.5),.30,'land'),false);
  assert.equal(nav.valid(...at(0,1.46),.2,'land'),false);
  const p=createCharacter(0,0,nav.support(0,0));requestJump(p);
  let highest=0;for(let i=0;i<120;i++){stepCharacter(p,{},1/120,nav);highest=Math.max(highest,p.y);}
  assert.ok(highest>.77&&highest+1.65<=2.65);assert.ok(p.grounded);
});

test('moon gate headroom and sill scale with the actual aperture',()=>{
  const field={height:()=>0,depth:()=>0,level:0};
  for(const [scale,fits] of [[1,true],[.65,false]]){
    const nav=createNavigation({objects:[{id:1,type:'build-moon-gate',x:0,z:0,w:6.2*scale,d:2.4*scale,a:.7}]},field,{bounds:()=>true},[],[]);
    const floor=nav.support(0,0,.3);assert.ok(floor>0);
    assert.equal(nav.bodyContact(0,floor,0,.3,1.65)===null,fits);
  }
});
