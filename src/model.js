import * as T from 'three';

const randFrom = (seed) => {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};

export const defaultState = {
  roof: 'gable', wood: 'cedar', season: 'summer', light: 'day',
  width: 5.6, depth: 4.6, trees: 62, deck: true, chimney: true, fire: true, fireX: 4.85, fireZ: 2.22, seed: 'PINE-0724'
};

const colors = {
  cedar: {wood: '#b77949', end: '#ba8353', trim: '#694b35', roof: '#4e5a56', seam: '#708078', door: '#4b5e47'},
  dark: {wood: '#4f544b', end: '#626656', trim: '#3a4038', roof: '#46504e', seam: '#64736d', door: '#9c6d48'},
  pale: {wood: '#c6a77f', end: '#d7ba8f', trim: '#8b7354', roof: '#796655', seam: '#9e846a', door: '#536d66'}
};

const seasons = {
  summer: {grass: ['#798848','#9c9c56','#adb071','#5b793e'], fir: ['#406749','#557c48','#6f9058','#305942'], leaf: ['#829756','#afaa58','#638a52'], petals: ['#eadd94','#f3e6b8','#d4935e']},
  autumn: {grass: ['#9e8e55','#b7a36a','#b89b61','#7c7b4b'], fir: ['#466751','#627b4c','#748451','#345540'], leaf: ['#c98137','#d7ad48','#a95c37'], petals: ['#e6b975','#c47d43','#dfaf55']},
  winter: {grass: ['#c4d6d5','#dce4e0','#b8cdcc','#a8bdba'], fir: ['#536e62','#719087','#89a4a2','#3d6058'], leaf: ['#b8c8c7','#9baea8','#829d96'], petals: ['#dbe5db','#cdded7','#a6bab5']}
};

