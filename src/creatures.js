import * as T from 'three';
import {batch} from './model.js';
import {buildDeer} from './deer.js';

const flight=['owl','swallow','kingfisher','butterfly','dragonfly','bee'];
const swim=['duck','goose','swan','fish'];

export function buildCreature(kit,o,def){
  if(def.form==='deer'||def.form==='elk')return buildDeer(kit,o,def);
  const group=new T.Group(), b=batch(kit);
  const form=def.form,c=def.color,a=def.accent,s=o.w;
  const part=(hex,x,y,z,xx,yy,zz,rx=0,ry=0,rz=0)=>b.put('rock','basic',hex,x*s,y*s,z*s,xx*s,yy*s,zz*s,rx,ry,rz,false);
  const dark='#504637', pale='#e1ceb0';
  const eye=(x,y,z)=>part(dark,x,y,z,.027,.025,.029);
  if(['butterfly','dragonfly','bee'].includes(form)){
    part(form==='bee'?c:dark,0,0,0,.10,.09,.30);
    for(const x of [-1,1]){
      part(form==='butterfly'?c:'#d0dfc7',x*.25,.025,.05,.25,.041,.22,.02,0,x*.22);
      part(a,x*.17,.012,-.11,.19,.037,.16,0,0,x*.28);
    }
    if(form==='bee')for(const z of [-.14,.005,.12])part(a,0,.008,z,.101,.095,.043);
  }else if(form==='fish'){
    part(c,0,.025,0,.21,.128,.49);
    part(a,0,.126,.06,.093,.058,.19);
    part(c,0,.04,-.48,.23,.062,.20,0,0,.18);
    eye(-.11,.075,.36);eye(.11,.075,.36);
  }else if(flight.includes(form)){
    part(c,0,0,0,.23,.17,.42);
    part(a,0,-.10,.14,.175,.126,.23);
    for(const x of [-1,1]){
      part(c,x*.34,.015,-.06,form==='owl'?.39:.51,.055,.22,0,x*.35,x*.09);
      if(form==='swallow')part(c,x*.11,0,-.46,.072,.029,.26,0,x*.34);
      if(form==='owl')part(pale,x*.11,.17,.25,.11,.13,.10);
      eye(x*.10,.18,.342);
    }
    part('#ccaa68',0,.032,.39,.063,.056,form==='kingfisher'?.25:.088);
  }else if(swim.includes(form)||['heron','hen'].includes(form)){
    const long=['goose','swan','heron'].includes(form), heron=form==='heron',hen=form==='hen';
    const y=heron?.76:hen?.45:.22;
    part(c,0,y,0,.29,.20,.47);
    part(a,0,y+.05,-.21,.242,.13,.29);
    if(long)part(form==='goose'?'#514e43':c,0,y+.38,.30,.098,heron?.48:.40,.11,-.28);
    const headY=y+(long?.66:.21);
    part(form==='goose'?'#4b4b43':form==='duck'?a:c,0,headY,.41,.14,.14,.16);
    if(form==='goose')for(const x of [-1,1])part('#e4dcc3',x*.105,headY-.02,.45,.054,.072,.092);
    part(hen?'#d6a76a':form==='goose'?dark:'#d6a161',0,headY-.04,.57,.09,.04,heron?.28:.15);
    if(hen)part('#aa5947',0,headY+.105,.41,.064,.085,.09);
    for(const x of [-1,1]){
      eye(x*.099,headY+.018,.503);
      if(heron||hen)part('#a08a65',x*.12,y*.41,0,.029,y*.44,.032);
    }
  }else if(['rabbit','frog','squirrel','hedgehog'].includes(form)){
    const rabbit=form==='rabbit',frog=form==='frog', squirrel=form==='squirrel';
    part(c,0,.31,0,frog?.30:.265,.23,.38);
    part(a,0,.40,.29,.207,.18,.218);
    for(const x of [-1,1]){
      eye(x*.162,.48,.396);
      part(c,x*.207,.16,-.094,.13,.137,.24,0,0,-x*.27);
      if(rabbit||squirrel){
        part(c,x*.104,.64,.24,.068,rabbit?.226:.113,.071,-.18,0,-x*.13);
        part(a,x*.105,.66,.292,.037,rabbit?.144:.060,.037,-.18,0,-x*.13);
      }
    }
    if(squirrel)part(c,0,.66,-.46,.17,.35,.20,-.45);
    else if(rabbit)part(pale,0,.35,-.379,.13,.13,.125);
    else if(form==='hedgehog')for(let i=0;i<17;i++)part(a,Math.sin(i*2.4)*.20,.47+Math.cos(i*.33)*.055,Math.cos(i*2.4)*.31,.045,.072,.045,0,i);
  }else{
    const tall=form==='goat'||form==='horse', sheep=form==='sheep';
    const low=['raccoon','badger','beaver','fox'].includes(form);
    const y=tall?.70:low?.37:.51, len=form==='horse'?.56:.48, w=sheep?.37:form==='bear'?.38:.275;
    part(c,0,y,0,w,tall?.24:.29,len);
    if(sheep)for(let i=0;i<7;i++)part(c,Math.cos(i*2.4)*.24,y+.15,Math.sin(i*2.4)*.32,.18,.18,.20);
    if(form==='cow')for(let i=0;i<6;i++)part(a,Math.cos(i*2.4)*.245,y+.15,Math.sin(i*2.4)*.30,.108,.11,.141);
    const neck=tall?.37:.16;
    part(c,0,y+neck*.54,.31,.165,neck*.86,.17,.25);
    part(sheep?a:c,0,y+neck,.44,.177,.157,.248,-.18);
    part(form==='pig'?a:pale,0,y+neck-.044,.637,form==='pig'?.144:.109,.075,.075);
    for(const x of [-1,1]){
      part(c,x*.131,y+neck+.13,.379,.072,form==='goat'?.112:.075,.078,0,0,-x*.44);
      eye(x*.143,y+neck+.024,.535);
      if(form==='raccoon'||form==='badger')part(dark,x*.145,y+neck+.014,.509,.045,.047,.09,0,x*.24);
      if(form==='goat'||form==='cow')part(a,x*.129,y+neck+.205,.385,.038,.10,.037,-.22,0,-x*.43);
      for(const z of [-1,1]){
        part(c,x*w*.68,y*.36,z*.31,.072,y*.42,.085);
        part(dark,x*w*.68,.054,z*.32,.070,.056,.090);
      }
    }
    const tail=form==='beaver'?.24:form==='fox'||form==='raccoon'?.15:.073;
    part(a,0,y*.93,-len-.13,tail,.076,form==='bear'?.12:.29,.25);
    if(form==='fox'||form==='raccoon')part(form==='fox'?pale:dark,0,y*.95,-len-.35,tail*.78,.065,.116,.26);
  }
  return b.finish(group);
}

