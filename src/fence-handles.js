import {Vector3} from 'three';
import {fenceHandleIndices,prepareFencePath} from './fence-path.js';

export function createFenceHandles(stage,camera,groundHeight,pointerData,onInput){
  const layer=document.createElement('div'),buttons=new Map(),anchor=new Vector3();
  layer.id='fence-handles';layer.hidden=true;stage.append(layer);
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  let stroke=null,drag=null;

  function project(x,z,h=0){
    return anchor.set(x,groundHeight(x,z)+h,z).project(camera);
  }
  function position(){
    if(!stroke)return;
    for(const [index,button] of buttons){
      const pt=project(...stroke.p[index],.97);
      button.style.left=(pt.x+1)*50+'%';button.style.top=(1-pt.y)*50+'%';
    }
  }
  function show(next){
    stroke=next?prepareFencePath(next):null;
    layer.hidden=!stroke;
    if(drag&&(drag.strokeId!==stroke?.id||!stroke.knots.includes(drag.index))){
      const {button,id}=drag;drag=null;
      button.classList.remove('dragging');
      if(button.hasPointerCapture(id))button.releasePointerCapture(id);
    }
    if(!stroke)return;
    const indices=fenceHandleIndices(stroke),closed=indices.length<stroke.knots.length;
    for(const [index,button] of buttons){
      // An open fence can become a loop under the pointer. Keep its captured
      // end until release so approaching the start never cancels the gesture.
      if(!indices.includes(index)&&button!==drag?.button){button.remove();buttons.delete(index);}
    }
    for(const [n,index] of indices.entries()){
      let button=buttons.get(index);
      if(!button){
        button=document.createElement('button');button.type='button';button.className='fence-handle';
        button.dataset.fenceKnot=index;buttons.set(index,button);layer.append(button);
      }
      const endpoint=!closed&&(n===0||n===indices.length-1);
      const label=closed&&n===0?'栅栏接头':indices.length===1?'栅栏立柱':endpoint?(n===0?'栅栏起点':'栅栏终点'):'栅栏控制点 '+(n+1);
      button.dataset.endpoint=endpoint;button.setAttribute('aria-label',label);
      button.title=label+' · 拖动改线，方向键微调';
    }
    position();
  }
  function groundPixel(index){
    const pt=project(...stroke.p[index]),rect=stage.getBoundingClientRect();
    return {clientX:rect.left+(pt.x+1)*rect.width/2,clientY:rect.top+(1-pt.y)*rect.height/2};
  }
  function inputPoint(id,index,x,z){return {id,fenceKnot:index,x,z};}
  function nearestButton(event){
    // On touch screens the tap targets can overlap even though their dots are apart.
    let picked=event.target.closest('.fence-handle'),distance=Infinity;
    if(!picked)return null;
    for(const button of buttons.values()){
      const b=button.getBoundingClientRect();
      const d=(event.clientX-b.left-b.width/2)**2+(event.clientY-b.top-b.height/2)**2;
      if(d<distance){distance=d;picked=button;}
    }
    return picked;
  }
  layer.addEventListener('pointerdown',e=>{
    if(!stroke||drag||e.button!==0)return;
    const button=nearestButton(e);
    if(!button)return;
    const index=Number(button.dataset.fenceKnot),base=groundPixel(index);
    const ground=pointerData(base);
    if(!ground)return;
    const [x,z]=stroke.p[index];
    // Unproject the foot of the post, retaining the initial grab offset and
    // compensating for the terrain picker's finite sampling on slopes.
    drag={button,id:e.pointerId,strokeId:stroke.id,index,
      screenX:base.clientX-e.clientX,screenY:base.clientY-e.clientY,dx:x-ground.x,dz:z-ground.z};
    e.preventDefault();button.focus({preventScroll:true});button.setPointerCapture(e.pointerId);
    button.classList.add('dragging');onInput('down',inputPoint(stroke.id,index,x,z),e);
  });
  function dragged(e){
    const p=pointerData({clientX:e.clientX+drag.screenX,clientY:e.clientY+drag.screenY});
    return p&&inputPoint(drag.strokeId,drag.index,p.x+drag.dx,p.z+drag.dz);
  }
  layer.addEventListener('pointermove',e=>{
    if(drag?.id===e.pointerId)onInput('move',dragged(e),e);
  });
  function finish(e,cancel){
    if(!drag)return;
    const {button,id}=drag,p=cancel?null:dragged(e);drag=null;
    button.classList.remove('dragging');
    if(button.hasPointerCapture(id))button.releasePointerCapture(id);
    onInput(p?'up':'cancel',p,e);
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])layer.addEventListener(type,e=>{
    if(drag?.id===e.pointerId)finish(e,type!=='pointerup');
  });
  layer.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&drag){e.stopPropagation();e.preventDefault();finish(e,true);return;}
    const vector=arrows[e.key];
    if(!stroke||drag||!vector)return;
    const index=Number(e.target.dataset.fenceKnot),base=groundPixel(index);
    const a=pointerData(base),b=pointerData({clientX:base.clientX+vector[0]*8,clientY:base.clientY+vector[1]*8});
    if(!a||!b)return;
    const dx=b.x-a.x,dz=b.z-a.z,span=Math.hypot(dx,dz);
    if(!span)return;
    e.stopPropagation();e.preventDefault();
    const [x,z]=stroke.p[index],step=e.shiftKey?.5:.1,id=stroke.id;
    onInput('down',inputPoint(id,index,x,z),e);
    onInput('up',inputPoint(id,index,x+step*dx/span,z+step*dz/span),e);
    if(stroke?.id===id)(buttons.get(index)??buttons.get(0))?.focus({preventScroll:true});
  });
  return {position,show};
}
