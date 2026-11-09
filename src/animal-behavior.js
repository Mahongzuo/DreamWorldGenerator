import {items} from './sandbox-state.js';
import {modelDefinitions} from './asset-registry.js';
export function animalProfile(o){
  const meta=modelDefinitions[o.type],form=items[o.type].form;
  if(meta?.animal)return {...meta,radius:meta.radius*o.w/meta.width,speed:meta.speed??.58,turnRate:meta.turnRate??1.35};
  const ratio=['deer','elk'].includes(form)?.94:['swan','heron','goose','bear','horse'].includes(form)?.90:
    ['fox','raccoon','squirrel','cow','pig','owl','swallow','kingfisher','beaver'].includes(form)?.79:.72;
  return {radius:Math.max(.15,o.w*ratio),speed:.52+o.w*.16};
}
