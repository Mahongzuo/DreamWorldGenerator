import {architectureModels} from './architecture-pack-data.js';
import {faunaModels} from './fauna-pack-data.js';
import {natureModels} from './nature-pack-data.js';

export const modelDefinitions={
  'pack-pavilion':{width:4.8,depth:4.8},
  'pack-windmill':{width:5.4,depth:3.7,ambient:'Turn'},
  'pack-greenhouse':{width:4.7,depth:4.2},
  'pack-fox':{width:.82,depth:.82,animal:true,radius:1.025,stride:.73},
  'pack-red-panda':{width:.82,depth:.82,animal:true,radius:1.025,stride:.68,speed:.48},
  'pack-ginkgo':{width:1.7,depth:1.7},
  'pack-basalt':{width:2.1,depth:1.9,collision:true},
  'pack-karst':{width:2.6,depth:1.4,collision:true},
  ...architectureModels,...faunaModels,...natureModels
};
export const modelAsset=id=>modelDefinitions[id]?.asset??id;
export function modelHeight(o){
  const m=modelDefinitions[o.type];
  if(!m?.maxHeight)return null;
  return m.maxHeight*(m.fixedHeight?1:m.animal?o.w/m.width:Math.sqrt(o.w/m.width*o.d/m.depth));
}
export function collisionParts(o){
  const m=modelDefinitions[o.type];
  if(!m?.collisionBoxes)return [o];
  const sx=o.w/m.width,sz=o.d/m.depth,c=Math.cos(o.a),s=Math.sin(o.a);
  return m.collisionBoxes.map(b=>({...o,x:o.x+c*b.x*sx+s*b.z*sz,z:o.z-s*b.x*sx+c*b.z*sz,w:b.w*sx,d:b.d*sz,a:o.a+(b.a??0)}));
}
