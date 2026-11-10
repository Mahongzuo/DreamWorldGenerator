import {createGameAudio, soundtracks} from './game-audio.js';
import {isTraversable,traversalTypes} from './traversal-shapes.js';
import {normalizeGame,buildingCost,spend,craft,recipes,costText,rewardDefeat,visit,hurt,respawn,gather,quest} from './gameplay.js';
import {sceneDesigns,appendScene} from './scene-presets.js';
import {connectScene} from './scene-connections.js';
import './style.css';
import {icon} from './icons.js';
import {catalog, items, themes, preset, inside, footprint, clamp, round, loadWorld, worldLink, STORE_KEY, ATLAS_KEY, LAND, MAX_OBJECTS, MAX_STROKES, MAX_POINTS, biomeOf, biomes, normalize, tileKey, waterAnimal, wildTile} from './sandbox-state.js';
import {createViewport} from './viewport.js';
import {TERRITORY_KEY, joinRegions, appendRegion, normalizeTerritory, territoryEnvelope, sliceRegion, contains, regionAt} from './territory.js';
import {packThumbnail,preloadModelPack} from './model-pack.js';
import {guideSources} from './field-guide.js';

const views={
  house:{name:'建筑',icon:'cabin',types:['house']},
  plant:{name:'植物',icon:'tree',types:['plant']},
  animal:{name:'动物',icon:'animal',types:['animal']},
  terrain:{name:'地形',icon:'terrain',types:['terrain','water','grass']},
  decor:{name:'景观',icon:'layers',types:['decor']}
};
const total=Object.keys(items).length;
const JOURNAL_KEY='linqi-field-journal-v1';
let journal={seen:[],wood:0,harvested:[]};
try{
  const saved=JSON.parse(localStorage.getItem(JOURNAL_KEY));
  if(saved){
    journal={seen:Array.isArray(saved.seen)?[...new Set(saved.seen.filter(id=>Object.hasOwn(items,id)))]:[],
      wood:Number.isSafeInteger(saved.wood)&&saved.wood>=0?saved.wood:0,
      harvested:Array.isArray(saved.harvested)?saved.harvested.filter(tag=>typeof tag==='string').slice(-1500):[]};
  }
}catch{/* Start with an empty field journal. */}
const walkKeys={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right',shift:'run',c:'walk'};
const toolModes={select:'选择',build:'建造',erase:'橡皮',camera:'漫游',spawn:'放置探访者',walk:'第三人称探索'};
let strike=null,nearby=null,fieldNoteTimer,mineStrike=null,lastHurt=0;
function saveJournal(){
  try{localStorage.setItem(JOURNAL_KEY,JSON.stringify(journal));}catch{/* The journal still works in this session. */}
}
function record(id){
  if(!Object.hasOwn(items,id)||journal.seen.includes(id))return false;
  journal.seen.push(id);saveJournal();showJournalCount();
  return true;
}


const labels={summer:'常青',autumn:'秋林',winter:'初雪',day:'白昼',gold:'金暮',night:'月夜'};
const toolLabels={select:'选择',build:'建造',erase:'橡皮',camera:'漫游'};
const help={
  select:'点选物件后拖动可移动，拖建筑四角可改尺寸。',
  erase:'点一下物件或笔迹即可移除。',
  camera:'拖动旋转视角，滚轮或捏合缩放。'
};
const svg=(inside,view='0 0 100 48')=>`<svg viewBox="${view}" aria-hidden="true">${inside}</svg>`;
function thumbnail(o){
  const preview=packThumbnail(o.id);
  if(preview)return `<img src="${preview}" alt="${o.name}" loading="lazy" decoding="async">`;
  const ground='<ellipse cx="50" cy="38" rx="35" ry="7" fill="#829465" opacity=".22"/>';
  const {color:c,accent:a,form}=o;
  if(traversalTypes[o.id]){
    const stairs=o.id==='garden-stairs',wall=o.id==='garden-low-wall';
    return svg(ground+`<path fill="${c}" d="${stairs?'M20 36V30h12v-7h12v-7h12V9h23v27Z':wall?'M20 35V18l53-8v24Z':'M21 34V20l27-12 32 10v17L51 43Z'}"/><path fill="${a}" d="${stairs?'m20 30 12-3v-4l12-3v-4l12-3V9l23 4-23 6-12 7-12 7-12 3Z':wall?'m20 18 53-8 7 5-54 8Z':'m21 20 27-12 32 10-29 14Z'}"/>`);
  }
  if(o.category==='animal'){
    if(['fish','duck','goose','swan','heron'].includes(form))return svg(ground+`<path fill="${c}" d="M26 31q6-9 24-8 10 1 14 6l9-5-1 12-10-4q-17 10-36-1Z"/><path fill="${a}" d="M50 24q5-4 8-12 5-5 11 1l-5 3-4 12Z"/><circle cx="63" cy="13" r="1" fill="#3d4c40"/>`);
    if(['owl','swallow','kingfisher','butterfly','bee','dragonfly'].includes(form))return svg(ground+`<path fill="${c}" d="M50 22Q34 8 22 11q1 14 24 21l4 5 4-5q23-7 24-21-12-3-28 11Z"/><path fill="${a}" d="M27 15q6-2 18 10-10 0-18-10Zm46 0q-6-2-18 10 10 0 18-10Z"/>`);
    const long=['deer','elk','goat','horse'].includes(form), rabbit=form==='rabbit';
    return svg(ground+`<path fill="${c}" d="M29 27q5-8 22-5l9-1 3-7 8 3 3 5-6 6-7 1-3 10h-4l1-9-14 2-3 7h-4l1-9-7 2Z"/><path fill="${a}" d="${long?'M65 15l-2-9 3-4 1 3-2 3 2 6 3-7 3-1-2 4-1 6Z':rabbit?'M63 17l-4-12 3-2 4 11 2-11 3 2-1 12Z':'M31 26l-9-7-3 3 7 8Z'}"/><circle cx="68" cy="20" r="1.2" fill="#38463d"/>`);
  }
  if(o.category==='plant'&&!['pine','sakura','willow'].includes(o.id)){
    if(['conifer','spire','column','umbrella','broad','birch','palm'].includes(form)){
      const shape=['conifer','spire'].includes(form)?'m49 5 10 13h-5l10 13H35l10-13h-6Z':form==='column'?'M50 4q9 2 11 15t-3 14H42q-8-5-2-21 4-9 10-8Z':'M32 24q-9-8 2-13 4-7 14-6 8-1 14 7 12 1 9 11-6 7-19 6-11 6-20-5Z';
      return svg(ground+`<path stroke="#886a4d" stroke-width="4" d="M49 21v17"/><path fill="${c}" d="${shape}"/><path fill="${a}" opacity=".74" d="M45 11q8-6 14 5-8 6-14-5Z"/>`);
    }
    return svg(ground+`<path stroke="${c}" stroke-width="2.3" fill="none" d="M50 38V15m0 20-12-9m12 6 11-12m-19 16-9-16m26 17 7-10"/><path fill="${c}" d="M37 34q-9-3-9-8 8 0 15 7Zm16-2q5-9 13-9-2 8-13 9Z"/><g fill="${a}"><circle cx="50" cy="13" r="5"/><circle cx="34" cy="21" r="4"/><circle cx="62" cy="18" r="5"/><circle cx="69" cy="25" r="3"/></g>`);
  }
  if(o.category==='terrain')return svg(ground+`<path fill="${c}" d="m20 34 15-13 9 3 14-15 17 9 7 14-22 8-19 1Z"/><path fill="${a}" d="m35 21 9 3 14-15 17 9-17-1-8 13Z"/><path fill="none" stroke="#f2efce" stroke-opacity=".45" d="m31 30 15 5 29-9m-39 0 12 4 24-8"/>`);
  if(o.category==='house'){
    const pavilion=['pavilion','hall','hex','gate'].includes(form), east=pavilion||['jiangnan','court','stilt','pagoda'].includes(form), tower=['tower','fort','bell','lookout','chapel'].includes(form), alpine=form==='alpine', shed=['shed','saw','flat','adobe'].includes(form);
    if(form==='bridge'||form==='moon'||form==='arch')return svg(ground+`<path fill="${c}" fill-rule="evenodd" d="M20 38V26l28-12 32 12v12H65a15 15 0 0 0-30 0Zm23-2a7 7 0 1 1 14 0Z"/><path fill="${a}" d="m20 25 28-12 32 12v4L48 18 20 29Z"/>`);
    if(form==='pagoda')return svg(ground+`<path fill="${c}" d="M32 28h35v10H32zm8-11h20v13H40zm5-9h11v15H45z"/><path fill="${a}" d="m23 28 27-9 26 9-7 3H30Zm9-11 18-9 18 9-6 2H38Zm8-8 10-7 10 7-4 2H44Z"/>`);
    if(form==='mill'||form==='watermill')return svg(ground+`<path fill="${c}" d="m35 16 19-8 12 9 1 19-13 5-19-5Z"/><path fill="${a}" d="m31 17 23-12 17 12-5 3-12-11-19 11Z"/><path stroke="#957657" stroke-width="4" d="m37 16 24 20m-23 1 22-22"/><circle cx="49" cy="26" r="3.4" fill="#e2c193"/>`);
    if(tower) return svg(ground+`<path fill="${c}" d="M41 15h21v22l-10 4-11-4Z"/><path fill="#7f8376" d="m52 18 10-3v22l-10 4Z"/><path fill="${a}" d="M38 16 52 3l13 13-13 4Z"/><path fill="#f0d49c" d="M48 24h4v6h-4z"/>`);
    const roof=east ? 'M21 21q7 0 14-11l16-2 26 13-19 4Z' : alpine ? 'M26 36 49 6l27 13-10 22Z' : shed ? 'M24 20 66 9l13 11-42 11Z' : 'M24 25 47 8l30 11-14 15Z';
    return svg(ground+`<path fill="${c}" d="m30 23 22 3 17-8v17l-16 7-23-6Z" opacity="${pavilion?.24:1}"/><path fill="${c}" d="M33 24h4v13h-4zm17 0h4v17h-4zm14-4h4v16h-4z"/>
      <path fill="#473f32" opacity=".25" d="m53 25 16-6v16l-16 7Z"/><path fill="${a}" d="${roof}"/>
      <path fill="none" stroke="#fff" opacity=".24" d="m48 12 19 8m-23-5 19 8m-23-5 19 8"/><path fill="#e9ca86" d="M40 28h5v5h-5zm18 1 5-2v4l-5 2Z"/>
      ${o.id==='tudor'?'<path stroke="#654738" stroke-width="1.5" d="M31 32l19 6M33 26l5 12m14 1 7-11"/>':''}`);
  }
  if(o.category==='water') return svg(`<path fill="${a}" opacity=".57" d="M16 30c1-9 24-4 24-12 2-7 15-9 27-5s19 7 17 12c-3 6-18 1-23 7-9 13-46 11-45-2Z"/><path fill="${c}" d="M19 30c0-7 24-4 24-12 2-6 14-7 24-4s16 7 15 10c-3 5-18 1-23 7-8 10-41 10-40-1Z"/><path d="M26 32q6 2 14 0m10-11q7-4 14-1m-16 8 5-1" fill="none" stroke="#d5f3e3" opacity=".66" stroke-linecap="round"/>${o.id==='lotus'?'<circle cx="66" cy="21" r="3.8" fill="#93af68"/><circle cx="68" cy="19" r="1.8" fill="#f1b8b5"/><circle cx="41" cy="32" r="3" fill="#97af66"/>':''}`);
  if(o.category==='grass') return svg(`<path fill="${c}" d="M16 30c5-9 22-16 40-15s30 10 28 15-17 9-34 10-37-2-34-10Z"/><path stroke="${a}" stroke-width="1.5" fill="none" d="m30 31-2-5m2 5 3-6m11 0-1-7m1 7 4-4m8 11-3-6m3 6 3-7m10-3 3 5m0 0 2-6"/>${['flowers','heather'].includes(o.id)?`<path stroke="${a}" stroke-width="3.5" stroke-linecap="round" d="M26 25h.2m17-8h.2m10 8h.2m6-2h.2m12-4h.2m-8 13h.2m-25-4h.2"/>`:''}`);
  if(['pine','sakura','willow'].includes(o.id)) return svg(ground+`<path stroke="#886a4d" stroke-width="4" d="M49 21v17"/>${o.id==='pine'? `<path fill="${c}" d="m49 5 10 13h-5l10 13H35l10-13h-6Z"/><path fill="${a}" d="m49 6 10 12h-8l6 8h-8Z"/>`:`<path fill="${c}" d="m49 9 13 2 8 10-6 10-13-2-11 4-9-8 4-10Z"/><path fill="${a}" d="m49 8 13 3 6 9-8 3-13-1-10 3 1-11Z"/>`}`);
  if(o.id==='fence') return svg(ground+`<path stroke="${c}" stroke-width="5" d="M31 17v20m19-24v22m20-26v22"/><path stroke="${a}" stroke-width="3.5" d="m30 24 42-9m-42 16 42-9"/>`);
  if(o.id==='fire') return svg(ground+`<ellipse cx="51" cy="34" rx="16" ry="5" fill="${c}"/><path fill="#d9814f" d="m47 33-4-7 5-5 4-11 3 10 5 5-4 8Z"/><path fill="${a}" d="m50 33-3-5 6-7 3 8-3 4Z"/>`);
  if(o.id==='lantern') return svg(ground+`<path fill="${c}" d="M46 34V20h-5l2-3h14l3 3h-6v14l4 4H42Z"/><path fill="${a}" d="M45 20h10v7H45Z"/><path fill="${c}" d="m39 19 11-9 11 9Z"/>`);
  if(o.brush) return svg(ground+`<path fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" d="M23 34q13-13 24-9t28-12"/><path fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5" d="M24 34q13-13 24-9t27-12"/>`);
  return svg(ground+`<path fill="${c}" d="m33 34 6-14 13-4 10 12 8 2 4 8-27 3Z"/><path fill="${a}" d="m39 20 13-4 9 10-18 4Z"/>`);
}

const byId=id=>document.getElementById(id);
const button=(id,symbol,text,key='')=>`<button type="button" class="btn tool-btn" id="${id}" title="${text}${key?' · '+key:''}" aria-label="${text}">${icon(symbol,17)}<span>${text}</span></button>`;
const toolbarIcon=(id,symbol,text)=>`<button type="button" class="btn icon-btn" id="${id}" title="${text}" aria-label="${text}">${icon(symbol,17)}</button>`;

let linked=Boolean(location.search), origin=loadWorld(), world=origin;
let mode='build',category='house',active='cedar',selected=null,draft=null,width=items[active].width,filter='';
let viewport,toastTimer,before=[],after=[],nextId=1,pending=null,frame=0;
let open=false,rx=0,rz=0,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const atlas=new Map(),unsavedRegions=new Map();
const originKey=tileKey(0,0);
const savedRegions=new Set();
try{
  if(localStorage.getItem(STORE_KEY)&&!linked)savedRegions.add(originKey);
  for(let i=0;i<localStorage.length;i++){
    const name=localStorage.key(i);
    if(!name?.startsWith(ATLAS_KEY+'/'))continue;
    const key=name.slice(ATLAS_KEY.length+1);
    const coords=key.split(',').map(Number);
    if(coords.length===2&&coords.every(Number.isSafeInteger)&&tileKey(...coords)===key)savedRegions.add(key);
  }
}catch{/* A storage failure leaves the session's edits in memory. */}
const claimed=(x,z)=>{
  const key=tileKey(x,z);
  if(world.regions)return Boolean(world.regions[key]);
  return key===originKey||savedRegions.has(key)||unsavedRegions.has(key);
};
const directions={'0,-1':'北','-1,0':'西','1,0':'东','0,1':'南'};
function readRegion(x,z){
  if(world.regions)return sliceRegion(world,x,z)??wildTile('LINQI-ATLAS',x,z);
  if(x===0&&z===0)return origin;
  const key=tileKey(x,z);
  if(unsavedRegions.has(key))return unsavedRegions.get(key);
  if(atlas.has(key)) return atlas.get(key);
  let region;
  try{region=normalize(JSON.parse(localStorage.getItem(ATLAS_KEY+'/'+key)));}catch{region=null;}
  region??=wildTile('LINQI-ATLAS',x,z);
  atlas.set(key,region);
  if(atlas.size>42)atlas.delete(atlas.keys().next().value);
  return region;
}
try{
  const config=JSON.parse(localStorage.getItem(ATLAS_KEY));
  if(config){
    motion=typeof config.motion==='boolean'?config.motion:motion;
    open=!linked&&config.open===true;
    if(open){
      rx=Number.isSafeInteger(config.x)?config.x:0;
      rz=Number.isSafeInteger(config.z)?config.z:0;
      world=readRegion(rx,rz);
    }
  }
}catch{/* Keep the initial plot if storage is unavailable. */}
let territorySaved=true;
try{
  if(!linked){
    const restored=normalizeTerritory(JSON.parse(localStorage.getItem(TERRITORY_KEY)));
    if(restored){world=restored;open=true;if(!claimed(rx,rz))rx=rz=0;}
  }
}catch{/* Legacy files are retained as a migration fallback. */}
world={...world,game:normalizeGame(world.game)};
function continuousSnapshot(){
  if(world.regions)return world;
  const entries=[[0,0,{...origin,game:world.game}]];
  for(const key of new Set([...savedRegions,...unsavedRegions.keys()])){
    if(key===originKey)continue;
    const [x,z]=key.split(',').map(Number);entries.push([x,z,readRegion(x,z)]);
  }
  return joinRegions(entries);
}
function makeContinuous(){world=continuousSnapshot();before=[];after=[];}
if(open){makeContinuous();
  try{localStorage.setItem(TERRITORY_KEY,JSON.stringify(territoryEnvelope(world)));}catch{territorySaved=false;}
}
function rememberLocation(){
  if(linked)return;
  try{localStorage.setItem(ATLAS_KEY,JSON.stringify({open,x:rx,z:rz,motion}));}catch{/* Editing still works without storage. */}
}
const inBounds=(x,z,margin=0)=>world.regions?contains(world.regions,x,z,margin):inside(x,z,margin);
const optionButtons=(key,values)=>values.map((v)=>`<button class="option" type="button" data-world="${key}" data-value="${v}" aria-pressed="${world[key]===v}">${labels[v]}</button>`).join('');

document.querySelector('#app').innerHTML=`
<header class="topbar"><div class="top-inner">
  <div class="brand"><img src="/mark.svg" alt=""><div><b>林栖</b><small>LINQI / SANDBOX</small></div></div>
  <div class="top-actions">
    <span class="save-state" id="save-state"><span class="dot"></span><span id="save-label">本地存档</span></span>
    <button type="button" class="btn" id="journal-open" aria-label="打开观察笔记">${icon('book',16)} <span class="journal-label">观察笔记</span><strong id="journal-count">0</strong></button>
    <button type="button" class="btn map-btn" id="map-mode" aria-pressed="false">${icon('map',16)}<span id="map-label">扩建领地</span></button>
    <button type="button" class="btn" id="share" aria-label="分享或导出领地" title="分享或导出领地">${icon('link',16)}<span class="share-text">导出 / 分享</span></button>
    <button type="button" class="btn" id="import-world">导入领地</button><input type="file" id="import-file" accept="application/json,.json" hidden>
    <button type="button" class="btn primary" id="snapshot">${icon('camera',16)}拍照</button>
  </div>
</div></header>
<main class="workspace">
  <div class="intro">
    <div><div class="eyebrow">${icon('pine',15)} LINQI FIELD STUDIO</div>
    <h1>林间造境工作台</h1>
    <p>搭建一片栖地，走进去看看。</p></div>
    <div class="preset-select"><label for="theme">${icon('layers',16)} 场景预设</label>
      <select id="theme" aria-label="场景预设"><optgroup label="完整场景 · 在新领地生成">${Object.entries(sceneDesigns).map(([k,v])=>`<option value="scene:${k}">${v.name}</option>`).join('')}</optgroup><optgroup label="基础沙盘 · 替换当前地块">${Object.entries(themes).filter(([k])=>k!=='coast').map(([k,v])=>`<option value="${k}">${v.label} · ${v.description}</option>`).join('')}</optgroup></select>
      <button class="btn" type="button" id="load-theme">一键生成</button>
    </div>
  </div>
  <section class="scene-summary" id="scene-summary" aria-label="场景说明"></section>
  <div class="scene-controls" id="scene-controls">
    <label>场景宽度 <select id="scene-width" aria-label="场景宽度"><option value="1">30 米 · 1 块</option><option value="2">60 米 · 2 块</option><option value="3">90 米 · 3 块</option></select></label>
    <label>场景纵深 <select id="scene-height" aria-label="场景纵深"><option value="1">23 米 · 1 块</option><option value="2">46 米 · 2 块</option><option value="3">68 米 · 3 块</option></select></label>
    <label>建筑密度 <select id="scene-density" aria-label="建筑密度"><option value=".5">疏朗</option><option value="1" selected>适中</option><option value="1.5">紧凑</option></select></label>
    <label>每块植物目标 <input id="scene-plants" aria-label="每块植物数量" type="number" min="0" max="36" value="12"></label>
    <label>布局种子 <input id="scene-seed" aria-label="布局种子" maxlength="14" value=""></label><button class="btn" id="scene-reroll" type="button">换个布局</button><label class="seed-lock"><input type="checkbox" id="seed-lock">固定种子</label><small id="last-generation"></small>
    <small>最多 9 块；植物在可用空地内生成。道路与河流自动连接相邻领地。相同种子和参数可复现布局。</small>
  </div>
  <section class="game-panel" aria-label="游戏模式与营地">
    <div class="game-top"><label>玩法 <select id="game-mode" aria-label="游戏模式"><option value="creative">创造 · 自由建造</option><option value="adventure">冒险 · 采集与战斗</option></select></label><strong id="game-stats"></strong></div>
    <div id="adventure-tools" hidden><p id="game-quest"></p><button class="btn" id="camp-revive" type="button" hidden>返回营地复活 · 损失 20% 木石</button><div class="craft-row"><button class="btn" id="craft-sword" type="button">石刃剑 · 4 木 / 5 石</button><button class="btn" id="craft-pickaxe" type="button">石镐 · 5 木 / 3 石</button><button class="btn" id="craft-heal" type="button">补给 +40 HP · 3 木 / 1 石</button></div><small>漫步时 J 攻击 · F 伐木 · G 采矿 / 拆除 / 挖土 · R 倒下后复活。冒险行动即时存档，不支持撤销；切换模式保留资源。</small></div>
  </section>
  <section class="audio-panel" aria-label="游戏声音">
    <div class="audio-bar">
      <button type="button" class="btn" id="audio-toggle" aria-pressed="false">开启声音</button>
      <span id="audio-status" role="status">声音已关闭</span>
    </div>
    <details>
      <summary>曲目与音量</summary>
      <div class="audio-settings">
        <label>背景音乐 <select id="audio-track"><option value="auto">随场景切换</option>${Object.entries(soundtracks).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}<option value="none">关闭配乐</option></select></label>
        ${[['music','配乐音量'],['ambient','环境音量'],['effects','音效音量']].map(([key,name])=>`<label>${name}<input id="audio-${key}" type="range" min="0" max="100" step="1"></label>`).join('')}
      </div>
    </details>
  </section>
  <div class="studio">
    <section class="viewer" aria-label="自由建造沙盘">
      <div class="viewbar">
        <div class="view-label">${icon('cube',16)} <span id="plot-title"></span><small>LIVE DIORAMA</small></div>
        <div class="view-actions"><span class="seed-tag" id="seed-tag"></span><button class="btn icon-btn relocate-btn" type="button" id="relocate" aria-label="重新放置探访者" title="重新放置探访者" hidden>${icon('pin',15)}</button><button class="btn explorer-btn" type="button" id="explore">${icon('walk',16)} <span id="explore-label">放置探访者</span></button></div>
      </div>
      <div class="stage" id="stage" tabindex="-1">
        <div class="stage-head"><span class="badge" id="mode-tag"></span><span class="badge" id="weather-tag"></span></div>
        <div class="atlas-controls" id="atlas-controls" hidden>
          <div class="atlas-coord badge" id="atlas-coord"></div>
          <div class="compass" role="group" aria-label="扩建或前往相邻领地">
            <button class="btn compass-n" type="button" data-move="0,-1" aria-label="向北拓展" title="向北拓展">↑</button>
            <button class="btn compass-w" type="button" data-move="-1,0" aria-label="向西拓展" title="向西拓展">←</button>
            <button class="btn compass-home" id="atlas-home" type="button" aria-label="回到起点" title="回到起点">${icon('cabin',14)}</button>
            <button class="btn compass-e" type="button" data-move="1,0" aria-label="向东拓展" title="向东拓展">→</button>
            <button class="btn compass-s" type="button" data-move="0,1" aria-label="向南拓展" title="向南拓展">↓</button>
          </div>
        </div>
        <div class="spawn-hint" id="spawn-hint" hidden><strong>选一处干燥地面放置探访者</strong><button type="button" class="btn" id="quick-spawn">从步道出发</button></div>
        <div class="walker-hud" id="walker-hud" hidden>
          <article class="walk-note" id="walk-note" hidden><strong></strong><p></p></article>
          <div class="walk-info"><strong>探访者</strong><span id="locomotion" aria-live="off">站立 · 0.0 m/s</span><span id="nearby">靠近动物、树木或建筑</span></div>
          <div class="locomotion-actions"><button type="button" class="btn" id="jump">跳 / 翻越 <kbd>Space</kbd></button><button type="button" class="btn" id="sprint" aria-pressed="false">冲刺 <kbd>Shift</kbd></button><button type="button" class="btn" id="recenter-camera">镜头回正 <kbd>Q</kbd></button></div>
          <small class="walk-help">WASD 移动 · 贴近矮墙 / 台沿按 Space 翻越 · C 慢走</small>
          <div class="walk-actions">
            <button type="button" class="btn" id="observe">${icon('book',16)} 观察 <kbd>E</kbd></button>
            <button type="button" class="btn" id="chop">${icon('axe',16)} 伐木 <kbd>F</kbd></button>
            <button type="button" class="btn" id="mine">采矿 / 拆除 <kbd>G</kbd></button><button type="button" class="btn" id="attack">攻击 <kbd>J</kbd></button><button type="button" class="btn" id="respawn" hidden>营地复活 <kbd>R</kbd></button><span class="wood-badge" id="wood-count"></span>
          </div><div class="combat-note" id="combat-note" role="status"></div>
          <div class="joystick" id="joystick" role="group" aria-label="移动摇杆"><span class="joystick-ring"></span><span id="joystick-knob"></span><small>移动</small></div>
        </div>
        <div class="stage-tools">
          ${toolbarIcon('top','grid','俯视视角')}
          ${toolbarIcon('reset','reset','重置视角')}
          ${toolbarIcon('expand','expand','全屏预览')}
        </div>
      </div>
      <div class="dock">
        <div class="mode-buttons" role="group" aria-label="沙盘操作">
          ${button('mode-select','pointer','选择','V')}
          ${button('mode-build','brush','建造','B')}
          ${button('mode-erase','eraser','橡皮','X')}
          ${button('mode-camera','orbit','漫游','C')}
        </div>
        <div class="history-buttons" role="group" aria-label="编辑历史">
          ${toolbarIcon('undo','undo','撤销')}
          ${toolbarIcon('redo','redo','重做')}
        </div>
      </div>
      <div class="territory-bar">
        <div><strong id="territory-status">起点领地</strong><span id="territory-hint">沿东、南、西、北扩建，每次增加一块可建造地形。</span></div>
        <button class="btn primary" type="button" id="open-territory">${icon('map',15)} 扩建领地</button>
        <label class="territory-picker" id="territory-picker" hidden><span>定位视野</span><select id="territory-select" aria-label="前往已扩建领地"></select></label>
      </div>
      <div class="viewfoot">
        <span class="hints">${icon('mouse',13)} <span id="tool-tip"></span></span><span class="metrics" id="metrics"></span>
      </div>
    </section>
    <aside class="panel" aria-label="建造图鉴">
      <div class="panel-head"><span class="stamp">${icon('layers',19)}</span><div><h2>建造素材库</h2><small>DESIGN LIBRARY</small></div><span class="panel-count" id="panel-count"></span></div>
      <div class="catalog-tabs" id="categories" role="group" aria-label="预设分类">
        ${Object.entries(views).map(([key,value])=>`<button class="option" type="button" data-category="${key}" aria-pressed="${key===category}">${icon(value.icon,15)}${value.name}</button>`).join('')}
      </div>
      <div class="catalog-filters"><label class="search-field">${icon('search',15)}<input type="search" id="catalog-search" aria-label="搜索素材" placeholder="搜索当前分类"></label><select id="catalog-filter" aria-label="筛选类型"><option value="">全部类型</option></select></div>
      <div id="catalog" class="catalog-grid" aria-label="素材列表"></div>
    </aside>
    <aside class="panel properties" aria-label="属性与图鉴">
      <div class="panel-head"><span class="stamp">${icon('book',18)}</span><div><h2>属性与图鉴</h2><small>FIELD GUIDE</small></div></div>
      <div id="inspector" class="inspector"></div>
      <article class="guide-card" id="guide-card"></article>
      <section class="biome-panel" aria-label="生态群落">
        <div class="biome-mark">${icon('pine',17)}</div>
        <div class="biome-copy"><strong id="biome-name"></strong><small id="biome-detail"></small></div>
        <button class="chip" type="button" id="motion" aria-pressed="true">动态</button>
      </section>
      <label class="quality-control">画质 <select id="quality" aria-label="画质"><option value="auto">自动适配</option><option value="low">省电 · 无阴影</option><option value="balanced">均衡 · 柔和阴影</option><option value="high">精细 · 高清阴影</option></select></label>
      <section class="environment" aria-label="季节与光照">
        <div><span>${icon('tree',15)}季节</span><div class="segment">${optionButtons('season',['summer','autumn','winter'])}</div></div>
        <div><span>${icon('sun',15)}光照</span><div class="segment">${optionButtons('light',['day','gold','night'])}</div></div>
      </section>
    </aside>
  </div>
  <footer class="footer"><span>LINQI STUDIO / FIELD NOTES</span><span id="world-count"></span></footer>
</main>
<div role="status" id="toast"></div>
<dialog id="journal-dialog" aria-labelledby="journal-title">
  <div class="journal-head"><div><div class="eyebrow">FIELD NOTES</div><h2 id="journal-title">观察笔记</h2></div><button type="button" class="btn" id="journal-close" aria-label="关闭笔记">关闭</button></div>
  <div class="journal-meta" id="journal-meta"></div>
  <div id="journal-list"></div>
</dialog>`;

const stage=byId('stage'), inspector=byId('inspector');
function announce(text){
  const toast=byId('toast');
  toast.textContent=text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('visible'),2300);
}
const selectedObject=()=>world.objects.find(o=>o.id===selected);
function toolTip(){
  if(mode==='spawn')return '点击地面放置角色，或从预设步道出发。';
  if(mode==='walk')return 'WASD 移动 · Shift 冲刺 · Space 跳跃 / 翻越 / 攀上 · C 慢走 · 拖动看向 · Q 镜头回正 · E 观察 · F 伐木 · G 采矿拆除 · J 攻击 · Esc 返回建造。';
  if(mode!=='build') {
    if(mode==='camera'&&open)return matchMedia('(pointer: coarse)').matches?'拖动前往相邻领地，双指旋转或缩放。':'拖动或右键平移，滚轮缩放；中键拖动旋转。';
    return help[mode];
  }
  const o=items[active];
  if(o.category==='house') return '在地面拖出轮廓生成建筑，也可单击放置。';
  if(o.brush) return '在地面按住拖画，单击可以盖一个圆形笔印。';
  if(o.category==='animal')return waterAnimal({type:o.id})?'点击足够深的水面放置。':'点击开阔地面放置，动物会在附近活动。';
  return '点击地面放置，切换到「选择」可移动和旋转。';
}
function showMode(){
  for(const key of Object.keys(toolLabels)) byId('mode-'+key).setAttribute('aria-pressed',key===mode);
  byId('mode-tag').textContent=mode==='build'?'建造 / '+items[active].name:toolModes[mode];
  byId('explore-label').textContent=['walk','spawn'].includes(mode)?'返回建造':hasVisitor?'继续探索':'放置探访者';
  byId('explore').setAttribute('aria-pressed',['walk','spawn'].includes(mode));
  byId('relocate').hidden=!hasVisitor||['walk','spawn'].includes(mode);
  byId('walker-hud').hidden=mode!=='walk';
  byId('spawn-hint').hidden=mode!=='spawn';
  byId('tool-tip').textContent=toolTip();
  stage.dataset.mode=mode;
  viewport?.cameraMode(mode==='camera');
  viewport?.showFootprint(mode==='select' ? selectedObject() : null,true,true);
}
function renderCatalog(){
  const candidates=[...views[category].types.flatMap(key=>catalog[key].items.map(([id])=>items[id])),...(category==='terrain'?catalog.decor.items.filter(([id])=>id.startsWith('nature-')).map(([id])=>items[id]):[])].sort((a,b)=>Number(Boolean(packThumbnail(b.id)))-Number(Boolean(packThumbnail(a.id))));
  for(const b of byId('categories').children)b.setAttribute('aria-pressed',b.dataset.category===category);
  const families=[...new Set(candidates.map(o=>o.family))];
  const selector=byId('catalog-filter');
  if(filter!=='__models'&&!families.includes(filter))filter='';
  selector.innerHTML='<option value="">全部类型</option><option value="__models">精细模型</option>'+families.map(f=>`<option value="${f}">${f}</option>`).join('');
  selector.value=filter;
  const query=byId('catalog-search').value.trim().toLowerCase();
  const values=candidates.filter(o=>(!filter||(filter==='__models'?Boolean(packThumbnail(o.id)):o.family===filter))&&(!query||[o.name,o.detail,o.id].some(v=>v.toLowerCase().includes(query))));
  byId('panel-count').textContent=values.length+' / '+total;
  byId('catalog').innerHTML=values.length?values.map(o=>`
    <button type="button" class="preset-card" data-item="${o.id}" aria-pressed="${active===o.id&&mode==='build'}">
      <span class="preview-icon" style="--card-tint:${o.color}">${thumbnail(o)}</span>
      <span class="preset-copy"><strong>${o.name}</strong><small>${o.detail}</small></span>
    </button>`).join(''):'<p class="catalog-empty">没有匹配的素材。试试其他名称或类型。</p>';
}
let hasVisitor=false,observedType=null;
function showJournalCount(){
  byId('journal-count').textContent=journal.seen.length;
  byId('wood-count').textContent=world.game?.mode==='adventure'?`生命 ${world.game.health} · 木 ${world.game.wood} · 石 ${world.game.stone}`:'木材 '+journal.wood;
}
function renderGuide(){
  const type=mode==='walk'?(observedType??nearby?.observe?.type??active):selectedObject()?.type??active;
  const o=items[type], source=guideSources[o.source];
  byId('guide-card').innerHTML=`<div class="guide-art" style="--card-tint:${o.color}">${thumbnail(o)}</div>
    <div class="guide-content"><div class="guide-kicker">${o.family} · FIELD GUIDE</div><h3>${o.name}</h3><p>${o.fact}</p>
    ${source?`<a href="${source[1]}" target="_blank" rel="noopener noreferrer">${source[0]} ↗</a>`:''}
    ${journal.seen.includes(type)?'<span class="observed">✓ 已记入观察笔记</span>':''}</div>`;
}
function renderJournal(){
  byId('journal-meta').textContent=`已记录 ${journal.seen.length} / ${total} · 木材 ${journal.wood}`;
  byId('journal-list').innerHTML=journal.seen.length?[...journal.seen].reverse().map(id=>{
    const o=items[id];
    return `<article class="journal-entry"><div class="journal-art" style="--card-tint:${o.color}">${thumbnail(o)}</div>
      <div><small>${o.family}</small><h3>${o.name}</h3><p>${o.fact}</p></div></article>`;
  }).join(''):'<p class="journal-empty">建造、种植、绘制地形，或在漫步时靠近动物按 E。记录会出现在这里。</p>';
}
function updateNearby(value){
  nearby=value;
  const target=value?.observe,tree=value?.tree;
  byId('nearby').textContent=target?'附近 · '+items[target.type].name:tree?'附近 · '+items[tree.type].name:'靠近动物、树木或建筑';
  byId('observe').disabled=!target;
  byId('chop').disabled=!tree;
}
function startExploring(x,z){
  if(world.game.mode==='adventure'&&world.game.health<=0){announce('按 R 回到营地复活');return;}
  if(!viewport?.beginWalk(x,z)){announce('这里无法站立，试试开阔的干地。');return;}
  hasVisitor=true;observedType=null;strike=null;
  mode='walk';
  if(world.game.mode==='adventure')setGame(visit(world.game,tileKey(rx,rz)));
  showMode();renderInspector();renderGuide();renderCatalog();
  stage.focus({preventScroll:true});
}
function endExploring(){
  updateSceneAudio();
  clearStick();viewport?.endWalk();
  observedType=null;
  strike=null;
  clearTimeout(fieldNoteTimer);byId('walk-note').hidden=true;
}
function observeNow(){
  if(mode!=='walk')return;
  const target=viewport.observe();
  if(!target){announce('走近想观察的对象。');return;}
  observedType=target.type;
  const first=record(target.type);
  renderGuide();
  const note=byId('walk-note'),item=items[target.type];
  note.querySelector('strong').textContent=item.name;
  note.querySelector('p').textContent=item.fact;
  note.hidden=false;
  clearTimeout(fieldNoteTimer);
  fieldNoteTimer=setTimeout(()=>{note.hidden=true;},6500);
  announce(first?'已记录 · '+items[target.type].name:target.kind==='animal'?'它停下来朝你望了望。':'观察 · '+items[target.type].name);
}
function chopNow(){
  if(mode!=='walk')return;
  const target=viewport.chop();
  if(!target)return;
  audio.play('chop');
  const tag=[rx,rz,world.seed,target.id??'wild-'+target.key,round(target.x),round(target.z)].join('/');
  strike=strike?.tag===tag?{tag,count:strike.count+1}:{tag,count:1};
  if(strike.count<3){announce(`伐木 ${strike.count} / 3 · ${items[target.type].name}`);return;}
  strike=null;
  record(target.type);
  let next;
  if(target.id!==undefined)next={...world,objects:world.objects.filter(o=>o.id!==target.id)};
  else if(world.regions){
    const key=target.region??regionAt(target.x,target.z).join(','),meta=world.regions[key];
    next={...world,regions:{...world.regions,[key]:{...meta,felled:[...new Set([...(meta.felled??[]),target.key])]}}};
  }else next={...world,felled:[...new Set([...(world.felled??[]),target.key])]};
  if(world.game.mode==='adventure'){next.game=gather(world.game,'wood');commit(next);announce('伐木完成 · 木材 +3');}
  else{
    const gained=!journal.harvested.includes(tag);
    if(gained){journal.wood+=2;journal.harvested.push(tag);saveJournal();}
    commit(next);announce('已伐下树木');
  }
}
function newSceneSeed(){return 'LAND-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();}
function sceneSettings(){return {width:+byId('scene-width').value,height:+byId('scene-height').value,density:+byId('scene-density').value,plants:+byId('scene-plants').value,seed:byId('scene-seed').value||newSceneSeed()};}
function renderGame(){
 const g=world.game;if(!g)return;
 byId('game-mode').value=g.mode;byId('adventure-tools').hidden=g.mode!=='adventure';
 byId('game-stats').textContent=g.mode==='adventure'?`♥ ${g.health}/100　木材 ${g.wood}　石料 ${g.stone}　晶石 ${g.crystal}`:'无限材料 · 自由造境，随时切换冒险';
 byId('game-quest').textContent=quest(g);
 byId('attack').hidden=g.mode!=='adventure';byId('respawn').hidden=g.mode!=='adventure'||g.health>0;
 byId('camp-revive').hidden=g.mode!=='adventure'||g.health>0;
 byId('craft-sword').disabled=!!g.sword;byId('craft-pickaxe').disabled=!!g.pickaxe;
 byId('craft-sword').textContent=g.sword?'石刃剑已装备':'石刃剑 · 4 木 / 5 石';
 byId('craft-pickaxe').textContent=g.pickaxe?'石镐已装备':'石镐 · 5 木 / 3 石';
 if(g.mode==='adventure'&&g.health<=0)byId('combat-note').textContent='已倒下 · 按 R 返回起点营地（损失 20% 木材和石料）';
 if(g.mode!=='adventure')byId('combat-note').textContent='';
 showJournalCount();
}
function setGame(game){
 if(game===world.game)return;
 world={...world,game:normalizeGame(game)};before=[];after=[];save();
 viewport?.update(world,open?{x:rx,z:rz,claimed,continuous:true}:null);
 byId('undo').disabled=byId('redo').disabled=true;renderGame();
}
function payFor(o){
 if(world.game.mode!=='adventure')return world.game;
 if(world.game.health<=0){announce('先返回营地复活');return null;}
 const cost=buildingCost(items[o.type],o),paid=spend(world.game,cost);
 if(!paid){announce('材料不足，需要 '+costText(cost));return null;}
 return {...paid,built:paid.built+(items[o.type].brush?0:1)};
}
function gameEvent(event){
 if(event.type==='sound'){audio.play(event.name,event.strength);return;}
 if(event.type==='water-sound'){audio.setWater(event.level);return;}
 if(event.type==='controls-reset'){byId('sprint').setAttribute('aria-pressed','false');return;}
 if(event.type==='locomotion'){byId('locomotion').textContent=event.text;byId('locomotion').dataset.state=event.state;return;}
 if(event.type==='status'){if(world.game.mode==='adventure'&&world.game.health>0)byId('combat-note').textContent=event.text;return;}
 if(world.game.mode!=='adventure')return;
 if(event.type==='defeat'){
  audio.play('reward');
  setGame(rewardDefeat(world.game,event.id));announce('击败荒晶守卫 · 晶石 +2 · 石料 +2');
 }else if(event.type==='hurt'){
  const now=performance.now();if(now-lastHurt<1000||world.game.health<=0)return;lastHurt=now;
  audio.play('hit');
  setGame(hurt(world.game,event.damage));stage.classList.add('was-hit');setTimeout(()=>stage.classList.remove('was-hit'),350);
 }
}
function attackNow(){
 if(mode!=='walk'||world.game.mode!=='adventure')return;
 const result=viewport.attack();if(result?.hp>0){audio.play('hit');announce(`击中守卫 · 剩余生命 ${result.hp}/60`);}
}
function mineNow(){
 if(mode!=='walk')return;const target=viewport.strikeTarget();if(!target)return;
 const tag=target.id??`ground:${round(target.x)}:${round(target.z)}`;
 if(target.kind==='ground'&&world.strokes.some(s=>s.type==='basin'&&strokeDistance(target,s)<1.5)){announce('这里已经挖过，换一处地面');return;}
 audio.play(target.kind==='ground'?'dig':target.kind==='wood'?'chop':'mine');
 mineStrike=mineStrike?.tag===tag?{tag,count:mineStrike.count+1}:{tag,count:1};
 const hits=world.game.mode==='creative'?1:target.kind==='house'?6:world.game.pickaxe?2:4;
 if(mineStrike.count<hits){announce(`${target.kind==='ground'?'挖土':items[target.type].name} ${mineStrike.count}/${hits}`);return;}
 mineStrike=null;let next;
 if(target.kind==='ground'){
  if(world.strokes.length>=MAX_STROKES*(Object.keys(world.regions??{}).length||1)){announce('当前领地笔迹已满');return;}
  next={...world,strokes:[...world.strokes,{id:nextId,type:'basin',w:2.1,p:[[round(target.x),round(target.z)]]}]};
 }else next={...world,objects:world.objects.filter(o=>o.id!==target.id)};
 if(world.game.mode==='adventure')next.game=gather(world.game,target.kind==='wood'?'wood':'stone');
 selected=null;commit(next);announce(target.kind==='ground'?'挖出一处浅坑 · 已保存':world.game.mode==='adventure'?'拆除完成 · 已回收材料':'已拆除物件');
}
function respawnNow(){
 if(world.game.mode!=='adventure'||world.game.health>0)return;
 endExploring();mode='build';if(open)travel(-rx,-rz);
 setGame(respawn(world.game));lastHurt=performance.now()+1500;
 startExploring(.1,5.45);announce('已返回营地 · 保留装备与晶石');
}

function objectRange(key,value,min,max,title,unit){
  return `<label class="range"><span>${title}</span><input type="range" data-size="${key}" min="${min}" max="${max}" step=".1" value="${value}"><output>${Number(value).toFixed(1)} ${unit}</output></label>`;
}
function renderInspector(){
  const o=selectedObject();
  if(mode==='walk'||mode==='spawn'){
    inspector.innerHTML=`<div class="inspector-head"><strong>探访者</strong><span>${mode==='walk'?'探索中':'放置中'}</span></div><p>${toolTip()}</p>`;
    return;
  }
  if(mode==='select'&&o){
    const house=items[o.type].category==='house',traversable=isTraversable(o.type);
    const original=['cedar','alpine','shed'].includes(o.type);
    inspector.innerHTML=`<div class="inspector-head"><strong>${items[o.type].name}</strong><span>已选中</span></div>
      <div class="ranges">${house ? objectRange('w',o.w,2.4,8,'面宽','m')+objectRange('d',o.d,2.2,7,'进深','m') : traversable?objectRange('w',o.w,.6,3,'宽度','m')+objectRange('d',o.d,.35,3,'进深','m'):objectRange('w',o.w,.35,3,'大小','m')}</div>
      ${original?`<div class="object-options"><select data-material aria-label="木材"><option value="cedar">暖雪松</option><option value="dark">炭化木</option><option value="pale">浅白橡</option></select><button class="chip" type="button" data-module="deck" aria-pressed="${o.deck!==false}">前廊</button><button class="chip" type="button" data-module="chimney" aria-pressed="${o.chimney!==false}">烟囱</button></div>`:''}
      <div class="object-actions"><button class="btn" id="rotate" type="button">${icon('reset',14)} 旋转 45°</button><button class="btn delete" id="delete" type="button">${icon('trash',14)} 删除</button></div>`;
    if(original) inspector.querySelector('[data-material]').value=o.wood??'cedar';
    return;
  }
  if(mode==='build'&&items[active].brush){
    inspector.innerHTML=`<div class="inspector-head"><strong>${items[active].name}</strong><span>拖动绘制</span></div>${objectRange('brush',width,.55,7,'笔宽','m')}`;
    return;
  }
  inspector.innerHTML=`<div class="inspector-head"><strong>${mode==='build' ? items[active].name : toolLabels[mode]}</strong><span>${mode==='build' ? '已装备' : '当前工具'}</span></div><p>${toolTip()}</p>${world.game.mode==='adventure'&&mode==='build'?`<p class="build-cost">建造需要：${costText(buildingCost(items[active]))}</p>`:''}`;
}
function writeRegion(key,data){
  unsavedRegions.set(key,data);
  localStorage.setItem(key===originKey?STORE_KEY:ATLAS_KEY+'/'+key,JSON.stringify(data));
  savedRegions.add(key);
  unsavedRegions.delete(key);
}
function persistRegion(key,data){
  try{
    // A shared scene becomes the origin when its first neighboring plot is claimed.
    if(linked&&key!==originKey)writeRegion(originKey,origin);
    writeRegion(key,data);
    if(linked){
      const local=new URL(location.href);
      local.search='';
      window.history.replaceState(null,'',local);
      linked=false;
    }
    return true;
  }catch{
    unsavedRegions.set(key,data);
    return false;
  }
}
function save(){
  if(world.regions){
    try{
      localStorage.setItem(TERRITORY_KEY,JSON.stringify(territoryEnvelope(world)));territorySaved=true;
      if(linked){const url=new URL(location.href);url.search='';window.history.replaceState(null,'',url);linked=false;}
    }catch{territorySaved=false;}
    rememberLocation();return;
  }
  const key=tileKey(rx,rz);
  if(key===originKey)origin=world;
  else atlas.set(key,world);
  persistRegion(key,world);
  rememberLocation();
}
function syncTerritory(){
  const current=tileKey(rx,rz);
  const keys=world.regions?Object.keys(world.regions):[...new Set([originKey,...savedRegions,...unsavedRegions.keys()])];
  const status=world.regions?(territorySaved?'整片领地已存本机':'存储已满 · 请导出备份'):unsavedRegions.has(current)?'仅保存在本次会话':linked&&current===originKey?'分享场景':
    savedRegions.has(current)?'已存本机':'等待编辑';
  byId('save-label').textContent=status;
  byId('territory-status').textContent=open?`连续领地 · ${keys.length} 块 · ${status}`:`起点领地 · ${status}`;
  byId('territory-hint').textContent=open?'可跨地块搭房、画路。右键拖动平移，+ 箭头向外扩建。':'沿东、南、西、北扩建，每次增加一块可建造地形。';
  byId('open-territory').hidden=open;
  byId('territory-picker').hidden=!open;
  const select=byId('territory-select');
  select.replaceChildren(...keys.map(key=>new Option((world.regions?.[key]?.scene?sceneDesigns[world.regions[key].scene].name+' · ':'')+(key===originKey?'起点 (0, 0)':key.replace(',','，')),key)));
  select.value=current;
  for(const button of document.querySelectorAll('#atlas-controls [data-move]')){
    const [dx,dz]=button.dataset.move.split(',').map(Number);
    const direction=directions[button.dataset.move];
    const isNew=!claimed(rx+dx,rz+dz);
    const label=isNew?`向${direction}扩建`:`前往${direction}边领地`;
    button.title=label;
    button.setAttribute('aria-label',label);
    button.classList.toggle('unclaimed',isNew);
  }
}
const plotName=meta=>sceneDesigns[meta.scene]?.name??themes[meta.theme].label;
function sync(){
  open=Boolean(world.regions);
  if(open&&!world.regions[tileKey(rx,rz)]){rx=rz=0;viewport?.focusRegion(0,0);}
  nextId=Math.max(0,...world.objects.map(o=>o.id),...world.strokes.map(o=>o.id))+1;
  const meta=world.regions?.[tileKey(rx,rz)]??world,biome=biomes[biomeOf(meta)];
  updateSceneAudio(meta);
  byId('plot-title').textContent=plotName(world.regions?.[tileKey(rx,rz)]??world);
  byId('biome-name').textContent=sceneDesigns[meta.scene]?.name??biome.label;
  byId('biome-detail').textContent=sceneDesigns[meta.scene]?.ecology??biome.detail;
  byId('atlas-controls').hidden=!open;
  byId('atlas-coord').textContent=`视野 ${rx}, ${rz}`;
  byId('map-mode').setAttribute('aria-pressed',open);
  byId('map-label').textContent=open?'起点视角':'扩建领地';
  syncTerritory();
  byId('motion').setAttribute('aria-pressed',motion);
  byId('motion').textContent=motion?'动态开':'动态关';
  stage.classList.toggle('open-land',open);
  stage.classList.toggle('still',!motion);

  byId('weather-tag').textContent=labels[world.season]+' / '+labels[world.light];
  byId('seed-tag').textContent='SEED '+meta.seed;
  byId('world-count').textContent=`${world.objects.length} 个物件 · ${world.strokes.length} 道笔迹`;
  byId('undo').disabled=world.game.mode==='adventure'||before.length===0;
  byId('redo').disabled=world.game.mode==='adventure'||after.length===0;
  for(const b of document.querySelectorAll('[data-world]')) b.setAttribute('aria-pressed',world[b.dataset.world]===b.dataset.value);
  viewport?.update(world,open?{x:rx,z:rz,claimed,continuous:true}:null);
  showMode();
  renderInspector();
  renderGuide();
  showJournalCount();renderGame();
}
function commit(next){
  next={...next,game:normalizeGame(next.game??world.game)};
  if(world.game.mode==='adventure'){before=[];after=[];world=next;save();sync();return;}
  before.push(world);
  if(before.length>42) before.shift();
  after=[];
  world=next;
  save();
  sync();
}
function cancelDraft(){
  draft=null;
  pending=null;
  viewport?.clearPreview();
  viewport?.showFootprint(mode==='select'?selectedObject():null,true,true);
}
function history(redo=false){
  if(world.game.mode==='adventure'){announce('冒险行动即时存档，无法撤销');return;}
  const stack=redo?after:before;
  if(!stack.length) return;
  cancelDraft();
  (redo?before:after).push(world);
  world=stack.pop();
  selected=null;
  save();
  sync();
  announce(redo?'已重做':'已撤销');
}
function travel(dx,dz,follow=false){
  if(!open||!Number.isSafeInteger(rx+dx)||!Number.isSafeInteger(rz+dz))return;
  const x=rx+dx,z=rz+dz;
  if(!claimed(x,z))return;
  rx=x;rz=z;
  const meta=world.regions[tileKey(rx,rz)],biome=biomes[biomeOf(meta)];
  updateSceneAudio(meta);
  byId('biome-name').textContent=sceneDesigns[meta.scene]?.name??biome.label;byId('biome-detail').textContent=sceneDesigns[meta.scene]?.ecology??biome.detail;
  byId('plot-title').textContent=plotName(meta);byId('seed-tag').textContent='SEED '+meta.seed;
  if(!follow){cancelDraft();viewport?.focusRegion(rx,rz);}
  syncTerritory();byId('atlas-coord').textContent=`视野 ${rx}, ${rz}`;
  rememberLocation();
  if(mode==='walk'&&world.game.mode==='adventure')setGame(visit(world.game,tileKey(rx,rz)));
}
function openNeighbor(button){
  const [dx,dz]=button.dataset.move.split(',').map(Number),x=rx+dx,z=rz+dz;
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z))return;
  if(!claimed(x,z)){
    const next=wildTile('LINQI-ATLAS',x,z);
    commit(appendRegion(world,connectScene(world,next,x,z),x,z));
    announce(territorySaved?'已连通新领地，可直接跨边界建造':'已扩建，存储已满，请导出领地备份');
  }
  switchMode('build');travel(dx,dz);
}
function toggleMap(){
  if(open){travel(-rx,-rz);viewport?.reset();return;}
  endExploring();cancelDraft();selected=null;
  makeContinuous();open=true;rx=rz=0;mode='build';
  save();sync();renderCatalog();viewport?.reset();
  announce('领地已连通。用 + 箭头扩建，可跨边界搭房、画路');
}
function switchMode(next){
  if(mode==='walk'&&next!=='walk')endExploring();
  cancelDraft();
  mode=next;
  showMode();
  renderCatalog();
  renderInspector();
  renderGuide();
}
const isHouse=o=>items[o.type].category==='house';
function overlap(a,b){
  const pointsA=footprint(a,-.09),pointsB=footprint(b,-.09);
  for(const angle of [a.a,a.a+Math.PI/2,b.a,b.a+Math.PI/2]){
    const project=([x,z])=>Math.cos(angle)*x-Math.sin(angle)*z;
    const aa=pointsA.map(project),bb=pointsB.map(project);
    if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa)) return false;
  }
  return true;
}
function validObject(o){
  const def=items[o.type],house=isHouse(o);
  if(def.category==='animal')return viewport.canPlace(o);
  const corners=footprint(o,.24);
  for(let j=0;j<4;j++){
    const a=corners[j],b=corners[(j+1)%4],steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.3);
    for(let i=0;i<=steps;i++)if(!inBounds(a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps,.05))return false;
  }
  const wet=viewport.depth(o.x,o.z);
  if(def.form==='lily')return inBounds(o.x,o.z,.2)&&wet>.68;
  const bridge=def.form==='bridge';
  if(!footprint(o,house?.23:.04).every(([x,z])=>inBounds(x,z,.15)&&(bridge||viewport.depth(x,z)<.61)))return false;
  if(!bridge&&wet>.52)return false;
  return !world.objects.some(other=>other.id!==o.id&&isHouse(other)&&overlap(o,other));
}
function createShape(type,x,z,id=nextId){
  const item=items[type];
  return {id,type,x:round(x),z:round(z),w:item.width,d:item.depth??item.width,a:0};
}
function updateObject(next){
  if(!validObject(next)){
    announce('这里太靠近水面、沙盘边缘或另一栋建筑');
    viewport.clearPreview();
    viewport.showFootprint(selectedObject(),true,true);
    return;
  }
  let game=world.game;
  if(game.mode==='adventure'){
    const old=world.objects.find(o=>o.id===next.id),was=buildingCost(items[next.type],old),now=buildingCost(items[next.type],next);
    const delta=Object.fromEntries(Object.entries(now).map(([k,v])=>[k,Math.max(0,v-(was[k]??0))]));game=spend(game,delta);
    if(!game){announce('扩建材料不足，需要 '+costText(delta));return;}
  }
  commit({...world,game,objects:world.objects.map(o=>o.id===next.id?next:o)});
}
function removeObject(id){
  if(world.game.mode==='adventure'){announce('在漫步模式靠近物件按 G 拆除并回收材料');return;}
  if(!world.objects.some(o=>o.id===id)) return;
  selected=null;
  commit({...world,objects:world.objects.filter(o=>o.id!==id)});
  announce('已移除物件');
}
function strokeDistance(p,stroke){
  let nearest=Infinity;
  for(let i=0;i<stroke.p.length;i++){
    const [x,z]=stroke.p[i],[xx,zz]=stroke.p[i+1]??stroke.p[i];
    const dx=xx-x,dz=zz-z,denom=dx*dx+dz*dz;
    const t=denom?clamp(((p.x-x)*dx+(p.z-z)*dz)/denom,0,1):0;
    nearest=Math.min(nearest,Math.hypot(x+dx*t-p.x,z+dz*t-p.z));
  }
  return nearest;
}
function erase(point){
  if(world.game.mode==='adventure'){announce('冒险模式请靠近后用 F / G 采集和拆除');return;}
  if(point.id!==null){removeObject(point.id);return;}
  const stroke=[...world.strokes].reverse().find(s=>strokeDistance(point,s)<=Math.max(.45,s.w*.5+.2));
  if(!stroke){announce('点选想移除的物件或笔迹');return;}
  commit({...world,strokes:world.strokes.filter(s=>s.id!==stroke.id)});
  announce('已移除笔迹');
}
function dragShape(p){
  const {start,object,kind,corner}=draft;
  if(kind==='move') return {...object,x:round(object.x+p.x-start.x),z:round(object.z+p.z-start.z)};
  if(kind==='resize'){
    const c=Math.cos(object.a),s=Math.sin(object.a);
    const [x,z]=footprint(object)[(corner+2)%4],dx=p.x-x,dz=p.z-z;
    const signs=[[-1,-1],[-1,1],[1,1],[1,-1]][corner];
    const w=clamp((c*dx-s*dz)*signs[0],2.4,8), d=clamp((s*dx+c*dz)*signs[1],2.2,7);
    const ww=Math.round(w*5)/5, dd=Math.round(d*5)/5;
    return {...object,w:ww,d:dd,x:round(x+(c*ww*signs[0]+s*dd*signs[1])/2),z:round(z+(-s*ww*signs[0]+c*dd*signs[1])/2)};
  }
  if(!isHouse(object)||Math.hypot(p.x-start.x,p.z-start.z)<.43) return createShape(object.type,p.x,p.z);
  const w=clamp(Math.round(Math.abs(p.x-start.x)*5)/5,2.4,8);
  const d=clamp(Math.round(Math.abs(p.z-start.z)*5)/5,2.2,7);
  return {...object,w,d,x:round(start.x+Math.sign(p.x-start.x||1)*w/2),z:round(start.z+Math.sign(p.z-start.z||1)*d/2)};
}
function addBrushPoint(p){
  if(!p||!inBounds(p.x,p.z,.10)) return;
  const points=draft.stroke.p;
  const [x,z]=points.at(-1);
  const distance=Math.hypot(p.x-x,p.z-z);
  const step=clamp(width*.21,.27,.49);
  if(distance<step||points.length>=MAX_POINTS) return;
  const count=Math.min(MAX_POINTS-points.length,Math.ceil(distance/step),32);
  for(let i=1;i<=count;i++){
    const xx=round(x+(p.x-x)*i/count),zz=round(z+(p.z-z)*i/count);
    if(!inBounds(xx,zz,width/2))break;
    points.push([xx,zz]);
  }
}
function down(p){
  if(!p) return;
  if(mode==='spawn'){startExploring(p.x,p.z);return;}
  if(mode==='walk')return;
  if(open&&!inBounds(p.x,p.z,.08)){
    announce('这里还未扩建，用右上角 + 箭头连通新领地');
    return;
  }
  if(mode==='erase'){erase(p);return;}
  if(mode==='select'){
    const current=selectedObject();
    const corner=current&&isHouse(current)?footprint(current).findIndex(([x,z])=>Math.hypot(x-p.x,z-p.z)<.46):-1;
    if(corner>=0){draft={kind:'resize',start:p,object:current,corner};return;}
    selected=p.id;
    const o=selectedObject();
    renderInspector();
    renderGuide();
    viewport.showFootprint(o,true,true);
    if(o) draft={kind:'move',start:p,object:o};
    return;
  }
  if(!inBounds(p.x,p.z,.11)) return;
  const def=items[active];
  if(def.brush){
    if(!inBounds(p.x,p.z,width/2)){announce('笔刷需要完整落在已扩建的领地内');return;}
    if(world.strokes.length>=MAX_STROKES*(Object.keys(world.regions??{}).length||1)){announce('当前领地笔迹已满，扩建可增加容量');return;}
    draft={kind:'brush',stroke:{id:nextId,type:active,w:width,p:[[round(p.x),round(p.z)]]}};
    viewport.showStroke(draft.stroke);
  }else{
    if(world.objects.length>=MAX_OBJECTS*(Object.keys(world.regions??{}).length||1)){announce('当前领地物件已满，扩建可增加容量');return;}
    const object=createShape(active,p.x,p.z);
    draft={kind:'create',start:p,object};
    viewport.showObject(object,null,validObject(object));
  }
}
function move(p){
  if(!p||!draft) return;
  if(draft.kind==='brush'){
    addBrushPoint(p);
    viewport.showStroke(draft.stroke);
  } else if(draft.kind!=='move'||Math.hypot(p.x-draft.start.x,p.z-draft.start.z)>.13){
    const o=dragShape(p);
    viewport.showObject(o,draft.kind==='create'?null:o.id,validObject(o));
  }
}
function up(p){
  if(!draft) return;
  const current=draft;
  if(current.kind==='brush'){
    addBrushPoint(p);
    cancelDraft();
    const game=payFor(current.stroke);if(!game)return;
    record(current.stroke.type);
    commit({...world,game,strokes:[...world.strokes,current.stroke]});
    audio.play('build',.65);
    return;
  }
  const o=p&&(current.kind!=='move'||Math.hypot(p.x-current.start.x,p.z-current.start.z)>.13)?dragShape(p):current.object;
  cancelDraft();
  if(current.kind==='create'){
    if(!validObject(o)){announce(waterAnimal(o)||items[o.type].form==='lily'?'请选一处足够深且宽敞的水面。':items[o.type].category==='animal'?'请选择开阔的地面，并给附近动物留出距离。':'请换一处开阔、合适的地面。');return;}
    if(items[o.type].category!=='animal')record(o.type);
    const game=payFor(o);if(!game)return;
    commit({...world,game,objects:[...world.objects,o]});
    audio.play('build');
    announce(items[o.type].name+'已建好');
  } else if(JSON.stringify(o)!==JSON.stringify(current.object)) updateObject(o);
}
function hover(p){
  if(mode==='camera'||mode==='select'||mode==='walk'){viewport.cursor(null);return;}
  if(mode==='spawn'){viewport.cursor(p,.33,Boolean(p&&inBounds(p.x,p.z,.3)&&viewport.depth(p.x,p.z)<.45));return;}
  if(!p||!inBounds(p.x,p.z,.10)){viewport.cursor(null);viewport.showFootprint(null);return;}
  if(mode==='build'&&items[active].category==='house'){
    const o=createShape(active,p.x,p.z);
    viewport.cursor(null);
    viewport.showFootprint(o,validObject(o));
  }else viewport.cursor(p,mode==='build'?Math.max(.32,width/2):.46,true);
}
function onInput(kind,p){
  if(kind==='move'||kind==='hover'){
    pending={kind,p};
    if(!frame) frame=requestAnimationFrame(()=>{
      frame=0;
      const event=pending;
      pending=null;
      if(!event)return;
      if(event.kind==='move')move(event.p);
      else hover(event.p);
    });
    return;
  }
  pending=null;
  if(kind==='down') down(p);
  else if(kind==='up') up(p);
  else if(kind==='cancel') cancelDraft();
  else {
    viewport.cursor(null);
    viewport.showFootprint(mode==='select'?selectedObject():null,true,true);
  }
}

