// ============================================================
// 古桥徒步 · 空间库与领域数据（全部桥梁/地名均为虚构教学示例）
// 建模原则：
//   bridge  桥梁本体（结构、桥窗、故事、保护）—— 没有"整桥开放"布尔值
//   entrance 入口（独立开放状态，可被维护项目关闭）
//   node    空间节点（入口、停车场、观景位、停留点……）
//   edge    通行段（桥面段 deck / 附近道路 approach / 跨区连接 cross）
//           —— 记录宽度、坡度、维护区间；宽度或坡度未知 => null
//   maintenance 维护项目（作用对象 + 区间 + 延期信息）
// 坐标系：x=东(米) y=北(米)，仅用于平面图与拍摄方位计算
// ============================================================

export const DISTRICTS = [
  { id: 'xigu', name: '西谷溪片区' },
  { id: 'dongxi', name: '东溪片区' },
  { id: 'xiyuan', name: '西源古道片区' },
];

export const TODAY = '2026-09-30'; // 验收基准日

export const bridges = [
  {
    id: 'b1',
    name: '卧虹桥',
    district: 'xigu',
    type: '单孔石拱桥',
    dynasty: '仿明式（虚构）',
    material: '花岗岩石券，桥面石板，糯米灰浆勾缝',
    spanM: 14.2,
    deckLenM: 38,
    deckWidthM: 2.4,
    rail: '石望柱 · 抱鼓石端头',
    structural: [
      '拱券为纵联分节并列砌筑，券脸石 7 道',
      '桥面由两段通行段组成（南段为旧石板、北段为后期归安石板）',
      '两岸金刚墙直接落于基岩，未见现代桩基',
    ],
    story:
      '相传溪谷晨雾不散时，桥拱与水中倒影合成一轮横卧的圆虹，卧虹桥由此得名。' +
      '当地老人记得旧时挑炭队伍过桥需在北端“歇肩石”换肩。桥上楹联、碑刻均为教学虚构。',
    protection: [
      '桥面为不可承重说明对象：本站不提供任何真实承载/吨级保证，也不据宽度推断可过车辆',
      '石面湿滑时骑马式通过、不奔跑；雨后拱顶可能积水',
      '禁止刻画拓碑、禁止搬动松动石板；发现券脸石裂隙请用导览内“上报”反馈',
      '桥窗为文物本体：只观不触，不倚靠望柱拍照',
    ],
    windows: [
      { id: 'b1w-n', name: '北端桥窗', from: 'n-view', bearingDeg: 140, note: '顺光看拱券，上午最佳（机位到桥心实测约138°）' },
      { id: 'b1w-s', name: '南端桥窗', from: 's-view', bearingDeg: 324, note: '可看倒影合成“卧虹”，清晨最佳（机位到桥心实测约324°）' },
    ],
    deckAnnualMaint: { every: '每年 11 月上旬', scope: '桥面石板找平与排水缝清理' },
  },
  {
    id: 'b2',
    name: '听雨廊桥',
    district: 'dongxi',
    type: '石墩木平梁廊桥',
    dynasty: '仿清式（虚构）',
    material: '两礅三孔石墩，杉木梁，廊屋小青瓦',
    spanM: 26.0,
    deckLenM: 54,
    deckWidthM: 3.1,
    rail: '廊屋槛凳兼护栏 · 端部木栅门',
    structural: [
      '两个分水尖石墩，迎水面做柳叶尖以减小洪水推力',
      '木梁与石墩之间用硬木垫梁，垫梁腐朽是本桥主要风险点',
      '廊屋 11 开间，两侧槛凳可供歇息，屋面荷载不得额外增加',
    ],
    story:
      '廊桥原是过路人避雨与乡里议事的地方，雨打小青瓦的声响被称作“听雨更点”。' +
      '此处所有习俗叙述均为教学虚构。',
    protection: [
      '木构最怕长期潮湿与明火：全桥禁烟，勿在槛凳上蹦跳',
      '不得在廊柱上张贴、悬挂物品；不得摇晃端部木栅门',
      '垫梁腐朽区段会以维护区间单独封闭，不代表全桥不可接近',
    ],
    windows: [
      { id: 'b2w-w', name: '西岸桥窗', from: 'b2-w-gate', bearingDeg: 62, note: '看分水尖与柳叶墩（机位到桥心实测约62°）' },
    ],
    deckAnnualMaint: { every: '每年梅雨季前（约 5 月）', scope: '木梁防腐、瓦面补漏、垫梁检查' },
  },
  {
    id: 'b3',
    name: '踱秋桥',
    district: 'xiyuan',
    type: '三孔石梁桥',
    dynasty: '仿宋元风格（虚构）',
    material: '条石桥墩，三根石梁并列成跨',
    spanM: 18.0,
    deckLenM: 34,
    deckWidthM: 2.0,
    rail: '无连续护栏，端部有系缆桩遗迹',
    structural: [
      '三孔石梁直接搁置于条石墩帽石上，构件间无现代连接',
      '中孔梁底有历史水线痕，记录古洪水高度',
      '桥面较窄且无连续护栏，是本桥通行的主要限制',
    ],
    story:
      '名字来自旧时山民“踱着步子等秋熟”的说法。桥边曾有义茶摊，今为古道停留点。叙述均为虚构。',
    protection: [
      '窄桥无护栏：不得并行抢行，雨后梁石反光易滑',
      '梁底水线是历史信息载体，禁止涂抹或踩踏桥墩帽石',
      '宽度不足时以通行段数据为准，页面不笼统宣称“可推婴儿车”',
    ],
    windows: [{ id: 'b3w-s', name: '南埠头桥窗', from: 'xiyuan-stop', bearingDeg: 15, note: '侧看三孔层次' }],
    deckAnnualMaint: { every: '每两年 3 月', scope: '墩帽石与梁端接触点检查、杂草清理' },
  },
];

