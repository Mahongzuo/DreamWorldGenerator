import {addedCatalog, originalNotes} from './field-guide.js';

export const LAND = {x: 15, z: 11.4};
export const MAX_OBJECTS = 120;
export const MAX_STROKES = 100;
export const MAX_POINTS = 140;
export const STORE_KEY = 'linqi-sandbox-v2';

export const catalog = {
  house: {name:'建筑', icon:'cabin', items:[
    ['cedar','雪松木屋','北欧 · 木板坡顶','#a86c43','#4c5c54',5.4,4.2],
    ['alpine','阿尔卑斯屋','北欧 · A 字屋顶','#b3825e','#476272',4.4,4.1],
    ['shed','现代林居','现代 · 单坡屋顶','#8f7760','#48504e',5.1,3.8],
    ['jiangnan','江南民居','中式 · 白墙黛瓦','#d9d8ba','#405c58',6.1,3.9],
    ['pavilion','听雨亭','中式 · 四柱翘檐','#ab6448','#3d6e62',3.6,3.5],
    ['tudor','都铎小屋','西式 · 木骨架','#ddbf94','#a1604d',4.7,3.8],
    ['tower','石砌塔楼','西式 · 尖顶城堡','#a9a193','#566678',3.4,3.4]
  ]},
  water: {name:'水系', icon:'water', items:[
    ['brook','清蓝溪流','清浅 · 砾石岸','#60b2b9','#c3bb8a',2.15],
    ['jade','碧水河道','深绿 · 苔藓岸','#4d9e91','#839a71',2.85],
    ['lotus','荷塘','浮叶 · 莲花','#438c81','#8f9f72',4.3],
    ['pond','山间池塘','靛蓝 · 宽水面','#659ab5','#adad88',4.8]
  ]},
  grass: {name:'草地', icon:'grass', items:[
    ['lawn','嫩绿草甸','低草 · 明亮','#9ca755','#6e8845',3.4],
    ['flowers','野花草地','雏菊 · 黄花','#a7a462','#e5c57d',3.2],
    ['heather','紫色花野','石楠 · 淡紫','#888b62','#c699b0',3.25],
    ['moss','湿地青苔','细苔 · 深绿','#657f4f','#9cad6e',2.7]
  ]},
  decor: {name:'景观', icon:'tree', items:[
    ['stonepath','石板小径','画笔 · 遇水成桥','#a6a28b','#d0c3a2',1.15],
    ['dirtpath','砂土小路','画笔 · 遇水成桥','#b69d70','#c8b487',1.08],
    ['fence','木栅栏','拖画 · 自动立柱','#987048','#c2a174',.9],
    ['rock','叠石','摆件 · 苔石','#9b9b83','#728755',.85],
    ['lantern','石灯笼','摆件 · 暖光','#9a9a85','#e8bb73',.7],
    ['fire','营火','摆件 · 石环','#a49378','#f6ab5e',1.15]
  ]}
};
catalog.plant={name:'植物',icon:'tree',items:[]};
catalog.animal={name:'动物',icon:'animal',items:[]};
catalog.terrain={name:'地形',icon:'terrain',items:[]};
for(const [category,entries] of Object.entries(addedCatalog)) catalog[category].items.push(...entries);

export const items = Object.fromEntries(Object.entries(catalog).flatMap(([category,{items}]) =>
  items.map(([id,name,detail,color,accent,width,depth,form,fact,source]) => [id,{id,category,name,detail,color,accent,width,depth,
    family:detail.split(' · ')[0],form:form??id,fact:fact??originalNotes[id],source,
    brush:['water','grass','terrain'].includes(category)||['stonepath','dirtpath','fence'].includes(id)}])));
export const waterAnimal=o=>['duck','goose','swan','fish'].includes(items[o.type]?.form);
export const flyingAnimal=o=>['owl','swallow','kingfisher','butterfly','dragonfly','bee'].includes(items[o.type]?.form);
export const isTree=id=>items[id]?.category==='plant'&&['针叶树','阔叶树'].includes(items[id].family);
export const isSolid=o=>items[o.type]?.category==='house'||['rock','stone-wall','standing-stone','well','pack-basalt','pack-karst'].includes(o.type);

export const themes = {
  pine: {label:'松溪谷', description:'雪松木屋与清蓝溪流', colors:['#8b9a59','#a7ae72','#5e8157','#77844e'], sky:'#d5e3ce', growth:'pine'},
  ink: {label:'江南水院', description:'白墙黛瓦与荷塘柳岸', colors:['#879b64','#adb582','#63895d','#789558'], sky:'#cddfd1', growth:'willow'},
  keep: {label:'山间古堡', description:'石塔、都铎屋与苔地', colors:['#8c956a','#a9ac78','#6c8a65','#788c66'], sky:'#d1dbd2', growth:'pine'},
  bloom: {label:'暮色花野', description:'花甸与山间池塘', colors:['#a1a35e','#b5a874','#809061','#a59465'], sky:'#e0dbc3', growth:'sakura'},
  blank: {label:'空白沙盘', description:'从第一笔开始', colors:['#98a46a','#afb77c','#809a66','#8f9e62'], sky:'#d7e2cf', growth:null}
};

