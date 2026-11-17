// Layouts use ordinary editable objects and brush strokes in local plot coordinates.
// Object tuples: type, x, z, uniform scale, yaw (radians).
// Coordinates use metres. The gaps at bridge entrances keep automatic path planks off the deck.
const canal={
  objects:[
    ['build-huizhou',-7.2,-6.4,.87,.02],['water-stilt',5.7,-5.5,.91,-.09],
    ['water-stilt',5.4,6.7,.84,.05],['build-teahall',-8.6,5.8,.83,0],
    ['build-covered-bridge',0,.6,1,0],['build-moon-gate',-7,1.2,.93,Math.PI/2],
    ['nature-willow',2.5,3.1,.83,0],['nature-bamboo',-12,-6,.78,.22],
    ['reeds',-1.88,-3.4,1,.12],['reeds',1.82,7.9,.86,-.2],
    ['water-lily',-.45,-5.4,.95,0],['nature-wisteria',-11.5,1.9,.8,0],
    ['nature-willow',-2.85,-5.3,1.05,1.15],['willow',-3.25,7.5,1.4,.38],
    ['nature-bamboo',-9.8,-2.2,.94,.75],['reeds',2,4.85,.88,.42],
    ['water-lily',.72,6.1,1,.8],
    ['shore-stones',2.4,-1.7,.82,.3],['lantern',-3.9,1.7,.93,0],
    ['lantern',3.94,1.7,.93,0],['rock',-2.3,6.3,.87,.3],
    ['mallard',0,-6.7,1,0],['mallard',.24,6.7,.92,1.3]
  ],
  strokes:[
    ['jade',[[0,-11.4],[-.42,-6],[-.12,-2],[0,2],[.28,6],[0,11.4]],3.1],
    ['lotus',[[-.48,-6.4],[-.18,-4.5]],3.35],
    ['stonepath',[[-15,.6],[-7,1.2],[-3.55,.6]],1.15],
    ['stonepath',[[3.55,.6],[7,.6],[15,.6]],1.15],
    ['stonepath',[[-4.5,-10],[-4.4,-5],[-4.4,.8],[-4.5,6],[-4.6,11.4]],1.12],
    ['dirtpath',[[3.65,-9],[3.55,-2],[4.4,.6],[3.75,4],[3.5,10]],.83],
    ['moss',[[-11,-2],[-9,2],[-10,6]],2.35],['flowers',[[9.8,8],[7,8.4]],1.5]
  ]
};
const court={
  objects:[
    ['build-moon-gate',0,7.2,1,0],['pack-pavilion',0,-5.6,.81,0],
    ['build-huizhou',-9.1,-6.7,.88,.05],['build-teahall',8.2,-5,.86,-.14],
    ['build-covered-bridge',4.8,2.85,.91,-.35],['build-red-pagoda',10.4,6.1,.73,0],
    ['nature-bamboo',-11,4,.77,.25],['nature-willow',-4.65,-.1,.84,0],
    ['nature-bonsai',7.1,7.8,.64,-.2],['reeds',-.6,2.65,.9,0],
    ['reeds',-3.5,1.7,.9,.2],['water-lily',0,.22,1,0],
    ['sakura',-6.9,5.7,1.15,.7],['nature-willow',3.8,-2.2,.9,.83],
    ['water-lily',1.65,-.7,.92,.5],['nature-bamboo',7.6,-8.1,.86,1],
    ['shore-stones',-3.4,-2.2,.88,-.3],['lantern',-2.75,6.6,.92,0],
    ['lantern',2.7,6.7,.92,0],['rock',-9,1,.95,0],['mallard',-.9,0,1,.5],['mallard',1.4,-.3,.9,1.1]
  ],
  strokes:[
    ['lotus',[[-1.6,-.4],[.1,.1],[2.4,.35]],5.3],
    ['jade',[[2.1,.4],[4.9,1.3],[4.7,4.4],[6.9,6.8],[8.5,11.4]],2.1],
    ['stonepath',[[-15,3],[-7,3],[-4.9,4.7],[0,5.25],[1.65,2.0]],1.2],
    ['stonepath',[[7.98,3.9],[8.5,1.8],[7.1,-1.8],[3.9,-3.3],[0,-3.45],[-4.3,-3.2],[-6.1,-.4],[-5.65,2.9],[-4.9,4.7]],1.13],
    ['stonepath',[[0,11.4],[0,7.2],[0,5.25]],1.16],['dirtpath',[[8.5,1.8],[11,1.9],[15,2.8]],1.08],
    ['moss',[[-11,-1],[-9.3,2]],3.5],['flowers',[[5.6,-8],[9.8,-8]],2]
  ]
};
export const gardenLayouts={canal,court};