// ---------------- 空间节点 ----------------
// kind: parking | entrance | view | stop | shelter | junction
export const nodes = [
  // 卧虹桥 b1（西谷溪）
  { id: 'np', name: '北岸停车场', kind: 'parking', district: 'xigu', x: 20, y: 390 },
  { id: 'b1-n-gate', name: '卧虹桥·北岸入口', kind: 'entrance', bridgeId: 'b1', end: 'N', district: 'xigu', x: 52, y: 318,
    sign: '石阶入口 · 设门可独立关闭' },
  { id: 'n-view', name: '北端观景位（歇肩石）', kind: 'view', bridgeId: 'b1', district: 'xigu', x: 60, y: 300 },
  { id: 'b1-mid', name: '卧虹桥·拱顶', kind: 'junction', bridgeId: 'b1', district: 'xigu', x: 105, y: 250 },
  { id: 'b1-s-gate', name: '卧虹桥·南岸入口', kind: 'entrance', bridgeId: 'b1', end: 'S', district: 'xigu', x: 158, y: 182,
    sign: '碎石坡入口 · 设门可独立关闭' },
  { id: 's-view', name: '南端观景位（倒影潭）', kind: 'view', bridgeId: 'b1', district: 'xigu', x: 168, y: 165 },
  { id: 'sp', name: '南岸停车场', kind: 'parking', district: 'xigu', x: 190, y: 110 },
  { id: 'pavilion', name: '西谷茶亭', kind: 'shelter', district: 'xigu', x: 230, y: 330 },

  // 听雨廊桥 b2（东溪）
  { id: 'dp', name: '东溪停车场', kind: 'parking', district: 'dongxi', x: 470, y: 390 },
  { id: 'b2-e-gate', name: '听雨廊桥·东岸入口', kind: 'entrance', bridgeId: 'b2', end: 'E', district: 'dongxi', x: 452, y: 318 },
  { id: 'b2-w-gate', name: '听雨廊桥·西岸入口', kind: 'entrance', bridgeId: 'b2', end: 'W', district: 'dongxi', x: 360, y: 268 },
  { id: 'teahouse', name: '听雨茶寮', kind: 'stop', district: 'dongxi', x: 430, y: 205 },

  // 踱秋桥 b3（西源古道）
  { id: 'xiyuan-stop', name: '西源古道停留点', kind: 'stop', district: 'xiyuan', x: 565, y: 80 },
  { id: 'b3-s-gate', name: '踱秋桥·南埠头入口', kind: 'entrance', bridgeId: 'b3', end: 'S', district: 'xiyuan', x: 545, y: 120 },
  { id: 'b3-n-gate', name: '踱秋桥·北路口入口', kind: 'entrance', bridgeId: 'b3', end: 'N', district: 'xiyuan', x: 500, y: 210 },
];

