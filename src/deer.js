import * as T from 'three';

export function drawDeer(part,agent,tan='#a97850',light='#c49a68',elk=false,ground){
  const hoof='#654c39';
  const stride=.67;
  const phase=(agent.travel??0)/stride;
  const moving=Math.min(1,(agent.gait??agent.speed??0)/.26);
  const graze=agent.grazing??0;
  const bob=Math.sin(phase*Math.PI*4)*.013*moving;
  const segment=(color,x,y,z,yy,zz,width)=>{
    part(color,x,(y+yy)*.5,(z+zz)*.5,width,Math.hypot(y-yy,z-zz)*.56,width,Math.atan2(zz-z,yy-y));
  };
  part(tan,0,.64+bob,-.055,.223,.237,.45);
  part(light,0,.60+bob,.22,.18,.195,.22);
  part('#d4b18a',0,.76,-.44,.09,.105,.076,-.4);
  const headY=.985-.56*graze+bob;
  const headZ=.396+.13*graze;
  const tilt=.19+graze*.55;
  segment(tan,0,.65+bob,.18,headY-.038,headZ,.127);
  part(tan,0,headY,headZ,.116,.123,.173,tilt);
  part(light,0,headY-.031-.067*graze,headZ+.133-.034*graze,.084,.078,.103,tilt);
  part('#524638',0,headY-.017-.112*graze,headZ+.222-.05*graze,.057,.045,.038,tilt);
  for(const side of [-1,1]){
    part('#514538',side*.101,headY+.026,headZ+.059,.021,.024,.023);
    part(tan,side*.112,headY+.104,headZ-.047,.045,.102,.051,-.17,0,-side*.48);
    const horn=elk?1.23:1;
    part(hoof,side*.082,headY+.177*horn,headZ-.09,.018,.108*horn,.019,-.31,0,-side*.29);
    part(hoof,side*.124,headY+.239*horn,headZ-.052,.015,.068*horn,.017,.53,0,-side*.39);
    for(const front of [false,true]){
      const offset=front?(side===1?.25:.75):(side===1?0:.50);
      const cycle=(phase+offset)%1;
      const swing=cycle>.68?(cycle-.68)/.32:0;
      const forward=cycle<=.68?.23-cycle:-.45+.68*(swing*swing*(3-2*swing));
      const lift=Math.sin(swing*Math.PI)*.13*moving;
      const z=front?.251:-.322;
      const x=side*(front?.122:.145);
      const footZ=z+forward*stride*moving;
      const footY=.033+lift+(ground?.(x,footZ)??0);
      const kneeZ=z+(front?.015:-.065)+(footZ-z)*.60;
      const kneeY=.29+lift*.52;
      segment(tan,x,.56+bob,z,kneeY,kneeZ,front?.052:.063);
      segment(light,x,kneeY,kneeZ,footY,footZ,.035);
      part(hoof,x,footY,footZ+.025,.040,.035,.056);
    }
  }
}

export function buildDeer(kit,o,def){
  const group=new T.Group();
  const mesh=new T.InstancedMesh(kit.geometry.rock,kit.materials.basic,32);
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.frustumCulled=false;
  group.add(mesh);
  const local=new T.Object3D(), tint=new T.Color();
  const scale=o.w/.8;
  function pose(agent,ground){
    mesh.count=0;
    drawDeer((color,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>{
      const index=mesh.count++;
      local.position.set(x*scale,y*scale,z*scale);
      local.rotation.set(rx,ry,rz);
      local.scale.set(w*scale,h*scale,d*scale);
      local.updateMatrix();
      mesh.setMatrixAt(index,local.matrix);
      mesh.setColorAt(index,tint.set(color));
    },{...agent,travel:(agent.travel??0)/scale},def.color,def.accent,def.form==='elk',ground);
    mesh.instanceMatrix.needsUpdate=true;
    mesh.instanceColor.needsUpdate=true;
  }
  group.userData.deerPose=pose;
  pose({});
  return group;
}

// Query the floor under each hoof on hills and bridge approaches.
export function hoofGround(nav,a,y,scale){
  const s=Math.sin(a.heading),c=Math.cos(a.heading);
  return (x,z)=>Math.max(-.17,Math.min(.17,(nav.height(a.x+(x*c+z*s)*scale,a.z+(-x*s+z*c)*scale)-y)/scale));
}
