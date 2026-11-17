import {inside} from './sandbox-state.js';
import {contains} from './territory.js';
import {createShoreSurvey,shoreReport,visitorRadius} from './shore-habitat.js';

const kinds={frog:'land',kingfisher:'fly'};
const clamp=t=>Math.max(0,Math.min(1,t));
const squared=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
const same=(a,b)=>a&&b&&squared(a,b)<.035**2&&Math.abs((a.y??0)-(b.y??0))<.035;

function samplePath(path,t) {
  const {from,to,hop}=path,u=clamp(t);
  return {x:from.x+(to.x-from.x)*u,z:from.z+(to.z-from.z)*u,
    y:from.y+(to.y-from.y)*u+4*u*(1-u)*hop};
}

// Designers' objects are permanent. These temporary visitors have independent identities and never enter world.objects.
export function createShoreVisitors({makeModel,removeModel,paintModel,onReport=()=>{}}) {
  const surveyor=createShoreSurvey(),visitors=new Map(),waiting=new Map();
  let world,field,nav,crowd,survey,focus,report,lastReport='',heldResidents=0,refreshClock=0,elapsed=0;
  let previousWorld,previousCenter;
  function allowed(p,type,body) {
    const radius=visitorRadius[type];
    const bounds = world.regions?contains(world.regions,p.x,p.z,radius):inside(p.x,p.z,radius);
    if(!bounds || !crowd.fits(p.x,p.z,radius,kinds[type],body))return false;
    if(type==='frog')return nav.valid(p.x,p.z,radius,'land') && Math.abs(nav.height(p.x,p.z)-field.height(p.x,p.z))<.12;
    const nearSeat=body?.perch && squared(body.perch,p)<.42**2;
    return !nav.cameraBlocked(p.x,p.y+(nearSeat?.19:.28),p.z,nearSeat?.13:.24);
  }
  function clearPath(path,type,body) {
    const steps=Math.ceil(Math.max(.1,Math.hypot(path.to.x-path.from.x,path.to.z-path.from.z,path.to.y-path.from.y))/.14);
    if(!crowd.clearPath(path.from.x,path.from.z,path.to.x,path.to.z,visitorRadius[type],kinds[type],body))return false;
    for(let i=0;i<=steps;i++)if(!allowed(samplePath(path,i/steps),type,body))return false;
    return true;
  }
  function startPath(a,from,to,duration,state,curve) {
    const path={from,to,duration,hop:curve};
    if(!clearPath(path,a.type,a.body))return false;
    a.path=path;a.clock=0;a.state=state;
    a.body.heading=Math.atan2(to.x-from.x,to.z-from.z);
    return true;
  }
  function safeFlight(site,body) {
    const seat=site.seat, angle=Math.atan2(site.pool.x-seat.x,site.pool.z-seat.z);
    for(const distance of [2.15,1.3,.70])for(const offset of [0,.5,-.5,1,-1,1.8,-1.8,Math.PI]){
      const a=angle+offset,x=seat.x+Math.sin(a)*distance,z=seat.z+Math.cos(a)*distance;
      const perchHeight=seat.y+Math.min(1.2,distance*.5);
      const point={x,z,y:Math.max(perchHeight,field.height(x,z)+.65)};
      if(clearPath({from:point,to:seat,hop:.12},'kingfisher',body))return point;
    }
    return null;
  }
  function hopPoint(site,body,phase) {
    const origin=body??site.seat;
    for(const distance of [.63,.38,.23])for(let i=0;i<12;i++){
      const angle=phase+i*Math.PI/6, x=origin.x+Math.sin(angle)*distance,z=origin.z+Math.cos(angle)*distance;
      if((x-site.seat.x)**2+(z-site.seat.z)**2>1.05**2)continue;
      const dest={x,z,y:field.height(x,z)};
      if(clearPath({from:{x:origin.x,z:origin.z,y:field.height(origin.x,origin.z)},to:dest,hop:.18},'frog',body))return dest;
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
    a.delay=(a.type==='frog'?2.8:9)+(a.cycles*1.618+a.site.anchor)%3;
    a.body.turnTo=null;
  }
  function spawn(site) {
    const {type}=site,range=visitorRadius[type];
    let seat=site.seat;
    if(type==='frog'){
      const landing=[site.seat,...site.banks].find(p=>allowed({...p,y:field.height(p.x,p.z)},type));
      if(!landing)return false;
      seat={...landing,y:field.height(landing.x,landing.z)};
    }
    const body={...seat,perch:type==='kingfisher'?seat:null,r:range,h:type==='frog'?.26:.43,kind:kinds[type],heading:0,crowd,cell:null,rest:0,turnTo:null};
    if(!allowed(seat,type,body))return false;
    const start=type==='frog'?hopPoint({...site,seat},body,site.anchor*1.34):safeFlight(site,body);
    if(type==='kingfisher'&&!start)return false;
    const key=type+'/'+site.anchor;
    const a={key,type,site,home:seat,body,model:makeModel(type,site.anchor,world,field),state:'rest',cycles:0,detail:true,debt:0,delay:0,clock:0,path:null};
    visitors.set(key,a);
    rest(a);
    if(start && startPath(a,start,seat,type==='frog'?.56:1.05,'arrive',type==='frog'?.20:.12))bodyPosition(a,start);
    else bodyPosition(a,seat);
    paint(a,type==='frog'?'Crouch':'Fly',undefined,.016);
    lastReport='';
    return true;
  }
  function leave(a) {
    if(a.state==='depart')return;
    const start={x:a.body.x,y:a.body.y,z:a.body.z};
    if(!allowed(start,a.type,a.body)){drop(a);return;}
    let dest;
    if(a.type==='frog')dest=hopPoint({...a.site,seat:start},a.body,a.body.heading);
    else {
      const fake={...a.site,seat:start};
      dest=safeFlight(fake,a.body);
    }
    if(!dest||!startPath(a,start,dest,a.type==='frog'?.5:.85,'depart',a.type==='frog'?.2:.12)){drop(a);return;}
    lastReport='';
  }
  function updateReport() {
    if(!report)return;
    const result={heldResidents};
    for(const type of ['frog','kingfisher']){
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
    for(const type of ['frog','kingfisher']){
      const sites=survey.options[type].filter(s=>s.ready);
      sites.sort((a,b)=>squared(a.at,center)-squared(b.at,center)||a.anchor-b.anchor);
      for(const s of sites.slice(0,2))active.set(type+'/'+s.anchor,s);
    }
    if(!refresh && active.size===waiting.size && [...active.keys()].every(key=>waiting.has(key)))return;
    for(const [key,a] of visitors){
      const site=active.get(key);
      if(!site || !same(a.site.seat,site.seat) ||
         !allowed(a.body,a.type,a.body)){
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
        if(a.type==='frog' && a.state!=='depart' && nav.valid(a.body.x,a.body.z,a.body.r,'land')){
          a.body.y=field.height(a.body.x,a.body.z);rest(a);
          paint(a,'Crouch',undefined,dt);
        }else drop(a);
        return;
      }
      bodyPosition(a,p);
      let clip,phase;
      if(a.type==='frog'){clip='Leap';phase=t;}
      else if((a.state==='arrive'||a.state==='return')&&t>.72){clip='Land';phase=(t-.72)/.28;}
      else if((a.state==='depart'||a.state==='out')&&t<.27){clip='Takeoff';phase=t/.27;}
      else clip='Fly';
      paint(a,clip,phase,dt);
      if(t<1)return;
      if(a.state==='depart'){drop(a);return;}
      if(a.state==='out'){
        if(startPath(a,path.to,a.site.seat,1.05,'return',.12))return;
        drop(a);return;
      }
      if(a.type==='frog'){a.state='settle';a.clock=0;a.path=null;}
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
        if(!startPath(a,start,a.next,.48,'hop',.18))rest(a);
      }
      return;
    }
    paint(a,a.type==='frog'?'Crouch':'Perch',undefined,animate?dt:0);
    if(!animate||a.clock<a.delay||a.body.rest>0)return;
    if(a.type==='frog'){
      const dest=hopPoint({...a.site,seat:a.home},a.body,a.cycles*2.4);
      if(!dest){rest(a);return;}
      a.state='gather';a.clock=0;a.next=dest;
    } else {
      const dest=safeFlight(a.site,a.body);
      if(!dest||!startPath(a,a.site.seat,dest,1.05,'out',.12))rest(a);
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
      for(const a of visitors.values())if(a.state!=='depart' && (a.type==='frog'||a.state==='rest')){
        list.push({kind:'animal',wildVisitor:true,type:a.type,x:a.body.x,z:a.body.z,agent:a.body});
      }
      return list;
    },
    refreshModel(type){for(const a of visitors.values())if(a.type===type){
      removeModel(a.model);a.model=makeModel(type,a.site.anchor,world,field);
      paint(a,a.type==='frog'?'Crouch':a.state==='rest'?'Perch':'Fly',undefined,.016);
    }},
    count:()=>visitors.size};
}
