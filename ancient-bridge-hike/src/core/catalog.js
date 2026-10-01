// 古桥徒步空间库（虚构示例数据，非真实桥梁档案）
// 对象分层：bridge（桥梁本体） / entrance（入口，独立对象） / node（空间节点） /
// edge（通行段）。维护区间挂在 edge 上，可能切断穿越但保留另一端观景。

export const REGIONS = [
  { id: 'qianxi', name: '千溪谷片区' },
  { id: 'songpo',  name: '松坡山片区' },
];

export const BRIDGES = [
  {
    id: 'anj',
    name: '安吉石拱桥',
    nameEn: 'Anji Stone Arch',
    dynasty: '明·万历年间形制（示例设定）',
    region: 'qianxi',
    structure: {
      type: '单孔实腹石拱桥',
      spanM: 18.4,
      riseM: 5.1,
      material: '青石砌筑，券脸石做锁口',
      deck: { widthM: 2.6, surface: '风化石板，雨天湿滑', rail: '无护栏' },
      notes: '拱券纵联分节并列砌置；桥面随拱背隆起，两端高差约1.2m。',
    },
    protection: [
      { level: '核心保护区', text: '拱脚上下游各 20m 内禁止取石、涉水挖沙与明火。' },
      { level: '通行限制', text: '桥面为文物路面，禁止机动车、非机动车骑行；请步行推行。' },
      { level: '承载提示', text: '平台未获得任何真实承载评估；不提供承重/吨位保证，队列与负重请按文保告示自行控制。' },
    ],
    story: '溪床在此收窄成峡，相传旧时纤道在此跨溪。桥身取溪滩青石，券脸石上有浅浅的莲瓣纹，',
  },
  {
    id: 'qfl',
    name: '清风廊桥',
    nameEn: 'Qingfeng Covered Bridge',
    dynasty: '清·同治年间形制（示例设定）',
    region: 'songpo',
    structure: {
      type: '木拱伸臂廊桥',
      spanM: 27.0,
      riseM: 6.4,
      material: '杉木拱骨，小青瓦廊屋',
      deck: { widthM: 3.1, surface: '木板桥面，局部有弹性', rail: '廊屋两侧设坐凳栏杆' },
      notes: '廊屋九开间，穿斗式木构架；木构件防火等级低。',
    },
    protection: [
      { level: '核心保护区', text: '廊屋内严禁吸烟、点烛与放飞无人机贴檐拍摄。' },
      { level: '通行限制', text: '木桥面共振明显，队伍请错峰分批通过，不齐步、不蹦跳。' },
      { level: '承载提示', text: '无真实承载评估数据，平台不承诺安全人数与荷载。' },
    ],
    story: '廊桥横跨松坡溪最深的一段潭水，旧时是山货集散的歇脚处，廊屋梁柱间还留着旧墨书题记。',
  },
];

// 空间节点。type: portal(入口门户)/deck(桥面)/view(观景点)/trail(普通步道)/junction(岔口)/facility
export const NODES = [
  // 安吉石拱桥·千溪谷
  { id: 'n_anj_gate_n', type: 'portal', entranceId: 'ent_anj_n', name: '安吉桥北入口（溪峡口）', region: 'qianxi' },
  { id: 'n_anj_gate_s', type: 'portal', entranceId: 'ent_anj_s', name: '安吉桥南入口（古樟树）', region: 'qianxi' },
  { id: 'n_anj_deck_n', type: 'deck', bridgeId: 'anj', name: '安吉桥北桥头', region: 'qianxi' },
  { id: 'n_anj_deck_s', type: 'deck', bridgeId: 'anj', name: '安吉桥南桥头', region: 'qianxi' },
  { id: 'n_anj_vp_n', type: 'view', name: '北滩观景石（看券脸莲瓣）', region: 'qianxi', bearingToBridgeDeg: 150 },
  { id: 'n_anj_vp_s', type: 'view', name: '南樟观景台（看拱券倒影）', region: 'qianxi', bearingToBridgeDeg: 350 },
  { id: 'n_anj_visitor', type: 'facility', name: '千溪谷游客站', region: 'qianxi' },
  { id: 'n_anj_j1', type: 'junction', name: '溪峡岔口', region: 'qianxi' },
  { id: 'n_anj_j2', type: 'junction', name: '南樟岔口', region: 'qianxi' },
  { id: 'n_anj_riverside_n', type: 'trail', name: '北岸溪边小径', region: 'qianxi' },

  // 跨区联络
  { id: 'n_ridge', type: 'junction', name: '两界岭垭口', region: 'qianxi' },
  { id: 'n_songpo_gate', type: 'junction', name: '松坡西麓入口', region: 'songpo' },

  // 清风廊桥·松坡
  { id: 'n_qfl_gate_w', type: 'portal', entranceId: 'ent_qfl_w', name: '廊桥西入口（水车坪）', region: 'songpo' },
  { id: 'n_qfl_gate_e', type: 'portal', entranceId: 'ent_qfl_e', name: '廊桥东入口（茶园）', region: 'songpo' },
  { id: 'n_qfl_deck_w', type: 'deck', bridgeId: 'qfl', name: '廊桥西桥头', region: 'songpo' },
  { id: 'n_qfl_deck_e', type: 'deck', bridgeId: 'qfl', name: '廊桥东桥头', region: 'songpo' },
  { id: 'n_qfl_vp', type: 'view', name: '潭边观景石（看廊屋全景）', region: 'songpo', bearingToBridgeDeg: 30 },
  { id: 'n_qfl_tea', type: 'facility', name: '老茶园补给点', region: 'songpo' },
];

