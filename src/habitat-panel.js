import {normalizeShore,shoreSpecies,shoreRegion} from './habitat-progress.js';
import './habitat.css';

const chapters={
  garden:{name:'江南水岸',needs:{frog:['浅水','芦苇或香蒲','安全岸地'],kingfisher:['开阔水面','低枝或有倒木的浅滩石岸']}},
  village:{name:'欧式村庄',needs:{dipper:['水轮磨坊','流动水道','可停歇的溪岸'],'meadow-hare':['干草牧棚','草甸','林缘树木','可落脚草地']}},
  coast:{name:'热带海岸',needs:{'sea-gull':['灯塔','开阔水面','开阔岸地'],'shore-crab':['藤壶层礁','沙地','浅水岸线']}}
};

export function createHabitatPanel(host,save,getGame) {
  let report=null,snapshot='',chapter='garden',currentTheme;
  function render(game=getGame()) {
    if(!host||!game)return;
    const shore=game.shore??normalizeShore(),{needs,name}=chapters[chapter],types=Object.keys(needs);
    const entries=shore.visits.filter(note=>types.includes(note.type)),species=new Set(entries.map(note=>note.type));
    const key=JSON.stringify([chapter,report,shore]);
    if(key===snapshot)return;
    snapshot=key;
    const status={here:'来客已抵达',waiting:'等待安全落点',missing:'尚缺条件',blocked:'落点被占用'};
    const intro=shore.skipped?'任务已收起，栖地仍会吸引来客。':species.size===types.length?name+'的两种来客均已记入游记。':'在附近营造栖地，漫步靠近野生来客并观察。';
    const cards=Object.entries(needs).map(([type,labels])=>{
      const row=report?.[type];
      return '<div class="shore-species"><header><strong>'+shoreSpecies[type]+'</strong><small>'+ (row?status[row.state]:'查看附近栖地')+'</small></header><div class="shore-conditions">'+
        labels.map((label,i)=>'<span data-met="'+!!row?.checks[i]+'">'+(row?.checks[i]?'✓ ':'○ ')+label+'</span>').join('')+'</div></div>';
    }).join('');
    const tabs=Object.entries(chapters).map(([id,v])=>'<button type="button" data-chapter="'+id+'" aria-pressed="'+(id===chapter)+'">'+v.name+'</button>').join('');
    const notes=entries.slice(-12).reverse().map(note=>
      '<li><strong>'+shoreSpecies[note.type]+'</strong><span>地块 '+shoreRegion(note.x,note.z)+' · ('+note.x.toFixed(1)+', '+note.z.toFixed(1)+')</span></li>').join('');
    const holding=report?.heldResidents?'<p class="shore-held">有 '+report.heldResidents+' 只已放置的动物在等待合适的活动空间。保留水面或腾出岸地后，它们会回来。</p>':'';
    host.innerHTML='<div class="shore-heading"><h3>栖地来客</h3><button type="button" class="chip" data-shore-toggle>'+ (shore.skipped?'继续任务':'跳过任务')+'</button></div>'+
      '<div class="habitat-chapters" role="group" aria-label="游记篇章">'+tabs+'</div><p class="shore-intro">'+intro+'</p>'+
      (!shore.skipped?'<div class="shore-cards">'+cards+'</div>':'')+holding+
      '<div class="shore-notes"><h4>'+name+'游记 <span>'+species.size+' / '+types.length+'</span></h4>'+ (notes?'<ul>'+notes+'</ul>':'<p>观察来客后，这里会记下物种和地点。</p>')+'</div>';
  }
  host?.addEventListener('click',e=>{
    const tab=e.target.closest('[data-chapter]');
    if(tab){chapter=tab.dataset.chapter;render();host.querySelector('[data-chapter="'+chapter+'"]').focus();return;}
    if(!e.target.closest('[data-shore-toggle]'))return;
    const game=getGame(),shore=game.shore??normalizeShore();
    save({...game,shore:{...shore,skipped:!shore.skipped}});
    render();
  });
  return {update(next){report=next;render();},setGame(game,scene){
    if(scene!==currentTheme){currentTheme=scene;if(chapters[scene])chapter=scene;}
    render(game);
  }};
}
