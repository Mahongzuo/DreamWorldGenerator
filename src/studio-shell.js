import {icon} from './icons.js';

const action=(id,symbol,label,attributes='')=>`<button class="action" id="${id}" type="button" aria-label="${label}" title="${label}" ${attributes}>${icon(symbol)}<span>${label}</span></button>`;
const close=id=>`<button class="icon-btn close-btn" type="button" ${id?`id="${id}"`:''} data-close aria-label="关闭" title="关闭">${icon('close',17)}</button>`;
const dialogTitle=(title,id)=>`<div class="dialog-title"><h2>${title}</h2>${close(id)}</div>`;
const options=entries=>Object.entries(entries).map(([value,name])=>`<option value="${value}">${name}</option>`).join('');

export function studioMarkup({views,sceneDesigns,themes,soundtracks,seasonOptions,lightOptions}){
  return `<header class="appbar">
    <h1 class="brand"><img src="/mark.svg" alt=""><span>林栖</span></h1>
    <nav class="view-switch" aria-label="操作方式">${action('edit-view','brush','建造')}${action('explore','walk','漫步')}</nav>
    <div class="app-actions"><span id="save-state" class="save-state"><i></i><span id="save-label">本机存档</span></span>
      ${action('scene-open','landscape','场景')}${action('journal-open','book','手记')}${action('settings-open','settings','设置')}
    </div>
  </header>
  <main class="workspace" id="workspace">
    <aside id="library" class="library" aria-label="建造素材库">
      <div class="library-heading"><div><h2>建造素材库</h2><span id="panel-count"></span></div><button class="icon-btn" type="button" id="collapse-library" aria-label="收起素材库" title="收起素材库">${icon('panel')}</button></div>
      <div class="catalog-tabs" id="categories" role="group" aria-label="素材分类">${Object.entries(views).map(([key,v])=>`<button type="button" data-category="${key}" class="category" aria-pressed="false">${icon(v.icon,17)}<span>${v.name}</span></button>`).join('')}</div>
      <div class="catalog-filters"><label class="search-field">${icon('search',16)}<input type="search" id="catalog-search" aria-label="搜索当前分类素材" placeholder="搜索名称或特征"></label><select id="catalog-filter" aria-label="筛选类型"></select></div>
      <div id="catalog" class="catalog-grid" aria-label="素材列表"></div>
    </aside>
    <section class="viewer" aria-label="世界">
      <div id="stage" class="stage" tabindex="-1">
        <div class="world-heading"><div class="plot-heading"><span class="world-mark">${icon('landscape',21)}</span><div><h2 id="plot-title"></h2><small id="weather-tag"></small></div></div></div>
        <div class="world-actions">${action('habitat-open','grass','附近栖地')}<button id="map-mode" class="action" type="button" aria-pressed="false">${icon('map')}<span id="map-label">扩建领地</span></button></div>

        <div class="spawn-hint" id="spawn-hint" hidden><strong>点一处干地开始漫步</strong><button type="button" class="btn primary" id="quick-spawn">从步道出发</button></div>
        <div class="walker-hud" id="walker-hud" hidden>
          <div class="walk-messages"><article class="walk-note" id="walk-note" hidden><strong></strong><p></p></article><div id="combat-note" role="status"></div></div>
          <div class="walk-status"><span id="nearby"></span><span id="wood-count"></span></div>
          <div class="walk-actions"><button type="button" id="observe">${icon('book',15)}观察 <kbd>E</kbd></button><button type="button" id="chop">${icon('axe',15)}伐木 <kbd>F</kbd></button><button type="button" id="mine"><span>挖土</span> <kbd>G</kbd></button><button type="button" id="attack" hidden>攻击 <kbd>J</kbd></button><button type="button" id="start-challenge" hidden>开启遗迹挑战</button><button type="button" id="respawn" hidden>营地复活 <kbd>R</kbd></button></div>
          <div class="joystick" id="joystick" role="group" aria-label="移动摇杆"><span id="joystick-knob"></span></div>
          <div class="locomotion-actions"><button type="button" id="jump"><span>跳跃</span> <kbd>Space</kbd></button><button type="button" id="sprint" aria-pressed="false">冲刺 <kbd>Shift</kbd></button><button type="button" id="recenter-camera" aria-label="镜头回正" title="镜头回正 · Q">${icon('orbit',18)}</button></div>
        </div>
        <div class="stage-tools" aria-label="镜头">${action('top','grid','俯视')}${action('reset','reset','回正')}${action('expand','expand','全屏')}</div>
        <section class="properties" id="properties" aria-label="选中物件属性" hidden><div class="inset-title"><strong>物件属性</strong><button type="button" id="close-properties" class="icon-btn" title="收起属性" aria-label="收起属性">${icon('close',15)}</button></div><div id="inspector"></div></section>
      </div>
      <div class="buildbar" id="buildbar">
        <div class="gear-row"><button id="library-open" class="action" type="button" aria-controls="library" aria-expanded="false">${icon('layers',19)}<span>素材库</span></button><div class="equipped"><span class="equipped-art" id="equipped-art"></span><div><strong id="equipped-name"></strong><small id="placement-meta"></small></div></div>
          <div class="recent-rack" id="recent-rack"><button type="button" id="recent-toggle" class="action" aria-label="最近使用" aria-expanded="false" aria-controls="recent-items" title="最近使用">${icon('history',17)}<span>最近</span></button><div class="recents" id="recent-items" role="group" aria-label="最近使用"></div></div>
          <div class="placement"><button type="button" class="action" id="rotate-tool" title="旋转 45° · R" aria-label="旋转 45 度">${icon('rotate',17)}<span>旋转</span></button><button type="button" class="action" id="continuous-tool" title="连续放置" aria-pressed="true">${icon('repeat',17)}<span>连续</span></button><button type="button" class="action" id="properties-open" title="物件属性" hidden>${icon('settings',17)}属性</button></div>
        </div>
        <div class="tool-row"><div class="mode-buttons" role="group" aria-label="建造工具">${action('mode-build','brush','放置')}${action('mode-select','pointer','选择')}${action('mode-erase','eraser','擦除')}${action('mode-camera','orbit','镜头')}</div><div class="brush-setting" hidden><label>笔宽 <input id="brush-width" type="range" min="0.55" max="7" step="0.05" value="1"><output id="brush-value"></output></label></div><div class="history-buttons">${action('undo','undo','撤销')}${action('redo','redo','重做')}</div></div>
      </div>
      <div class="statusbar"><span id="mode-tag"></span><span id="tool-tip"></span><span id="locomotion" aria-live="off"></span></div>
    </section>
  </main>
  <dialog id="scene-dialog">${dialogTitle('场景与领地')}
    <section class="dialog-section"><h3>生成到相邻领地</h3><label>完整场景<select id="theme">${Object.entries(sceneDesigns).map(([k,v])=>`<option value="scene:${k}">${v.name}</option>`).join('')}</select></label><div class="scene-summary" id="scene-summary"></div>
      <details class="fold"><summary>大小、密度与布局</summary><div class="scene-controls form-grid" id="scene-controls">
        <label id="layout-field">水乡布局<select id="scene-layout"><option value="auto">随种子变化</option><option value="canal">沿河水巷</option><option value="court">围池庭院</option></select></label><label>场景宽度<select id="scene-width">${options({1:'30 米 · 1 块',2:'60 米 · 2 块',3:'90 米 · 3 块'})}</select></label><label>场景纵深<select id="scene-height">${options({1:'23 米 · 1 块',2:'46 米 · 2 块',3:'68 米 · 3 块'})}</select></label><label>建筑密度<select id="scene-density"><option value=".5">疏朗</option><option value="1" selected>适中</option><option value="1.5">紧凑</option></select></label><label>每块植物数<input type="number" id="scene-plants" min="0" max="36" value="12"></label>
        <label>布局种子<input id="scene-seed" maxlength="14"></label><button type="button" class="btn" id="scene-reroll">换个布局</button><label class="check-line"><input type="checkbox" id="seed-lock">固定种子</label></div></details>
      <p id="append-policy" class="policy"></p><button class="btn primary" type="button" id="load-theme">追加场景</button><small id="last-generation"></small>
    </section>
    <section class="dialog-section"><h3>领地地图</h3><p id="territory-status"></p><p id="territory-hint"></p><div class="atlas-controls" id="atlas-controls" hidden><div id="atlas-coord"></div><div class="compass" role="group" aria-label="相邻领地"><button type="button" class="compass-n" data-move="0,-1" aria-label="北边领地">↑</button><button type="button" class="compass-w" data-move="-1,0" aria-label="西边领地">←</button><button type="button" class="compass-home" id="atlas-home" aria-label="起点">${icon('cabin',14)}</button><button type="button" class="compass-e" data-move="1,0" aria-label="东边领地">→</button><button type="button" class="compass-s" data-move="0,1" aria-label="南边领地">↓</button></div></div><div class="inline-actions"><button class="btn" type="button" id="open-territory">选择扩建方向</button><label id="territory-picker" hidden>定位视野<select id="territory-select"></select></label></div></section>
    <details class="fold replace-fold"><summary>替换当前地块</summary><div class="dialog-section"><label>基础沙盘<select id="base-theme">${Object.entries(themes).filter(([k])=>k!=='coast').map(([k,v])=>`<option value="${k}">${v.label} · ${v.description}</option>`).join('')}</select></label><p id="replace-policy" class="policy"></p><button type="button" id="replace-theme" class="btn">替换当前地块</button></div></details>
  </dialog>
  <dialog id="journal-dialog">${dialogTitle('田野手记','journal-close')}<section class="dialog-section" id="habitat-panel"></section><section class="dialog-section"><h3>观察图鉴 <span id="journal-count"></span></h3><div id="journal-meta"></div><div id="guide-card"></div><div id="journal-list"></div></section></dialog>
  <dialog id="settings-dialog">${dialogTitle('营地与设置')}
    <section class="dialog-section"><h3>营地</h3><label>玩法规则<select id="game-mode"><option value="creative">创造 · 自由建造</option><option value="adventure">冒险 · 采集与战斗</option></select></label><p id="game-stats"></p><div id="adventure-tools" hidden><p id="game-quest"></p><button class="btn" id="camp-revive" type="button" hidden>返回营地复活 · 损失 20% 木石</button><div class="craft-row"><button class="btn" id="craft-sword" type="button">石刃剑 · 4 木 / 5 石</button><button class="btn" id="craft-pickaxe" type="button">石镐 · 5 木 / 3 石</button><button class="btn" id="craft-heal" type="button">补给 +40 HP · 3 木 / 1 石</button></div></div></section>
    <details class="fold"><summary>环境与声音</summary><div class="dialog-section"><div class="environment"><div><span>季节</span><div class="segment">${seasonOptions}</div></div><div><span>光照</span><div class="segment">${lightOptions}</div></div></div><div class="inline-actions"><button class="btn" type="button" id="audio-toggle" aria-pressed="false">开启声音</button><span id="audio-status" role="status">声音已关闭</span></div><div class="form-grid"><label>背景音乐<select id="audio-track"><option value="auto">随场景切换</option>${options(soundtracks)}<option value="none">关闭配乐</option></select></label>${[['music','配乐音量'],['ambient','环境音量'],['effects','音效音量']].map(([key,name])=>`<label>${name}<input id="audio-${key}" type="range" min="0" max="100" step="1"></label>`).join('')}</div></div></details>
    <details class="fold"><summary>画质与世界信息</summary><div class="dialog-section"><label>画质<select id="quality">${options({auto:'自动适配',low:'省电 · 无阴影',balanced:'均衡 · 柔和阴影',high:'精细 · 高清阴影'})}</select></label><a class="performance-link" href="./performance.html" target="_blank" rel="noopener">设备性能实测 ↗</a><button class="btn" type="button" id="motion" aria-pressed="true">世界动态</button><p><strong id="biome-name"></strong> · <span id="biome-detail"></span></p><p><span id="seed-tag"></span> · <span id="world-count"></span> · <span id="metrics"></span></p></div></details>
    <section class="dialog-section"><h3>存档与照片</h3><div class="inline-actions">${action('share','link','导出 / 分享')}${action('import-world','map','导入领地')}${action('snapshot','camera','拍照')}${action('relocate','pin','重放探访者','hidden')}</div><input type="file" id="import-file" accept="application/json,.json" hidden></section>
  </dialog><div role="status" id="toast"></div>`;
}
