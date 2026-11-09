import test from 'node:test';import assert from 'node:assert/strict';
import {CHARACTER,createCharacter,stepCharacter,requestJump,releaseJump,slideMove,cameraSweep,cameraDistance} from '../src/character-controller.js';
import {createNavigation,createAnimalCrowd} from '../src/navigation.js';
const field={depth:()=>0,height:()=>0,level:0};
const makeNav=(objects=[],f=field)=>createNavigation({objects},f,{bounds:()=>true},[],[]);
const input={yaw:0,forward:1};
function simulate(fps,seconds,p,controls,nav=makeNav(),crowd){for(let i=0;i<seconds*fps;i++)stepCharacter(p,controls,1/fps,nav,crowd);return p;}
test('accelerates and brakes, normalizes diagonals, and stays consistent at 30/60/120 FPS',()=>{
 const results=[30,60,120].map(f=>simulate(f,2,createCharacter(0,0,0),{...input,run:true}));
 assert.ok(Math.max(...results.map(p=>p.z))-Math.min(...results.map(p=>p.z))<.025);
 assert.ok(results[0].speed>5.5);assert.equal(results[0].state,'sprint');
 const p=createCharacter(0,0,0);stepCharacter(p,input,1/60,makeNav());assert.ok(p.speed>0&&p.speed<1);
 simulate(60,1,p,input);const z=p.z;simulate(60,.3,p,{yaw:0});assert.ok(p.z>z&&p.z-z<.3);assert.ok(p.speed<.001);
 const straight=simulate(60,1,createCharacter(0,0,0),input),diagonal=simulate(60,1,createCharacter(0,0,0),{...input,side:1});
 assert.ok(Math.abs(straight.travel-diagonal.travel)<.001);
});
test('jump has airtime, single held trigger, landing, short-hop and buffered landing input',()=>{
 function jump(fps,release=false){const p=createCharacter(0,0,0);requestJump(p);if(release)releaseJump(p);let peak=0,landed=false;for(let i=0;i<fps*2;i++){stepCharacter(p,{yaw:0},1/fps,makeNav());peak=Math.max(peak,p.y);if(p.state==='land')landed=true;}return {p,peak,landed};}
 const values=[30,60,120].map(f=>jump(f));assert.ok(Math.max(...values.map(v=>v.peak))-Math.min(...values.map(v=>v.peak))<.012);
 for(const v of values){assert.ok(v.peak>1);assert.ok(v.landed);assert.equal(v.p.y,0);assert.equal(v.p.state,'idle');}
 assert.ok(jump(60,true).peak<values[1].peak*.7);
 const p=createCharacter(0,0,0);requestJump(p);simulate(120,.6,p,{yaw:0});releaseJump(p);requestJump(p);simulate(120,.2,p,{yaw:0});assert.ok(p.y>.1&&!p.grounded);
});
test('swept contact slides along rotated walls and cannot tunnel through thin pillars',()=>{
 const wall={id:1,type:'cedar',x:0,z:0,w:8,d:.2,a:Math.PI/4};const nav=makeNav([wall]);
 const p=createCharacter(-2,-2,0);simulate(60,2,p,{yaw:0,forward:1,run:true},nav);
 assert.equal(nav.contact(p.x,p.z,CHARACTER.radius),null);assert.ok(Math.abs(p.x+2)>1,'must slide in wall-local tangent, not stop');
 const thin=makeNav([{...wall,a:0,w:8,d:.04}]);const q=createCharacter(0,-2,0);simulate(10,2,q,{...input,run:true},thin);assert.ok(q.z<-.49);
 const corner=makeNav([{...wall,a:0,x:0,z:0,w:6,d:.2},{...wall,a:0,x:3,z:-3,w:.2,d:6}]);const c=createCharacter(1,-2,0);
 simulate(60,3,c,{yaw:0,forward:1,side:-1,run:true},corner);assert.equal(corner.contact(c.x,c.z,.3),null);assert.ok(c.x<2.5&&c.z<-.49);
});
test('jumping retains wall, animal and shore barriers; bridge support uses body radius',()=>{
 const wall=makeNav([{id:1,type:'cedar',x:0,z:0,w:6,d:.2,a:0}]);const p=createCharacter(0,-1,0);requestJump(p);simulate(60,1,p,{...input,run:true},wall);assert.ok(p.z<-.49);
 const crowd=createAnimalCrowd();crowd.update({x:0,z:1,r:.75,kind:'land'});const q=createCharacter(0,-1,0);simulate(30,2,q,input,makeNav(),crowd);assert.ok(q.z<=-.0899);
 const wet={...field,depth:x=>Math.abs(x)<1?1:0};const bridge={id:2,type:'stone-bridge',x:0,z:0,w:4,d:1.5,a:0};const nav=makeNav([bridge],wet);
 const b=createCharacter(-2.5,0,nav.support(-2.5,0));simulate(60,2,b,{yaw:Math.PI/2,forward:1},nav);assert.ok(b.x>1.5);assert.equal(nav.contact(b.x,b.z,.3),null);
 const shore=createCharacter(-2,3,0);simulate(60,1,shore,{yaw:Math.PI/2,forward:1,run:true},nav);assert.ok(shore.x<=-1.3);
});
test('camera sweeps from pivot, contracts instantly and releases smoothly',()=>{
 const nav=makeNav([{id:1,type:'cedar',x:0,z:-2,w:4,d:.2,a:0}]);
 const t=cameraSweep({x:0,y:1,z:0},{x:0,y:2,z:-5},nav.cameraBlocked);assert.ok(t>0&&t<.4);
 assert.equal(cameraDistance(5,1,.016),1);assert.ok(cameraDistance(1,5,.016)>1&&cameraDistance(1,5,.016)<1.5);
 assert.equal(cameraSweep({x:0,y:20,z:0},{x:0,y:20,z:-5},nav.cameraBlocked),1);
});
test('leaving a ledge allows a coyote jump, slopes and rebuilt navigation preserve airborne state',()=>{
 const nav=makeNav([],{...field,height:(_x,z)=>z<0?.7:0});
 const p=createCharacter(0,-.04,.7);simulate(120,.1,p,input,nav);assert.equal(p.grounded,false);assert.ok(p.coyote>0);
 requestJump(p);stepCharacter(p,input,1/120,nav);assert.ok(p.vy>6);
 const before={y:p.y,vy:p.vy};const rebuilt=makeNav([],{...field,height:(_x,z)=>z<0?.7:0});stepCharacter(p,input,1/120,rebuilt);
 assert.ok(p.y>before.y&&p.vy<before.vy&&!p.grounded);
 // A high step cannot be climbed by repeatedly accumulating tiny horizontal movements.
 const tall=makeNav([],{...field,height:(_x,z)=>z>0?1.5:0});const q=createCharacter(0,-1,0);simulate(30,1,q,{...input,run:true},tall);assert.ok(q.z<=0&&q.y===0);
});
