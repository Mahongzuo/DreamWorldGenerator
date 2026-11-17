import * as T from 'three';
import {LAND,tileShift} from './sandbox-state.js';

export function createFrontierOverlay(scene,height){
  let group;
  return preview=>{
    if(group){group.removeFromParent();for(const line of group.children){line.geometry.dispose();line.material.dispose();}group=null;}
    if(!preview)return;
    group=new T.Group();scene.add(group);
    const {edge,ports}=preview,[x,z]=tileShift(edge.x,edge.z);
    function line(coords,color,loop=false){
      const pts=[];
      for(let i=1;i<coords.length;i++){
        const a=coords[i-1],b=coords[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.4));
        for(let n=0;n<=steps;n++){const xx=a[0]+(b[0]-a[0])*n/steps,zz=a[1]+(b[1]-a[1])*n/steps;pts.push(new T.Vector3(xx,height(xx,zz)+.08,zz));}
      }
      const geometry=new T.BufferGeometry().setFromPoints(pts);
      const path=new T.Line(geometry,loop?new T.LineDashedMaterial({color,dashSize:.68,gapSize:.22,depthTest:false}):new T.LineBasicMaterial({color,depthTest:false}));
      path.computeLineDistances();path.renderOrder=18;group.add(path);
    }
    const a=[x-LAND.x,z-LAND.z],b=[x+LAND.x,z-LAND.z],c=[x+LAND.x,z+LAND.z],d=[x-LAND.x,z+LAND.z];
    const vertices=[],triangles=[],cols=12,rows=10;
    for(let iz=0;iz<=rows;iz++)for(let ix=0;ix<=cols;ix++){
      const xx=x+LAND.x*(2*ix/cols-1),zz=z+LAND.z*(2*iz/rows-1);
      vertices.push(xx,height(xx,zz)+.025,zz);
      if(!ix||!iz)continue;
      const i=vertices.length/3-1;triangles.push(i-cols-2,i-1,i,i-cols-2,i,i-cols-1);
    }
    const fill=new T.BufferGeometry();fill.setAttribute('position',new T.Float32BufferAttribute(vertices,3));fill.setIndex(triangles);
    const surface=new T.Mesh(fill,new T.MeshBasicMaterial({color:0x7db498,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}));
    surface.renderOrder=7;group.add(surface);
    line([a,b,c,d,a],0x47654d,true);
    for(const port of ports){
      const [px,pz]=port.p,color=port.kind==='river'?0x56d5e3:0xffb879;
      line([[px+port.dx*1.3,pz+port.dz*1.3],[px-port.dx*2,pz-port.dz*2]],color);
      const radius=.41,ring=Array.from({length:17},(_,i)=>[px+radius*Math.cos(i*Math.PI/8),pz+radius*Math.sin(i*Math.PI/8)]);
      line(ring,color);
    }
  };
}