// 入口是独立对象：各自的开/关、原因、时间窗，不与桥本体合并
export const ENTRANCES = [
  { id: 'ent_anj_n', bridgeId: 'anj', name: '溪峡口入口', nodeId: 'n_anj_gate_n',
    endpoint: 'north', accessNote: '临溪石阶 38 级，雨后青苔明显。' },
  { id: 'ent_anj_s', bridgeId: 'anj', name: '古樟树入口', nodeId: 'n_anj_gate_s',
    endpoint: 'south', accessNote: '平缓土路，与南樟岔口相连。' },
  { id: 'ent_qfl_w', bridgeId: 'qfl', name: '水车坪入口', nodeId: 'n_qfl_gate_w',
    endpoint: 'west', accessNote: '木栈道下行约 120m。' },
  { id: 'ent_qfl_e', bridgeId: 'qfl', name: '茶园入口', nodeId: 'n_qfl_gate_e',
    endpoint: 'east', accessNote: '茶园机耕路，雨天泥泞。' },
];

// 维护区间（计划窗口）。closed=true 表示窗口内物理不可通行；延期用窗口外的顺延条目。
// 数据以日期窗表达，评估时传入"今天"。维护挂在通行段上，而非整桥。
export const MAINTENANCE = [
  {
    id: 'mnt_n_approach_delay', edgeId: 'e_anj_n_gate_deck',
    originalStart: '2026-09-20', originalEnd: '2026-09-27',
    start: '2026-09-20', end: '2026-10-08',
    delayed: true, reason: '北岸引道石方加固，发现券脚石缝渗水需补砌（验收脚本演示"维护延期"）',
    blocks: ['north'],
  },
  {
    id: 'mnt_qfl_w_boardwalk', edgeId: 'e_qfl_w_gate_deck',
    start: '2026-10-12', end: '2026-10-15',
    reason: '西入口木栈道防滑条更换', blocks: ['west'],
  },
];