// ---------------- 通行段（空间库核心） ----------------
// kind: deck 桥面段 | approach 附近道路 | cross 跨区连接
// widthM/slopePct 为 null 表示未测绘/未知；规划时 widthM/slopePct 未知不得判定亲子/无障碍
export const edges = [
  // —— 卧虹桥桥面（两段，宽度分别记录）——
  { id: 'b1-deck-n', kind: 'deck', bridgeId: 'b1', a: 'b1-n-gate', b: 'b1-mid',
    lenM: 20, widthM: 2.6, slopePct: 6, surface: '后期归安石板',
    maintWindow: '每年 11 月上旬桥面养护', note: '北段接缝处有补石' },
  { id: 'b1-deck-s', kind: 'deck', bridgeId: 'b1', a: 'b1-mid', b: 'b1-s-gate',
    lenM: 18, widthM: 2.1, slopePct: 8, surface: '旧石板（局部不平）',
    maintWindow: '每年 11 月上旬桥面养护', note: '南段为最窄处' },

  // —— 卧桥头附近道路 ——
  { id: 'b1-acc-n', kind: 'approach', bridgeId: 'b1', a: 'np', b: 'b1-n-gate',
    lenM: 90, widthM: 3.4, slopePct: 5, surface: '石板游道',
    maintWindow: '每季度排水沟清理' },
  { id: 'b1-acc-s', kind: 'approach', bridgeId: 'b1', a: 'b1-s-gate', b: 'sp',
    lenM: 95, widthM: 1.8, slopePct: 12, surface: '碎石坡道',
    maintWindow: '每年汛后补碎石' },
  { id: 'b1-n-view-e', kind: 'approach', bridgeId: 'b1', a: 'b1-n-gate', b: 'n-view',
    lenM: 25, widthM: 2.8, slopePct: 3, surface: '石板平台', maintWindow: '—' },
  { id: 'b1-s-view-e', kind: 'approach', bridgeId: 'b1', a: 'b1-s-gate', b: 's-view',
    lenM: 20, widthM: 2.6, slopePct: 4, surface: '石板平台', maintWindow: '—' },
  { id: 'b1-n-pavilion', kind: 'approach', a: 'b1-n-gate', b: 'pavilion',
    lenM: 180, widthM: 2.2, slopePct: 4, surface: '北岸沙土步道', maintWindow: '每年 4 月修剪遮挡' },

  // —— 听雨廊桥 ——
  { id: 'b2-deck', kind: 'deck', bridgeId: 'b2', a: 'b2-w-gate', b: 'b2-e-gate',
    lenM: 54, widthM: 3.1, slopePct: 1, surface: '廊内木板',
    maintWindow: '每年 5 月木构防腐', note: '两端木栅门随入口管理' },
  { id: 'b2-acc-e', kind: 'approach', bridgeId: 'b2', a: 'dp', b: 'b2-e-gate',
    lenM: 80, widthM: 4.0, slopePct: 2, surface: '石板缓坡', maintWindow: '—' },
  { id: 'b2-acc-tea', kind: 'approach', bridgeId: 'b2', a: 'b2-e-gate', b: 'teahouse',
    lenM: 130, widthM: 2.4, slopePct: 7, surface: '山径石阶', maintWindow: '每年汛后检查石阶' },
  { id: 'b2-acc-w', kind: 'approach', bridgeId: 'b2', a: 'b2-w-gate', b: 'pavilion',
    lenM: 150, widthM: 2.0, slopePct: 9, surface: '溪畔土路',
    maintWindow: '每年 6 月溪畔挡墙检修' },

  // —— 踱秋桥（西源）——
  { id: 'b3-deck', kind: 'deck', bridgeId: 'b3', a: 'b3-s-gate', b: 'b3-n-gate',
    lenM: 34, widthM: 2.0, slopePct: 2, surface: '并列石梁',
    maintWindow: '每两年 3 月墩帽检查', note: '无连续护栏' },
  { id: 'b3-acc-s', kind: 'approach', bridgeId: 'b3', a: 'xiyuan-stop', b: 'b3-s-gate',
    lenM: 60, widthM: 2.2, slopePct: 6, surface: '条石埠头', maintWindow: '—' },
  { id: 'g-vill', kind: 'approach', bridgeId: 'b3', a: 'b3-n-gate', b: 'xiyuan-stop',
    lenM: 700, widthM: null, slopePct: null, surface: '旧村道（待测绘）',
    maintWindow: '区间未定', note: '跨片区绕行村道：宽度与坡度均未测绘' },

  // —— 跨片区连接 ——
  { id: 'np-dp', kind: 'cross', a: 'np', b: 'dp',
    lenM: 460, widthM: null, slopePct: 7, surface: '林间山径',
    crossDistricts: ['xigu', 'dongxi'],
    maintWindow: '区间未定', note: '跨西谷溪—东溪：宽度未测绘' },
  { id: 'n-ramp', kind: 'cross', a: 'b1-n-gate', b: 'b2-w-gate',
    lenM: 280, widthM: 3.0, slopePct: 4, surface: '北岸连通缓坡（无障碍坡道标准示范段）',
    crossDistricts: ['xigu', 'dongxi'],
    maintWindow: '每半年一次', note: '北岸高位连接，不受南端施工影响' },
  { id: 'd-tea-xiyuan', kind: 'cross', a: 'teahouse', b: 'xiyuan-stop',
    lenM: 300, widthM: 1.6, slopePct: 11, surface: '东山脊窄径',
    crossDistricts: ['dongxi', 'xiyuan'],
    maintWindow: '每年汛后', note: '跨东溪—西源，最窄 1.6m' },
];

