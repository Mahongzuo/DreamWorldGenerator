import {inside} from './sandbox-state.js';
import {modelDefinitions} from './asset-registry.js';
import {contains} from './territory.js';
import {createShoreSurvey,shoreReport,visitorRadius,visitorTypes} from './shore-habitat.js';

const kinds={frog:'land',kingfisher:'fly',dipper:'fly','meadow-hare':'land','sea-gull':'fly','shore-crab':'land'};
const flies=type=>kinds[type]==='fly';
const idleClip=type=>flies(type)?'Perch':type==='shore-crab'?'Idle':'Crouch';
const lift=type=>type==='shore-crab'?0:type==='meadow-hare'?.37:.18;
const groundTime=type=>type==='shore-crab'?1.15:type==='meadow-hare'?.60:.48;
const flightTime=type=>type==='sea-gull'?1.85:type==='dipper'?.83:1.05;
const clamp=t=>Math.max(0,Math.min(1,t));
const squared=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
const same=(a,b)=>a&&b&&squared(a,b)<.035**2&&Math.abs((a.y??0)-(b.y??0))<.035;

function samplePath(path,t) {
  const {from,to,hop}=path,u=clamp(t);
  const curved=path.bendX||path.bendZ;
  // Two half-ellipses meet with the same tangent as the bird banks back to shore.
  const progress=curved?(1-Math.cos(Math.PI*u))*.5:u;
  const arc=curved?Math.sin(Math.PI*u):0;
  return {x:from.x+(to.x-from.x)*progress+arc*(path.bendX??0),z:from.z+(to.z-from.z)*progress+arc*(path.bendZ??0),
    y:from.y+(to.y-from.y)*progress+4*progress*(1-progress)*hop};
}

