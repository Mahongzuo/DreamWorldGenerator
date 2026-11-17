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
  ...architectureModels,...faunaModels,...natureModels,
  watermill:{width:4.9,depth:3.8,maxHeight:4.11,ambient:'Turn',
    foundationBox:{x:-.41,z:0,w:3.31,d:2.85},
    collisionBoxes:[{x:-.41,z:0,w:3.31,d:2.85},{x:1.97,z:0,w:.82,d:2.21}]},
  'pasture-shelter':{width:4.4,depth:3.2,maxHeight:3.08,
    collisionBoxes:[{x:0,z:-1.12,w:3.82,d:.16},{x:-1.83,z:0,w:.16,d:2.4},
      {x:0,z:1.13,w:.16,d:.16},{x:1.83,z:1.13,w:.16,d:.16},{x:1.83,z:-1.13,w:.16,d:.16},
      {x:-.46,z:-.58,w:2.06,d:.78},{x:1.13,z:.76,w:1.05,d:.48}]},
  'tidal-rocks':{width:2.8,depth:2,maxHeight:.56,collision:true,
    collisionBoxes:[{x:-.72,z:.09,w:1.12,d:.89},{x:.42,z:-.16,w:1.52,d:.72},{x:.39,z:.60,w:.72,d:.37}]},
  dipper:{width:.45,depth:.45,maxHeight:.34,radius:.31,animal:true,restClip:'Perch',stride:.51,speed:.94,turnRate:2.0},
  'sea-gull':{width:.75,depth:.75,maxHeight:.75,radius:.75,animal:true,restClip:'Perch',stride:1.06,speed:1.05,turnRate:1.38},
  'meadow-hare':{width:.58,depth:.58,maxHeight:.88,radius:.41,animal:true,restClip:'Crouch',stride:.81,speed:.68,turnRate:2.14},
  'shore-crab':{width:.46,depth:.46,maxHeight:.26,radius:.44,animal:true,restClip:'Idle',stride:.38,speed:.34,turnRate:1.85},
  'water-stilt':{asset:'waterside-stilt-house',width:5,depth:3.9,maxHeight:3.76,
    collisionBoxes:[{x:0,z:.06,w:4.25,d:3.02}]},
  'shore-stones':{asset:'waterside-shore-stones',width:2.6,depth:1.55,maxHeight:.782},
  'reeds':{asset:'waterside-reeds',width:.96,depth:.96,maxHeight:1.27},
  'water-lily':{asset:'waterside-lily',width:.77,depth:.77,maxHeight:.173},
  'kingfisher':{asset:'waterside-kingfisher',width:.54,depth:.54,animal:true,restClip:'Perch',
    radius:.42,maxHeight:.514,speed:.93,turnRate:1.8,stride:.54},
  'frog':{asset:'waterside-frog',width:.50,depth:.50,animal:true,restClip:'Crouch',
    radius:.33,maxHeight:.29,speed:.37,turnRate:1.7,stride:.59}
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
