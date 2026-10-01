# 千溪古桥徒步（ancient-bridge-hike）

古桥徒步网站的端到端示例。**所有桥梁、片区、维护日历均为虚构演示数据**；
桥面净宽/坡度/跨径只用于路径约束演算，不是勘察结论，**不构成任何真实桥梁承重或通行安全保证**。

## 运行

```bash
npm run build:packages   # 生成 public/assets/packages 下的分块与版本清单（仓库已附带产物）
npm start                # http://localhost:4173
npm test                 # 31 项验收测试（自行拉起服务）
```

零第三方依赖，Node >= 18 即可。

## 领域模型：为什么没有 `bridge.open`

三类独立对象：

| 对象 | 含义 | 状态挂在哪里 |
| --- | --- | --- |
| `bridge` | 桥梁本体：形制、结构、保护提示 | 不持有开放布尔值 |
| `entrance` | 两端/两侧入口门户（闸口、山门） | 各自开闭 + 原因 |
| `edge` | 通行段：引道 / 桥面穿越段(crossing) / 步道 / 跨区联络线 | 维护日历窗口、临时封闭 |

因此：

- 一端入口关闭或一端引道维护 → 该端桥头与“桥面穿越”不可行；
- **另一端入口与另一端观景点继续独立可达**——“不能过桥” ≠ “不能看桥”；
- 两岸山路能绕行时，结论是“可绕行、但**不计为穿越古桥**”（路径必须走过 crossing 段）。

故事页接口 `/api/stories` 只返回 `ends[] / crossing / views[]` 三组端级结论，刻意不返回顶层 `open`。

## 路线规划规则（`src/core/planner.js`）

- 半日 / 一日 / 亲子三套方案 + 三条预制主题路线；主题路线**不预存路径**，每次按当日数据逐段求值；
- 亲子阈值：净宽 ≥ 1.20m 且坡度 ≤ 15%。实测段不满足 → `measured_block`；
  **任一字段未测(null) → `unconfirmed`，页面显示“无法确认”**；
- 永不自动输出“适合儿童 / 无障碍(accessible)”结论；无障碍需要现场实测，本系统不替代；
- **锁定停留点**不可达 → 整体 infeasible + 关键阻断解释（逐个放开封闭点反推），不静默改点；
  未锁定点不可达 → 跳过该点并局部更新，其余段继续；
- 主题路线支持 `/api/themes/partial`：替换某个停留点后只重算相邻段；
- `/api/compare` 同数据并排比较“预制主题 vs 按图搜索”（可行性、用时、阻断、未测段、是否跨区）。

## 离线导览包（`src/core/packages.js` + `tools/build-packages.mjs`）

- `manifest.json` 声明每个版本（示例内置 1.0.0–4.0.0）：`full` / `delta`、父版本、块清单、大小与 SHA-256；
- 块状态机 `missing → verified / corrupt`；**所有必需块 verified，整包才能 usable**；缺块/坏块一律保持不可用；
- 目标版本 ≤ 已装版本 → `409 stale_rollback`（旧包回灌拒绝）；增量父版本不匹配 → `409 delta_base_mismatch`；
- 4.0.0 是基于 3.0.0 的增量，只含 stories / media 两块。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/stories?bridgeId=&date=&origin=` | 桥梁故事（结构/端级入口/穿越/观景/保护提示） |
| POST | `/api/stories` | 同左，body 可带 `overrides`（临时关入口/封段） |
| GET/POST | `/api/plans/search?planId=half|day|family` | 按图搜索，body 可带 `lockedNodeIds` |
| GET/POST | `/api/themes/evaluate?routeId=` | 预制主题按当日数据求值 |
| POST | `/api/themes/partial` | 局部更新（`replacements`） |
| GET/POST | `/api/compare` | 主题 vs 搜索 |
| GET | `/api/packages/manifest` | 版本清单 |
| POST | `/api/packages/evaluate` | 导入评估 + 逐块哈希校验 |
| GET | `/api/media/check?mediaId=` | 拍摄方位角核对 |

POST 通用 body：`{ "date": "2026-09-30", "overrides": { "entranceClosed": {...}, "edgeBlocked": {...} } }`。

## 验收场景（test/acceptance.mjs，31 断言）

1. **入口关闭**：关北端后，南端与南观景台仍可达，穿越不可行；
2. **路线跨区**：一日方案与双桥主题跨千溪谷/松坡两片区；
3. **旧包回灌**：4.0.0 上导 3.0.0 被拒；增量基线不符被拒；
4. **缺块**：缺 media 块整包不可用且点名缺块；全块哈希一致才可用；
5. **拍摄方向错误**：背对桥梁（方位角偏差 ~178°）判 `wrong_direction`；
6. **维护延期**：9/30 仍在延期窗口（原 9/27 截止 → 延至 10/8），切穿越不抹南端观景；
7. **锁定停留点**：不可达解释 + 解锁局部更新 + 主题替换点更新；
8. **未知宽度/坡度**：被迫绕行未测野径时 `unconfirmed`，出现“无法确认”，且无任何 accessible 自动认证。

## 目录

```
src/core/      领域纯函数（catalog 空间库 / graph 图状态 / views 故事装配 /
               planner 规划 / packages 离线包 / media 拍摄方位）
server/        零依赖 HTTP 服务 + API
public/        页面、原创 SVG 视觉、前端 JS、离线包产物
tools/         离线包分块+清单生成器
test/          验收测试
```

## 原创视觉

`public/assets/img/` 下 `arch-hero.svg`（石拱桥）、`covered-bridge.svg`（木拱廊桥）、
`logo.svg` 与纸纹底图均为本项目原创 SVG；设计取色与交互取舍见站内“设计说明”页（`/design.html`）。