const audio = createGameAudio(status => { byId('audio-status').textContent = status; });
function renderAudioToggle() {
  const enabled = audio.settings.enabled;
  byId('audio-toggle').setAttribute('aria-pressed', String(enabled));
  byId('audio-toggle').textContent = enabled ? '静音' : '开启声音';
}
renderAudioToggle();
if (audio.settings.enabled) byId('audio-status').textContent = '点击或按键后恢复声音';
byId('audio-toggle').addEventListener('click', () => {
  audio.configure({ enabled: !audio.settings.enabled });
  updateSceneAudio();
  renderAudioToggle();
});
byId('audio-track').value = audio.settings.track;
byId('audio-track').addEventListener('change', event => audio.configure({ track: event.target.value }));
for (const key of ['music', 'ambient', 'effects']) {
  const slider = byId('audio-' + key);
  slider.value = audio.settings[key];
  slider.addEventListener('input', () => audio.configure({ [key]: slider.valueAsNumber }));
}
for (const event of ['click', 'keydown']) {
  document.addEventListener(event, () => { void audio.unlock(); }, { once: true, capture: true });
}

function updateSceneAudio(meta = world.regions?.[tileKey(rx,rz)] ?? world) {
  if (!audio.settings.enabled) return;
  const x = open ? rx * LAND.x * 2 : 0;
  const z = open ? rz * LAND.z * 2 : 0;
  const hasWater = world.strokes.some(stroke => items[stroke.type]?.category === 'water' &&
    stroke.p.some(([px,pz]) => Math.abs(px-x) <= LAND.x && Math.abs(pz-z) <= LAND.z));
  audio.setScene(meta, world.light, hasWater ? .5 : 0);
}
try{viewport=createViewport(stage,text=>{byId('metrics').textContent=text;},onInput,travel,updateNearby,gameEvent,()=>audio.settings.enabled);}
catch(error){
  console.error(error);
  stage.insertAdjacentHTML('afterbegin','<div class="render-error">当前浏览器无法启动 WebGL 2。<br>请使用启用硬件加速的浏览器打开沙盘。</div>');
  byId('snapshot').disabled=true;
}
sync();
viewport?.reset();
viewport?.motion(motion);
preloadModelPack(id=>viewport?.refreshModels(id));
renderCatalog();

