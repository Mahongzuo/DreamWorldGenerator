import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createKit, disposeGroup} from './model.js';
import {buildLand, buildObject, objectHeight} from './sandbox-model.js';
import {baseHeight, flyingAnimal, footprint, inFootprint, items, LAND, MAX_POINTS, themes, tileKey, tileShift, waterAnimal} from './sandbox-state.js';
import {buildEcology} from './ecology.js';
import {architectureHeight} from './asset-models.js';
import {buildAvatar} from './creatures.js';
import {makeWander, wander} from './navigation.js';

const lighting = {
  day:{sky:'#f0f6e3',ground:'#a7af8d',ambient:2.08,sun:'#ffeccb',power:2.36,exposure:1.08,position:[-10,17,11],glass:.22},
  gold:{sky:'#ffe0bd',ground:'#8a8c75',ambient:1.81,sun:'#ffc18a',power:3.30,exposure:1.09,position:[-13,9,9],glass:.58},
  night:{sky:'#8fbaff',ground:'#627990',ambient:1.17,sun:'#99bcff',power:1.02,exposure:1.10,position:[9,15,-6],glass:1.28}
};

export function createViewport(stage,onMetrics,onInput,onRegion,onNearby) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));
  renderer.shadowMap.enabled=true;
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
  controls.mouseButtons.MIDDLE=T.MOUSE.PAN;
  camera.position.copy(home);
  controls.update();

  const sky=new T.HemisphereLight(),sun=new T.DirectionalLight();
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
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
  const border=new T.LineLoop(new T.BufferGeometry().setAttribute('position',
    new T.BufferAttribute(new Float32Array(borderPoints*3),3)),
    new T.LineDashedMaterial({color:'#fff3cb',transparent:true,opacity:.63,dashSize:.29,gapSize:.22,depthWrite:false}));
  border.frustumCulled=false;
  border.visible=false;
  scene.add(marker,footprintLine,stamps,corners,border);

  let pending=0,last=0,lifeTimer=0,time=0,metric='',paused=false,land,world,region,ecology,previewObject,hiddenObject;
  let gesture=null,orbitMode=false,living=false,playing=false,player,lookDrag,nearKey='';
  let yaw=Math.PI,lift=2.55;
  const movement=new Set();
  const cameraGoal=new T.Vector3(),lookGoal=new T.Vector3();
  const surroundings=new Map();
  const objects=new Map();
  const raycaster=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  const hit=new T.Vector3(), localHit=new T.Vector3(), inverse=new T.Matrix4(), localRay=new T.Ray(), box=new T.Box3();

  function schedule(){
    if(lifeTimer){clearTimeout(lifeTimer);lifeTimer=0;}
    if(!pending && !paused && !document.hidden) pending=requestAnimationFrame(tick);
  }
  function draw(){
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
    if(playing)walk(delta);
    else controls.update(delta);
    if(region&&orbitMode&&!playing){
      const dx=Math.floor((controls.target.x+LAND.x)/(LAND.x*2));
      const dz=Math.floor((controls.target.z+LAND.z)/(LAND.z*2));
      if(dx||dz)onRegion(dx,dz,true);
    }
    if((living||playing)&&ecology){
      if(living){time+=delta;kit.time.value=time;}
      ecology.step(time,world.light,living?delta:0);
      stepAnimals(living?delta:0);
    }
    draw();
    if(playing||controls.autoRotate) schedule();
    else if(living&&!pending)lifeTimer=setTimeout(schedule,28);
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
      const isHouse=items[o.type].category==='house';
      const h=o.type==='tower'?7.2:isHouse?architectureHeight(items[o.type].form,o.w):
        items[o.type].category==='plant'?o.w*3.1:o.w*1.45;
      box.min.set(-o.w/2,-.04,-o.d/2);
      box.max.set(o.w/2,h,o.d/2+.21);
      group.updateMatrixWorld();
      inverse.copy(group.matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(inverse);
      if(!localRay.intersectBox(box,localHit)) continue;
      const dist=localHit.applyMatrix4(group.matrixWorld).distanceToSquared(raycaster.ray.origin);
      if(dist<closest){closest=dist;result.id=id;}
    }
    return result;
  }
  canvas.addEventListener('pointerdown',(e)=>{
    if(playing&&e.button===0){
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
        yaw-=(e.clientX-lookDrag.x)*.008;
        lift=T.MathUtils.clamp(lift+(e.clientY-lookDrag.y)*.018,1.35,4.8);
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
  canvas.addEventListener('pointerup',e=>finish(e,false));
  canvas.addEventListener('pointercancel',e=>finish(e,true));
  canvas.addEventListener('lostpointercapture',e=>finish(e,true));
  canvas.addEventListener('pointerleave',()=>{if(gesture===null) onInput('leave',null);});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  function clearPreview(){
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
  function cursor(p,r=0.38,valid=true){
    marker.visible=Boolean(p);
    if(p){
      marker.material.color.set(valid?'#fff0b2':'#fa9987');
      marker.position.set(p.x,visibleGround(p.x,p.z)+.045,p.z);
      marker.scale.set(r,r,1);
    }
    schedule();
  }
  function showFootprint(o,valid=true,handles=false){
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
    if(!next||next.w!==o.w||next.d!==o.d||next.type!==o.type||next.id!==o.id) {
      if(previewObject) disposeGroup(previewObject);
      previewObject=buildObject(kit,o,world,land.userData.field);
      previewObject.traverse(m=>{if(m.isMesh)m.castShadow=false;});
      scene.add(previewObject);
    } else {
      previewObject.position.set(o.x,objectHeight(land.userData.field,o),o.z);
      previewObject.rotation.y=o.a;
    }
    hiddenObject=source?.group;
    if(hiddenObject) hiddenObject.visible=false;
    showFootprint(o,valid,Boolean(id));
  }
  function showStroke(stroke){
    const {p,w,type}=stroke;
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
    if(!region)return;
    const position=border.geometry.attributes.position, field=land.userData.field;
    const edge=[[-LAND.x,-LAND.z],[-LAND.x,LAND.z],[LAND.x,LAND.z],[LAND.x,-LAND.z]];
    const perSide=borderPoints/4;
    for(let j=0;j<4;j++){
      const a=edge[j], b=edge[(j+1)%4];
      for(let i=0;i<perSide;i++){
        const x=T.MathUtils.lerp(a[0],b[0],i/perSide), z=T.MathUtils.lerp(a[1],b[1],i/perSide);
        position.setXYZ(j*perSide+i,x,field.height(x,z)+.051,z);
      }
    }
    position.needsUpdate=true;
    border.computeLineDistances();
  }
  function fillNeighbors(){
    const wanted=new Set();
    if(region){
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(dx===0&&dz===0)continue;
        const x=region.x+dx,z=region.z+dz,key=tileKey(x,z);
        wanted.add(key);
        const next=region.read(x,z);
        let entry=surroundings.get(key);
        if(entry?.world!==next){
          if(entry)disposeGroup(entry.land);
          const adjacent=buildLand(kit,next,{x,z,coarse:true});
          for(const o of next.objects){
            const group=buildObject(kit,o,next,adjacent.userData.field);
            group.traverse(m=>{if(m.isMesh)m.castShadow=false;});
            adjacent.add(group);
          }
          scene.add(adjacent);
          entry={land:adjacent,world:next};
          surroundings.set(key,entry);
        }
        const [sx,sz]=tileShift(dx,dz);
        entry.land.position.set(sx,0,sz);
      }
    }
    for(const [key,entry] of surroundings){
      if(!wanted.has(key)){disposeGroup(entry.land);surroundings.delete(key);}
    }
  }
  function shiftRegion(dx,dz){
    const [x,z]=tileShift(dx,dz);
    camera.position.x-=x;camera.position.z-=z;
    controls.target.x-=x;controls.target.z-=z;
    if(player&&playing){
      player.x-=x;player.z-=z;
      follow.position.x-=x;follow.position.z-=z;
      cameraGoal.x-=x;cameraGoal.z-=z;
    }
    controls.update();
  }
  function update(next,nextRegion=null){
    clearPreview();
    const regionChange=region?.x!==nextRegion?.x||region?.z!==nextRegion?.z;
    region=nextRegion;
    const objectsChanged=!world||regionChange||next.objects!==world.objects||next.season!==world.season||next.seed!==world.seed;
    const spatial=o=>items[o.type].category!=='animal';
    const layout=objectsChanged?next.objects.filter(spatial):[];
    const oldLayout=objectsChanged?world?.objects.filter(spatial):[];
    const terrainObjectsChanged=!oldLayout||layout.length!==oldLayout.length||layout.some((o,i)=>{
      const old=oldLayout[i];
      return o!==old&&['x','z','w','d','a','type'].some(key=>o[key]!==old[key]);
    });
    const landChange=!world||regionChange||terrainObjectsChanged||['theme','season','seed','strokes','biome','felled'].some(key=>next[key]!==world[key]);
    const lightChange=!world||next.light!==world.light;
    if(regionChange){
      controls.maxPolarAngle=region?1.13:Math.PI*.48;
      controls.minZoom=region ? .83 : .60;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,region?1.30:1.65));
      scene.fog=region?new T.Fog('#dce8d6',46,81):null;
      fillNeighbors();
      resize();
    }
    if(landChange){
      const oldLand=land;
      land=buildLand(kit,next,region);
      scene.add(land);
      if(oldLand)disposeGroup(oldLand);
      updateBorder();
      ecology?.dispose();
      ecology=buildEcology(next,land.userData.field,region,land.userData.navigation);
      ecology.step(time,next.light);
      scene.add(ecology.group);
    }
    if(landChange||objectsChanged){
      for(const [id,entry] of objects){
        const o=next.objects.find(o=>o.id===id);
        if(o!==entry.object||regionChange||next.season!==world?.season||next.seed!==world?.seed){
          disposeGroup(entry.group);
          objects.delete(id);
        }
      }
      for(const o of next.objects){
        const entry=objects.get(o.id);
        if(entry){
          entry.group.position.y=objectHeight(land.userData.field,o);
          if(items[o.type].category==='animal'&&landChange)bindAnimal(entry);
        }else{
          const group=buildObject(kit,o,next,land.userData.field);
          scene.add(group);
          const made={group,object:o,agent:null,spinners:[]};
          group.traverse(child=>{if(child.userData.spin)made.spinners.push(child);});
          objects.set(o.id,made);
          if(items[o.type].category==='animal')bindAnimal(made);
        }
      }
    }
    if(lightChange){
      const look=lighting[next.light];
      sky.color.set(look.sky);sky.groundColor.set(look.ground);sky.intensity=look.ambient;
      sun.color.set(look.sun);sun.intensity=look.power;sun.position.set(...look.position);
      renderer.toneMappingExposure=look.exposure;
      kit.materials.window.emissiveIntensity=look.glass;
      stage.dataset.light=next.light;
      ecology.step(time,next.light);
    }
    if(scene.fog&&(lightChange||regionChange))scene.fog.color.set({day:'#dce8d6',gold:'#e4cba9',night:'#334659'}[next.light]);
    if(lightChange||landChange||objectsChanged){
      accents.clear();
      if(next.light!=='day'){
        for(const o of next.objects.filter(o=>['fire','lantern'].includes(o.type)).slice(0,5)){
          const fire=o.type==='fire';
          const light=new T.PointLight(fire?'#ff9d50':'#ffc57d',next.light==='night'?9:3,4.8,2);
          light.position.set(o.x,land.userData.field.height(o.x,o.z)+(fire?.40:o.w),o.z);
          accents.add(light);
        }
      }
      renderer.shadowMap.needsUpdate=true;
    }
    stage.style.setProperty('--scene-tint',themes[next.theme].sky);
    world=next;
    if(player&&playing){
      player.tile=currentTile();
      const nav=land.userData.navigation;
      const safe=nav.find(player.x,player.z,.25,'land',2)??nav.find(0,5.45,.25,'land',8);
      if(safe){player.x=safe.x;player.z=safe.z;}
    }else if(player){
      avatar.group.visible=player.tile===currentTile();
      if(avatar.group.visible)avatar.group.position.y=land.userData.navigation.height(player.x,player.z);
    }
    schedule();
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
  const currentTile=()=>region?tileKey(region.x,region.z):'diorama';
  const typeOf=o=>waterAnimal(o)?'water':flyingAnimal(o)?'fly':'land';
  const animalRadius=o=>Math.max(.11,o.w*(items[o.type].form==='fish'?.40:.57));

  function bindAnimal(entry){
    const {object:o,group}=entry;
    const nav=land.userData.navigation;
    const previous=entry.agent;
    entry.agent=makeWander(nav,previous?.x??o.x,previous?.z??o.z,animalRadius(o),typeOf(o),o.a+o.id*1.37,1.52+o.w*.65);
    if(entry.agent){
      entry.agent.homeX=o.x;entry.agent.homeZ=o.z;
      group.visible=true;
      placeAnimal(entry,time);
    }else group.visible=false;
  }
  function placeAnimal(entry,t){
    const {group,object:o,agent:a}=entry;
    const {field,navigation:nav}=land.userData;
    const hover=['butterfly','dragonfly','bee'].includes(items[o.type].form)?.62:1.77;
    const y=a.kind==='water'?field.level+.037+Math.sin(t*2.8+a.seed)*.021:
      a.kind==='fly'?field.height(a.x,a.z)+hover+Math.sin(t*3+a.seed)*.18:
      nav.height(a.x,a.z)+Math.abs(Math.sin(t*5+a.seed))*(a.rest>0?0:.032);
    group.position.set(a.x,y,a.z);
    group.rotation.set(0,a.heading,a.kind==='fly'?Math.sin(t*3+a.seed)*.19:0);
  }
  function stepAnimals(dt){
    const nav=land.userData.navigation;
    for(const entry of objects.values()){
      const {agent:a,object:o}=entry;
      if(a){
        wander(nav,a,dt,a.kind==='fly'?.75:a.kind==='water'?.50:.52+o.w*.16);
        placeAnimal(entry,time);
      }
      for(const spinner of entry.spinners)spinner.rotation.z-=dt*spinner.userData.spin;
    }
  }

  function beginWalk(x,z){
    if(!land)return false;
    const nav=land.userData.navigation;
    const reuse=x===undefined&&player?.tile===currentTile();
    const safe=nav.find(x??(reuse?player.x:0.10),z??(reuse?player.z:5.45),.25,'land',4.5);
    if(!safe)return false;
    player={...safe,tile:currentTile(),a:reuse?player.a:Math.PI,t:0,swing:0,y:nav.height(safe.x,safe.z)};
    yaw=player.a;lift=2.55;playing=true;
    movement.clear();
    controls.enabled=false;
    avatar.group.visible=true;
    stage.classList.add('walking');
    clearPreview();showFootprint(null);
    border.visible=false;
    walk(0);
    follow.position.copy(cameraGoal);
    follow.lookAt(lookGoal);
    schedule();
    return true;
  }
  function endWalk(){
    if(!playing)return;
    playing=false;lookDrag=null;movement.clear();
    controls.enabled=true;
    stage.classList.remove('walking');
    nearKey='';onNearby(null);
    schedule();
  }
  function walk(dt){
    if(!player||!land)return;
    const forward=Number(movement.has('forward'))-Number(movement.has('back'));
    const side=Number(movement.has('right'))-Number(movement.has('left'));
    const fast=movement.has('run'),speed=(fast?4.25:2.75)*dt;
    const length=Math.hypot(side,forward)||1;
    const dx=(Math.sin(yaw)*forward-Math.cos(yaw)*side)*speed/length;
    const dz=(Math.cos(yaw)*forward+Math.sin(yaw)*side)*speed/length;
    let moved=false;
    const nav=land.userData.navigation;
    const can=(x,z)=>{
      if(region&&(Math.abs(x)>LAND.x-.32||Math.abs(z)>LAND.z-.32)){
        const edgeX=T.MathUtils.clamp(x,-LAND.x+.323,LAND.x-.323);
        const edgeZ=T.MathUtils.clamp(z,-LAND.z+.323,LAND.z-.323);
        return nav.valid(edgeX,edgeZ,.25);
      }
      return nav.sweep(player.x,player.z,x,z,.25,'land');
    };
    if(Math.hypot(dx,dz)>.0001){
      for(const [xx,zz] of [[dx,dz],[dx,0],[0,dz]]){
        if(!Math.hypot(xx,zz)||!can(player.x+xx,player.z+zz))continue;
        player.x+=xx;player.z+=zz;
        player.a=Math.atan2(xx,zz);moved=true;break;
      }
    }
    if(region){
      const rx=Math.floor((player.x+LAND.x)/(LAND.x*2));
      const rz=Math.floor((player.z+LAND.z)/(LAND.z*2));
      if(rx||rz)onRegion(rx,rz,true);
    }
    const height=land.userData.navigation.height(player.x,player.z);
    player.y=dt?T.MathUtils.lerp(player.y,height,Math.min(1,dt*15)):height;
    player.t+=dt*(moved?(fast?1.43:1):.30);
    player.swing=Math.max(0,player.swing-dt*2.2);
    avatar.group.position.set(player.x,player.y,player.z);
    avatar.group.rotation.y=player.a;
    avatar.pose(player.t,moved,player.swing);
    const back=4.10+(lift-2.55)*.34;
    const x=player.x-Math.sin(yaw)*back,z=player.z-Math.cos(yaw)*back;
    let distance=back;
    for(let d=.6;d<back;d+=.29){
      const gx=player.x-Math.sin(yaw)*d,gz=player.z-Math.cos(yaw)*d;
      if(world.objects.some(o=>items[o.type].category==='house'&&items[o.type].form!=='bridge'&&inFootprint(gx,gz,o,.17))){
        distance=Math.max(.72,d-.31);break;
      }
    }
    const cx=distance===back?x:player.x-Math.sin(yaw)*distance;
    const cz=distance===back?z:player.z-Math.cos(yaw)*distance;
    cameraGoal.set(cx,Math.max(player.y+lift,land.userData.field.height(cx,cz)+1.20),cz);
    lookGoal.set(player.x+Math.sin(yaw)*1.51,player.y+1.08,player.z+Math.cos(yaw)*1.51);
    follow.position.lerp(cameraGoal,dt?Math.min(1,dt*13):1);
    follow.lookAt(lookGoal);
    const observe=nearest(),tree=nearest(true);
    const signature=(observe?.type??'')+'|'+(tree?.type??'');
    if(signature!==nearKey){nearKey=signature;onNearby({observe,tree});}
  }
  function nearest(chop=false){
    if(!playing||!player||!land)return null;
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
      target.agent.rest=2.3;
      target.agent.heading=Math.atan2(player.x-target.x,player.z-target.z);
    }
    schedule();
    return target;
  }
  function chop(){
    const tree=nearest(true);
    if(!tree||player.swing>.27)return null;
    player.swing=1;
    player.a=Math.atan2(tree.x-player.x,tree.z-player.z);
    schedule();
    return tree;
  }

  function reset(top=false){
    camera.position.copy(top ? new T.Vector3(0,46,.9) : home);
    camera.zoom=top ? .85 : 1;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
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
  return {update,cameraMode,reset,snapshot,clearPreview,cursor,showFootprint,showObject,showStroke,shiftRegion,
    beginWalk,endWalk,observe,chop,
    move(key,on){if(on)movement.add(key);else movement.delete(key);schedule();},
    clearMovement(){movement.clear();},
    canPlace(o){return land.userData.navigation.valid(o.x,o.z,animalRadius(o),typeOf(o));},
    depth(x,z){return land?.userData.field.depth(x,z)??0;},
    motion(active){living=active;schedule();}
  };
}
