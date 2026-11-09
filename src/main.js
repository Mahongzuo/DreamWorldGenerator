import './style.css';
import {icon} from './icons.js';
import {catalog, items, themes, preset, inside, footprint, clamp, round, loadWorld, worldLink, STORE_KEY, ATLAS_KEY, MAX_OBJECTS, MAX_STROKES, MAX_POINTS, biomeOf, biomes, normalize, tileInside, tileKey, wildTile} from './sandbox-state.js';
import {createViewport} from './viewport.js';

const labels={summer:'常青',autumn:'秋林',winter:'初雪',day:'白昼',gold:'金暮',night:'月夜'};
const toolLabels={select:'选择',build:'建造',erase:'橡皮',camera:'漫游'};
const help={
  select:'点选物件后拖动可移动，拖建筑四角可改尺寸。',
  erase:'点一下物件或笔迹即可移除。',
  camera:'拖动旋转视角，滚轮或捏合缩放。'
};
const svg=(inside,view='0 0 100 48')=>`<svg viewBox="${view}" aria-hidden="true">${inside}</svg>`;
function thumbnail(o){
  const ground='<ellipse cx="50" cy="38" rx="35" ry="7" fill="#829465" opacity=".22"/>';
  const {color:c,accent:a}=o;
  if(o.category==='house'){
    const pavilion=o.id==='pavilion', east=pavilion||o.id==='jiangnan', tower=o.id==='tower', alpine=o.id==='alpine', shed=o.id==='shed';
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
let mode='build',category='house',active='cedar',selected=null,draft=null,width=items[active].width;
let viewport,toastTimer,before=[],after=[],nextId=1,pending=null,frame=0;
let open=false,rx=0,rz=0,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const atlas=new Map(),edits=new Map();
function readRegion(x,z){
  if(x===0&&z===0)return origin;
  const key=tileKey(x,z);
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
      mode='camera';
    }
  }
}catch{/* Keep the initial plot if storage is unavailable. */}
function rememberLocation(){
  if(linked)return;
  try{localStorage.setItem(ATLAS_KEY,JSON.stringify({open,x:rx,z:rz,motion}));}catch{/* Editing still works without storage. */}
}
const inBounds=(x,z,margin=0)=>open?tileInside(x,z,margin):inside(x,z,margin);
const optionButtons=(key,values)=>values.map((v)=>`<button class="option" type="button" data-world="${key}" data-value="${v}" aria-pressed="${world[key]===v}">${labels[v]}</button>`).join('');