const obj = (id,type,x,z,w=items[type].width,d=items[type].depth ?? w,a=0) => ({id,type,x,z,w,d,a});
const line = (id,type,p,w=items[type].width) => ({id,type,p,w});
const stream = [[5.7,-8.8],[5.5,-6.8],[6.4,-4.5],[7.5,-2.1],[7.0,.4],[5.5,2.65],[4.7,5.1],[5.3,7.1],[5.7,9.0]];
const shore = [[4.8,-8.3],[5.25,-6.8],[6.45,-5.05],[7,-2.8],[6.75,-.5],[5.9,1.6],[4.4,3.5],[3.95,5.7],[4.7,7.8],[5,9.0]];

export function preset(theme = 'pine') {
  const base = {v:2, theme, seed:'PINE-0724', season:'summer', light:'day', objects:[], strokes:[]};
  switch (theme) {
    case 'pine':
      return {...base, objects:[
        obj(1,'cedar',-2.9,.1,5.65,4.35,.10),obj(2,'alpine',-.6,-6.2,3.45,3.25,.22),
        obj(3,'fire',-3.8,4.4,1.2),obj(4,'pine',8.4,3.6,1.05),obj(5,'rock',9.0,5.1,.76)
      ],strokes:[
        line(6,'brook',stream,2.12),line(7,'stonepath',[[-1,3.4],[-.25,4.6],[1.65,4.85],[4.7,4.9],[7.8,4.62],[10.05,3.55]],1.14),
        line(8,'flowers',[[-7.4,3.35],[-6.3,5.05],[-4.8,5.9]],2.9),line(9,'moss',[[8.5,1.25],[8.7,2.6]],2.1)
      ]};
    case 'ink':
      return {...base, seed:'JIANG-1308', objects:[
        obj(1,'jiangnan',-3.5,-.5,6.1,4.1,.06),obj(2,'pavilion',9.45,1.55,3.65,3.42,-.15),
        obj(3,'jiangnan',-.7,-6.2,4.6,2.8,.05),obj(4,'sakura',-6.7,3.5,1.45),obj(5,'willow',3.05,4.7,1.6),
        obj(6,'lantern',.7,4.1,.78),obj(7,'rock',8.1,4.7,1.12)
      ],strokes:[
        line(8,'jade',shore,2.65),line(9,'lotus',[[7.4,-4.05],[7.6,-2.85],[7.45,-1.6]],4.05),
        line(10,'stonepath',[[-2.25,2.05],[-.45,2.8],[2.15,2.9],[5.4,2.7],[8.2,2.7],[9.5,2.55]],1.25),
        line(11,'moss',[[-5.2,4.8],[-4.1,6.3],[-2,6.9]],3.1)
      ]};
    case 'keep':
      return {...base, seed:'KEEP-1265', season:'autumn', objects:[
        obj(1,'tower',-5.1,-1.9,4.05,4.05,.18),obj(2,'tudor',-1.25,.7,5.3,4.1,.17),
        obj(3,'tower',-.6,-5.25,2.8,2.8,.16),obj(4,'tudor',8.9,-.45,3.9,3.3,-.2),obj(5,'rock',-6.25,4.3,1.25)
      ],strokes:[
        line(6,'pond',[[6.0,6.1],[7.85,5.65],[9.2,4.75]],4.2),
        line(7,'dirtpath',[[-1.6,3.05],[-1.1,4.35],[.6,5.65],[2.2,7.5]],1.4),
        line(8,'fence',[[-7.4,3.4],[-5.6,4.65],[-3.1,5.15]],.9),
        line(9,'moss',[[-7.6,-2.2],[-7.4,.8],[-6.3,1.8]],3.9)
      ]};
    case 'bloom':
      return {...base, seed:'BLOOM-0518', light:'gold', objects:[
        obj(1,'tudor',-3.3,-.25,5,4,.13),obj(2,'shed',1.5,-4.1,4.8,3.3,.06),
        obj(3,'sakura',-6.5,2.7,1.55),obj(4,'sakura',2.5,3.8,1.35),obj(5,'lantern',.8,3.0,.72)
      ],strokes:[
        line(6,'pond',[[6.0,4.75],[7.3,4.0],[8.2,2.45]],4.65),
        line(7,'heather',[[-7.3,4.75],[-5.4,6.1],[-3.1,6.55],[-1.0,6.5]],4.05),
        line(8,'flowers',[[8.1,-3.0],[8.9,-1.5],[10.1,1]],3.5),
        line(9,'dirtpath',[[-2.5,2.0],[-1.5,3.4],[1.3,4.65],[2.7,6.9]],1.10)
      ]};
    default: return {...base, seed:'FIELD-0001'};
  }
}

