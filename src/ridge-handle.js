import {Vector3} from 'three';
import {cabinRise,MIN_RIDGE_RISE,MAX_RIDGE_RISE,CABIN_EAVES} from './cabin-layout.js';

export function createRidgeHandle(stage,camera,onInput){
  const button=document.createElement('button');
  button.type='button';button.id='ridge-handle';button.hidden=true;
  button.textContent='↕';
  button.title='上下拖动屋脊 · 方向键微调';
  button.setAttribute('role','slider');
  button.setAttribute('aria-label','屋脊升高');
  button.setAttribute('aria-orientation','vertical');
  button.setAttribute('aria-valuemin',MIN_RIDGE_RISE);
  button.setAttribute('aria-valuemax',MAX_RIDGE_RISE);
  stage.append(button);
  const anchor=new Vector3(),upper=new Vector3();
  let object=null,ground=0,drag=null;
  function position(){
    if(!object)return;
    const y=ground+CABIN_EAVES+cabinRise(object)+.16;
    anchor.set(object.x,y,object.z).project(camera);
    button.style.left=(anchor.x+1)*50+'%';
    button.style.top=(1-anchor.y)*50+'%';
  }
  function point(o,delta){return {id:o.id,x:o.x,z:o.z,ridgeDelta:delta};}
  button.addEventListener('pointerdown',e=>{
    if(e.button!==0||!object||drag)return;
    e.preventDefault();button.focus({preventScroll:true});
    upper.set(object.x,ground+1,object.z).project(camera);
    anchor.set(object.x,ground,object.z).project(camera);
    const pixelsPerMeter=Math.max(16,Math.abs(upper.y-anchor.y)*stage.clientHeight/2);
    drag={id:e.pointerId,y:e.clientY,pixelsPerMeter,object};
    button.setPointerCapture(e.pointerId);onInput('down',point(object,0),e);
  });
  function dragged(e){return point(drag.object,(drag.y-e.clientY)/drag.pixelsPerMeter);}
  button.addEventListener('pointermove',e=>{
    if(drag?.id===e.pointerId)onInput('move',dragged(e),e);
  });
  function finish(e,cancel){
    if(drag?.id!==e.pointerId)return;
    const p=dragged(e);drag=null;
    onInput(cancel?'cancel':'up',cancel?null:p,e);
    if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
  }
  button.addEventListener('pointerup',e=>finish(e,false));
  button.addEventListener('pointercancel',e=>finish(e,true));
  button.addEventListener('lostpointercapture',e=>finish(e,true));
  button.addEventListener('keydown',e=>{
    if(!object||drag)return;
    const steps={ArrowUp:.1,ArrowDown:-.1,Home:MIN_RIDGE_RISE-cabinRise(object),End:MAX_RIDGE_RISE-cabinRise(object)};
    if(!Object.hasOwn(steps,e.key))return;
    e.preventDefault();e.stopPropagation();
    onInput('down',point(object,0),e);onInput('up',point(object,steps[e.key]),e);
  });
  return {position,show(o,y){
    object=o;ground=y;button.hidden=!o;
    if(o){const rise=cabinRise(o).toFixed(2);button.setAttribute('aria-valuenow',rise);button.setAttribute('aria-valuetext',rise+' 米');position();}
  }};
}
