import {LAND,tileKey} from './sandbox-state.js';
import {appendRegion} from './territory.js';
import {frontierEdges,previewExpansion} from './frontier-data.js';
import './frontier.css';

export function installFrontier({stage,getWorld,getFocus,viewport,prepare,commit,announce}){
  const pins=document.createElement('div'),labels=document.createElement('div'),panel=document.createElement('div');
  pins.className='frontier-pins';labels.className='frontier-labels';panel.className='frontier-panel';
  panel.innerHTML='<div><strong></strong><small></small></div><button class="btn primary" type="button" data-confirm>确认扩建</button><button class="btn" type="button" data-close>取消</button>';
  stage.append(pins,labels,panel);
  let active=false,choices=[],preview=null,frame=0;
  const toggleButton=document.getElementById('map-mode');
  const label=()=>{toggleButton.setAttribute('aria-pressed',String(active));document.getElementById('map-label').textContent='扩建领地';};
  function close(){
    active=false;preview=null;choices=[];panel.hidden=true;pins.hidden=true;labels.replaceChildren();
    stage.classList.remove('frontier-open');viewport?.showFrontier(null);viewport?.releaseFrontier();
    cancelAnimationFrame(frame);frame=0;label();
  }
  function position(){
    if(!active)return;
    if(!preview)for(const [i,b] of Array.from(pins.children).entries()){
      const e=choices[i],p=viewport.projectGround(e.edgeX,e.edgeZ);
      b.style.left=Math.max(9,Math.min(91,p.x*100))+'%';b.style.top=Math.max(15,Math.min(76,p.y*100))+'%';
    }
    if(preview)for(const element of labels.children){
      const p=viewport.projectGround(Number(element.dataset.x),Number(element.dataset.z));
      element.style.left=p.x*100+'%';element.style.top=p.y*100+'%';
    }
    frame=requestAnimationFrame(position);
  }
  function select(e){
    if(!e)return;
    preview=previewExpansion(getWorld(),e);if(!preview)return;
    pins.hidden=true;
    viewport.frameFrontier(e);
    viewport.showFrontier(preview);
    const {ports}=preview;
    const markers=[{text:'待扩建领地',p:[e.x*2*LAND.x,e.z*2*LAND.z],kind:'land'},
      ...ports.slice(0,8).map(port=>({text:port.kind==='river'?'水道':'道路',p:port.p,kind:port.kind}))];
    labels.replaceChildren(...markers.map(({text,p,kind})=>{
      const el=document.createElement('span');el.textContent=text;el.dataset.kind=kind;el.dataset.x=p[0];el.dataset.z=p[1];return el;
    }));
    panel.querySelector('strong').textContent='向'+e.name+'扩建 · 684 平方米';
    panel.querySelector('small').textContent='道路接点 '+ports.filter(p=>p.kind==='road').length+' · 水道接点 '+ports.filter(p=>p.kind==='river').length+' · 免费'+(getWorld().game.mode==='adventure'?'，即时保存':'，可撤销');
    panel.querySelector('[data-confirm]').hidden=false;
  }
  function open(){
    if(!viewport)return;
    prepare();active=true;stage.classList.add('frontier-open');
    choices=frontierEdges(getWorld(),getFocus());
    if(!choices.length){close();announce('附近没有可扩建的空地');return;}
    if(choices[0].distance)viewport.focusPoint(choices[0].edgeX-choices[0].dx,choices[0].edgeZ-choices[0].dz);
    pins.replaceChildren(...choices.map(e=>{
      const b=document.createElement('button');b.className='frontier-pin';b.type='button';b.textContent='+ '+e.name;b.setAttribute('aria-label','预览向'+e.name+'扩建');b.onclick=()=>select(e);return b;
    }));
    panel.querySelector('strong').textContent='选一处边缘扩建';panel.querySelector('small').textContent='点击地面上的方向标，预览新领地';
    panel.querySelector('[data-confirm]').hidden=true;
    pins.hidden=panel.hidden=false;label();position();
  }
  panel.querySelector('[data-close]').onclick=close;
  panel.querySelector('[data-confirm]').onclick=()=>{
    if(!preview)return;
    const {edge,local}=preview,world=getWorld();
    if(!world.regions[tileKey(edge.x,edge.z)])commit(appendRegion(world,local,edge.x,edge.z));
    close();viewport.focusPoint(edge.edgeX-edge.dx*.2,edge.edgeZ-edge.dz*.2);
    announce('已扩建 684 平方米，可以沿交界处继续搭桥、画路');
  };
  document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();close();}},true);
  close();
  return {toggle(){active?close():open();},choose(dx,dz){if(!active)open();const f=getFocus();select(choices.find(e=>e.x===f.x+dx&&e.z===f.z+dz));},
    input(kind,p){if(!active)return false;if(kind==='down'&&p&&!preview){const hit=choices.find(e=>Math.abs(e.dx?(p.x-e.edgeX):(p.z-e.edgeZ))<2&&Math.abs(e.dx?(p.z-e.edgeZ):(p.x-e.edgeX))<(e.dx?LAND.z:LAND.x));if(hit)select(hit);}return true;},
    sync(mode){if(active&&mode!=='build')close();label();}};
}
