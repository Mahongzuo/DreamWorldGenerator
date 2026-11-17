export const shoreSpecies = {frog:'池蛙', kingfisher:'翠鸟', dipper:'白喉河乌', 'meadow-hare':'欧洲野兔', 'sea-gull':'海鸥', 'shore-crab':'岸蟹'};

export function normalizeShore(value) {
  const visits = [];
  const used = new Set();
  for (const note of Array.isArray(value?.visits) ? value.visits : []) {
    if (!note || !Object.hasOwn(shoreSpecies,note.type) ||
        ![note.x,note.z].every(n => Number.isFinite(n) && Math.abs(n) <= 3000015)) continue;
    const key = note.type + '/' + shoreRegion(note.x,note.z);
    if (used.has(key)) continue;
    used.add(key);
    visits.push({type:note.type, x:note.x, z:note.z});
    if (visits.length >= 1024) break;
  }
  return {skipped:value?.skipped === true, visits};
}

export function shoreRegion(x,z) {
  return [Math.floor((x+15)/30),Math.floor((z+11.4)/22.8)].join(',');
}

export function recordShoreVisit(game,target) {
  if (!target?.wildVisitor || !Object.hasOwn(shoreSpecies,target.type)) return game;
  const shore = game.shore ?? normalizeShore();
  const note = {type:target.type,x:target.x,z:target.z};
  if (![note.x,note.z].every(Number.isFinite) || shore.visits.some(v => v.type === note.type && shoreRegion(v.x,v.z) === shoreRegion(note.x,note.z))) return game;
  return {...game,shore:{...shore,visits:[...shore.visits,note].slice(-1024)}};
}
