import {planTraversal} from './traversal-motion.js';
import {createFrontierOverlay} from './frontier-render.js';
import {CHARACTER,createCharacter,stepCharacter,requestJump,releaseJump,stopCharacter,cameraSweep,cameraDistance} from './character-controller.js';
import {createAdventureActors} from './adventure-actors.js';
import {animalProfile} from './animal-behavior.js';
import {modelDefinitions,modelHeight,collisionParts} from './asset-registry.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createKit, disposeGroup} from './model.js';
import {buildLand, buildObject, objectHeight, alignBridge,refreshLandRoads,refreshLandFences} from './sandbox-model.js';
import {createRidgeHandle} from './ridge-handle.js';
import {createFenceHandles} from './fence-handles.js';
import {createFencePreview,pickFence} from './fence-view.js';
import {createRoadPreview} from './road-preview.js';
import {cabinRise,resolveCabinLayout,CABIN_EAVES} from './cabin-layout.js';
import {isRoadEdit} from './road-coverage.js';
import {changedAreas,changedStrokes,objectBounds,overlapsBounds,roadEditAreas} from './edit-bounds.js';
import {baseHeight, flyingAnimal, footprint, inFootprint, items, LAND, MAX_POINTS, themes, tileKey, tileShift, waterAnimal} from './sandbox-state.js';
import {buildEcology} from './ecology.js';
import {createShoreVisitors} from './shore-visitors.js';
import {findResidentRefuge} from './shore-habitat.js';
import {architectureHeight} from './asset-models.js';
import {buildAvatar} from './creatures.js';
import {createAnimalCrowd,makeWander,wander} from './navigation.js';
import {createContinuousLand} from './continuous-land.js';
import {regionAt} from './territory.js';
import {animatePackModel,setModelDetail} from './model-pack.js';
import {hoofGround} from './deer.js';

const lighting = {
  day:{sky:'#f0f6e3',ground:'#a7af8d',ambient:2.08,sun:'#ffeccb',power:2.36,exposure:1.08,position:[-10,17,11],glass:.22},
  gold:{sky:'#ffe0bd',ground:'#8a8c75',ambient:1.81,sun:'#ffc18a',power:3.30,exposure:1.09,position:[-13,9,9],glass:.58},
  night:{sky:'#8fbaff',ground:'#627990',ambient:1.17,sun:'#99bcff',power:1.02,exposure:1.10,position:[9,15,-6],glass:1.28}
};

