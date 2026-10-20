# 样例画面审查

检查对象包含实际渲染的 1080p 画面，以及题材动作在三个镜头中的浏览器接触表。单张设计帧定位到 15 秒成片的 7.5 秒；接触表取自 18 秒原始配置的三个场景，时间记录在对应测试与证据中。技术矩阵和视频可播放文件在 `artifacts/all-about-arts/`。这里记录可见证据，不给 Agent 自报的审美分数，也不把一个静帧当作整片叙事或混音验收。

| 风格 / 证据 | 已看到的能力 | 尚不足以支持创作认证的地方 |
|---|---|---|
| [pixel-rpg · 图书馆与园艺](../../tests/all-about-arts/artifacts/subject-actions/pixel-rpg-examples-portrait.png) | 图书馆从找书、阅读推进到递书；园艺从播种、浇水推进到开花。像素人物、道具和 HUD 统一，横竖屏分别排版 | 人物动作属于简洁的像素表现；较长英文仍可能按字拆行。新的角色剧情需要扩展绘制与动作 |
| [impasto · 城市](../../artifacts/all-about-arts/acceptance/impasto-2-city/out/design-1080.png) | 笔触有厚度、受光与阴影；主题从花束切换成城市几何 | 城市仍是抽象几何，尚未证明能表现一座指定城市或更复杂的镜头叙事 |
| [ink-wash · 山水与流域](../../tests/all-about-arts/artifacts/subject-actions/ink-wash-examples-portrait.png) | 山水有雾、游线与涟漪；流域使用三个独立水道，逐步汇合并向下游延伸。保留纸纹、墨边与留白 | 流域是概念图，不能作为真实地理水系；笔触与河道仍有程序几何感 |
| [dataviz · 工具包组成](../../artifacts/all-about-arts/acceptance/dataviz-1-energy/out/design-1080.png) | 用实测本地文件数量绘制柱状图；标签与刻度可读 | 审查中发现旧场景说明仍称数据为示意值，已改成实测口径并重渲染。更复杂图表、单位和事实核查仍需按题材完成 |
| [glass-product · 产品动作](../../artifacts/all-about-arts/subject-transfer/whiteboard-glass/review.md) | 瓶盖抬起、液位上升、瓶盖合上；感应球发出脉冲并改变响应颜色。导入标识与产品区域不再重叠 | 为让内部动作可见，壳体使用部分透明材质。真实产品仍需要定制模型、材质和标识布局 |
| [whiteboard · 城市出行与学习](../../artifacts/all-about-arts/subject-transfer/whiteboard-glass/review.md) | 出行包含站点、路线、装备勾选与自行车位移；学习包含问题、烧杯实验、证据图与回环箭头 | 两种概念流程已形成专属画面；真实课程或路线仍需根据内容修改对象与事实 |
| [swiss-motion · 公共空间](../../artifacts/all-about-arts/acceptance/swiss-motion-1-urban/out/design-1080.png) | 几何块让出中央空间，路径向入口展开，人物随后聚集；阅读主题使用翻页、七日积累与笔记。红黑网格与字级保持统一 | 属于抽象设计表达；公共空间和阅读的动作已经分开，不能推断它自动适合所有抽象概念 |
| [paper-lantern · 灯会与家书](../../tests/all-about-arts/artifacts/subject-actions/paper-lantern-examples-portrait.png) | 灯会有点灯、聚集与放飞；家书有纸张、信封传递及抵达后亮起的窗。纸层与边缘光保留 | 层叠光箱由 Canvas 实现，深度不是完整三维纸雕；复杂相机或人物表演需要额外实现 |

上述题材动作已由实际代码实现，并有直接跳转、逆序取帧、画幅和对象区域的浏览器测试。两支有口播样例逐场景生成本地声音，按镜头起点放置，词时间标为句内插值；其他样例按配置静音或使用程序声音。

这些结果支持“可用的材质引擎和题材示例”，尚不足以声称最强或完成全部创作认证。Skill 正文要求先写题材自己的分镜、验证难镜头，再修改工程绘制代码。正式认证仍需两个宿主独立完成 brief、修改和交付，并补全逐镜头的叙事、声画及修改效果记录。
