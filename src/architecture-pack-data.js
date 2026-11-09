export const architectureCatalog = [
  [
    "build-moon-gate",
    "圆月漏窗院墙",
    "中式精选 · 江南园林",
    "#e7dec4",
    "#3d5556",
    6.2,
    2.4,
    "moon",
    "完整圆形门洞与两侧漏窗形成通透院墙。窄墙适合围合花园，圆门可以框住远处的景物。"
  ],
  [
    "build-huizhou",
    "徽州马头墙宅",
    "中式精选 · 徽派民居",
    "#e7dec4",
    "#3d5556",
    5.5,
    4.8,
    "jiangnan",
    "高低错落的马头墙、粉白墙面与黛瓦屋顶构成徽派民居鲜明的轮廓。"
  ],
  [
    "build-red-pagoda",
    "朱柱四重檐塔",
    "中式精选 · 木构塔阁",
    "#9d493b",
    "#527669",
    4.7,
    4.7,
    "pagoda",
    "四层逐渐收分的塔身与宽阔叠檐向上展开，朱柱和金色塔刹强调层次。"
  ],
  [
    "build-covered-bridge",
    "杉木风雨廊桥",
    "中式精选 · 风雨桥",
    "#a87a4e",
    "#3d5556",
    7.2,
    3.1,
    "bridge",
    "拱起的木铺桥面两侧设有栏杆，屋顶为步行者提供遮蔽。桥下可通过水流，廊内可步行。"
  ],
  [
    "build-teahall",
    "临水听荷茶堂",
    "中式精选 · 园林厅堂",
    "#a8764c",
    "#426a62",
    6.3,
    5.0,
    "hall",
    "深挑檐、前廊、长凳与暖色吊灯组成开敞茶堂，可与水岸和竹林组合。"
  ],
  [
    "build-guildhall",
    "山城木骨会馆",
    "西式精选 · 都铎街屋",
    "#e0cba6",
    "#a25d48",
    5.2,
    4.9,
    "lodge",
    "深色斜撑木骨架、陡坡瓦顶和独立老虎窗构成中世纪街屋的层次。"
  ],
  [
    "build-chapel",
    "尖拱玫瑰窗礼堂",
    "西式精选 · 哥特乡村",
    "#bcb8a2",
    "#5c6d7b",
    5.0,
    5.9,
    "chapel",
    "扶壁、细长窗、前立面圆形花窗和尖塔让石礼堂在远处也易于辨认。"
  ],
  [
    "build-thatch",
    "花窗茅草农舍",
    "西式精选 · 英伦乡居",
    "#dfd0a5",
    "#b69a58",
    5.4,
    4.6,
    "stone",
    "厚茅草坡顶、绿色百叶窗、窗台花箱与石烟囱组成柔和的乡村轮廓。"
  ],
  [
    "build-villa",
    "陶瓦藤架别墅",
    "西式精选 · 地中海",
    "#e2c49b",
    "#b86d4b",
    6.1,
    5.6,
    "adobe",
    "主副屋体、暖色陶瓦、绿色窗板和入口木藤架适合搭配砂地与灌木花园。"
  ],
  [
    "build-lighthouse",
    "赤白海岸灯塔",
    "西式精选 · 海岸建筑",
    "#d9d7c1",
    "#a8624d",
    4.0,
    4.0,
    "bell",
    "红白相间的收分塔身、环形栏杆与顶部灯室形成高耸的海岸地标。"
  ]
];
export const architectureModels = {
  "build-moon-gate": {
    "width": 6.2,
    "depth": 2.4,
    "maxHeight": 3.015,
    "solid": true,
    "collisionBoxes": [
      {
        "x": -1.93,
        "z": 0,
        "w": 1.87,
        "d": 0.65
      },
      {
        "x": 1.93,
        "z": 0,
        "w": 1.87,
        "d": 0.65
      }
    ]
  },
  "build-huizhou": {
    "width": 5.5,
    "depth": 4.8,
    "maxHeight": 4.14,
    "solid": true
  },
  "build-red-pagoda": {
    "width": 4.7,
    "depth": 4.7,
    "maxHeight": 5.965,
    "solid": true
  },
  "build-covered-bridge": {
    "width": 7.2,
    "depth": 3.1,
    "maxHeight": 3.475,
    "solid": false,
    "fixedHeight": true
  },
  "build-teahall": {
    "width": 6.3,
    "depth": 5.0,
    "maxHeight": 3.774,
    "solid": true
  },
  "build-guildhall": {
    "width": 5.2,
    "depth": 4.9,
    "maxHeight": 5.165,
    "solid": true
  },
  "build-chapel": {
    "width": 5.0,
    "depth": 5.9,
    "maxHeight": 6.99,
    "solid": true
  },
  "build-thatch": {
    "width": 5.4,
    "depth": 4.6,
    "maxHeight": 4.45,
    "solid": true
  },
  "build-villa": {
    "width": 6.1,
    "depth": 5.6,
    "maxHeight": 4.055,
    "solid": true
  },
  "build-lighthouse": {
    "width": 4.0,
    "depth": 4.0,
    "maxHeight": 6.115,
    "solid": true
  }
};
