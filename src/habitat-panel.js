import {normalizeShore,shoreSpecies,shoreRegion} from './habitat-progress.js';
import './habitat.css';

const needs={
  frog:['浅水','芦苇或香蒲','安全岸地'],
  kingfisher:['开阔水面','低枝或有倒木的浅滩石岸']
};

export function createHabitatPanel(host,save,getGame) {
  let report=null,snapshot='';
  function render(game=getGame()) {
    if(!host||!game)return;
    const shore=game.shore??normalizeShore(),species=new Set(shore.visits.map(v=>v.type));
    const key=JSON.stringify([report,shore]);
    if(key===snapshot)return;
    snapshot=key;
    const status={here:'来客已抵达',waiting:'等待安全落点',missing:'尚缺条件',blocked:'枝旁空间被占用'};
    const intro=shore.skipped?'已收起水岸任务。栖地仍会吸引野生来客。':species.size===2?'水岸游记已收录两种来客。':'在岸边营造栖地，漫步靠近野生来客并观察。';
    const cards=Object.entries(needs).map(([type,labels])=>{
      const row=report?.[type];
      return '<div class="shore-species"><header><strong>'+shoreSpecies[type]+'</strong><small>'+ (row?status[row.state]:'查看附近水岸')+'</small></header><div class="shore-conditions">'+
        labels.map((label,i)=>'<span data-met="'+!!row?.checks[i]+'">'+(row?.checks[i]?'✓ ':'○ ')+label+'</span>').join('')+'</div></div>';
    }).join('');
    const notes=shore.visits.slice(-12).reverse().map(note=>
      '<li><strong>'+shoreSpecies[note.type]+'</strong><span>地块 '+shoreRegion(note.x,note.z)+' · 岸边 ('+note.x.toFixed(1)+', '+note.z.toFixed(1)+')</span></li>').join('');
    const holding=report?.heldResidents?'<p class="shore-held">有 '+report.heldResidents+' 只已放置的动物在等待合适的活动空间。保留水面或腾出岸地后，它们会回来。</p>':'';
    host.innerHTML='<div class="shore-heading"><h3>水岸来客</h3><button type="button" class="chip" data-shore-toggle>'+ (shore.skipped?'继续任务':'跳过任务')+'</button></div><p class="shore-intro">'+intro+'</p>'+
      (!shore.skipped?'<div class="shore-cards">'+cards+'</div>':'')+holding+
      '<div class="shore-notes"><h4>本世界游记 <span>'+species.size+' / 2</span></h4>'+ (notes?'<ul>'+notes+'</ul>':'<p>在漫步中观察第一位水岸来客后，这里会记下物种和地点。</p>')+'</div>';
  }
  host?.addEventListener('click',e=>{
    if(!e.target.closest('[data-shore-toggle]'))return;
    const game=getGame(),shore=game.shore??normalizeShore();
    save({...game,shore:{...shore,skipped:!shore.skipped}});
    render();
  });
  return {update(next){report=next;render();},setGame:render};
}