function canvasMap(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function woodMap() {
  const random = randFrom('wood-grain');
  return canvasMap(512, 96, (ctx) => {
    ctx.fillStyle = '#f0e5d8';
    ctx.fillRect(0, 0, 512, 96);
    for (let i = 0; i < 350; i++) {
      const y = random() * 96, x = random() * 540 - 24, length = 10 + random() * 120;
      ctx.strokeStyle = i % 4 ? `rgba(89,57,34,${.04 + random() * .12})` : '#fff9';
      ctx.lineWidth = .3 + random() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * .25, y + 1.7, x + length * .65, y - 2.6, x + length, y + 1);
      ctx.stroke();
    }
    for (const [x, y] of [[84, 31], [359, 70]]) {
      for (let i = 1; i < 6; i++) {
        ctx.strokeStyle = `rgba(103,67,43,${.38 / i})`;
        ctx.beginPath();
        ctx.ellipse(x, y, i * 3.8, i * 1.05, -.09, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const edge = ctx.createLinearGradient(0, 0, 0, 96);
    edge.addColorStop(0, '#51392269');
    edge.addColorStop(.08, '#62442800');
    edge.addColorStop(.89, '#62442800');
    edge.addColorStop(.96, '#fff5');
    edge.addColorStop(1, '#6d462d55');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, 512, 96);
  });
}

function glassMap() {
  return canvasMap(128, 128, (ctx) => {
    const shine = ctx.createLinearGradient(0, 0, 50, 128);
    shine.addColorStop(0, '#cfe5da');
    shine.addColorStop(.35, '#a0ae91');
    shine.addColorStop(1, '#8c6543');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#f9ffe135';
    for (const [x, width] of [[-20, 19], [26, 8], [53, 14]]) {
      ctx.beginPath();
      ctx.moveTo(x + 65, 0);
      ctx.lineTo(x + 65 + width, 0);
      ctx.lineTo(x + width, 128);
      ctx.lineTo(x, 128);
      ctx.fill();
    }
  });
}

function firGeometry() {
  const position = [];
  const tint = [];
  const random = randFrom('fir-form');
  const count = 12;
  const rings = [[], [], []];
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count;
    const spike = i % 2 === 0;
    for (const [j, radius, y] of [[0, .48, -.31], [1, spike ? 1 : .72, spike ? -.16 : -.08], [2, .45, .19]]) {
      const variation = .87 + random() * .24;
      rings[j].push([Math.cos(angle) * radius * variation, y + (random() - .5) * .11, Math.sin(angle) * radius * variation]);
    }
  }
  const face = (a, b, c, light) => {
    position.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) tint.push(light, light, light);
  };
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    face([0, -.34, 0], rings[0][i], rings[0][next], .68);
    for (let j = 0; j < 2; j++) {
      face(rings[j][i], rings[j + 1][i], rings[j][next], .72 + random() * .23);
      face(rings[j][next], rings[j + 1][i], rings[j + 1][next], .78 + random() * .22);
    }
    face(rings[2][i], [0, .64, 0], rings[2][next], .87 + random() * .13);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(tint, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function grassGeometry() {
  const position = [];
  const random = randFrom('grass-tuft');
  for (let i = 0; i < 5; i++) {
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle), z = Math.sin(angle);
    position.push(x * .15 - z * .09, 0, z * .15 + x * .09,
      x * .15 + z * .09, 0, z * .15 - x * .09, x * .5, .38 + random() * .62, z * .5);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const material = (opts) => new T.MeshStandardMaterial({roughness: .85, ...opts});

export function createKit() {
  return {
    geometry: {
      box: new T.BoxGeometry(), rock: new T.DodecahedronGeometry(1, 0),
      trunk: new T.CylinderGeometry(.61, 1, 1, 8), disc: new T.CylinderGeometry(1, 1, 1, 12),
      fir: firGeometry(), grass: grassGeometry(), flame: new T.IcosahedronGeometry(1, 0)
    },
    materials: {
      basic: material(), wood: material({map: woodMap(), roughness: .79}),
      metal: material({metalness: .23, roughness: .59}),
      fir: material({vertexColors: true}),
      grass: material({side: T.DoubleSide}),
      window: material({map: glassMap(), roughness: .27, metalness: .13, emissive: '#ffc06b', emissiveIntensity: .28}),
      flame: material({emissive: '#ff761a', emissiveIntensity: 1.4})
    }
  };
}

function batch(kit) {
  const entries = new Map();
  const instance = new T.Object3D();
  const tint = new T.Color();
  function put(shape, surface, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, shadow = true) {
    const key = `${shape}/${surface}/${shadow}`;
    if (!entries.has(key)) entries.set(key, {shape, surface, shadow, parts: []});
    instance.position.set(x, y, z);
    instance.rotation.set(rx, ry, rz);
    instance.scale.set(sx, sy, sz);
    instance.updateMatrix();
    entries.get(key).parts.push([instance.matrix.clone(), color]);
  }
  const box = (color, x, y, z, sx, sy, sz, options = {}) =>
    put('box', options.surface ?? 'basic', color, x, y, z, sx, sy, sz, options.rx, options.ry, options.rz, options.shadow);
  function finish(group) {
    for (const {shape, surface, shadow, parts} of entries.values()) {
      const mesh = new T.InstancedMesh(kit.geometry[shape], kit.materials[surface], parts.length);
      parts.forEach(([matrix, color], i) => {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, tint.set(color));
      });
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
  return {put, box, finish};
}

const center = {x: -.55, z: .55};
export const groundHeight = (x, z) => {
  const falloff = T.MathUtils.smoothstep(Math.hypot(x * .9, z * .85), 2.6, 8);
  return .12 + falloff * (.24 * Math.sin(x * .65 + .7) * Math.cos(z * .51) + .13 * Math.sin(z * .9 + x * .55));
};
const edge = (angle) => 1 + .053 * Math.sin(3 * angle + .5) + .04 * Math.cos(5 * angle) + .022 * Math.sin(8 * angle);

function terrain(palette, seed) {
  const random = randFrom(seed + 'terrain');
  const position = [], tint = [], indices = [];
  const steps = 56, rings = 16;
  const grass = palette.grass.map((color) => new T.Color(color));
  const soil = ['#6e6749','#786b4f','#545745','#817759'].map((color) => new T.Color(color));
  const v = (x, y, z, color) => {
    position.push(x, y, z);
    tint.push(color.r, color.g, color.b);
  };
  v(0, groundHeight(0, 0), 0, grass[0]);
  for (let j = 1; j <= rings + 2; j++) {
    for (let i = 0; i < steps; i++) {
      const angle = i / steps * Math.PI * 2;
      const ratio = Math.min(j / rings, 1) * (j === rings + 2 ? .972 : 1);
      const x = Math.cos(angle) * edge(angle) * ratio * 9.6;
      const z = Math.sin(angle) * edge(angle) * ratio * 8.1;
      const y = j <= rings ? groundHeight(x, z) : j === rings + 1 ? -.28 - random() * .15 : -.82;
      const color = j <= rings
        ? grass[0].clone().lerp(grass[1], .5 + .4 * Math.sin(x * .62 + z * .83))
          .lerp(grass[3], .25 + .25 * Math.sin(z * .91 - x * .41)).multiplyScalar(.91 + random() * .18)
        : soil[Math.floor(random() * soil.length)].clone().multiplyScalar(j === rings + 2 ? .72 : 1);
      v(x, y, z, color);
      const here = 1 + (j - 1) * steps + i;
      const next = 1 + (j - 1) * steps + (i + 1) % steps;
      if (j === 1) indices.push(0, next, here);
      else indices.push(here - steps, next - steps, here, here, next - steps, next);
      if (j === rings + 2) indices.push(1 + (rings + 2) * steps, here, next);
    }
  }
  v(0, -.82, 0, soil[2]);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(tint, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new T.Mesh(geometry, material({vertexColors: true}));
  mesh.receiveShadow = true;
  mesh.userData.owned = true;
  return mesh;
}

function contactShadow() {
  const map = canvasMap(128, 128, (ctx) => {
    const fade = ctx.createRadialGradient(64, 64, 15, 64, 64, 62);
    fade.addColorStop(0, '#2737287a');
    fade.addColorStop(.52, '#27372858');
    fade.addColorStop(1, '#27372800');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 128, 128);
  });
  const plane = new T.Mesh(new T.PlaneGeometry(25, 22), new T.MeshBasicMaterial({map, transparent: true, depthWrite: false}));
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(.6, -.86, .25);
  plane.userData.owned = true;
  return plane;
}

const pathX = (z) => -.55 + .74 + (z - 3.65) * .60 + .36 * Math.sin((z - 3.1) * 1.4);

export function inCampArea(x, z) {
  const angle = Math.atan2(z / 8.1, x / 9.6);
  return z >= 1.45 && Math.hypot(x / 9.6, z / 8.1) < edge(angle) * .84 &&
    (x >= 4.25 || x <= -5.0 || z >= 5.54) && Math.abs(x - pathX(z)) > 1.35;
}

export function buildForest(kit, state) {
  const group = new T.Group();
  const palette = seasons[state.season];
  const random = randFrom(state.seed + 'forest');
  const decorRandom = randFrom(state.seed + 'undergrowth');
  const ground = batch(kit);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const turn = () => random() * Math.PI * 2;
  const place = (minRadius, maxRadius) => {
    const angle = turn(), r = Math.sqrt(random()) * (maxRadius - minRadius) + minRadius;
    return [Math.cos(angle) * edge(angle) * r * 9.6, Math.sin(angle) * edge(angle) * r * 8.1];
  };
  const surface = terrain(palette, state.seed);
  group.add(surface, contactShadow());
  const treeSites = [];
  group.userData = {surface, treeSites};
  const addTree = (x, z, h, broadleaf) => {
    const base = groundHeight(x, z);
    const radius = h * (.13 + random() * .075);
    ground.put('trunk', 'basic', '#68543d', x, base + h * .36, z, h * .033, h * .72, h * .033, 0, turn());
    if (broadleaf) {
      for (let i = 0; i < 7; i++) {
        const a = turn(), spread = i === 0 ? 0 : radius * (.38 + random() * .5);
        const size = radius * (.53 + random() * .32);
        ground.put('rock', 'basic', pick(palette.leaf), x + Math.cos(a) * spread, base + h * (.70 + random() * .22), z + Math.sin(a) * spread, size, size * 1.09, size, 0, a);
      }
      return;
    }
    const baseTurn = turn(), baseColor = new T.Color(pick(palette.fir));
    const tiers = 5 + Math.floor(random() * 2);
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), r = radius * (1 - t * .74);
      const y = base + h * (.28 + t * .65);
      const color = baseColor.clone().lerp(new T.Color(palette.fir[2]), t * .4).multiplyScalar(.91 + random() * .21);
      ground.put('fir', 'fir', color, x + .08 * t, y, z, r, h * (.28 - .08 * t), r, 0, baseTurn + i * .41);
      if (state.season === 'winter' && i % 2 === 0) {
        ground.put('fir', 'fir', '#d5e2db', x + .08 * t, y + h * .048, z, r * .76, h * (.23 - .07 * t), r * .76, 0, baseTurn + i * .41);
      }
    }
  };
  const anchors = [[-5.1,-3.5,5.1],[-3,-5.1,5.9],[-.3,-5.6,6.2],[2,-5.8,5.4],[4.2,-4.4,5.6],[6.15,-2.8,4.6],[-7,-1.7,4.3],[-5.9,1.0,3.4],[7.1,-.8,4.0],[-7.3,2.6,2.4]];
  const target = Math.round(8 + state.trees * .35);
  for (const [x, z, h] of anchors) {
    const px = x + (random() - .5) * .78, pz = z + (random() - .5) * .74;
    treeSites.push([px, pz]);
    addTree(px, pz, h * (.84 + random() * .27), x === -5.9 || x === 7.1);
  }
  for (let tries = 0; tries < 430 && treeSites.length < target; tries++) {
    const [x, z] = place(.46, .92);
    if (Math.hypot(x - defaultState.fireX, z - defaultState.fireZ) < 1.4 || (z > -2.9 && Math.abs(x) < 4.55) || (z > 2.6 && x > -.5) ||
      treeSites.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < .79)) continue;
    treeSites.push([x, z]);
    const height = (.9 + random() * 2.6) * (z < -2 ? 1.24 : .8);
    addTree(x, z, height, random() < .16);
  }
  for (let i = 0; i < 12; i++) {
    const z = 3.25 + i * .389, x = pathX(z) + (random() - .5) * .41;
    const color = pick(['#a7a292','#c2b8a1','#888d7c','#b0aa99']);
    ground.put('rock', 'basic', color, x, groundHeight(x, z) + .019, z,
      .45 + random() * .23, .06 + random() * .025, .21 + random() * .13, .04, (random() - .5) * .8);
    if (i % 2) ground.put('rock', 'basic', '#aaa18d', x - .47, groundHeight(x - .47, z) + .015, z + .08, .21, .046, .13, 0, turn());
  }
  for (let i = 0; i < 820; i++) {
    const angle = decorRandom() * Math.PI * 2;
    const radius = Math.sqrt(decorRandom()) * .94 + .04;
    const x = Math.cos(angle) * edge(angle) * radius * 9.6;
    const z = Math.sin(angle) * edge(angle) * radius * 8.1;
    if ((Math.abs(x - center.x) < 3.75 && Math.abs(z - center.z) < 2.91) ||
        (z > 2.25 && Math.abs(x - pathX(z)) < .66) ||
        (z > 2.4 && z < 4.5 && Math.abs(x - center.x) < 3.28)) continue;
    const clear = state.fire && Math.hypot(x - state.fireX, z - state.fireZ) < 1.23;
    const scatter = clear ? () => {} : ground.put;
    const y = groundHeight(x, z);
    const size = .12 + random() * .30;
    if (i % 16 === 0) {
      const scale = .2 + random() * .43;
      scatter('rock', 'basic', pick(['#7c8070','#999889','#aaa290','#686f61']), x, y + scale * .28, z, scale, scale * .56, scale * .78, random(), turn());
      scatter('rock', 'basic', pick(palette.grass), x - scale * .24, y + scale * .7, z, scale * .52, scale * .11, scale * .56, .14, turn());
    } else {
      scatter('grass', 'grass', pick([...palette.grass, ...palette.fir]), x, y, z, size, size * (.38 + random() * .52), size, 0, turn(), 0, false);
    }
    if (i % 19 === 0 && state.season !== 'winter') {
      const flower = pick(palette.petals);
      for (let j = 0; j < 5; j++) {
        const px = x + (random() - .5) * .51, pz = z + (random() - .5) * .48, h = .06 + random() * .14;
        scatter('trunk', 'basic', '#557647', px, y + h / 2, pz, .008, h, .008, 0, 0, .12, false);
        scatter('rock', 'basic', flower, px, y + h, pz, .036, .021, .035, 0, turn(), 0, false);
      }
    }
  }
  return ground.finish(group);
}

export function buildCabin(kit, state) {
  const group = new T.Group();
  const parts = batch(kit);
  const random = randFrom(state.seed + 'cabin');
  const palette = colors[state.wood];
  const board = new T.Color(palette.wood);
  const trim = palette.trim;
  const {x: cx, z: cz} = center;
  const w = state.width, d = state.depth;
  const left = cx - w / 2, right = cx + w / 2, front = cz + d / 2, back = cz - d / 2;
  const base = .56;
  const alpine = state.roof === 'alpine', shed = state.roof === 'shed';
  const wall = alpine ? .64 : 2.69;
  const rise = alpine ? w * .71 : shed ? w * .24 : w * .37;
  const eaves = base + wall, ridge = eaves + rise;
  const roofY = (x) => shed ? ridge - rise * (x - left) / w : ridge - rise * Math.abs(x - cx) / (w / 2);
  const stain = (amount = .16) => board.clone().multiplyScalar(1 - amount * .55 + random() * amount);
  const wood = (color, x, y, z, a, b, c, opts) => parts.box(color, x, y, z, a, b, c, {surface: 'wood', ...opts});
  const box = parts.box;
  const rock = (color, x, y, z, a, b, c) => parts.put('rock', 'basic', color, x, y, z, a, b, c, random() * .3, random() * 6);

  for (const x of [left + .3, cx, right - .3]) {
    for (const z of [back + .2, front - .15]) {
      const y = groundHeight(x, z);
      box('#8d8f80', x, (base + y) / 2, z, .46, base - y, .46);
      box('#b9b2a0', x, y + .09, z, .54, .18, .53);
    }
  }
  wood(trim, cx, base - .065, cz, w + .2, .22, d + .16);
  box('#6b5140', cx, base + wall / 2, cz, w - .08, wall, d - .08);

  const step = .147;
  for (let row = 0; row * step < ridge - base; row++) {
    const y0 = base + row * step;
    const y = y0 + step * .5;
    const limit = Math.max(0, (ridge - y) / rise);
    const span = y < eaves ? w : Math.min(w, limit * w);
    if (span < .025) continue;
    const x = shed ? left + span / 2 : cx;
    for (const z of [back, front]) wood(stain(), x, y, z, span, step - .009, .083);
    if (y < roofY(left)) wood(stain(), left, y, cz, d, step - .009, .086, {ry: Math.PI / 2});
    if (y < roofY(right)) wood(stain(), right, y, cz, d, step - .009, .086, {ry: Math.PI / 2});
  }
  for (const x of [left, right]) {
    for (const z of [back, front]) {
      const h = roofY(x) - base;
      wood(trim, x, base + h / 2, z, .14, h, .135);
    }
  }

  const roofColor = state.season === 'winter' ? '#a4b5b1' : palette.roof;
  const seam = state.season === 'winter' ? '#bfcfc8' : palette.seam;
  const overhang = alpine ? .33 : .44;
  function panel(x1, x2, slope) {
    const middle = (x1 + x2) * .5;
    const angle = Math.atan(slope);
    const length = (x2 - x1) / Math.cos(angle);
    const depth = d + .83;
    const top = roofY(middle);
    const turns = {rz: angle, surface: 'metal'};
    box(roofColor, middle, top + .04, cz, length + .028, .14, depth, turns);
    for (const z of [cz - depth / 2, cz + depth / 2]) {
      wood(trim, middle, top - .045, z, length + .08, .195, .11, {rz: angle});
      box(seam, middle, top + .117, z, length + .06, .036, .11, turns);
    }
    const count = Math.ceil(depth / .255);
    for (let i = 0; i <= count; i++) {
      const z = cz - depth / 2 + depth * i / count;
      box(i % 5 ? seam : roofColor, middle, top + .135, z, length, .038, .026, turns);
    }
  }
  if (shed) {
    panel(left - overhang, right + overhang, -rise / w);
  } else {
    panel(left - overhang, cx, 2 * rise / w);
    panel(cx, right + overhang, -2 * rise / w);
    box(seam, cx, ridge + .148, cz, .19, .103, d + .89, {surface: 'metal'});
  }

  const face = (side, horizontal, y, offset, sw, sh, thickness, color, surface) => {
    if (side === 'front') box(color, horizontal, y, front + offset, sw, sh, thickness, {surface});
    else if (side === 'back') box(color, horizontal, y, back - offset, sw, sh, thickness, {surface});
    else box(color, right + offset, y, horizontal, sw, sh, thickness, {surface, ry: Math.PI / 2});
  };
  function windowAt(side, x, y, width, height, shutters = false) {
    const frame = '#e0c39a';
    face(side, x, y, .067, width + .24, height + .24, .135, trim, 'wood');
    face(side, x, y, .151, width + .055, height + .055, .05, '#384139');
    face(side, x, y, .183, width, height, .024, '#ffe5b3', 'window');
    face(side, x, y, .218, .056, height, .039, frame, 'wood');
    face(side, x, y, .218, width, .05, .039, frame, 'wood');
    for (const sideX of [-1, 1]) {
      face(side, x + sideX * (width / 2 + .063), y, .197, .075, height + .15, .071, frame, 'wood');
      if (shutters) face(side, x + sideX * (width / 2 + .223), y, .102, .19, height + .06, .073, palette.door, 'wood');
    }
    face(side, x, y + height / 2 + .059, .193, width + .17, .067, .083, frame, 'wood');
    face(side, x, y - height / 2 - .055, .235, width + .29, .083, .18, frame, 'wood');
  }
  const doorX = alpine ? cx + w * .075 : cx + w * .21;
  const doorWidth = alpine ? .9 : 1.02;
  const doorHeight = alpine ? 1.88 : 1.99;
  face('front', doorX, base + doorHeight / 2, .091, doorWidth + .17, doorHeight + .14, .151, trim, 'wood');
  face('front', doorX, base + doorHeight / 2, .174, doorWidth, doorHeight, .08, palette.door, 'wood');
  for (let i = 0; i < 5; i++) {
    face('front', doorX - doorWidth * .38 + doorWidth * i * .19, base + doorHeight / 2, .222, .012, doorHeight - .08, .015, '#344638');
  }
  face('front', doorX, base + doorHeight * .72, .231, doorWidth * .64, .54, .032, '#c4ad83', 'wood');
  face('front', doorX, base + doorHeight * .72, .254, doorWidth * .54, .445, .023, '#ffdb9f', 'window');
  face('front', doorX + doorWidth * .36, base + .96, .254, .058, .076, .057, '#c6a26e', 'metal');
  if (alpine) {
    windowAt('front', cx, base + 2.84, .62, .58);
    windowAt('front', cx - w * .19, base + 1.22, .61, .60);
    const x = cx + w * .22;
    const angle = -Math.atan(2 * rise / w);
    box(trim, x + .072, roofY(x) + .205, cz + .49, .83, .13, 1.25, {rz: angle});
    box('#eadab6', x + .113, roofY(x) + .244, cz + .49, .68, .09, 1.11, {surface: 'window', rz: angle});
  } else {
    windowAt('front', cx - w * .23, base + 1.52, Math.min(1.35, w * .235), .94, true);
    windowAt('side', cz - d * .16, base + 1.48, Math.min(1.64, d * .39), 1.01, true);
    windowAt('back', cx - .28, base + 1.52, 1.18, .85);
    if (!shed) windowAt('front', cx, eaves + rise * .35, .55, .48);
  }
  const lampX = doorX - doorWidth / 2 - .20;
  face('front', lampX, base + 1.66, .153, .145, .23, .11, '#344034');
  face('front', lampX, base + 1.66, .224, .088, .129, .057, '#ffd691', 'window');
  if (state.light !== 'day') {
    const light = new T.PointLight('#ffaf55', state.light === 'night' ? 10 : 3, 6, 2);
    light.position.set(lampX, base + 1.66, front + .44);
    group.add(light);
  }

  if (state.chimney) {
    const x = shed ? cx - w * .29 : cx - w * .21;
    const z = cz - d * .23;
    const low = roofY(x) - .5, high = roofY(x) + 1.01;
    box('#837c6c', x, (high + low) / 2, z, .52, high - low, .56);
    for (let i = 0; i < 10; i++) {
      const y = low + .073 + i * .147;
      for (let j = 0; j < 2; j++) {
        const brick = ['#999085','#a49c8e','#746e62','#b1a597'][Math.floor(random() * 4)];
        box(brick, x + (j - .5) * .266, y, z, .253, .13, .577);
        box(brick, x, y, z + (j - .5) * .27, .538, .131, .256);
      }
    }
    box('#b7aa96', x, high + .035, z, .69, .13, .71);
    box('#484b43', x, high + .104, z, .40, .04, .41);
  }

  const deckDepth = state.deck ? 1.34 : .42;
  const deckWidth = state.deck ? w + .45 : doorWidth + .63;
  const deckX = state.deck ? cx : doorX;
  const deckFront = front + deckDepth;
  const plankCount = Math.ceil(deckWidth / .16);
  for (let i = 0; i < plankCount; i++) {
    const size = deckWidth / plankCount;
    wood(stain(.25), deckX - deckWidth / 2 + (i + .5) * size, base - .02, front + deckDepth / 2,
      deckDepth + .04, .11, size - .012, {ry: Math.PI / 2});
  }
  wood(trim, deckX, base - .14, deckFront, deckWidth, .15, .13);
  for (const x of [deckX - deckWidth / 2 + .14, deckX + deckWidth / 2 - .14]) {
    wood(trim, x, base * .53, deckFront - .16, .15, base * .98, .16);
    if (!state.deck) continue;
    for (const z of [front + .27, deckFront - .05]) wood(trim, x, base + .39, z, .095, .83, .095);
    wood(stain(), x, base + .81, front + .63, .1, .077, .99);
    wood(stain(), x, base + .43, front + .63, .074, .061, .95);
  }
  const stairX = state.deck ? T.MathUtils.clamp(pathX(deckFront + .57), left + .85, right - .85) : doorX;
  for (let i = 0; i < 3; i++) {
    const z = deckFront + .145 + i * .237;
    const floor = groundHeight(stairX, z);
    const top = base - .12 - i * .115;
    box(trim, stairX, (floor + top) / 2, z, 1.39, Math.max(.06, top - floor), .28);
    wood(stain(), stairX, top, z, 1.47, .07, .29);
  }
  if (state.deck) {
    const x = left + .7, z = front + .78;
    const y = base + .29;
    for (const dx of [-.2, .2]) for (const dz of [-.16, .16]) wood(trim, x + dx, base + .13, z + dz, .056, .27, .057);
    wood('#92734e', x, y, z, .53, .072, .46);
    wood(palette.door, x, y + .057, z, .47, .05, .4);
    wood(stain(), x, y + .23, z - .16, .49, .39, .061, {rx: -.13});
    const planterX = right - .35, planterZ = front + .37;
    wood('#9a6949', planterX, base + .15, planterZ, .43, .28, .31);
    for (let i = 0; i < 8; i++) {
      parts.put('grass', 'grass', i % 2 ? '#657c48' : '#91a065', planterX + (random() - .5) * .36,
        base + .28, planterZ + (random() - .5) * .22, .24, .26, .22, 0, random() * 6, 0, false);
    }
  }

  if (state.fire) {
    const x = state.fireX, z = state.fireZ, y = groundHeight(x, z);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      rock(i % 3 ? '#8e8d7f' : '#b1a58e', x + Math.cos(a) * .45, y + .082, z + Math.sin(a) * .45, .165, .138, .173);
    }
    parts.put('disc', 'basic', '#483e31', x, y + .015, z, .39, .044, .39);
    for (let i = 0; i < 4; i++) {
      wood('#745139', x + (i - 1.5) * .09, y + .065, z, .48, .11, .10, {ry: (i % 2 ? 1 : -1) * .73});
    }
    for (let i = 0; i < 5; i++) {
      const a = random() * Math.PI * 2, s = .075 + random() * .06;
      parts.put('flame', 'flame', i % 2 ? '#ffb53c' : '#ffd87b', x + Math.cos(a) * .11, y + .17 + random() * .1,
        z + Math.sin(a) * .11, s, .12 + random() * .15, s, .11, a, .19, false);
    }
    for (const [dx, dz, ry] of [[.90, .57, .95], [-.59, .99, -.15]]) {
      const bx = x + dx, bz = z + dz;
      const h = groundHeight(bx, bz);
      rock('#8d8974', bx - .17, h + .08, bz, .18, .14, .18);
      rock('#9e947f', bx + .18, h + .08, bz, .18, .14, .18);
      wood('#a47b52', bx, h + .22, bz, .79, .14, .29, {ry});
    }
    if (state.light !== 'day') {
      const light = new T.PointLight('#ff9a43', state.light === 'night' ? 12 : 4, 5, 2);
      light.position.set(x, y + .41, z);
      group.add(light);
    }
  }
  return parts.finish(group);
}

export function disposeGroup(group) {
  group.traverse((object) => {
    if (object.isInstancedMesh) object.dispose();
    if (object.userData.owned) {
      object.geometry.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    }
  });
  group.removeFromParent();
}