// 通行段。widthMinM / slopeMaxPct 未知时用 null —— 规划层必须显示"无法确认"。
// kind: approach(引道) / crossing(桥面穿越) / path(步道) / link(联络线)
export const EDGES = [
  // 安吉桥北端链路
  { id: 'e_anj_n_gate_deck', kind: 'approach', from: 'n_anj_gate_n', to: 'n_anj_deck_n',
    minutes: 6, region: 'qianxi', bridgeId: 'anj', widthMinM: 1.4, slopeMaxPct: 22,
    surface: '临溪石阶', maintenanceId: 'mnt_n_approach_delay' },
  { id: 'e_anj_cross', kind: 'crossing', from: 'n_anj_deck_n', to: 'n_anj_deck_s',
    minutes: 3, region: 'qianxi', bridgeId: 'anj', widthMinM: 2.6, slopeMaxPct: 9,
    surface: '拱背石板（隆起）', notes: '桥面无护栏' },
  { id: 'e_anj_s_gate_deck', kind: 'approach', from: 'n_anj_deck_s', to: 'n_anj_gate_s',
    minutes: 5, region: 'qianxi', bridgeId: 'anj', widthMinM: 2.0, slopeMaxPct: 6,
    surface: '缓坡土路' },
  // 观景支径（分别挂在两端：一端断了不影响另一端观景）
  { id: 'e_anj_vp_n', kind: 'path', from: 'n_anj_gate_n', to: 'n_anj_vp_n',
    minutes: 4, region: 'qianxi', widthMinM: 1.1, slopeMaxPct: 18, surface: '河滩碎石' },
  { id: 'e_anj_vp_s', kind: 'path', from: 'n_anj_j2', to: 'n_anj_vp_s',
    minutes: 3, region: 'qianxi', widthMinM: 1.8, slopeMaxPct: 5, surface: '夯土观景支路' },
  { id: 'e_anj_s_gate_j2', kind: 'path', from: 'n_anj_gate_s', to: 'n_anj_j2',
    minutes: 2, region: 'qianxi', widthMinM: 2.0, slopeMaxPct: 4, surface: '土路' },
  { id: 'e_anj_j2_riverside', kind: 'path', from: 'n_anj_j2', to: 'n_anj_riverside_n',
    minutes: 14, region: 'qianxi', widthMinM: 0.9, slopeMaxPct: null, surface: '溪边野径（坡度未测）' },
  { id: 'e_anj_riverside_n_gate', kind: 'path', from: 'n_anj_riverside_n', to: 'n_anj_gate_n',
    minutes: 3, region: 'qianxi', widthMinM: 1.0, slopeMaxPct: null, surface: '溪畔石阶（宽度/坡度未全测）' },
  { id: 'e_anj_visitor_j1', kind: 'path', from: 'n_anj_visitor', to: 'n_anj_j1',
    minutes: 5, region: 'qianxi', widthMinM: 2.2, slopeMaxPct: 4, surface: '游客站步道' },
  { id: 'e_anj_j1_gn', kind: 'path', from: 'n_anj_j1', to: 'n_anj_gate_n',
    minutes: 4, region: 'qianxi', widthMinM: 1.6, slopeMaxPct: 10, surface: '林荫石阶' },
  { id: 'e_anj_j1_j2', kind: 'path', from: 'n_anj_j1', to: 'n_anj_j2',
    minutes: 12, region: 'qianxi', widthMinM: 1.5, slopeMaxPct: 12, surface: '盘山绕行步道' },
  { id: 'e_anj_j1_ridge', kind: 'path', from: 'n_anj_j1', to: 'n_ridge',
    minutes: 26, region: 'qianxi', widthMinM: 1.7, slopeMaxPct: 15, surface: '登岭步道' },

  // 跨区
  { id: 'e_ridge_songpo', kind: 'link', from: 'n_ridge', to: 'n_songpo_gate',
    minutes: 18, region: 'songpo', widthMinM: 1.6, slopeMaxPct: 11, surface: '两界岭山道' },

  // 清风廊桥
  { id: 'e_songpo_gw', kind: 'path', from: 'n_songpo_gate', to: 'n_qfl_gate_w',
    minutes: 9, region: 'songpo', widthMinM: 1.8, slopeMaxPct: 8, surface: '竹林步道' },
  { id: 'e_qfl_w_gate_deck', kind: 'approach', from: 'n_qfl_gate_w', to: 'n_qfl_deck_w',
    minutes: 5, region: 'songpo', bridgeId: 'qfl', widthMinM: 1.9, slopeMaxPct: 13,
    surface: '下行木栈道', maintenanceId: 'mnt_qfl_w_boardwalk' },
  { id: 'e_qfl_cross', kind: 'crossing', from: 'n_qfl_deck_w', to: 'n_qfl_deck_e',
    minutes: 4, region: 'songpo', bridgeId: 'qfl', widthMinM: 3.1, slopeMaxPct: 3,
    surface: '廊屋木板桥面' },
  { id: 'e_qfl_e_gate_deck', kind: 'approach', from: 'n_qfl_deck_e', to: 'n_qfl_gate_e',
    minutes: 4, region: 'songpo', bridgeId: 'qfl', widthMinM: null, slopeMaxPct: 7,
    surface: '茶园侧坡道（净宽未测）' },
  { id: 'e_qfl_vp', kind: 'path', from: 'n_qfl_gate_w', to: 'n_qfl_vp',
    minutes: 3, region: 'songpo', widthMinM: 1.5, slopeMaxPct: 14, surface: '潭边石径' },
  { id: 'e_qfl_e_tea', kind: 'path', from: 'n_qfl_gate_e', to: 'n_qfl_tea',
    minutes: 6, region: 'songpo', widthMinM: 2.0, slopeMaxPct: 6, surface: '茶园土路' },
];