for(const key of Object.keys(toolLabels)) byId('mode-'+key).addEventListener('click',()=>switchMode(key));
byId('categories').addEventListener('click',e=>{
  const target=e.target.closest('[data-category]');
  if(!target) return;
  category=target.dataset.category;
  filter='';byId('catalog-search').value='';
  renderCatalog();
  byId('catalog').scrollTop=0;
});
byId('catalog-search').addEventListener('input',()=>{renderCatalog();byId('catalog').scrollTop=0;});
byId('catalog-filter').addEventListener('change',e=>{filter=e.target.value;renderCatalog();byId('catalog').scrollTop=0;});
byId('catalog').addEventListener('click',e=>{
  const target=e.target.closest('[data-item]');
  if(!target) return;
  active=target.dataset.item;
  width=items[active].width;
  switchMode('build');
  byId('catalog').querySelector('[data-item="'+active+'"]').focus({preventScroll:true});
  if(matchMedia('(max-width: 810px)').matches && stage.getBoundingClientRect().bottom<90) stage.scrollIntoView({block:'start'});
});
inspector.addEventListener('input',e=>{
  const key=e.target.dataset.size;
  if(!key)return;
  const value=e.target.valueAsNumber;
  e.target.nextElementSibling.value=value.toFixed(1)+' m';
  if(key==='brush'){width=value;return;}
  const o=selectedObject();
  if(o&&viewport){
    const next={...o,[key]:value};
    if(!isHouse(o)&&!isTraversable(o.type))next.d=value;
    viewport.showObject(next,o.id,validObject(next));
  }
});
inspector.addEventListener('change',e=>{
  const o=selectedObject();
  if(!o||!viewport)return;
  const key=e.target.dataset.size;
  if(key&&key!=='brush'){
    const value=e.target.valueAsNumber,next={...o,[key]:value};
    if(!isHouse(o)&&!isTraversable(o.type))next.d=value;
    updateObject(next);
    renderInspector();
  }else if(e.target.matches('[data-material]'))updateObject({...o,wood:e.target.value});
});
inspector.addEventListener('click',e=>{
  const btn=e.target.closest('button'),o=selectedObject();
  if(!btn||!o||!viewport)return;
  if(btn.id==='rotate')updateObject({...o,a:round((o.a+Math.PI/4)%(Math.PI*2))});
  else if(btn.id==='delete')removeObject(o.id);
  else if(btn.dataset.module)updateObject({...o,[btn.dataset.module]:o[btn.dataset.module]===false});
});
document.querySelector('.environment').addEventListener('click',e=>{
  const b=e.target.closest('[data-world]');
  if(!b||world[b.dataset.world]===b.dataset.value)return;
  cancelDraft();
  commit({...world,[b.dataset.world]:b.dataset.value});
});
function renderSceneSummary(){
  const id=byId('theme').value.slice(6),design=byId('theme').value.startsWith('scene:')?sceneDesigns[id]:null;
  byId('load-theme').textContent=design?'一键生成':'载入沙盘';
  byId('scene-controls').hidden=!design;
  byId('scene-summary').innerHTML=design?`<div class="scene-miniatures">${design.preview.map(id=>`<img src="${packThumbnail(id)}" alt="${items[id].name}">`).join('')}</div><div><strong>${design.name}<span>随机布局 · 可调范围、密度与植物</span></strong><p>${design.description}</p><small>自动接入新领地，保留已有建造。生成后可逐件编辑、继续扩建，也可撤销。</small></div>`:'<div><strong>基础沙盘</strong><p>载入将替换当前地块的物件与笔迹，可撤销。已有其他领地会保留。</p></div>';
}
byId('theme').addEventListener('change',renderSceneSummary);
byId('theme').value='scene:garden';byId('scene-seed').value=newSceneSeed();renderSceneSummary();
byId('scene-reroll').addEventListener('click',()=>{byId('scene-seed').value=newSceneSeed();announce('已更换布局种子，点击一键生成');});
byId('load-theme').addEventListener('click',()=>{
  cancelDraft();
  selected=null;
  const name=byId('theme').value;
  if(mode==='walk'||mode==='spawn'){endExploring();mode='build';}
  if(name.startsWith('scene:')){
    try{
      const settings=sceneSettings(),oldCount=world.objects.length;
      const result=appendScene(continuousSnapshot(),name.slice(6),{x:rx,z:rz},settings);
      rx=result.x;rz=result.z;mode='build';commit(result.world);
      viewport?.reset();renderCatalog();
      announce(`已生成${sceneDesigns[name.slice(6)].name} · 道路水系已衔接，原有建造已保留`);
      byId('last-generation').textContent=`上次生成：${settings.seed} · ${settings.width} × ${settings.height} 块 · ${result.world.objects.length-oldCount} 个实际物件`;
      if(!byId('seed-lock').checked)byId('scene-seed').value=newSceneSeed();
    }catch(error){announce(error.message);}
    return;
  }
  if(world.regions){
    const key=tileKey(rx,rz),local=preset(name),[sx,sz]=[rx*30,rz*22.8];
    const regions={...world.regions};delete regions[key];
    const base={...world,regions,objects:world.objects.filter(o=>regionAt(o.x,o.z).join(',')!==key),
      strokes:world.strokes.filter(s=>!s.p.every(([x,z])=>regionAt(x,z).join(',')===key))};
    commit(appendRegion(base,local,rx,rz));
  }else commit(preset(name));
  viewport?.reset();
  announce(`已载入${themes[name].label}，可撤销`);
});
byId('map-mode').addEventListener('click',toggleMap);
byId('open-territory').addEventListener('click',()=>{
  toggleMap();
  document.querySelector('#atlas-controls [data-move]')?.focus({preventScroll:true});
});
byId('territory-select').addEventListener('change',e=>{
  const [x,z]=e.target.value.split(',').map(Number);
  switchMode('build');
  travel(x-rx,z-rz);
});
byId('explore').addEventListener('click',()=>{
  if(mode==='walk'||mode==='spawn'){switchMode('build');return;}
  if(hasVisitor){startExploring();return;}
  switchMode('spawn');
});
byId('relocate').addEventListener('click',()=>switchMode('spawn'));
byId('quick-spawn').addEventListener('click',()=>startExploring());
byId('observe').addEventListener('click',observeNow);
byId('chop').addEventListener('click',chopNow);
byId('mine').addEventListener('click',mineNow);
byId('attack').addEventListener('click',attackNow);
byId('respawn').addEventListener('click',respawnNow);
byId('camp-revive').addEventListener('click',respawnNow);
byId('game-mode').addEventListener('change',e=>{cancelDraft();mineStrike=strike=null;setGame({...world.game,mode:e.target.value});renderInspector();announce(e.target.value==='adventure'?'冒险开始 · 放置探访者去采集与探索':'已切换创造模式 · 自由建造');});
for(const id of Object.keys(recipes))byId('craft-'+id).addEventListener('click',()=>{
 const next=craft(world.game,id);if(!next){announce('材料不足，或已经装备 / 生命已满');return;}setGame(next);audio.play('reward',.75);announce('已制作 '+recipes[id].name);
});
byId('jump').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);viewport?.jump(true);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])byId('jump').addEventListener(type,()=>viewport?.jump(false));
byId('jump').addEventListener('click',e=>{if(e.detail===0){viewport?.jump(true);viewport?.jump(false);}});
byId('sprint').addEventListener('click',()=>{byId('sprint').setAttribute('aria-pressed',String(viewport?.toggleRun()));stage.focus({preventScroll:true});});
byId('recenter-camera').addEventListener('click',()=>viewport?.recenter());
const joystick=byId('joystick'),knob=byId('joystick-knob');let stickPointer=null;
function steerStick(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),scale=Math.min(1,32/(length||1));
 const x=dx*scale,z=dy*scale;knob.style.transform=`translate(${x}px,${z}px)`;viewport?.steer(length<5?0:x/32,length<5?0:-z/32);}
