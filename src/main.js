import './style.css';
import {icon} from './icons.js';
import {defaultState, inCampArea} from './model.js';
import {createViewport} from './viewport.js';

const layouts = {
  roof: [['gable', '双坡木屋', 'cabin'], ['alpine', 'A 字木屋', 'alpine'], ['shed', '单坡木屋', 'shed']],
  wood: [['cedar', '暖雪松', '#b77949'], ['dark', '炭化木', '#4f544b'], ['pale', '浅白橡', '#c6a77f']],
  season: [['summer', '常青'], ['autumn', '秋林'], ['winter', '初雪']],
  light: [['day', '白昼', 'sun'], ['gold', '金暮', 'sunset'], ['night', '月夜', 'moon']]
};
const ranges = {
  width: {title: '面宽', min: 4.4, max: 7.2, step: .1, format: (v) => `${Number(v).toFixed(1)} m`},
  depth: {title: '进深', min: 3.6, max: 6.0, step: .1, format: (v) => `${Number(v).toFixed(1)} m`},
  trees: {title: '密度', min: 10, max: 100, step: 1, format: (v) => `${v}%`}
};
const modules = {deck: '前廊', chimney: '烟囱', fire: '篝火'};
const query = new URL(location.href).searchParams;
const seedOf = (value) => value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 18);
const state = {...defaultState};
for (const [key, choices] of Object.entries(layouts)) {
  if (choices.some(([value]) => query.get(key) === value)) state[key] = query.get(key);
}
for (const [key, {min, max, step}] of Object.entries(ranges)) {
  const raw = query.get(key);
  const value = Number(raw);
  if (raw !== null && raw.trim() && Number.isFinite(value)) {
    state[key] = Math.max(min, Math.min(max, +(Math.round(value / step) * step).toFixed(1)));
  }
}
for (const key of Object.keys(modules)) {
  if (['0', '1'].includes(query.get(key))) state[key] = query.get(key) === '1';
}
const savedX = Number(query.get('fireX') ?? defaultState.fireX);
const savedZ = Number(query.get('fireZ') ?? defaultState.fireZ);
if (inCampArea(savedX, savedZ)) {
  state.fireX = savedX;
  state.fireZ = savedZ;
}
if (query.has('seed')) state.seed = seedOf(query.get('seed')) || defaultState.seed;

const optionRow = (key) => `<div class="segment ${key}" role="group" aria-label="${{roof:'屋型',wood:'外墙木材',season:'季节',light:'光照'}[key]}">
  ${layouts[key].map(([value, label, visual]) => `<button type="button" class="option" data-key="${key}" data-value="${value}" aria-pressed="${state[key] === value}">
    ${key === 'wood' ? `<span class="swatch" style="--swatch:${visual}"></span>` : visual ? icon(visual, 15) : ''}<span>${label}</span>
  </button>`).join('')}</div>`;
const range = (key) => {
  const {title, min, max, step, format} = ranges[key];
  return `<label class="range" for="${key}"><span>${title}</span><input type="range" id="${key}" min="${min}" max="${max}" step="${step}" value="${state[key]}"><output for="${key}">${format(state[key])}</output></label>`;
};
const toolbarButton = (id, image, title, pressed = false) =>
  `<button type="button" id="${id}" class="btn" aria-label="${title}" title="${title}"${pressed ? ' aria-pressed="false"' : ''}>${icon(image, 16)}</button>`;

