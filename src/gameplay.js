import {normalizeShore} from './habitat-progress.js';
const number=(v,d=0,max=99999)=>Math.max(0,Math.min(max,Number.isFinite(v)?Math.floor(v):d));
export function normalizeGame(g={}){
 if(!g||typeof g!=='object')g={};
 return {shore:normalizeShore(g.shore),mode:g.mode==='adventure'?'adventure':'creative',health:number(g.health,100,100),wood:number(g.wood,12),stone:number(g.stone,8),crystal:number(g.crystal),sword:number(g.sword,0,1),pickaxe:number(g.pickaxe,0,1),
  defeated:Array.isArray(g.defeated)?[...new Set(g.defeated.filter(x=>typeof x==='string'&&/^-?\d+,-?\d+:\d$/.test(x)))].slice(-5000):[],
  explored:Array.isArray(g.explored)?[...new Set(g.explored.filter(x=>typeof x==='string'&&/^-?\d+,-?\d+$/.test(x)))].slice(-5000):[],built:number(g.built),harvests:number(g.harvests),deaths:number(g.deaths)};
}
export const recipes={
 sword:{name:'石刃剑',wood:4,stone:5,upgrade:'sword'},
 pickaxe:{name:'石镐',wood:5,stone:3,upgrade:'pickaxe'},
 heal:{name:'营地补给 · 恢复 40 生命',wood:3,stone:1},
};
export function buildingCost(def,o={}){
 if(def.id==='road-erase')return {};
 if(def.category==='animal')return {crystal:1};
 if(def.category==='house')return {wood:Math.max(4,Math.ceil((o.w??def.width)*(o.d??def.depth)/3)),stone:3};
 if(def.brush)return {stone:1};
 if(def.category==='plant')return {wood:3};
 return {stone:3};
}
export const canAfford=(g,cost)=>Object.entries(cost).every(([key,n])=>(g[key]??0)>=n);
export function spend(g,cost){if(!canAfford(g,cost))return null;const next={...g};for(const [key,n] of Object.entries(cost))next[key]-=n;return next;}
export function craft(g,id){const r=recipes[id];if(g.health<=0||!r||r.upgrade&&g[r.upgrade]||id==='heal'&&g.health>=100)return null;
 const paid=spend(g,{wood:r.wood,stone:r.stone});return paid?{...paid,...(r.upgrade?{[r.upgrade]:1}:{health:Math.min(100,g.health+40)})}:null;
}
export function rewardDefeat(g,id){if(g.defeated.includes(id))return g;return {...g,crystal:g.crystal+2,stone:g.stone+2,defeated:[...g.defeated,id]};}
export function visit(g,key){return g.explored.includes(key)?g:{...g,explored:[...g.explored,key]};}
export function hurt(g,damage){return {...g,health:Math.max(0,g.health-damage)};}
export function respawn(g){return {...g,health:100,deaths:g.deaths+1,wood:Math.floor(g.wood*.8),stone:Math.floor(g.stone*.8)};}
export function gather(g,kind){return {...g,wood:g.wood+(kind==='wood'?3:0),stone:g.stone+(kind==='stone'?3:0),harvests:g.harvests+1};}
export const costText=cost=>Object.entries(cost).map(([k,n])=>({wood:'木材',stone:'石料',crystal:'晶石'}[k])+' '+n).join(' · ');
export function quest(g){
 if(g.harvests<3)return `收集资源 ${g.harvests}/3 · 靠近树木按 F，靠近岩石按 G`;
 if(g.built<3)return `建设营地 ${g.built}/3 · 退出漫步后建造物件`;
 return `探索新领地 · 已探索 ${g.explored.length} 块。靠近青晶遗迹可自选挑战，已击败 ${g.defeated.length} 个守卫。`;
}