// ---------------- 维护项目（作用到具体对象，有区间，可延期） ----------------
export const maintenance = [
  {
    id: 'm1',
    title: '卧虹桥南岸金刚墙加固',
    status: 'active', // active 进行中（验收默认命中）
    affects: [
      { kind: 'entrance', id: 'b1-s-gate', effect: 'closed', detail: '施工占用入口平台，南岸入口关闭' },
      { kind: 'edge', id: 'b1-acc-s', effect: 'blocked', detail: '入口至南岸停车场碎石坡作为施工通道，暂停穿越通行' },
    ],
    start: '2026-09-29', endPlanned: '2026-10-06', endActual: null,
    note: '仅作用于南端：北岸入口、北岸观景位与桥面北段不受影响，不做“整桥封闭”。',
  },
  {
    id: 'm2',
    title: '西源旧村道挡墙排险',
    status: 'delayed',
    affects: [
      { kind: 'edge', id: 'g-vill', effect: 'blocked', detail: '挡墙排险未完成，旧村道维持不可通行' },
    ],
    start: '2026-09-25', endPlanned: '2026-10-02', endActual: null,
    rescheduledTo: '2026-10-12',
    delayReason: '连续降水导致挡墙基础养护条件不足，复工窗口顺延（维护延期示例）。',
    note: '延期期间 g-vill 继续阻断；即使未延期，该段宽度/坡度未测绘也不能判定亲子或无障碍。',
  },
  {
    id: 'm3',
    title: '东山脊窄径例行修整（历史）',
    status: 'done',
    affects: [{ kind: 'edge', id: 'd-tea-xiyuan', effect: 'blocked', detail: '历史修整' }],
    start: '2026-08-10', endPlanned: '2026-08-15', endActual: '2026-08-14',
    note: '已完工，当前通行恢复；保留记录用于展示维护区间。',
  },
];

