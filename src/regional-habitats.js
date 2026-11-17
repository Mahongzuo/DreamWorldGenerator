import {isTree} from './sandbox-state.js';

const landmarks = {
  watermill:'dipper', 'pasture-shelter':'meadow-hare',
  'build-lighthouse':'sea-gull', 'tidal-rocks':'shore-crab'
};
const rays=Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]);
const bankRays=rays.filter((_,i)=>i%2===0);
const streams=new Set(['brook','jade']);
const grasses=new Set(['lawn','flowers','heather']);

function drySeat(field,nav,x,z,r){
  if(field.depth(x,z)>.28 || !nav.valid(x,z,r,'land'))return null;
  const y=field.height(x,z);
  return Math.abs(nav.height(x,z)-y)<.12?{x,y,z}:null;
}

function pasture(o,survey,field,nav,r){
  const tree=survey.objects.some(p=>isTree(p.type)&&Math.hypot(p.x-o.x,p.z-o.z)<=8) ||
    !!nav.trees?.some(p=>Math.hypot(p.x-o.x,p.z-o.z)<=8);
  let grass=false;
  const banks=[];
  for(let d=.6; d<=6.5 && banks.length<6; d+=.64)for(const [dx,dz] of rays){
    const x=o.x+dx*d,z=o.z+dz*d;
    if(!grasses.has(field.paint?.(x,z)))continue;
    grass=true;
    const seat=drySeat(field,nav,x,z,r);
    if(seat && !banks.some(p=>Math.hypot(p.x-x,p.z-z)<.9))banks.push(seat);
  }
  return {seat:banks[0],banks,checks:[true,grass,tree,!!banks.length]};
}

function coastOrStream(type,o,field,nav,r){
  const gull=type==='sea-gull',crab=type==='shore-crab';
  const reach=gull?8:crab?5:6;
  let wet=false,sand=false,seat,pool;
  const banks=[];
  // Search outwards from the landmark and then from the actual water towards dry ground.
  // Stop once a few spaced alternatives are available for a crowded shore.
  for(let distance=.35;distance<=reach && banks.length<4;distance+=.52){
    for(const [dx,dz] of rays){
      const x=o.x+dx*distance,z=o.z+dz*distance;
      const depth=field.depth(x,z);
      if(crab && field.paint?.(x,z)==='sand')sand=true;
      if(depth<.37 || (!gull&&!crab&&!streams.has(field.paint?.(x,z))))continue;
      if(gull && ![[.65,0],[-.65,0],[0,.65],[0,-.65]].every(([a,b])=>field.depth(x+a,z+b)>=.68))continue;
      wet=true;
      for(const [bx,bz] of bankRays){
        for(const offset of [.62,1.14,1.72,2.38]){
          const sx=x+bx*offset,sz=z+bz*offset;
          if(field.depth(sx,sz)>.28 || Math.hypot(sx-o.x,sz-o.z)>reach+.7)continue;
          if(crab && field.paint?.(sx,sz)!=='sand')break;
          const candidate=drySeat(field,nav,sx,sz,r);
          if(!candidate)continue;
          if(crab)sand=true;
          if(!banks.some(p=>Math.hypot(p.x-sx,p.z-sz)<.65)){
            banks.push(candidate);
            if(!seat){seat=candidate;pool={x,z};}
          }
          break;
        }
        if(banks.length>=4)break;
      }
      if(banks.length>=4)break;
    }
  }
  const checks=crab?[true,sand,!!seat]:[true,wet,!!seat];
  return {seat,banks,pool,checks};
}

export function addRegionalHabitats(survey,field,nav,radii,bounds){
  const [left,right,top,bottom]=bounds;
  for(const o of survey.objects){
    const type=landmarks[o.type];
    if(!type || o.x<left||o.x>right||o.z<top||o.z>bottom)continue;
    const site=type==='meadow-hare'?pasture(o,survey,field,nav,radii[type]):coastOrStream(type,o,field,nav,radii[type]);
    const ready=site.checks.every(Boolean);
    survey.options[type].push({...site,at:{x:o.x,z:o.z},anchor:o.id,type,ready});
  }
}

export function localRegionalChecks(type,field,x,z){
  const paint=field.paint?.(x,z),depth=field.depth(x,z);
  if(type==='meadow-hare')return [false,grasses.has(paint),false,false];
  if(type==='shore-crab')return [false,paint==='sand',depth>.06&&depth<.68];
  if(type==='dipper')return [false,streams.has(paint)&&depth>.37,false];
  return [false,depth>.68,false];
}
