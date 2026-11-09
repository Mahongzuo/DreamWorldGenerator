// One source of dimensions for visible surfaces, capsule contacts and traversal targets.
export const traversalTypes={
 'garden-low-wall':{height:.85,steps:1,kind:'wall'},
 'timber-platform':{height:.95,steps:1,kind:'wood'},
 'stone-terrace':{height:1.55,steps:1,kind:'stone'},
 'garden-stairs':{height:1.5,steps:6,kind:'stairs'}
};
export const isTraversable=type=>type==='stone-wall'||Object.hasOwn(traversalTypes,type);
export function traversalBoxes(o){
 if(o.type==='stone-wall')return Array.from({length:12},(_,i)=>{const j=Math.floor(i/4),k=i%4;return {x:(k-1.5+j*.09)*o.w*.27,z:0,bottom:o.w*(.09+j*.15-.143/2),top:o.w*(.09+j*.15+.143/2),w:o.w*.25,d:o.w*.31};});
 const spec=traversalTypes[o.type];if(!spec)return [];
 return Array.from({length:spec.steps},(_,i)=>({x:0,z:-o.d/2+(i+.5)*o.d/spec.steps,w:o.w,d:o.d/spec.steps,bottom:0,top:spec.height*(i+1)/spec.steps}));
}
export function worldTraversalBoxes(o,base=0){const c=Math.cos(o.a),s=Math.sin(o.a);return traversalBoxes(o).map((b,index)=>({...o,x:o.x+c*b.x+s*b.z,z:o.z-s*b.x+c*b.z,w:b.w,d:b.d,bottom:base+b.bottom,top:base+b.top,surface:true,sourceId:o.id,index}));}
export function traversalAnchor(field,o){
 if(o.type==='garden-stairs'){const z=-o.d/2-.08;return field.height(o.x+Math.sin(o.a)*z,o.z+Math.cos(o.a)*z);}
 return field.height(o.x,o.z);
}