export function buildAvatar(kit){
  const root=new T.Group(),visual=new T.Group(), body=batch(kit);root.add(visual);
  const jacket='#cb8861', pants='#526d6c',boots='#695441';
  const pack='#4b6957',skin='#d9ad86';
  const p=(b,shape,c,x,y,z,w,h,d,rx=0,rz=0)=>b.put(shape,'basic',c,x,y,z,w,h,d,rx,0,rz,false);
  p(body,'rock',jacket,0,.90,0,.30,.35,.177);
  p(body,'rock','#e4bd84',0,1.18,.015,.26,.114,.171);
  p(body,'rock',skin,0,1.37,.025,.181,.195,.166);
  p(body,'dome','#587a65',0,1.41,.011,.206,.20,.182);
  p(body,'disc','#4b6c58',0,1.44,.051,.225,.029,.207);
  p(body,'box',pack,0,.94,-.205,.35,.39,.16);
  p(body,'disc','#c5ad79',0,1.09,-.245,.105,.38,.105,0,Math.PI/2);
  for(const x of [-.162,.162])p(body,'box','#77927a',x,.94,-.113,.045,.41,.145);
  body.finish(visual);
  const arms=[],forearms=[],legs=[],knees=[],feet=[];
  for(const s of [-1,1]){
    const arm=new T.Group(), leg=new T.Group(), a=batch(kit),b=batch(kit);
    arm.position.set(s*.264,1.078,0);
    leg.position.set(s*.125,.62,0);
    p(a,'rock',jacket,0,-.10,0,.083,.12,.075);
    const forearm=new T.Group(),fore=batch(kit);forearm.position.y=-.21;
    p(fore,'rock',jacket,0,-.052,0,.073,.075,.068);p(fore,'rock',skin,0,-.146,.015,.067,.070,.063);fore.finish(forearm);arm.add(forearm);forearms.push(forearm);
    p(b,'rock',pants,0,-.14,0,.101,.145,.106);
    const knee=new T.Group(),lower=batch(kit);knee.position.y=-.285;
    p(lower,'rock',pants,0,-.105,0,.090,.12,.094);
    const foot=new T.Group(),shoe=batch(kit);foot.position.set(0,-.224,.062);p(shoe,'rock',boots,0,0,0,.108,.112,.171);shoe.finish(foot);knee.add(foot);feet.push(foot);
    lower.finish(knee);leg.add(knee);knees.push(knee);
    a.finish(arm);b.finish(leg);visual.add(arm,leg);arms.push(arm);legs.push(leg);
  }
  const axe=new T.Group(),tool=batch(kit);
  p(tool,'box','#a27854',0,-.18,.035,.051,.52,.051,0,-.21);
  p(tool,'box','#869590',.062,-.40,.035,.192,.108,.057,0,-.17);
  tool.finish(axe);
  axe.position.set(.012,-.15,.035);
  axe.visible=false;forearms[1].add(axe);
  const shadow=new T.Mesh(new T.CircleGeometry(.34,20).rotateX(-Math.PI/2),
    new T.MeshBasicMaterial({color:'#3e4f3b',transparent:true,opacity:.22,depthWrite:false}));
  shadow.position.y=.022;
  root.add(shadow);
  const sword=new T.Group(),blade=batch(kit);
  p(blade,'box','#cbd1bd',0,-.62,.035,.09,.74,.04);
  p(blade,'box','#98835c',0,-.29,.035,.28,.05,.07);
  p(blade,'box','#745a3f',0,-.18,.035,.06,.18,.06);
  blade.finish(sword);sword.position.copy(axe.position);sword.visible=false;forearms[1].add(sword);
  let gait=0,air=0,landBlend=0,traverseBlend=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function limb(y,z,l1,l2){
    const d=clamp(Math.hypot(y,z),Math.abs(l1-l2)+.001,l1+l2-.001);
    return {upper:Math.atan2(-z,-y)-Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),lower:Math.PI-Math.acos(clamp((l1*l1+l2*l2-d*d)/(2*l1*l2),-1,1))};
  }
  function pose(t,moving,swing,weapon='axe',motion=null,dt=1/60){
    const speed=motion?.speed??(moving?2.7:0),fast=Math.min(1,speed/5.6),factor=1-Math.exp(-dt*20),action=motion?.traversal;
    gait+=(Math.min(1,speed/1.5)-gait)*factor;
    air+=((motion&&!motion.grounded?1:0)-air)*factor;
    const landing=motion?.landTime>0?Math.min(1,(motion.landingImpact??3)/9):0;
    landBlend+=(landing-landBlend)*(1-Math.exp(-dt*24));
    traverseBlend+=((action?1:0)-traverseBlend)*(1-Math.exp(-dt*25));
    const phase=motion?.phase??t*9.6,progress=action?.progress??0;
    const push=action?Math.sin(progress*Math.PI):traverseBlend;
    const bodyDip=-(.055+fast*.025)*gait-landBlend*.10+Math.min(0,...(motion?.footHeights??[0]))*.3*(1-air);
    visual.position.y+=(bodyDip-visual.position.y)*factor;
    visual.rotation.x+=(-(motion?.lean??0)-fast*.10*gait+landBlend*.18-push*.28-visual.rotation.x)*factor;
    visual.rotation.z+=(-(motion?.turn??0)*.009*gait-visual.rotation.z)*factor;
    visual.rotation.y+=(-(motion?.turn??0)*.012-visual.rotation.y)*factor;
    for(let i=0;i<2;i++){
      const cycle=((phase+i*Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)/(Math.PI*2),stance=cycle<.60;
      const step=stance?cycle/.60:(cycle-.60)/.40;
      const reach=(.13+fast*.13)*gait,footZ=(stance?1-2*step:-Math.cos(step*Math.PI))*reach;
      const lift=stance?0:Math.sin(step*Math.PI)*(.09+fast*.10)*gait;
      const ground=motion?.footHeights?.[i]??0;
      const target=limb(.113+ground*(1-air)+lift-.62-visual.position.y,footZ,.285,.224);
      const tuck=action?(action.kind==='vault'?(i===0?-.9:-.45):i===0?-.70:.12):(i===0?-.40:.20);
      const hip=target.upper*(1-air)+tuck*air,knee=target.lower*(1-air)+(action?1.45:.78)*air;
      legs[i].rotation.x+=(hip-legs[i].rotation.x)*factor;knees[i].rotation.x+=(knee-knees[i].rotation.x)*factor;
      feet[i].rotation.x+=(-(legs[i].rotation.x+knees[i].rotation.x)*(1-air)+air*.15-feet[i].rotation.x)*factor;
      let arm=Math.sin(phase+i*Math.PI)*(.28+fast*.28)*gait,elbow=-.18-fast*.48*gait;
      if(action){
        const hand=action.hand,dx=hand.x-motion.x,dz=hand.z-motion.z;
        const forward=Math.sin(motion.a)*dx+Math.cos(motion.a)*dz;
        const targetArm=limb(hand.y-motion.y-1.078-visual.position.y,forward,.21,.15);
        const hold=Math.min(1,Math.max(0,(.84-progress)/.18));
        arm=arm*(1-hold)+targetArm.upper*hold;elbow=elbow*(1-hold)+targetArm.lower*hold;
      }else if(air>.1)arm-=air*.55;
      if(i===1&&swing>0){arm=-1.5*Math.sin(swing*Math.PI);elbow=-.3;}
      arms[i].rotation.x+=(arm-arms[i].rotation.x)*factor;
      forearms[i].rotation.x+=(elbow-forearms[i].rotation.x)*factor;
      arms[i].rotation.z+=((i?1:-1)*air*.12-arms[i].rotation.z)*factor;
    }
    axe.visible=swing>0&&weapon!=='sword'&&!action;sword.visible=swing>0&&weapon==='sword'&&!action;
    shadow.visible=air<.08;
  }
  return {group:root,pose};
}