// 预制主题路线：有序停留点（停留点为节点）。每段由规划器按当时数据求值。
export const THEME_ROUTES = [
  {
    id: 'tr_anj_half',
    name: '问拱半日（安吉桥·预制主题）',
    family: false,
    budgetMin: 120,
    stops: [
      { node: 'n_anj_visitor', kind: 'start', label: '游客站集合', dwell: 5 },
      { node: 'n_anj_vp_n', kind: 'view', label: '北滩看莲瓣券脸', dwell: 15 },
      { node: 'n_anj_vp_s', kind: 'view', label: '南樟看拱券倒影', dwell: 15 },
      { node: 'n_anj_gate_s', kind: 'end', label: '古樟树入口解散', dwell: 0 },
    ],
  },
  {
    id: 'tr_two_bridges_day',
    name: '双桥一日（跨片区·预制主题）',
    family: false,
    budgetMin: 300,
    stops: [
      { node: 'n_anj_visitor', kind: 'start', label: '千溪谷出发', dwell: 5 },
      { node: 'n_anj_vp_s', kind: 'view', label: '安吉桥倒影', dwell: 15 },
      { node: 'n_ridge', kind: 'waypoint', label: '翻越两界岭', dwell: 10 },
      { node: 'n_qfl_vp', kind: 'view', label: '潭边看廊桥全景', dwell: 20 },
      { node: 'n_qfl_tea', kind: 'end', label: '老茶园补给点解散', dwell: 0 },
    ],
  },
  {
    id: 'tr_family_south',
    name: '南台亲子线（预制主题）',
    family: true,
    budgetMin: 90,
    stops: [
      { node: 'n_anj_visitor', kind: 'start', label: '游客站领亲子手册', dwell: 8 },
      { node: 'n_anj_vp_s', kind: 'view', label: '南樟观景台找桥兽', dwell: 20 },
      { node: 'n_anj_gate_s', kind: 'end', label: '古樟树入口野餐区', dwell: 0 },
    ],
  },
];

// 规划方案模板（半日 / 一日 / 亲子）
export const PLANS = [
  { id: 'half',   name: '半日方案', minutes: 180,
    origin: 'n_anj_visitor', targets: ['n_anj_vp_n', 'n_anj_vp_s'] },
  { id: 'day',    name: '一日方案', minutes: 420,
    origin: 'n_anj_visitor', targets: ['n_anj_vp_n', 'n_anj_vp_s', 'n_qfl_vp'] },
  { id: 'family', name: '亲子方案', minutes: 120, family: true,
    origin: 'n_anj_visitor', targets: ['n_anj_vp_s'] },
];

// 拍摄方向素材记录（示例编辑库）。bearingDeg 为镜头朝向（罗盘方位角），
// 应朝向桥梁；供"拍摄方向错误"验收比对。
export const MEDIA = [
  { id: 'm1', nodeId: 'n_anj_vp_n', bridgeId: 'anj', bearingDeg: 148,
    note: '北滩：镜头朝南略偏东，对准券脸。', valid: true },
  { id: 'm2', nodeId: 'n_anj_vp_s', bridgeId: 'anj', bearingDeg: 352,
    note: '南樟：镜头朝北，取拱券倒影。', valid: true },
  { id: 'm3_bad', nodeId: 'n_anj_vp_s', bridgeId: 'anj', bearingDeg: 170,
    note: '误交素材：镜头朝南拍向古樟树，桥在身后。', valid: false },
  { id: 'm4', nodeId: 'n_qfl_vp', bridgeId: 'qfl', bearingDeg: 28,
    note: '潭边：镜头朝东北拍廊屋。', valid: true },
];

export function bridgeById(id) { return BRIDGES.find((b) => b.id === id) || null; }
export function nodeById(id) { return NODES.find((n) => n.id === id) || null; }
export function edgeById(id) { return EDGES.find((e) => e.id === id) || null; }
export function entrancesOfBridge(bridgeId) { return ENTRANCES.filter((e) => e.bridgeId === bridgeId); }
export function regionName(id) { const r = REGIONS.find((x) => x.id === id); return r ? r.name : id; }