// ---------------- 预制主题路线 ----------------
// profile: half 半日 | full 一日 | family 亲子 | accessible 无障碍
export const themedRoutes = [
  {
    id: 't1', profile: 'half', name: '北岸卧虹半日线',
    sequence: ['np', 'b1-n-gate', 'b1-mid', 'b1-n-gate', 'n-view', 'pavilion'],
    dwell: { 'b1-mid': 15, 'n-view': 20, 'pavilion': 25 },
    timeBudgetMin: 210,
    district: 'xigu',
    desc: '只走北岸：登桥看拱券、北端桥窗观倒影，茶亭歇脚后折返。不依赖南岸入口。',
  },
  {
    id: 't2', profile: 'full', name: '双溪一日跨区线',
    sequence: ['np', 'b1-n-gate', 'b1-mid', 'b1-n-gate', 'b2-w-gate', 'b2-e-gate', 'teahouse', 'dp'],
    dwell: { 'b1-mid': 15, 'n-view': 0, 'b2-w-gate': 10, 'teahouse': 40 },
    timeBudgetMin: 480,
    district: 'xigu→dongxi',
    desc: '由北岸高位缓坡跨片区进入东溪，穿听雨廊桥后在茶寮午餐，东溪停车场收尾。',
  },
  {
    id: 't3', profile: 'family', name: '廊桥雨音亲子线',
    sequence: ['dp', 'b2-e-gate', 'b2-e-gate', 'teahouse', 'dp'],
    dwell: { 'teahouse': 40 },
    timeBudgetMin: 300,
    district: 'dongxi',
    desc: '缓坡短途：东溪入口看分水尖，茶寮听雨，原路回到停车场。全程宽度≥2.4m、坡度≤7%。',
  },
];

// ---------------- 方案（profile）硬约束 ----------------
export const profiles = {
  half: { name: '半日方案', maxMin: 240, minWidthM: 1.5, maxSlopePct: 15, requireKnown: false, note: '未知宽度/坡度可通行但标注“无法确认”' },
  full: { name: '一日方案', maxMin: 480, minWidthM: 1.5, maxSlopePct: 15, requireKnown: false, note: '可跨片区；未知数据同样标注，不影响徒步硬阻断' },
  family: { name: '亲子方案', minWidthM: 2.0, maxSlopePct: 8, requireKnown: true,
    note: '宽度或坡度未知 => 无法确认适合儿童，绝不自动标“适合儿童”' },
  accessible: { name: '无障碍核对', minWidthM: 3.0, maxSlopePct: 4, requireKnown: true,
    note: '宽度或坡度未知 => 无法确认无障碍，绝不自动标“无障碍”；且全程不得有台阶阻断信息缺失' },
};

// ---------------- 拍摄方位验收（机位 node + 应拍方位 bearing） ----------------
export const photoChecks = [
  { id: 'p1', bridgeId: 'b1', at: 'n-view', declaredBearingDeg: 140,
    note: '北端桥窗：申报 140°，与机位到桥心真值约 138° 相差 2°。合格样例。' },
  { id: 'p2', bridgeId: 'b1', at: 'n-view', declaredBearingDeg: 62,
    note: '同一机位却申报 62°（偏向东北山脊），与真值相差 76°：拍摄方向错误样例。' },
  { id: 'p3', bridgeId: 'b1', at: 's-view', declaredBearingDeg: 324,
    note: '南端桥窗：申报 324°，与真值约 324° 相差约 1°。合格样例。' },
  { id: 'p4', bridgeId: 'b2', at: 'b2-w-gate', declaredBearingDeg: 62,
    note: '西岸桥窗：申报 62°，与真值约 62° 相差约 1°。合格样例。' },
];

