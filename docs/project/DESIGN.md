# 金渐层大作战 · 技术与视觉设计

## 技术选择

采用原生 HTML/CSS、JavaScript ES Modules、Canvas 2D 与 Web Audio。Node.js ≥ 22 用于本地静态服务、构建和内置测试，浏览器无需 Node。当前环境 Node v25.2.1。

相比 React + 游戏引擎，本项目场景和状态较少，原生方案没有下载、兼容依赖和引擎体积成本；相比纯 DOM 绘图，Canvas 更适合大量移动敌人、粒子和猫咪变形动画。保持模拟、渲染和界面分离，后续可替换美术而不重写战斗规则。

API 资料核实于 2026-10-13：[Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)、[Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)。Canvas 用于战斗画面，重要文本和操作使用语义 HTML。

## 视觉与交互方向

- 视觉主张：奶油色客厅、深绿家具与暖金色猫咪，圆润的游戏卡通轮廓呈现柔软但有力量的战斗。
- 内容组织：首屏以猫咪客厅插画为主体，游戏名称、难度和开始按钮为主操作；战斗时腾出整个画面，HUD 仅显示生命、经验、时间、技能与扑击状态。
- 交互主张：短腿步态与摇尾带来性格；扑击拉伸、落地冲击圈与猫爪残影强调操作反馈；升级弹层入场和选项悬停强调选择。
- 尊重 prefers-reduced-motion，去除震屏和非必要入场位移。

## 模块与数据流

```text
index.html / styles.css       页面、HUD、对话框、设置
src/main.js                  输入、固定步长循环、UI 状态同步
src/game.js                  可独立测试的模拟、敌人、技能、胜负
src/render.js                Canvas 客厅、猫、敌人、效果和相机
src/audio.js                 用户交互后初始化合成音乐与音效
src/storage.js               容错设置与各难度最好成绩
scripts/server.mjs           仅监听 127.0.0.1 的静态服务
scripts/build.mjs            校验并复制发布文件至 dist/
tests/                       Node 内置测试：规则、存储与端到端模拟
docs/project/                SPEC / DESIGN / PLAN / VALIDATION
```

`requestAnimationFrame → 固定 1/60 秒步长 → Game.update → 事件 → Audio/UI → Renderer`。累积时间上限 0.1 秒，暂停清空累积；游戏时间完全来自模拟。HUD 降频更新，升级/结算按状态切换。

Game 状态：ready → playing → upgrade/paused → playing → won/lost。升级中窗口失焦进入保护暂停，继续后返回升级选择。每次开始创建新的角色和世界，不复用上一局数值。

角色保存位置、最后朝向、血量、经验、等级、无敌时间、攻击/扑击冷却和技能等级。敌人保存类型、位置、生命和攻击阶段。投射物、掉落和短生命周期效果分别管理；数量设上限。随机源可注入以复现测试。

## 存储与声音

localStorage 使用版本化键 `cat-survivors-v1`，仅存难度、音量、各难度最好时间与击败数量。读取时校验类型和范围，写失败保留内存副本。跨局成长另建 V2 数据结构。

音频使用振荡器/噪声合成，无外部素材。音频初始化失败静默降级；暂停停止音乐，恢复用户交互后重启。音乐和音效增益独立。

## 运行、验证与简化

`npm run dev` 启动本机服务；`npm test` 验证核心规则；`npm run build` 生成静态 dist；`npm run preview` 预览产物。不依赖 npm 安装、数据库或环境变量。端口默认 4173，允许 `--port` 指定。

核心测试覆盖冷却、无敌、经验链、难度限制、胜负、重置和存储异常；浏览器按验收清单实际操作并截图。加速全局模拟用于覆盖六分钟路径，不能替代玩家对难度与手感的判断。

美术采用代码原生绘制，家具不阻挡，免去路径规划。当前数量级采用简单距离查询；敌人显著超过 180 或出现明显性能下降时再引入空间网格。无线上部署，本地服务器仅提供静态内容。