export const sceneDesigns={
  garden:{name:'江南水乡',ecology:'水巷 · 柳岸 · 池蛙 · 翠鸟',theme:'ink',seed:'WATERLANE',description:'沿着水巷接出一座廊桥，或绕荷塘围出一方庭院。栽下芦苇，在柳岸等一位来客。',
    preview:['water-stilt','build-covered-bridge','kingfisher'], ...canal},
  village:{name:'欧式村庄',ecology:'花圃 · 牧场 · 绵羊 · 山羊',theme:'keep',seed:'VILLAGE-1109',description:'围绕石铺广场的小村落：木骨会馆、尖顶礼堂、花窗农舍与风车牧场。',
    preview:['build-guildhall','build-chapel','build-thatch'],
    objects:[
      ['build-chapel',0,-6.6,.78,0],['build-guildhall',-6.1,-5.5,.78,0],
      ['build-thatch',6,-5.1,.78,0],['pack-windmill',10.3,3.5,.64,0],
      ['build-thatch',-7.3,3.7,.65,Math.PI],['pack-greenhouse',6.5,7,.65,0],
      ['nature-bonsai',-11.3,-6.8,.85,0],['pack-ginkgo',10.9,-5.8,1.3,.3],
      ['nature-fern',-11,6.7,.7,0],['nature-fern',-3.8,-8,.6,0],
      ['well',0,-.7,1,0],['lantern',-2,1.2,1,0],['lantern',2,1.2,1,0],
      ['sheep',-1.8,6.2,.9,0],['sheep',.7,6.5,.9,.8],['goat',3,4.7,.85,0],
      ['rabbit',-10.5,0,1,.5],['nature-peak',12,-9,.8,0]
    ],
    strokes:[
      ['paving',[[-1,0],[1,0]],5],
      ['stonepath',[[-15,0],[-7,0],[0,0],[7,0],[15,0]],1.4],
      ['stonepath',[[0,-4.1],[0,0],[0,3.5],[0,11.4]],1.2],
      ['dirtpath',[[-6,-3],[-6,0],[-7,1.9]],1.1],['dirtpath',[[6,-2.5],[6,0],[6,5.7]],1.1],
      ['flowers',[[-10,-2.6],[-7,-2.6],[-4.7,-2.6]],2],
      ['flowers',[[4,-2.5],[6,-2.5],[8.3,-2.5]],1.7],
      ['lawn',[[-2.7,5],[-2,7.5],[2.8,7]],5],
      ['fence',[[-3.5,4],[-3.5,8.8],[3.5,8.8],[3.5,6.8]],.9],
      ['hill',[[10,-8],[12,-8]],3.8]
    ]},
  coast:{name:'热带海岸',ecology:'棕榈 · 沙湾 · 陆龟 · 水豚',theme:'coast',seed:'COAST-1109',description:'棕榈沙湾环抱蓝色海水，陶瓦别墅、海岸灯塔与海蚀岩拱串起滨海步道。',
    preview:['build-villa','build-lighthouse','nature-palm'],
    objects:[
      ['build-villa',-6,-5.3,.8,0],['build-lighthouse',4,-6.3,.72,0],
      ['build-thatch',-7.5,5.4,.63,0],['nature-sea-arch',9,5.8,.95,.15],
      ['nature-travertine',-11,-.3,.8,0],['nature-mesa',-11,-8,.65,.2],
      ['nature-palm',-10.8,-4.4,.9,.3],['nature-palm',-1.7,-6.6,.95,.6],
      ['nature-palm',2.3,-1.7,.9,-.3],['nature-palm',-3.3,3.8,.85,.8],
      ['nature-palm',1.9,6.5,1,0],['nature-palm',-11.7,7,.85,-.4],
      ['nature-fern',-9.7,3.6,.8,0],['nature-fern',-2.3,-8,.7,0],
      ['fire',-1,7.5,1,0],['rock',3.8,3,1.5,0],
      ['fauna-tortoise',-5.6,.7,1,.7],['fauna-tortoise',-.7,3.8,.85,0],
      ['fauna-capybara',-8.5,-.2,.9,0]
    ],
    strokes:[
      ['sand',[[0,-9],[2,-4],[2,1],[3,6],[3,9]],7],
      ['sand',[[7,-9],[7,-3],[7,3],[7,9]],7],
      ['sand',[[-9,7],[-5,7],[-1,7]],5],
      ['pond',[[13.2,-11.4],[13.2,-5],[13.2,1],[13.2,7],[13.2,11.4]],7],
      ['pond',[[8.5,-1],[8,1.5],[8.5,3.5]],5.5],
      ['gravel',[[5.5,-9],[5.8,-6]],2.4],
      ['dirtpath',[[-15,0],[-10,1],[-6,1],[-2,1],[1,0],[3,-3],[4,-4.4]],1.2],
      ['dirtpath',[[-6,-3],[-6,1],[-6,3.5]],1.1],
      ['dirtpath',[[-2,1],[-.5,4],[0,7],[0,11.4]],1.1],
      ['flowers',[[-10,3],[-9,5]],1.8]
    ]}
};
