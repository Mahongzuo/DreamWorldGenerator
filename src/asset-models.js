import * as T from 'three';
import {batch,randFrom} from './model.js';

const tau=Math.PI*2;
export function beam(parts,shade,a,b,width,height=width,surface='wood'){
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],flat=Math.hypot(dx,dz);
  parts.box(shade,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,Math.hypot(flat,dy),height,width,
    {surface,ry:-Math.atan2(dz,dx),rz:Math.atan2(dy,flat)});
}

export const bridgeRise=(x,w)=>.17+.47*Math.max(0,1-(x/(w/2))**2);
export function architectureHeight(form,w){
  if(['pagoda','bell','lookout','treehouse','chapel','mill'].includes(form))return 6.3;
  if(['bridge','moon','arch'].includes(form))return 3.2;
  return 3.0+w*.31;
}

export function buildArchitecture(kit,o,def){
  const {w,d}=o, {form,color:c,accent:a}=def;
  const group=new T.Group(),parts=batch(kit);
  const timber='#75563d',stone='#b2a994',glaze='#f0d698';
  const box=(shade,x,y,z,sx,sy,sz,surface='basic',opts={})=>parts.box(shade,x,y,z,sx,sy,sz,{surface,...opts});
  const disc=(shade,x,y,z,sx,sy,sz)=>parts.put('disc','basic',shade,x,y,z,sx,sy,sz);
  const roof=(x,z,y,wide,deep,rise,kind='gable')=>{
    const ow=wide*.5+.24, od=deep+.48;
    const spans=kind==='barn'?[[-ow,-ow*.53,0,rise*.70],[-ow*.53,0,rise*.70,rise],[0,ow*.53,rise,rise*.70],[ow*.53,ow,rise*.70,0]]:[[-ow,0,0,rise],[0,ow,rise,0]];
    for(const [l,r,yl,yr] of spans){
      const slope=Math.atan2(yr-yl,r-l), width=Math.hypot(r-l,yr-yl);
      box(a,x+(r+l)/2,y+(yl+yr)/2,z,width+.045,.13,od,'metal',{rz:slope});
      const count=Math.ceil(od/.26);
      for(let k=0;k<=count;k++)box(k%4?'#768177':a,x+(r+l)/2,y+(yl+yr)/2+.075,z-od/2+od*k/count,width,.027,.026,'metal',{rz:slope});
      for(const dz of [-od/2,od/2])box(timber,x+(r+l)/2,y+(yl+yr)/2-.07,z+dz,width+.07,.15,.09,'wood',{rz:slope});
    }
  };
  const post=(x,z,y,h,r=.13)=>box(timber,x,y+h/2,z,r,h,r,'wood');
  const windows=(x,y,z,ww=.53,hh=.64,turned=false)=>{
    const t=turned?Math.PI/2:0;
    box(timber,x,y,z,ww+.12,hh+.12,.082,'wood',{ry:t});
    box(glaze,x+(turned?.052:0),y,z+(turned?0:.052),ww,hh,.035,'window',{ry:t});
    box(timber,x+(turned?.079:0),y,z+(turned?0:.079),.044,hh,.028,'wood',{ry:t});
  };
  function hip(x,y,z,ww,dd,rise,trim=true){
    const tiers=12;
    for(let i=0;i<tiers;i++){
      const t=i/tiers,k=1-t*.82;
      box(i%4?a:new T.Color(a).multiplyScalar(1.21),x,y+rise*t*t,z,(ww+.58)*k,.085,(dd+.58)*k,'metal');
    }
    if(trim)box(timber,x,y-.063,z,ww+.53,.116,dd+.52,'wood');
  }
  function arched(width,height,depth,y=0,shape='arch'){
    const r=width*.30, count=20;
    for(const s of [-1,1]){
      const x=s*(width*.32+.14);
      box(c,x,y+height*.28,0,width*.36,height*.56,depth);
      box(stone,x,y+.12,0,width*.39,.23,depth+.14);
    }
    for(let i=0;i<count;i++){
      const t=(i+.5)/count*Math.PI;
      const dy=Math.sin(t)*r, dx=Math.cos(t)*r;
      box(i%2?c:stone,dx,y+height*.43+dy,0,(r+.17)*Math.PI/count+.025,.32,depth+.045,'basic',{rz:t-Math.PI*.5});
    }
    if(shape==='moon')hip(0,y+height+.025,0,width,depth,.48);
    else box(stone,0,y+height+.1,0,width+.29,.20,depth+.20);
  }

  if(form==='bridge'){
    const steps=Math.ceil(w/.31);
    for(let i=0;i<steps;i++){
      const x=(i+.5)*w/steps-w/2,y=bridgeRise(x,w);
      box(i%3?c:a,x,y-.10,0,w/steps+.02,.22,d);
      for(const z of [-d*.46,d*.46]){
        box(a,x,y+.26,z,w/steps+.05,.096,.12);
        if(i%3===0)box(c,x,y+.16,z,.10,.34,.11);
      }
    }
    for(const side of [-1,1])box(c,side*w*.42,.06,0,w*.2,.30,d+.12);
    return parts.finish(group);
  }
  if(form==='moon'||form==='arch'){
    arched(w,2.54,d*.35,0,form);
    return parts.finish(group);
  }
  if(form==='pagoda'){
    for(let i=0;i<3;i++){
      const k=1-i*.24,y=i*1.18;
      box(c,0,y+.51,0,w*k*.86,.97,d*k*.86,'wood');
      for(const x of [-1,1])for(const z of [-1,1])post(x*w*k*.43,z*d*k*.43,y,.98);
      windows(0,y+.55,d*k*.447,.47*k,.52*k);
      hip(0,y+1.02,0,w*k,d*k,.65);
    }
    parts.put('trunk','metal','#d2ad74',0,4.06,0,.061,.62,.061);
    return parts.finish(group);
  }
  if(['round','dome','fort','bell','hex'].includes(form)){
    const h=form==='bell'?4.1:form==='fort'?3.55:form==='hex'?2.46:2.06;
    const rx=w*.49,rz=d*.49;
    disc(stone,0,.13,0,rx*1.04,.26,rz*1.04);
    if(form==='hex'){
      for(let i=0;i<6;i++){const t=i*tau/6;post(Math.cos(t)*rx*.84,Math.sin(t)*rz*.84,.15,h-.15);}
      parts.put('cone','basic',a,0,h+.54,0,rx*1.15,1.3,rz*1.15);
    }else{
      disc(c,0,h/2,0,rx,h,rz);
      for(let i=0;i<12;i++){
        const t=i*tau/12;
        if(form==='fort')box(stone,Math.sin(t)*rx,h+.18,Math.cos(t)*rz,.38,.40,.27);
        else if(i%3===0){
          box(timber,Math.sin(t)*rx,h*.56,Math.cos(t)*rz,.42,.52,.08,'wood',{ry:t});
          box(glaze,Math.sin(t)*(rx+.06),h*.57,Math.cos(t)*(rz+.06),.29,.40,.056,'window',{ry:t});
        }
      }
      if(form==='dome'){
        parts.put('dome','metal',a,0,h,0,rx*1.04,rx*.87,rz*1.04);
        box('#536769',0,h+rx*.72,rz*.43,.17,.12,rz*1.14,'metal',{rx:.45});
      }else if(form==='round')parts.put('cone','basic',a,0,h+.66,0,rx*1.17,1.34,rz*1.17);
      else if(form==='bell'){
        for(const x of [-rx*.66,rx*.66])for(const z of [-rz*.66,rz*.66])post(x,z,h,1.0);
        parts.put('trunk','metal','#af956a',0,h+.47,0,.36,.55,.35);
        hip(0,h+1.0,0,w*.83,d*.84,.68);
      }
      box(timber,0,.86,rz*.99,.81,1.57,.11,'wood');
    }
    return parts.finish(group);
  }

  const elevated=['stilt','lookout','treehouse'].includes(form);
  const base=elevated?(form==='lookout'?2.22:1.42):.20;
  const open=['open','hall','gate','glass'].includes(form);
  const h=form==='lodge'?3.3:form==='barn'?2.89:form==='flat'?2.56:form==='gate'?2.9:2.46;
  if(form==='court'){
    for(const z of [-d*.34,d*.34]){
      box(c,0,1.11,z,w,2.22,d*.26);
      hip(0,2.21,z,w,d*.28,.72);
      for(const x of [-w*.32,0,w*.32])windows(x,1.26,z-d*.14,.63,.58,true);
    }
    for(const x of [-w*.43,w*.43]){box(c,x,1.05,0,w*.16,2.1,d*.55);hip(x,2.1,0,w*.16,d*.55,.60);}
    box(stone,0,.06,0,w,.12,d);
    return parts.finish(group);
  }
  box(stone,0,base-.12,0,w+.18,.23,d+.17);
  if(elevated){
    for(const x of [-w*.40,w*.40])for(const z of [-d*.37,d*.37])post(x,z,0,base,.22);
    if(form==='treehouse')parts.put('trunk','basic','#77543a',-w*.19,base*.6,0,.34,base*1.2,.34);
    for(const x of [-.28,.28])beam(parts,timber,[x,.02,d/2+.91],[x,base,d/2+.04],.10,.11);
    for(let i=1;i<=8;i++)box(c,0,base*i/8,d/2+.94-i*.11,.60,.075,.16,'wood');
  }
  if(!open){
    const wallY=base+h/2;
    box(c,0,wallY,0,w,h,d,['log','long','lodge','watermill','barn','row'].includes(form)?'wood':'basic');
    if(form==='log'){
      for(let y=base+.09;y<base+h;y+=.22){
        for(const z of [-d*.5,d*.5])parts.put('trunk','wood',c,0,y,z,.113,w+.31,.113,0,0,Math.PI/2);
        for(const x of [-w*.5,w*.5])parts.put('trunk','wood',c,x,y+.09,0,.112,d+.34,.112,Math.PI/2);
      }
    }
    if(form==='stone')for(let j=0;j<8;j++)for(let i=0;i<Math.ceil(w/.42);i++){
      const n=Math.ceil(w/.42),x=(i+.5)*w/n-w/2;
      box((i+j)%3===0?stone:c,x,base+.15+j*.31,d/2+.035,w/n-.026,.27,.09);
    }
    if(form==='row'){
      for(let i=0;i<3;i++){
        const x=(i-1)*w/3;
        box(timber,x+w/6,base+h/2,d/2+.04,.08,h,.08,'wood');
        box(timber,x,base+.82,d/2+.12,.61,1.64,.16,'wood');
        windows(x,base+h-.61,d/2+.09,.66,.55);
      }
    }else{
      const doorW=Math.min(w*.33,form==='barn'?2.0:1.02);
      box(timber,w*.18,base+.88,d/2+.12,doorW,1.76,.14,'wood');
      box(new T.Color(c).multiplyScalar(.71),w*.18,base+.84,d/2+.20,doorW*.83,1.56,.045,'wood');
      windows(-w*.22,base+1.39,d/2+.08,Math.min(.85,w*.25),.77);
      windows(w/2+.09,base+1.43,0,.76,.72,true);
      if(form==='lodge')for(const x of [-w*.24,0,w*.23])windows(x,base+h-.52,d/2+.07,.51,.49);
    }
  }
  for(const x of [-w*.48,w*.48])for(const z of [-d*.48,d*.48])post(x,z,base,h);
  if(form==='glass'){
    const panes=Math.ceil(w/.83);
    for(let i=0;i<=panes;i++){
      const x=-w/2+i*w/panes;
      for(const z of [-d/2,d/2]){
        box('#7b8c73',x,base+h/2,z,.058,h,.058);
        if(i<panes)box('#a8c3ae',x+w/panes/2,base+h*.57,z,w/panes-.067,h*.74,.036,'window');
      }
    }
    for(const z of [-d/2,d/2])box('#748775',0,base+h*.92,z,w,.088,.085);
  }
  const roofY=base+h;
  if(['adobe','flat'].includes(form)){
    box(a,0,roofY+.09,0,w+.52,.24,d+.48);
    if(form==='adobe')for(const x of [-w*.43,-w*.23,0,w*.23,w*.43])box(timber,x,roofY-.24,d/2+.11,.16,.15,.53,'wood');
    else for(const x of [-w*.29,0,w*.30])windows(x,base+1.39,d/2+.22,w*.24,1.07);
  }else if(['stilt','hall','gate'].includes(form))hip(0,roofY,0,w,d,1.03);
  else if(form==='saw'){
    for(let i=0;i<4;i++){
      const x=(i-1.5)*w/4;
      box(a,x,roofY+.29,0,w*.31,.15,d+.34,'metal',{rz:.37});
      box('#a4c0b4',x+w*.11,roofY+.28,0,.045,.54,d+.14,'window');
    }
  }else{
    const rise=form==='barn'?1.63:form==='glass'?1.18:.91;
    if(!open)for(let j=0;j<Math.floor(rise/.11);j++)box(c,0,roofY+j*.11+.044,0,w*(1-j*.11/rise),.114,d);
    roof(0,0,roofY,w,d,rise,form==='barn'?'barn':'gable');
  }
  if(form==='chapel'){
    box(c,0,3.41,d*.38,w*.30,2.35,d*.30);
    parts.put('cone','metal',a,0,5.29,d*.38,w*.21,1.62,d*.24);
    windows(0,3.8,d*.55,.37,.60);
  }
  if(form==='mill'||form==='watermill'){
    const mill=form==='mill', x=mill?0:w*.57, y=mill?roofY+.30:1.14,z=d/2+.28;
    const wheel=new T.Group(), spokes=batch(kit);
    if(!mill)parts.put('disc','wood','#8e6c4c',x,y,z,1.03,.18,1.03,Math.PI/2);
    const n=mill?4:12;
    for(let i=0;i<n;i++){
      const t=i*tau/n,r=mill?1.31:.72;
      spokes.box(mill?'#d8bd90':timber,Math.sin(t)*r,Math.cos(t)*r,0,mill?.38:.13,mill?1.43:.68,.11,{surface:'wood',rz:-t});
    }
    spokes.finish(wheel);
    wheel.position.set(x,y,z+.12);
    wheel.userData.spin=mill?.54:.71;
    group.add(wheel);
  }
  return parts.finish(group);
}