// Designers' objects are permanent. These temporary visitors have independent identities and never enter world.objects.
export function createShoreVisitors({makeModel,removeModel,paintModel,onReport=()=>{}}) {
  const surveyor=createShoreSurvey(),visitors=new Map(),waiting=new Map();
  let world,field,nav,crowd,survey,focus,report,lastReport='',heldResidents=0,refreshClock=0,elapsed=0;
  let previousWorld,previousCenter;
  function allowed(p,type,body) {
    const radius=visitorRadius[type];
    const bounds = world.regions?contains(world.regions,p.x,p.z,radius):inside(p.x,p.z,radius);
    const height=modelDefinitions[type].maxHeight;
    if(!bounds || crowd.contact(p.x,p.z,radius,kinds[type],body,p.y,height))return false;
    if(!flies(type))return nav.valid(p.x,p.z,radius,'land') && Math.abs(nav.height(p.x,p.z)-field.height(p.x,p.z))<.12;
    const nearSeat=body?.perch && squared(body.perch,p)<.42**2;
    if(type!=='kingfisher' && p.y-field.height(p.x,p.z)<.45 && crowd.contact(p.x,p.z,radius,'land',body,p.y,height))return false;
    const clearance=type==='kingfisher'?(nearSeat?.13:.24):radius;
    return !nav.cameraBlocked(p.x,p.y+clearance+.06,p.z,clearance);
  }
  function clearPath(path,type,body) {
    const steps=Math.ceil(Math.max(.1,Math.hypot(path.to.x-path.from.x,path.to.z-path.from.z,path.to.y-path.from.y))/.14);
    if(!path.bendX&&!path.bendZ&&!crowd.clearPath(path.from.x,path.from.z,path.to.x,path.to.z,visitorRadius[type],kinds[type],body))return false;
    for(let i=0;i<=steps;i++)if(!allowed(samplePath(path,i/steps),type,body))return false;
    return true;
  }
  function startPath(a,from,to,duration,state,curve) {
    const path={from,to,duration,hop:curve};
    if((a.type==='sea-gull'||a.type==='dipper')&&(state==='out'||state==='return')){
      const bend=a.type==='sea-gull'?.28:.16;
      path.bendX=(to.z-from.z)*bend;path.bendZ=(from.x-to.x)*bend;
    }
    if(!clearPath(path,a.type,a.body))return false;
    a.path=path;a.clock=0;a.state=state;
    a.body.heading=Math.atan2(to.x-from.x,to.z-from.z);
    return true;
  }
  function safeFlight(site,body) {
    const seat=site.seat, angle=Math.atan2(site.pool.x-seat.x,site.pool.z-seat.z);
    for(const distance of (site.type==='sea-gull'?[4.5,2.7,1.3]:site.type==='dipper'?[2.7,1.75,.8]:[2.15,1.3,.70]))for(const offset of [0,.5,-.5,1,-1,1.8,-1.8,Math.PI]){
      const a=angle+offset,x=seat.x+Math.sin(a)*distance,z=seat.z+Math.cos(a)*distance;
      const perchHeight=seat.y+Math.min(site.type==='dipper'?.50:2.1,distance*.5);
      const point={x,z,y:Math.max(perchHeight,field.height(x,z)+.65)};
      if(clearPath({from:point,to:seat,hop:.12},site.type,body))return point;
    }
    return null;
  }
  function hopPoint(site,body,phase) {
    const origin=body??site.seat;
    const distances=site.type==='meadow-hare'?[1.30,.8,.48]:site.type==='shore-crab'?[.78,.52,.28]:[.63,.38,.23];
    for(const distance of distances)for(let i=0;i<12;i++){
      const angle=phase+i*Math.PI/6, x=origin.x+Math.sin(angle)*distance,z=origin.z+Math.cos(angle)*distance;
      if((x-site.seat.x)**2+(z-site.seat.z)**2>(site.type==='meadow-hare'?2.3:1.05)**2)continue;
      const dest={x,z,y:field.height(x,z)};
      if(clearPath({from:{x:origin.x,z:origin.z,y:field.height(origin.x,origin.z)},to:dest,hop:lift(site.type)},site.type,body))return dest;
    }
    return null;
  }
  function drop(a) {
    a.body.crowd?.remove(a.body);removeModel(a.model);visitors.delete(a.key);
    lastReport='';
  }
  function bodyPosition(a,p) {
    Object.assign(a.body,p);
    crowd.update(a.body);
  }
  function paint(a,motion,phase,step) {
    paintModel(a.model,{x:a.body.x,y:a.body.y,z:a.body.z,heading:a.body.heading,
      type:a.type,motion,phase,delta:step,detail:a.detail});
  }
  function rest(a) {
    a.state='rest';a.path=null;a.clock=0;a.cycles++;
    a.delay=(flies(a.type)?a.type==='dipper'?4:9:a.type==='shore-crab'?1.8:2.8)+(a.cycles*1.618+a.site.anchor)%3;
    a.body.turnTo=null;
  }
  function spawn(site) {
    if(visitors.size>=6)return false;
    const {type}=site,range=visitorRadius[type],flying=flies(type);
    let seat,body,start;
    for(const landing of new Set([site.seat,...site.banks])){
      seat={...landing,y:landing.y??field.height(landing.x,landing.z)};
      body={...seat,perch:flying?seat:null,r:range,h:modelDefinitions[type].maxHeight,kind:kinds[type],heading:0,crowd,cell:null,rest:0,turnTo:null};
      if(!allowed(seat,type,body))continue;
      start=flying?safeFlight({...site,seat},body):hopPoint({...site,seat},body,site.anchor*1.34);
      if(!flying||start)break;
    }
    if(!allowed(seat,type,body)||(flying&&!start))return false;
    const key=type+'/'+site.anchor;
    const a={key,type,site,home:seat,body,model:makeModel(type,site.anchor,world,field),state:'rest',cycles:0,detail:true,debt:0,delay:0,clock:0,path:null};
    visitors.set(key,a);
    rest(a);
    if(start && startPath(a,start,seat,flies(type)?flightTime(type):groundTime(type),'arrive',flies(type)?.12:lift(type)))bodyPosition(a,start);
    else bodyPosition(a,seat);
    paint(a,flies(type)?'Fly':idleClip(type),undefined,.016);
    lastReport='';
    return true;
  }
  function leave(a) {
    if(a.state==='depart')return;
    const start={x:a.body.x,y:a.body.y,z:a.body.z};
    if(!allowed(start,a.type,a.body)){drop(a);return;}
    let dest;
    if(!flies(a.type))dest=hopPoint({...a.site,seat:start},a.body,a.body.heading);
    else {
      const fake={...a.site,seat:start};
      dest=safeFlight(fake,a.body);
    }
    if(!dest||!startPath(a,start,dest,flies(a.type)?flightTime(a.type):groundTime(a.type),'depart',flies(a.type)?.12:lift(a.type))){drop(a);return;}
    lastReport='';
  }
  function updateReport() {
    if(!report)return;
    const result={heldResidents};
    for(const type of visitorTypes){
      const choice=report[type], actor=visitors.get(type+'/'+choice.anchor);
      result[type]={checks:choice.checks, state:actor&&actor.state!=='depart'?'here':choice.blocked?'blocked':choice.ready?'waiting':'missing'};
    }
    const signature=JSON.stringify(result);
    if(signature!==lastReport){lastReport=signature;onReport(result);}
  }
  function watch(point,force=false) {
    if(!survey)return;
    if(!force && focus && squared(focus,point)<2.5**2)return;
    focus={x:point.x,z:point.z};
    if(!force)selectHabitats(focus,false);
    report=shoreReport(survey,field,nav,focus);
    updateReport();
  }
  function update(next,newField,newNav,newCrowd,center,held=0) {
    world=next;field=newField;nav=newNav;heldResidents=held;
    const viewChanged=!previousCenter||squared(center,previousCenter)>1;
    const layoutChanged=!previousWorld||previousWorld.objects!==world.objects||previousWorld.strokes!==world.strokes||
      previousWorld.regions!==world.regions||previousWorld.felled!==world.felled||previousWorld.seed!==world.seed||previousWorld.theme!==world.theme||previousWorld.season!==world.season;
    const oldSurvey=survey;
    if(viewChanged||layoutChanged)survey=surveyor.update(world,field,nav,center);
    previousWorld=next;previousCenter=center;
    const rebound=crowd!==newCrowd;
    if(rebound){
      for(const a of visitors.values()){a.body.crowd.remove(a.body);a.body.crowd=newCrowd;}
      crowd=newCrowd;
    }
    if(oldSurvey===survey&&!rebound){updateReport();return;}
    const anchor=!viewChanged && focus?focus:center;
    selectHabitats(anchor,true);
    if(survey!==oldSurvey||!report)watch(anchor,true);
    else updateReport();
  }
  function selectHabitats(center,refresh) {
    const active=new Map();
    for(const type of visitorTypes){
      const sites=survey.options[type].filter(s=>s.ready);
      sites.sort((a,b)=>squared(a.at,center)-squared(b.at,center)||a.anchor-b.anchor);
      for(const s of sites.slice(0,2))active.set(type+'/'+s.anchor,s);
    }
    // A dense mixed-theme frontier shares one small budget across all six species.
    if(active.size>6){
      const ranked=[...active].sort((a,b)=>squared(a[1].at,center)-squared(b[1].at,center));
      active.clear();
      for(const [key,site] of ranked.slice(0,6))active.set(key,site);
    }
    if(!refresh && active.size===waiting.size && [...active.keys()].every(key=>waiting.has(key)))return;
    for(const [key,a] of visitors){
      const site=active.get(key);
      const perchGone=site && flies(a.type) && ![site.seat,...site.banks].some(p=>same(a.home,p));
      if(!site || !same(a.site.seat,site.seat) || perchGone || !allowed(a.body,a.type,a.body)){
        leave(a);
        if(a.state==='depart'&&visitors.has(key))crowd.update(a.body);
      } else {
        a.site=site;
        if(a.state==='depart'){drop(a);}
        else crowd.update(a.body);
      }
    }
    for(const key of waiting.keys())if(!active.has(key))waiting.delete(key);
    for(const [key,site] of active){
      const previous=waiting.get(key);
      waiting.set(key,{site,due:previous?.due??elapsed+1.2+(site.anchor%5)*.4});
    }
  }
  function advance(a,dt,animate) {
    // Ground visitors stay responsive to observation and collision even when distant animation is throttled.
    if(a.body.rest>0){a.body.rest=Math.max(0,a.body.rest-dt);if(a.state==='rest'&&Number.isFinite(a.body.turnTo)){
      const delta=Math.atan2(Math.sin(a.body.turnTo-a.body.heading),Math.cos(a.body.turnTo-a.body.heading));
      a.body.heading+=Math.max(-dt*2,Math.min(dt*2,delta));
    }}
    a.clock+=dt;
    if(a.path){
      const path=a.path,t=clamp(a.clock/path.duration),p=samplePath(path,t);
      if(!allowed(p,a.type,a.body)||!crowd.clearPath(a.body.x,a.body.z,p.x,p.z,a.body.r,a.body.kind,a.body)){
        if(!flies(a.type) && a.state!=='depart' && nav.valid(a.body.x,a.body.z,a.body.r,'land')){
          a.body.y=field.height(a.body.x,a.body.z);rest(a);
          paint(a,idleClip(a.type),undefined,dt);
        }else drop(a);
        return;
      }
      if(a.type==='shore-crab')p.y=field.height(p.x,p.z);
      if(path.bendX||path.bendZ){
        const forward=.5*Math.sin(Math.PI*t),side=Math.cos(Math.PI*t);
        a.body.heading=Math.atan2((path.to.x-path.from.x)*forward+side*path.bendX,
          (path.to.z-path.from.z)*forward+side*path.bendZ);
      }
      bodyPosition(a,p);
      let clip,phase;
      if(a.type==='shore-crab'){clip='Scuttle';}
      else if(!flies(a.type)){clip='Leap';phase=t;}
      else if((a.state==='arrive'||a.state==='return')&&t>.72){clip='Land';phase=(t-.72)/.28;}
      else if((a.state==='depart'||a.state==='out')&&t<.27){clip='Takeoff';phase=t/.27;}
      else clip='Fly';
      paint(a,clip,phase,dt);
      if(t<1)return;
      if(a.state==='depart'){drop(a);return;}
      if(a.state==='out'){
        if(startPath(a,path.to,a.home,flightTime(a.type),'return',.12))return;
        drop(a);return;
      }
      if(!flies(a.type)&&a.type!=='shore-crab'){a.state='settle';a.clock=0;a.path=null;}
      else rest(a);
      return;
    }
    if(a.state==='settle'){
      paint(a,'Settle',clamp(a.clock/.25),dt);
      if(a.clock>=.25)rest(a);
      return;
    }
    if(a.state==='gather'){
      paint(a,'Gather',clamp(a.clock/.25),dt);
      if(a.clock>=.25){
        const start={x:a.body.x,y:a.body.y,z:a.body.z};
        if(!startPath(a,start,a.next,groundTime(a.type),'hop',lift(a.type)))rest(a);
      }
      return;
    }
    paint(a,idleClip(a.type),undefined,animate?dt:0);
    if(!animate||a.clock<a.delay||a.body.rest>0)return;
    if(!flies(a.type)){
      const dest=hopPoint({...a.site,seat:a.home},a.body,a.cycles*2.4);
      if(!dest){rest(a);return;}
      if(a.type==='shore-crab'){
        const start={x:a.body.x,y:a.body.y,z:a.body.z};
        if(!startPath(a,start,dest,groundTime(a.type),'scuttle',0))rest(a);
      }else {a.state='gather';a.clock=0;a.next=dest;}
    } else {
      const dest=safeFlight({...a.site,seat:a.home},a.body);
      if(!dest||!startPath(a,a.home,dest,flightTime(a.type),'out',.12))rest(a);
    }
  }
  function step(dt,animate=true,viewer=focus,low=false) {
    if(!survey||!dt)return;
    elapsed+=dt;
    refreshClock-=dt;
    if(refreshClock<=0){
      refreshClock=.35;
      for(const [key,w] of waiting)if(!visitors.has(key)&&elapsed>=w.due){if(!spawn(w.site))w.due=elapsed+1.2;}
      updateReport();
    }
    for(const a of visitors.values()){
      const close=viewer&&squared(a.body,viewer)<(low?12:17)**2;
      a.debt+=dt;
      if(a.debt < (close?(low?1/22:1/30):.15))continue;
      a.detail=!!close;advance(a,a.debt,animate);a.debt=0;
    }
  }
  return {update,step,watch,
    moving(){return [...waiting.keys()].some(k=>!visitors.has(k))||[...visitors.values()].some(a=>a.state!=='rest');},
    targets(){
      const list=[];
      for(const a of visitors.values())if(a.state!=='depart' && (!flies(a.type)||a.state==='rest')){
        list.push({kind:'animal',wildVisitor:true,type:a.type,x:a.body.x,z:a.body.z,agent:a.body});
      }
      return list;
    },
    refreshModel(type){for(const a of visitors.values())if(a.type===type){
      removeModel(a.model);a.model=makeModel(type,a.site.anchor,world,field);
      paint(a,a.state==='rest'||!flies(a.type)?idleClip(a.type):'Fly',undefined,.016);
    }},
    count:()=>visitors.size};
}
