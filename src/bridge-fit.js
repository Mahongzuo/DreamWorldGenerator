// Fit the two plank ends to their actual banks. Local X follows the bridge span.
export function bridgeFit(field,o){
  const ux=Math.cos(o.a),uz=-Math.sin(o.a),half=o.w*.5;
  const minimum=field.depth(o.x,o.z)>.56?field.level:-Infinity;
  function end(distance){
    const x=o.x+ux*distance,z=o.z+uz*distance;
    return field.depth(x,z)>.42?field.level:Math.max(minimum,field.height(x,z)-.10);
  }
  const left=end(-half),right=end(half);
  return {base:(left+right)*.5,slope:(right-left)/o.w};
}