document.querySelector('#app').innerHTML = `
<header class="topbar"><div class="top-inner">
  <div class="brand"><img src="/mark.svg" alt=""><div><b>林栖</b><small>FOREST CABIN STUDIO</small></div></div>
  <div class="top-actions">
    <button type="button" class="btn" id="share" title="复制设计链接" aria-label="复制设计链接">${icon('link', 15)}<span class="share-text">分享设计</span></button>
    <button type="button" class="btn primary" id="snapshot">${icon('camera', 16)}导出图片</button>
  </div>
</div></header>
<main class="workspace">
  <div class="intro">
    <div><div class="eyebrow">${icon('pine', 15)} FIELD STUDIO / 01</div>
    <h1>在森林里，造一座小屋。</h1>
    <p>调整屋型、搭建前廊，或换一片树林。在自己的林地里慢慢试。</p></div>
    <span class="live"><span class="dot"></span>实时渲染</span>
  </div>
  <div class="studio">
    <section class="viewer" aria-label="场景预览">
      <div class="viewbar"><div class="view-label">${icon('cube', 16)} 场景预览 <small>SCENE VIEW</small></div><span class="seed-tag" id="seed-tag"></span></div>
      <div class="stage" id="stage" tabindex="-1">
        <div class="stage-head"><span class="badge">ORTHO / 3D</span><span class="badge" id="weather-tag"></span></div>
        <span class="badge placement-tip" hidden>点击小屋前方的空地放置篝火</span>
        <div class="stage-tools">
          ${toolbarButton('place','pin','布置篝火',true)}
          ${toolbarButton('orbit','orbit','自动环绕',true)}
          ${toolbarButton('reset','reset','重置视角')}
          ${toolbarButton('expand','expand','全屏预览',true)}
        </div>
      </div>
      <div class="viewfoot">
        <span class="hints">${icon('mouse', 13)} 拖动旋转 · 滚轮或捏合缩放</span><span class="metrics" id="metrics"></span>
      </div>
    </section>
    <aside class="panel" aria-label="建造工坊">
      <div class="panel-head"><span class="stamp">${icon('layers', 19)}</span><div><h2>建造工坊</h2><small>BUILDING WORKSHOP</small></div></div>
      <section class="section"><h3>${icon('cabin',15)} 结构 <span class="index">01</span></h3>
        ${optionRow('roof')}
        <div class="ranges">${range('width')}${range('depth')}</div>
        <div class="options-row" role="group" aria-label="附加模块">
          ${Object.entries(modules).map(([key, title]) => `<button class="chip" type="button" data-key="${key}" aria-pressed="${state[key]}">${title}</button>`).join('')}
        </div>
      </section>
      <section class="section"><h3>${icon('layers',15)} 木材 <span class="index">02</span></h3>${optionRow('wood')}</section>
      <section class="section"><h3>${icon('tree',15)} 林地 <span class="index">03</span></h3>
        ${optionRow('season')}
        <div class="ranges">${range('trees')}</div>
        <form class="seed-row" id="seed-form">
          <input type="text" id="seed" value="${state.seed}" maxlength="18" spellcheck="false" autocomplete="off" aria-label="林地种子" title="输入种子后按回车应用">
          <button class="btn" type="button" id="random" title="生成随机林地">${icon('dice',15)} 换林地</button>
        </form>
      </section>
      <section class="section"><h3>${icon('sun',15)} 光照 <span class="index">04</span></h3>${optionRow('light')}</section>
    </aside>
  </div>
  <footer class="footer"><span>LINQI STUDIO &nbsp;/&nbsp; PROCEDURAL CABIN BUILDER</span><span id="dimensions"></span></footer>
</main>
<div role="status" id="toast"></div>`;

const byId = (id) => document.getElementById(id);
const stage = byId('stage');
let viewport, frame, toastTimer, placing = false;
const announce = (text) => {
  const toast = byId('toast');
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
};
const labels = {summer:'常青',autumn:'秋林',winter:'初雪',day:'白昼',gold:'金暮',night:'月夜'};
function refresh() {
  byId('seed-tag').textContent = 'SEED ' + state.seed;
  byId('weather-tag').textContent = labels[state.season] + ' / ' + labels[state.light];
  byId('dimensions').textContent = `木屋占地 ${(state.width * state.depth).toFixed(1)} m²`;
  viewport?.update(state);
}
function queueRefresh() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    refresh();
  });
}
try {
  viewport = createViewport(stage, (metrics) => { byId('metrics').textContent = metrics; });
} catch (error) {
  console.error(error);
  stage.insertAdjacentHTML('afterbegin', '<div class="render-error">当前浏览器无法启动 WebGL 2。<br>请使用启用硬件加速的浏览器打开此设计。</div>');
  document.querySelector('.live').hidden = true;
  for (const id of ['snapshot', 'place', 'orbit', 'reset']) byId(id).disabled = true;
}
refresh();

