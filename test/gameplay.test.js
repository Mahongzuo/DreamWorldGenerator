import test from 'node:test';import assert from 'node:assert/strict';
import * as T from 'three';
import {normalizeGame,spend,craft,gather,buildingCost,rewardDefeat,hurt,respawn} from '../src/gameplay.js';
import {createAdventureActors} from '../src/adventure-actors.js';
import {createNavigation,createAnimalCrowd} from '../src/navigation.js';
import {normalize,preset} from '../src/sandbox-state.js';
import {joinRegions,normalizeTerritory,territoryEnvelope} from '../src/territory.js';
test('resources, tools, health and defeated enemies survive mode changes and territory round-trip',()=>{
 let game={...normalizeGame(),mode:'adventure'};
 game=gather(game,'wood');game=craft(game,'sword');assert.equal(game.sword,1);
 game=rewardDefeat(game,'0,0:0');assert.equal(rewardDefeat(game,'0,0:0'),game);
 game=hurt(game,150);assert.equal(game.health,0);assert.equal(craft(game,'heal'),null);
 const crystal=game.crystal;game=respawn(game);assert.equal(game.health,100);assert.equal(game.crystal,crystal);assert.equal(game.sword,1);
 let world=joinRegions([[0,0,{...preset('blank'),game}]]);
 world=normalizeTerritory(JSON.parse(JSON.stringify(territoryEnvelope(world))));assert.deepEqual(world.game,game);
 assert.deepEqual(normalize({...world,game:{...game,mode:'creative'}}).game,{...game,mode:'creative'});
 assert.equal(spend({...game,wood:0},{wood:1}),null);
});
test('placing then reclaiming plants and stone props cannot create net resources',()=>{
 for(const category of ['plant','decor']){const g=normalizeGame(),cost=buildingCost({category});const paid=spend(g,cost);const recovered=gather(paid,category==='plant'?'wood':'stone');assert.ok(recovered.wood<=g.wood&&recovered.stone<=g.stone);}
});
test('enemy attack telegraphs, damage, defeat and crowd rebuilding work through actual scene actors',()=>{
 const scene=new T.Scene(),events=[];let world={...preset('blank'),game:{...normalizeGame(),mode:'adventure'}},crowd=createAnimalCrowd();
 const nav=createNavigation(world,{height:()=>0,depth:()=>0,level:0},{bounds:()=>true},[],[]),player={x:0,z:0,a:0,r:.25,kind:'land'};crowd.update(player);
 const actors=createAdventureActors(scene,e=>events.push(e));actors.sync(world,nav,crowd,player);assert.equal(scene.children.length,1,'only the landmark appears');
 for(let i=0;i<160;i++)actors.step(.05,player);
 assert.equal(events.length,0);assert.equal(actors.start(player),false);
 const marker=scene.children[0];player.x=marker.position.x;player.z=marker.position.z+.9;crowd.update(player);
 assert.equal(actors.status(player).canChallenge,true);assert.equal(actors.start(player),true);assert.equal(scene.children.length,2);
 for(let i=0;i<600;i++)actors.step(.05,player);
 assert.ok(events.some(e=>e.type==='hurt'));
 for(const child of scene.children)assert.ok(Math.hypot(child.position.x,child.position.z)>=.8);
 const near=scene.children.reduce((a,b)=>a.position.length()<b.position.length()?a:b);player.x=near.position.x;player.z=near.position.z+1.1;crowd.update(player);
 assert.ok(actors.attack(player,30));assert.ok(actors.attack(player,30));assert.ok(events.some(e=>e.type==='defeat'));
 const defeated=events.find(e=>e.type==='defeat').id;world={...world,game:rewardDefeat(world.game,defeated)};
 crowd=createAnimalCrowd();player.cell=null;crowd.update(player);actors.sync(world,nav,crowd,player);assert.equal(scene.children.length,1);
 actors.clear();actors.sync(world,nav,crowd,player);assert.equal(scene.children.length,1);assert.equal(actors.status(player).canAttack,false);
 actors.sync({...world,game:{...world.game,mode:'creative'}},nav,crowd,player);assert.equal(scene.children.length,0);
});