joystick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);steerStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)steerStick(e);});
function clearStick(){stickPointer=null;knob.style.transform='';viewport?.steer(0,0);}
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(e.pointerId===stickPointer)clearStick();});
window.addEventListener('blur',clearStick);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearStick();});
const journalDialog=byId('journal-dialog');
byId('journal-open').addEventListener('click',()=>{
  clearStick();viewport?.clearMovement();renderJournal();journalDialog.showModal();
});
byId('journal-close').addEventListener('click',()=>journalDialog.close());
window.addEventListener('blur',()=>viewport?.clearMovement());
document.addEventListener('visibilitychange',()=>{if(document.hidden)viewport?.clearMovement();});
document.addEventListener('keyup',e=>{const key=walkKeys[e.key.toLowerCase()];if(key)viewport?.move(key,false);if(e.code==='Space')viewport?.jump(false);});
byId('atlas-controls').addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!button)return;
  if(button.id==='atlas-home'){
    switchMode('build');
    travel(-rx,-rz);
  }else if(button.dataset.move)openNeighbor(button);
});
byId('motion').addEventListener('click',()=>{
  motion=!motion;
  viewport?.motion(motion);
  stage.classList.toggle('still',!motion);
  byId('motion').setAttribute('aria-pressed',motion);
  byId('motion').textContent=motion?'动态开':'动态关';
  rememberLocation();
});
byId('undo').addEventListener('click',()=>history());
byId('redo').addEventListener('click',()=>history(true));
byId('reset').addEventListener('click',()=>{if(mode==='walk')switchMode('build');cancelDraft();viewport?.reset();});
byId('top').addEventListener('click',()=>{if(mode==='walk')switchMode('build');cancelDraft();viewport?.reset(true);});
byId('expand').addEventListener('click',async()=>{
  if(stage.classList.contains('maximized')) stage.classList.remove('maximized');
  else if(document.fullscreenElement===stage) await document.exitFullscreen();
  else {try{await stage.requestFullscreen();}catch{stage.classList.add('maximized');stage.focus();}}
});
document.addEventListener('keydown',e=>{
  if(journalDialog.open)return;
  if(e.key==='Escape'){
    if(mode==='walk'||mode==='spawn')switchMode('build');
    cancelDraft();
    stage.classList.remove('maximized');
    return;
  }
  if(e.target.matches('input,textarea,select'))return;
  const key=e.key.toLowerCase();
  if(mode==='walk'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
    if(e.code==='Space'){e.preventDefault();if(!e.repeat)viewport?.jump(true);return;}
    if(key==='q'&&!e.repeat){viewport?.recenter();return;}
    if(walkKeys[key]){e.preventDefault();viewport?.move(walkKeys[key],true);return;}
    if(key==='e'&&!e.repeat){observeNow();return;}
    if(key==='f'&&!e.repeat){chopNow();return;}
    if(key==='g'&&!e.repeat){mineNow();return;}
    if(key==='j'&&!e.repeat){attackNow();return;}
    if(key==='r'&&!e.repeat){respawnNow();return;}
  }
  if((e.metaKey||e.ctrlKey)&&['z','y'].includes(key)){e.preventDefault();history(e.shiftKey||key==='y');return;}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const direction={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[key];
  if(open&&mode==='camera'&&direction){e.preventDefault();travel(...direction);return;}
  const next={v:'select',b:'build',x:'erase',c:'camera'}[key];
  if(next)switchMode(next);
  if(['delete','backspace'].includes(key)&&mode==='select'&&selected!==null){e.preventDefault();removeObject(selected);}
});
byId('share').addEventListener('click',async()=>{
  if(world.regions){
    const blob=new Blob([JSON.stringify(territoryEnvelope(world))],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='linqi-territory.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);announce('整片领地已导出，包含所有跨区建筑与道路');return;
  }
  const href=worldLink(world);
  try{await navigator.clipboard.writeText(href);announce(open?'已复制当前领地链接':'设计链接已复制');}
  catch{window.prompt('复制设计链接',href);}
});
byId('quality').addEventListener('change',e=>{
  viewport?.quality(e.target.value);
  try{localStorage.setItem('linqi-quality',e.target.value);}catch{}
});
try{const q=localStorage.getItem('linqi-quality');if(['auto','low','balanced','high'].includes(q)){byId('quality').value=q;viewport?.quality(q);}}catch{}
byId('import-world').addEventListener('click',()=>byId('import-file').click());
byId('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>25*1024*1024)throw new Error('large');
    const next=normalizeTerritory(JSON.parse(await file.text()));if(!next)throw new Error('invalid');
    endExploring();cancelDraft();selected=null;mode='build';open=true;rx=rz=0;
    commit(next);viewport?.reset();announce('已导入整片领地，可撤销恢复之前的设计');
  }catch{announce('无法导入，请选择林栖导出的有效领地 JSON 文件');}
  e.target.value='';
});
byId('snapshot').addEventListener('click',async()=>{
  if(!viewport)return;
  cancelDraft();
  try{
    const blob=await viewport.snapshot();
    if(!blob)throw new Error('PNG encoding failed');
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='linqi-'+world.seed.toLowerCase()+'.png';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    announce('已导出沙盘照片');
  }catch{announce('图片导出失败，请重试');}
});