// ---------------- 离线导览包 · 清单目录（当前版本 v3） ----------------
// 真实分块文件由 build_packages.mjs 生成；source=embedded 时走内置回退源
export const CATALOG = {
  site: 'gushao-hike',
  latest: '2026.09.30-v3',
  minActivatable: '2026.09.30-v3',
  packages: [
    {
      version: '2026.09.30-v3',
      releasedAt: '2026-09-30T08:00:00+08:00',
      source: 'auto', // 优先 fetch /packages/v3/manifest.json，失败回退 embedded
      chunks: [
        { id: 'base',    file: 'base.json',    bytes: 0, builtIn: true },
        { id: 'bridges', file: 'bridges.json', bytes: 0, builtIn: true },
        { id: 'geo',     file: 'geo.json',     bytes: 0, builtIn: true },
        { id: 'routes',  file: 'routes.json',  bytes: 0, builtIn: true },
        { id: 'media1',  file: 'media1.json',  bytes: 0, builtIn: true },
      ],
      note: '当前版本。缺任一块或哈希不符都不得视为完整、不得激活。',
    },
    {
      version: '2026.06.01-v1',
      releasedAt: '2026-06-01T08:00:00+08:00',
      source: 'embedded',
      archived: true,
      chunks: [
        { id: 'base',    file: 'base.json',    bytes: 0, builtIn: true },
        { id: 'bridges', file: 'bridges.json', bytes: 0, builtIn: true },
      ],
      note: '旧包（归档）。用于“旧包回灌”验收：只能查看，拒绝激活、拒绝覆盖当前版本。',
    },
  ],
};

// 内置回退数据（v3 分块的真实内容，顺序键名稳定，供 node 构建与浏览器回退共用）
export const BUILTIN_CHUNKS_V3 = {
  base: {
    schema: 'gushao-hike/v3',
    title: '古桥徒步离线导览',
    disclaimer: '全部桥梁与历史叙述为虚构教学示例；不提供真实承载保证。',
    generatedFor: '2026.09.30-v3',
  },
  bridges: bridges.map(({ id, name, type, dynasty, material, spanM, deckLenM, deckWidthM, story }) =>
    ({ id, name, type, dynasty, material, spanM, deckLenM, deckWidthM, story })),
  geo: {
    nodes: nodes.map(({ id, name, kind, district, x, y, bridgeId }) =>
      ({ id, name, kind, district, x, y, bridgeId })),
    edges: edges.map(({ id, kind, a, b, lenM, widthM, slopePct, surface, crossDistricts }) =>
      ({ id, kind, a, b, lenM, widthM, slopePct, surface, crossDistricts })),
  },
  routes: {
    profiles,
    themedRoutes: themedRoutes.map(({ id, profile, name, sequence, dwell, timeBudgetMin, district }) =>
      ({ id, profile, name, sequence, dwell, timeBudgetMin, district })),
  },
  media1: {
    assets: [
      { id: 'fig-b1', kind: 'inline-svg', title: '卧虹桥结构示意（原创绘制）' },
      { id: 'fig-map', kind: 'inline-svg', title: '三片区平面示意（原创绘制）' },
    ],
  },
};

// 旧包内容（v1，刻意缺少 geo/routes/media1，用于回灌验收）
export const BUILTIN_CHUNKS_V1 = {
  base: { schema: 'gushao-hike/v1', title: '古桥徒步离线导览（旧版）', generatedFor: '2026.06.01-v1' },
  bridges: bridges
    .filter((b) => b.id === 'b1')
    .map(({ id, name, type, dynasty }) => ({ id, name, type, dynasty })),
};

export const BRIDGE_LOAD_NOTE =
  '本网站不提供任何真实桥梁承载/吨级/车辆通行保证；桥面通行以逐段实测宽度、坡度与维护区间为准。';