document.querySelector('#app').innerHTML=`
<header class="topbar"><div class="top-inner">
  <div class="brand"><img src="/mark.svg" alt=""><div><b>林栖</b><small>LINQI / SANDBOX</small></div></div>
  <div class="top-actions">
    <span class="save-state" id="save-state"><span class="dot"></span><span id="save-label">本地存档</span></span>
    <button type="button" class="btn map-btn" id="map-mode" aria-pressed="false">${icon('map',16)}<span id="map-label">拓展地图</span></button>
    <button type="button" class="btn" id="share" aria-label="复制设计链接" title="复制设计链接">${icon('link',16)}<span class="share-text">分享</span></button>
    <button type="button" class="btn primary" id="snapshot">${icon('camera',16)}拍照</button>
  </div>
</div></header>
<main class="workspace">
  <div class="intro">
    <div><div class="eyebrow">${icon('pine',15)} THE SANDBOX / 自由建造</div>
    <h1>造一座自己的林间小世界。</h1>
    <p>在沙盘上拖出房屋，画一条溪流，再沿水边种满花草。</p></div>
    <div class="preset-select"><label for="theme">${icon('layers',16)} 场景预设</label>
      <select id="theme" aria-label="场景预设">${Object.entries(themes).map(([k,v])=>`<option value="${k}">${v.label} · ${v.description}</option>`).join('')}</select>
      <button class="btn" type="button" id="load-theme">载入</button>
    </div>
  </div>
  <div class="studio">
    <section class="viewer" aria-label="自由建造沙盘">
      <div class="viewbar">
        <div class="view-label">${icon('cube',16)} <span id="plot-title"></span><small>LIVE DIORAMA</small></div>
        <span class="seed-tag" id="seed-tag"></span>
      </div>
      <div class="stage" id="stage" tabindex="-1">
        <div class="stage-head"><span class="badge" id="mode-tag"></span><span class="badge" id="weather-tag"></span></div>
        <div class="atlas-controls" id="atlas-controls" hidden>
          <div class="atlas-coord badge" id="atlas-coord"></div>
          <div class="compass" role="group" aria-label="前往相邻区域">
            <button class="btn compass-n" type="button" data-move="0,-1" aria-label="向北拓展" title="向北拓展">↑</button>
            <button class="btn compass-w" type="button" data-move="-1,0" aria-label="向西拓展" title="向西拓展">←</button>
            <button class="btn compass-home" id="atlas-home" type="button" aria-label="回到起点" title="回到起点">${icon('cabin',14)}</button>
            <button class="btn compass-e" type="button" data-move="1,0" aria-label="向东拓展" title="向东拓展">→</button>
            <button class="btn compass-s" type="button" data-move="0,1" aria-label="向南拓展" title="向南拓展">↓</button>
          </div>
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
      <div class="viewfoot">
        <span class="hints">${icon('mouse',13)} <span id="tool-tip"></span></span><span class="metrics" id="metrics"></span>
      </div>
    </section>
    <aside class="panel" aria-label="建造图鉴">
      <div class="panel-head"><span class="stamp">${icon('layers',19)}</span><div><h2>建造图鉴</h2><small>BUILDING LIBRARY</small></div><span class="panel-count" id="panel-count"></span></div>
      <div class="catalog-tabs" id="categories" role="group" aria-label="预设分类">
        ${Object.entries(catalog).map(([key,value])=>`<button class="option" type="button" data-category="${key}" aria-pressed="${key===category}">${icon(value.icon,15)}${value.name}</button>`).join('')}
      </div>
      <div id="catalog" class="catalog-grid"></div>
      <div id="inspector" class="inspector"></div>
      <section class="biome-panel" aria-label="生态群落">
        <div class="biome-mark">${icon('pine',17)}</div>
        <div class="biome-copy"><strong id="biome-name"></strong><small id="biome-detail"></small></div>
        <button class="chip" type="button" id="motion" aria-pressed="true">动态</button>
      </section>
      <section class="environment" aria-label="季节与光照">
        <div><span>${icon('tree',15)}季节</span><div class="segment">${optionButtons('season',['summer','autumn','winter'])}</div></div>
        <div><span>${icon('sun',15)}光照</span><div class="segment">${optionButtons('light',['day','gold','night'])}</div></div>
      </section>
    </aside>
  </div>
  <footer class="footer"><span>LINQI STUDIO / FIELD NOTES</span><span id="world-count"></span></footer>
</main>
<div role="status" id="toast"></div>`;

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
  if(mode!=='build') {
    if(mode==='camera'&&open)return matchMedia('(pointer: coarse)').matches?'拖动前往相邻领地，双指旋转或缩放。':'拖动前往相邻领地，右键拖动旋转，滚轮缩放。';
    return help[mode];
  }
  const o=items[active];
  if(o.category==='house') return '在地面拖出轮廓生成建筑，也可单击放置。';
  if(o.brush) return '在地面按住拖画，单击可以盖一个圆形笔印。';
  return '点击地面放置景观，切换到「选择」可以搬动。';
}
function showMode(){
  for(const key of Object.keys(toolLabels)) byId('mode-'+key).setAttribute('aria-pressed',key===mode);
  byId('mode-tag').textContent=mode==='build' ? '建造 / '+items[active].name : toolLabels[mode];
  byId('tool-tip').textContent=toolTip();
  stage.dataset.mode=mode;
  viewport?.cameraMode(mode==='camera');
  viewport?.showFootprint(mode==='select' ? selectedObject() : null,true,true);
}
function renderCatalog(){
  const values=catalog[category].items;
  for(const b of byId('categories').children) b.setAttribute('aria-pressed',b.dataset.category===category);
  byId('panel-count').textContent=String(values.length).padStart(2,'0')+' 款';
  byId('catalog').innerHTML=values.map(([id])=>{
    const o=items[id];
    return `<button type="button" class="preset-card" data-item="${id}" aria-pressed="${active===id && mode==='build'}"><span class="preview-icon" style="--card-tint:${o.color}">${thumbnail(o)}</span><span class="preset-copy"><strong>${o.name}</strong><small>${o.detail}</small></span></button>`;
  }).join('');
}
function objectRange(key,value,min,max,title,unit){
  return `<label class="range"><span>${title}</span><input type="range" data-size="${key}" min="${min}" max="${max}" step=".1" value="${value}"><output>${Number(value).toFixed(1)} ${unit}</output></label>`;
}
function renderInspector(){
  const o=selectedObject();
  if(mode==='select'&&o){
    const house=items[o.type].category==='house';
    const original=['cedar','alpine','shed'].includes(o.type);
    inspector.innerHTML=`<div class="inspector-head"><strong>${items[o.type].name}</strong><span>已选中</span></div>
      <div class="ranges">${house ? objectRange('w',o.w,2.4,8,'面宽','m')+objectRange('d',o.d,2.2,7,'进深','m') : objectRange('w',o.w,.35,3,'大小','m')}</div>
      ${original?`<div class="object-options"><select data-material aria-label="木材"><option value="cedar">暖雪松</option><option value="dark">炭化木</option><option value="pale">浅白橡</option></select><button class="chip" type="button" data-module="deck" aria-pressed="${o.deck!==false}">前廊</button><button class="chip" type="button" data-module="chimney" aria-pressed="${o.chimney!==false}">烟囱</button></div>`:''}
      <div class="object-actions"><button class="btn" id="rotate" type="button">${icon('reset',14)} 旋转 45°</button><button class="btn delete" id="delete" type="button">${icon('trash',14)} 删除</button></div>`;
    if(original) inspector.querySelector('[data-material]').value=o.wood??'cedar';
    return;
  }
  if(mode==='build'&&items[active].brush){
    inspector.innerHTML=`<div class="inspector-head"><strong>${items[active].name}</strong><span>拖动绘制</span></div>${objectRange('brush',width,.55,7,'笔宽','m')}`;
    return;
  }
  inspector.innerHTML=`<div class="inspector-head"><strong>${mode==='build' ? items[active].name : toolLabels[mode]}</strong><span>${mode==='build' ? '已装备' : '当前工具'}</span></div><p>${toolTip()}</p>`;
}
function save(){
  try{
    if(open&&(rx!==0||rz!==0)){
      const key=tileKey(rx,rz);
      atlas.set(key,world);
      localStorage.setItem(ATLAS_KEY+'/'+key,JSON.stringify(world));
    }else{
      origin=world;
      localStorage.setItem(STORE_KEY,JSON.stringify(world));
    }
    byId('save-label').textContent='已存本机';
    if(linked){
      const local=new URL(location.href);
      local.search='';
      window.history.replaceState(null,'',local);
      linked=false;
    }
    rememberLocation();
  }catch{byId('save-label').textContent='存档不可用';}
}
function sync(){
  nextId=Math.max(0,...world.objects.map(o=>o.id),...world.strokes.map(o=>o.id))+1;
  const biome=biomes[biomeOf(world)];
  byId('plot-title').textContent=open&&(rx||rz)?biome.label:themes[world.theme].label;
  byId('biome-name').textContent=biome.label;
  byId('biome-detail').textContent=biome.detail;
  byId('atlas-controls').hidden=!open;
  byId('atlas-coord').textContent=`X ${rx} / Z ${rz}`;
  byId('map-mode').setAttribute('aria-pressed',open);
  byId('map-label').textContent=open?'回到沙盘':'拓展地图';
  byId('motion').setAttribute('aria-pressed',motion);
  byId('motion').textContent=motion?'动态开':'动态关';
  stage.classList.toggle('open-land',open);
  stage.classList.toggle('still',!motion);
  byId('theme').value=world.theme;
  byId('weather-tag').textContent=labels[world.season]+' / '+labels[world.light];
  byId('seed-tag').textContent='SEED '+world.seed;
  byId('world-count').textContent=`${world.objects.length} 个物件 · ${world.strokes.length} 道笔迹`;
  byId('undo').disabled=before.length===0;
  byId('redo').disabled=after.length===0;
  for(const b of document.querySelectorAll('[data-world]')) b.setAttribute('aria-pressed',world[b.dataset.world]===b.dataset.value);
  viewport?.update(world,open?{x:rx,z:rz,read:readRegion}:null);
  showMode();
  renderInspector();
}
function commit(next){
  before.push(world);
  if(before.length>42) before.shift();
  after=[];
  world=next;
  syncRegionData();
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
  const stack=redo?after:before;
  if(!stack.length) return;
  cancelDraft();
  (redo?before:after).push(world);
  world=stack.pop();
  selected=null;
  syncRegionData();
  save();
  sync();
  announce(redo?'已重做':'已撤销');
}
function syncRegionData(){
  if(!open||(!rx&&!rz))origin=world;
  else atlas.set(tileKey(rx,rz),world);
}
function stashHistory(){
  if(!before.length&&!after.length)return;
  edits.set(tileKey(rx,rz),{before,after});
  if(edits.size>32)edits.delete(edits.keys().next().value);
}
function restoreHistory(){
  const history=edits.get(tileKey(rx,rz));
  before=history?.before??[];
  after=history?.after??[];
}
function travel(dx,dz,follow=false){
  if(!open||(!dx&&!dz)||!Number.isSafeInteger(rx+dx)||!Number.isSafeInteger(rz+dz))return;
  cancelDraft();
  stashHistory();
  selected=null;
  rx+=dx;rz+=dz;
  world=readRegion(rx,rz);
  restoreHistory();
  if(follow)viewport.shiftRegion(dx,dz);
  sync();
  if(!follow)viewport?.reset();
  rememberLocation();
  announce(`${biomes[biomeOf(world)].label} · ${rx}, ${rz}`);
}
function toggleMap(){
  cancelDraft();
  stashHistory();
  selected=null;
  open=!open;
  rx=rz=0;
  world=origin;
  restoreHistory();
  mode=open?'camera':'build';
  sync();
  renderCatalog();
  viewport?.reset();
  rememberLocation();
  announce(open?'拖动地图或使用方向键，前往相邻领地':'已回到起点沙盘');
}
function switchMode(next){
  cancelDraft();
  mode=next;
  showMode();
  renderCatalog();
  renderInspector();
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
  const house=isHouse(o);
  if(!footprint(o,house?.23:.04).every(([x,z])=>inBounds(x,z,.15)&&viewport.depth(x,z)<.61)) return false;
  if(viewport.depth(o.x,o.z)>.52) return false;
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
  commit({...world,objects:world.objects.map(o=>o.id===next.id?next:o)});
}
function removeObject(id){
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
  for(let i=1;i<=count;i++) points.push([round(x+(p.x-x)*i/count),round(z+(p.z-z)*i/count)]);
}
function down(p){
  if(!p) return;
  if(open&&!inBounds(p.x,p.z,.08)){
    announce('请先漫游到这片领地，再编辑它');
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
    viewport.showFootprint(o,true,true);
    if(o) draft={kind:'move',start:p,object:o};
    return;
  }
  if(!inBounds(p.x,p.z,.11)) return;
  const def=items[active];
  if(def.brush){
    if(world.strokes.length>=MAX_STROKES){announce('已达到此沙盘的笔迹上限');return;}
    draft={kind:'brush',stroke:{id:nextId,type:active,w:width,p:[[round(p.x),round(p.z)]]}};
    viewport.showStroke(draft.stroke);
  }else{
    if(world.objects.length>=MAX_OBJECTS){announce('已达到此沙盘的物件上限');return;}
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
    commit({...world,strokes:[...world.strokes,current.stroke]});
    return;
  }
  const o=p&&(current.kind!=='move'||Math.hypot(p.x-current.start.x,p.z-current.start.z)>.13)?dragShape(p):current.object;
  cancelDraft();
  if(current.kind==='create'){
    if(!validObject(o)){announce('请换一处干燥、宽敞的地面');return;}
    commit({...world,objects:[...world.objects,o]});
    announce(items[o.type].name+'已建好');
  } else if(JSON.stringify(o)!==JSON.stringify(current.object)) updateObject(o);
}
function hover(p){
  if(mode==='camera'||mode==='select'){viewport.cursor(null);return;}
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

try{viewport=createViewport(stage,text=>{byId('metrics').textContent=text;},onInput,travel);}
catch(error){
  console.error(error);
  stage.insertAdjacentHTML('afterbegin','<div class="render-error">当前浏览器无法启动 WebGL 2。<br>请使用启用硬件加速的浏览器打开沙盘。</div>');
  byId('snapshot').disabled=true;
}
sync();
viewport?.motion(motion);
if(linked)byId('save-label').textContent='链接场景';
else byId('save-label').textContent='本地自动存档';
renderCatalog();

for(const key of Object.keys(toolLabels)) byId('mode-'+key).addEventListener('click',()=>switchMode(key));
byId('categories').addEventListener('click',e=>{
  const target=e.target.closest('[data-category]');
  if(!target) return;
  category=target.dataset.category;
  renderCatalog();
  byId('catalog').scrollTop=0;
});
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
    if(!isHouse(o))next.d=value;
    viewport.showObject(next,o.id,validObject(next));
  }
});
inspector.addEventListener('change',e=>{
  const o=selectedObject();
  if(!o||!viewport)return;
  const key=e.target.dataset.size;
  if(key&&key!=='brush'){
    const value=e.target.valueAsNumber,next={...o,[key]:value};
    if(!isHouse(o))next.d=value;
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
byId('load-theme').addEventListener('click',()=>{
  cancelDraft();
  selected=null;
  const name=byId('theme').value;
  commit(preset(name));
  viewport?.reset();
  announce(`已载入${themes[name].label}，可撤销`);
});
byId('map-mode').addEventListener('click',toggleMap);
byId('atlas-controls').addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!button)return;
  if(button.id==='atlas-home')travel(-rx,-rz);
  else if(button.dataset.move)travel(...button.dataset.move.split(',').map(Number));
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
byId('reset').addEventListener('click',()=>{cancelDraft();viewport?.reset();});
byId('top').addEventListener('click',()=>{cancelDraft();viewport?.reset(true);});
byId('expand').addEventListener('click',async()=>{
  if(stage.classList.contains('maximized')) stage.classList.remove('maximized');
  else if(document.fullscreenElement===stage) await document.exitFullscreen();
  else {try{await stage.requestFullscreen();}catch{stage.classList.add('maximized');stage.focus();}}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    cancelDraft();
    stage.classList.remove('maximized');
    return;
  }
  if(e.target.matches('input,textarea,select'))return;
  const key=e.key.toLowerCase();
  if((e.metaKey||e.ctrlKey)&&['z','y'].includes(key)){e.preventDefault();history(e.shiftKey||key==='y');return;}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const direction={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[key];
  if(open&&mode==='camera'&&direction){e.preventDefault();travel(...direction);return;}
  const next={v:'select',b:'build',x:'erase',c:'camera'}[key];
  if(next)switchMode(next);
  if(['delete','backspace'].includes(key)&&mode==='select'&&selected!==null){e.preventDefault();removeObject(selected);}
});
byId('share').addEventListener('click',async()=>{
  const href=worldLink(world);
  try{await navigator.clipboard.writeText(href);announce(open?'已复制当前领地链接':'设计链接已复制');}
  catch{window.prompt('复制设计链接',href);}
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