export function buildPlant(kit,o,def,season){
  const b=batch(kit),random=randFrom(def.id+o.id);
  const {form,color,accent}=def,s=o.w;
  const crown=season==='winter'?'#acb8a3':color;
  const leaf=(hex,x,y,z,w,h,d,ry=0)=>b.put('rock','basic',hex,x,y,z,w,h,d,0,ry);
  const stem=(x,y,z,w,h,rz=0)=>b.put('trunk','basic','#729057',x,y,z,w,h,w,0,0,rz);
  if(['conifer','spire','column','umbrella','broad','birch','weeping','blossom','palm'].includes(form)){
    const tall=['spire','column','palm'].includes(form);
    const h=s*(tall?2.95:2.27);
    const bark=form==='birch'?'#d4d0b8':'#796049';
    b.put('trunk','basic',bark,0,h*.43,0,s*.069,h*.88,s*.069);
    if(form==='birch')for(let i=1;i<8;i++)b.box('#777264',(i%2-.5)*s*.10,h*i/14,s*.052,s*.072,.032,s*.027);
    if(form==='conifer'||form==='spire'){
      for(let i=0;i<7;i++){
        const k=1-i/8,r=h*k*(form==='spire'?.145:.22);
        b.put('fir','fir',i%2?accent:crown,0,h*(.28+i*.106),0,r,h*.28,r,0,i*.39);
      }
    }else if(form==='palm'){
      for(let i=0;i<8;i++){
        const a=i*tau/8;
        for(let j=1;j<=4;j++){
          const r=j*s*.153;
          leaf(i%2?crown:accent,Math.sin(a)*r,h*(.92-.016*j*j),Math.cos(a)*r,s*.085,s*.033,s*.29,a);
        }
      }
    }else{
      const rings=form==='column'?12:10;
      for(let i=0;i<rings;i++){
        const a=i*2.399,r=h*(form==='column'?.085:form==='umbrella'?.26:.22)*(.46+random()*.54);
        const x=Math.cos(a)*r,z=Math.sin(a)*r,y=h*(form==='column'?.40+i*.051:.77+random()*.16);
        const k=h*(form==='column'?.115:.137);
        if(i<6)beam(b,bark,[0,h*.44,0],[x,y,z],s*.055);
        leaf(i%4===0?accent:crown,x,y,z,k*(form==='umbrella'?1.31:1),k*(form==='weeping'?1.54:form==='umbrella'?.57:1.03),k,a);
        if(form==='weeping')leaf(crown,x,y-k*.99,z,k*.40,k*1.18,k*.42,a);
      }
    }
  }else if(form==='bamboo'||form==='cactus'){
    const n=form==='bamboo'?9:3;
    for(let i=0;i<n;i++){
      const a=i*2.399,r=i?s*(.12+random()*.28):0,h=s*(.74+random()*1.20);
      const x=Math.sin(a)*r,z=Math.cos(a)*r;
      b.put('trunk','basic',color,x,h*.50,z,s*(form==='cactus'?.11:.027),h,s*(form==='cactus'?.10:.028),0,a,.065);
      if(form==='bamboo')for(let j=1;j<6;j++){
        b.put('disc','basic',accent,x,h*j/6,z,s*.034,.026,s*.035);
        if(j>2)leaf(color,x+s*.095,h*j/6,z+s*.09,s*.14,s*.029,s*.07,a);
      }
    }
  }else if(['shrub','berry','cluster'].includes(form)){
    for(let i=0;i<9;i++){
      const a=i*2.399,r=s*(.10+random()*.30),x=Math.sin(a)*r,z=Math.cos(a)*r,y=s*(.22+random()*.26);
      leaf(crown,x,y,z,s*.27,s*.25,s*.26,a);
      if(form!=='shrub')leaf(accent,x,y+s*.20,z,s*(form==='berry'?.054:.145),s*.11,s*.13,a);
    }
  }else if(form==='fern'||form==='agave'){
    for(let i=0;i<8;i++){
      const a=i*tau/8;
      for(let j=1;j<=5;j++){
        const r=j*s*.083;
        leaf(j%2?color:accent,Math.sin(a)*r,s*(.08+j*.08-j*j*.009),Math.cos(a)*r,s*.07*(1.2-j*.12),s*.03,s*.12,a);
      }
    }
  }else if(form==='lily'){
    for(let i=0;i<4;i++){
      const x=Math.sin(i*2.399)*s*.29,z=Math.cos(i*2.399)*s*.29;
      b.put('disc','basic',color,x,.024,z,s*.22,.025,s*.18,0,i);
      if(i%2===0)for(let j=0;j<5;j++)leaf(accent,x+Math.cos(j*tau/5)*s*.06,s*.105,z+Math.sin(j*tau/5)*s*.06,s*.058,s*.05,s*.058,j);
    }
  }else{
    const n=form==='sunflower'?4:7;
    for(let i=0;i<n;i++){
      const a=i*2.399,r=s*(.13+random()*.32),x=Math.sin(a)*r,z=Math.cos(a)*r;
      const h=s*(form==='fungus'?.22+random()*.31:form==='reed'?.62+random()*.54:.34+random()*.41);
      if(form==='fungus'){
        b.put('trunk','basic',color,x,h/2,z,s*.057,h,s*.057);
        b.put('dome','basic',accent,x,h*.81,z,s*.155,h*.44,s*.155);
      }else{
        stem(x,h/2,z,s*.023,h,.07);
        leaf(color,x+s*.073,h*.38,z,s*.13,s*.025,s*.044,a);
        if(form==='reed'||form==='spike')b.put('trunk','basic',accent,x,h,z,s*.041,h*.37,s*.041,0,0,.07);
        else if(form==='sunflower'){
          b.put('disc','basic',accent,x,h,z,s*.139,s*.049,s*.139,Math.PI/2);
          b.put('disc','basic','#926b48',x,h,z+s*.028,s*.073,s*.027,s*.073,Math.PI/2);
        }else{
          for(let j=0;j<5;j++)leaf(accent,x+Math.sin(j*tau/5)*s*.06,h+(form==='cup'?.042:0),z+Math.cos(j*tau/5)*s*.06,s*.055,s*(form==='cup'?.075:.032),s*.059,j);
          leaf('#d6b763',x,h+.018,z,s*.044,s*.037,s*.044);
        }
      }
    }
  }
  return b.finish(new T.Group());
}