export function createViewport(stage,onMetrics,onInput,onRegion,onNearby,onGame=()=>{},wantsAudio=()=>false) {
  const modest=matchMedia('(pointer: coarse)').matches||(navigator.deviceMemory??8)<=4||(navigator.hardwareConcurrency??8)<=4;
  let quality=modest?'low':'balanced';
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,modest?1:1.4));
  renderer.shadowMap.enabled=!modest;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.setClearColor(0,0);
  const canvas=renderer.domElement;
  canvas.setAttribute('aria-label','林栖建造沙盘');
  stage.append(canvas);

  const scene=new T.Scene(), kit=createKit();
  const camera=new T.OrthographicCamera(-15,15,11,-11,.1,145);
  const follow=new T.PerspectiveCamera(58,1,.075,87);
  const avatar=buildAvatar(kit);
  avatar.group.visible=false;
  scene.add(avatar.group);
  const target=new T.Vector3(0,1.28,0), home=new T.Vector3(21.6,22.2,34);
  const controls=new OrbitControls(camera,canvas);
  controls.target.copy(target);
  controls.enableDamping=true;
  controls.dampingFactor=.15;
  controls.minPolarAngle=.025;
  controls.maxPolarAngle=Math.PI*.48;
  controls.minZoom=.60;
  controls.maxZoom=4.2;
  controls.autoRotateSpeed=.66;
  controls.mouseButtons.RIGHT=T.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE=T.MOUSE.ROTATE;
  camera.position.copy(home);
  controls.update();

  const sky=new T.HemisphereLight(),sun=new T.DirectionalLight();
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:17,bottom:-17,near:.1,far:62});
  sun.shadow.bias=-.00019;
  sun.shadow.normalBias=.044;
  sun.shadow.intensity=.79;
  const accents=new T.Group();
  scene.add(sky,sun,accents);

  const marker=new T.Mesh(new T.RingGeometry(.91,1,40),new T.MeshBasicMaterial({side:T.DoubleSide,transparent:true,opacity:.95,depthTest:false}));
  marker.rotation.x=-Math.PI/2;
  marker.renderOrder=12;
  marker.visible=false;
  const footprintLine=new T.LineLoop(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(12),3)),
    new T.LineBasicMaterial({depthTest:false,transparent:true,opacity:.95}));
  footprintLine.visible=false;
  footprintLine.frustumCulled=false;
  footprintLine.renderOrder=12;
  const patchGeo=new T.CircleGeometry(1,22).rotateX(-Math.PI/2);
  const stamps=new T.InstancedMesh(patchGeo,new T.MeshBasicMaterial({transparent:true,opacity:.35,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),MAX_POINTS);
  stamps.count=0;
  stamps.frustumCulled=false;
  const brushMatrix=new T.Object3D();
  const corners=new T.InstancedMesh(new T.SphereGeometry(.13,8,5),
    new T.MeshBasicMaterial({color:'#fff0b2',depthTest:false}),4);
  corners.visible=false;
  corners.frustumCulled=false;
  corners.renderOrder=13;
  const borderPoints=80;
  const border=new T.LineSegments(new T.BufferGeometry().setAttribute('position',
    new T.BufferAttribute(new Float32Array(borderPoints*3),3)),
    new T.LineDashedMaterial({color:'#fff3cb',transparent:true,opacity:.63,dashSize:.29,gapSize:.22,depthWrite:false}));
  border.frustumCulled=false;
  border.visible=false;
  scene.add(marker,footprintLine,stamps,corners,border);

  let pending=0,last=0,lifeTimer=0,time=0,lastShadow=0,metric='',paused=false,land,world,region,ecology,previewObject,hiddenObject;
  let gesture=null,orbitMode=false,living=false,playing=false,player,lookDrag,nearKey='';
  let yaw=Math.PI,pitch=.30,zoom=4.3,arm=4.3,cameraYaw=Math.PI,cameraPitch=.30,analog={side:0,forward:0},runLatch=false,lastMotion='';
  const movement=new Set();
  const cameraGoal=new T.Vector3(),lookGoal=new T.Vector3(),cameraAnchor=new T.Vector3();
  let crowd=createAnimalCrowd(),playerBody=null;
  const continuousLand=createContinuousLand(kit);
  const objects=new Map();
  const roadPreview=createRoadPreview(kit,scene,objects);
  const ridgeHandle=createRidgeHandle(stage,camera,onInput);
  const fenceHandles=createFenceHandles(stage,camera,(x,z)=>land?.userData.field.height(x,z)??0,pointerData,onInput);
  const fencePreview=createFencePreview(kit);
  const visibleTiles=()=>region?.continuous?land.children:[land];
  let heldResidents=0,ecologyDebt=0;
  const shoreVisitors=createShoreVisitors({
    makeModel(type,id,w,field){
      const def=items[type],o={type,id:id+100000,w:def.width,d:def.depth??def.width,x:0,z:0,a:0};
      const mesh=buildObject(kit,o,w,field);scene.add(mesh);return mesh;
    },
    removeModel:disposeGroup,
    paintModel(group,pose){
      group.position.set(pose.x,pose.y,pose.z);group.rotation.y=pose.heading;
      setModelDetail(group,pose.detail);
      animatePackModel(group,{delta:pose.delta,motion:pose.motion,phase:pose.phase});
    },
    onReport:report=>onGame({type:'habitat',report})
  });
  const adventure=createAdventureActors(scene,onGame);let gameStatusClock=0,inputSuspended=false;
  window.addEventListener('blur',()=>{inputSuspended=true;clearMovement();adventure.pause();});
  window.addEventListener('focus',()=>{inputSuspended=false;schedule();});
  const raycaster=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  const hit=new T.Vector3(), localHit=new T.Vector3(), inverse=new T.Matrix4(), localRay=new T.Ray(), box=new T.Box3();

  function schedule(){
    if(lifeTimer){clearTimeout(lifeTimer);lifeTimer=0;}
    if(!pending && !paused && !document.hidden) pending=requestAnimationFrame(tick);
  }
  function draw(){
    ridgeHandle.position();
    fenceHandles.position();
    renderer.render(scene,playing?follow:camera);
    const {calls,triangles}=renderer.info.render;
    const next=`${calls} draws / ${(triangles/1000).toFixed(1)}k tris`;
    if(next!==metric){metric=next;onMetrics(next);}
  }
  function tick(now){
    pending=0;
    if(paused||document.hidden) return;
    const delta=Math.min(.05,(now-(last||now-16))/1000);
    last=now;
    if(playing&&!inputSuspended&&!document.querySelector('dialog[open]')){walk(delta);
      if(world.game?.health!==0)adventure.step(delta,player);
      gameStatusClock-=delta;if(gameStatusClock<=0){gameStatusClock=.2;onGame({type:'status',...adventure.status(player)});}
    }
    else controls.update(delta);
    if(region?.continuous&&!playing&&!frontierView){
      const [x,z]=regionAt(controls.target.x,controls.target.z);
      if((x!==region.x||z!==region.z)&&region.claimed(x,z)){
        onRegion(x-region.x,z-region.z,true);update(world,{...region,x,z});
      }
    }
    if(living&&ecology){
      time+=delta;kit.time.value=time;
      ecologyDebt+=delta;
      if(ecologyDebt>=(quality==='low'?1/18:1/30)){
        ecology.step(time,world.light,ecologyDebt);
        ecologyDebt=0;
      }
      stepAnimals(delta);
      if(renderer.shadowMap.enabled&&time-lastShadow>.25){renderer.shadowMap.needsUpdate=true;lastShadow=time;}
    }
    shoreVisitors.step(delta,living,playing?player:controls.target,quality==='low');
    draw();
    if(playing||controls.autoRotate) schedule();
    else if((living||shoreVisitors.moving())&&!pending)lifeTimer=setTimeout(schedule,living?28:60);
  }
  function resize(){
    const {width,height}=stage.getBoundingClientRect();
    if(width<1||height<1) return;
    const ratio=width/height;
    const half=region?Math.max(11.8,14.2/ratio):Math.max(10.9,15.65/ratio);
    Object.assign(camera,{left:-half*ratio,right:half*ratio,top:half,bottom:-half});
    camera.updateProjectionMatrix();
    follow.aspect=ratio;follow.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    schedule();
  }
  controls.addEventListener('change',schedule);
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry])=>{paused=!entry.isIntersecting;if(!paused) schedule();}).observe(stage);
  document.addEventListener('visibilitychange',schedule);
  resize();

  function pointerData(e,pick=false){
    const rect=canvas.getBoundingClientRect();
    ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    raycaster.setFromCamera(ndc,camera);
    plane.constant=-.19;
    if(!raycaster.ray.intersectPlane(plane,hit)) return null;
    const field=land?.userData.field;
    const ground=field?.height(hit.x,hit.z)??baseHeight(hit.x,hit.z);
    plane.constant=-(field?.depth(hit.x,hit.z)>.59?Math.max(field.level,ground):ground);
    raycaster.ray.intersectPlane(plane,hit);
    const result={x:hit.x,z:hit.z,id:null};
    if(!pick) return result;
    let closest=Infinity;
    for(const [id,{group,object:o}] of objects){
      if(!group.visible)continue;
      const isHouse=items[o.type].category==='house';
      const h=modelHeight(o)??(o.type==='cedar'?CABIN_EAVES+cabinRise(o)+.16:o.type==='tower'?7.2:isHouse?architectureHeight(items[o.type].form,o.w):
        items[o.type].category==='plant'?o.w*3.1:o.w*1.45);
      box.min.set(-o.w/2,-.04,-o.d/2);
      box.max.set(o.w/2,h,o.d/2+.21);
      group.updateMatrixWorld();
      inverse.copy(group.matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(inverse);
      if(!localRay.intersectBox(box,localHit)) continue;
      const dist=localHit.applyMatrix4(group.matrixWorld).distanceToSquared(raycaster.ray.origin);
      if(dist<closest){closest=dist;result.id=id;}
    }
    if(stage.dataset.mode==='select'){
      result.fenceId=pickFence(visibleTiles(),camera,raycaster.ray,rect,e,closest);
      if(result.fenceId!==null)result.id=null;
    }
    return result;
  }
  canvas.addEventListener('pointerdown',(e)=>{
    if(playing&&(e.button===0||e.button===2)){
      e.stopImmediatePropagation();e.preventDefault();
      lookDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if(orbitMode||e.button!==0||gesture!==null||!land) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    gesture=e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    onInput('down',pointerData(e,true),e);
  },true);
  canvas.addEventListener('pointermove',(e)=>{
    if(playing){
      if(lookDrag?.id===e.pointerId){
        yaw-=(e.clientX-lookDrag.x)*.005;
        pitch=T.MathUtils.clamp(pitch+(e.clientY-lookDrag.y)*.004,-.12,1.12);
        lookDrag.x=e.clientX;lookDrag.y=e.clientY;
      }
      return;
    }
    if(orbitMode||!land||e.buttons&6) return;
    if(gesture!==null && e.pointerId!==gesture) return;
    onInput(gesture===null?'hover':'move',pointerData(e),e);
  });
  function finish(e,cancel){
    if(lookDrag?.id===e.pointerId){
      lookDrag=null;
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      return;
    }
    if(gesture!==e.pointerId) return;
    gesture=null;
    onInput(cancel?'cancel':'up',cancel?null:pointerData(e),e);
    if(canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener('wheel',e=>{if(playing){e.preventDefault();e.stopImmediatePropagation();zoom=T.MathUtils.clamp(zoom+e.deltaY*.004,2,7);schedule();}},{passive:false,capture:true});
  canvas.addEventListener('pointerup',e=>finish(e,false));
  canvas.addEventListener('pointercancel',e=>finish(e,true));
  canvas.addEventListener('lostpointercapture',e=>finish(e,true));
  canvas.addEventListener('pointerleave',()=>{if(gesture===null) onInput('leave',null);});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  function clearPreview(){
    roadPreview.clear();
    if(fencePreview.clear())renderer.shadowMap.needsUpdate=true;
    if(previewObject) disposeGroup(previewObject);
    if(hiddenObject) hiddenObject.visible=true;
    previewObject=hiddenObject=undefined;
    stamps.count=0;
    marker.visible=false;
    schedule();
  }
  function visibleGround(x,z){
    const f=land?.userData.field;
    if(!f)return .19;
    const ground=f.height(x,z);
    return f.depth(x,z)>.61?Math.max(f.level,ground):ground;
  }
  let frontierView=null;
  function frameFrontier(edge){
    if(!frontierView)frontierView={x:controls.target.x,z:controls.target.z,zoom:camera.zoom};
    const [cx,cz]=tileShift(edge.x,edge.z);
    focusPoint(edge.edgeX+edge.dx*LAND.x*.36,edge.edgeZ+edge.dz*LAND.z*.36);
    camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const points=[[cx-LAND.x,cz-LAND.z],[cx+LAND.x,cz-LAND.z],[cx+LAND.x,cz+LAND.z],[cx-LAND.x,cz+LAND.z],[edge.edgeX-edge.dx*LAND.x*.8,edge.edgeZ-edge.dz*LAND.z*.8]];
    let factor=1.5;for(const [x,z] of points){
      const n=projectGround(x,z);factor=Math.min(factor,.43/(Math.abs(n.x-.5)||.001),.33/(Math.abs(n.y-.5)||.001));
    }
    camera.zoom=factor;camera.updateProjectionMatrix();controls.update();schedule();
  }
  function releaseFrontier(){
    if(!frontierView)return;
    const saved=frontierView;frontierView=null;
    camera.zoom=saved.zoom;camera.updateProjectionMatrix();focusPoint(saved.x,saved.z);
  }
  const frontierOverlay=createFrontierOverlay(scene,visibleGround);
  function focusPoint(x,z){
    camera.position.x+=x-controls.target.x;camera.position.z+=z-controls.target.z;
    controls.target.x=x;controls.target.z=z;controls.update();schedule();
  }
  function projectGround(x,z){
    const p=localHit.set(x,visibleGround(x,z)+.18,z).project(camera);
    return {x:(p.x+1)*.5,y:(1-p.y)*.5};
  }
  function cursor(p,r=0.38,valid=true){
    marker.visible=Boolean(p);
    if(p){
      if(!playing&&p.inside!==false)shoreVisitors.watch(p);
      marker.material.color.set(valid?'#fff0b2':'#fa9987');
      marker.position.set(p.x,visibleGround(p.x,p.z)+.045,p.z);
      marker.scale.set(r,r,1);
    }
    schedule();
  }
  function showFootprint(o,valid=true,handles=false){
    ridgeHandle.show(handles&&o?.type==='cedar'&&!playing?o:null,o?land?.userData.field.height(o.x,o.z)??0:0);
    footprintLine.visible=Boolean(o);
    corners.visible=Boolean(o)&&handles&&items[o.type].category==='house';
    if(o){
      const pos=footprintLine.geometry.attributes.position;
      footprint(o,.055).forEach(([x,z],i)=>{
        const y=visibleGround(x,z)+.05;
        pos.setXYZ(i,x,y,z);
        if(corners.visible){
          brushMatrix.position.set(x,y+.025,z);
          brushMatrix.scale.setScalar(1);
          brushMatrix.updateMatrix();
          corners.setMatrixAt(i,brushMatrix.matrix);
        }
      });
      if(corners.visible) corners.instanceMatrix.needsUpdate=true;
      pos.needsUpdate=true;
      footprintLine.material.color.set(valid?'#fff0b2':'#fa9987');
    }
    schedule();
  }
  function showObject(o,id,valid=true){
    if(hiddenObject) hiddenObject.visible=true;
    const source=objects.get(id);
    const next=previewObject?.userData.object;
    const cedarEdit=o.type==='cedar'&&next&&['x','z','a','ridgeRise','deck','wood','chimney'].some(key=>next[key]!==o[key]);
    if(!next||next.w!==o.w||next.d!==o.d||next.type!==o.type||next.id!==o.id||cedarEdit) {
      if(previewObject) disposeGroup(previewObject);
      previewObject=buildObject(kit,o,world,land.userData.field);
      previewObject.traverse(m=>{if(m.isMesh)m.castShadow=false;});
      scene.add(previewObject);
    } else {
      previewObject.position.set(o.x,objectHeight(land.userData.field,o),o.z);
      previewObject.rotation.y=o.a;
      if(items[o.type].form==='bridge')alignBridge(previewObject,land.userData.field,o);
    }
    hiddenObject=source?.group;
    if(hiddenObject) hiddenObject.visible=false;
    showFootprint(o,valid,Boolean(id));
  }
  function showStroke(stroke){
    const {p,w,type}=stroke;
    if(type==='fence'){
      fencePreview.show(visibleTiles(),stroke);
      stamps.count=0;marker.visible=false;
      renderer.shadowMap.needsUpdate=true;schedule();
      return;
    }
    if(isRoadEdit(type)){
      roadPreview.show(world,land,region?.continuous,stroke);
      stamps.count=0;
      cursor({x:p.at(-1)[0],z:p.at(-1)[1]},w/2,type!=='road-erase');
      return;
    }
    stamps.material.color.set(items[type].color);
    for(let i=0;i<p.length;i++){
      const [x,z]=p[i];
      brushMatrix.position.set(x,visibleGround(x,z)+.07,z);
      brushMatrix.scale.set(w/2,1,w/2);
      brushMatrix.updateMatrix();
      stamps.setMatrixAt(i,brushMatrix.matrix);
    }
    stamps.count=p.length;
    stamps.instanceMatrix.needsUpdate=true;
    schedule();
  }
  function updateBorder(){
    if(!region?.continuous)return;
    const points=[],f=land.userData.field;
    for(const key of Object.keys(worldForBorder.regions)){
      const [rx,rz]=key.split(',').map(Number);
      if(Math.abs(rx-region.x)>1||Math.abs(rz-region.z)>1)continue;
      const [sx,sz]=tileShift(rx,rz);
      for(const [dx,dz,a,b] of [[0,-1,[-LAND.x,-LAND.z],[LAND.x,-LAND.z]],[1,0,[LAND.x,-LAND.z],[LAND.x,LAND.z]],[0,1,[LAND.x,LAND.z],[-LAND.x,LAND.z]],[-1,0,[-LAND.x,LAND.z],[-LAND.x,-LAND.z]]]){
        if(region.claimed(rx+dx,rz+dz))continue;
        for(let i=0;i<24;i++)for(const t of [i/24,(i+1)/24]){
          const x=sx+T.MathUtils.lerp(a[0],b[0],t),z=sz+T.MathUtils.lerp(a[1],b[1],t);
          points.push(x,f.height(x,z)+.07,z);
        }
      }
    }
    border.geometry.dispose();border.geometry=new T.BufferGeometry();
    border.geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));border.computeLineDistances();
  }
  let worldForBorder;
  function update(next,nextRegion=null){
    const regionChange=region?.x!==nextRegion?.x||region?.z!==nextRegion?.z;
    region=nextRegion;
    const objectsChanged=!world||regionChange||next.objects!==world.objects||next.season!==world.season||next.seed!==world.seed;
    const spatial=o=>items[o.type].category!=='animal';
    const layout=objectsChanged?next.objects.filter(spatial):[];
    const oldLayout=objectsChanged?world?.objects.filter(spatial):[];
    const terrainObjectsChanged=!oldLayout||layout.length!==oldLayout.length||layout.some((o,i)=>{
      const old=oldLayout[i];
      return o!==old&&(['x','z','w','d','a','type'].some(key=>o[key]!==old[key])||
        (o.type==='cedar'&&o.deck!==old.deck));
    });
    const strokeEdits=regionChange?null:changedStrokes(world,next);
    const fenceOnly=Boolean(strokeEdits?.length&&strokeEdits.every(s=>s.type==='fence'));
    const landChange=!fenceOnly&&(!world||regionChange||terrainObjectsChanged||['theme','season','seed','strokes','biome','felled','regions'].some(key=>next[key]!==world[key]));
    const roadChanges=roadEditAreas(world,next,strokeEdits);
    const lightChange=!world||next.light!==world.light;
    if(fenceOnly||landChange||objectsChanged||lightChange)clearPreview();
    if(fenceOnly){
      const ids=new Set(strokeEdits.map(s=>s.id));
      if(region?.continuous)continuousLand.updateFences(next,ids);
      else refreshLandFences(kit,land,next,region,ids);
      renderer.shadowMap.needsUpdate=true;
    }
    if(regionChange){
      controls.maxPolarAngle=region?1.13:Math.PI*.48;
      controls.minZoom=region ? .75 : .60;
      controls.mouseButtons.RIGHT=region?T.MOUSE.PAN:T.MOUSE.ROTATE;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality==='low'?1:quality==='high'?1.65:1.3));
      scene.fog=region?new T.Fog('#dce8d6',46,81):null;
      resize();
    }
    if(landChange){
      const oldLand=land;
      if(region?.continuous)land=continuousLand.update(next,region,quality,roadChanges);
      else if(roadChanges)refreshLandRoads(kit,land,next,region,roadChanges);
      else land=buildLand(kit,next,region);
      scene.add(land);
      if(oldLand&&oldLand!==land){if(oldLand===continuousLand.group)continuousLand.clear();else disposeGroup(oldLand);}
      if(!roadChanges){
        worldForBorder=next;updateBorder();
        crowd=createAnimalCrowd();playerBody=null;
      }
      if(!roadChanges||!ecology?.updateNavigation(land.userData.field,land.userData.navigation)){
        ecology?.dispose();ecology=null;
      }
    }
    if(landChange||objectsChanged){
      const edits=world&&landChange?changedAreas(world,next):[];
      for(const [id,entry] of objects){
        const o=next.objects.find(o=>o.id===id&&(!region?.continuous||land.userData.visible(o)));
        if(o!==entry.object||(!region?.continuous&&regionChange)||next.season!==world?.season||next.seed!==world?.seed){
          entry.agent?.crowd?.remove(entry.agent);
          disposeGroup(entry.group);
          objects.delete(id);
        }else if(o?.type==='cedar'&&landChange){
          const area=objectBounds(o,7);
          if(regionChange||next.regions!==world.regions||edits.some(edit=>overlapsBounds(edit,area))){
            const layout=resolveCabinLayout(o,next,land.userData.field);
            if(JSON.stringify(layout)!==JSON.stringify(entry.group.userData.cabinLayout)){
              disposeGroup(entry.group);
              entry.group=buildObject(kit,o,next,land.userData.field,layout);
              scene.add(entry.group);
            }
          }
        }
      }
      for(const o of next.objects){
        if(region?.continuous&&!land.userData.visible(o))continue;
        const entry=objects.get(o.id);
        if(entry){
          if(items[o.type].category==='animal'){
            const a=entry.agent;
            if(!a||landChange&&(!roadChanges||!land.userData.navigation.valid(a.x,a.z,a.r,a.kind)))bindAnimal(entry,next);
          }else if(items[o.type].form==='bridge')alignBridge(entry.group,land.userData.field,o);
          else entry.group.position.y=objectHeight(land.userData.field,o);
        }else{
          const group=buildObject(kit,o,next,land.userData.field);
          scene.add(group);
          const made={group,object:o,agent:null,spinners:[]};
          group.traverse(child=>{if(child.userData.spin)made.spinners.push(child);});
          objects.set(o.id,made);
          if(items[o.type].category==='animal')bindAnimal(made,next);
        }
      }
    }
    if(landChange&&!ecology){
      ecology=buildEcology(region?.continuous?{...next,...next.regions[tileKey(region.x,region.z)],season:next.season,light:next.light,objects:next.objects,strokes:next.strokes.filter(s=>s.p.some(([x,z])=>Math.abs(x-region.x*30)<18&&Math.abs(z-region.z*22.8)<14))}:next,land.userData.field,region,land.userData.navigation,crowd);
      ecology.step(time,next.light);
      scene.add(ecology.group);
    }
    if(lightChange||regionChange){
      const look=lighting[next.light];
      sky.color.set(look.sky);sky.groundColor.set(look.ground);sky.intensity=look.ambient;
      sun.color.set(look.sun);sun.intensity=look.power;sun.position.set(...look.position);
      if(region?.continuous){const [sx,sz]=tileShift(region.x,region.z);sun.position.x+=sx;sun.position.z+=sz;sun.target.position.set(sx,0,sz);scene.add(sun.target);}
      renderer.toneMappingExposure=look.exposure;
      kit.materials.window.emissiveIntensity=look.glass;
      stage.dataset.light=next.light;
      ecology.step(time,next.light);
    }
    if(scene.fog&&(lightChange||regionChange))scene.fog.color.set({day:'#dce8d6',gold:'#e4cba9',night:'#334659'}[next.light]);
    if(lightChange||landChange&&!roadChanges||objectsChanged){
      accents.clear();
      if(next.light!=='day'){
        for(const o of next.objects.filter(o=>['fire','lantern'].includes(o.type)).slice(0,5)){
          const fire=o.type==='fire';
          const light=new T.PointLight(fire?'#ff9d50':'#ffc57d',next.light==='night'?9:3,4.8,2);
          light.position.set(o.x,land.userData.field.height(o.x,o.z)+(fire?.40:o.w),o.z);
          accents.add(light);
        }
      }
    }
    if(lightChange||landChange||objectsChanged)renderer.shadowMap.needsUpdate=true;
    stage.style.setProperty('--scene-tint',themes[next.theme].sky);
    world=next;
    if(player&&playing){
      player.tile=currentTile();
      const nav=land.userData.navigation;
      if(landChange&&nav.bodyContact(player.x,player.y,player.z,CHARACTER.radius)){
        const available=(x,z)=>crowd.fits(x,z,CHARACTER.radius,'land',playerBody);
        const safe=nav.find(player.x,player.z,CHARACTER.radius,'land',8,available);
        if(safe){player.x=safe.x;player.z=safe.z;player.y=nav.support(safe.x,safe.z);player.vy=0;player.grounded=true;player.traversal=null;stopCharacter(player);}
      }
      syncPlayerBody();
    }else if(player){
      avatar.group.visible=player.tile===currentTile();
      if(avatar.group.visible)avatar.group.position.y=land.userData.navigation.support(player.x,player.z,CHARACTER.radius,player.y+.32);
    }
    if(playing)adventure.sync(next,land.userData.navigation,crowd,player);
    if(landChange||objectsChanged)heldResidents=[...objects.values()].filter(e=>items[e.object.type].category==='animal'&&!e.agent).length;
    shoreVisitors.update(next,land.userData.field,land.userData.navigation,crowd,{x:(region?.x??0)*30,z:(region?.z??0)*22.8},heldResidents);
    updateAnimalDetail();schedule();
  }
  function cameraMode(on){
    orbitMode=on;
    stage.classList.toggle('orbiting',on);
    controls.mouseButtons.LEFT=on&&region?T.MOUSE.PAN:T.MOUSE.ROTATE;
    controls.touches.ONE=on&&region?T.TOUCH.PAN:T.TOUCH.ROTATE;
    controls.touches.TWO=on&&region?T.TOUCH.DOLLY_ROTATE:T.TOUCH.DOLLY_PAN;
    border.visible=Boolean(region)&&!on&&!playing;
    cursor(null);
  }
  const currentTile=()=>region?.continuous?'world':region?tileKey(region.x,region.z):'diorama';
  const typeOf=o=>waterAnimal(o)?'water':flyingAnimal(o)?'fly':'land';
  const animalRadius=o=>animalProfile(o).radius;

  function bindAnimal(entry,next){
    const {object:o,group}=entry;
    const nav=land.userData.navigation;
    const previous=entry.agent;
    previous?.crowd?.remove(previous);
    const radius=animalRadius(o),kind=typeOf(o),seed=previous?.heading??o.a,range=2+o.w*.65;
    entry.agent=makeWander(nav,previous?.x??o.x,previous?.z??o.z,radius,kind,seed,range,crowd);
    if(!entry.agent){
      const refuge=findResidentRefuge(nav,crowd,o,radius,kind,next);
      if(refuge)entry.agent=makeWander(nav,refuge.x,refuge.z,radius,kind,seed,range,crowd);
    }
    if(entry.agent)entry.agent.random=(Math.floor(o.id*18317+o.x*151+o.z*871)>>>0)||1;
    if(entry.agent){
      entry.agent.profile=animalProfile(o);
      if(nav.valid(o.x,o.z,radius,kind)){entry.agent.homeX=o.x;entry.agent.homeZ=o.z;}
      group.visible=true;
      placeAnimal(entry,time);
    }else group.visible=false;
  }
  function placeAnimal(entry,t){
    const {group,object:o,agent:a}=entry;
    const {field,navigation:nav}=land.userData;
    const hover=['butterfly','dragonfly','bee'].includes(items[o.type].form)?.62:1.77;
    const gait=Math.min(1,a.speed/.35);
    const deerPose=group.userData.deerPose;
    const y=a.kind==='water'?field.level+.037+Math.sin(t*2.8+a.seed)*.021:
      a.kind==='fly'?field.height(a.x,a.z)+hover+Math.sin(t*3+a.seed)*.18:
      nav.height(a.x,a.z)+(deerPose||group.userData.packModel?0:Math.abs(Math.sin(a.travel*17))*.026*gait);
    a.y=y;a.h=modelHeight(o)??Math.max(.35,o.w*1.2);
    group.position.set(a.x,y,a.z);
    group.rotation.set(0,a.heading,a.kind==='fly'?Math.sin(t*3+a.seed)*.19:0);
    deerPose?.(a,hoofGround(nav,a,y,o.w/.8));
  }
  let detailClock=0;
  const screenPoint=new T.Vector3();
  function updateAnimalDetail(){
    const view=playing?follow:camera;
    view.updateMatrixWorld();
    const candidates=[];
    for(const entry of objects.values()){
      if(!entry.agent)continue;
      screenPoint.copy(entry.group.position).project(view);
      entry.onScreen=Math.abs(screenPoint.x)<1.15&&Math.abs(screenPoint.y)<1.15&&screenPoint.z>-1&&screenPoint.z<1;
      const distance=entry.group.position.distanceTo(view.position)/(playing?1:camera.zoom);
      entry.distance=distance;
      if(entry.onScreen)candidates.push(entry);
      setModelDetail(entry.group,false);
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const limit=quality==='low'?10:quality==='high'?36:20;
    candidates.slice(0,limit).forEach(entry=>setModelDetail(entry.group,true));
  }
  function stepAnimals(dt){
    if(!dt)return;
    detailClock-=dt;if(detailClock<=0){updateAnimalDetail();detailClock=.3;}
    const nav=land.userData.navigation;
    for(const entry of objects.values()){
      const {agent:a,object:o}=entry;
      if(a){
        entry.simDebt=(entry.simDebt??0)+dt;
        const interval=entry.onScreen?(quality==='low'?1/20:1/30):.16;
        if(entry.simDebt>=interval){
          const step=Math.min(.2,entry.simDebt);entry.simDebt=0;
          const speed=entry.agent.profile?.speed??(a.kind==='fly'?.75:a.kind==='water'?.50:.52+o.w*.16);
          wander(nav,a,step,speed);placeAnimal(entry,time);
        }
      }
      entry.poseDebt=(entry.poseDebt??0)+dt;
      if(entry.poseDebt>=(entry.onScreen===false?.16:quality==='low'?1/22:1/40)){
        animatePackModel(entry.group,{delta:entry.poseDebt,speed:a?.speed??0,travel:a?.travel??0,time,motion:o.type==='kingfisher'?'Fly':undefined});
        entry.poseDebt=0;
      }
      for(const spinner of entry.spinners)spinner.rotation.z-=dt*spinner.userData.spin;
    }
  }


  function beginWalk(x,z){
    if(!land)return false;
    const nav=land.userData.navigation;
    const reuse=x===undefined&&player?.tile===currentTile();
    const safe=reuse&&!nav.bodyContact(player.x,player.y,player.z,CHARACTER.radius)?{x:player.x,z:player.z}:nav.find(x??(reuse?player.x:(region?.x??0)*30+.10),z??(reuse?player.z:(region?.z??0)*22.8+5.45),CHARACTER.radius,'land',4.5,(xx,zz)=>crowd.fits(xx,zz,CHARACTER.radius,'land',playerBody));
    if(!safe)return false;
    player={...createCharacter(safe.x,safe.z,nav.support(safe.x,safe.z,CHARACTER.radius,reuse?player.y+.32:Infinity),reuse?player.a:Math.PI),tile:currentTile()};
    yaw=cameraYaw=player.a;pitch=cameraPitch=.30;zoom=arm=4.3;lastMotion='';playing=true;clearMovement();syncPlayerBody();
    cameraAnchor.set(player.x,player.y+1.12,player.z);
    adventure.sync(world,nav,crowd,player);
    movement.clear();
    controls.enabled=false;
    avatar.group.visible=true;
    stage.classList.add('walking');
    clearPreview();showFootprint(null);
    border.visible=false;
    walk(0);
    follow.lookAt(lookGoal);
    schedule();
    return true;
  }
  function endWalk(){
    if(!playing)return;
    adventure.clear();
    playing=false;lookDrag=null;clearMovement();crowd.remove(playerBody);playerBody=null;
    controls.enabled=true;
    stage.classList.remove('walking');
    nearKey='';onNearby(null);
    schedule();
  }
  function syncPlayerBody(){
    if(!playerBody)playerBody={x:player.x,z:player.z,r:CHARACTER.radius,kind:'land'};
    playerBody.x=player.x;playerBody.z=player.z;playerBody.y=player.y;playerBody.h=CHARACTER.height;crowd.update(playerBody);
  }
  function clearMovement(){movement.clear();analog={side:0,forward:0};runLatch=false;stopCharacter(player);onGame({type:'controls-reset'});}
  let waterSoundClock = 0, nearbyClock=0;
  function walk(dt){
    if(!player||!land)return;
    if(world.game?.mode==='adventure'&&world.game.health<=0){clearMovement();return;}
    const forward=Number(movement.has('forward'))-Number(movement.has('back'))+analog.forward;
    const side=Number(movement.has('right'))-Number(movement.has('left'))+analog.side;
    const previousPhase = player.phase, wasGrounded = player.grounded;
    const previousTraversal = player.traversal;
    stepCharacter(player,{forward,side,yaw,run:movement.has('run')||runLatch,walk:movement.has('walk')},dt,land.userData.navigation,crowd,playerBody);
    if(region?.continuous){
      const [x,z]=regionAt(player.x,player.z);
      if((x!==region.x||z!==region.z)&&region.claimed(x,z)){
        onRegion(x-region.x,z-region.z,true);update(world,{...region,x,z});
      }
    }
    syncPlayerBody();
    player.t+=dt;
    player.swing=Math.max(0,player.swing-dt*2.2);
    avatar.group.position.set(player.x,player.y,player.z);
    avatar.group.rotation.y=player.a;
    const nav=land.userData.navigation;
    if (dt && wantsAudio()) {
      const field = land.userData.field;
      if ((!wasGrounded && player.grounded) || previousTraversal && !player.traversal && player.grounded) {
        onGame({type:'sound', name:'land', strength:Math.min(1.4,.55 + player.landingImpact*.08)});
      } else if (!previousTraversal && player.traversal) {
        onGame({type:'sound', name:'vault', strength:.7});
      } else if (player.grounded && player.speed > .25 && Math.floor(previousPhase/Math.PI) !== Math.floor(player.phase/Math.PI)) {
        const surface = nav.surfaceAt(player.x,player.z,.02,player.y)[0]?.object.type;
        const paint = field.paint(player.x,player.z);
        const onBridge = nav.height(player.x,player.z) - field.height(player.x,player.z) > .09;
        const name = surface === 'timber-platform' || onBridge ? 'wood' :
          surface || paint === 'stonepath' || paint === 'paving' ? 'stone' : paint === 'dirtpath' ? 'dirt' : 'grass';
        onGame({type:'sound', name, strength:.55 + Math.min(.48,player.speed*.085)});
      }
      waterSoundClock -= dt;
      if (waterSoundClock <= 0) {
        waterSoundClock = .36;
        let level = field.depth(player.x,player.z);
        for (const distance of [1.4,3.4,5.4]) {
          for (let i=0;i<8;i++) {
            const angle = i*Math.PI/4;
            level = Math.max(level,field.depth(player.x+Math.cos(angle)*distance,player.z+Math.sin(angle)*distance)*(1-distance/6.5));
          }
        }
        onGame({type:'water-sound',level:Math.min(1,level)});
      }
    }
    player.footHeights=[-1,1].map(side=>{const x=player.x+Math.cos(player.a)*side*.125,z=player.z-Math.sin(player.a)*side*.125;return T.MathUtils.clamp(nav.support(x,z,.04,player.y+.32)-player.y,-.22,.27);});
    avatar.pose(player.t,player.speed>.07,player.swing,player.weapon,player,dt);
    const blend=dt?1-Math.exp(-dt*22):1;
    cameraYaw+=Math.atan2(Math.sin(yaw-cameraYaw),Math.cos(yaw-cameraYaw))*blend;
    cameraPitch+=(pitch-cameraPitch)*blend;
    cameraAnchor.x=player.x;cameraAnchor.z=player.z;
    cameraAnchor.y+=(player.y+1.12-cameraAnchor.y)*(dt?1-Math.exp(-dt*15):1);
    const horizontal=Math.cos(cameraPitch)*zoom;
    cameraGoal.set(cameraAnchor.x-Math.sin(cameraYaw)*horizontal,cameraAnchor.y+Math.sin(cameraPitch)*zoom,cameraAnchor.z-Math.cos(cameraYaw)*horizontal);
    const allowed=cameraSweep(cameraAnchor,cameraGoal,nav.cameraBlocked)*zoom;
    arm=dt?cameraDistance(arm,allowed,dt):allowed;
    follow.position.copy(cameraAnchor).lerp(cameraGoal,zoom?arm/zoom:0);
    lookGoal.copy(cameraAnchor);follow.lookAt(lookGoal);
    const fov=58+Math.min(1,player.speed/CHARACTER.sprint)*5;
    follow.fov+=(fov-follow.fov)*(dt?1-Math.exp(-dt*6):1);follow.updateProjectionMatrix();
    const stateText={idle:'站立',start:'起步',walk:'慢走',jog:'慢跑',sprint:'冲刺',pivot:'转身',stop:'停步',jump:'起跳',fall:'下落',land:'落地','land-heavy':'缓冲落地',vault:'撑墙翻越',climb:'攀上平台'}[player.state];
    const motionText=stateText+' · '+player.speed.toFixed(1)+' m/s';
    if(motionText!==lastMotion){lastMotion=motionText;onGame({type:'locomotion',text:motionText,state:player.state});}
    nearbyClock-=dt;
    if(!dt||nearbyClock<=0){
      nearbyClock=.2;
      shoreVisitors.watch(player);
      const observe=nearest(),tree=nearest(true),mine=nearbyMineTarget();
      const traversal=player.grounded&&!player.traversal?planTraversal(player,Math.sin(player.a),Math.cos(player.a),nav,crowd,playerBody)?.kind:null;
      const signature=[observe?.type,observe?.wildVisitor,tree?.type,mine?.kind,mine?.type,traversal].join('|');
      if(signature!==nearKey){nearKey=signature;onNearby({observe,tree,mine,traversal});}
    }
  }
  function nearest(chop=false){
    if(!playing||!player||!land||player.traversal)return null;
    const close=(x,z)=>Math.hypot(x-player.x,z-player.z);
    const trees=land.userData.navigation.trees;
    if(chop){
      let best,minimum=1.85;
      for(const tree of trees){
        const distance=close(tree.x,tree.z);
        if(distance<minimum){minimum=distance;best={...tree,kind:'tree'};}
      }
      return best??null;
    }
    let result,minimum=2.7;
    const consider=t=>{
      const d=close(t.x,t.z);
      if(d<minimum){minimum=d;result=t;}
    };
    for(const t of shoreVisitors.targets())consider(t);
    for(const t of ecology?.targets??[])consider(t);
    for(const {object:o,agent:a} of objects.values()){
      if(a)consider({kind:'animal',type:o.type,id:o.id,x:a.x,z:a.z,agent:a});
    }
    if(result)return result;
    minimum=2.1;
    for(const tree of trees)consider({...tree,kind:'tree'});
    for(const o of world.objects){
      if(items[o.type].category==='animal')continue;
      const padding=items[o.type].category==='house'?1.15:.16;
      if(inFootprint(player.x,player.z,o,padding))
        return {kind:'object',type:o.type,id:o.id,x:o.x,z:o.z};
    }
    if(result)return result;
    const type=land.userData.field.paint(player.x,player.z);
    return type?{kind:'terrain',type,x:player.x,z:player.z}:null;
  }
  function observe(){
    const target=nearest();
    if(target?.agent){
      target.agent.rest=2.6;
      target.agent.turnTo=Math.atan2(player.x-target.x,player.z-target.z);
      if(!living){
        target.agent.heading=target.agent.turnTo;
        const entry=objects.get(target.id);
        if(entry)placeAnimal(entry,time);
        else if(!target.wildVisitor)ecology.step(time,world.light,0);
      }
    }
    schedule();
    return target;
  }
  function chop(){
    const tree=nearest(true);
    if(!tree||player.traversal||player.swing>.27||(world.game?.mode==='adventure'&&world.game.health<=0))return null;
    player.swing=1;player.weapon='axe';
    player.a=Math.atan2(tree.x-player.x,tree.z-player.z);
    schedule();
    return tree;
  }


  function nearbyMineTarget(){
    if(!playing||!player||player.traversal||(world.game?.mode==='adventure'&&world.game.health<=0))return null;
    const fixtures=[];
    for(const {object:o} of objects.values()){
      if(items[o.type].category!=='animal'&&Math.hypot(o.x-player.x,o.z-player.z)<=Math.hypot(o.w,o.d)*.5+2.1)fixtures.push(o);
    }
    const walls=fixtures.filter(o=>items[o.type].category==='house').map(o=>({id:o.id,parts:collisionParts(o)}));
    const candidates=[];
    for(const o of fixtures){
      const c=Math.cos(o.a),s=Math.sin(o.a),dx=player.x-o.x,dz=player.z-o.z;
      const lx=c*dx-s*dz,lz=s*dx+c*dz,xx=T.MathUtils.clamp(lx,-o.w/2,o.w/2),zz=T.MathUtils.clamp(lz,-o.d/2,o.d/2);
      const x=o.x+c*xx+s*zz,z=o.z-s*xx+c*zz,d=Math.hypot(player.x-x,player.z-z);
      if(d>2.05)continue;
      let blocked=false;
      for(let t=.12;t<.9;t+=.1){const px=player.x+(x-player.x)*t,pz=player.z+(z-player.z)*t;
       if(walls.some(b=>b.id!==o.id&&b.parts.some(part=>inFootprint(px,pz,part)))){blocked=true;break;}}
      if(!blocked)candidates.push({...o,d,kind:items[o.type].category==='house'?'house':items[o.type].category==='plant'?'wood':'stone'});
    }
    candidates.sort((a,b)=>a.d-b.d);
    if(candidates.length)return candidates[0];
    const x=player.x+Math.sin(yaw)*1.3,z=player.z+Math.cos(yaw)*1.3;
    if(!land.userData.navigation.valid(x,z,.5,'land'))return null;
    return {kind:'ground',x,z};
  }
  function strikeTarget(){
    if(!player||player.swing>.27)return null;
    const target=nearbyMineTarget();if(!target)return null;
    player.swing=1;player.weapon='axe';
    if(target.kind!=='ground')player.a=Math.atan2(target.x-player.x,target.z-player.z);
    schedule();return target;
  }
  function attack(){
    if(!playing||!player||player.traversal||world.game?.mode!=='adventure'||world.game.health<=0||player.swing>.27)return null;
    player.swing=1;player.weapon=world.game.sword?'sword':'axe';const result=adventure.attack(player,world.game.sword?30:15);schedule();return result;
  }

  function reset(top=false){
    camera.position.copy(top ? new T.Vector3(0,46,.9) : home);
    camera.zoom=top ? .85 : 1;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    if(region?.continuous){const [sx,sz]=tileShift(region.x,region.z);camera.position.x+=sx;camera.position.z+=sz;controls.target.x+=sx;controls.target.z+=sz;}
    controls.update();
    schedule();
  }
  function snapshot(){
    const wasLine=footprintLine.visible,wasMarker=marker.visible,wasCorners=corners.visible,wasBorder=border.visible;
    footprintLine.visible=marker.visible=corners.visible=border.visible=false;
    draw();
    const c=document.createElement('canvas');
    c.width=canvas.width;c.height=canvas.height;
    const ctx=c.getContext('2d');
    const gradient=ctx.createRadialGradient(c.width*.5,c.height*.45,0,c.width*.5,c.height*.45,Math.max(c.width,c.height)*.71);
    const shades={day:['#edf0df',themes[world.theme].sky],gold:['#f5e0c2','#b7b39c'],night:['#47596c','#202f40']}[world.light];
    gradient.addColorStop(0,shades[0]);gradient.addColorStop(1,shades[1]);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(canvas,0,0);
    footprintLine.visible=wasLine;marker.visible=wasMarker;corners.visible=wasCorners;border.visible=wasBorder;
    schedule();
    return new Promise(resolve=>c.toBlob(resolve,'image/png'));
  }
  return {update,cameraMode,reset,snapshot,focusPoint,projectGround,frameFrontier,releaseFrontier,showFrontier(preview){frontierOverlay(preview);schedule();},clearPreview,cursor,showFootprint,showObject,showStroke,
    showFenceHandles(stroke){fenceHandles.show(playing?null:stroke);schedule();},
    roadAt(x,z){return Boolean(land?.userData.field.type(2,x,z));},
    beginWalk,endWalk,observe,chop,attack,strikeTarget,startChallenge(){return playing&&adventure.start(player);},
    walkPosition(){return player?{x:player.x,y:player.y,z:player.z}:null;},
    focusRegion(x,z){
      if(!region?.continuous)return;
      const [sx,sz]=tileShift(x,z),dx=sx-controls.target.x,dz=sz-controls.target.z;
      camera.position.x+=dx;camera.position.z+=dz;controls.target.x=sx;controls.target.z=sz;
      controls.update();update(world,{...region,x,z});
    },
    refreshModels(type){
      if(!world)return;
      shoreVisitors.refreshModel(type);
      for(const entry of objects.values())if(entry.object.type===type){
        const {object:o,agent:a}=entry;disposeGroup(entry.group);
        entry.group=buildObject(kit,o,world,land.userData.field);scene.add(entry.group);
        entry.spinners=[];entry.group.traverse(child=>{if(child.userData.spin)entry.spinners.push(child);});
        if(a)placeAnimal(entry,time);
      }
      if(previewObject?.userData.object?.type===type)clearPreview();
      updateAnimalDetail();renderer.shadowMap.needsUpdate=true;schedule();
    },
    quality(value){
      quality=value==='auto'?(modest?'low':'balanced'):value;
      renderer.shadowMap.enabled=quality!=='low';
      sun.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);
      sun.shadow.map?.dispose();sun.shadow.map=null;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality==='low'?1:quality==='high'?1.65:1.3));
      if(world)update({...world,strokes:[...world.strokes]},region);
      schedule();
    },
    move(key,on){if(on)movement.add(key);else movement.delete(key);schedule();},
    jump(on=true){if(!playing||!player)return;if(on)requestJump(player);else releaseJump(player);schedule();},
    steer(side,forward){analog={side,forward};schedule();},
    toggleRun(){runLatch=!runLatch;schedule();return runLatch;},
    recenter(){if(player)yaw=player.a;pitch=.30;schedule();},
    clearMovement,
    canPlace(o){
      const r=animalRadius(o),kind=typeOf(o);
      return land.userData.navigation.valid(o.x,o.z,r,kind)&&crowd.fits(o.x,o.z,r,kind,objects.get(o.id)?.agent);
    },
    depth(x,z){return land?.userData.field.depth(x,z)??0;},
    motion(active){living=active;schedule();}
  };
}