export const clamp = (n,min,max) => Math.max(min,Math.min(n,max));
export const round = (n) => Math.round(n * 100) / 100;
export const baseHeight = (x,z) => .19 + .12 * Math.sin(x * .44 + .7) * Math.cos(z * .46) + .078 * Math.sin(z * .68 + x * .37);
export function contour(angle) {
  return 1 + .052 * Math.sin(angle * 3 + .5) + .035 * Math.cos(angle * 5) + .018 * Math.sin(angle * 8);
}
export function inside(x,z,margin=0) {
  const u = x / LAND.x, v = z / LAND.z;
  return Math.hypot(u,v) < contour(Math.atan2(v,u)) - margin / LAND.z;
}
export function footprint(object, padding=0) {
  const c = Math.cos(object.a), s = Math.sin(object.a);
  const w = object.w / 2 + padding, d = object.d / 2 + padding;
  return [[-w,-d],[-w,d],[w,d],[w,-d]].map(([x,z]) => [object.x+c*x+s*z,object.z-s*x+c*z]);
}
export function inFootprint(x,z,object,padding=0) {
  const c = Math.cos(object.a), s = Math.sin(object.a);
  const dx=x-object.x, dz=z-object.z;
  return Math.abs(c*dx-s*dz) <= object.w/2+padding && Math.abs(s*dx+c*dz) <= object.d/2+padding;
}

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const coord = (x,limit) => round(clamp(finite(x,0),-limit,limit));
export function normalize(data, limits={}) {
  if (!data || data.v !== 2 || !Object.hasOwn(themes,data.theme) || !Array.isArray(data.objects) || !Array.isArray(data.strokes)) return null;
  const ids = new Set();
  const withId = (entry) => {
    if (!Number.isSafeInteger(entry.id) || entry.id < 1 || entry.id > 1000000000 || ids.has(entry.id)) return false;
    ids.add(entry.id);
    return true;
  };
  return {v:2, theme:data.theme, ...(Object.hasOwn(biomes,data.biome)?{biome:data.biome}:{}), seed:String(data.seed ?? 'FIELD').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,18) || 'FIELD',
    felled:Array.isArray(data.felled)?[...new Set(data.felled.filter(k=>Number.isInteger(k)&&k>=0&&k<190))].slice(0,190):[],
    season:['summer','autumn','winter'].includes(data.season) ? data.season : 'summer',
    light:['day','gold','night'].includes(data.light) ? data.light : 'day',
    objects:data.objects.slice(0,limits.maxObjects??MAX_OBJECTS).filter(o=>o && Object.hasOwn(items,o.type) && !items[o.type].brush && withId(o)).map(o=>{
      const house = items[o.type].category === 'house';
      const object = obj(o.id,o.type,coord(o.x,limits.coordinateLimit??LAND.x),coord(o.z,limits.coordinateLimit??LAND.z),round(clamp(finite(o.w,items[o.type].width),house ? 2.4 : .35,house ? 8 : 3)),
        round(clamp(finite(o.d,items[o.type].depth ?? items[o.type].width),house ? 2.2 : .35,house ? 7 : 3)),round(finite(o.a,0) % (Math.PI * 2)));
      if (['cedar','alpine','shed'].includes(o.type)) {
        object.wood = ['cedar','dark','pale'].includes(o.wood) ? o.wood : 'cedar';
        object.deck = o.deck !== false;
        object.chimney = o.chimney !== false;
      }
      return object;
    }),
    strokes:data.strokes.slice(0,limits.maxStrokes??MAX_STROKES).filter(s=>s && Object.hasOwn(items,s.type) && items[s.type].brush && Array.isArray(s.p) && s.p.length && withId(s)).map(s=>
      line(s.id,s.type,s.p.slice(0,MAX_POINTS).filter(Array.isArray).map(p=>[coord(p[0],limits.coordinateLimit??LAND.x),coord(p[1],limits.coordinateLimit??LAND.z)]),round(clamp(finite(s.w,items[s.type].width),.55,7)))).filter(s=>s.p.length)
  };
}

