// IDs are shared by the generator, saved plot metadata and the scene picker.
export const layoutGuide = {
  garden: {
    canal: {name:'沿河水巷', landmark:'water-stilt'},
    court: {name:'围池庭院', landmark:'pack-pavilion'}
  },
  village: {
    mill: {name:'水轮磨坊', landmark:'watermill', preview:['watermill','shore-stones','dipper'],
      description:'磨坊临溪而建，水轮贴着溪岸转动。沿河寻找白喉河乌，看它在石岸上点头、起飞。'},
    pasture: {name:'林缘牧场', landmark:'pasture-shelter', preview:['pasture-shelter','sheep','meadow-hare'],
      description:'从牧棚出发，沿围栏走到草甸与树林交界处。留出开阔草地，观察野兔停步、竖耳和蹬地跃起。'}
  },
  coast: {
    beacon: {name:'海岬灯塔', landmark:'build-lighthouse', preview:['build-lighthouse','nature-palm','sea-gull'],
      description:'沿海岬小径登上灯塔所在的岸地。保留开阔水面和落脚处，等海鸥滑翔归岸。'},
    tidepool: {name:'礁岸潮池', landmark:'tidal-rocks', preview:['tidal-rocks','nature-sea-arch','shore-crab'],
      description:'绕过礁脊，在沙滩与浅水之间寻找岸蟹。试着挪动礁石、延长沙岸，给它留一段横行的空间。'}
  }
};

export function knownLayout(scene,layout) {
  return Object.hasOwn(layoutGuide,scene) && Object.hasOwn(layoutGuide[scene],layout);
}
