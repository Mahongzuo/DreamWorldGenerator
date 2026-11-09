import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildCabin, buildForest, createKit, disposeGroup, groundHeight, inCampArea} from './model.js';

const lighting = {
  day: {sky: '#f0f6e3', ground: '#9aa587', ambient: 2.18, sun: '#ffedcb', power: 2.3, exposure: 1.10, position: [-7, 13, 8], glass: .22},
  gold: {sky: '#ffdeb2', ground: '#8d826a', ambient: 1.76, sun: '#ffba75', power: 3.5, exposure: 1.12, position: [-11, 6, 6], glass: .60},
  night: {sky: '#7fafff', ground: '#647e8c', ambient: 1.1, sun: '#8cb5ff', power: .95, exposure: 1.04, position: [8, 12, -5], glass: 1.58}
};

export function createViewport(stage, onMetrics) {
  const renderer = new T.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.setClearColor(0, 0);
  renderer.domElement.setAttribute('aria-label', '可旋转的林间小屋 3D 视图');
  stage.append(renderer.domElement);

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-10, 10, 8, -8, .1, 130);
  const target = new T.Vector3(0, 1.6, 0);
  const home = new T.Vector3(18.4, 16.1, 24.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = .12;
  controls.minPolarAngle = .36;
  controls.maxPolarAngle = Math.PI * .477;
  controls.enablePan = false;
  controls.minZoom = .65;
  controls.maxZoom = 3.2;
  controls.autoRotateSpeed = .68;
  camera.position.copy(home);
  controls.update();

  const hemisphere = new T.HemisphereLight();
  const sun = new T.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -12, right: 12, top: 11, bottom: -11, near: .1, far: 42});
  sun.shadow.bias = -.00022;
  sun.shadow.normalBias = .044;
  sun.shadow.intensity = .80;
  scene.add(hemisphere, sun);

  let pending = 0, lastTime = 0, metrics = '', forest, cabin, previous, paused = false;
  const kit = createKit();
  const pointer = new T.Vector2();
  const ray = new T.Raycaster();
  const marker = new T.Mesh(new T.RingGeometry(.51, .60, 40), new T.MeshBasicMaterial({side: T.DoubleSide, transparent: true, opacity: .9}));
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);
  let placeCamp;

  function campHit(event) {
    if (!placeCamp || !forest) return null;
    const {left, top, width, height} = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - left) / width * 2 - 1, 1 - (event.clientY - top) / height * 2);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObject(forest.userData.surface)[0];
    if (!hit) return null;
    const x = +hit.point.x.toFixed(2), z = +hit.point.z.toFixed(2);
    const valid = inCampArea(x, z) && forest.userData.treeSites.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 1.25);
    return {x, z, valid};
  }
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!placeCamp) return;
    const site = campHit(event);
    marker.visible = Boolean(site);
    if (site) {
      marker.position.set(site.x, groundHeight(site.x, site.z) + .079, site.z);
      marker.material.color.set(site.valid ? '#f2ffb9' : '#d87860');
    }
    schedule();
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (!marker.visible) return;
    marker.visible = false;
    schedule();
  });
  renderer.domElement.addEventListener('click', (event) => {
    if (placeCamp) placeCamp(campHit(event));
  });

  function placement(handler) {
    placeCamp = handler;
    controls.enabled = !handler;
    stage.classList.toggle('placing', Boolean(handler));
    marker.visible = false;
    schedule();
  }

  function draw() {
    renderer.render(scene, camera);
    const {calls, triangles} = renderer.info.render;
    const next = `${calls} draws  /  ${(triangles / 1000).toFixed(1)}k tris`;
    if (next !== metrics) {
      metrics = next;
      onMetrics(next);
    }
  }

  function tick(now) {
    pending = 0;
    if (document.hidden || paused) return;
    const delta = Math.min(.05, (now - (lastTime || now - 16)) / 1000);
    lastTime = now;
    controls.update(delta);
    draw();
    if (controls.autoRotate) schedule();
  }
  function schedule() {
    if (!pending && !document.hidden && !paused) pending = requestAnimationFrame(tick);
  }
  function resize() {
    const {width, height} = stage.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const aspect = width / height;
    const halfHeight = Math.max(7.75, 10.9 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    schedule();
  }
  controls.addEventListener('change', schedule);
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    paused = !entry.isIntersecting;
    if (!paused) schedule();
  }).observe(stage);
  document.addEventListener('visibilitychange', schedule);
  resize();

  function update(state) {
    const changed = (keys) => !previous || keys.some((key) => previous[key] !== state[key]);
    if (changed(['seed', 'season', 'trees', 'fire', 'fireX', 'fireZ'])) {
      if (forest) disposeGroup(forest);
      forest = buildForest(kit, state);
      scene.add(forest);
    }
    if (changed(['seed', 'roof', 'wood', 'season', 'light', 'width', 'depth', 'deck', 'chimney', 'fire', 'fireX', 'fireZ'])) {
      if (cabin) disposeGroup(cabin);
      cabin = buildCabin(kit, state);
      scene.add(cabin);
    }
    if (changed(['light'])) {
      const look = lighting[state.light];
      hemisphere.color.set(look.sky);
      hemisphere.groundColor.set(look.ground);
      hemisphere.intensity = look.ambient;
      sun.color.set(look.sun);
      sun.intensity = look.power;
      sun.position.set(...look.position);
      renderer.toneMappingExposure = look.exposure;
      kit.materials.window.emissiveIntensity = look.glass;
      stage.dataset.light = state.light;
    }
    previous = {...state};
    renderer.shadowMap.needsUpdate = true;
    schedule();
  }

  function reset() {
    camera.position.copy(home);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.update();
    schedule();
  }

  function snapshot() {
    draw();
    const source = renderer.domElement;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = source.width;
    exportCanvas.height = source.height;
    const ctx = exportCanvas.getContext('2d');
    const [center, edge] = {
      day: ['#e8efe0', '#c3d4c2'], gold: ['#f6e2c4', '#a8aa91'], night: ['#3e5266', '#1b2939']
    }[previous.light];
    const gradient = ctx.createRadialGradient(source.width / 2, source.height * .43, 0, source.width / 2,
      source.height * .43, Math.max(source.width, source.height) * .64);
    gradient.addColorStop(0, center);
    gradient.addColorStop(1, edge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, source.width, source.height);
    ctx.drawImage(source, 0, 0);
    return new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
  }

  return {update, reset, snapshot, placement, orbit(on) { controls.autoRotate = on; schedule(); }};
}
