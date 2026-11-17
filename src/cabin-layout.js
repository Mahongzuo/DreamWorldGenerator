import {createRoadCoverage} from './road-coverage.js';

export const MIN_RIDGE_RISE = .35;
export const MAX_RIDGE_RISE = 4;
export const CABIN_FLOOR = .56;
const EMPTY_STROKES = Object.freeze([]);
export const CABIN_EAVES = CABIN_FLOOR + 2.69;
const faces = [
  ['front', 0, 1], ['right', 1, 0], ['back', 0, -1], ['left', -1, 0]
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function cabinRise(o) {
  return clamp(Number.isFinite(o.ridgeRise) ? o.ridgeRise : o.w * .37, MIN_RIDGE_RISE, MAX_RIDGE_RISE);
}

// u runs along the wall as seen from outside, v runs out from its surface.
export function facadePoint(face, u, v = 0) {
  return {x: face.nz * u + face.nx * (face.offset + v),
          z: -face.nx * u + face.nz * (face.offset + v)};
}

function makeFacade(o, [side, nx, nz]) {
  const span = nx ? o.d : o.w;
  const count = Math.max(1, Math.floor((span - .2) / 1.36));
  const pitch = (span - .2) / count;
  const bays = Array.from({length: count}, (_, i) => (i + .5 - count / 2) * pitch);
  return {side, nx, nz, yaw: Math.atan2(nx, nz), offset: (nx ? o.w : o.d) / 2,
    span, pitch, bays, openings: []};
}

function nearestBay(face, u) {
  return face.bays.reduce((best, slot) => Math.abs(slot - u) < Math.abs(best - u) ? slot : best);
}

// Follow the near end of the approach through the finished paint layer. A
// material overlay still counts as road; a lone remnant at the wall does not.
function connectedApproach(coverage, stroke, points, index, direction, x, z, hitX, hitZ) {
  if (!coverage.typeAt(x,z)) return false;
  const required = .90;
  let length = 0, survivingDirection = false;
  function reaches(xx, zz) {
    const dx = xx-x, dz = zz-z, span = Math.hypot(dx,dz);
    if (span < .00001) return true;
    const distance = Math.min(span, required-length), n = Math.ceil(distance/.08);
    for (let i=1;i<=n;i++) {
      const t = distance*i/(n*span);
      const px=x+t*dx, pz=z+t*dz;
      if (!coverage.typeAt(px,pz)) return false;
      if (!survivingDirection) survivingDirection=coverage.survivesAt(stroke,px,pz);
    }
    length += distance;
    x = xx; z = zz;
    return true;
  }
  if (!reaches(hitX,hitZ)) return false;
  for (let i=index; i>=0 && i<points.length && length < required; i+=direction) {
    if (!reaches(...points[i])) return false;
  }
  return survivingDirection && length >= required-.00001;
}

function roadEntrance(o, facades, strokes) {
  const coverage = createRoadCoverage(strokes);
  const cos = Math.cos(o.a), sin = Math.sin(o.a);
  // Keep the first still-connected road. Adding another road elsewhere cannot
  // move the door until the original approach has actually been removed.
  const halfX = (Math.abs(cos)*o.w + Math.abs(sin)*o.d)/2 + .08;
  const halfZ = (Math.abs(sin)*o.w + Math.abs(cos)*o.d)/2 + .08;
  for (const {stroke, points, bounds} of coverage.paths) {
    if (bounds.maxX < o.x-halfX || bounds.minX > o.x+halfX ||
        bounds.maxZ < o.z-halfZ || bounds.minZ > o.z+halfZ) continue;
    let best;
    for (const face of facades) {
      const nx = cos * face.nx + sin * face.nz, nz = -sin * face.nx + cos * face.nz;
      const wallX = o.x + nx * face.offset, wallZ = o.z + nz * face.offset;
      let prev;
      for (let i=0; i<points.length; i++) {
        const [x,z] = points[i];
        const v = (x - wallX) * nx + (z - wallZ) * nz;
        const u = (x - wallX) * nz - (z - wallZ) * nx;
        if (prev) {
          const dv = v - prev.v, du = u - prev.u;
          const gap = Math.max(0, Math.min(v, prev.v));
          if (Math.max(v, prev.v) > .015 && gap <= stroke.w / 2 &&
              Math.abs(dv) > .6 * Math.abs(du) && Math.abs(dv) > .00001) {
            const t = clamp(-prev.v/dv,0,1), contact = prev.u + du*t;
            const px = wallX + nz * contact, pz = wallZ - nx * contact;
            if (Math.abs(contact) <= face.span / 2 - .08 &&
                connectedApproach(coverage,stroke,points,dv>0 ? i : i-1,dv>0 ? 1 : -1,
                  px+nx*.04,pz+nz*.04,px+nx*gap,pz+nz*gap)) {
              const u = clamp(contact, .82 - face.span / 2, face.span / 2 - .82);
              const score = gap + Math.abs(u - contact);
              if (!best || score < best.score) best = {side: face.side, u, score};
            }
          }
        }
        prev = {u, v};
      }
    }
    if (best) return {side: best.side, u: best.u};
  }
  return {side: 'front', u: nearestBay(facades[0], .21 * o.w)};
}

// Bounds include the top corners of the window casing, not just the glass.
export function atticWindowFits(width, eaves, rise, y, glassWidth, glassHeight) {
  const edge = (glassWidth + .27) / 2;
  const roofAtFrame = eaves + rise * (1 - 2 * edge / width);
  return y + glassHeight / 2 + .15 <= roofAtFrame;
}

function layoutPorch(o, entry, face, ground) {
  const walkable = [], rails = [];
  const depth = o.deck !== false ? 1.34 : .68;
  const width = o.deck !== false ? face.span + .24 : 1.52;
  const center = o.deck !== false ? 0 : entry.u;
  function part(kind, u, v, w, d, bottom, top) {
    return {kind, ...facadePoint(face, u, v), a: face.yaw, w, d, bottom, top};
  }
  const deck = part('deck', center, depth / 2, width, depth, CABIN_FLOOR - .16, CABIN_FLOOR);
  walkable.push(deck);
  const tread = .32;
  let count = 0, difference = 0;
  // Locate the landing on the actual slope; a longer flight ends at a
  // different ground height. Flat ground normally gives three treads.
  for (; count < 16; count++) {
    const p = facadePoint(face, entry.u, depth + count * tread + .07);
    difference = CABIN_FLOOR - ground(p.x, p.z);
    if (Math.abs(difference) <= .155 * (count + 1)) break;
  }
  for (let i = 0; i < count; i++) {
    const v = depth + (i + .5) * tread;
    const p = facadePoint(face, entry.u, v);
    const top = CABIN_FLOOR - difference * (i + 1) / (count + 1);
    walkable.push(part('step', entry.u, v, 1.46, tread, Math.min(ground(p.x, p.z) - .025, top - .075), top));
  }
  if (o.deck !== false) {
    for (const sign of [-1, 1]) {
      const edge = center + sign * (width / 2 - .07);
      rails.push(part('rail', edge, depth / 2, .09, depth - .14, CABIN_FLOOR, CABIN_FLOOR + .83));
      const opening = entry.u + sign * .8;
      const length = (edge - opening) * sign;
      if (length > .16) rails.push(part('rail', (edge + opening) / 2, depth - .07, length, .09, CABIN_FLOOR, CABIN_FLOOR + .83));
    }
  }
  const porchPosts = [-1, 1].map(sign => {
    const p = facadePoint(face, center + sign * (width/2-.11), depth-.10);
    return {...p,bottom:ground(p.x,p.z)};
  });
  return {walkable, rails, porchPosts};
}

export function resolveCabinLayout(o, world, field) {
  const facades = faces.map(spec => makeFacade(o, spec));
  const entry = roadEntrance(o, facades, world.strokes ?? EMPTY_STROKES);
  // The door and stairs share an axis with the incoming road. Lay out full
  // bays on either side of that axis and absorb the remainder at the corners.
  const entryFace = facades.find(face => face.side === entry.side);
  const pitch = Math.min(1.56, entryFace.pitch);
  const bays = [entry.u], limit = entryFace.span / 2 - .66;
  for (let i = 1; entry.u - i*pitch >= -limit; i++) bays.unshift(entry.u - i*pitch);
  for (let i = 1; entry.u + i*pitch <= limit; i++) bays.push(entry.u + i*pitch);
  entryFace.bays = bays;
  entryFace.pitch = pitch;
  const ridgeRise = cabinRise(o);
  for (const face of facades) {
    for (const u of face.bays) {
      const door = face.side === entry.side && u === entry.u;
      face.openings.push(door
        ? {kind:'door', u, width:1.02, bottom:CABIN_FLOOR, height:1.99}
        : {kind:'window', u, width:.85, bottom:CABIN_FLOOR + 1.04, height:.89});
    }
    if (face.nz) {
      const y = CABIN_EAVES + ridgeRise * .39;
      if (atticWindowFits(o.w, CABIN_EAVES, ridgeRise, y, .53, .46) && y - .35 >= CABIN_EAVES)
        face.openings.push({kind:'attic', u:0, width:.53, bottom:y - .23, height:.46});
    }
  }
  const cos = Math.cos(o.a), sin = Math.sin(o.a), base = field.height(o.x, o.z);
  const ground = (x, z) => field.height(o.x + cos * x + sin * z, o.z - sin * x + cos * z) - base;
  const piers = [];
  for (const x of [-o.w/2+.3,0,o.w/2-.3]) for (const z of [-o.d/2+.2,o.d/2-.15])
    piers.push({x,z,bottom:ground(x,z)});
  return {ridgeRise, eaves:CABIN_EAVES, entry, facades, piers, ...layoutPorch(o, entry, entryFace, ground)};
}
