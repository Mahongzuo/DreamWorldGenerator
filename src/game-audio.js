export const soundtracks = {
  forest: '林间琴语 · 钢琴',
  garden: '水院清音 · 五声拨弦',
  village: '山村小调 · 长笛与拨弦',
  coast: '海岸午后 · 木琴',
  night: '月下微光 · 铃音与氛围',
};

const defaults = { enabled: false, track: 'auto', music: 55, ambient: 45, effects: 65 };
const volume = value => Math.max(0, Math.min(100, Number(value))) / 100;
const storageKey = 'linqi-audio-v1';

export function sceneTrack(meta, light) {
  if (light === 'night') return 'night';
  if (meta.scene === 'garden' || meta.theme === 'ink') return 'garden';
  if (meta.scene === 'village' || meta.theme === 'keep') return 'village';
  if (meta.scene === 'coast' || meta.theme === 'coast' || meta.biome === 'tropical') return 'coast';
  return 'forest';
}

export function createGameAudio(onStatus) {
  const settings = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) {
      for (const key of ['music', 'ambient', 'effects']) {
        if (Number.isFinite(saved[key])) settings[key] = volume(saved[key]) * 100;
      }
      if (Object.hasOwn(soundtracks, saved.track) || ['auto', 'none'].includes(saved.track)) settings.track = saved.track;
      settings.enabled = saved.enabled === true;
    }
  } catch {}
  let context, master, music, ambient, effects, wind, stream, currentMusic, loading;
  let scene = { track: 'forest', water: 0, night: false }, natureTimer;
  const samples = new Map();
  const audible = () => settings.enabled && context?.state === 'running' && !document.hidden;
  const smooth = (gain, target, time = .12) => gain.gain.setTargetAtTime(target, context.currentTime, time);

  function noiseLoop(frequency, lowpass) {
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      low += (white - low) * .13;
      const edge = Math.min(1, i / 480, (data.length - 1 - i) / 480);
      data[i] = low * edge * (.80 + .12 * Math.sin(i * Math.PI * 2 / data.length));
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = lowpass ? 'lowpass' : 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = .45;
    const gain = context.createGain();
    gain.gain.value = 0;
    source.buffer = buffer;
    source.loop = true;
    source.connect(filter).connect(gain).connect(ambient);
    source.start();
    return gain;
  }

  function initialize() {
    if (context) return;
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) throw Error('Web Audio unavailable');
    context = new Audio();
    master = context.createGain();
    music = context.createGain();
    ambient = context.createGain();
    effects = context.createGain();
    for (const bus of [music, ambient, effects]) bus.connect(master);
    master.connect(context.destination);
    master.gain.value = 0;
    wind = noiseLoop(420, true);
    stream = noiseLoop(1100, false);
  }

  function updateMix() {
    if (!context) return;
    smooth(master, audible() ? .8 : 0, .035);
    smooth(music, volume(settings.music) * .7);
    smooth(ambient, volume(settings.ambient));
    smooth(effects, volume(settings.effects));
    smooth(wind, scene.night ? .14 : .22, .7);
    smooth(stream, .65 * scene.water, .32);
  }

  function retireMusic() {
    if (!currentMusic) return;
    const { source, gain } = currentMusic;
    currentMusic = null;
    smooth(gain, 0, .075);
    source.stop(context.currentTime + .4);
  }

  async function updateTrack() {
    const id = settings.track === 'auto' ? scene.track : settings.track;
    if (!settings.enabled || id === 'none') {
      loading?.abort.abort();
      loading = null;
      retireMusic();
      onStatus(settings.enabled ? '配乐已关闭' : '声音已静音');
      return;
    }
    if (!audible()) return;
    if (currentMusic?.id === id) {
      if (loading?.id !== id) {
        loading?.abort.abort();
        loading = null;
      }
      onStatus('正在播放 · ' + soundtracks[id]);
      return;
    }
    if (loading?.id === id) return;
    loading?.abort.abort();
    const request = { id, abort: new AbortController() };
    loading = request;
    onStatus('正在载入 · ' + soundtracks[id]);
    try {
      const response = await fetch(import.meta.env.BASE_URL + 'audio/' + id + '.m4a', { signal: request.abort.signal });
      if (!response.ok) throw Error('Soundtrack unavailable');
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (loading !== request || !settings.enabled) return;
      retireMusic();
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = 0;
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain).connect(music);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      currentMusic = { id, source, gain };
      source.start();
      smooth(gain, 1, .17);
      onStatus('正在播放 · ' + soundtracks[id]);
    } catch {
      if (loading === request) onStatus('配乐载入失败，重新选择可重试');
    } finally {
      if (loading === request) loading = null;
    }
  }

  const tones = {
    grass: [.11, 92, .25, .65], dirt: [.095, 92, .34, .35], wood: [.13, 143, .56, .21],
    stone: [.115, 360, .43, .38], land: [.22, 72, .55, .64], build: [.19, 254, .54, .32],
    chop: [.19, 125, .48, .80], mine: [.24, 590, .50, .65], dig: [.18, 83, .27, .78],
    hit: [.20, 109, .60, .62], reward: [.47, 523, .52, .04], bird: [.46, 1900, .47, .03],
    cricket: [.28, 3450, .30, .07], vault: [.17, 108, .30, .53],
  };

  function play(name, strength = 1) {
    if (!audible()) return;
    const tone = tones[name];
    if (!tone) return;
    const isNature = name === 'bird' || name === 'cricket';
    if ((isNature ? settings.ambient : settings.effects) === 0) return;
    if (!samples.has(name)) {
      const [duration, frequency, body, grit] = tone;
      const buffer = context.createBuffer(1, Math.ceil(duration * context.sampleRate), context.sampleRate);
      const data = buffer.getChannelData(0);
      let phase = 0, noise = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / context.sampleRate;
        const u = t / duration;
        const hz = name === 'bird' ? frequency * (1 + .24 * Math.sin(27 * t)) :
          name === 'reward' ? frequency * (u < .24 ? 1 : u < .46 ? 1.25 : 1.5) : frequency * (1.35 - u * .65);
        phase += Math.PI * 2 * hz / context.sampleRate;
        noise += (Math.random() * 2 - 1 - noise) * (name === 'stone' || name === 'mine' ? .55 : .24);
        const pulse = isNature ? Math.pow(Math.max(0, Math.sin(t * (name === 'bird' ? 22 : 66))), 1.4) : 1;
        const envelope = Math.min(1, t / .008) * (1 - u) ** (isNature ? .8 : 2.4);
        data[i] = envelope * pulse * (body * (Math.sin(phase) + .19 * Math.sin(phase * 2.13)) + grit * noise) * .65;
      }
      samples.set(name, buffer);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = strength * (isNature ? .20 : .62);
    source.buffer = samples.get(name);
    source.playbackRate.value = .92 + Math.random() * .16;
    source.connect(gain).connect(isNature ? ambient : effects);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
  }

  function scheduleNature() {
    clearTimeout(natureTimer);
    if (!audible()) return;
    natureTimer = setTimeout(() => {
      play(scene.night ? 'cricket' : 'bird');
      scheduleNature();
    }, 2800 + Math.random() * 5200);
  }

  async function refresh() {
    if (!context) return;
    if (!settings.enabled || document.hidden) {
      updateMix();
      scheduleNature();
      if (!settings.enabled) void updateTrack();
      if (context.state === 'running') await context.suspend();
      return;
    }
    await context.resume();
    updateMix();
    scheduleNature();
    void updateTrack();
  }

  async function unlock() {
    if (!settings.enabled) return;
    try {
      initialize();
      await refresh();
    } catch {
      onStatus('声音启动失败，可再次开启声音重试');
    }
  }

  document.addEventListener('visibilitychange', () => { void refresh().catch(() => {}); });
  return {
    settings,
    unlock,
    play,
    configure(patch) {
      const wasEnabled = settings.enabled;
      Object.assign(settings, patch);
      try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
      if (settings.enabled !== wasEnabled) {
        if (settings.enabled) void unlock();
        else void refresh().catch(() => {});
      } else {
        updateMix();
        if (patch.track !== undefined) void updateTrack();
      }
    },
    setScene(meta, light, water) {
      const track = sceneTrack(meta, light);
      const changed = track !== scene.track;
      scene = { track, night: light === 'night', water };
      updateMix();
      if (changed && settings.track === 'auto') void updateTrack();
    },
    setWater(water) {
      if (Math.abs(water - scene.water) < .025) return;
      scene.water = water;
      updateMix();
    },
  };
}