export function buildDecor(kit,o,def){
  const b=batch(kit),s=o.w,{form,color:c,accent:a}=def;
  const box=(shade,x,y,z,w,h,d)=>b.box(shade,x,y,z,w,h,d,{surface:'wood'});
  if(form==='well'){
    for(let i=0;i<12;i++){
      const t=i*tau/12;
      b.box(i%2?c:'#b5ad99',Math.sin(t)*s*.36,s*.21,Math.cos(t)*s*.36,s*.23,s*.46,s*.17,{ry:t});
    }
    for(const x of [-s*.35,s*.35])box(a,x,s*.78,0,s*.085,s*.88,s*.091);
    box(a,0,s*1.24,0,s*.86,s*.10,s*.54);
    b.put('disc','basic','#536d64',0,s*.052,0,s*.27,.026,s*.27);
  }else if(form==='bench'){
    for(const x of [-s*.41,s*.41])for(const z of [-s*.16,s*.16])box(a,x,s*.19,z,s*.087,s*.39,s*.09);
    for(let i=-1;i<=1;i++)box(c,0,s*.42,i*s*.13,s,s*.067,s*.112);
    for(let j=0;j<2;j++)box(c,0,s*(.61+j*.15),-s*.19,s,s*.11,s*.065);
  }else if(form==='pergola'){
    for(const x of [-s*.41,s*.41])for(const z of [-s*.41,s*.41])box(c,x,s*.65,z,s*.076,s*1.30,s*.078);
    for(let i=-2;i<=2;i++)box(c,i*s*.21,s*1.32,0,s*.068,s*.083,s*1.07);
    for(let i=-2;i<=2;i++)box(a,0,s*1.39,i*s*.20,s*1.06,s*.046,s*.062);
  }else if(form==='wall'){
    for(let j=0;j<3;j++)for(let i=0;i<4;i++)b.box(i%2?a:c,(i-1.5+j*.09)*s*.27,s*(.09+j*.15),0,s*.25,s*.143,s*.31);
  }else if(form==='monolith'){
    b.put('rock','basic',c,0,s*.52,0,s*.32,s*.69,s*.24,.04,.51,.08);
    b.put('rock','basic',a,-s*.18,s*.16,s*.11,s*.32,s*.22,s*.28,0,1.2);
  }else if(form==='logs'){
    for(let j=0;j<3;j++)for(let i=0;i<4-j;i++){
      const x=(i-(3-j)/2)*s*.20;
      b.put('disc','wood',c,x,s*(.10+j*.17),0,s*.106,s*.85,s*.106,Math.PI/2);
      b.put('disc','basic',a,x,s*(.10+j*.17),s*.437,s*.075,.019,s*.075,Math.PI/2);
    }
  }else if(form==='sign'||form==='nest'){
    box(c,0,s*.71,0,s*.089,s*1.42,s*.090);
    box(a,0,s*1.21,.038,form==='nest'?s*.41:s*.90,s*.33,s*.08);
    if(form==='nest'){
      box(c,0,s*1.18,-s*.085,s*.41,s*.30,s*.29);
      box('#5d5745',0,s*1.23,s*.086,s*.095,s*.09,s*.019);
      box(a,0,s*1.39,-s*.043,s*.52,s*.09,s*.42);
    }
  }else{
    box(c,0,s*.30,0,s*.83,s*.60,s*.74);
    for(const x of [-s*.36,s*.36])box(a,x,s*.31,s*.378,s*.085,s*.62,s*.045);
    for(const y of [s*.08,s*.51])box(a,0,y,s*.38,s*.86,s*.077,s*.045);
  }
  return b.finish(new T.Group());
}