export function loadWorld() {
  const query = new URL(location.href).searchParams;
  if (query.has('world')) {
    try {
      const raw = query.get('world');
      if (raw.length <= 390000) {
        const decoded = normalize(JSON.parse(atob(raw.replaceAll('-','+').replaceAll('_','/'))));
        if (decoded) return decoded;
      }
    } catch { /* A malformed link starts a fresh world. */ }
    return preset();
  }
  if ([...query].some(([key]) => ['roof','wood','season','light','width','depth','trees','deck','chimney','fire','seed','fireX','fireZ'].includes(key))) {
    const world = preset();
    const primary = world.objects[0];
    primary.type = ({gable:'cedar',alpine:'alpine',shed:'shed'})[query.get('roof')] ?? 'cedar';
    for (const [param,key] of [['width','w'],['depth','d']]) if (query.has(param)) primary[key] = Number(query.get(param));
    primary.wood = query.get('wood');
    primary.deck = query.get('deck') !== '0';
    primary.chimney = query.get('chimney') !== '0';
    if (query.get('fire') === '0') world.objects = world.objects.filter(o=>o.type !== 'fire');
    else if (query.has('fireX') && query.has('fireZ')) {
      const fire = world.objects.find(o=>o.type === 'fire');
      fire.x = Number(query.get('fireX'));
      fire.z = Number(query.get('fireZ'));
    }
    for (const key of ['season','light','seed']) if (query.has(key)) world[key] = query.get(key);
    return normalize(world);
  }
  try { return normalize(JSON.parse(localStorage.getItem(STORE_KEY))) ?? preset(); }
  catch { return preset(); }
}

export const worldLink = (world) => {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('world',btoa(JSON.stringify(world)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,''));
  return url.href;
};

export const ATLAS_KEY='linqi-atlas-v2';
export const biomes={
  forest:{label:'松林群落',detail:'冷杉 · 林鹿 · 林鸟',theme:'pine',growth:'pine',colors:['#819258','#a5ae6c','#5f8159','#778652'],density:36},
  meadow:{label:'野花草甸',detail:'野花 · 野兔 · 蝶群',theme:'bloom',growth:'sakura',colors:['#a1a765','#b3b578','#819558','#9b9c5d'],density:13},
  wetland:{label:'河湾湿地',detail:'垂柳 · 芦苇 · 野鸭',theme:'ink',growth:'willow',colors:['#849968','#a7b47b','#658962','#788f5e'],density:24},
  ridge:{label:'石岭林缘',detail:'岩石 · 冷杉 · 林鹿',theme:'keep',growth:'pine',colors:['#939a70','#a6a87c','#78876a','#8b9374'],density:18}
};
export const biomeOf=world=>world.biome??({pine:'forest',ink:'wetland',keep:'ridge',bloom:'meadow',blank:'meadow'})[world.theme];
export const tileKey=(x,z)=>x+','+z;
export const tileShift=(x,z)=>[x*LAND.x*2,z*LAND.z*2];
export const tileInside=(x,z,margin=0)=>Math.abs(x)<LAND.x-margin&&Math.abs(z)<LAND.z-margin;
export function continentHeight(x,z) {
  const waves=.49*Math.sin(x*.085+z*.042)*Math.cos(z*.078-x*.024)
    +.22*Math.sin(x*.142-z*.127)+.15*Math.cos(x*.174+z*.21);
  return baseHeight(x,z)+.56+waves;
}

function hashTile(seed,x,z){
  let n=2166136261;
  for(const ch of seed+'/'+x+'/'+z) n=Math.imul(n^ch.charCodeAt(0),16777619);
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  return (n^(n>>>16))>>>0;
}
export function wildTile(seed,x,z) {
  const hash=hashTile(seed,x,z);
  const biome=['forest','meadow','wetland','ridge'][hash%4];
  const world={v:2,theme:biomes[biome].theme,biome,seed:'LAND-'+hash.toString(36).toUpperCase(),
    season:'summer',light:'day',objects:[],strokes:[]};
  const shift=((hash>>>12)%19-9)*.39;
  if(biome==='wetland'){
    world.strokes=[
      line(1,'jade',[[-10,-6+shift],[-7,-3.7+shift],[-4,-3.2+shift],[-.4,-1.1+shift],[3.2,1.4+shift],[8.9,2.4+shift]],3.08),
      line(2,'lotus',[[4.4,1.9+shift],[7.2,2.3+shift],[9,1.8+shift]],4.38)
    ];
  }else if(biome==='meadow'){
    world.strokes=[
      line(1,'flowers',[[-8,-3.2+shift],[-6,-2+shift],[-3,0+shift]],4.8),
      line(2,'heather',[[5,-3.5+shift],[5.3,-.8+shift],[8,1+shift]],4.6)
    ];
  }else if(biome==='ridge'){
    world.strokes=[line(1,'moss',[[-8,3.6],[-4.5,2.1],[-1.2,-.2]],3.7)];
  }
  return world;
}