document.querySelector('.panel').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-key]');
  if (!button) return;
  const {key, value} = button.dataset;
  if (key in modules) {
    if (key === 'fire' && placing) togglePlacement(false);
    state[key] = !state[key];
    button.setAttribute('aria-pressed', state[key]);
  } else {
    state[key] = value;
    for (const sibling of button.parentElement.children) sibling.setAttribute('aria-pressed', sibling === button);
  }
  queueRefresh();
});
for (const [key, {format}] of Object.entries(ranges)) {
  byId(key).addEventListener('input', (event) => {
    state[key] = event.target.valueAsNumber;
    event.target.nextElementSibling.value = format(state[key]);
    queueRefresh();
  });
}

const seed = byId('seed');
function applySeed() {
  seed.value = seedOf(seed.value) || state.seed;
  if (seed.value !== state.seed) {
    state.seed = seed.value;
    queueRefresh();
  }
}
byId('seed-form').addEventListener('submit', (event) => {
  event.preventDefault();
  applySeed();
});
seed.addEventListener('change', applySeed);
byId('random').addEventListener('click', () => {
  seed.value = 'PINE-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
  applySeed();
});
function togglePlacement(active) {
  placing = active;
  byId('place').setAttribute('aria-pressed', active);
  byId('place').title = active ? '取消布置' : '布置篝火';
  stage.querySelector('.placement-tip').hidden = !active;
  if (active) {
    byId('orbit').setAttribute('aria-pressed', 'false');
    viewport.orbit(false);
  }
  viewport.placement(active ? (site) => {
    if (!site?.valid) {
      announce('请选一块远离屋子、树林和小径的空地');
      return;
    }
    Object.assign(state, {fire: true, fireX: site.x, fireZ: site.z});
    document.querySelector('[data-key="fire"]').setAttribute('aria-pressed', 'true');
    togglePlacement(false);
    queueRefresh();
    announce('篝火位置已更新');
  } : null);
}
byId('place').addEventListener('click', () => togglePlacement(!placing));
byId('orbit').addEventListener('click', (event) => {
  if (placing) togglePlacement(false);
  const active = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', active);
  viewport.orbit(active);
});
byId('reset').addEventListener('click', () => {
  if (placing) togglePlacement(false);
  byId('orbit').setAttribute('aria-pressed', 'false');
  viewport.orbit(false);
  viewport.reset();
});
function syncFullscreen() {
  const open = document.fullscreenElement === stage || stage.classList.contains('maximized');
  byId('expand').setAttribute('aria-pressed', open);
  byId('expand').setAttribute('aria-label', open ? '退出全屏' : '全屏预览');
  byId('expand').title = open ? '退出全屏' : '全屏预览';
}
byId('expand').addEventListener('click', async () => {
  if (stage.classList.contains('maximized')) stage.classList.remove('maximized');
  else if (document.fullscreenElement === stage) await document.exitFullscreen();
  else {
    try { await stage.requestFullscreen(); }
    catch { stage.classList.add('maximized'); stage.focus(); }
  }
  syncFullscreen();
});
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && placing) togglePlacement(false);
  if (event.key === 'Escape' && stage.classList.contains('maximized')) {
    stage.classList.remove('maximized');
    syncFullscreen();
    byId('expand').focus();
  }
});

byId('share').addEventListener('click', async () => {
  applySeed();
  const url = new URL(location.href);
  url.search = '';
  for (const [key, value] of Object.entries(state)) {
    if (value !== defaultState[key]) url.searchParams.set(key, typeof value === 'boolean' ? Number(value) : value);
  }
  try {
    await navigator.clipboard.writeText(url.href);
    announce('设计链接已复制');
  } catch {
    window.prompt('复制此设计链接', url.href);
  }
});
byId('snapshot').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    applySeed();
    refresh();
    const blob = await viewport.snapshot();
    if (!blob) throw new Error('PNG encoding failed');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linqi-${state.seed.toLowerCase()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce('场景图片已导出');
  } catch {
    announce('图片导出失败，请重试');
  } finally {
    button.disabled = false;
  }
});
