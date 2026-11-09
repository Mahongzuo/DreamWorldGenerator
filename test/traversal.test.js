import test from 'node:test';import assert from 'node:assert/strict';
import {createNavigation,createAnimalCrowd} from '../src/navigation.js';
import {createCharacter,stepCharacter,requestJump} from '../src/character-controller.js';
import {planTraversal,bodyClear,traversalPose} from '../src/traversal-motion.js';
import {traversalBoxes,worldTraversalBoxes} from '../src/traversal-shapes.js';
import {normalize,items} from '../src/sandbox-state.js';
const field={height:()=>0,depth:()=>0,level:0};
const wall={id:1,type:'garden-low-wall',x:0,z:0,w:2.8,d:.45,a:0};
const terrace={...wall,type:'stone-terrace',w:3,d:3};
const navFor=(objects,f=field,bounds=()=>true)=>createNavigation({objects},f,{bounds},[],[]);
function run(p,nav,seconds=2,fps=60,input={yaw:0},crowd){const states=new Set();for(let i=0;i<seconds*fps;i++){stepCharacter(p,input,1/fps,nav,crowd);states.add(p.state);assert.ok(bodyClear(nav,crowd,null,p));}return states;}
test('vault and mantle choose distinct verified paths and have deterministic end positions',()=>{
 for(const fps of [30,60,120]){
  const nav=navFor([wall]),p=createCharacter(0,-.8,0,0);requestJump(p);const states=run(p,nav,1.5,fps);
  assert.ok(states.has('vault'));assert.ok(p.z>.6&&p.grounded);assert.equal(p.y,0);
  const high=navFor([terrace]),q=createCharacter(0,-2,0,0);requestJump(q);const climbs=run(q,high,2,fps);
  assert.ok(climbs.has('climb'));assert.ok(q.z> -1.2);assert.equal(q.y,1.55);assert.ok(q.grounded);
 }
});
test('rotated wall vault measures thickness in local space; oversized ledges are rejected',()=>{
 const a=Math.PI/4,o={...wall,a},nav=navFor([o]),dx=Math.sin(a),dz=Math.cos(a),p=createCharacter(-dx*.8,-dz*.8,0,a);
 assert.equal(planTraversal(p,dx,dz,nav)?.kind,'vault');
 const oldWall={...wall,type:'stone-wall',w:5};assert.equal(planTraversal(createCharacter(0,-1.3,0,0),0,1,navFor([oldWall])),null);
});
test('landing occupied by buildings, animals, water or unowned land rejects traversal',()=>{
 const p=createCharacter(0,-.8,0,0),blocked=navFor([wall,{id:2,type:'cedar',x:0,z:1.1,w:2,d:.6,a:0}]);assert.equal(planTraversal(p,0,1,blocked),null);
 const crowd=createAnimalCrowd();crowd.update({x:0,z:.7,r:.5,kind:'land',y:0,h:1.3});assert.equal(planTraversal(p,0,1,navFor([wall]),crowd),null);
 assert.equal(planTraversal(p,0,1,navFor([wall],{...field,depth:(_x,z)=>z>.35?1:0})),null);
 assert.equal(planTraversal(p,0,1,navFor([wall],field,(_x,z)=>z<.5)),null);
});
test('removed target cancels in place and falls safely instead of teleporting or completing a stale action',()=>{
 const p=createCharacter(0,-2,0,0),nav=navFor([terrace]);requestJump(p);run(p,nav,.4);
 const before={x:p.x,y:p.y,z:p.z};stepCharacter(p,{yaw:0},1/120,navFor([]));
 assert.equal(p.traversal,null);assert.equal(p.x,before.x);assert.equal(p.z,before.z);assert.equal(p.y,before.y);assert.equal(p.grounded,false);
 run(p,navFor([]),1.5);assert.equal(p.y,0);
});
test('six stairs support continuous ascent/descent, but their tall side cannot auto-step',()=>{
 const stairs={...wall,type:'garden-stairs',w:2.4,d:3},nav=navFor([stairs]);
 const p=createCharacter(0,-2.3,0,0);const up=run(p,nav,1.2,120,{yaw:0,forward:1,walk:true});assert.ok(p.y>=.75&&!up.has('fall'));
 const top=createCharacter(0,1.15,1.5,Math.PI);const down=run(top,nav,2,120,{yaw:Math.PI,forward:1,walk:true});assert.equal(top.y,0);assert.ok(!down.has('fall'));
 const side=createCharacter(-2,1,0,Math.PI/2);run(side,nav,1,60,{yaw:Math.PI/2,forward:1});assert.ok(side.x< -1.45&&side.y===0);
});
test('standing surfaces survive navigation rebuilds and save round-trip without snapping to their base',()=>{
 const p=createCharacter(0,0,1.55),nav=navFor([terrace]);run(p,nav,.5);run(p,navFor([{...terrace}]),.5);assert.equal(p.y,1.55);
 const world=normalize({v:2,theme:'blank',objects:[terrace,{...wall,id:2},{...wall,id:3,type:'garden-stairs',w:2.4,d:3}],strokes:[]});assert.equal(world.objects.length,3);assert.equal(items['garden-stairs'].family,'攀爬构筑物');
 const boxes=traversalBoxes({type:'garden-stairs',w:2.4,d:3});assert.equal(boxes.length,6);assert.equal(boxes.at(-1).top,1.5);
 assert.ok(worldTraversalBoxes(wall).every(b=>b.top===.85));
});
test('head clearance and late animal intrusion cancel unsafe traversal paths',()=>{
 const base=navFor([wall]),p=createCharacter(0,-.8,0,0);
 const lowCeiling={...base,bodyContact:(x,y,z,r,h)=>y+h>2?{x:0,z:1,depth:.1}:base.bodyContact(x,y,z,r,h)};
 assert.equal(planTraversal(p,0,1,lowCeiling),null);
 requestJump(p);stepCharacter(p,{yaw:0},.05,base);assert.equal(p.state,'vault');
 const crowd=createAnimalCrowd();crowd.update({x:0,z:.68,r:.55,kind:'land',y:0,h:2});
 let cancelled=false;for(let i=0;i<100;i++){stepCharacter(p,{yaw:0},1/120,base,crowd);if(!p.traversal){cancelled=true;break;}}
 assert.ok(cancelled);assert.equal(p.state,'fall');assert.ok(bodyClear(base,crowd,null,p));
});
test('falling above an animal keeps vertical separation, and low-speed versus hard landings differ',()=>{
 const nav=navFor([]),crowd=createAnimalCrowd();crowd.update({x:0,z:0,r:.5,kind:'land',y:0,h:1});
 const p=createCharacter(0,0,2.5);p.grounded=false;run(p,nav,1,120,{yaw:0},crowd);assert.ok(p.y>=1);
 const low=createCharacter(3,3,.4),high=createCharacter(3,3,3);low.grounded=high.grounded=false;
 const a=run(low,nav,1),b=run(high,nav,1.5);assert.ok(a.has('land'));assert.ok(b.has('land-heavy'));assert.ok(high.landingImpact>low.landingImpact);
});
